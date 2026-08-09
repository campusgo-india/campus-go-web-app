import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import type { NotificationType, PrismaClient } from '@campusgo/database';
import { EmailService } from '../email/email.service';

export interface NotifyParams {
  userId: string;
  collegeId?: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

/**
 * In-app notification feed. `notify*` helpers are called by other modules after
 * a domain action succeeds — they never throw into the caller (a failed
 * notification must not roll back the action that triggered it). Read APIs are
 * always scoped to the authenticated user's own id (no cross-user access).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly EMAIL_BATCH_SIZE = 5;

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly email: EmailService,
  ) {}

  /**
   * Sends email to a batch of recipients with a small concurrency cap, so a
   * broadcast (e.g. "new job posted" to hundreds of students) doesn't fire
   * everything at once against an SMTP provider's rate limit. Each individual
   * send is already best-effort/self-logging inside EmailService.
   */
  private async sendEmailBatch(
    recipients: { email: string }[],
    collegeId: string | null,
    params: { title: string; body?: string },
  ): Promise<void> {
    for (let i = 0; i < recipients.length; i += this.EMAIL_BATCH_SIZE) {
      const chunk = recipients.slice(i, i + this.EMAIL_BATCH_SIZE);
      await Promise.allSettled(
        chunk.map((r) =>
          this.email.sendForCollege(collegeId, {
            to: r.email,
            subject: params.title,
            text: params.body ?? params.title,
          }),
        ),
      );
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

    // Email is independent of the in-app row and never awaited by the caller —
    // a slow/failing SMTP send must not add latency to the action that
    // triggered this notification.
    void this.prisma.user
      .findUnique({ where: { id: params.userId }, select: { email: true } })
      .then((user) => {
        if (!user) return;
        return this.email.sendForCollege(params.collegeId ?? null, {
          to: user.email,
          subject: params.title,
          text: params.body ?? params.title,
        });
      })
      .catch((err) => this.logger.error(`Failed to email ${params.userId}`, err as Error));
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
      void this.sendEmailBatch(officers, collegeId, params).catch((err) =>
        this.logger.error(`Failed to email officers of ${collegeId}`, err as Error),
      );
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

    void this.prisma.user
      .findMany({ where: { id: { in: userIds } }, select: { email: true } })
      .then((users) => this.sendEmailBatch(users, collegeId, params))
      .catch((err) => this.logger.error(`Failed to email ${userIds.length} users`, err as Error));
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
