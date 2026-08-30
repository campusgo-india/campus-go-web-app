import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient } from '@campusgo/database';
import type { ReportDataset } from './report-serializers';
import { computeReadiness, PILLARS, PILLAR_LABEL, type PillarScoreRow } from '../training/dashboard.service';

// "Placed"/"has an offer" is read from the modern funnel `status` field
// (APPLIED/IN_PROGRESS/SELECTED/REJECTED/WITHDRAWN) — the same field the
// student Placement Tracker and the offer-limit policy read — not the
// legacy ATS `stage`. Keeping every report on one field avoids the two
// screens quietly disagreeing (see the /me/page.tsx stage-vs-status fix).
const ALL_STATUSES = ['APPLIED', 'IN_PROGRESS', 'SELECTED', 'REJECTED', 'WITHDRAWN'] as const;

export const REPORT_TYPES = [
  'students',
  'companies',
  'placement',
  'programme',
  'batch',
  'funnel',
  'summary',
  'training',
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

// CTC is stored in rupees; surface it in lakhs (LPA) for human-readable exports.
const lpa = (v: unknown): number | null =>
  v == null ? null : Math.round((Number(v) / 100000) * 100) / 100;
const dec = (v: unknown): number | null => (v == null ? null : Number(v));

// The officer isn't required to type a CTC every time they place a student —
// so salary stats fall back to the job's own JD figure (average of its
// min/max, or whichever bound is set) when Application.offerCtc wasn't
// explicitly entered. An explicit offerCtc (typically entered alongside the
// offer letter upload) always wins over the JD estimate.
function effectiveCtc(
  offerCtc: unknown,
  job: { ctcMin: unknown; ctcMax: unknown } | null | undefined,
): number | null {
  if (offerCtc != null) return Number(offerCtc);
  const min = job?.ctcMin != null ? Number(job.ctcMin) : null;
  const max = job?.ctcMax != null ? Number(job.ctcMax) : null;
  if (min != null && max != null) return (min + max) / 2;
  return min ?? max ?? null;
}

/**
 * Builds normalized, tenant-scoped report datasets. Every query filters by the
 * collegeId taken from the caller's JWT — never request input. The controller
 * serializes the returned dataset to CSV or XLSX and streams it.
 */
@Injectable()
export class ReportsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async build(collegeId: string, type: ReportType): Promise<ReportDataset> {
    switch (type) {
      case 'students':
        return this.students(collegeId);
      case 'companies':
        return this.companies(collegeId);
      case 'placement':
        return this.placement(collegeId);
      case 'programme':
        return this.programme(collegeId);
      case 'batch':
        return this.batch(collegeId);
      case 'funnel':
        return this.funnel(collegeId);
      case 'summary':
        return this.summary(collegeId);
      case 'training':
        return this.training(collegeId);
      default:
        throw new BadRequestException(`Unknown report type: ${type as string}`);
    }
  }

  // Track (UG/PG) comes from CollegeSchool.degreeLevel, matched by school
  // name — identical rule to the placement dashboard (analytics.service.ts).
  // A student whose school isn't in the catalog defaults to UG.
  private async levelByStudent(collegeId: string, studentIds?: string[]) {
    const [schools, students] = await Promise.all([
      this.prisma.collegeSchool.findMany({ where: { collegeId }, select: { name: true, degreeLevel: true } }),
      this.prisma.student.findMany({
        where: { collegeId, ...(studentIds ? { id: { in: studentIds } } : {}) },
        select: { id: true, school: true },
      }),
    ]);
    const levelByName = new Map(schools.map((s) => [s.name, s.degreeLevel]));
    return new Map(students.map((s) => [s.id, levelByName.get(s.school) ?? 'UG']));
  }

  // ─────────────── Students ───────────────
  private async students(collegeId: string): Promise<ReportDataset> {
    const students = await this.prisma.student.findMany({
      where: { collegeId },
      orderBy: [{ programme: 'asc' }, { rollNumber: 'asc' }],
      select: {
        rollNumber: true,
        school: true,
        programme: true,
        graduationYear: true,
        cgpa: true,
        activeBacklogs: true,
        totalBacklogs: true,
        verificationStatus: true,
        profileCompletion: true,
        isActive: true,
        user: { select: { fullName: true, email: true, phone: true } },
      },
    });

    return {
      filename: 'students',
      title: 'Students',
      columns: [
        { key: 'rollNumber', label: 'Roll Number' },
        { key: 'fullName', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'school', label: 'School/Department' },
        { key: 'programme', label: 'Programme' },
        { key: 'graduationYear', label: 'Graduation Year' },
        { key: 'cgpa', label: 'Percentage' },
        { key: 'activeBacklogs', label: 'Active Backlogs' },
        { key: 'totalBacklogs', label: 'Total Backlogs' },
        { key: 'verificationStatus', label: 'Verification' },
        { key: 'profileCompletion', label: 'Profile %' },
        { key: 'isActive', label: 'Active' },
      ],
      rows: students.map((s) => ({
        rollNumber: s.rollNumber,
        fullName: s.user.fullName,
        email: s.user.email,
        phone: s.user.phone,
        school: s.school,
        programme: s.programme,
        graduationYear: s.graduationYear,
        cgpa: dec(s.cgpa),
        activeBacklogs: s.activeBacklogs,
        totalBacklogs: s.totalBacklogs,
        verificationStatus: s.verificationStatus,
        profileCompletion: s.profileCompletion,
        isActive: s.isActive ? 'Yes' : 'No',
      })),
    };
  }

  // ─────────────── Companies ───────────────
  private async companies(collegeId: string): Promise<ReportDataset> {
    const companies = await this.prisma.company.findMany({
      where: { collegeId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        industry: true,
        city: true,
        website: true,
        isActive: true,
        contacts: {
          where: { isPrimary: true },
          take: 1,
          select: { name: true, email: true, phone: true },
        },
      },
    });

    // Split by status, same as the Companies list — DRAFT jobs aren't real
    // postings yet so they're excluded entirely. Matches a job posted before
    // it was linked to a Company row (companyId null, free-text companyName
    // only) by name too, same fallback as Hiring History.
    const jobWhere = (c: (typeof companies)[number], status: 'PUBLISHED' | 'CLOSED') => ({
      collegeId,
      status,
      OR: [{ companyId: c.id }, { companyId: null, companyName: { equals: c.name, mode: 'insensitive' as const } }],
    });
    const [activeCounts, closedCounts] = await Promise.all([
      Promise.all(companies.map((c) => this.prisma.job.count({ where: jobWhere(c, 'PUBLISHED') }))),
      Promise.all(companies.map((c) => this.prisma.job.count({ where: jobWhere(c, 'CLOSED') }))),
    ]);

    return {
      filename: 'companies',
      title: 'Companies',
      columns: [
        { key: 'name', label: 'Company' },
        { key: 'industry', label: 'Industry' },
        { key: 'city', label: 'City' },
        { key: 'website', label: 'Website' },
        { key: 'activeJobs', label: 'Active Jobs' },
        { key: 'closedJobs', label: 'Closed Jobs' },
        { key: 'totalJobs', label: 'Total Jobs' },
        { key: 'contactName', label: 'Primary Contact' },
        { key: 'contactEmail', label: 'Contact Email' },
        { key: 'contactPhone', label: 'Contact Phone' },
        { key: 'isActive', label: 'Active' },
      ],
      rows: companies.map((c, i) => ({
        name: c.name,
        industry: c.industry,
        city: c.city,
        website: c.website,
        activeJobs: activeCounts[i],
        closedJobs: closedCounts[i],
        totalJobs: activeCounts[i] + closedCounts[i],
        contactName: c.contacts[0]?.name ?? null,
        contactEmail: c.contacts[0]?.email ?? null,
        contactPhone: c.contacts[0]?.phone ?? null,
        isActive: c.isActive ? 'Yes' : 'No',
      })),
    };
  }

  // ─────────────── Placement (one row per Selected/offer) ───────────────
  // Covers what used to be two near-identical reports (Placement + Offers) —
  // an offer IS what "Selected" means for a job application, so one export
  // is enough. Includes the offer letter link (when uploaded) and flags
  // students holding more than one offer.
  private async placement(collegeId: string): Promise<ReportDataset> {
    const apps = await this.prisma.application.findMany({
      where: { collegeId, status: 'SELECTED' },
      orderBy: { offerCtc: 'desc' },
      select: {
        studentId: true,
        offerCtc: true,
        offerLetterUrl: true,
        updatedAt: true,
        student: {
          select: {
            rollNumber: true,
            programme: true,
            graduationYear: true,
            personalEmail: true,
            user: { select: { fullName: true, email: true } },
          },
        },
        job: {
          select: {
            title: true,
            jobType: true,
            companyName: true,
            ctcMin: true,
            ctcMax: true,
            company: { select: { name: true } },
          },
        },
      },
    });

    const offerCountByStudent = new Map<string, number>();
    for (const a of apps) {
      offerCountByStudent.set(a.studentId, (offerCountByStudent.get(a.studentId) ?? 0) + 1);
    }

    return {
      filename: 'placement',
      title: 'Placement',
      columns: [
        { key: 'rollNumber', label: 'Roll Number' },
        { key: 'fullName', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'programme', label: 'Programme' },
        { key: 'graduationYear', label: 'Graduation Year' },
        { key: 'company', label: 'Company' },
        { key: 'role', label: 'Role' },
        { key: 'jobType', label: 'Type' },
        { key: 'ctcLpa', label: 'CTC (LPA)' },
        { key: 'offerLetterUrl', label: 'Offer Letter' },
        { key: 'multipleOffers', label: 'Multiple Offers' },
        { key: 'updatedOn', label: 'Updated On' },
      ],
      rows: apps.map((a) => ({
        rollNumber: a.student.rollNumber,
        fullName: a.student.user.fullName,
        email: a.student.personalEmail || a.student.user.email,
        programme: a.student.programme,
        graduationYear: a.student.graduationYear,
        company: a.job.company?.name ?? a.job.companyName ?? '',
        role: a.job.title,
        jobType: a.job.jobType,
        ctcLpa: lpa(effectiveCtc(a.offerCtc, a.job)),
        offerLetterUrl: a.offerLetterUrl ?? '',
        multipleOffers: (offerCountByStudent.get(a.studentId) ?? 1) > 1 ? 'Yes' : 'No',
        updatedOn: a.updatedAt,
      })),
    };
  }

  // ─────────────── Programme-wise summary ───────────────
  private async programme(collegeId: string): Promise<ReportDataset> {
    const students = await this.prisma.student.findMany({
      where: { collegeId, isActive: true },
      select: { programme: true, graduationYear: true },
    });
    // Not `distinct: ['studentId']` — a student holding offers from 2
    // different jobs must count as 2 offers, only the "Placed" headcount
    // below dedupes by student.
    const placed = await this.prisma.application.findMany({
      where: { collegeId, status: 'SELECTED' },
      select: {
        offerCtc: true,
        studentId: true,
        student: { select: { programme: true } },
        job: { select: { ctcMin: true, ctcMax: true } },
      },
    });

    const map = new Map<
      string,
      { total: number; placedIds: Set<string>; offers: number; packages: number[] }
    >();
    const get = (b: string) => {
      let row = map.get(b);
      if (!row) {
        row = { total: 0, placedIds: new Set(), offers: 0, packages: [] };
        map.set(b, row);
      }
      return row;
    };
    for (const s of students) {
      const row = get(s.programme);
      row.total++;
    }
    for (const a of placed) {
      const row = get(a.student.programme);
      row.placedIds.add(a.studentId);
      row.offers++;
      const ctc = effectiveCtc(a.offerCtc, a.job);
      if (ctc != null) row.packages.push(ctc);
    }

    const rows = [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([programme, r]) => {
        const placedCount = r.placedIds.size;
        const avg = r.packages.length
          ? r.packages.reduce((x, y) => x + y, 0) / r.packages.length
          : null;
        const high = r.packages.length ? Math.max(...r.packages) : null;
        return {
          programme,
          total: r.total,
          placed: placedCount,
          unplaced: r.total - placedCount,
          placementRate: r.total > 0 ? Math.round((placedCount / r.total) * 1000) / 10 : 0,
          offers: r.offers,
          avgCtcLpa: lpa(avg),
          highestCtcLpa: lpa(high),
        };
      });

    return {
      filename: 'programme-summary',
      title: 'Programme Summary',
      columns: [
        { key: 'programme', label: 'Programme' },
        { key: 'total', label: 'Total Students' },
        { key: 'placed', label: 'Placed' },
        { key: 'unplaced', label: 'Unplaced' },
        { key: 'placementRate', label: 'Placement %' },
        { key: 'offers', label: 'Offers' },
        { key: 'avgCtcLpa', label: 'Avg CTC (LPA)' },
        { key: 'highestCtcLpa', label: 'Highest CTC (LPA)' },
      ],
      rows,
    };
  }

  // ─────────────── Application funnel (Overall + UG/PG) ───────────────
  private async funnel(collegeId: string): Promise<ReportDataset> {
    const apps = await this.prisma.application.findMany({
      where: { collegeId },
      select: { status: true, studentId: true },
    });
    const levelByStudent = await this.levelByStudent(collegeId);

    const makeCounts = () =>
      Object.fromEntries(ALL_STATUSES.map((s) => [s, 0])) as Record<(typeof ALL_STATUSES)[number], number>;
    const buckets = { Overall: makeCounts(), UG: makeCounts(), PG: makeCounts() };
    for (const a of apps) {
      buckets.Overall[a.status as (typeof ALL_STATUSES)[number]]++;
      const level = levelByStudent.get(a.studentId) ?? 'UG';
      buckets[level as 'UG' | 'PG'][a.status as (typeof ALL_STATUSES)[number]]++;
    }

    // Applied/In-progress read the same "rounds open or in progress" label —
    // collapse them into one clear row instead of two easy-to-misread ones
    // (the same fix applied to the student Placement Tracker funnel).
    const rows = ['Applied', 'Selected', 'Rejected', 'Withdrawn'].map((label) => {
      const sumOf = (b: Record<(typeof ALL_STATUSES)[number], number>) =>
        label === 'Applied'
          ? b.APPLIED + b.IN_PROGRESS
          : label === 'Selected'
            ? b.SELECTED
            : label === 'Rejected'
              ? b.REJECTED
              : b.WITHDRAWN;
      const overall = sumOf(buckets.Overall);
      const ug = sumOf(buckets.UG);
      const pg = sumOf(buckets.PG);
      const total = apps.length;
      return {
        stage: label,
        overall,
        shareOfTotal: total > 0 ? Math.round((overall / total) * 1000) / 10 : 0,
        undergraduate: ug,
        postgraduate: pg,
      };
    });

    return {
      filename: 'application-funnel',
      title: 'Application Funnel',
      columns: [
        { key: 'stage', label: 'Stage' },
        { key: 'overall', label: 'Applications (Overall)' },
        { key: 'shareOfTotal', label: '% of Total' },
        { key: 'undergraduate', label: 'Undergraduate' },
        { key: 'postgraduate', label: 'Postgraduate' },
      ],
      rows,
    };
  }

  // ─────────────── Batch-wise summary (mirrors "programme", grouped by year) ───────────────
  private async batch(collegeId: string): Promise<ReportDataset> {
    const students = await this.prisma.student.findMany({
      where: { collegeId, isActive: true },
      select: { graduationYear: true },
    });
    // Not `distinct: ['studentId']` — see programme() above for why.
    const placed = await this.prisma.application.findMany({
      where: { collegeId, status: 'SELECTED' },
      select: {
        offerCtc: true,
        studentId: true,
        student: { select: { graduationYear: true } },
        job: { select: { ctcMin: true, ctcMax: true } },
      },
    });

    const map = new Map<
      number,
      { total: number; placedIds: Set<string>; offers: number; packages: number[] }
    >();
    const get = (y: number) => {
      let row = map.get(y);
      if (!row) {
        row = { total: 0, placedIds: new Set(), offers: 0, packages: [] };
        map.set(y, row);
      }
      return row;
    };
    for (const s of students) get(s.graduationYear).total++;
    for (const a of placed) {
      const row = get(a.student.graduationYear);
      row.placedIds.add(a.studentId);
      row.offers++;
      const ctc = effectiveCtc(a.offerCtc, a.job);
      if (ctc != null) row.packages.push(ctc);
    }

    const rows = [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([graduationYear, r]) => {
        const placedCount = r.placedIds.size;
        const avg = r.packages.length
          ? r.packages.reduce((x, y) => x + y, 0) / r.packages.length
          : null;
        const high = r.packages.length ? Math.max(...r.packages) : null;
        return {
          graduationYear,
          total: r.total,
          placed: placedCount,
          unplaced: r.total - placedCount,
          placementRate: r.total > 0 ? Math.round((placedCount / r.total) * 1000) / 10 : 0,
          offers: r.offers,
          avgCtcLpa: lpa(avg),
          highestCtcLpa: lpa(high),
        };
      });

    return {
      filename: 'batch-summary',
      title: 'Batch Summary',
      columns: [
        { key: 'graduationYear', label: 'Batch (Graduation Year)' },
        { key: 'total', label: 'Total Students' },
        { key: 'placed', label: 'Placed' },
        { key: 'unplaced', label: 'Unplaced' },
        { key: 'placementRate', label: 'Placement %' },
        { key: 'offers', label: 'Offers' },
        { key: 'avgCtcLpa', label: 'Avg CTC (LPA)' },
        { key: 'highestCtcLpa', label: 'Highest CTC (LPA)' },
      ],
      rows,
    };
  }

  // ─────────────── Placement & readiness summary (Overall + UG/PG) ───────────────
  // A general-purpose overview report — the kind of headline numbers a
  // placement cell would cite when pitching the college or feeding into an
  // accreditation submission (NAAC/NIRF/IQAC). Not a compliance-formatted
  // template for any specific body — those have precise, regulator-defined
  // column layouts this doesn't attempt to replicate.
  private async summary(collegeId: string): Promise<ReportDataset> {
    const [totalActive, placedApps, internships, higherStudiesRows, entrepreneurshipRows, verifiedCount, totalCount] =
      await Promise.all([
        this.prisma.student.findMany({ where: { collegeId, isActive: true }, select: { id: true } }),
        this.prisma.application.findMany({
          where: { collegeId, status: 'SELECTED' },
          select: { studentId: true, offerCtc: true, job: { select: { ctcMin: true, ctcMax: true } } },
          distinct: ['studentId'],
        }),
        this.prisma.internship.count({ where: { collegeId } }),
        this.prisma.student.findMany({
          where: { collegeId, isActive: true, higherStudiesPlanned: true },
          select: { id: true },
        }),
        this.prisma.student.findMany({
          where: { collegeId, isActive: true, entrepreneurshipInterest: true },
          select: { id: true },
        }),
        this.prisma.student.count({ where: { collegeId, verificationStatus: 'VERIFIED' } }),
        this.prisma.student.count({ where: { collegeId } }),
      ]);

    const activeIds = totalActive.map((s) => s.id);
    const levelByStudent = await this.levelByStudent(collegeId, activeIds);
    const levelOf = (id: string) => levelByStudent.get(id) ?? 'UG';
    const countByLevel = (ids: string[], level: 'UG' | 'PG') =>
      ids.filter((id) => levelOf(id) === level).length;

    const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 1000) / 10 : 0);

    const block = (label: string, activeIdsForLevel: string[]) => {
      const activeSet = new Set(activeIdsForLevel);
      const placedInLevel = placedApps.filter((a) => activeSet.has(a.studentId));
      const packages = placedInLevel
        .map((o) => effectiveCtc(o.offerCtc, o.job))
        .filter((n): n is number => n != null);
      const active = activeIdsForLevel.length;
      const placed = placedInLevel.length;
      const higher = higherStudiesRows.filter((s) => activeSet.has(s.id)).length;
      const entre = entrepreneurshipRows.filter((s) => activeSet.has(s.id)).length;
      return [
        { metric: `Active Students${label}`, value: active },
        { metric: `Placed Students${label}`, value: placed },
        { metric: `Unplaced Students${label}`, value: active - placed },
        { metric: `Placement Rate (%)${label}`, value: pct(placed, active) },
        { metric: `Average CTC (LPA)${label}`, value: lpa(mean(packages)) },
        { metric: `Median CTC (LPA)${label}`, value: lpa(median(packages)) },
        { metric: `Highest CTC (LPA)${label}`, value: packages.length ? lpa(Math.max(...packages)) : null },
        { metric: `Students Planning Higher Studies${label}`, value: higher },
        { metric: `Students Interested in Entrepreneurship${label}`, value: entre },
      ];
    };

    const ugIds = activeIds.filter((id) => levelOf(id) === 'UG');
    const pgIds = activeIds.filter((id) => levelOf(id) === 'PG');

    const rows = [
      { metric: 'Total Students', value: totalCount },
      { metric: 'Verified Students', value: verifiedCount },
      { metric: 'Internships Logged', value: internships },
      ...block(' (Overall)', activeIds),
      ...block(' (Undergraduate)', ugIds),
      ...block(' (Postgraduate)', pgIds),
    ];

    return {
      filename: 'placement-readiness-summary',
      title: 'Placement & Readiness Summary',
      columns: [
        { key: 'metric', label: 'Metric' },
        { key: 'value', label: 'Value' },
      ],
      rows,
    };
  }

  // ─────────────── Training: readiness, pre vs post, attendance ───────────────
  // One row per active student — pre/post % per skill pillar (same 4 pillars
  // as the Training module), the equal-weighted readiness index, and
  // attendance %. Mirrors the exact formula used on the student's own "My
  // Employability" page and the officer Training Dashboard, so the numbers
  // in this export always agree with what's shown on screen.
  private async training(collegeId: string): Promise<ReportDataset> {
    const students = await this.prisma.student.findMany({
      where: { collegeId, isActive: true },
      orderBy: [{ programme: 'asc' }, { rollNumber: 'asc' }],
      select: { id: true, rollNumber: true, programme: true, user: { select: { fullName: true } } },
    });
    const studentIds = students.map((s) => s.id);

    const [scores, attendance] = await Promise.all([
      this.prisma.assessmentScore.findMany({
        where: { studentId: { in: studentIds } },
        select: {
          studentId: true,
          marksObtained: true,
          assessment: { select: { pillar: true, maxMarks: true, phase: true } },
        },
      }),
      this.prisma.trainingAttendance.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true, present: true },
      }),
    ]);

    const scoresByStudent = new Map<string, typeof scores>();
    for (const s of scores) {
      const list = scoresByStudent.get(s.studentId) ?? [];
      list.push(s);
      scoresByStudent.set(s.studentId, list);
    }
    const attendanceByStudent = new Map<string, { present: number; total: number }>();
    for (const a of attendance) {
      const row = attendanceByStudent.get(a.studentId) ?? { present: 0, total: 0 };
      row.total++;
      if (a.present) row.present++;
      attendanceByStudent.set(a.studentId, row);
    }

    const avgPct = (rows: { marksObtained: unknown; assessment: { maxMarks: number } }[]) =>
      rows.length
        ? Math.round(
            (rows.reduce((sum, r) => sum + (Number(r.marksObtained) / r.assessment.maxMarks) * 100, 0) /
              rows.length) *
              10,
          ) / 10
        : null;

    const pillarColumns = PILLARS.flatMap((p) => [
      { key: `${p}_pre`, label: `${PILLAR_LABEL[p]} — Pre %` },
      { key: `${p}_post`, label: `${PILLAR_LABEL[p]} — Post %` },
    ]);

    const rows = students.map((s) => {
      const studentScores = scoresByStudent.get(s.id) ?? [];
      const readiness = computeReadiness(
        studentScores.map((r) => ({
          marksObtained: Number(r.marksObtained),
          pillar: r.assessment.pillar,
          maxMarks: r.assessment.maxMarks,
        })) as PillarScoreRow[],
      );
      const att = attendanceByStudent.get(s.id);

      const pillarValues: Record<string, number | null> = {};
      for (const p of PILLARS) {
        pillarValues[`${p}_pre`] = avgPct(
          studentScores.filter((r) => r.assessment.pillar === p && r.assessment.phase === 'PRE'),
        );
        pillarValues[`${p}_post`] = avgPct(
          studentScores.filter((r) => r.assessment.pillar === p && r.assessment.phase === 'POST'),
        );
      }

      return {
        rollNumber: s.rollNumber,
        fullName: s.user.fullName,
        programme: s.programme,
        ...pillarValues,
        readinessIndex: readiness.scoredPillars.length ? readiness.readinessIndex : null,
        attendancePct: att && att.total ? Math.round((att.present / att.total) * 100) : null,
      };
    });

    return {
      filename: 'training-readiness',
      title: 'Training & Readiness',
      columns: [
        { key: 'rollNumber', label: 'Roll Number' },
        { key: 'fullName', label: 'Name' },
        { key: 'programme', label: 'Programme' },
        ...pillarColumns,
        { key: 'readinessIndex', label: 'Readiness Index (%)' },
        { key: 'attendancePct', label: 'Training Attendance %' },
      ],
      rows,
    };
  }
}

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
