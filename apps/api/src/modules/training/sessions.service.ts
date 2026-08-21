import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient, TrainingSession } from '@campusgo/database';
import { CreateSessionDto, ImportAttendanceDto, MarkAttendanceDto, UpdateSessionDto } from './dto';

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
    targetProgrammes: s.targetProgrammes,
    targetBatchIds: s.targetBatchIds,
    createdAt: s.createdAt,
  };
}

// Untargeted (the default) OR targets this student's programme OR one of their
// batches. Exported so dashboard.service.ts can apply the identical rule to
// track-status counts.
export function visibilityFilter(programme: string, batchIds: string[]) {
  return {
    OR: [
      { targetProgrammes: { isEmpty: true }, targetBatchIds: { isEmpty: true } },
      { targetProgrammes: { has: programme } },
      ...(batchIds.length ? [{ targetBatchIds: { hasSome: batchIds } }] : []),
    ],
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
        targetProgrammes: dto.targetProgrammes ?? [],
        targetBatchIds: dto.targetBatchIds ?? [],
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
        ...(dto.targetProgrammes !== undefined ? { targetProgrammes: dto.targetProgrammes } : {}),
        ...(dto.targetBatchIds !== undefined ? { targetBatchIds: dto.targetBatchIds } : {}),
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

  /**
   * Bulk attendance upload. Same CSV/XLSX pattern as the assessment score
   * import: match by Student Roll No, upsert one TrainingAttendance row per
   * matched student. Present/absent accepts yes/no, true/false, 1/0, or
   * present/absent (case-insensitive).
   */
  async importAttendance(collegeId: string, sessionId: string, userId: string, dto: ImportAttendanceDto) {
    await this.findOneOrThrow(collegeId, sessionId);
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
    const upserts: Array<{ studentId: string; present: boolean }> = [];
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
      const present = parsePresent(row.present);
      if (present === null) {
        errors.push({ row: rowNum, message: `Invalid present value: ${row.present}` });
        return;
      }
      upserts.push({ studentId, present });
    });

    for (const u of upserts) {
      await this.prisma.trainingAttendance.upsert({
        where: { sessionId_studentId: { sessionId, studentId: u.studentId } },
        create: { collegeId, sessionId, studentId: u.studentId, present: u.present, markedById: userId },
        update: { present: u.present, markedById: userId },
      });
    }

    return { updatedCount: upserts.length, errorCount: errors.length, errors };
  }

  // ─────────────── Student (self) ───────────────

  async studentForUser(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true, collegeId: true, programme: true },
    });
    if (!student) throw new ForbiddenException('No student profile for this account');
    return student;
  }

  async myBatchIds(studentId: string): Promise<string[]> {
    const memberships = await this.prisma.trainingBatchMember.findMany({
      where: { studentId },
      select: { batchId: true },
    });
    return memberships.map((m) => m.batchId);
  }

  // Full calendar feed: every session visible to this student (untargeted, or
  // targeting their programme/batch) plus their own attendance flag (null until
  // marked).
  async listForStudent(userId: string) {
    const { id: studentId, collegeId, programme } = await this.studentForUser(userId);
    const batchIds = await this.myBatchIds(studentId);
    const [sessions, attendance] = await Promise.all([
      this.prisma.trainingSession.findMany({
        where: { collegeId, ...visibilityFilter(programme, batchIds) },
        orderBy: { startsAt: 'asc' },
      }),
      this.prisma.trainingAttendance.findMany({ where: { studentId } }),
    ]);
    const byS = new Map(attendance.map((a) => [a.sessionId, a.present]));
    return sessions.map((s) => ({
      ...toPublic(s),
      myAttendance: byS.has(s.id) ? byS.get(s.id)! : null,
    }));
  }
}

const PRESENT_VALUES = new Set(['yes', 'y', 'true', '1', 'present']);
const ABSENT_VALUES = new Set(['no', 'n', 'false', '0', 'absent']);

function parsePresent(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (PRESENT_VALUES.has(v)) return true;
  if (ABSENT_VALUES.has(v)) return false;
  return null;
}

function parseCsvRows(text: string): Array<{ rollNumber: string; present: string }> {
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
      present: get('present', 'attendance', 'status'),
    };
  });
}

async function parseXlsxRows(buffer: Buffer): Promise<Array<{ rollNumber: string; present: string }>> {
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

  const rows: Array<{ rollNumber: string; present: string }> = [];
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
      present: get('present', 'attendance', 'status'),
    });
  }
  return rows;
}

/** Minimal RFC-4180-ish CSV parser (mirrors students.service.ts / assessments.service.ts). */
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
