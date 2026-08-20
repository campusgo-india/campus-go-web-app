import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient, TrainingSession } from '@campusgo/database';
import { CreateSessionDto, MarkAttendanceDto, UpdateSessionDto } from './dto';

function toPublic(s: TrainingSession) {
  return {
    id: s.id,
    title: s.title,
    pillar: s.pillar,
    trainerName: s.trainerName,
    description: s.description,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    status: s.status,
    createdAt: s.createdAt,
  };
}

@Injectable()
export class TrainingSessionsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  // ─────────────── Officer / Admin ───────────────

  async list(collegeId: string) {
    const rows = await this.prisma.trainingSession.findMany({
      where: { collegeId },
      orderBy: { startsAt: 'desc' },
    });
    return rows.map(toPublic);
  }

  async findOneOrThrow(collegeId: string, id: string) {
    const s = await this.prisma.trainingSession.findFirst({ where: { id, collegeId } });
    if (!s) throw new NotFoundException('Training session not found');
    return s;
  }

  async create(collegeId: string, userId: string, dto: CreateSessionDto) {
    const created = await this.prisma.trainingSession.create({
      data: {
        collegeId,
        title: dto.title.trim(),
        pillar: dto.pillar,
        trainerName: dto.trainerName,
        description: dto.description,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        createdById: userId,
      },
    });
    return toPublic(created);
  }

  async update(collegeId: string, id: string, dto: UpdateSessionDto) {
    await this.findOneOrThrow(collegeId, id);
    const updated = await this.prisma.trainingSession.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.pillar !== undefined ? { pillar: dto.pillar } : {}),
        ...(dto.trainerName !== undefined ? { trainerName: dto.trainerName } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.startsAt !== undefined ? { startsAt: new Date(dto.startsAt) } : {}),
        ...(dto.endsAt !== undefined ? { endsAt: new Date(dto.endsAt) } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
    return toPublic(updated);
  }

  async remove(collegeId: string, id: string) {
    await this.findOneOrThrow(collegeId, id);
    await this.prisma.trainingSession.delete({ where: { id } });
    return { success: true };
  }

  // Full active roster with each student's attendance flag (null = not marked).
  async listAttendance(collegeId: string, sessionId: string) {
    await this.findOneOrThrow(collegeId, sessionId);
    const [students, attendance] = await Promise.all([
      this.prisma.student.findMany({
        where: { collegeId, graduatedAt: null },
        select: { id: true, rollNumber: true, user: { select: { fullName: true } } },
        orderBy: { rollNumber: 'asc' },
      }),
      this.prisma.trainingAttendance.findMany({ where: { sessionId } }),
    ]);
    const byStudent = new Map(attendance.map((a) => [a.studentId, a.present]));
    return students.map((s) => ({
      studentId: s.id,
      rollNumber: s.rollNumber,
      fullName: s.user.fullName,
      present: byStudent.has(s.id) ? byStudent.get(s.id)! : null,
    }));
  }

  async markAttendance(collegeId: string, sessionId: string, userId: string, dto: MarkAttendanceDto) {
    await this.findOneOrThrow(collegeId, sessionId);
    const studentIds = dto.rows.map((r) => r.studentId);
    const validStudents = await this.prisma.student.findMany({
      where: { id: { in: studentIds }, collegeId },
      select: { id: true },
    });
    const validIds = new Set(validStudents.map((s) => s.id));

    for (const row of dto.rows) {
      if (!validIds.has(row.studentId)) continue;
      await this.prisma.trainingAttendance.upsert({
        where: { sessionId_studentId: { sessionId, studentId: row.studentId } },
        create: { collegeId, sessionId, studentId: row.studentId, present: row.present, markedById: userId },
        update: { present: row.present, markedById: userId },
      });
    }
    return { success: true, marked: validIds.size };
  }

  // ─────────────── Student (self) ───────────────

  async studentForUser(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true, collegeId: true },
    });
    if (!student) throw new ForbiddenException('No student profile for this account');
    return student;
  }

  // Full calendar feed: every session at the student's college plus their own
  // attendance flag (null until marked).
  async listForStudent(userId: string) {
    const { id: studentId, collegeId } = await this.studentForUser(userId);
    const [sessions, attendance] = await Promise.all([
      this.prisma.trainingSession.findMany({ where: { collegeId }, orderBy: { startsAt: 'asc' } }),
      this.prisma.trainingAttendance.findMany({ where: { studentId } }),
    ]);
    const byS = new Map(attendance.map((a) => [a.sessionId, a.present]));
    return sessions.map((s) => ({
      ...toPublic(s),
      myAttendance: byS.has(s.id) ? byS.get(s.id)! : null,
    }));
  }
}
