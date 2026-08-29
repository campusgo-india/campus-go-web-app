import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { del, put } from '@vercel/blob';
import type { PrismaClient } from '@campusgo/database';
import { PRISMA } from '../../common/prisma.module';
import { SetOfferLimitDto } from './dto';

// Minimal shape of a multer upload (avoids depending on @types/multer) —
// same pattern as ResumesService.
interface UploadedPdf {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

const MAX_POLICY_BYTES = 5 * 1024 * 1024;

/**
 * One row per college: the placement policy PDF every student can view, plus
 * the configurable "max offers before a student is barred from applying to
 * further jobs" rule that JobsService reads at apply time.
 */
@Injectable()
export class PlacementPolicyService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  private async findOrCreate(collegeId: string) {
    const existing = await this.prisma.placementPolicy.findUnique({ where: { collegeId } });
    if (existing) return existing;
    return this.prisma.placementPolicy.create({ data: { collegeId } });
  }

  async get(collegeId: string) {
    return this.publicShape(await this.findOrCreate(collegeId));
  }

  // ─────────────── Officer / Admin: policy document ───────────────

  async upload(collegeId: string, uploadedById: string, file: UploadedPdf) {
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }
    if (file.size > MAX_POLICY_BYTES) {
      throw new BadRequestException('Policy document must be 5 MB or smaller');
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const storeId = process.env.BLOB_RESUME_STORE_ID;
    if (!token) {
      throw new BadRequestException('File storage is not configured (BLOB_READ_WRITE_TOKEN)');
    }

    const policy = await this.findOrCreate(collegeId);
    const oldUrl = policy.fileUrl;
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_').slice(-80) || 'placement-policy.pdf';
    const blob = await put(`placement-policy/${collegeId}/${Date.now()}-${safe}`, file.buffer, {
      access: 'public',
      token,
      storeId,
      contentType: 'application/pdf',
    });

    const updated = await this.prisma.placementPolicy.update({
      where: { collegeId },
      data: { fileUrl: blob.url, fileName: file.originalname, fileSize: file.size, uploadedById },
    });

    // Best-effort cleanup of the previous blob so we don't orphan storage.
    if (oldUrl) {
      try {
        await del(oldUrl, { token });
      } catch {
        // Ignore cleanup failures; the new file is already stored.
      }
    }

    return this.publicShape(updated);
  }

  async remove(collegeId: string) {
    const policy = await this.findOrCreate(collegeId);
    if (!policy.fileUrl) throw new NotFoundException('No policy document to remove');

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      try {
        await del(policy.fileUrl, { token, storeId: process.env.BLOB_RESUME_STORE_ID });
      } catch {
        // Ignore cleanup failures.
      }
    }

    const updated = await this.prisma.placementPolicy.update({
      where: { collegeId },
      data: { fileUrl: '', fileName: '', fileSize: 0 },
    });
    return this.publicShape(updated);
  }

  // ─────────────── Officer / Admin: offer-limit rule ───────────────

  async setOfferLimit(collegeId: string, dto: SetOfferLimitDto) {
    await this.findOrCreate(collegeId);
    const updated = await this.prisma.placementPolicy.update({
      where: { collegeId },
      data: { maxOffersAllowed: dto.maxOffersAllowed },
    });
    return this.publicShape(updated);
  }

  // Core computation shared by restrictedStudents() (below, for the officer
  // UI) and JobsService (which only needs the id set / a single-student
  // check at apply time). "An offer" = an application the officer has
  // marked SELECTED — matches the "Selected" language used across the app,
  // not the legacy ATS stage.
  private async computeRestricted(collegeId: string) {
    const policy = await this.findOrCreate(collegeId);
    if (policy.maxOffersAllowed == null) {
      return { maxOffersAllowed: null as number | null, ids: new Set<string>(), countById: new Map<string, number>() };
    }
    const grouped = await this.prisma.application.groupBy({
      by: ['studentId'],
      where: { collegeId, status: 'SELECTED' },
      _count: { _all: true },
    });
    const countById = new Map(grouped.map((g) => [g.studentId, g._count._all]));
    const ids = new Set(
      grouped.filter((g) => g._count._all >= policy.maxOffersAllowed!).map((g) => g.studentId),
    );
    return { maxOffersAllowed: policy.maxOffersAllowed, ids, countById };
  }

  /** Every student currently blocked by the offer-limit rule, college-wide. */
  async restrictedStudentIds(collegeId: string): Promise<Set<string>> {
    return (await this.computeRestricted(collegeId)).ids;
  }

  /** Is this specific student currently over the offer-limit threshold? */
  async isRestricted(collegeId: string, studentId: string): Promise<boolean> {
    return (await this.computeRestricted(collegeId)).ids.has(studentId);
  }

  // Students currently at/over the configured offer threshold — so an
  // officer can see exactly who this rule is blocking, not just a number.
  async restrictedStudents(collegeId: string) {
    const { maxOffersAllowed, ids, countById } = await this.computeRestricted(collegeId);
    if (ids.size === 0) return { maxOffersAllowed, students: [] };

    const students = await this.prisma.student.findMany({
      where: { id: { in: [...ids] } },
      select: {
        id: true,
        rollNumber: true,
        programme: true,
        user: { select: { fullName: true } },
      },
      orderBy: { rollNumber: 'asc' },
    });

    return {
      maxOffersAllowed,
      students: students.map((s) => ({
        id: s.id,
        rollNumber: s.rollNumber,
        fullName: s.user.fullName,
        programme: s.programme,
        offerCount: countById.get(s.id) ?? 0,
      })),
    };
  }

  // ─────────────── Officer / Admin: student feedback window ───────────────

  async getFeedbackWindow(collegeId: string) {
    const policy = await this.findOrCreate(collegeId);
    return { open: policy.studentFeedbackOpen, openedAt: policy.feedbackOpenedAt };
  }

  async setFeedbackWindow(collegeId: string, open: boolean, userId: string) {
    await this.findOrCreate(collegeId);
    const updated = await this.prisma.placementPolicy.update({
      where: { collegeId },
      data: open
        ? { studentFeedbackOpen: true, feedbackOpenedById: userId, feedbackOpenedAt: new Date() }
        : { studentFeedbackOpen: false },
    });
    return { open: updated.studentFeedbackOpen, openedAt: updated.feedbackOpenedAt };
  }

  // ─────────────── Student (self) ───────────────

  async getForStudent(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { collegeId: true },
    });
    if (!student) throw new ForbiddenException('No student profile for this account');
    return this.get(student.collegeId);
  }

  private publicShape(p: {
    fileUrl: string;
    fileName: string;
    fileSize: number;
    maxOffersAllowed: number | null;
    updatedAt: Date;
  }) {
    return {
      fileUrl: p.fileUrl,
      fileName: p.fileName,
      fileSize: p.fileSize,
      maxOffersAllowed: p.maxOffersAllowed,
      updatedAt: p.updatedAt,
    };
  }
}
