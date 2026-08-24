import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient } from '@campusgo/database';
import { SubmitFeedbackDto } from './dto';

const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null);
const round1 = (n: number | null) => (n == null ? null : Math.round(n * 10) / 10);

@Injectable()
export class TrainingFeedbackService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  // ─────────────── Student (self) ───────────────

  private async studentForUser(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true, collegeId: true },
    });
    if (!student) throw new ForbiddenException('No student profile for this account');
    return student;
  }

  // The earliest COMPLETED session this student attended that they haven't
  // rated yet — drives the post-session feedback pop-up.
  async getPending(userId: string) {
    const { id: studentId } = await this.studentForUser(userId);
    const attended = await this.prisma.trainingAttendance.findMany({
      where: { studentId, present: true, session: { status: 'COMPLETED' } },
      include: { session: true },
      orderBy: { session: { endsAt: 'asc' } },
    });
    if (attended.length === 0) return null;

    const already = await this.prisma.trainingFeedback.findMany({
      where: { studentId, sessionId: { in: attended.map((a) => a.sessionId) } },
      select: { sessionId: true },
    });
    const rated = new Set(already.map((f) => f.sessionId));
    const next = attended.find((a) => !rated.has(a.sessionId));
    if (!next) return null;

    return {
      sessionId: next.session.id,
      title: next.session.title,
      trainerName: next.session.trainerName,
      endsAt: next.session.endsAt,
    };
  }

  async submit(userId: string, dto: SubmitFeedbackDto) {
    const { id: studentId, collegeId } = await this.studentForUser(userId);
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: dto.sessionId, collegeId },
    });
    if (!session) throw new NotFoundException('Training session not found');
    if (session.status !== 'COMPLETED') {
      throw new BadRequestException('Feedback can only be submitted once the session is complete');
    }

    const existing = await this.prisma.trainingFeedback.findUnique({
      where: { sessionId_studentId: { sessionId: dto.sessionId, studentId } },
    });
    if (existing) throw new BadRequestException('Feedback already submitted for this session');

    const created = await this.prisma.trainingFeedback.create({
      data: {
        collegeId,
        sessionId: dto.sessionId,
        studentId,
        contentQuality: dto.contentQuality,
        trainerDelivery: dto.trainerDelivery,
        relevanceToPlacement: dto.relevanceToPlacement,
      },
    });
    return { id: created.id };
  }

  // ─────────────── Officer / Admin analytics ───────────────

  async analytics(collegeId: string) {
    const rows = await this.prisma.trainingFeedback.findMany({
      where: { collegeId },
      include: {
        session: { select: { id: true, title: true, trainerName: true, startsAt: true } },
      },
    });

    const bySession = new Map<
      string,
      {
        title: string;
        trainerName: string | null;
        startsAt: Date;
        content: number[];
        delivery: number[];
        relevance: number[];
      }
    >();
    for (const r of rows) {
      let bucket = bySession.get(r.sessionId);
      if (!bucket) {
        bucket = {
          title: r.session.title,
          trainerName: r.session.trainerName,
          startsAt: r.session.startsAt,
          content: [],
          delivery: [],
          relevance: [],
        };
        bySession.set(r.sessionId, bucket);
      }
      bucket.content.push(r.contentQuality);
      bucket.delivery.push(r.trainerDelivery);
      bucket.relevance.push(r.relevanceToPlacement);
    }

    const sessions = [...bySession.entries()]
      .map(([sessionId, b]) => {
        const overall = avg([...b.content, ...b.delivery, ...b.relevance]);
        return {
          sessionId,
          title: b.title,
          trainerName: b.trainerName,
          startsAt: b.startsAt,
          responseCount: b.content.length,
          avgContentQuality: round1(avg(b.content)),
          avgTrainerDelivery: round1(avg(b.delivery)),
          avgRelevance: round1(avg(b.relevance)),
          avgOverall: round1(overall),
        };
      })
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());

    // Overall rating per trainer, across every session they ran.
    const byTrainer = new Map<string, number[]>();
    for (const r of rows) {
      const name = r.session.trainerName;
      if (!name) continue;
      const list = byTrainer.get(name) ?? [];
      list.push(r.contentQuality, r.trainerDelivery, r.relevanceToPlacement);
      byTrainer.set(name, list);
    }
    const trainers = [...byTrainer.entries()].map(([trainerName, ratings]) => ({
      trainerName,
      avgRating: round1(avg(ratings)),
    }));

    return { sessions, trainers };
  }
}
