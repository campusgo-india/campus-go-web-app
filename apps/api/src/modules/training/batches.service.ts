import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient, TrainingBatch } from '@campusgo/database';
import { CreateBatchDto, SetBatchMembersDto, UpdateBatchDto } from './dto';

function toPublic(b: TrainingBatch & { _count?: { members: number } }) {
  return {
    id: b.id,
    name: b.name,
    description: b.description,
    memberCount: b._count?.members ?? 0,
    createdAt: b.createdAt,
  };
}

/**
 * A named, hand-picked group of students for training targeting — separate
 * from school/programme/graduation year. An officer builds a batch by selecting
 * any set of students; Training sessions/assessments can then target it.
 */
@Injectable()
export class TrainingBatchesService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async list(collegeId: string) {
    const batches = await this.prisma.trainingBatch.findMany({
      where: { collegeId },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return batches.map(toPublic);
  }

  async findOneOrThrow(collegeId: string, id: string) {
    const b = await this.prisma.trainingBatch.findFirst({ where: { id, collegeId } });
    if (!b) throw new NotFoundException('Batch not found');
    return b;
  }

  async create(collegeId: string, userId: string, dto: CreateBatchDto) {
    const dup = await this.prisma.trainingBatch.findFirst({
      where: { collegeId, name: dto.name.trim() },
    });
    if (dup) throw new BadRequestException(`A batch named "${dto.name}" already exists`);
    const created = await this.prisma.trainingBatch.create({
      data: { collegeId, name: dto.name.trim(), description: dto.description, createdById: userId },
    });
    return toPublic(created);
  }

  async update(collegeId: string, id: string, dto: UpdateBatchDto) {
    await this.findOneOrThrow(collegeId, id);
    const updated = await this.prisma.trainingBatch.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });
    return toPublic(updated);
  }

  async remove(collegeId: string, id: string) {
    await this.findOneOrThrow(collegeId, id);
    await this.prisma.trainingBatch.delete({ where: { id } });
    return { success: true };
  }

  // Full active roster with membership flags — the picker UI checks/unchecks
  // against this, then calls setMembers with the resulting id list.
  async listMembers(collegeId: string, batchId: string) {
    await this.findOneOrThrow(collegeId, batchId);
    const [students, members] = await Promise.all([
      this.prisma.student.findMany({
        where: { collegeId, graduatedAt: null },
        select: { id: true, rollNumber: true, school: true, programme: true, user: { select: { fullName: true } } },
        orderBy: { rollNumber: 'asc' },
      }),
      this.prisma.trainingBatchMember.findMany({ where: { batchId }, select: { studentId: true } }),
    ]);
    const memberIds = new Set(members.map((m) => m.studentId));
    return students.map((s) => ({
      studentId: s.id,
      rollNumber: s.rollNumber,
      fullName: s.user.fullName,
      school: s.school,
      programme: s.programme,
      isMember: memberIds.has(s.id),
    }));
  }

  // Replaces the full member list in one call — simpler for a checklist UI
  // than incremental add/remove endpoints.
  async setMembers(collegeId: string, batchId: string, dto: SetBatchMembersDto) {
    await this.findOneOrThrow(collegeId, batchId);
    const validStudents = await this.prisma.student.findMany({
      where: { id: { in: dto.studentIds }, collegeId },
      select: { id: true },
    });
    const validIds = validStudents.map((s) => s.id);

    await this.prisma.$transaction([
      this.prisma.trainingBatchMember.deleteMany({ where: { batchId } }),
      this.prisma.trainingBatchMember.createMany({
        data: validIds.map((studentId) => ({ batchId, studentId })),
      }),
    ]);
    return { success: true, memberCount: validIds.length };
  }
}
