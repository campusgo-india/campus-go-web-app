import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PRISMA } from '../../common/prisma.module';
import { Prisma } from '@campusgo/database';
import type { PrismaClient, Student } from '@campusgo/database';
import {
  CreateJobDto,
  CreatePlatformJobDto,
  ListJobsQuery,
  UpdateJobDto,
  UpdatePlatformJobDto,
} from './dto';
import { NotificationsService } from '../notifications/notifications.service';
import { renderFormalEmail, COLLEGE_NAME_TOKEN } from '../notifications/email-templates';
import { PlacementPolicyService } from '../placement-policy/placement-policy.service';
import { assertOwnJob, jobVisibleToCollege, type Viewer } from './job-scope.util';
import {
  checkEligibility,
  checkApplyEligibility,
  type EligibilityJob,
  type EligibilityStudent,
} from './eligibility';

// A custom application question stored on Job.applicationFormFields (as JSON).
interface ApplicationField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  options?: string[];
  required?: boolean;
}

@Injectable()
export class JobsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    private readonly placementPolicy: PlacementPolicyService,
  ) {}

  private decimalOrNull(v: number | undefined | null): Prisma.Decimal | null {
    return v != null ? new Prisma.Decimal(v) : null;
  }

  private webOrigin(): string {
    return this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
  }

  private ctcRange(min: Prisma.Decimal | null, max: Prisma.Decimal | null): string {
    const fmt = (v: Prisma.Decimal) => `₹${(Number(v) / 100000).toFixed(1)} LPA`;
    if (min != null && max != null) return min.equals(max) ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
    if (min != null) return fmt(min);
    if (max != null) return fmt(max);
    return 'As per Job Description';
  }

  /** The formal "Placement Opportunity" email sent to eligible students when
   * a job is published — Company / Position / Eligibility / Location / CTC /
   * Last Date to Apply, matching the placement-cell mail template. */
  private newJobEmail(
    job: {
      id: string;
      title: string;
      location: string | null;
      ctcMin: Prisma.Decimal | null;
      ctcMax: Prisma.Decimal | null;
      eligibleProgrammes: string[];
      applicationDeadline: Date | null;
    },
    companyName: string | null,
    jobId: string,
  ): { subject: string; html: string } {
    const company = companyName ?? 'A recruiter';
    const deadline = job.applicationDeadline
      ? job.applicationDeadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;
    const programmes = job.eligibleProgrammes.length ? job.eligibleProgrammes.join(', ') : 'All programmes';
    return {
      subject: `Placement Opportunity – ${company} | ${job.title} | ${programmes} | ${this.ctcRange(job.ctcMin, job.ctcMax)}${deadline ? ` | ${deadline}` : ''}`,
      html: renderFormalEmail({
        collegeName: COLLEGE_NAME_TOKEN,
        intro: `We are pleased to inform you that ${company} is conducting a placement drive for the position of ${job.title}.`,
        fields: [
          { label: 'Company', value: company },
          { label: 'Position', value: job.title },
          { label: 'Eligibility', value: `${programmes} — see the attached Job Description` },
          { label: 'Location', value: job.location ?? 'As per Job Description' },
          { label: 'CTC', value: this.ctcRange(job.ctcMin, job.ctcMax) },
          ...(deadline ? [{ label: 'Last Date to Apply', value: deadline }] : []),
        ],
        note: 'Please go through the Job Description carefully before applying.',
        ctaLabel: 'Apply Now',
        ctaUrl: `${this.webOrigin()}/me/jobs/${jobId}`,
      }),
    };
  }

  // ─────────────── Placement Officer: job lifecycle ───────────────

  async create(collegeId: string, createdById: string, dto: CreateJobDto) {
    // Company is optional now: link an existing one if an id is given, else the
    // free-text companyName (or nothing). Job posting is independent of the POC/
    // company directory.
    let resolvedCompanyId = dto.companyId;
    if (dto.companyId) {
      const company = await this.prisma.company.findFirst({
        where: { id: dto.companyId, collegeId },
      });
      if (!company) throw new BadRequestException('Company not found');
    } else if (dto.companyName?.trim()) {
      // The quick-post form's autocomplete only ever sends a name, even when
      // the officer picks an EXISTING company from its own suggestions — link
      // it anyway so hiring history, the companies list's job count, etc.
      // don't silently miss this job. A name that matches nothing yet is left
      // as free text, same as before.
      const existing = await this.prisma.company.findFirst({
        where: { collegeId, name: { equals: dto.companyName.trim(), mode: 'insensitive' } },
        select: { id: true },
      });
      resolvedCompanyId = existing?.id;
    }

    const {
      companyId,
      ctcMin,
      ctcMax,
      minCgpa,
      minTenthPercentage,
      minTwelfthPercentage,
      minUgPercentage,
      applicationDeadline,
      applicationFormFields,
      ...rest
    } = dto;
    return this.prisma.job.create({
      data: {
        collegeId,
        companyId: resolvedCompanyId ?? null,
        createdById,
        ...rest,
        ctcMin: this.decimalOrNull(ctcMin),
        ctcMax: this.decimalOrNull(ctcMax),
        minCgpa: this.decimalOrNull(minCgpa),
        minTenthPercentage: this.decimalOrNull(minTenthPercentage),
        minTwelfthPercentage: this.decimalOrNull(minTwelfthPercentage),
        minUgPercentage: this.decimalOrNull(minUgPercentage),
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
        ...(applicationFormFields !== undefined
          ? { applicationFormFields: applicationFormFields as unknown as Prisma.InputJsonValue }
          : {}),
      },
      include: { company: true },
    });
  }

  async list(collegeId: string, q: ListJobsQuery, viewer?: Viewer) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 25;
    // Every officer at the college sees every one of the college's jobs (plus
    // platform jobs broadcast to it) — view-only for a job they didn't post;
    // `assertOwnJob` still gates the actual manage/edit/round actions on it.
    // Each condition below may itself carry an OR clause, so they're combined via
    // AND (not a flat spread) to avoid one OR silently clobbering another —
    // notably, `visibleToCollege` must never be dropped by `q.search`'s OR.
    const where: Prisma.JobWhereInput = {
      AND: [
        this.visibleToCollege(collegeId),
        ...(q.status ? [{ status: q.status as Prisma.JobWhereInput['status'] }] : []),
        ...(q.createdById ? [{ createdById: q.createdById }] : []),
        ...(q.search
          ? [
              {
                OR: [
                  { title: { contains: q.search, mode: 'insensitive' as const } },
                  { companyName: { contains: q.search, mode: 'insensitive' as const } },
                  { company: { name: { contains: q.search, mode: 'insensitive' as const } } },
                ],
              },
            ]
          : []),
      ],
    };

    const [total, jobs] = await this.prisma.$transaction([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        // Count only THIS college's applicants, even for a shared platform job.
        include: {
          company: true,
          createdBy: { select: { id: true, fullName: true } },
          _count: {
            select: {
              applications: { where: { collegeId } },
              rounds: { where: { collegeId } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // How many of this college's applicants have been placed on each job — a
    // second query because Prisma's `_count` can't filter the same relation
    // twice (once for "all applicants", once for "selected") in one include.
    const [selectedByJob, verifiedStudents, placedIds] = await Promise.all([
      this.prisma.application.groupBy({
        by: ['jobId'],
        where: { jobId: { in: jobs.map((j) => j.id) }, collegeId, status: 'SELECTED' },
        _count: { id: true },
      }),
      this.prisma.student.findMany({
        where: { collegeId, isActive: true, verificationStatus: 'VERIFIED' },
        include: { user: true, resume: { select: { id: true } } },
      }),
      this.placedStudentIds(collegeId),
    ]);
    const selectedCountById = new Map(selectedByJob.map((s) => [s.jobId, s._count.id]));

    // Eligible headcount per job on this page — verified students matched
    // against each job's criteria (same rule as GET :id/eligible-students).
    const eligibleStudentModels = verifiedStudents.map((s) => ({
      s,
      model: toEligibilityStudent(s, placedIds.has(s.id)),
    }));
    const eligibleCountById = new Map<string, number>(
      jobs.map((j) => {
        const criteria = toEligibilityJob(j);
        const n = eligibleStudentModels.reduce(
          (acc, { model }) => acc + (checkEligibility(model, criteria).eligible ? 1 : 0),
          0,
        );
        return [j.id, n];
      }),
    );

    return {
      items: jobs.map((j) =>
        this.publicJob(j, {
          selectedCount: selectedCountById.get(j.id) ?? 0,
          eligibleCount: eligibleCountById.get(j.id) ?? 0,
        }),
      ),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  // View-only: any officer at the college can see any of the college's job
  // details, not just the ones they posted — assertOwnJob only gates managing
  // (edit/publish/close/delete/rounds) it, in the methods below.
  async findOne(collegeId: string, id: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, ...this.visibleToCollege(collegeId) },
      include: {
        company: true,
        createdBy: { select: { id: true, fullName: true } },
        _count: {
          select: {
            applications: { where: { collegeId } },
            rounds: { where: { collegeId } },
          },
        },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    const selectedCount = await this.prisma.application.count({
      where: { jobId: id, collegeId, status: 'SELECTED' },
    });
    return this.publicJob(job, { selectedCount });
  }

  async update(collegeId: string, id: string, dto: UpdateJobDto, viewer?: Viewer) {
    const job = await this.prisma.job.findFirst({ where: { id, collegeId } });
    if (!job) throw new NotFoundException('Job not found');
    assertOwnJob(job, viewer);
    if (job.status === 'CLOSED') throw new BadRequestException('Cannot edit a closed job');

    const {
      ctcMin,
      ctcMax,
      minCgpa,
      minTenthPercentage,
      minTwelfthPercentage,
      minUgPercentage,
      applicationDeadline,
      applicationFormFields,
      ...rest
    } = dto;
    const updated = await this.prisma.job.update({
      where: { id },
      data: {
        ...rest,
        ...(ctcMin !== undefined ? { ctcMin: this.decimalOrNull(ctcMin) } : {}),
        ...(ctcMax !== undefined ? { ctcMax: this.decimalOrNull(ctcMax) } : {}),
        ...(minCgpa !== undefined ? { minCgpa: this.decimalOrNull(minCgpa) } : {}),
        ...(minTenthPercentage !== undefined
          ? { minTenthPercentage: this.decimalOrNull(minTenthPercentage) }
          : {}),
        ...(minTwelfthPercentage !== undefined
          ? { minTwelfthPercentage: this.decimalOrNull(minTwelfthPercentage) }
          : {}),
        ...(minUgPercentage !== undefined
          ? { minUgPercentage: this.decimalOrNull(minUgPercentage) }
          : {}),
        ...(applicationDeadline !== undefined
          ? { applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null }
          : {}),
        ...(applicationFormFields !== undefined
          ? { applicationFormFields: applicationFormFields as unknown as Prisma.InputJsonValue }
          : {}),
      },
      include: { company: true, _count: { select: { applications: true } } },
    });
    return this.publicJob(updated);
  }

  async publish(collegeId: string, id: string, viewer?: Viewer) {
    const job = await this.prisma.job.findFirst({ where: { id, collegeId } });
    if (!job) throw new NotFoundException('Job not found');
    assertOwnJob(job, viewer);
    if (job.status === 'PUBLISHED') throw new BadRequestException('Job already published');
    if (job.status === 'CLOSED') throw new BadRequestException('Cannot publish a closed job');

    const updated = await this.prisma.job.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
      include: { company: true, _count: { select: { applications: true } } },
    });

    // Alert eligible students at the college that a new job is live — the
    // mail-template convention ("Placement Coordinators of the job eligible
    // departments") only makes sense against the students who can actually
    // apply, not every active student regardless of programme/CGPA/backlogs.
    const eligible = await this.eligibleStudents(collegeId, id);
    if (eligible.length > 0) {
      const recs = await this.prisma.student.findMany({
        where: { id: { in: eligible.map((e) => e.id) } },
        select: { userId: true },
      });
      const companyName = updated.company?.name ?? updated.companyName ?? null;
      await this.notifications.notifyMany(
        recs.map((r) => r.userId),
        collegeId,
        {
          type: 'GENERAL',
          title: 'New job posted',
          body: companyName ? `${updated.title} · ${companyName}` : updated.title,
          link: `/me/jobs/${id}`,
          email: this.newJobEmail(updated, companyName, id),
        },
      );
    }
    return { job: this.publicJob(updated), eligibleCount: eligible.length };
  }

  async publishMany(collegeId: string, ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    const jobs = await this.prisma.job.findMany({
      where: { id: { in: uniqueIds }, collegeId },
      include: { company: true },
    });
    if (jobs.length !== uniqueIds.length) {
      throw new NotFoundException('One or more jobs not found');
    }

    const invalid = jobs.filter((j) => j.status !== 'DRAFT');
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Only draft jobs can be published. ${invalid.length} selected job(s) are not drafts.`,
      );
    }

    const now = new Date();
    const [, updated] = await this.prisma.$transaction([
      this.prisma.job.updateMany({
        where: { id: { in: uniqueIds }, collegeId, status: 'DRAFT' },
        data: { status: 'PUBLISHED', publishedAt: now },
      }),
      this.prisma.job.findMany({
        where: { id: { in: uniqueIds }, collegeId },
        include: { company: true, _count: { select: { applications: true } } },
      }),
    ]);

    // One batched notification per newly published job, to students actually
    // eligible for that specific job (see publish() for why — not every
    // active student, so the mail-template's "eligible departments" holds).
    for (const j of updated) {
      const eligible = await this.eligibleStudents(collegeId, j.id);
      if (eligible.length === 0) continue;
      const recs = await this.prisma.student.findMany({
        where: { id: { in: eligible.map((e) => e.id) } },
        select: { userId: true },
      });
      const companyName = j.company?.name ?? j.companyName ?? null;
      await this.notifications.notifyMany(
        recs.map((r) => r.userId),
        collegeId,
        {
          type: 'GENERAL',
          title: 'New job posted',
          body: companyName ? `${j.title} · ${companyName}` : j.title,
          link: `/me/jobs/${j.id}`,
          email: this.newJobEmail(j, companyName, j.id),
        },
      );
    }

    return {
      count: updated.length,
      jobs: updated.map((j) => this.publicJob(j)),
    };
  }

  // Resolve a job's (private) PDF reference for streaming — scoped to jobs the
  // caller's college can see (own + platform jobs targeted to them).
  async pdfRef(collegeId: string, id: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, ...this.visibleToCollege(collegeId) },
      select: { pdfUrl: true, pdfName: true },
    });
    if (!job?.pdfUrl) throw new NotFoundException('No PDF for this job');
    return { pdfUrl: job.pdfUrl, pdfName: job.pdfName };
  }

  async remove(collegeId: string, id: string, viewer?: Viewer) {
    // Only the owning college can delete its own job (platform jobs excluded by
    // the collegeId filter). Applications cascade-delete with the job.
    const job = await this.prisma.job.findFirst({ where: { id, collegeId } });
    if (!job) throw new NotFoundException('Job not found');
    assertOwnJob(job, viewer);
    await this.prisma.job.delete({ where: { id } });
    return { success: true };
  }

  async close(collegeId: string, id: string, viewer?: Viewer) {
    const job = await this.prisma.job.findFirst({ where: { id, collegeId } });
    if (!job) throw new NotFoundException('Job not found');
    assertOwnJob(job, viewer);
    if (job.status === 'CLOSED') throw new BadRequestException('Job already closed');

    const updated = await this.prisma.job.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
      include: { company: true, _count: { select: { applications: true } } },
    });
    return this.publicJob(updated);
  }

  // "Placed" here means blocked from applying to further jobs by the
  // college's configured offer-limit policy (Settings → Placement Policy) —
  // not the legacy ATS stage. No policy configured = nobody is blocked.
  private async placedStudentIds(collegeId: string) {
    return this.placementPolicy.restrictedStudentIds(collegeId);
  }

  private async isStudentPlaced(collegeId: string, studentId: string) {
    return this.placementPolicy.isRestricted(collegeId, studentId);
  }

  // Officer preview: every active, verified, non-placed student who matches.
  async eligibleStudents(collegeId: string, jobId: string, viewer?: Viewer) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, ...this.visibleToCollege(collegeId) },
    });
    if (!job) throw new NotFoundException('Job not found');
    assertOwnJob(job, viewer);

    const [students, applied] = await Promise.all([
      this.prisma.student.findMany({
        where: {
          collegeId,
          isActive: true,
          verificationStatus: 'VERIFIED',
        },
        include: { user: true, resume: { select: { id: true } } },
      }),
      this.prisma.application.findMany({
        where: { jobId, collegeId },
        select: { studentId: true },
      }),
    ]);
    const appliedIds = new Set(applied.map((a) => a.studentId));

    const placedStudentIds = await this.placedStudentIds(collegeId);
    const criteria = toEligibilityJob(job);
    return students
      .filter(
        (s) =>
          checkEligibility(toEligibilityStudent(s, placedStudentIds.has(s.id)), criteria).eligible,
      )
      .map((s) => ({
        id: s.id,
        rollNumber: s.rollNumber,
        fullName: s.user.fullName,
        email: s.user.email,
        phone: s.user.phone ?? null,
        programme: s.programme,
        cgpa: s.cgpa != null ? Number(s.cgpa) : null,
        // Whether this student has applied to this job — lets the officer
        // focus on eligible students who haven't applied yet.
        applied: appliedIds.has(s.id),
      }));
  }

  async resolveAssignedProgrammes(userId: string): Promise<string[]> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { assignedProgrammes: true },
    });
    return u?.assignedProgrammes ?? [];
  }

  /**
   * For one job: every student in `programmes` (or the whole college if
   * omitted), annotated with whether they've applied and their current stage.
   * Built for Placement Coordinators ("who in my programmes applied, who
   * didn't"), but usable by any officer with an explicit programme filter.
   */
  async applicantStatusByProgramme(
    collegeId: string,
    jobId: string,
    programmes?: string[],
    viewer?: Viewer,
  ) {
    const job = await this.prisma.job.findFirst({ where: { id: jobId, ...this.visibleToCollege(collegeId) } });
    if (!job) throw new NotFoundException('Job not found');
    assertOwnJob(job, viewer);

    const programmeWhere = programmes?.length ? { programme: { in: programmes } } : {};
    const [students, applications] = await Promise.all([
      this.prisma.student.findMany({
        where: { collegeId, graduatedAt: null, ...programmeWhere },
        include: { user: { select: { fullName: true } } },
        orderBy: { rollNumber: 'asc' },
      }),
      this.prisma.application.findMany({
        where: {
          jobId,
          collegeId,
          ...(programmes?.length ? { student: { programme: { in: programmes } } } : {}),
        },
        select: { studentId: true, stage: true, appliedAt: true },
      }),
    ]);
    const byStudentId = new Map(applications.map((a) => [a.studentId, a]));

    return students.map((s) => ({
      id: s.id,
      rollNumber: s.rollNumber,
      fullName: s.user.fullName,
      programme: s.programme,
      applied: byStudentId.has(s.id),
      stage: byStudentId.get(s.id)?.stage ?? null,
      appliedAt: byStudentId.get(s.id)?.appliedAt ?? null,
    }));
  }

  // ─────────────── Platform Admin: cross-college broadcast jobs ───────────────

  async createPlatform(createdById: string, dto: CreatePlatformJobDto) {
    await this.assertCollegesExist(dto.targetCollegeIds);

    const {
      companyName,
      targetCollegeIds,
      ctcMin,
      ctcMax,
      minCgpa,
      minTenthPercentage,
      minTwelfthPercentage,
      minUgPercentage,
      applicationDeadline,
      applicationFormFields,
      ...rest
    } = dto;
    const job = await this.prisma.job.create({
      data: {
        scope: 'PLATFORM',
        collegeId: null,
        companyId: null,
        companyName,
        targetCollegeIds,
        createdById,
        ...rest,
        ctcMin: this.decimalOrNull(ctcMin),
        ctcMax: this.decimalOrNull(ctcMax),
        minCgpa: this.decimalOrNull(minCgpa),
        minTenthPercentage: this.decimalOrNull(minTenthPercentage),
        minTwelfthPercentage: this.decimalOrNull(minTwelfthPercentage),
        minUgPercentage: this.decimalOrNull(minUgPercentage),
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
        ...(applicationFormFields !== undefined
          ? { applicationFormFields: applicationFormFields as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });
    return this.publicJob({ ...job, company: null });
  }

  async listPlatform(q: ListJobsQuery) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 25;
    const where: Prisma.JobWhereInput = {
      scope: 'PLATFORM',
      ...(q.status ? { status: q.status as Prisma.JobWhereInput['status'] } : {}),
      ...(q.search ? { title: { contains: q.search, mode: 'insensitive' } } : {}),
    };

    const [total, jobs] = await this.prisma.$transaction([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        include: { _count: { select: { applications: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: jobs.map((j) => this.publicJob({ ...j, company: null })),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOnePlatform(id: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, scope: 'PLATFORM' },
      include: { _count: { select: { applications: true } } },
    });
    if (!job) throw new NotFoundException('Job not found');
    return this.publicJob({ ...job, company: null });
  }

  async updatePlatform(id: string, dto: UpdatePlatformJobDto) {
    const job = await this.prisma.job.findFirst({ where: { id, scope: 'PLATFORM' } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status === 'CLOSED') throw new BadRequestException('Cannot edit a closed job');
    if (dto.targetCollegeIds) await this.assertCollegesExist(dto.targetCollegeIds);

    const {
      ctcMin,
      ctcMax,
      minCgpa,
      minTenthPercentage,
      minTwelfthPercentage,
      minUgPercentage,
      applicationDeadline,
      applicationFormFields,
      ...rest
    } = dto;
    const updated = await this.prisma.job.update({
      where: { id },
      data: {
        ...rest,
        ...(ctcMin !== undefined ? { ctcMin: this.decimalOrNull(ctcMin) } : {}),
        ...(ctcMax !== undefined ? { ctcMax: this.decimalOrNull(ctcMax) } : {}),
        ...(minCgpa !== undefined ? { minCgpa: this.decimalOrNull(minCgpa) } : {}),
        ...(minTenthPercentage !== undefined
          ? { minTenthPercentage: this.decimalOrNull(minTenthPercentage) }
          : {}),
        ...(minTwelfthPercentage !== undefined
          ? { minTwelfthPercentage: this.decimalOrNull(minTwelfthPercentage) }
          : {}),
        ...(minUgPercentage !== undefined
          ? { minUgPercentage: this.decimalOrNull(minUgPercentage) }
          : {}),
        ...(applicationDeadline !== undefined
          ? { applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null }
          : {}),
        ...(applicationFormFields !== undefined
          ? { applicationFormFields: applicationFormFields as unknown as Prisma.InputJsonValue }
          : {}),
      },
      include: { _count: { select: { applications: true } } },
    });
    return this.publicJob({ ...updated, company: null });
  }

  async publishPlatform(id: string) {
    const job = await this.prisma.job.findFirst({ where: { id, scope: 'PLATFORM' } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status === 'PUBLISHED') throw new BadRequestException('Job already published');
    if (job.status === 'CLOSED') throw new BadRequestException('Cannot publish a closed job');
    if (job.targetCollegeIds.length === 0) {
      throw new BadRequestException('Select at least one target college before publishing');
    }

    const updated = await this.prisma.job.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
      include: { _count: { select: { applications: true } } },
    });
    return this.publicJob({ ...updated, company: null });
  }

  async closePlatform(id: string) {
    const job = await this.prisma.job.findFirst({ where: { id, scope: 'PLATFORM' } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status === 'CLOSED') throw new BadRequestException('Job already closed');

    const updated = await this.prisma.job.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
      include: { _count: { select: { applications: true } } },
    });
    return this.publicJob({ ...updated, company: null });
  }

  private async assertCollegesExist(ids: string[]) {
    const found = await this.prisma.college.count({ where: { id: { in: ids } } });
    if (found !== ids.length)
      throw new BadRequestException('One or more target colleges are invalid');
  }

  // ─────────────── Student-facing ───────────────

  // A student sees a job if it's their own college's job, OR a platform-broadcast
  // job that targets their college. (collegeId is non-null for any real student.)
  private visibleToCollege(collegeId: string): Prisma.JobWhereInput {
    return jobVisibleToCollege(collegeId);
  }

  // Student job feed: every published job visible to the college, plus closed
  // jobs the student already applied to (so they can track outcomes). Annotated
  // with eligibility and application state.
  async studentFeed(userId: string) {
    const student = await this.studentForUser(userId);

    const publishedJobs = await this.prisma.job.findMany({
      where: { status: 'PUBLISHED', ...this.visibleToCollege(student.collegeId) },
      include: { company: true, _count: { select: { applications: true, rounds: true } } },
      orderBy: { publishedAt: 'desc' },
    });

    // Include all closed jobs visible to the college so students can browse
    // archived postings under the "Closed" category.
    const closedJobs = await this.prisma.job.findMany({
      where: { status: 'CLOSED', ...this.visibleToCollege(student.collegeId) },
      include: { company: true, _count: { select: { applications: true, rounds: true } } },
      orderBy: { closedAt: 'desc' },
    });

    // There should be no overlap (statuses are mutually exclusive), but dedupe
    // defensively and keep published jobs first.
    const seen = new Set<string>();
    const jobs: typeof publishedJobs = [];
    for (const j of [...publishedJobs, ...closedJobs]) {
      if (seen.has(j.id)) continue;
      seen.add(j.id);
      jobs.push(j);
    }

    const isPlaced = await this.isStudentPlaced(student.collegeId, student.id);
    const me = toEligibilityStudent(student, isPlaced);

    const myApps = await this.prisma.application.findMany({
      where: { studentId: student.id, jobId: { in: jobs.map((j) => j.id) } },
      select: { jobId: true, stage: true },
    });
    const appliedMap = new Map(myApps.map((a) => [a.jobId, a.stage]));

    // Selected-per-job → drives the "Completed" lifecycle label on the student feed.
    const selectedByJob = await this.prisma.application.groupBy({
      by: ['jobId'],
      where: { jobId: { in: jobs.map((j) => j.id) }, status: 'SELECTED' },
      _count: { _all: true },
    });
    const selectedCountById = new Map(selectedByJob.map((s) => [s.jobId, s._count._all]));

    // Only surface jobs that match the student's hard criteria (school, graduation
    // year). Jobs the student has already applied to are always shown so they can
    // track their applications even if a criteria changes later.
    const visibleJobs = jobs.filter(
      (j) => appliedMap.has(j.id) || matchesStudentSchoolAndYear(student, j),
    );

    return visibleJobs.map((j) => {
      const { eligible, reasons } = checkApplyEligibility(me, toEligibilityJob(j));
      return {
        ...this.publicJob(j, { selectedCount: selectedCountById.get(j.id) ?? 0 }),
        eligible,
        eligibilityReasons: reasons,
        applied: appliedMap.has(j.id),
        myStage: appliedMap.get(j.id) ?? null,
      };
    });
  }

  // Lean count for the "Get Active in Placements" nudge — same eligibility
  // rule as studentFeed() (published, not yet applied, hard + soft criteria
  // all met), without fetching full job payloads.
  async matchingOpenJobsCount(userId: string): Promise<number> {
    const student = await this.studentForUser(userId);
    const jobs = await this.prisma.job.findMany({
      where: { status: 'PUBLISHED', ...this.visibleToCollege(student.collegeId) },
    });

    const isPlaced = await this.isStudentPlaced(student.collegeId, student.id);
    const me = toEligibilityStudent(student, isPlaced);

    const myApps = await this.prisma.application.findMany({
      where: { studentId: student.id, jobId: { in: jobs.map((j) => j.id) } },
      select: { jobId: true },
    });
    const appliedIds = new Set(myApps.map((a) => a.jobId));

    return jobs.filter(
      (j) =>
        !appliedIds.has(j.id) &&
        matchesStudentSchoolAndYear(student, j) &&
        checkApplyEligibility(me, toEligibilityJob(j)).eligible,
    ).length;
  }

  async studentJobDetail(userId: string, jobId: string) {
    const student = await this.studentForUser(userId);
    const jobRow = await this.prisma.job.findFirst({
      where: { id: jobId, ...this.visibleToCollege(student.collegeId) },
      include: { company: true, _count: { select: { rounds: true, applications: true } } },
    });
    if (!jobRow) throw new NotFoundException('Job not found');
    const { _count, ...job } = jobRow;

    const app = await this.prisma.application.findUnique({
      where: { jobId_studentId: { jobId, studentId: student.id } },
      select: { stage: true },
    });

    const selectedCount = await this.prisma.application.count({
      where: { jobId, status: 'SELECTED' },
    });

    // Students can view published jobs, or closed jobs they applied to.
    if (job.status !== 'PUBLISHED' && !(job.status === 'CLOSED' && app)) {
      throw new NotFoundException('Job not found');
    }

    const isPlaced = await this.isStudentPlaced(student.collegeId, student.id);
    const { eligible, reasons } = checkApplyEligibility(
      toEligibilityStudent(student, isPlaced),
      toEligibilityJob(job),
    );

    return {
      ...this.publicJob({ ...job, _count }, { selectedCount }),
      eligible,
      eligibilityReasons: reasons,
      applied: !!app,
      myStage: app?.stage ?? null,
      totalRounds: _count.rounds,
    };
  }

  async apply(userId: string, jobId: string, formResponses?: Record<string, string>) {
    const student = await this.studentForUser(userId);
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, ...this.visibleToCollege(student.collegeId) },
    });
    if (!job || job.status !== 'PUBLISHED') throw new NotFoundException('Job not found');

    if (job.applicationDeadline && job.applicationDeadline.getTime() < Date.now()) {
      throw new BadRequestException('Application deadline has passed');
    }

    // Re-validate eligibility server-side — the feed is not the authority.
    const isPlaced = await this.isStudentPlaced(student.collegeId, student.id);
    const { eligible, reasons } = checkApplyEligibility(
      toEligibilityStudent(student, isPlaced),
      toEligibilityJob(job),
    );
    if (!eligible) throw new ForbiddenException(`Not eligible: ${reasons.join(', ')}`);

    const existing = await this.prisma.application.findUnique({
      where: { jobId_studentId: { jobId, studentId: student.id } },
    });
    if (existing) throw new BadRequestException('Already applied to this job');

    // Validate answers against the job's custom application form, if any.
    const fields = Array.isArray(job.applicationFormFields)
      ? (job.applicationFormFields as unknown as ApplicationField[])
      : [];
    const responses = this.sanitizeResponses(fields, formResponses);

    return this.prisma.application.create({
      data: {
        collegeId: student.collegeId,
        jobId,
        studentId: student.id,
        stage: 'APPLIED',
        formResponses: responses,
        stageHistory: {
          create: { fromStage: null, toStage: 'APPLIED', changedById: userId, note: 'Applied' },
        },
      },
    });
  }

  // Keep only answers for known fields; enforce required ones.
  private sanitizeResponses(
    fields: ApplicationField[],
    responses?: Record<string, string>,
  ): Prisma.InputJsonValue | undefined {
    if (fields.length === 0) return undefined;
    const out: Record<string, string> = {};
    for (const f of fields) {
      const raw = responses?.[f.id];
      const value = typeof raw === 'string' ? raw.trim() : '';
      if (!value) {
        if (f.required) throw new BadRequestException(`"${f.label}" is required`);
        continue;
      }
      out[f.id] = value;
    }
    return out;
  }

  private async studentForUser(
    userId: string,
  ): Promise<Student & { resume: { id: string } | null }> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: { resume: { select: { id: true } } },
    });
    if (!student) throw new ForbiddenException('No student profile for this account');
    return student;
  }

  private publicJob(j: {
    id: string;
    scope: string;
    title: string;
    description: string | null;
    jobType: string;
    workMode: string | null;
    location: string | null;
    experienceMin: number | null;
    experienceMax: number | null;
    ctcMin: Prisma.Decimal | null;
    ctcMax: Prisma.Decimal | null;
    eligibleSchools: string[];
    eligibleProgrammes: string[];
    minCgpa: Prisma.Decimal | null;
    minTenthPercentage: Prisma.Decimal | null;
    minTwelfthPercentage: Prisma.Decimal | null;
    minUgPercentage: Prisma.Decimal | null;
    eligibleGenders: string[];
    maxActiveBacklogs: number | null;
    maxTotalBacklogs: number | null;
    graduationYears: number[];
    applicationFormFields?: Prisma.JsonValue;
    pdfUrl?: string | null;
    pdfName?: string | null;
    status: string;
    applicationDeadline: Date | null;
    publishedAt: Date | null;
    closedAt: Date | null;
    createdAt: Date;
    collegeId: string | null;
    targetCollegeIds: string[];
    companyId: string | null;
    companyName: string | null;
    company?: { id: string; name: string; logoUrl: string | null; industry: string | null } | null;
    createdById?: string;
    createdBy?: { id: string; fullName: string } | null;
    _count?: { applications: number; rounds?: number };
  }, extra?: { selectedCount?: number; eligibleCount?: number }) {
    const isPlatform = j.scope === 'PLATFORM';
    return {
      id: j.id,
      scope: j.scope,
      isPlatform,
      title: j.title,
      description: j.description,
      jobType: j.jobType,
      workMode: j.workMode,
      location: j.location,
      experienceMin: j.experienceMin,
      experienceMax: j.experienceMax,
      ctcMin: j.ctcMin != null ? Number(j.ctcMin) : null,
      ctcMax: j.ctcMax != null ? Number(j.ctcMax) : null,
      eligibleSchools: j.eligibleSchools,
      eligibleProgrammes: j.eligibleProgrammes,
      minCgpa: j.minCgpa != null ? Number(j.minCgpa) : null,
      minTenthPercentage: j.minTenthPercentage != null ? Number(j.minTenthPercentage) : null,
      minTwelfthPercentage: j.minTwelfthPercentage != null ? Number(j.minTwelfthPercentage) : null,
      minUgPercentage: j.minUgPercentage != null ? Number(j.minUgPercentage) : null,
      eligibleGenders: j.eligibleGenders,
      maxActiveBacklogs: j.maxActiveBacklogs,
      maxTotalBacklogs: j.maxTotalBacklogs,
      graduationYears: j.graduationYears,
      applicationFormFields: Array.isArray(j.applicationFormFields)
        ? (j.applicationFormFields as unknown as ApplicationField[])
        : [],
      pdfUrl: j.pdfUrl ?? null,
      pdfName: j.pdfName ?? null,
      status: j.status,
      applicationDeadline: j.applicationDeadline,
      publishedAt: j.publishedAt,
      closedAt: j.closedAt,
      createdAt: j.createdAt,
      collegeId: j.collegeId,
      targetCollegeIds: j.targetCollegeIds,
      companyId: j.companyId,
      // Platform jobs carry a free-text company name; college jobs a Company row.
      companyName: j.company?.name ?? j.companyName ?? null,
      company: j.company
        ? {
            id: j.company.id,
            name: j.company.name,
            logoUrl: j.company.logoUrl,
            industry: j.company.industry,
          }
        : undefined,
      createdById: j.createdById,
      createdBy: j.createdBy ?? undefined,
      applicationCount: j._count?.applications,
      selectedCount: extra?.selectedCount,
      eligibleCount: extra?.eligibleCount,
      // Rounds created for this job (this college's, for a shared platform job)
      // — drives the "In progress" lifecycle label on the officer views.
      roundCount: j._count?.rounds ?? 0,
    };
  }
}

function toEligibilityStudent(
  s: {
    verificationStatus: string;
    school: string;
    programme: string;
    graduationYear: number;
    cgpa: Prisma.Decimal | null;
    tenthPercentage: Prisma.Decimal | null;
    twelfthPercentage: Prisma.Decimal | null;
    ugPercentage: Prisma.Decimal | null;
    gender: string | null;
    activeBacklogs: number;
    totalBacklogs: number;
    resume?: { id: string } | null;
  },
  isPlaced: boolean,
): EligibilityStudent {
  return {
    verificationStatus: s.verificationStatus,
    isPlaced,
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
  };
}

// Hard filters used to decide which jobs appear in a student's feed. These are
// criteria the student cannot fix in the apply-time eligibility modal, so we hide
// non-matching jobs entirely (unless they already applied).
function matchesStudentSchoolAndYear(
  student: { school: string | null; graduationYear: number },
  job: { eligibleSchools: string[]; graduationYears: number[] },
): boolean {
  const schools = job.eligibleSchools ?? [];
  if (schools.length > 0) {
    const normalized = schools.map((c) => c.trim().toLowerCase());
    if (!normalized.includes(student.school?.trim().toLowerCase() ?? '')) return false;
  }
  const years = job.graduationYears ?? [];
  if (years.length > 0 && !years.includes(student.graduationYear)) return false;
  return true;
}

function toEligibilityJob(j: {
  eligibleSchools: string[];
  eligibleProgrammes: string[];
  graduationYears: number[];
  minCgpa: Prisma.Decimal | null;
  minTenthPercentage: Prisma.Decimal | null;
  minTwelfthPercentage: Prisma.Decimal | null;
  minUgPercentage: Prisma.Decimal | null;
  eligibleGenders: string[];
  maxActiveBacklogs: number | null;
  maxTotalBacklogs: number | null;
}): EligibilityJob {
  return {
    eligibleSchools: j.eligibleSchools ?? [],
    eligibleProgrammes: j.eligibleProgrammes ?? [],
    graduationYears: j.graduationYears ?? [],
    minCgpa: j.minCgpa != null ? Number(j.minCgpa) : null,
    minTenthPercentage: j.minTenthPercentage != null ? Number(j.minTenthPercentage) : null,
    minTwelfthPercentage: j.minTwelfthPercentage != null ? Number(j.minTwelfthPercentage) : null,
    minUgPercentage: j.minUgPercentage != null ? Number(j.minUgPercentage) : null,
    eligibleGenders: j.eligibleGenders ?? [],
    maxActiveBacklogs: j.maxActiveBacklogs,
    maxTotalBacklogs: j.maxTotalBacklogs,
  };
}
