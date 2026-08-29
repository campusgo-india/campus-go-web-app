import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PRISMA } from '../../common/prisma.module';
import { Prisma, ApplicationOutcome, ApplicationStage } from '@campusgo/database';
import type { PrismaClient } from '@campusgo/database';
import { NotificationsService } from '../notifications/notifications.service';
import { renderFormalEmail, COLLEGE_NAME_TOKEN } from '../notifications/email-templates';
import { jobVisibleToCollege, type Viewer } from './job-scope.util';
import { ChangeStageDto, CreateInterviewDto, UpdateInterviewDto } from './application-dto';
import type { ReportDataset } from '../reports/report-serializers';

/** Strip characters that are unsafe in a downloaded filename. */
function sanitizeFilenamePart(s: string): string {
  return s.replace(/[^\w.-]+/g, '_');
}

// Allowed officer-driven stage transitions. WITHDRAWN is reachable only via the
// student withdraw endpoint, so it is not an officer target here.
const TRANSITIONS: Record<ApplicationStage, ApplicationStage[]> = {
  APPLIED: ['VERIFIED', 'REJECTED'],
  VERIFIED: ['SHORTLISTED', 'REJECTED'],
  SHORTLISTED: ['ROUND_1', 'REJECTED'],
  ROUND_1: ['ROUND_2', 'HR', 'OFFER_RELEASED', 'REJECTED'],
  ROUND_2: ['ROUND_3', 'HR', 'OFFER_RELEASED', 'REJECTED'],
  ROUND_3: ['HR', 'OFFER_RELEASED', 'REJECTED'],
  HR: ['OFFER_RELEASED', 'REJECTED'],
  OFFER_RELEASED: ['OFFER_ACCEPTED', 'REJECTED'],
  OFFER_ACCEPTED: ['JOINED'],
  JOINED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

const PLACING_STAGES: ApplicationStage[] = ['OFFER_ACCEPTED', 'JOINED'];

// The modern rounds-based Application.status (APPLIED/IN_PROGRESS/SELECTED/
// REJECTED/WITHDRAWN) that each legacy ATS stage corresponds to — kept in
// sync by changeStage() below, so a student's Placement Dashboard (which
// reads only `status`) doesn't stay stuck on "Applied" forever for an
// application progressed through the legacy stage flow instead of rounds.
const STATUS_FOR_STAGE: Record<ApplicationStage, ApplicationOutcome> = {
  APPLIED: 'APPLIED',
  VERIFIED: 'IN_PROGRESS',
  SHORTLISTED: 'IN_PROGRESS',
  ROUND_1: 'IN_PROGRESS',
  ROUND_2: 'IN_PROGRESS',
  ROUND_3: 'IN_PROGRESS',
  HR: 'IN_PROGRESS',
  OFFER_RELEASED: 'IN_PROGRESS',
  OFFER_ACCEPTED: 'SELECTED',
  JOINED: 'SELECTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
};

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  private webOrigin(): string {
    return this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
  }

  // A Placement Coordinator only ever sees their assigned programmes —
  // resolved fresh from the DB so a reassignment takes effect without
  // requiring re-login. Returns null for every other role (no restriction).
  private async programmeRestriction(viewer?: Viewer): Promise<string[] | null> {
    if (!viewer || viewer.role !== 'PLACEMENT_COORDINATOR') return null;
    const u = await this.prisma.user.findUnique({
      where: { id: viewer.userId },
      select: { assignedProgrammes: true },
    });
    return u?.assignedProgrammes ?? [];
  }

  // ─────────────── Student-facing ───────────────

  async listMine(userId: string) {
    const student = await this.studentForUser(userId);
    const apps = await this.prisma.application.findMany({
      where: { studentId: student.id },
      orderBy: { appliedAt: 'desc' },
      include: {
        job: { include: { company: true } },
        interviews: { orderBy: { scheduledAt: 'asc' } },
        stageHistory: { orderBy: { createdAt: 'asc' } },
        rounds: { include: { round: true }, orderBy: { round: { seq: 'asc' } } },
      },
    });
    return apps.map((a) => this.publicApplication(a));
  }

  // A selected student can attach their own offer letter (and the CTC on it)
  // — in most cases the student receives the offer directly from the
  // recruiter before the officer does. offerCtc is optional here since the
  // officer may have already entered it correctly.
  async setOwnOfferLetter(
    userId: string,
    applicationId: string,
    offerLetterUrl?: string,
    offerCtc?: number,
  ) {
    if (offerLetterUrl == null && offerCtc == null) {
      throw new BadRequestException('Provide an offer letter, a CTC, or both.');
    }
    const student = await this.studentForUser(userId);
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, studentId: student.id },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== 'SELECTED') {
      throw new BadRequestException('Only a selected application can have an offer letter attached.');
    }
    return this.prisma.application.update({
      where: { id: applicationId },
      data: {
        ...(offerLetterUrl != null ? { offerLetterUrl } : {}),
        ...(offerCtc != null ? { offerCtc: new Prisma.Decimal(offerCtc) } : {}),
      },
    });
  }

  async withdraw(userId: string, applicationId: string) {
    const student = await this.studentForUser(userId);
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, studentId: student.id },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (['JOINED', 'REJECTED', 'WITHDRAWN'].includes(app.stage)) {
      throw new BadRequestException(`Cannot withdraw from a ${app.stage} application`);
    }

    return this.prisma.application.update({
      where: { id: applicationId },
      data: {
        stage: 'WITHDRAWN',
        status: 'WITHDRAWN',
        stageHistory: {
          create: {
            fromStage: app.stage,
            toStage: 'WITHDRAWN',
            changedById: userId,
            note: 'Withdrawn by student',
          },
        },
      },
    });
  }

  // ─────────────── Placement Officer: pipeline + ATS ───────────────

  // View-only: any officer at the college can see any of the college's job
  // pipelines, not just the ones they posted — the actual stage/round actions
  // are gated separately (assertOwnJob on the round endpoints).
  async pipeline(collegeId: string, jobId: string) {
    // Own college job, or a platform job broadcast to this college. Either way the
    // applicant query below is scoped to collegeId, so officers only see their own.
    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        OR: [{ collegeId }, { scope: 'PLATFORM', targetCollegeIds: { has: collegeId } }],
      },
    });
    if (!job) throw new NotFoundException('Job not found');

    const apps = await this.prisma.application.findMany({
      where: { jobId, collegeId },
      orderBy: { appliedAt: 'asc' },
      include: { student: { include: { user: true } } },
    });

    return apps.map((a) => ({
      id: a.id,
      stage: a.stage,
      appliedAt: a.appliedAt,
      offerCtc: a.offerCtc != null ? Number(a.offerCtc) : null,
      student: {
        id: a.student.id,
        rollNumber: a.student.rollNumber,
        fullName: a.student.user.fullName,
        programme: a.student.programme,
        cgpa: a.student.cgpa != null ? Number(a.student.cgpa) : null,
      },
    }));
  }

  // The College Head (placement head/HOD) is who a recruiter/platform admin
  // should contact about a college's applicants — see the `isCollegeHead`
  // comment on the User model. Every college is seeded with exactly one at
  // creation time; falls back to null if that's since been left unassigned.
  private async collegeHeadContact(
    collegeId: string,
  ): Promise<{ name: string; email: string; phone: string } | null> {
    const head = await this.prisma.user.findFirst({
      where: { collegeId, isCollegeHead: true },
      select: { fullName: true, email: true, phone: true },
    });
    return head ? { name: head.fullName, email: head.email, phone: head.phone ?? '' } : null;
  }

  // Batch version for a platform-wide export spanning multiple colleges —
  // one query instead of one per college.
  private async collegeHeadContacts(
    collegeIds: string[],
  ): Promise<Map<string, { name: string; email: string; phone: string }>> {
    const heads = await this.prisma.user.findMany({
      where: { collegeId: { in: collegeIds }, isCollegeHead: true },
      select: { collegeId: true, fullName: true, email: true, phone: true },
    });
    return new Map(
      heads
        .filter((h): h is typeof h & { collegeId: string } => h.collegeId != null)
        .map((h) => [h.collegeId, { name: h.fullName, email: h.email, phone: h.phone ?? '' }]),
    );
  }

  // Applicant contact + resume export for an officer to share with an HR outside
  // the app. Resume link only if published (so the link actually resolves).
  async exportApplicantsDataset(collegeId: string, jobId: string): Promise<ReportDataset> {
    const [job, college, officer] = await Promise.all([
      this.prisma.job.findFirst({
        where: { id: jobId, ...jobVisibleToCollege(collegeId) },
        include: { company: { select: { name: true } } },
      }),
      this.prisma.college.findUnique({ where: { id: collegeId }, select: { name: true } }),
      this.collegeHeadContact(collegeId),
    ]);
    if (!job) throw new NotFoundException('Job not found');

    const apps = await this.prisma.application.findMany({
      where: { collegeId, jobId },
      include: {
        student: {
          select: {
            rollNumber: true,
            dateOfBirth: true,
            personalEmail: true,
            user: { select: { fullName: true, email: true, phone: true } },
            resume: { select: { publicSlug: true, isPublished: true } },
          },
        },
      },
      orderBy: { appliedAt: 'asc' },
    });

    const webOrigin = this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
    const collegeName = college?.name ?? 'College';
    const rows = apps.map((a) => ({
      rollNumber: a.student.rollNumber,
      fullName: a.student.user.fullName,
      // Personal email, not the institutional login — recruiters need a way
      // to reach the candidate after they graduate and lose institute access.
      email: a.student.personalEmail || a.student.user.email,
      phone: a.student.user.phone ?? '',
      dateOfBirth: a.student.dateOfBirth ? a.student.dateOfBirth.toISOString().slice(0, 10) : '',
      resumeLink: a.student.resume?.isPublished
        ? `${webOrigin}/r/${a.student.resume.publicSlug}`
        : '',
      stage: a.stage,
      appliedAt: a.appliedAt.toISOString().slice(0, 10),
      college: collegeName,
      placementOfficerName: officer?.name ?? '',
      placementOfficerEmail: officer?.email ?? '',
      placementOfficerPhone: officer?.phone ?? '',
    }));

    const companyName = job.company?.name ?? job.companyName ?? 'Company';
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `${sanitizeFilenamePart(companyName)}-${sanitizeFilenamePart(collegeName)}-applicants-${stamp}`;

    return {
      filename,
      title: `${job.title} applicants`,
      columns: [
        { key: 'rollNumber', label: 'Reg No' },
        { key: 'fullName', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Mobile' },
        { key: 'dateOfBirth', label: 'DOB' },
        { key: 'resumeLink', label: 'Resume link' },
        { key: 'stage', label: 'Stage' },
        { key: 'appliedAt', label: 'Applied on' },
        { key: 'college', label: 'College' },
        { key: 'placementOfficerName', label: 'Placement Officer' },
        { key: 'placementOfficerEmail', label: 'Officer Email' },
        { key: 'placementOfficerPhone', label: 'Officer Phone' },
      ],
      rows,
    };
  }

  // Same shape as exportApplicantsDataset, but for a PLATFORM-broadcast job:
  // applicants span every targeted college, so College + that college's own
  // Placement Officer contact vary per row (this is the whole point — whoever
  // downloads this needs to know who to call about a given applicant).
  async exportPlatformApplicantsDataset(jobId: string): Promise<ReportDataset> {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, scope: 'PLATFORM' },
      include: { company: { select: { name: true } } },
    });
    if (!job) throw new NotFoundException('Job not found');

    const [apps, colleges, officerByCollege] = await Promise.all([
      this.prisma.application.findMany({
        where: { jobId, collegeId: { in: job.targetCollegeIds } },
        include: {
          student: {
            select: {
              rollNumber: true,
              dateOfBirth: true,
              personalEmail: true,
              collegeId: true,
              user: { select: { fullName: true, email: true, phone: true } },
              resume: { select: { publicSlug: true, isPublished: true } },
            },
          },
        },
        orderBy: { appliedAt: 'asc' },
      }),
      this.prisma.college.findMany({
        where: { id: { in: job.targetCollegeIds } },
        select: { id: true, name: true },
      }),
      this.collegeHeadContacts(job.targetCollegeIds),
    ]);

    const collegeNameById = new Map(colleges.map((c) => [c.id, c.name]));
    const webOrigin = this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
    const rows = apps.map((a) => {
      const officer = officerByCollege.get(a.student.collegeId);
      return {
        rollNumber: a.student.rollNumber,
        fullName: a.student.user.fullName,
        email: a.student.personalEmail || a.student.user.email,
        phone: a.student.user.phone ?? '',
        dateOfBirth: a.student.dateOfBirth ? a.student.dateOfBirth.toISOString().slice(0, 10) : '',
        resumeLink: a.student.resume?.isPublished
          ? `${webOrigin}/r/${a.student.resume.publicSlug}`
          : '',
        stage: a.stage,
        appliedAt: a.appliedAt.toISOString().slice(0, 10),
        college: collegeNameById.get(a.student.collegeId) ?? 'College',
        placementOfficerName: officer?.name ?? '',
        placementOfficerEmail: officer?.email ?? '',
        placementOfficerPhone: officer?.phone ?? '',
      };
    });

    const companyName = job.company?.name ?? job.companyName ?? 'Company';
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `${sanitizeFilenamePart(companyName)}-platform-applicants-${stamp}`;

    return {
      filename,
      title: `${job.title} applicants`,
      columns: [
        { key: 'rollNumber', label: 'Reg No' },
        { key: 'fullName', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Mobile' },
        { key: 'dateOfBirth', label: 'DOB' },
        { key: 'resumeLink', label: 'Resume link' },
        { key: 'stage', label: 'Stage' },
        { key: 'appliedAt', label: 'Applied on' },
        { key: 'college', label: 'College' },
        { key: 'placementOfficerName', label: 'Placement Officer' },
        { key: 'placementOfficerEmail', label: 'Officer Email' },
        { key: 'placementOfficerPhone', label: 'Officer Phone' },
      ],
      rows,
    };
  }

  async findOne(collegeId: string, applicationId: string, viewer?: Viewer) {
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, collegeId },
      include: {
        job: { include: { company: true } },
        student: { include: { user: true } },
        interviews: { orderBy: { scheduledAt: 'asc' } },
        stageHistory: { orderBy: { createdAt: 'asc' } },
        rounds: { include: { round: true }, orderBy: { round: { seq: 'asc' } } },
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    const programmeRestriction = await this.programmeRestriction(viewer);
    if (programmeRestriction && !programmeRestriction.includes(app.student.programme)) {
      throw new NotFoundException('Application not found');
    }
    return this.publicApplication(app, true);
  }

  async changeStage(
    collegeId: string,
    actorId: string,
    applicationId: string,
    dto: ChangeStageDto,
  ) {
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, collegeId },
      include: {
        student: { select: { userId: true, user: { select: { fullName: true } } } },
        job: {
          select: { id: true, title: true, companyName: true, company: { select: { name: true } } },
        },
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    const companyName = app.job.company?.name ?? app.job.companyName ?? 'the company';

    const target = dto.stage as ApplicationStage;
    const allowed = TRANSITIONS[app.stage] ?? [];
    if (!allowed.includes(target)) {
      throw new BadRequestException(
        `Cannot move from ${app.stage} to ${target}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }
    if (target === 'REJECTED' && !dto.rejectionReason) {
      throw new BadRequestException('A rejection reason is required');
    }

    const isPlacing = PLACING_STAGES.includes(target);
    if (isPlacing && dto.offerCtc == null && app.offerCtc == null) {
      throw new BadRequestException('offerCtc is required when accepting/joining an offer');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.application.update({
        where: { id: applicationId },
        data: {
          stage: target,
          status: STATUS_FOR_STAGE[target],
          ...(target === 'REJECTED'
            ? { rejectedAt: new Date(), rejectionReason: dto.rejectionReason }
            : {}),
          ...(dto.offerCtc != null ? { offerCtc: new Prisma.Decimal(dto.offerCtc) } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          stageHistory: {
            create: {
              fromStage: app.stage,
              toStage: target,
              changedById: actorId,
              note: dto.note,
            },
          },
        },
      });

      return next;
    });

    // Notify the applicant of their new stage (best-effort, post-commit).
    const greeting = `Dear ${app.student.user.fullName},`;
    await this.notifications.notify({
      userId: app.student.userId,
      collegeId,
      type: target === 'OFFER_RELEASED' ? 'OFFER_RELEASED' : 'APPLICATION_STAGE_CHANGED',
      title:
        target === 'OFFER_RELEASED'
          ? `Offer released — ${companyName}`
          : `Application update — ${app.job.title}`,
      body:
        target === 'REJECTED'
          ? `Your application for ${app.job.title} at ${companyName} was not taken forward.`
          : `${app.job.title} at ${companyName} moved to ${target.replace(/_/g, ' ')}.`,
      link: `/me/jobs/${app.job.id}`,
      email:
        target === 'OFFER_RELEASED'
          ? {
              subject: `Offer Released – ${companyName} | ${app.job.title}`,
              html: renderFormalEmail({
                collegeName: COLLEGE_NAME_TOKEN,
                greeting,
                intro: `Congratulations! Your offer for the position of ${app.job.title} at ${companyName} has been released.`,
                fields: [
                  { label: 'Company', value: companyName },
                  { label: 'Position', value: app.job.title },
                  ...(updated.offerCtc != null ? [{ label: 'CTC', value: `₹${Number(updated.offerCtc).toLocaleString('en-IN')}` }] : []),
                ],
                ctaLabel: 'View offer details',
                ctaUrl: `${this.webOrigin()}/me/jobs/${app.job.id}`,
              }),
            }
          : target === 'REJECTED'
            ? {
                subject: `Application Update – ${companyName} | ${app.job.title}`,
                html: renderFormalEmail({
                  collegeName: COLLEGE_NAME_TOKEN,
                  greeting,
                  intro: `We regret to inform you that your application for ${app.job.title} at ${companyName} was not taken forward.`,
                  ctaLabel: 'View application',
                  ctaUrl: `${this.webOrigin()}/me/jobs/${app.job.id}`,
                }),
              }
            : {
                subject: `Application Update – ${companyName} | ${app.job.title}`,
                html: renderFormalEmail({
                  collegeName: COLLEGE_NAME_TOKEN,
                  greeting,
                  intro: `Your application for ${app.job.title} at ${companyName} has moved to the ${target.replace(/_/g, ' ')} stage.`,
                  ctaLabel: 'View application',
                  ctaUrl: `${this.webOrigin()}/me/jobs/${app.job.id}`,
                }),
              },
    });

    return updated;
  }

  // ─────────────── Interview rounds ───────────────

  async addInterview(collegeId: string, applicationId: string, dto: CreateInterviewDto) {
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, collegeId },
      include: {
        student: { select: { userId: true, user: { select: { fullName: true } } } },
        job: {
          select: { id: true, title: true, companyName: true, company: { select: { name: true } } },
        },
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    const companyName = app.job.company?.name ?? app.job.companyName ?? 'the company';

    const round = await this.prisma.interviewRound.create({
      data: {
        applicationId,
        collegeId,
        roundName: dto.roundName,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        mode: dto.mode,
        location: dto.location,
        ...(dto.result ? { result: dto.result } : {}),
        feedback: dto.feedback,
      },
    });

    const whenText = round.scheduledAt
      ? round.scheduledAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
      : 'To be confirmed';
    await this.notifications.notify({
      userId: app.student.userId,
      collegeId,
      type: 'INTERVIEW_SCHEDULED',
      title: `Interview scheduled — ${companyName}`,
      body: `${dto.roundName} for ${app.job.title}${round.scheduledAt ? ` on ${whenText}` : ''}.`,
      link: `/me/jobs/${app.job.id}`,
      email: {
        subject: `Interview Scheduled – ${companyName} | ${app.job.title} | ${dto.roundName}`,
        html: renderFormalEmail({
          collegeName: COLLEGE_NAME_TOKEN,
          greeting: `Dear ${app.student.user.fullName},`,
          intro: `Your interview for the position of ${app.job.title} at ${companyName} has been scheduled.`,
          fields: [
            { label: 'Company', value: companyName },
            { label: 'Position', value: app.job.title },
            { label: 'Round', value: dto.roundName },
            { label: 'Date & Time', value: whenText },
            ...(dto.mode ? [{ label: 'Mode', value: dto.mode }] : []),
            ...(dto.location ? [{ label: 'Location', value: dto.location }] : []),
          ],
          ctaLabel: 'View details',
          ctaUrl: `${this.webOrigin()}/me/jobs/${app.job.id}`,
        }),
      },
    });

    return round;
  }

  async updateInterview(
    collegeId: string,
    applicationId: string,
    roundId: string,
    dto: UpdateInterviewDto,
  ) {
    const round = await this.prisma.interviewRound.findFirst({
      where: { id: roundId, applicationId, collegeId },
    });
    if (!round) throw new NotFoundException('Interview round not found');

    return this.prisma.interviewRound.update({
      where: { id: roundId },
      data: {
        ...(dto.roundName !== undefined ? { roundName: dto.roundName } : {}),
        ...(dto.scheduledAt !== undefined
          ? { scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null }
          : {}),
        ...(dto.mode !== undefined ? { mode: dto.mode } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.result !== undefined ? { result: dto.result } : {}),
        ...(dto.feedback !== undefined ? { feedback: dto.feedback } : {}),
      },
    });
  }

  private async studentForUser(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new ForbiddenException('No student profile for this account');
    return student;
  }

  private publicApplication(
    a: {
      id: string;
      stage: string;
      status: string;
      appliedAt: Date;
      rejectionReason: string | null;
      offerCtc: Prisma.Decimal | null;
      offerLetterUrl?: string | null;
      notes: string | null;
      formResponses?: Prisma.JsonValue;
      rounds?: Array<{
        outcome: string;
        round: {
          seq: number;
          title: string;
          roundType: string | null;
          description: string | null;
          scheduledAt: Date | null;
          status: string;
        };
      }>;
      job: {
        id: string;
        title: string;
        jobType: string;
        location: string | null;
        companyName: string | null;
        company: { id: string; name: string; logoUrl: string | null } | null;
        applicationFormFields?: Prisma.JsonValue;
      };
      interviews: Array<{
        id: string;
        roundName: string;
        scheduledAt: Date | null;
        mode: string | null;
        location: string | null;
        result: string;
        feedback: string | null;
      }>;
      stageHistory: Array<{
        id: string;
        fromStage: string | null;
        toStage: string;
        note: string | null;
        createdAt: Date;
      }>;
      student?: { id: string; rollNumber: string; user: { fullName: string }; programme: string };
    },
    withStudent = false,
  ) {
    return {
      id: a.id,
      stage: a.stage,
      status: a.status,
      appliedAt: a.appliedAt,
      rejectionReason: a.rejectionReason,
      offerCtc: a.offerCtc != null ? Number(a.offerCtc) : null,
      offerLetterUrl: a.offerLetterUrl ?? null,
      notes: a.notes,
      // Round-by-round progress for the student's tracking timeline.
      rounds: (a.rounds ?? []).map((r) => ({
        seq: r.round.seq,
        title: r.round.title,
        roundType: r.round.roundType,
        description: r.round.description,
        scheduledAt: r.round.scheduledAt,
        roundStatus: r.round.status,
        outcome: r.outcome,
      })),
      job: {
        id: a.job.id,
        title: a.job.title,
        jobType: a.job.jobType,
        location: a.job.location,
        // Platform jobs have no Company row — synthesize a display shape from companyName.
        company: a.job.company ?? {
          id: null,
          name: a.job.companyName ?? 'Company',
          logoUrl: null,
        },
      },
      interviews: a.interviews,
      stageHistory: a.stageHistory,
      formAnswers: this.formAnswers(a.job.applicationFormFields, a.formResponses),
      ...(withStudent && a.student
        ? {
            student: {
              id: a.student.id,
              rollNumber: a.student.rollNumber,
              fullName: a.student.user.fullName,
              programme: a.student.programme,
            },
          }
        : {}),
    };
  }

  // Pair the job's custom questions with this application's stored answers.
  private formAnswers(
    fields: Prisma.JsonValue | undefined,
    responses: Prisma.JsonValue | undefined,
  ): Array<{ label: string; value: string }> {
    const list = Array.isArray(fields) ? (fields as Array<{ id: string; label: string }>) : [];
    const answers = (responses ?? {}) as Record<string, string>;
    return list
      .map((f) => ({ label: f.label, value: answers[f.id] ?? '' }))
      .filter((a) => a.value !== '');
  }
}
