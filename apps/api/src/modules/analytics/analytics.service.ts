import { Inject, Injectable } from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient } from '@campusgo/database';
import { checkEligibility } from '../jobs/eligibility';
import { jobVisibleToCollege } from '../jobs/job-scope.util';

// Legacy stage-based flow's equivalent of "reached round N or later" — used
// alongside the newer rounds/pipeline flow's ApplicationRound.round.seq so
// the Placement Progress funnel's Round 1/2/3 stages count a student
// regardless of which flow was used to move them there.
const ROUND_1_OR_LATER_STAGES = [
  'ROUND_1',
  'ROUND_2',
  'ROUND_3',
  'HR',
  'OFFER_RELEASED',
  'OFFER_ACCEPTED',
  'JOINED',
] as const;
const ROUND_2_OR_LATER_STAGES = [
  'ROUND_2',
  'ROUND_3',
  'HR',
  'OFFER_RELEASED',
  'OFFER_ACCEPTED',
  'JOINED',
] as const;
const ROUND_3_OR_LATER_STAGES = ['ROUND_3', 'HR', 'OFFER_RELEASED', 'OFFER_ACCEPTED', 'JOINED'] as const;
const SELECTED_STAGES = ['OFFER_ACCEPTED', 'JOINED'] as const;

// Application stages that count as a secured placement / a released offer.
const PLACING_STAGES = ['OFFER_ACCEPTED', 'JOINED'] as const;
const OFFER_STAGES = ['OFFER_RELEASED', 'OFFER_ACCEPTED', 'JOINED'] as const;
// Rounds-funnel outcome statuses, in progression order.
const APPLICATION_STATUSES = [
  'APPLIED',
  'IN_PROGRESS',
  'SELECTED',
  'REJECTED',
  'WITHDRAWN',
] as const;

// The officer isn't required to type a CTC every time they place a student —
// so package stats fall back to the job's own JD figure (average of its
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
 * Read-only analytics over Phase 2/3 data. Every query is tenant-scoped via the
 * collegeId taken from the authenticated user's JWT — never request input.
 */
