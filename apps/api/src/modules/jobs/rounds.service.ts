import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PRISMA } from '../../common/prisma.module';
import { Prisma } from '@campusgo/database';
import type { PrismaClient } from '@campusgo/database';
import { NotificationsService, type NotifyParams } from '../notifications/notifications.service';
import { renderFormalEmail, COLLEGE_NAME_TOKEN } from '../notifications/email-templates';
import { assertOwnJob, jobVisibleToCollege, type Viewer } from './job-scope.util';
import { CreateRoundDto, PlaceApplicantDto, UpdateRoundDto } from './rounds-dto';

// Student fields the funnel screen needs, reused across the two funnel queries.
const STUDENT_INCLUDE = {
  include: {
    user: { select: { fullName: true, email: true } },
    resume: { select: { publicSlug: true, isPublished: true } },
  },
} satisfies Prisma.StudentDefaultArgs;

// Same, plus the college name — only the platform funnel needs it (applicants
// span multiple colleges there; the single-college funnel already knows which
// college it's looking at).
const PLATFORM_STUDENT_INCLUDE = {
  include: {
    user: { select: { fullName: true, email: true } },
    resume: { select: { publicSlug: true, isPublished: true } },
    college: { select: { name: true } },
  },
} satisfies Prisma.StudentDefaultArgs;

// Shape of a student on the funnel screen. collegeName is only populated on
// the platform funnel (applicants span multiple colleges there); undefined on
// the single-college funnel where it'd be redundant.
interface FunnelStudent {
  applicationId: string;
  studentId: string;
  rollNumber: string;
  fullName: string;
  programme: string;
  email: string;
  resumeSlug: string | null;
  appliedAt: Date;
  status: string;
  offerCtc: number | null;
  offerLetterUrl: string | null;
  collegeName?: string;
}

// A Platform-Admin-run round track for a PLATFORM-scope job. `JobRound.collegeId`
// has no FK constraint at the DB level (it's a bare scalar, checked only in
// application code), so this reserved value safely marks "this round belongs to
// the platform's own track, spanning every targeted college" without a schema
// migration or a nullable column. Never a real college id (collides with
// nothing — collegeId values are always real UUIDs).
const PLATFORM_ROUND_SCOPE = 'PLATFORM';

