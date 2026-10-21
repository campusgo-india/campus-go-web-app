import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { del, put } from '@vercel/blob';
import type { PrismaClient } from '@campusgo/database';
import { PRISMA } from '../../common/prisma.module';
import { UpdateResumeDto } from './dto';

// Minimal shape of a multer upload (avoids depending on @types/multer).
interface UploadedPdf {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

const MAX_RESUME_BYTES = 1 * 1024 * 1024;

/** Résumé slot: 1 is the primary file, 2 the optional second one. */
export type ResumeSlot = 1 | 2;

const SLOT_FIELDS = {
  1: { url: 'fileUrl', name: 'fileName', size: 'fileSize' },
  2: { url: 'fileUrl2', name: 'fileName2', size: 'fileSize2' },
} as const;

@Injectable()
export class ResumesService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  // --- Student self-service ---

  /** Returns the caller's resume metadata, creating a slug-only row on first access. */
  async getMine(userId: string) {
    const student = await this.studentForUser(userId);
    const existing = await this.prisma.resume.findUnique({ where: { studentId: student.id } });
    if (existing) return this.publicShape(existing);

    const created = await this.prisma.resume.create({
      data: {
        studentId: student.id,
        collegeId: student.collegeId,
        publicSlug: await this.uniqueSlug(),
        fileUrl: '',
        fileName: '',
        fileSize: 0,
        isPublished: true,
      },
    });
    return this.publicShape(created);
  }

  async uploadMine(userId: string, file: UploadedPdf, slot: ResumeSlot = 1) {
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }
    if (file.size > MAX_RESUME_BYTES) {
      throw new BadRequestException('Resume must be 1 MB or smaller');
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const storeId = process.env.BLOB_RESUME_STORE_ID;
    if (!token)
      throw new BadRequestException('File storage is not configured (BLOB_READ_WRITE_TOKEN)');

    const student = await this.studentForUser(userId);
    let resume = await this.prisma.resume.findUnique({ where: { studentId: student.id } });
    if (!resume) {
      resume = await this.prisma.resume.create({
        data: {
          studentId: student.id,
          collegeId: student.collegeId,
          publicSlug: await this.uniqueSlug(),
          fileUrl: '',
          fileName: '',
          fileSize: 0,
          isPublished: true,
        },
      });
    }

    const f = SLOT_FIELDS[slot];
    const oldUrl = resume[f.url];
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_').slice(-80) || 'resume.pdf';
    const blob = await put(
      `resume-storage/${student.collegeId}/${student.id}/${Date.now()}-${safe}`,
      file.buffer,
      {
        access: 'public',
        token,
        storeId,
        contentType: 'application/pdf',
      },
    );

    const updated = await this.prisma.resume.update({
      where: { studentId: student.id },
      data: {
        [f.url]: blob.url,
        [f.name]: file.originalname,
        [f.size]: file.size,
      },
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

  async updateMine(userId: string, dto: UpdateResumeDto) {
    const student = await this.studentForUser(userId);
    const updated = await this.prisma.resume.update({
      where: { studentId: student.id },
      data: { isPublished: dto.isPublished },
    });
    return this.publicShape(updated);
  }

  async deleteMine(userId: string, slot: ResumeSlot = 1) {
    const student = await this.studentForUser(userId);
    const resume = await this.prisma.resume.findUnique({ where: { studentId: student.id } });
    const f = SLOT_FIELDS[slot];
    const url = resume?.[f.url];
    if (!resume || !url) throw new NotFoundException('No resume to delete');

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const storeId = process.env.BLOB_RESUME_STORE_ID;
    if (token) {
      try {
        await del(url, { token, storeId });
      } catch {
        // Ignore cleanup failures.
      }
    }

    const updated = await this.prisma.resume.update({
      where: { studentId: student.id },
      data: { [f.url]: '', [f.name]: '', [f.size]: 0 },
    });
    return this.publicShape(updated);
  }

  // --- Public, unauthenticated render endpoint ---

  /** Looked up by unguessable slug; only returns a published resume that has a file. */
  async getPublic(slug: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { publicSlug: slug, isPublished: true },
    });
    if (!resume || (!resume.fileUrl && !resume.fileUrl2)) {
      throw new NotFoundException('Resume not found');
    }
    return this.publicShape(resume);
  }

  // Officer/admin view of a student's resume — returns it regardless of publish state.
  async getForOfficer(collegeId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, collegeId },
      include: { user: { select: { fullName: true } }, resume: true },
    });
    if (!student) throw new NotFoundException('Student not found');
    if (!student.resume) throw new NotFoundException('This student has not uploaded a resume yet');
    return {
      ...this.publicShape(student.resume),
      fullName: student.user.fullName,
    };
  }

  // Same as getForOfficer but unscoped by college — Platform Admin oversees
  // every college, so no collegeId filter applies here.
  async getForPlatformAdmin(studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId },
      include: { user: { select: { fullName: true } }, resume: true },
    });
    if (!student) throw new NotFoundException('Student not found');
    if (!student.resume) throw new NotFoundException('This student has not uploaded a resume yet');
    return {
      ...this.publicShape(student.resume),
      fullName: student.user.fullName,
    };
  }

  private async studentForUser(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!student) throw new ForbiddenException('No student profile for this account');
    return student;
  }

  private async uniqueSlug(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const slug = randomBytes(9).toString('base64url');
      const clash = await this.prisma.resume.findUnique({ where: { publicSlug: slug } });
      if (!clash) return slug;
    }
    throw new BadRequestException('Could not allocate a resume link, please retry');
  }

  private publicShape(r: {
    publicSlug: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    fileUrl2: string;
    fileName2: string;
    fileSize2: number;
    isPublished: boolean;
    updatedAt: Date;
  }) {
    return {
      publicSlug: r.publicSlug,
      fileUrl: r.fileUrl,
      fileName: r.fileName,
      fileSize: r.fileSize,
      secondFileUrl: r.fileUrl2,
      secondFileName: r.fileName2,
      secondFileSize: r.fileSize2,
      isPublished: r.isPublished,
      updatedAt: r.updatedAt,
    };
  }
}
