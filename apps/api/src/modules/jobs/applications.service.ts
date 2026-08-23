import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PRISMA } from '../../common/prisma.module';
import { Prisma, ApplicationStage } from '@campusgo/database';
import type { PrismaClient } from '@campusgo/database';
import { NotificationsService } from '../notifications/notifications.service';
import { jobVisibleToCollege } from './job-scope.util';
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

interface Viewer {
  role: string;
  userId: string;
}

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

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

  // Applicant contact + resume export for an officer to share with an HR outside
  // the app. Resume link only if published (so the link actually resolves).
  async exportApplicantsDataset(collegeId: string, jobId: string): Promise<ReportDataset> {
    const [job, college] = await Promise.all([
      this.prisma.job.findFirst({
        where: { id: jobId, ...jobVisibleToCollege(collegeId) },
        include: { company: { select: { name: true } } },
      }),
      this.prisma.college.findUnique({ where: { id: collegeId }, select: { name: true } }),
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
    }));

    const companyName = job.company?.name ?? job.companyName ?? 'Company';
    const collegeName = college?.name ?? 'College';
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
        student: { select: { userId: true } },
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
    });

    return updated;
  }

  // ─────────────── Interview rounds ───────────────

  async addInterview(collegeId: string, applicationId: string, dto: CreateInterviewDto) {
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, collegeId },
      include: {
        student: { select: { userId: true } },
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
      ? ` on ${round.scheduledAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
      : '';
    await this.notifications.notify({
      userId: app.student.userId,
      collegeId,
      type: 'INTERVIEW_SCHEDULED',
      title: `Interview scheduled — ${companyName}`,
      body: `${dto.roundName} for ${app.job.title}${whenText}.`,
      link: `/me/jobs/${app.job.id}`,
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
