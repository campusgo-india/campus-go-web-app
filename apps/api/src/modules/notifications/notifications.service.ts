import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import type { NotificationType, PrismaClient } from '@campusgo/database';
import { EmailService } from '../email/email.service';
import { COLLEGE_NAME_TOKEN } from './email-templates';

export interface NotifyParams {
  userId: string;
  collegeId?: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  /**
   * The formal placement-cell-style email (subject + html from
   * renderFormalEmail) — every student-facing call site supplies this. When
   * omitted, the email falls back to plain title/body text (used only by
   * call sites that haven't been given a formal template yet).
   */
  email?: { subject: string; html: string };
}

/**
 * In-app notification feed. `notify*` helpers are called by other modules after
 * a domain action succeeds — they never throw into the caller (a failed
 * notification must not roll back the action that triggered it). Read APIs are
 * always scoped to the authenticated user's own id (no cross-user access).
 */
// Most providers cap total recipients (to+cc+bcc) per send well under this;
// chunk a large student BCC list so a broadcast to hundreds still gets out.
const BCC_CHUNK_SIZE = 40;

interface Envelope {
  to: string[];
  cc: string[];
  bcc: string[];
  collegeName: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly email: EmailService,
  ) {}

  /**
   * Builds the To/Cc/Bcc envelope for a batch of students, per the college's
   * mail-template convention: To = Placement Coordinators covering the
   * affected students' programmes (falls back to officers if no coordinator
   * covers any of them — the common case today, since coordinators are
   * optional), Cc = every other College Admin/Placement Officer, Bcc = the
   * students themselves. One email per event, not one per student — the
   * whole point (fewer sends, one thread to search instead of hundreds).
   */
  private async resolveStudentEnvelope(
    collegeId: string,
    userIds: string[],
  ): Promise<Envelope | null> {
    const [students, coordinators, officers, college] = await Promise.all([
      this.prisma.student.findMany({
        where: { userId: { in: userIds }, collegeId },
        select: { programme: true, user: { select: { email: true } } },
      }),
      this.prisma.user.findMany({
        where: { collegeId, role: 'PLACEMENT_COORDINATOR', isActive: true },
        select: { email: true, assignedProgrammes: true },
      }),
      this.prisma.user.findMany({
        where: { collegeId, role: { in: ['COLLEGE_ADMIN', 'PLACEMENT_OFFICER'] }, isActive: true },
        select: { email: true },
      }),
      this.prisma.college.findUnique({ where: { id: collegeId }, select: { name: true } }),
    ]);
    const bcc = [...new Set(students.map((s) => s.user.email))];
    if (bcc.length === 0) return null;

    const programmes = new Set(students.map((s) => s.programme));
    const coordinatorEmails = [
      ...new Set(
        coordinators
          .filter((c) => c.assignedProgrammes.some((p) => programmes.has(p)))
          .map((c) => c.email),
      ),
    ];
    const officerEmails = [...new Set(officers.map((o) => o.email))];

    // No coordinator covers these programmes (or none exist yet) — officers
    // become the primary recipient instead of a redundant/empty To.
    const to = coordinatorEmails.length > 0 ? coordinatorEmails : officerEmails;
    const cc = coordinatorEmails.length > 0 ? officerEmails.filter((e) => !to.includes(e)) : [];
    if (to.length === 0) return null;

    return { to, cc, bcc, collegeName: college?.name ?? 'your college' };
  }

  /** Sends the grouped envelope email, chunking a large Bcc list. Best-effort. */
  private async sendEnvelopeEmail(
    envelope: Envelope,
    content: { subject: string; html: string },
  ): Promise<void> {
    const html = content.html.replaceAll(COLLEGE_NAME_TOKEN, envelope.collegeName);
    for (let i = 0; i < envelope.bcc.length; i += BCC_CHUNK_SIZE) {
      const chunk = envelope.bcc.slice(i, i + BCC_CHUNK_SIZE);
      await this.email.sendForCollege(null, {
        to: envelope.to,
        cc: envelope.cc,
        bcc: chunk,
        subject: content.subject,
        html,
      });
    }
  }

  /**
   * Resolves the envelope and sends one grouped email for a batch of
   * students — the shared path behind notify() and notifyMany(). Falls back
   * to plain title/body text if the call site hasn't supplied a formal
   * `email` template yet. Best-effort: never throws into the caller.
   */
  private async sendStudentEmail(
    collegeId: string | null | undefined,
    userIds: string[],
    params: Omit<NotifyParams, 'userId' | 'collegeId'>,
  ): Promise<void> {
    if (!collegeId) return;
    try {
      const envelope = await this.resolveStudentEnvelope(collegeId, userIds);
      if (!envelope) return;
      const content = params.email ?? {
        subject: params.title,
        html: `<p>${params.body ?? params.title}</p>`,
      };
      await this.sendEnvelopeEmail(envelope, content);
    } catch (err) {
      this.logger.error(`Failed to email ${userIds.length} student(s)`, err as Error);
    }
  }

  /** Create one notification for a single recipient. Best-effort. */
  async notify(params: NotifyParams): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userId: params.userId,
          collegeId: params.collegeId ?? null,
          type: params.type,
          title: params.title,
          body: params.body,
          link: params.link,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to create notification for ${params.userId}`, err as Error);
    }

    // Email is independent of the in-app row and never awaited by the caller.
    void this.sendStudentEmail(params.collegeId, [params.userId], params);
  }

  /** Fan a notification out to every College Admin + Placement Officer of a college. */
  async notifyOfficers(
    collegeId: string,
    params: Omit<NotifyParams, 'userId' | 'collegeId'>,
  ): Promise<void> {
    let officers: { id: string; email: string }[] = [];
    try {
      officers = await this.prisma.user.findMany({
        where: {
          collegeId,
          role: { in: ['COLLEGE_ADMIN', 'PLACEMENT_OFFICER'] },
          isActive: true,
        },
        select: { id: true, email: true },
      });
      if (officers.length === 0) return;
      await this.prisma.notification.createMany({
        data: officers.map((o) => ({
          userId: o.id,
          collegeId,
          type: params.type,
          title: params.title,
          body: params.body,
          link: params.link,
        })),
      });
    } catch (err) {
      this.logger.error(`Failed to notify officers of ${collegeId}`, err as Error);
    }

    if (officers.length > 0) {
      const content = params.email ?? {
        subject: params.title,
        html: `<p>${params.body ?? params.title}</p>`,
      };
      void this.email
        .sendForCollege(collegeId, { to: officers.map((o) => o.email), subject: content.subject, html: content.html })
        .catch((err) => this.logger.error(`Failed to email officers of ${collegeId}`, err as Error));
    }
  }

  /** Fan a notification out to an explicit list of users (e.g. eligible students). */
  async notifyMany(
    userIds: string[],
    collegeId: string,
    params: Omit<NotifyParams, 'userId' | 'collegeId'>,
  ): Promise<void> {
    if (userIds.length === 0) return;
    try {
      await this.prisma.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          collegeId,
          type: params.type,
          title: params.title,
          body: params.body,
          link: params.link,
        })),
      });
    } catch (err) {
      this.logger.error(`Failed to notify ${userIds.length} users`, err as Error);
    }

    void this.sendStudentEmail(collegeId, userIds, params);
  }

  // ─────────────── Recipient-facing reads (own only) ───────────────

  async list(userId: string, opts: { unreadOnly?: boolean; page?: number; limit?: number }) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 20, 50);
    const where = { userId, ...(opts.unreadOnly ? { readAt: null } : {}) };

    const [total, unread, items] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items,
      meta: { total, unread, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async unreadCount(userId: string) {
    const unread = await this.prisma.notification.count({ where: { userId, readAt: null } });
    return { unread };
  }

  async markRead(userId: string, id: string) {
    // Scope the update by userId so a user can only mark their own as read.
    const result = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      // Either it doesn't exist, isn't theirs, or was already read.
      const exists = await this.prisma.notification.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('Notification not found');
    }
    return { success: true };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true, marked: result.count };
  }
}
