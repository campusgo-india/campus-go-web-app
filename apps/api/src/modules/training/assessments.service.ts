import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PRISMA } from '../../common/prisma.module';
import { Prisma } from '@campusgo/database';
import type { Assessment, PrismaClient } from '@campusgo/database';
import { CreateAssessmentDto, ImportScoresDto, ManualScoreEntryDto, UpdateAssessmentDto } from './dto';

const dec = (v: Prisma.Decimal) => Number(v);

function toPublic(a: Assessment) {
  return {
    id: a.id,
    name: a.name,
    pillar: a.pillar,
    phase: a.phase,
    externalUrl: a.externalUrl,
    maxMarks: a.maxMarks,
    isActive: a.isActive,
    targetProgrammes: a.targetProgrammes,
    targetBatchIds: a.targetBatchIds,
    createdAt: a.createdAt,
  };
}

@Injectable()
export class AssessmentsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  // ─────────────── Officer / Admin ───────────────

  async list(collegeId: string) {
    const rows = await this.prisma.assessment.findMany({
      where: { collegeId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toPublic);
  }

  async findOneOrThrow(collegeId: string, id: string) {
    const a = await this.prisma.assessment.findFirst({ where: { id, collegeId } });
    if (!a) throw new NotFoundException('Assessment not found');
    return a;
  }

  async create(collegeId: string, userId: string, dto: CreateAssessmentDto) {
    const created = await this.prisma.assessment.create({
      data: {
        collegeId,
        name: dto.name.trim(),
        pillar: dto.pillar,
        phase: dto.phase,
        externalUrl: dto.externalUrl,
        maxMarks: dto.maxMarks,
        targetProgrammes: dto.targetProgrammes ?? [],
        targetBatchIds: dto.targetBatchIds ?? [],
        createdById: userId,
      },
    });
    return toPublic(created);
  }

  async update(collegeId: string, id: string, dto: UpdateAssessmentDto) {
    await this.findOneOrThrow(collegeId, id);
    const updated = await this.prisma.assessment.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.pillar !== undefined ? { pillar: dto.pillar } : {}),
        ...(dto.phase !== undefined ? { phase: dto.phase } : {}),
        ...(dto.externalUrl !== undefined ? { externalUrl: dto.externalUrl } : {}),
        ...(dto.maxMarks !== undefined ? { maxMarks: dto.maxMarks } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.targetProgrammes !== undefined ? { targetProgrammes: dto.targetProgrammes } : {}),
        ...(dto.targetBatchIds !== undefined ? { targetBatchIds: dto.targetBatchIds } : {}),
      },
    });
    return toPublic(updated);
  }

  async remove(collegeId: string, id: string) {
    await this.findOneOrThrow(collegeId, id);
    await this.prisma.assessment.delete({ where: { id } });
    return { success: true };
  }

  // One row per scored student, plus the roster so the officer can see who's
  // still ungraded. Ordered by roll number for a stable, scannable sheet.
  async listScores(collegeId: string, assessmentId: string) {
    await this.findOneOrThrow(collegeId, assessmentId);
    const [students, scores] = await Promise.all([
      this.prisma.student.findMany({
        where: { collegeId, graduatedAt: null },
        select: { id: true, rollNumber: true, user: { select: { fullName: true } } },
        orderBy: { rollNumber: 'asc' },
      }),
      this.prisma.assessmentScore.findMany({ where: { assessmentId } }),
    ]);
    const byStudent = new Map(scores.map((s) => [s.studentId, s]));
    return students.map((s) => {
      const score = byStudent.get(s.id);
      return {
        studentId: s.id,
        rollNumber: s.rollNumber,
        fullName: s.user.fullName,
        marksObtained: score ? dec(score.marksObtained) : null,
      };
    });
  }

  async enterScore(collegeId: string, assessmentId: string, userId: string, dto: ManualScoreEntryDto) {
    const assessment = await this.findOneOrThrow(collegeId, assessmentId);
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, collegeId },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Student not found');
    if (dto.marksObtained > assessment.maxMarks) {
      throw new BadRequestException(`Marks cannot exceed the max (${assessment.maxMarks})`);
    }

    const score = await this.prisma.assessmentScore.upsert({
      where: { assessmentId_studentId: { assessmentId, studentId: student.id } },
      create: {
        collegeId,
        assessmentId,
        studentId: student.id,
        marksObtained: new Prisma.Decimal(dto.marksObtained),
        enteredById: userId,
      },
      update: {
        marksObtained: new Prisma.Decimal(dto.marksObtained),
        enteredById: userId,
      },
    });
    return { studentId: score.studentId, marksObtained: dec(score.marksObtained) };
  }

  /**
   * Bulk score upload. CSV is parsed with the same hand-rolled parser used for
   * student CSV import; XLSX is loaded via exceljs (already a dependency for
   * report generation — it reads workbooks just as well as it writes them).
   * Both paths reduce to the same { rollNumber, marksObtained } row shape,
   * matched against Student.rollNumber and upserted.
   */
  async importScores(collegeId: string, assessmentId: string, userId: string, dto: ImportScoresDto) {
    const assessment = await this.findOneOrThrow(collegeId, assessmentId);
    const buffer = Buffer.from(dto.fileBase64, 'base64');
    const isXlsx = /\.xlsx$/i.test(dto.fileName);
    const rows = isXlsx ? await parseXlsxRows(buffer) : parseCsvRows(buffer.toString('utf8'));
    if (rows.length === 0) throw new BadRequestException('File has no data rows');

    const rollNumbers = rows.map((r) => r.rollNumber).filter(Boolean);
    const students = await this.prisma.student.findMany({
      where: { collegeId, rollNumber: { in: rollNumbers } },
      select: { id: true, rollNumber: true },
    });
    const byRoll = new Map(students.map((s) => [s.rollNumber, s.id]));

    const errors: Array<{ row: number; message: string }> = [];
    const upserts: Array<{ studentId: string; marksObtained: number }> = [];
    rows.forEach((row, i) => {
      const rowNum = i + 2;
      if (!row.rollNumber) {
        errors.push({ row: rowNum, message: 'Missing Student Roll No / ID' });
        return;
      }
      const studentId = byRoll.get(row.rollNumber);
      if (!studentId) {
        errors.push({ row: rowNum, message: `Unknown roll number: ${row.rollNumber}` });
        return;
      }
      const marks = Number(row.marksObtained);
      if (row.marksObtained === '' || Number.isNaN(marks)) {
        errors.push({ row: rowNum, message: `Invalid marks: ${row.marksObtained}` });
        return;
      }
      if (marks > assessment.maxMarks) {
        errors.push({ row: rowNum, message: `Marks exceed max (${assessment.maxMarks}): ${marks}` });
        return;
      }
      upserts.push({ studentId, marksObtained: marks });
    });

    for (const u of upserts) {
      await this.prisma.assessmentScore.upsert({
        where: { assessmentId_studentId: { assessmentId, studentId: u.studentId } },
        create: {
          collegeId,
          assessmentId,
          studentId: u.studentId,
          marksObtained: new Prisma.Decimal(u.marksObtained),
          enteredById: userId,
        },
        update: {
          marksObtained: new Prisma.Decimal(u.marksObtained),
          enteredById: userId,
        },
      });
    }

    return { updatedCount: upserts.length, errorCount: errors.length, errors };
  }

  // ─────────────── Student (self) ───────────────

  // Resolved fresh from the JWT's userId on every call — the JWT itself only
  // carries { sub, collegeId, role }, never the student row id.
  async studentForUser(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true, collegeId: true, programme: true },
    });
    if (!student) throw new ForbiddenException('No student profile for this account');
    return student;
  }

  // Active assessments visible to this student — untargeted assessments (the
  // default) plus any that specifically target their programme or a batch
  // they're in — each with the student's own score (null until graded).
  async listForStudent(userId: string) {
    const { id: studentId, collegeId, programme } = await this.studentForUser(userId);
    const batchMemberships = await this.prisma.trainingBatchMember.findMany({
      where: { studentId },
      select: { batchId: true },
    });
    const batchIds = batchMemberships.map((m) => m.batchId);

    const [assessments, scores] = await Promise.all([
      this.prisma.assessment.findMany({
        where: {
          collegeId,
          isActive: true,
          OR: [
            { targetProgrammes: { isEmpty: true }, targetBatchIds: { isEmpty: true } },
            { targetProgrammes: { has: programme } },
            ...(batchIds.length ? [{ targetBatchIds: { hasSome: batchIds } }] : []),
          ],
        },
        orderBy: [{ pillar: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.assessmentScore.findMany({ where: { studentId } }),
    ]);
    const byAssessment = new Map(scores.map((s) => [s.assessmentId, s]));
    return assessments.map((a) => {
      const score = byAssessment.get(a.id);
      return { ...toPublic(a), myScore: score ? dec(score.marksObtained) : null };
    });
  }
}

function parseCsvRows(text: string): Array<{ rollNumber: string; marksObtained: string }> {
  const records = parseCsv(text);
  return records.map((row) => {
    const get = (...keys: string[]) => {
      for (const k of keys) {
        const v = (row[k] ?? '').trim();
        if (v !== '') return v;
      }
      return '';
    };
    return {
      rollNumber: get('studentrollno', 'rollnumber', 'rollno', 'regno', 'studentid'),
      marksObtained: get('marksobtained', 'marks', 'score'),
    };
  });
}

async function parseXlsxRows(buffer: Buffer): Promise<Array<{ rollNumber: string; marksObtained: string }>> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = wb.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]/g, '');
  });

  const rows: Array<{ rollNumber: string; marksObtained: string }> = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    if (row.cellCount === 0) continue;
    const obj: Record<string, string> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = headers[colNumber];
      if (key) obj[key] = String(cell.value ?? '').trim();
    });
    if (Object.values(obj).every((v) => v === '')) continue;
    const get = (...keys: string[]) => {
      for (const k of keys) {
        if (obj[k]) return obj[k];
      }
      return '';
    };
    rows.push({
      rollNumber: get('studentrollno', 'rollnumber', 'rollno', 'regno', 'studentid'),
      marksObtained: get('marksobtained', 'marks', 'score'),
    });
  }
  return rows;
}

/** Minimal RFC-4180-ish CSV parser (mirrors students.service.ts). */
function parseCsv(text: string): Array<Record<string, string>> {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    record.push(field);
    field = '';
  };
  const pushRecord = () => {
    pushField();
    records.push(record);
    record = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      pushField();
    } else if (c === '\n') {
      pushRecord();
    } else if (c === '\r') {
      // ignore; handled by following \n
    } else {
      field += c;
    }
  }
  if (field !== '' || record.length > 0) pushRecord();

  const rows = records.filter((r) => r.some((v) => v.trim() !== ''));
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[\s_]/g, ''));
  return rows.slice(1).map((cols) => {
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => {
      obj[h] = cols[idx] ?? '';
    });
    return obj;
  });
}