@Injectable()
export class RoundsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  private webOrigin(): string {
    return this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
  }

  // A platform-broadcast job's affected applicants span multiple colleges —
  // group by college first (a grouped envelope is inherently college-scoped:
  // coordinators/officers differ per college) and send one batched email per
  // college instead of either one email per student or one shared email that
  // can't resolve a single "To").
  private async notifyManyAcrossColleges(
    recipients: { collegeId: string; student: { userId: string } }[],
    params: Omit<NotifyParams, 'userId' | 'collegeId'>,
  ): Promise<void> {
    const byCollege = new Map<string, string[]>();
    for (const r of recipients) {
      const list = byCollege.get(r.collegeId) ?? [];
      list.push(r.student.userId);
      byCollege.set(r.collegeId, list);
    }
    await Promise.all(
      [...byCollege.entries()].map(([collegeId, userIds]) =>
        this.notifications.notifyMany(userIds, collegeId, params),
      ),
    );
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

  // A job the officer's college can run rounds on: its own college job, OR a
  // PLATFORM-broadcast job targeted to the college. Each college keeps its own
  // round numbering (JobRound is unique per [jobId, collegeId, seq]). A
  // Placement Officer scoped to their own jobs (see assertOwnJob) is scoped
  // out of a colleague's job's rounds/attendance/decisions too — not just the
  // job record itself.
  private async resolveJobForView(collegeId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, ...jobVisibleToCollege(collegeId) },
      select: {
        id: true,
        title: true,
        companyName: true,
        applicationDeadline: true,
        status: true,
        scope: true,
        createdById: true,
        company: { select: { name: true } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  // Same lookup, but also enforces that the viewer manages this job (used by
  // every round action: create/update/delete/attendance/decide/place/reject).
  // Viewing the funnel/pipeline is open to every officer at the college —
  // see resolveJobForView — only managing it is creator-restricted.
  private async resolveJob(collegeId: string, jobId: string, viewer?: Viewer) {
    const job = await this.resolveJobForView(collegeId, jobId);
    assertOwnJob(job, viewer);
    return job;
  }

  // The Platform Admin's own round track for a broadcast job — spans every
  // targeted college's applicants (not scoped to one college). Runs alongside
  // each targeted college's own independent round track on the same job;
  // whichever side (platform or a college) acts on a given applicant last
  // wins on that applicant's Application.status (no separate reconciliation).
  private async resolvePlatformJob(jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, scope: 'PLATFORM' },
      select: {
        id: true,
        title: true,
        companyName: true,
        applicationDeadline: true,
        status: true,
        scope: true,
        targetCollegeIds: true,
        company: { select: { name: true } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  private companyName(job: { companyName: string | null; company: { name: string } | null }) {
    return job.company?.name ?? job.companyName ?? 'the company';
  }

  // A job is filled the moment one applicant is placed — everyone else still in
  // the running (APPLIED/IN_PROGRESS, including those sitting in a still-open
  // round) needs to be auto-rejected, otherwise they're left stuck forever and
  // the job never leaves "active" on the placement dashboard. Returns who was
  // rejected so the caller can notify them.
  private async autoRejectRemaining(where: Prisma.ApplicationWhereInput, reason: string) {
    const others = await this.prisma.application.findMany({
      where,
      select: { id: true, collegeId: true, student: { select: { userId: true } } },
    });
    if (others.length === 0) return others;
    const now = new Date();
    const otherIds = others.map((o) => o.id);
    await this.prisma.$transaction([
      this.prisma.application.updateMany({
        where: { id: { in: otherIds } },
        data: { status: 'REJECTED', stage: 'REJECTED', rejectedAt: now, rejectionReason: reason },
      }),
      this.prisma.applicationRound.updateMany({
        where: { applicationId: { in: otherIds }, outcome: 'PENDING' },
        data: { outcome: 'REJECTED', decidedAt: now },
      }),
    ]);
    return others;
  }

  // ─────────────── The whole funnel for the officer screen ───────────────
  // A Placement Coordinator sees the same funnel shape but only their own
  // programmes' applicants — everyone else outside their remit is filtered
  // out of every bucket (pool, rounds, finalists, placed).
  async funnel(collegeId: string, jobId: string, viewer?: Viewer) {
    await this.resolveJobForView(collegeId, jobId);
    const programmeRestriction = await this.programmeRestriction(viewer);
    const inScope = (programme: string) =>
      !programmeRestriction || programmeRestriction.includes(programme);

    const [roundsRaw, appsRaw] = await Promise.all([
      this.prisma.jobRound.findMany({
        where: { jobId, collegeId },
        orderBy: { seq: 'asc' },
        include: {
          participants: {
            include: { application: { include: { student: STUDENT_INCLUDE } } },
          },
        },
      }),
      this.prisma.application.findMany({
        where: { jobId, collegeId },
        orderBy: { appliedAt: 'asc' },
        include: { student: STUDENT_INCLUDE },
      }),
    ]);

    const apps = appsRaw.filter((a) => inScope(a.student.programme));
    const rounds = roundsRaw.map((r) => ({
      ...r,
      participants: r.participants.filter((p) => inScope(p.application.student.programme)),
    }));

    const openRoundIds = new Set(rounds.filter((r) => r.status === 'OPEN').map((r) => r.id));
    // Applications currently waiting in an open round can't be "finalists".
    const pendingInOpen = new Set(
      rounds
        .flatMap((r) => r.participants)
        .filter((p) => openRoundIds.has(p.roundId) && p.outcome === 'PENDING')
        .map((p) => p.applicationId),
    );

    const pub = (a: (typeof apps)[number]) => this.toStudent(a);

    return {
      applicantsTotal: apps.length,
      inProgress: apps.filter((a) => a.status === 'IN_PROGRESS').length,
      selectedCount: apps.filter((a) => a.status === 'SELECTED').length,
      rejectedCount: apps.filter((a) => a.status === 'REJECTED').length,
      rounds: rounds.map((r) => ({
        id: r.id,
        seq: r.seq,
        title: r.title,
        roundType: r.roundType,
        description: r.description,
        scheduledAt: r.scheduledAt,
        status: r.status,
        overdue: !!r.scheduledAt && r.status === 'OPEN' && r.scheduledAt.getTime() < Date.now(),
        participants: r.participants.map((p) => ({
          ...this.toStudent(p.application),
          outcome: p.outcome,
          attended: p.attended,
        })),
      })),
      // Applied but not yet placed into any round (before Round 1, or late applicants).
      pool: apps.filter((a) => a.status === 'APPLIED').map(pub),
      // Cleared every existing round, not waiting in an open one → ready to place or advance.
      finalists: apps
        .filter((a) => a.status === 'IN_PROGRESS' && !pendingInOpen.has(a.id))
        .map(pub),
      placed: apps.filter((a) => a.status === 'SELECTED').map(pub),
    };
  }

  // The Platform Admin's own funnel for a broadcast job — same shape as
  // funnel() above, but applicants span every targeted college (no single
  // collegeId to scope by) and each row carries which college it's from.
  async platformFunnel(jobId: string) {
    const job = await this.resolvePlatformJob(jobId);
    const collegeScope = { collegeId: { in: job.targetCollegeIds } };

    const [roundsRaw, appsRaw] = await Promise.all([
      this.prisma.jobRound.findMany({
        where: { jobId, collegeId: PLATFORM_ROUND_SCOPE },
        orderBy: { seq: 'asc' },
        include: {
          participants: {
            include: { application: { include: { student: PLATFORM_STUDENT_INCLUDE } } },
          },
        },
      }),
      this.prisma.application.findMany({
        where: { jobId, ...collegeScope },
        orderBy: { appliedAt: 'asc' },
        include: { student: PLATFORM_STUDENT_INCLUDE },
      }),
    ]);

    const openRoundIds = new Set(roundsRaw.filter((r) => r.status === 'OPEN').map((r) => r.id));
    const pendingInOpen = new Set(
      roundsRaw
        .flatMap((r) => r.participants)
        .filter((p) => openRoundIds.has(p.roundId) && p.outcome === 'PENDING')
        .map((p) => p.applicationId),
    );

    const pub = (a: (typeof appsRaw)[number]) => this.toStudent(a);

    return {
      applicantsTotal: appsRaw.length,
      inProgress: appsRaw.filter((a) => a.status === 'IN_PROGRESS').length,
      selectedCount: appsRaw.filter((a) => a.status === 'SELECTED').length,
      rejectedCount: appsRaw.filter((a) => a.status === 'REJECTED').length,
      rounds: roundsRaw.map((r) => ({
        id: r.id,
        seq: r.seq,
        title: r.title,
        roundType: r.roundType,
        description: r.description,
        scheduledAt: r.scheduledAt,
        status: r.status,
        overdue: !!r.scheduledAt && r.status === 'OPEN' && r.scheduledAt.getTime() < Date.now(),
        participants: r.participants.map((p) => ({
          ...this.toStudent(p.application),
          outcome: p.outcome,
          attended: p.attended,
        })),
      })),
      pool: appsRaw.filter((a) => a.status === 'APPLIED').map(pub),
      finalists: appsRaw
        .filter((a) => a.status === 'IN_PROGRESS' && !pendingInOpen.has(a.id))
        .map(pub),
      placed: appsRaw.filter((a) => a.status === 'SELECTED').map(pub),
    };
  }

  // ─────────────── Round lifecycle ───────────────
  async createRound(
    collegeId: string,
    jobId: string,
    createdById: string,
    dto: CreateRoundDto,
    viewer?: Viewer,
  ) {
    const job = await this.resolveJob(collegeId, jobId, viewer);

    // Once any applicant has been selected, the funnel is done — a new round
    // would let a decided candidate get pulled back into evaluation.
    const alreadySelected = await this.prisma.application.count({
      where: { collegeId, jobId, status: 'SELECTED' },
    });
    if (alreadySelected > 0) {
      throw new BadRequestException(
        'Candidates have already been selected for this job — no further rounds can be added.',
      );
    }

    const last = await this.prisma.jobRound.findFirst({
      where: { jobId, collegeId },
      orderBy: { seq: 'desc' },
    });
    const seq = (last?.seq ?? 0) + 1;
    if (last && last.status === 'OPEN') {
      throw new BadRequestException(
        `Close "${last.title}" by selecting who advances before adding another round.`,
      );
    }
    // Round 1's date feeds the Placement Dashboard's Active Drives "nearest
    // interview" column — without it that column silently reads "—" even
    // though interviewing has genuinely started.
    if (seq === 1 && !dto.scheduledAt) {
      throw new BadRequestException('A date is required for Round 1.');
    }
    const title = dto.title?.trim() || `Round ${seq}`;

    const round = await this.prisma.jobRound.create({
      data: {
        jobId,
        collegeId,
        seq,
        title,
        roundType: dto.roundType ?? null,
        description: dto.description ?? null,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        createdById,
      },
    });

    // Starting a round means the job has moved past accepting new applications.
    // Platform-broadcast jobs are excluded: each college runs its own round
    // numbering on a shared job (see resolveJob above), so Job.status is a single
    // global column that must not be flipped by one college's pipeline progress.
    if (job.status === 'PUBLISHED' && job.scope !== 'PLATFORM') {
      await this.prisma.job.update({
        where: { id: jobId },
        data: { status: 'CLOSED', closedAt: new Date() },
      });

      const nonApplicants = await this.prisma.student.findMany({
        where: { collegeId, isActive: true, applications: { none: { jobId } } },
        select: { userId: true },
      });
      if (nonApplicants.length > 0) {
        await this.notifications.notifyMany(
          nonApplicants.map((s) => s.userId),
          collegeId,
          {
            type: 'GENERAL',
            title: `Applications closed — ${job.title}`,
            body: `${job.title} at ${this.companyName(job)} has moved to interviews; applications are now closed.`,
            link: `/me/jobs/${jobId}`,
            email: {
              subject: `Applications Closed – ${this.companyName(job)} | ${job.title}`,
              html: renderFormalEmail({
                collegeName: COLLEGE_NAME_TOKEN,
                intro: `Applications for ${job.title} at ${this.companyName(job)} are now closed, as the interview process has begun.`,
              }),
            },
          },
        );
      }
    }

    // Enrol the cohort: Round 1 = everyone still active; later rounds = those who
    // advanced from the previous round.
    let cohort: string[];
    if (seq === 1) {
      const rows = await this.prisma.application.findMany({
        where: { jobId, collegeId, status: { in: ['APPLIED', 'IN_PROGRESS'] } },
        select: { id: true },
      });
      cohort = rows.map((r) => r.id);
    } else {
      const rows = await this.prisma.applicationRound.findMany({
        where: {
          round: { jobId, collegeId, seq: seq - 1 },
          outcome: 'ADVANCED',
          application: { status: 'IN_PROGRESS' },
        },
        select: { applicationId: true },
      });
      cohort = rows.map((r) => r.applicationId);
    }

    if (cohort.length > 0) {
      await this.prisma.$transaction([
        this.prisma.applicationRound.createMany({
          data: cohort.map((applicationId) => ({ applicationId, roundId: round.id })),
          skipDuplicates: true,
        }),
        this.prisma.application.updateMany({
          where: { id: { in: cohort } },
          data: { status: 'IN_PROGRESS' },
        }),
      ]);
    }

    // Notify every enrolled applicant that a new round has been created — one
    // batched email (Bcc'd) rather than one per applicant.
    const company = this.companyName(job);
    const enrolledApps = await this.prisma.application.findMany({
      where: { id: { in: cohort } },
      include: { student: { select: { userId: true } } },
    });
    const whenText = round.scheduledAt
      ? round.scheduledAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;
    await this.notifications.notifyMany(
      enrolledApps.map((a) => a.student.userId),
      collegeId,
      {
        type: 'APPLICATION_STAGE_CHANGED',
        title: `New round — ${job.title}`,
        body: `${title} has been scheduled${whenText ? ` on ${whenText}` : ''} for ${job.title} at ${company}.`,
        link: `/me/jobs/${jobId}`,
        email: {
          subject: `Interview Update – ${company} | ${job.title} | ${title}`,
          html: renderFormalEmail({
            collegeName: COLLEGE_NAME_TOKEN,
            intro: `${title} has been scheduled for ${job.title} at ${company}.`,
            fields: [
              { label: 'Company', value: company },
              { label: 'Position', value: job.title },
              { label: 'Round', value: title },
              ...(whenText ? [{ label: 'Date', value: whenText }] : []),
            ],
            ctaLabel: 'View details',
            ctaUrl: `${this.webOrigin()}/me/jobs/${jobId}`,
          }),
        },
      },
    );

    return { ...round, enrolled: cohort.length };
  }

  async updateRound(
    collegeId: string,
    jobId: string,
    roundId: string,
    dto: UpdateRoundDto,
    viewer?: Viewer,
  ) {
    await this.resolveJob(collegeId, jobId, viewer);
    const round = await this.prisma.jobRound.findFirst({
      where: { id: roundId, jobId, collegeId },
    });
    if (!round) throw new NotFoundException('Round not found');
    return this.prisma.jobRound.update({
      where: { id: roundId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() || round.title } : {}),
        ...(dto.roundType !== undefined ? { roundType: dto.roundType ?? null } : {}),
        ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
        ...(dto.scheduledAt !== undefined
          ? { scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null }
          : {}),
      },
    });
  }

  // Only the latest round can be removed (and only while OPEN) — an undo for a
  // round added by mistake. Participation rows cascade.
  async deleteRound(collegeId: string, jobId: string, roundId: string, viewer?: Viewer) {
    await this.resolveJob(collegeId, jobId, viewer);
    const round = await this.prisma.jobRound.findFirst({
      where: { id: roundId, jobId, collegeId },
    });
    if (!round) throw new NotFoundException('Round not found');
    if (round.status === 'DECIDED') {
      throw new BadRequestException('A decided round cannot be deleted.');
    }
    const latest = await this.prisma.jobRound.findFirst({
      where: { jobId, collegeId },
      orderBy: { seq: 'desc' },
      select: { id: true },
    });
    if (latest?.id !== roundId) {
      throw new BadRequestException('Only the most recent round can be removed.');
    }
    await this.prisma.jobRound.delete({ where: { id: roundId } });
    return { success: true };
  }

  // ─────────────── Mark who showed up (before deciding the round) ───────────────
  async markAttendance(
    collegeId: string,
    jobId: string,
    roundId: string,
    records: { applicationId: string; attended: boolean }[],
    viewer?: Viewer,
  ) {
    await this.resolveJob(collegeId, jobId, viewer);
    const round = await this.prisma.jobRound.findFirst({ where: { id: roundId, jobId, collegeId } });
    if (!round) throw new NotFoundException('Round not found');

    const participants = await this.prisma.applicationRound.findMany({
      where: { roundId, applicationId: { in: records.map((r) => r.applicationId) } },
      select: { id: true, applicationId: true },
    });
    const byAppId = new Map(participants.map((p) => [p.applicationId, p.id]));

    await this.prisma.$transaction(
      records
        .filter((r) => byAppId.has(r.applicationId))
        .map((r) =>
          this.prisma.applicationRound.update({
            where: { id: byAppId.get(r.applicationId)! },
            data: { attended: r.attended },
          }),
        ),
    );
    return { success: true, marked: records.filter((r) => byAppId.has(r.applicationId)).length };
  }

  // ─────────────── Decide a round (advance some, auto-reject the rest) ───────────────
  async decideRound(
    collegeId: string,
    jobId: string,
    roundId: string,
    advanceIds: string[],
    viewer?: Viewer,
  ) {
    const job = await this.resolveJob(collegeId, jobId, viewer);
    const round = await this.prisma.jobRound.findFirst({
      where: { id: roundId, jobId, collegeId },
    });
    if (!round) throw new NotFoundException('Round not found');
    if (round.status === 'DECIDED') throw new BadRequestException('This round is already decided.');

    const parts = await this.prisma.applicationRound.findMany({
      where: { roundId, outcome: 'PENDING' },
      include: {
        application: {
          select: { id: true, studentId: true, student: { select: { userId: true } } },
        },
      },
    });
    const advance = new Set(advanceIds);
    const advanced = parts.filter((p) => advance.has(p.applicationId));
    const rejected = parts.filter((p) => !advance.has(p.applicationId));

    const now = new Date();
    await this.prisma.$transaction([
      ...advanced.map((p) =>
        this.prisma.applicationRound.update({
          where: { id: p.id },
          data: { outcome: 'ADVANCED', decidedAt: now },
        }),
      ),
      ...rejected.map((p) =>
        this.prisma.applicationRound.update({
          where: { id: p.id },
          data: { outcome: 'REJECTED', decidedAt: now },
        }),
      ),
      ...rejected.map((p) =>
        this.prisma.application.update({
          where: { id: p.applicationId },
          data: {
            status: 'REJECTED',
            stage: 'REJECTED',
            rejectedAt: now,
            rejectionReason: `Not selected in ${round.title}`,
          },
        }),
      ),
      this.prisma.jobRound.update({ where: { id: roundId }, data: { status: 'DECIDED' } }),
    ]);

    // Best-effort notifications — one batched email per outcome group, not
    // one per student.
    const company = this.companyName(job);
    await Promise.all([
      advanced.length === 0
        ? Promise.resolve()
        : this.notifications.notifyMany(
            advanced.map((p) => p.application.student.userId),
            collegeId,
            {
              type: 'APPLICATION_STAGE_CHANGED',
              title: `Cleared ${round.title} — ${company}`,
              body: `You've advanced past ${round.title} for ${job.title}.`,
              link: `/me/jobs/${job.id}`,
              email: {
                subject: `Interview Result – ${company} | ${job.title} | Advanced`,
                html: renderFormalEmail({
                  collegeName: COLLEGE_NAME_TOKEN,
                  intro: `Congratulations! You have advanced past ${round.title} for ${job.title} at ${company}.`,
                  ctaLabel: 'View details',
                  ctaUrl: `${this.webOrigin()}/me/jobs/${job.id}`,
                }),
              },
            },
          ),
      rejected.length === 0
        ? Promise.resolve()
        : this.notifications.notifyMany(
            rejected.map((p) => p.application.student.userId),
            collegeId,
            {
              type: 'APPLICATION_STAGE_CHANGED',
              title: `Update — ${job.title}`,
              body: `You were not selected in ${round.title} for ${job.title} at ${company}.`,
              link: `/me/jobs/${job.id}`,
              email: {
                subject: `Interview Result – ${company} | ${job.title} | Update`,
                html: renderFormalEmail({
                  collegeName: COLLEGE_NAME_TOKEN,
                  intro: `We regret to inform you that you were not selected in ${round.title} for ${job.title} at ${company}.`,
                  note: 'We wish you the very best for your future placement drives.',
                  ctaLabel: 'View details',
                  ctaUrl: `${this.webOrigin()}/me/jobs/${job.id}`,
                }),
              },
            },
          ),
    ]);

    return { advanced: advanced.length, rejected: rejected.length };
  }

  // ─────────────── Select / place a finalist ───────────────
  async place(
    collegeId: string,
    jobId: string,
    applicationId: string,
    dto: PlaceApplicantDto,
    viewer?: Viewer,
  ) {
    const job = await this.resolveJob(collegeId, jobId, viewer);
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, jobId, collegeId },
      include: { student: { select: { userId: true } } },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status === 'REJECTED' || app.status === 'WITHDRAWN') {
      throw new BadRequestException('This applicant is no longer in the running.');
    }

    await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: 'SELECTED',
        // Legacy bridge so analytics/reports keep counting placements.
        stage: 'OFFER_ACCEPTED',
        ...(dto.offerCtc != null ? { offerCtc: new Prisma.Decimal(dto.offerCtc) } : {}),
        ...(dto.offerLetterUrl !== undefined ? { offerLetterUrl: dto.offerLetterUrl || null } : {}),
      },
    });

    await this.notifications.notify({
      userId: app.student.userId,
      collegeId,
      type: 'OFFER_RELEASED',
      title: `Selected — ${this.companyName(job)} 🎉`,
      body: `Congratulations! You've been selected for ${job.title}.`,
      link: `/me/jobs/${job.id}`,
      email: {
        subject: `Congratulations – Selected | ${this.companyName(job)} | ${job.title}`,
        html: renderFormalEmail({
          collegeName: COLLEGE_NAME_TOKEN,
          intro: `Congratulations! You have been selected for the position of ${job.title} at ${this.companyName(job)}.`,
          fields: [
            { label: 'Company', value: this.companyName(job) },
            { label: 'Position', value: job.title },
            ...(dto.offerCtc != null ? [{ label: 'CTC', value: `₹${dto.offerCtc.toLocaleString('en-IN')}` }] : []),
          ],
          ctaLabel: 'View offer',
          ctaUrl: `${this.webOrigin()}/me/jobs/${job.id}`,
        }),
      },
    });

    // The job is filled — everyone else still in the running is auto-rejected
    // so they don't get left stuck and the job stops showing as "active".
    // One batched email (Bcc'd) rather than one per applicant.
    const others = await this.autoRejectRemaining(
      { jobId, collegeId, status: { in: ['APPLIED', 'IN_PROGRESS'] }, id: { not: applicationId } },
      `Position filled at ${this.companyName(job)}`,
    );
    if (others.length > 0) {
      await this.notifications.notifyMany(
        others.map((o) => o.student.userId),
        collegeId,
        {
          type: 'APPLICATION_STAGE_CHANGED',
          title: `Update — ${job.title}`,
          body: `Your application for ${job.title} at ${this.companyName(job)} was not taken forward — the position has been filled.`,
          link: `/me/jobs/${job.id}`,
          email: {
            subject: `Placement Update – ${this.companyName(job)} | ${job.title}`,
            html: renderFormalEmail({
              collegeName: COLLEGE_NAME_TOKEN,
              intro: `We regret to inform you that the position of ${job.title} at ${this.companyName(job)} has been filled. Thank you for your participation in this drive.`,
              note: 'We wish you the very best for your future placement drives.',
            }),
          },
        },
      );
    }

    return { success: true };
  }

  // Manual reject (outside a round decision).
  async reject(
    collegeId: string,
    jobId: string,
    applicationId: string,
    reason?: string,
    viewer?: Viewer,
  ) {
    const job = await this.resolveJob(collegeId, jobId, viewer);
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, jobId, collegeId },
      include: { student: { select: { userId: true } } },
    });
    if (!app) throw new NotFoundException('Application not found');

    await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: 'REJECTED',
        stage: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason ?? 'Not shortlisted',
      },
    });
    await this.notifications.notify({
      userId: app.student.userId,
      collegeId,
      type: 'APPLICATION_STAGE_CHANGED',
      title: `Update — ${job.title}`,
      body: `Your application for ${job.title} at ${this.companyName(job)} was not taken forward.`,
      link: `/me/jobs/${job.id}`,
      email: {
        subject: `Application Update – ${this.companyName(job)} | ${job.title}`,
        html: renderFormalEmail({
          collegeName: COLLEGE_NAME_TOKEN,
          intro: `We regret to inform you that your application for ${job.title} at ${this.companyName(job)} was not taken forward.`,
          ...(reason ? { fields: [{ label: 'Note', value: reason }] } : {}),
        }),
      },
    });
    return { success: true };
  }

  // ─────────────── Platform Admin: their own round track ───────────────
  // Mirrors the college-scoped lifecycle above exactly, except the cohort is
  // pulled from every targeted college (collegeId IN targetCollegeIds) and the
  // round rows live under the PLATFORM_ROUND_SCOPE sentinel. Each notification
  // uses the affected application's own collegeId (not a single shared one —
  // applicants span multiple colleges here), so email branding stays correct
  // per recipient.
  async createPlatformRound(jobId: string, createdById: string, dto: CreateRoundDto) {
    const job = await this.resolvePlatformJob(jobId);
    const collegeScope = { collegeId: { in: job.targetCollegeIds } };

    const alreadySelected = await this.prisma.application.count({
      where: { jobId, ...collegeScope, status: 'SELECTED' },
    });
    if (alreadySelected > 0) {
      throw new BadRequestException(
        'Candidates have already been selected for this job — no further rounds can be added.',
      );
    }

    const last = await this.prisma.jobRound.findFirst({
      where: { jobId, collegeId: PLATFORM_ROUND_SCOPE },
      orderBy: { seq: 'desc' },
    });
    const seq = (last?.seq ?? 0) + 1;
    if (last && last.status === 'OPEN') {
      throw new BadRequestException(
        `Close "${last.title}" by selecting who advances before adding another round.`,
      );
    }
    // Round 1's date feeds the Placement Dashboard's Active Drives "nearest
    // interview" column — without it that column silently reads "—" even
    // though interviewing has genuinely started.
    if (seq === 1 && !dto.scheduledAt) {
      throw new BadRequestException('A date is required for Round 1.');
    }
    const title = dto.title?.trim() || `Round ${seq}`;

    const round = await this.prisma.jobRound.create({
      data: {
        jobId,
        collegeId: PLATFORM_ROUND_SCOPE,
        seq,
        title,
        roundType: dto.roundType ?? null,
        description: dto.description ?? null,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        createdById,
      },
    });

    // Unlike a college's own job, starting a round here must NOT flip the
    // shared Job.status to CLOSED — the same reason a single college starting
    // its own round on a broadcast job is excluded from that flip (see
    // createRound above): this job is still open to other targeted colleges'
    // students who may not have applied yet, and the platform's own track
    // starting doesn't mean every college is done collecting applications.
    // The only way to actually close a PLATFORM job is the explicit Close
    // action on the platform jobs list.

    let cohort: string[];
    if (seq === 1) {
      const rows = await this.prisma.application.findMany({
        where: { jobId, ...collegeScope, status: { in: ['APPLIED', 'IN_PROGRESS'] } },
        select: { id: true },
      });
      cohort = rows.map((r) => r.id);
    } else {
      const rows = await this.prisma.applicationRound.findMany({
        where: {
          round: { jobId, collegeId: PLATFORM_ROUND_SCOPE, seq: seq - 1 },
          outcome: 'ADVANCED',
          application: { status: 'IN_PROGRESS' },
        },
        select: { applicationId: true },
      });
      cohort = rows.map((r) => r.applicationId);
    }

    if (cohort.length > 0) {
      await this.prisma.$transaction([
        this.prisma.applicationRound.createMany({
          data: cohort.map((applicationId) => ({ applicationId, roundId: round.id })),
          skipDuplicates: true,
        }),
        this.prisma.application.updateMany({
          where: { id: { in: cohort } },
          data: { status: 'IN_PROGRESS' },
        }),
      ]);
    }

    const company = this.companyName(job);
    const enrolledApps = await this.prisma.application.findMany({
      where: { id: { in: cohort } },
      select: { collegeId: true, student: { select: { userId: true } } },
    });
    const whenText = round.scheduledAt
      ? round.scheduledAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;
    await this.notifyManyAcrossColleges(enrolledApps, {
      type: 'APPLICATION_STAGE_CHANGED',
      title: `New round — ${job.title}`,
      body: `${title} has been scheduled${whenText ? ` on ${whenText}` : ''} for ${job.title} at ${company}.`,
      link: `/me/jobs/${jobId}`,
      email: {
        subject: `Interview Update – ${company} | ${job.title} | ${title}`,
        html: renderFormalEmail({
          collegeName: COLLEGE_NAME_TOKEN,
          intro: `${title} has been scheduled for ${job.title} at ${company}.`,
          fields: [
            { label: 'Company', value: company },
            { label: 'Position', value: job.title },
            { label: 'Round', value: title },
            ...(whenText ? [{ label: 'Date', value: whenText }] : []),
          ],
          ctaLabel: 'View details',
          ctaUrl: `${this.webOrigin()}/me/jobs/${jobId}`,
        }),
      },
    });

    return { ...round, enrolled: cohort.length };
  }

  async updatePlatformRound(jobId: string, roundId: string, dto: UpdateRoundDto) {
    await this.resolvePlatformJob(jobId);
    const round = await this.prisma.jobRound.findFirst({
      where: { id: roundId, jobId, collegeId: PLATFORM_ROUND_SCOPE },
    });
    if (!round) throw new NotFoundException('Round not found');
    return this.prisma.jobRound.update({
      where: { id: roundId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() || round.title } : {}),
        ...(dto.roundType !== undefined ? { roundType: dto.roundType ?? null } : {}),
        ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
        ...(dto.scheduledAt !== undefined
          ? { scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null }
          : {}),
      },
    });
  }

  async deletePlatformRound(jobId: string, roundId: string) {
    await this.resolvePlatformJob(jobId);
    const round = await this.prisma.jobRound.findFirst({
      where: { id: roundId, jobId, collegeId: PLATFORM_ROUND_SCOPE },
    });
    if (!round) throw new NotFoundException('Round not found');
    if (round.status === 'DECIDED') {
      throw new BadRequestException('A decided round cannot be deleted.');
    }
    const latest = await this.prisma.jobRound.findFirst({
      where: { jobId, collegeId: PLATFORM_ROUND_SCOPE },
      orderBy: { seq: 'desc' },
      select: { id: true },
    });
    if (latest?.id !== roundId) {
      throw new BadRequestException('Only the most recent round can be removed.');
    }
    await this.prisma.jobRound.delete({ where: { id: roundId } });
    return { success: true };
  }

  async markPlatformRoundAttendance(
    jobId: string,
    roundId: string,
    records: { applicationId: string; attended: boolean }[],
  ) {
    await this.resolvePlatformJob(jobId);
    const round = await this.prisma.jobRound.findFirst({
      where: { id: roundId, jobId, collegeId: PLATFORM_ROUND_SCOPE },
    });
    if (!round) throw new NotFoundException('Round not found');

    const participants = await this.prisma.applicationRound.findMany({
      where: { roundId, applicationId: { in: records.map((r) => r.applicationId) } },
      select: { id: true, applicationId: true },
    });
    const byAppId = new Map(participants.map((p) => [p.applicationId, p.id]));

    await this.prisma.$transaction(
      records
        .filter((r) => byAppId.has(r.applicationId))
        .map((r) =>
          this.prisma.applicationRound.update({
            where: { id: byAppId.get(r.applicationId)! },
            data: { attended: r.attended },
          }),
        ),
    );
    return { success: true, marked: records.filter((r) => byAppId.has(r.applicationId)).length };
  }

  async decidePlatformRound(jobId: string, roundId: string, advanceIds: string[]) {
    const job = await this.resolvePlatformJob(jobId);
    const round = await this.prisma.jobRound.findFirst({
      where: { id: roundId, jobId, collegeId: PLATFORM_ROUND_SCOPE },
    });
    if (!round) throw new NotFoundException('Round not found');
    if (round.status === 'DECIDED') throw new BadRequestException('This round is already decided.');

    const parts = await this.prisma.applicationRound.findMany({
      where: { roundId, outcome: 'PENDING' },
      include: {
        application: {
          select: { id: true, studentId: true, collegeId: true, student: { select: { userId: true } } },
        },
      },
    });
    const advance = new Set(advanceIds);
    const advanced = parts.filter((p) => advance.has(p.applicationId));
    const rejected = parts.filter((p) => !advance.has(p.applicationId));

    const now = new Date();
    await this.prisma.$transaction([
      ...advanced.map((p) =>
        this.prisma.applicationRound.update({
          where: { id: p.id },
          data: { outcome: 'ADVANCED', decidedAt: now },
        }),
      ),
      ...rejected.map((p) =>
        this.prisma.applicationRound.update({
          where: { id: p.id },
          data: { outcome: 'REJECTED', decidedAt: now },
        }),
      ),
      ...rejected.map((p) =>
        this.prisma.application.update({
          where: { id: p.applicationId },
          data: {
            status: 'REJECTED',
            stage: 'REJECTED',
            rejectedAt: now,
            rejectionReason: `Not selected in ${round.title}`,
          },
        }),
      ),
      this.prisma.jobRound.update({ where: { id: roundId }, data: { status: 'DECIDED' } }),
    ]);

    const company = this.companyName(job);
    await Promise.all([
      advanced.length === 0
        ? Promise.resolve()
        : this.notifyManyAcrossColleges(
            advanced.map((p) => p.application),
            {
              type: 'APPLICATION_STAGE_CHANGED',
              title: `Cleared ${round.title} — ${company}`,
              body: `You've advanced past ${round.title} for ${job.title}.`,
              link: `/me/jobs/${job.id}`,
              email: {
                subject: `Interview Result – ${company} | ${job.title} | Advanced`,
                html: renderFormalEmail({
                  collegeName: COLLEGE_NAME_TOKEN,
                  intro: `Congratulations! You have advanced past ${round.title} for ${job.title} at ${company}.`,
                  ctaLabel: 'View details',
                  ctaUrl: `${this.webOrigin()}/me/jobs/${job.id}`,
                }),
              },
            },
          ),
      rejected.length === 0
        ? Promise.resolve()
        : this.notifyManyAcrossColleges(
            rejected.map((p) => p.application),
            {
              type: 'APPLICATION_STAGE_CHANGED',
              title: `Update — ${job.title}`,
              body: `You were not selected in ${round.title} for ${job.title} at ${company}.`,
              link: `/me/jobs/${job.id}`,
              email: {
                subject: `Interview Result – ${company} | ${job.title} | Update`,
                html: renderFormalEmail({
                  collegeName: COLLEGE_NAME_TOKEN,
                  intro: `We regret to inform you that you were not selected in ${round.title} for ${job.title} at ${company}.`,
                  note: 'We wish you the very best for your future placement drives.',
                  ctaLabel: 'View details',
                  ctaUrl: `${this.webOrigin()}/me/jobs/${job.id}`,
                }),
              },
            },
          ),
    ]);

    return { advanced: advanced.length, rejected: rejected.length };
  }

  async placePlatform(jobId: string, applicationId: string, dto: PlaceApplicantDto) {
    const job = await this.resolvePlatformJob(jobId);
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, jobId, collegeId: { in: job.targetCollegeIds } },
      include: { student: { select: { userId: true } } },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status === 'REJECTED' || app.status === 'WITHDRAWN') {
      throw new BadRequestException('This applicant is no longer in the running.');
    }

    await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: 'SELECTED',
        stage: 'OFFER_ACCEPTED',
        ...(dto.offerCtc != null ? { offerCtc: new Prisma.Decimal(dto.offerCtc) } : {}),
        ...(dto.offerLetterUrl !== undefined ? { offerLetterUrl: dto.offerLetterUrl || null } : {}),
      },
    });

    await this.notifications.notify({
      userId: app.student.userId,
      collegeId: app.collegeId,
      type: 'OFFER_RELEASED',
      title: `Selected — ${this.companyName(job)} 🎉`,
      body: `Congratulations! You've been selected for ${job.title}.`,
      link: `/me/jobs/${job.id}`,
      email: {
        subject: `Congratulations – Selected | ${this.companyName(job)} | ${job.title}`,
        html: renderFormalEmail({
          collegeName: COLLEGE_NAME_TOKEN,
          intro: `Congratulations! You have been selected for the position of ${job.title} at ${this.companyName(job)}.`,
          fields: [
            { label: 'Company', value: this.companyName(job) },
            { label: 'Position', value: job.title },
            ...(dto.offerCtc != null ? [{ label: 'CTC', value: `₹${dto.offerCtc.toLocaleString('en-IN')}` }] : []),
          ],
          ctaLabel: 'View offer',
          ctaUrl: `${this.webOrigin()}/me/jobs/${job.id}`,
        }),
      },
    });

    // The job is filled — everyone else still in the running (across every
    // targeted college) is auto-rejected so they don't get left stuck. One
    // batched email per affected college rather than one per applicant.
    const others = await this.autoRejectRemaining(
      {
        jobId,
        collegeId: { in: job.targetCollegeIds },
        status: { in: ['APPLIED', 'IN_PROGRESS'] },
        id: { not: applicationId },
      },
      `Position filled at ${this.companyName(job)}`,
    );
    if (others.length > 0) {
      await this.notifyManyAcrossColleges(others, {
        type: 'APPLICATION_STAGE_CHANGED',
        title: `Update — ${job.title}`,
        body: `Your application for ${job.title} at ${this.companyName(job)} was not taken forward — the position has been filled.`,
        link: `/me/jobs/${job.id}`,
        email: {
          subject: `Placement Update – ${this.companyName(job)} | ${job.title}`,
          html: renderFormalEmail({
            collegeName: COLLEGE_NAME_TOKEN,
            intro: `We regret to inform you that the position of ${job.title} at ${this.companyName(job)} has been filled. Thank you for your participation in this drive.`,
            note: 'We wish you the very best for your future placement drives.',
          }),
        },
      });
    }

    return { success: true };
  }

  async rejectPlatform(jobId: string, applicationId: string, reason?: string) {
    const job = await this.resolvePlatformJob(jobId);
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, jobId, collegeId: { in: job.targetCollegeIds } },
      include: { student: { select: { userId: true } } },
    });
    if (!app) throw new NotFoundException('Application not found');

    await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: 'REJECTED',
        stage: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason ?? 'Not shortlisted',
      },
    });
    await this.notifications.notify({
      userId: app.student.userId,
      collegeId: app.collegeId,
      type: 'APPLICATION_STAGE_CHANGED',
      title: `Update — ${job.title}`,
      body: `Your application for ${job.title} at ${this.companyName(job)} was not taken forward.`,
      link: `/me/jobs/${job.id}`,
      email: {
        subject: `Application Update – ${this.companyName(job)} | ${job.title}`,
        html: renderFormalEmail({
          collegeName: COLLEGE_NAME_TOKEN,
          intro: `We regret to inform you that your application for ${job.title} at ${this.companyName(job)} was not taken forward.`,
          ...(reason ? { fields: [{ label: 'Note', value: reason }] } : {}),
        }),
      },
    });
    return { success: true };
  }

  // ─────────────── Officer alert: rounds whose date has passed, still undecided ───────────────
  async pendingResults(collegeId: string) {
    const rounds = await this.prisma.jobRound.findMany({
      where: {
        collegeId,
        status: 'OPEN',
        scheduledAt: { not: null, lt: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
      include: { job: { select: { id: true, title: true } } },
    });
    return rounds.map((r) => ({
      jobId: r.jobId,
      jobTitle: r.job.title,
      roundId: r.id,
      roundTitle: r.title,
      scheduledAt: r.scheduledAt,
    }));
  }

  // ── helpers ──
  private toStudent(a: {
    id: string;
    studentId: string;
    appliedAt: Date;
    status: string;
    offerCtc: Prisma.Decimal | null;
    offerLetterUrl: string | null;
    student: {
      rollNumber: string;
      programme: string;
      user: { fullName: string; email: string };
      resume: { publicSlug: string; isPublished: boolean } | null;
      college?: { name: string };
    };
  }): FunnelStudent {
    return {
      applicationId: a.id,
      studentId: a.studentId,
      rollNumber: a.student.rollNumber,
      fullName: a.student.user.fullName,
      programme: a.student.programme,
      email: a.student.user.email,
      // Present whenever a resume row exists — the officer views it via an
      // authenticated route, so publish state doesn't matter here.
      resumeSlug: a.student.resume ? a.student.resume.publicSlug : null,
      appliedAt: a.appliedAt,
      status: a.status,
      offerCtc: a.offerCtc != null ? Number(a.offerCtc) : null,
      offerLetterUrl: a.offerLetterUrl,
      ...(a.student.college ? { collegeName: a.student.college.name } : {}),
    };
  }
}