@Injectable()
export class AnalyticsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  // ─────────────── Placement ───────────────
  async placement(collegeId: string) {
    const [verifiedCount, placedCount, offers] = await Promise.all([
      this.prisma.student.count({
        where: { collegeId, isActive: true, verificationStatus: 'VERIFIED' },
      }),
      this.prisma.application
        .groupBy({
          by: ['studentId'],
          where: { collegeId, status: 'SELECTED' },
          _count: { _all: true },
        })
        .then((g) => g.length),
      this.prisma.application.findMany({
        where: { collegeId, status: 'SELECTED' },
        select: { offerCtc: true, job: { select: { ctcMin: true, ctcMax: true } } },
      }),
    ]);

    // offersCount is every SELECTED application, not just the ones with a
    // resolvable CTC — a student who self-uploads just the offer letter
    // (no CTC entered anywhere, incl. the job posting) still counts as an
    // offer, it just doesn't contribute to the package stats below.
    const packages = offers
      .map((o) => effectiveCtc(o.offerCtc, o.job))
      .filter((n): n is number => n != null);
    const placementRate =
      verifiedCount > 0 ? Math.round((placedCount / verifiedCount) * 1000) / 10 : 0;

    return {
      verifiedStudents: verifiedCount,
      placedStudents: placedCount,
      placementRate, // percentage, one decimal
      offersCount: offers.length,
      avgPackage: packages.length ? Math.round(mean(packages)) : null,
      medianPackage: packages.length ? Math.round(median(packages)) : null,
      highestPackage: packages.length ? Math.max(...packages) : null,
      lowestPackage: packages.length ? Math.min(...packages) : null,
      placementOverTime: await this.placementOverTime(collegeId),
    };
  }

  // Offers accepted per month, last 12 months, derived from stage-history.
  private async placementOverTime(collegeId: string) {
    const history = await this.prisma.applicationStageHistory.findMany({
      where: { application: { collegeId }, toStage: { in: [...PLACING_STAGES] } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const buckets = new Map<string, number>();
    for (const h of history) {
      const key = `${h.createdAt.getFullYear()}-${String(h.createdAt.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([month, count]) => ({ month, count }));
  }

  // ─────────────── Jobs ───────────────
  async jobs(collegeId: string) {
    const [jobsPosted, jobsPublished, applicationsReceived, offersReleased, publishedJobs, drivesWithOpenRounds] =
      await Promise.all([
        this.prisma.job.count({ where: { collegeId } }),
        this.prisma.job.count({ where: { collegeId, publishedAt: { not: null } } }),
        this.prisma.application.count({ where: { collegeId } }),
        this.prisma.application.count({ where: { collegeId, stage: { in: [...OFFER_STAGES] } } }),
        this.prisma.job.findMany({
          where: { status: 'PUBLISHED', ...jobVisibleToCollege(collegeId) },
          select: { companyName: true, company: { select: { name: true } } },
        }),
        this.prisma.job.count({
          where: {
            status: 'PUBLISHED',
            ...jobVisibleToCollege(collegeId),
            rounds: { some: { collegeId, status: 'OPEN' } },
          },
        }),
      ]);
    const recruitingCompanies = new Set(
      publishedJobs.map((j) => j.company?.name ?? j.companyName ?? 'Unknown'),
    ).size;
    return {
      jobsPosted,
      jobsPublished,
      applicationsReceived,
      offersReleased,
      recruitingCompanies,
      activeDrives: drivesWithOpenRounds,
      conversionRate:
        applicationsReceived > 0
          ? Math.round((offersReleased / applicationsReceived) * 1000) / 10
          : 0,
    };
  }

  // ─────────────── Students ───────────────
  async students(collegeId: string) {
    const [total, active, placed, internships, completions] = await Promise.all([
      this.prisma.student.count({ where: { collegeId } }),
      this.prisma.student.count({ where: { collegeId, isActive: true } }),
      this.prisma.application
        .groupBy({
          by: ['studentId'],
          where: { collegeId, stage: { in: [...PLACING_STAGES] } },
          _count: { _all: true },
        })
        .then((g) => g.length),
      this.prisma.internship.count({ where: { collegeId } }),
      this.prisma.student.findMany({ where: { collegeId }, select: { profileCompletion: true } }),
    ]);

    const buckets = { '0-25': 0, '25-50': 0, '50-75': 0, '75-100': 0 };
    for (const { profileCompletion: c } of completions) {
      if (c < 25) buckets['0-25']++;
      else if (c < 50) buckets['25-50']++;
      else if (c < 75) buckets['50-75']++;
      else buckets['75-100']++;
    }

    return {
      total,
      active,
      placed,
      unplaced: active - placed,
      internships,
      completionDistribution: buckets,
    };
  }

  // ─────────────── Funnel ───────────────
  // The rounds funnel tracks applications by outcome status (not the legacy
  // 12-stage enum): Applied → In progress → Selected, plus Rejected/Withdrawn.
  async funnel(collegeId: string) {
    const grouped = await this.prisma.application.groupBy({
      by: ['status'],
      where: { collegeId },
      _count: { _all: true },
    });
    const counts = new Map(grouped.map((g) => [g.status, g._count._all]));
    return APPLICATION_STATUSES.map((status) => ({ status, count: counts.get(status) ?? 0 }));
  }

  // ─────────────── Insights (enrichment) ───────────────
  // Multiple offers, "dream" offers (≥1.5× the average package), and repeat
  // recruiters (companies that have hired more than one student).
  async insights(collegeId: string) {
    const offerApps = await this.prisma.application.findMany({
      where: { collegeId, stage: { in: [...OFFER_STAGES] } },
      select: {
        studentId: true,
        jobId: true,
        offerCtc: true,
        student: { select: { rollNumber: true, user: { select: { fullName: true } } } },
        job: {
          select: {
            companyName: true,
            ctcMin: true,
            ctcMax: true,
            company: { select: { name: true } },
          },
        },
      },
    });

    // ── Multiple offers: distinct jobs offered per student ──
    const byStudent = new Map<
      string,
      { name: string; rollNumber: string; jobIds: Set<string>; best: number | null }
    >();
    for (const a of offerApps) {
      const entry = byStudent.get(a.studentId) ?? {
        name: a.student.user.fullName,
        rollNumber: a.student.rollNumber,
        jobIds: new Set<string>(),
        best: null,
      };
      entry.jobIds.add(a.jobId);
      const ctc = effectiveCtc(a.offerCtc, a.job);
      if (ctc != null) entry.best = entry.best == null ? ctc : Math.max(entry.best, ctc);
      byStudent.set(a.studentId, entry);
    }
    const multipleOfferStudents = [...byStudent.values()]
      .filter((s) => s.jobIds.size > 1)
      .map((s) => ({
        name: s.name,
        rollNumber: s.rollNumber,
        offers: s.jobIds.size,
        bestPackage: s.best,
      }))
      .sort((a, b) => b.offers - a.offers);

    // ── Dream offers: packages ≥ 1.5× the average package ──
    const packages = offerApps
      .map((a) => effectiveCtc(a.offerCtc, a.job))
      .filter((n): n is number => n != null);
    const avg = packages.length ? mean(packages) : 0;
    const dreamThreshold = avg > 0 ? Math.round(avg * 1.5) : null;
    const dreamOffers =
      dreamThreshold != null ? packages.filter((p) => p >= dreamThreshold).length : 0;

    // ── Repeat recruiters: companies hiring more than one student ──
    const byCompany = new Map<string, number>();
    for (const a of offerApps) {
      const name = a.job.company?.name ?? a.job.companyName ?? 'Unknown';
      byCompany.set(name, (byCompany.get(name) ?? 0) + 1);
    }
    const repeatRecruiters = [...byCompany.entries()]
      .filter(([, hires]) => hires > 1)
      .map(([company, hires]) => ({ company, hires }))
      .sort((a, b) => b.hires - a.hires);

    return {
      studentsWithMultipleOffers: multipleOfferStudents.length,
      multipleOfferStudents: multipleOfferStudents.slice(0, 20),
      dreamThreshold,
      dreamOffers,
      repeatRecruiters,
    };
  }

  // ─────────────── Placement dashboard (Overall + UG/PG) ───────────────
  // Track (UG/PG) comes from CollegeSchool.degreeLevel, matched by school
  // name. A student whose school isn't in the catalog (or predates it)
  // defaults to UG, same as the column default, so nobody silently drops out
  // of the totals.
  async placementDashboard(collegeId: string) {
    const [schools, students, placingApps, internships] = await Promise.all([
      this.prisma.collegeSchool.findMany({
        where: { collegeId },
        select: { name: true, degreeLevel: true },
      }),
      this.prisma.student.findMany({
        where: { collegeId },
        select: { id: true, school: true, isActive: true },
      }),
      this.prisma.application.findMany({
        where: { collegeId, status: 'SELECTED' },
        select: {
          studentId: true,
          offerCtc: true,
          job: {
            select: {
              ctcMin: true,
              ctcMax: true,
              companyName: true,
              company: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.internship.findMany({
        where: { collegeId },
        select: { studentId: true, isPpo: true },
      }),
    ]);

    const levelByName = new Map(schools.map((s) => [s.name, s.degreeLevel]));
    const levelByStudent = new Map(
      students.map((s) => [s.id, levelByName.get(s.school) ?? 'UG']),
    );
    const bucketOf = (studentId: string) => levelByStudent.get(studentId) ?? 'UG';

    function makeBucket() {
      return {
        finalYearStudents: 0,
        placedIds: new Set<string>(),
        // Every SELECTED application in this bucket — a student who holds
        // offers from 2 different jobs counts as 2 offers here (deliberately
        // NOT deduped by student, unlike placedIds), matching what "Offers
        // extended" should mean.
        offerCount: 0,
        packages: [] as number[],
        internships: 0,
        ppos: 0,
      };
    }
    const buckets = { UG: makeBucket(), PG: makeBucket() };

    for (const s of students) {
      if (!s.isActive) continue;
      buckets[bucketOf(s.id)].finalYearStudents++;
    }

    const companies = new Set<string>();
    for (const a of placingApps) {
      const bucket = buckets[bucketOf(a.studentId)];
      bucket.placedIds.add(a.studentId);
      bucket.offerCount++;
      // Only contributes to CTC stats when a figure can actually be
      // resolved (explicit offerCtc, or the job's own JD range) — a student
      // who self-uploads just the offer letter with no CTC anywhere still
      // counts as an offer above, it just doesn't move averageCtc/highestCtc.
      const ctc = effectiveCtc(a.offerCtc, a.job);
      if (ctc != null) bucket.packages.push(ctc);
      companies.add(a.job.company?.name ?? a.job.companyName ?? 'Unknown');
    }

    for (const i of internships) {
      const bucket = buckets[bucketOf(i.studentId)];
      bucket.internships++;
      if (i.isPpo === true) bucket.ppos++;
    }

    function summarize(b: ReturnType<typeof makeBucket>) {
      const placed = b.placedIds.size;
      return {
        finalYearStudents: b.finalYearStudents,
        placed,
        placementRate:
          b.finalYearStudents > 0 ? Math.round((placed / b.finalYearStudents) * 1000) / 10 : 0,
        offers: b.offerCount,
        highestCtc: b.packages.length ? Math.max(...b.packages) : null,
        averageCtc: b.packages.length ? Math.round(mean(b.packages) * 100) / 100 : null,
        medianCtc: b.packages.length ? Math.round(median(b.packages) * 100) / 100 : null,
        internships: b.internships,
        ppos: b.ppos,
      };
    }

    const ug = summarize(buckets.UG);
    const pg = summarize(buckets.PG);
    const allPackages = [...buckets.UG.packages, ...buckets.PG.packages];

    return {
      overall: {
        finalYearStudents: ug.finalYearStudents + pg.finalYearStudents,
        placed: ug.placed + pg.placed,
        placementRate:
          ug.finalYearStudents + pg.finalYearStudents > 0
            ? Math.round(
                ((ug.placed + pg.placed) / (ug.finalYearStudents + pg.finalYearStudents)) * 1000,
              ) / 10
            : 0,
        companies: companies.size,
        offers: ug.offers + pg.offers,
        highestCtc: allPackages.length ? Math.max(...allPackages) : null,
        averageCtc: allPackages.length ? Math.round(mean(allPackages) * 100) / 100 : null,
        medianCtc: allPackages.length ? Math.round(median(allPackages) * 100) / 100 : null,
        internships: ug.internships + pg.internships,
        ppos: ug.ppos + pg.ppos,
      },
      ug,
      pg,
    };
  }

  // ─────────────── Placement Progress funnel (Overall + UG/PG) ───────────────
  // Eight stages, computed per student from whichever signal is available —
  // this app supports both a granular legacy stage flow (Application.stage)
  // and a streamlined rounds/pipeline flow (Application.status +
  // ApplicationRound), so several stages union both.
  async placementFunnel(collegeId: string) {
    const [schools, students, applications, rounds] = await Promise.all([
      this.prisma.collegeSchool.findMany({
        where: { collegeId },
        select: { name: true, degreeLevel: true },
      }),
      this.prisma.student.findMany({
        where: { collegeId },
        select: {
          id: true,
          school: true,
          isActive: true,
          verificationStatus: true,
          resume: { select: { id: true } },
        },
      }),
      this.prisma.application.findMany({
        where: { collegeId },
        select: { studentId: true, status: true, stage: true },
      }),
      this.prisma.applicationRound.findMany({
        where: { application: { collegeId } },
        select: {
          outcome: true,
          attended: true,
          round: { select: { seq: true } },
          application: { select: { studentId: true } },
        },
      }),
    ]);

    const levelByName = new Map(schools.map((s) => [s.name, s.degreeLevel]));
    const levelOf = (school: string) => levelByName.get(school) ?? 'UG';

    const appsByStudent = new Map<string, typeof applications>();
    for (const a of applications) {
      const list = appsByStudent.get(a.studentId) ?? [];
      list.push(a);
      appsByStudent.set(a.studentId, list);
    }
    const roundsByStudent = new Map<string, typeof rounds>();
    for (const r of rounds) {
      const sid = r.application.studentId;
      const list = roundsByStudent.get(sid) ?? [];
      list.push(r);
      roundsByStudent.set(sid, list);
    }

    function makeStage() {
      return {
        finalYearStudents: 0,
        eligible: 0,
        applied: 0,
        attended: 0,
        round1: 0,
        round2: 0,
        round3: 0,
        selected: 0,
        offered: 0,
        joined: 0,
      };
    }
    const buckets = { UG: makeStage(), PG: makeStage() };

    for (const s of students) {
      if (!s.isActive) continue;
      const bucket = buckets[levelOf(s.school)];
      bucket.finalYearStudents++;

      const isEligible = s.verificationStatus === 'VERIFIED' && !!s.resume;
      if (isEligible) bucket.eligible++;

      const myApps = appsByStudent.get(s.id) ?? [];
      const myRounds = roundsByStudent.get(s.id) ?? [];
      if (myApps.length > 0) bucket.applied++;
      // "Attended" = reached at least one interview round. Not gated on the
      // ApplicationRound.attended flag — that's a separate, easy-to-skip
      // manual "mark present/absent" action officers rarely use, so relying
      // on it left this stage at 0 even for students who clearly interviewed.
      // Being enrolled in a round (created automatically when the round
      // starts) is the reliable signal.
      if (myRounds.length > 0) bucket.attended++;

      // Round 1/2/3: reached a round with that sequence number or later —
      // nested/cumulative like the rest of this funnel (reaching Round 3
      // implies having reached Round 1 and 2), from whichever flow moved
      // them there.
      const maxSeqReached = myRounds.reduce((max, r) => Math.max(max, r.round.seq), 0);
      if (maxSeqReached >= 1 || myApps.some((a) => (ROUND_1_OR_LATER_STAGES as readonly string[]).includes(a.stage))) {
        bucket.round1++;
      }
      if (maxSeqReached >= 2 || myApps.some((a) => (ROUND_2_OR_LATER_STAGES as readonly string[]).includes(a.stage))) {
        bucket.round2++;
      }
      if (maxSeqReached >= 3 || myApps.some((a) => (ROUND_3_OR_LATER_STAGES as readonly string[]).includes(a.stage))) {
        bucket.round3++;
      }
      // Selecting a candidate IS extending the offer — the two are the same
      // event, so Selected and Offered always match. (An uploaded offer-letter
      // PDF is just tracking; it doesn't create an offer.)
      const isSelected = myApps.some(
        (a) => a.status === 'SELECTED' || (SELECTED_STAGES as readonly string[]).includes(a.stage),
      );
      if (isSelected) {
        bucket.selected++;
        bucket.offered++;
      }
      if (myApps.some((a) => a.stage === 'JOINED')) bucket.joined++;
    }

    return { ug: buckets.UG, pg: buckets.PG };
  }

  // ─────────────── Programme-wise placement table ───────────────
  async programmeWisePlacement(collegeId: string) {
    const [students, applications] = await Promise.all([
      this.prisma.student.findMany({
        where: { collegeId, isActive: true },
        select: {
          id: true,
          programme: true,
          verificationStatus: true,
          resume: { select: { id: true } },
        },
      }),
      this.prisma.application.findMany({
        where: { collegeId, stage: { in: [...PLACING_STAGES] } },
        select: {
          studentId: true,
          status: true,
          stage: true,
          offerCtc: true,
          job: { select: { ctcMin: true, ctcMax: true } },
        },
      }),
    ]);

    const selectedIds = new Set(
      applications
        .filter(
          (a) => a.status === 'SELECTED' || (SELECTED_STAGES as readonly string[]).includes(a.stage),
        )
        .map((a) => a.studentId),
    );
    const programmeById = new Map(students.map((s) => [s.id, s.programme]));
    const packagesByProgramme = new Map<string, number[]>();
    for (const a of applications) {
      const programme = programmeById.get(a.studentId);
      if (!programme) continue; // graduated/inactive student, not in this season's table
      const ctc = effectiveCtc(a.offerCtc, a.job);
      if (ctc == null) continue;
      const list = packagesByProgramme.get(programme) ?? [];
      list.push(ctc);
      packagesByProgramme.set(programme, list);
    }

    const map = new Map<string, { students: number; eligible: number; placed: number }>();
    for (const s of students) {
      const row = map.get(s.programme) ?? { students: 0, eligible: 0, placed: 0 };
      row.students++;
      if (s.verificationStatus === 'VERIFIED' && s.resume) row.eligible++;
      if (selectedIds.has(s.id)) row.placed++;
      map.set(s.programme, row);
    }

    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([programme, r]) => {
        const packages = packagesByProgramme.get(programme) ?? [];
        return {
          programme,
          students: r.students,
          eligible: r.eligible,
          placed: r.placed,
          placementRate: r.students > 0 ? Math.round((r.placed / r.students) * 1000) / 10 : 0,
          medianCtc: packages.length ? Math.round(median(packages) * 100) / 100 : null,
        };
      });
  }

  // ─────────────── Active placement drives ───────────────
  // Published jobs (still accepting applications) PLUS closed jobs still
  // being actively interviewed right now (an open round) — the ones needing
  // the officer's attention. A college job's status flips to CLOSED the
  // moment Round 1 starts (see RoundsService), so filtering to PUBLISHED
  // alone would make a job vanish from this list exactly when it enters its
  // most "active" phase.
  //
  // Deliberately NOT keyed on leftover unresolved applications (e.g. a
  // straggler still sitting at APPLIED because they were never pulled into a
  // round) — once the job's only/last round is DECIDED and nothing is OPEN,
  // the drive is done from the officer's point of view even if a few
  // applications were never formally closed out. Otherwise a job with one
  // placed candidate and a handful of never-processed applicants keeps
  // showing as "active" indefinitely.
  //
  // Composed via AND (not a flat spread) so this OR doesn't clobber
  // jobVisibleToCollege's own OR clause.
  async activeDrives(collegeId: string) {
    const jobs = await this.prisma.job.findMany({
      where: {
        AND: [
          jobVisibleToCollege(collegeId),
          {
            OR: [{ status: 'PUBLISHED' }, { status: 'CLOSED', rounds: { some: { status: 'OPEN' } } }],
          },
        ],
      },
      select: {
        id: true,
        title: true,
        companyName: true,
        company: { select: { name: true } },
        eligibleSchools: true,
        eligibleProgrammes: true,
        graduationYears: true,
        minCgpa: true,
        minTenthPercentage: true,
        minTwelfthPercentage: true,
        minUgPercentage: true,
        eligibleGenders: true,
        maxActiveBacklogs: true,
        maxTotalBacklogs: true,
        applications: { select: { studentId: true, status: true, stage: true } },
        rounds: { select: { status: true, scheduledAt: true }, orderBy: { scheduledAt: 'asc' } },
      },
    });
    if (jobs.length === 0) return [];

    // Every verified, active, non-placed student — the pool eligibility is
    // checked against, mirroring the officer "eligible students" preview.
    const students = await this.prisma.student.findMany({
      where: { collegeId, isActive: true, verificationStatus: 'VERIFIED' },
      include: { resume: { select: { id: true } } },
    });
    const placedIds = new Set(
      (
        await this.prisma.application.findMany({
          where: { collegeId, stage: { in: [...PLACING_STAGES] } },
          select: { studentId: true },
          distinct: ['studentId'],
        })
      ).map((a) => a.studentId),
    );

    const rows = jobs.map((j) => {
      const criteria = {
        eligibleSchools: j.eligibleSchools,
        eligibleProgrammes: j.eligibleProgrammes,
        graduationYears: j.graduationYears,
        minCgpa: j.minCgpa != null ? Number(j.minCgpa) : null,
        minTenthPercentage: j.minTenthPercentage != null ? Number(j.minTenthPercentage) : null,
        minTwelfthPercentage: j.minTwelfthPercentage != null ? Number(j.minTwelfthPercentage) : null,
        minUgPercentage: j.minUgPercentage != null ? Number(j.minUgPercentage) : null,
        eligibleGenders: j.eligibleGenders,
        maxActiveBacklogs: j.maxActiveBacklogs,
        maxTotalBacklogs: j.maxTotalBacklogs,
      };
      const eligibleCount = students.filter(
        (s) =>
          checkEligibility(
            {
              verificationStatus: s.verificationStatus,
              isPlaced: placedIds.has(s.id),
              school: s.school,
              programme: s.programme,
              graduationYear: s.graduationYear,
              cgpa: s.cgpa != null ? Number(s.cgpa) : null,
              tenthPercentage: s.tenthPercentage != null ? Number(s.tenthPercentage) : null,
              twelfthPercentage: s.twelfthPercentage != null ? Number(s.twelfthPercentage) : null,
              ugPercentage: s.ugPercentage != null ? Number(s.ugPercentage) : null,
              gender: s.gender,
              activeBacklogs: s.activeBacklogs,
              totalBacklogs: s.totalBacklogs,
              hasResume: !!s.resume,
            },
            criteria,
          ).eligible,
      ).length;

      const shortlisted = j.applications.filter(
        (a) => a.status === 'IN_PROGRESS' || a.status === 'SELECTED' || a.stage !== 'APPLIED',
      ).length;
      const openRounds = j.rounds.filter((r) => r.status === 'OPEN' && r.scheduledAt);
      const nearestInterview = openRounds.length ? openRounds[0].scheduledAt : null;

      return {
        jobId: j.id,
        company: j.company?.name ?? j.companyName ?? 'Unknown',
        role: j.title,
        eligible: eligibleCount,
        applied: j.applications.length,
        shortlisted,
        nearestInterview,
        status: openRounds.length > 0 ? 'Interviewing' : 'Active',
      };
    });

    return rows.sort((a, b) => {
      if (a.nearestInterview && b.nearestInterview) {
        return new Date(a.nearestInterview).getTime() - new Date(b.nearestInterview).getTime();
      }
      if (a.nearestInterview) return -1;
      if (b.nearestInterview) return 1;
      return b.applied - a.applied;
    });
  }

  // ─────────────── Students requiring attention ───────────────
  private async attentionCategoryWhere(collegeId: string, category: string) {
    const base = { collegeId, isActive: true } as const;
    if (category === 'withoutResume') return { ...base, resume: null };
    if (category === 'incompleteProfile') return { ...base, profileCompletion: { lt: 100 } };
    if (category === 'pendingDocuments') {
      return {
        ...base,
        OR: [
          { panNumber: null },
          { tenthBoard: null },
          { tenthPassingYear: null },
          { twelfthBoard: null },
          { twelfthPassingYear: null },
        ],
      };
    }
    if (category === 'withoutInternship') {
      const withInternship = await this.prisma.internship.findMany({
        where: { collegeId },
        select: { studentId: true },
        distinct: ['studentId'],
      });
      return { ...base, id: { notIn: withInternship.map((i) => i.studentId) } };
    }
    if (category === 'eligibleNotApplying' || category === 'noParticipation') {
      const [withApps, withInternships] = await Promise.all([
        this.prisma.application.findMany({
          where: { collegeId },
          select: { studentId: true },
          distinct: ['studentId'],
        }),
        this.prisma.internship.findMany({
          where: { collegeId },
          select: { studentId: true },
          distinct: ['studentId'],
        }),
      ]);
      const appliedIds = new Set(withApps.map((a) => a.studentId));
      const internedIds = new Set(withInternships.map((i) => i.studentId));
      if (category === 'eligibleNotApplying') {
        return {
          ...base,
          verificationStatus: 'VERIFIED' as const,
          resume: { isNot: null },
          id: { notIn: [...appliedIds] },
        };
      }
      // No participation at all: never applied AND never logged an internship.
      return { ...base, id: { notIn: [...appliedIds, ...internedIds] } };
    }
    throw new Error(`Unknown attention category: ${category}`);
  }

  async studentsRequiringAttention(collegeId: string) {
    const categories = [
      'withoutResume',
      'incompleteProfile',
      'eligibleNotApplying',
      'noParticipation',
      'withoutInternship',
      'pendingDocuments',
    ] as const;
    const counts = await Promise.all(
      categories.map(async (c) => {
        const where = await this.attentionCategoryWhere(collegeId, c);
        return this.prisma.student.count({ where: where as never });
      }),
    );
    return Object.fromEntries(categories.map((c, i) => [c, counts[i]])) as Record<
      (typeof categories)[number],
      number
    >;
  }

  async studentsInAttentionCategory(collegeId: string, category: string) {
    const where = await this.attentionCategoryWhere(collegeId, category);
    const students = await this.prisma.student.findMany({
      where: where as never,
      select: {
        id: true,
        rollNumber: true,
        school: true,
        programme: true,
        user: { select: { fullName: true, email: true, phone: true } },
      },
      orderBy: { rollNumber: 'asc' },
      take: 500,
    });
    return students.map((s) => ({
      id: s.id,
      rollNumber: s.rollNumber,
      fullName: s.user.fullName,
      school: s.school,
      programme: s.programme,
      email: s.user.email,
      phone: s.user.phone,
    }));
  }

  // ─────────────── Breakdowns ───────────────
  async breakdowns(collegeId: string) {
    const [byProgramme, byBatch, byCompany] = await Promise.all([
      this.programmeBreakdown(collegeId),
      this.batchBreakdown(collegeId),
      this.companyBreakdown(collegeId),
    ]);
    return { byProgramme, byBatch, byCompany };
  }

  // ─────────────── Platform-wide (PLATFORM_ADMIN, all colleges) ───────────────
  // Cross-tenant aggregate. Unlike every other method here this is intentionally
  // NOT scoped to a collegeId — it powers the Platform Admin dashboard.
  async platformOverview() {
    const [
      colleges,
      activeColleges,
      students,
      verifiedStudents,
      placedStudents,
      jobs,
      platformJobs,
      applications,
      offers,
    ] = await Promise.all([
      this.prisma.college.count(),
      this.prisma.college.count({ where: { isActive: true } }),
      this.prisma.student.count(),
      this.prisma.student.count({ where: { verificationStatus: 'VERIFIED' } }),
      this.prisma.application
        .groupBy({
          by: ['studentId'],
          where: { stage: { in: [...PLACING_STAGES] } },
          _count: { _all: true },
        })
        .then((g) => g.length),
      this.prisma.job.count(),
      this.prisma.job.count({ where: { scope: 'PLATFORM' } }),
      this.prisma.application.count(),
      this.prisma.application.count({ where: { stage: { in: [...OFFER_STAGES] } } }),
    ]);

    const placementRate =
      verifiedStudents > 0 ? Math.round((placedStudents / verifiedStudents) * 1000) / 10 : 0;

    return {
      colleges,
      activeColleges,
      students,
      verifiedStudents,
      placedStudents,
      jobs,
      platformJobs,
      applications,
      offers,
      placementRate,
      studentsByCollege: await this.studentsByCollege(),
      placementsByBatch: await this.platformPlacementsByBatch(),
    };
  }

  // Top colleges by registered student count (for a dashboard breakdown).
  private async studentsByCollege() {
    const grouped = await this.prisma.student.groupBy({
      by: ['collegeId'],
      _count: { _all: true },
    });
    const colleges = await this.prisma.college.findMany({ select: { id: true, name: true } });
    const nameById = new Map(colleges.map((c) => [c.id, c.name]));
    return grouped
      .map((g) => ({
        collegeId: g.collegeId,
        name: nameById.get(g.collegeId) ?? 'Unknown',
        students: g._count._all,
      }))
      .sort((a, b) => b.students - a.students)
      .slice(0, 8);
  }

  // Platform-wide placements grouped by graduation year.
  private async platformPlacementsByBatch() {
    const placed = await this.prisma.application.findMany({
      where: { stage: { in: [...PLACING_STAGES] } },
      select: { student: { select: { graduationYear: true } } },
    });
    const map = new Map<number, number>();
    for (const a of placed) {
      const y = a.student.graduationYear;
      map.set(y, (map.get(y) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([graduationYear, placements]) => ({ graduationYear, placements }));
  }

  private async programmeBreakdown(collegeId: string) {
    const students = await this.prisma.student.findMany({
      where: { collegeId, isActive: true },
      select: { programme: true },
    });
    const placed = await this.prisma.application.findMany({
      where: { collegeId, stage: { in: [...PLACING_STAGES] } },
      select: { studentId: true, student: { select: { programme: true } } },
      distinct: ['studentId'],
    });
    const placedByProgramme = new Map<string, Set<string>>();
    for (const a of placed) {
      const b = a.student.programme;
      const set = placedByProgramme.get(b) ?? new Set<string>();
      set.add(a.studentId);
      placedByProgramme.set(b, set);
    }
    const map = new Map<string, { total: number; placed: number }>();
    for (const s of students) {
      const row = map.get(s.programme) ?? { total: 0, placed: 0 };
      row.total++;
      map.set(s.programme, row);
    }
    for (const [programme, set] of placedByProgramme) {
      const row = map.get(programme) ?? { total: 0, placed: 0 };
      row.placed = set.size;
      map.set(programme, row);
    }
    return [...map.entries()].map(([programme, { total, placed }]) => ({
      programme,
      total,
      placed,
      placementRate: total > 0 ? Math.round((placed / total) * 1000) / 10 : 0,
    }));
  }

  private async batchBreakdown(collegeId: string) {
    const students = await this.prisma.student.findMany({
      where: { collegeId, isActive: true },
      select: { graduationYear: true },
    });
    const placed = await this.prisma.application.findMany({
      where: { collegeId, stage: { in: [...PLACING_STAGES] } },
      select: { studentId: true, student: { select: { graduationYear: true } } },
      distinct: ['studentId'],
    });
    const placedByYear = new Map<number, Set<string>>();
    for (const a of placed) {
      const y = a.student.graduationYear;
      const set = placedByYear.get(y) ?? new Set<string>();
      set.add(a.studentId);
      placedByYear.set(y, set);
    }
    const map = new Map<number, { total: number; placed: number }>();
    for (const s of students) {
      const row = map.get(s.graduationYear) ?? { total: 0, placed: 0 };
      row.total++;
      map.set(s.graduationYear, row);
    }
    for (const [year, set] of placedByYear) {
      const row = map.get(year) ?? { total: 0, placed: 0 };
      row.placed = set.size;
      map.set(year, row);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([graduationYear, { total, placed }]) => ({
        graduationYear,
        total,
        placed,
        placementRate: total > 0 ? Math.round((placed / total) * 1000) / 10 : 0,
      }));
  }

  // Hires (placing-stage applications) grouped by hiring company.
  private async companyBreakdown(collegeId: string) {
    const apps = await this.prisma.application.findMany({
      where: { collegeId, stage: { in: [...PLACING_STAGES] } },
      select: {
        offerCtc: true,
        job: {
          select: {
            companyName: true,
            ctcMin: true,
            ctcMax: true,
            company: { select: { name: true } },
          },
        },
      },
    });
    const map = new Map<string, { hires: number; packages: number[] }>();
    for (const a of apps) {
      const name = a.job.company?.name ?? a.job.companyName ?? 'Unknown';
      const row = map.get(name) ?? { hires: 0, packages: [] };
      row.hires++;
      const ctc = effectiveCtc(a.offerCtc, a.job);
      if (ctc != null) row.packages.push(ctc);
      map.set(name, row);
    }
    return [...map.entries()]
      .map(([company, { hires, packages }]) => ({
        company,
        hires,
        avgPackage: packages.length ? Math.round(mean(packages)) : null,
      }))
      .sort((a, b) => b.hires - a.hires);
  }
}

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs: number[]) {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
