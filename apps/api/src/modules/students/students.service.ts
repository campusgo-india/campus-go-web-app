import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PRISMA } from '../../common/prisma.module';
import { Prisma } from '@campusgo/database';
import type { PrismaClient } from '@campusgo/database';
import type { Prisma as PrismaTypes } from '@campusgo/database';
import type { ReportDataset } from '../reports/report-serializers';

// A student's "details" are complete when 10th, 12th and a degree % are on record.
const DETAILS_COMPLETE_WHERE: PrismaTypes.StudentWhereInput = {
  tenthPercentage: { not: null },
  twelfthPercentage: { not: null },
  OR: [{ cgpa: { not: null } }, { ugPercentage: { not: null } }],
};

function detailsStatus(s: {
  tenthPercentage: PrismaTypes.Decimal | null;
  twelfthPercentage: PrismaTypes.Decimal | null;
  cgpa: PrismaTypes.Decimal | null;
  ugPercentage: PrismaTypes.Decimal | null;
}): { complete: boolean; missing: string[] } {
  const missing: string[] = [];
  if (s.tenthPercentage == null) missing.push('10th %');
  if (s.twelfthPercentage == null) missing.push('12th %');
  if (s.cgpa == null && s.ugPercentage == null) missing.push('Degree %');
  return { complete: missing.length === 0, missing };
}
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateStudentDto,
  ImportStudentsDto,
  ListStudentsQuery,
  UpdateOwnProfileDto,
  UpdateStudentDto,
  VerifyStudentDto,
} from './dto';
import { computeProfileCompletion, type StepCompletion } from '@campusgo/shared';

// Every student is created with this shared default password so officers can
// hand it out in bulk (students change it later from their profile). Demo/V1
// convenience — a per-college policy can replace this when email is wired.
const DEFAULT_STUDENT_PASSWORD = 'password123';

interface Viewer {
  role: string;
  userId: string;
}

/**
 * Placement Officer student registry. All methods are tenant-scoped:
 * collegeId comes from the authenticated officer's JWT, never the request body.
 *
 * Registering a student creates BOTH a Student row and a linked User (role
 * STUDENT) with a temporary password and `mustChangePassword=true`. That linked
 * User is what activates student login — there is no public student signup.
 */
@Injectable()
export class StudentsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  // A Placement Coordinator only ever sees their assigned programmes (one or
  // more) — resolved fresh from the DB (not trusted from the JWT) so a
  // reassignment takes effect without requiring re-login. Returns null for
  // every other role (no restriction).
  private async programmeRestriction(viewer?: Viewer): Promise<string[] | null> {
    if (!viewer || viewer.role !== 'PLACEMENT_COORDINATOR') return null;
    const u = await this.prisma.user.findUnique({
      where: { id: viewer.userId },
      select: { assignedProgrammes: true },
    });
    if (!u?.assignedProgrammes.length) {
      throw new ForbiddenException('No programme assigned to this account yet');
    }
    return u.assignedProgrammes;
  }

  async create(collegeId: string, dto: CreateStudentDto) {
    await this.assertUnique(collegeId, dto.email, dto.rollNumber);

    const tempPassword = DEFAULT_STUDENT_PASSWORD;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const student = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          collegeId,
          email: dto.email,
          fullName: dto.fullName,
          role: 'STUDENT',
          phone: dto.phone,
          passwordHash,
          mustChangePassword: false,
        },
      });
      return tx.student.create({
        data: {
          collegeId,
          userId: user.id,
          rollNumber: dto.rollNumber,
          enrollmentNumber: dto.enrollmentNumber,
          school: dto.school,
          programme: dto.programme,
          graduationYear: dto.graduationYear,
          currentYear: dto.currentYear ?? null,
          cgpa: dto.cgpa != null ? new Prisma.Decimal(dto.cgpa) : null,
          activeBacklogs: dto.activeBacklogs ?? 0,
          totalBacklogs: dto.totalBacklogs ?? 0,
          gender: dto.gender,
          personalEmail: dto.personalEmail,
          linkedinUrl: dto.linkedinUrl,
          // Officer-registered students come from official college rolls — trust
          // them so they immediately see eligible jobs (no separate verify step).
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
          ...this.extendedData(dto),
        },
        include: { user: true },
      });
    });

    // Every student shares DEFAULT_STUDENT_PASSWORD; surfaced to the officer once.
    return { student: this.publicStudent(student), tempPassword };
  }

  /**
   * Bulk-register students from CSV text. To stay well under the platform's
   * request timeout (the old per-row create hashed bcrypt 55× and made dozens of
   * cloud round trips → 502s), this:
   *   1. validates every row up front (collecting per-row errors),
   *   2. pre-loads existing emails/roll numbers in two queries,
   *   3. hashes the shared default password ONCE, and
   *   4. inserts all users + students with two `createMany` calls.
   */
  async importCsv(collegeId: string, dto: ImportStudentsDto) {
    const rows = parseCsv(dto.csv);
    if (rows.length === 0) throw new BadRequestException('CSV has no data rows');

    const errors: Array<{ row: number; message: string }> = [];
    const parsed: Array<{ rowNum: number; dto: CreateStudentDto }> = [];
    for (let i = 0; i < rows.length; i++) {
      try {
        parsed.push({ rowNum: i + 2, dto: this.rowToDto(rows[i], dto) });
      } catch (err) {
        errors.push({ row: i + 2, message: errorMessage(err) });
      }
    }

    // Pre-load clashes in two queries instead of two per row.
    const emails = parsed.map((p) => p.dto.email);
    const rolls = parsed.map((p) => p.dto.rollNumber);
    const [emailRows, rollRows] = await Promise.all([
      this.prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true } }),
      this.prisma.student.findMany({
        where: { collegeId, rollNumber: { in: rolls } },
        select: { rollNumber: true },
      }),
    ]);
    const takenEmails = new Set(emailRows.map((r) => r.email.toLowerCase()));
    const takenRolls = new Set(rollRows.map((r) => r.rollNumber));
    const seenEmails = new Set<string>();
    const seenRolls = new Set<string>();

    const passwordHash = await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, 12);
    const userData: Prisma.UserCreateManyInput[] = [];
    const studentData: Prisma.StudentCreateManyInput[] = [];
    const created: Array<{
      rollNumber: string;
      fullName: string;
      email: string;
      tempPassword: string;
    }> = [];

    for (const { rowNum, dto: d } of parsed) {
      const emailKey = d.email.toLowerCase();
      if (takenEmails.has(emailKey) || seenEmails.has(emailKey)) {
        errors.push({ row: rowNum, message: `Email already in use: ${d.email}` });
        continue;
      }
      if (takenRolls.has(d.rollNumber) || seenRolls.has(d.rollNumber)) {
        errors.push({ row: rowNum, message: `Roll number already exists: ${d.rollNumber}` });
        continue;
      }
      seenEmails.add(emailKey);
      seenRolls.add(d.rollNumber);

      const userId = randomUUID();
      userData.push({
        id: userId,
        collegeId,
        email: d.email,
        fullName: d.fullName,
        role: 'STUDENT',
        phone: d.phone,
        passwordHash,
        mustChangePassword: false,
      });
      studentData.push({
        collegeId,
        userId,
        rollNumber: d.rollNumber,
        enrollmentNumber: d.enrollmentNumber,
        school: d.school,
        programme: d.programme,
        graduationYear: d.graduationYear,
        currentYear: d.currentYear ?? null,
        cgpa: d.cgpa != null ? new Prisma.Decimal(d.cgpa) : null,
        ugPercentage: d.ugPercentage != null ? new Prisma.Decimal(d.ugPercentage) : null,
        tenthPercentage: d.tenthPercentage != null ? new Prisma.Decimal(d.tenthPercentage) : null,
        twelfthPercentage:
          d.twelfthPercentage != null ? new Prisma.Decimal(d.twelfthPercentage) : null,
        activeBacklogs: d.activeBacklogs ?? 0,
        totalBacklogs: d.totalBacklogs ?? 0,
        gender: d.gender,
        personalEmail: d.personalEmail,
        // Imported from official rolls → trusted/verified so jobs reach them.
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
      });
      created.push({
        rollNumber: d.rollNumber,
        fullName: d.fullName,
        email: d.email,
        tempPassword: DEFAULT_STUDENT_PASSWORD,
      });
    }

    if (userData.length > 0) {
      await this.prisma.$transaction([
        this.prisma.user.createMany({ data: userData }),
        this.prisma.student.createMany({ data: studentData }),
      ]);
    }

    return { createdCount: created.length, errorCount: errors.length, created, errors };
  }

  /**
   * Graduate a whole batch: copy each student of `graduationYear` into the Alumni
   * directory (dedup by email) and disable their student logins (record kept).
   * The new incoming batch is then just a normal CSV import.
   */
  async graduateBatch(collegeId: string, graduationYear: number) {
    const students = await this.prisma.student.findMany({
      where: { collegeId, graduationYear },
      include: { user: { select: { fullName: true, email: true } } },
    });
    if (students.length === 0) {
      throw new BadRequestException(`No students found in the ${graduationYear} batch`);
    }

    // Skip anyone already in the alumni directory (unique per college+email).
    const existing = await this.prisma.alumni.findMany({
      where: { collegeId, email: { in: students.map((s) => s.user.email) } },
      select: { email: true },
    });
    const taken = new Set(existing.map((a) => a.email.toLowerCase()));

    const alumniData = students
      .filter((s) => !taken.has(s.user.email.toLowerCase()))
      .map((s) => ({
        collegeId,
        fullName: s.user.fullName,
        email: s.user.email,
        registerNumber: s.rollNumber,
        graduationYear: s.graduationYear,
        school: s.school,
        programme: s.programme,
        tags: [],
        selfRegistered: false,
        isApproved: true,
      }));

    const [alumniResult] = await this.prisma.$transaction([
      this.prisma.alumni.createMany({ data: alumniData, skipDuplicates: true }),
      // Disable logins + deactivate the student rows (history retained).
      this.prisma.user.updateMany({
        where: { id: { in: students.map((s) => s.userId) } },
        data: { isActive: false },
      }),
      this.prisma.student.updateMany({
        where: { id: { in: students.map((s) => s.id) } },
        data: { isActive: false, graduatedAt: new Date() },
      }),
    ]);

    return {
      graduationYear,
      studentsGraduated: students.length,
      alumniCreated: alumniResult.count,
      alreadyAlumni: students.length - alumniData.length,
    };
  }

  async list(collegeId: string, q: ListStudentsQuery, viewer?: Viewer) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 25;
    const programmeRestriction = await this.programmeRestriction(viewer);

    const loginWhere: Prisma.StudentWhereInput =
      q.loginStatus === 'logged_in'
        ? { user: { lastLoginAt: { not: null } } }
        : q.loginStatus === 'never'
          ? { isActive: true, user: { lastLoginAt: null } }
          : q.loginStatus === 'disabled'
            ? { isActive: false }
            : {};

    const resumeWhere: Prisma.StudentWhereInput =
      q.resumeComplete === undefined
        ? {}
        : q.resumeComplete
          ? { resume: { isNot: null } }
          : { resume: { is: null } };

    const where: Prisma.StudentWhereInput = {
      collegeId,
      // Graduated students live in the Alumni directory — hide them here.
      graduatedAt: null,
      // A Placement Coordinator's programmes override whatever the query asked for.
      ...(programmeRestriction
        ? { programme: { in: programmeRestriction } }
        : q.programme
          ? { programme: q.programme }
          : {}),
      ...(q.school ? { school: q.school } : {}),
      ...(q.graduationYear ? { graduationYear: q.graduationYear } : {}),
      ...(q.verificationStatus ? { verificationStatus: q.verificationStatus } : {}),
      ...(q.active !== undefined ? { isActive: q.active } : {}),
      ...loginWhere,
      ...resumeWhere,
      ...(q.search
        ? {
            OR: [
              { rollNumber: { contains: q.search, mode: 'insensitive' } },
              { user: { fullName: { contains: q.search, mode: 'insensitive' } } },
              { user: { email: { contains: q.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    // "Details complete" = 10th, 12th and a degree % all on record. AND-wrapped so
    // the extra conditions compose with the search OR without clobbering it.
    const listWhere =
      q.detailsComplete === undefined
        ? where
        : {
            AND: [
              where,
              q.detailsComplete ? DETAILS_COMPLETE_WHERE : { NOT: DETAILS_COMPLETE_WHERE },
            ],
          };

    const [total, students, detailsCompleteCount] = await this.prisma.$transaction([
      this.prisma.student.count({ where: listWhere }),
      this.prisma.student.findMany({
        where: listWhere,
        include: { user: true, resume: { select: { fileUrl: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      // Batch-wide complete count (uses the base where, ignoring the details filter).
      this.prisma.student.count({ where: { AND: [where, DETAILS_COMPLETE_WHERE] } }),
    ]);

    return {
      items: students.map((s) => {
        const { complete, missing } = detailsStatus(s);
        return { ...this.publicStudent(s), detailsComplete: complete, detailsMissing: missing };
      }),
      meta: { total, page, limit, pages: Math.ceil(total / limit), detailsCompleteCount },
    };
  }

  /**
   * Full active roster, one ReportDataset per programme, for a multi-sheet
   * XLSX — includes a résumé link per student, unlike the generic Reports
   * "students" export.
   */
  async exportByProgramme(collegeId: string): Promise<ReportDataset[]> {
    const students = await this.prisma.student.findMany({
      where: { collegeId, graduatedAt: null },
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        resume: { select: { publicSlug: true, isPublished: true } },
      },
      orderBy: [{ programme: 'asc' }, { rollNumber: 'asc' }],
    });

    const webOrigin = this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
    // Every field the student step-form wizard collects (packages/shared/src/profile.ts
    // PROFILE_STEPS), not just the core registration set — "download everything
    // the student filled in", not a curated subset.
    const columns = [
      { key: 'rollNumber', label: 'Reg No' },
      { key: 'fullName', label: 'Name' },
      { key: 'email', label: 'Institute Email' },
      { key: 'personalEmail', label: 'Personal Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'school', label: 'School/Department' },
      { key: 'programme', label: 'Programme' },
      { key: 'graduationYear', label: 'Graduation Year' },
      { key: 'cgpa', label: 'CGPA' },
      { key: 'activeBacklogs', label: 'Active Backlogs' },
      { key: 'totalBacklogs', label: 'Total Backlogs' },
      { key: 'verificationStatus', label: 'Verification' },
      { key: 'profileCompletion', label: 'Profile %' },
      { key: 'resumeLink', label: 'Resume link' },
      // Personal
      { key: 'gender', label: 'Gender' },
      { key: 'dateOfBirth', label: 'Date of Birth' },
      { key: 'nationality', label: 'Nationality' },
      { key: 'panNumber', label: 'PAN Number' },
      { key: 'linkedinUrl', label: 'LinkedIn URL' },
      // Address & family
      { key: 'currentAddress', label: 'Current Address' },
      { key: 'permanentAddress', label: 'Permanent Address' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'pinCode', label: 'PIN Code' },
      { key: 'fatherName', label: "Father's Name" },
      { key: 'fatherOccupation', label: "Father's Occupation" },
      { key: 'fatherPhone', label: "Father's Phone" },
      // Academic
      { key: 'department', label: 'Department' },
      { key: 'specialization', label: 'Specialization' },
      { key: 'admissionYear', label: 'Admission Year' },
      { key: 'currentSemester', label: 'Current Semester' },
      { key: 'hasArrearHistory', label: 'Arrear History' },
      { key: 'semesterMarks', label: 'Semester Marks' },
      // Education history
      { key: 'tenthBoard', label: '10th Board' },
      { key: 'tenthSchool', label: '10th School' },
      { key: 'tenthPassingYear', label: '10th Passing Year' },
      { key: 'tenthPercentage', label: '10th %' },
      { key: 'twelfthBoard', label: '12th Board' },
      { key: 'twelfthSchool', label: '12th School' },
      { key: 'twelfthStream', label: '12th Stream' },
      { key: 'twelfthPassingYear', label: '12th Passing Year' },
      { key: 'twelfthPercentage', label: '12th %' },
      { key: 'ugCollege', label: 'UG College' },
      { key: 'ugDegree', label: 'UG Degree' },
      { key: 'ugSpecialization', label: 'UG Specialization' },
      { key: 'ugPercentage', label: 'UG %' },
      // Skills & preferences
      { key: 'languagesKnown', label: 'Languages Known' },
      { key: 'communicationSkillRating', label: 'Communication Rating (English) (1-5)' },
      { key: 'higherStudiesPlanned', label: 'Higher Studies Planned' },
      { key: 'entrepreneurshipInterest', label: 'Entrepreneurship Interest' },
    ];

    const yesNo = (v: boolean | null) => (v == null ? '' : v ? 'Yes' : 'No');
    const dec = (v: Prisma.Decimal | null) => (v != null ? Number(v) : '');
    const date = (v: Date | null) => (v ? v.toISOString().slice(0, 10) : '');

    const byProgramme = new Map<string, Record<string, unknown>[]>();
    for (const s of students) {
      const row = {
        rollNumber: s.rollNumber,
        fullName: s.user.fullName,
        email: s.user.email,
        personalEmail: s.personalEmail ?? '',
        phone: s.user.phone ?? '',
        school: s.school,
        programme: s.programme,
        graduationYear: s.graduationYear,
        cgpa: dec(s.cgpa),
        activeBacklogs: s.activeBacklogs,
        totalBacklogs: s.totalBacklogs,
        verificationStatus: s.verificationStatus,
        profileCompletion: s.profileCompletion,
        resumeLink: s.resume?.isPublished ? `${webOrigin}/r/${s.resume.publicSlug}` : '',
        gender: s.gender ?? '',
        dateOfBirth: date(s.dateOfBirth),
        nationality: s.nationality ?? '',
        panNumber: s.panNumber ?? '',
        linkedinUrl: s.linkedinUrl ?? '',
        currentAddress: s.currentAddress ?? '',
        permanentAddress: s.permanentAddress ?? '',
        city: s.city ?? '',
        state: s.state ?? '',
        pinCode: s.pinCode ?? '',
        fatherName: s.fatherName ?? '',
        fatherOccupation: s.fatherOccupation ?? '',
        fatherPhone: s.fatherPhone ?? '',
        department: s.department ?? '',
        specialization: s.specialization ?? '',
        admissionYear: s.admissionYear ?? '',
        currentSemester: s.currentSemester ?? '',
        hasArrearHistory: yesNo(s.hasArrearHistory),
        semesterMarks: s.semesterMarks ? JSON.stringify(s.semesterMarks) : '',
        tenthBoard: s.tenthBoard ?? '',
        tenthSchool: s.tenthSchool ?? '',
        tenthPassingYear: s.tenthPassingYear ?? '',
        tenthPercentage: dec(s.tenthPercentage),
        twelfthBoard: s.twelfthBoard ?? '',
        twelfthSchool: s.twelfthSchool ?? '',
        twelfthStream: s.twelfthStream ?? '',
        twelfthPassingYear: s.twelfthPassingYear ?? '',
        twelfthPercentage: dec(s.twelfthPercentage),
        ugCollege: s.ugCollege ?? '',
        ugDegree: s.ugDegree ?? '',
        ugSpecialization: s.ugSpecialization ?? '',
        ugPercentage: dec(s.ugPercentage),
        languagesKnown: s.languagesKnown ?? '',
        communicationSkillRating: s.communicationSkillRating ?? '',
        higherStudiesPlanned: yesNo(s.higherStudiesPlanned),
        entrepreneurshipInterest: yesNo(s.entrepreneurshipInterest),
      };
      const bucket = byProgramme.get(s.programme) ?? [];
      bucket.push(row);
      byProgramme.set(s.programme, bucket);
    }

    return [...byProgramme.entries()].map(([programme, rows]) => ({
      filename: `students-${programme}`,
      title: programme,
      columns,
      rows,
    }));
  }

  // Batch cards for the officer's students screen: one entry per (passout year,
  // school), with how many have logged in and how many have complete details.
  async batches(collegeId: string) {
    const rows = await this.prisma.student.findMany({
      where: { collegeId, graduatedAt: null },
      select: {
        school: true,
        graduationYear: true,
        tenthPercentage: true,
        twelfthPercentage: true,
        cgpa: true,
        ugPercentage: true,
        user: { select: { lastLoginAt: true } },
      },
    });

    const map = new Map<
      string,
      {
        school: string;
        graduationYear: number;
        count: number;
        loggedIn: number;
        detailsComplete: number;
      }
    >();
    for (const s of rows) {
      const key = `${s.graduationYear}|${s.school}`;
      let b = map.get(key);
      if (!b) {
        b = {
          school: s.school,
          graduationYear: s.graduationYear,
          count: 0,
          loggedIn: 0,
          detailsComplete: 0,
        };
        map.set(key, b);
      }
      b.count++;
      if (s.user.lastLoginAt) b.loggedIn++;
      if (detailsStatus(s).complete) b.detailsComplete++;
    }
    // Newest passout first, then school alphabetically.
    return [...map.values()].sort(
      (a, b) => b.graduationYear - a.graduationYear || a.school.localeCompare(b.school),
    );
  }

  async findOne(collegeId: string, id: string, viewer?: Viewer) {
    const student = await this.prisma.student.findFirst({
      where: { id, collegeId },
      include: { user: true, resume: { select: { fileUrl: true } } },
    });
    if (!student) throw new NotFoundException('Student not found');
    const programmeRestriction = await this.programmeRestriction(viewer);
    // A Coordinator asking for a student outside their programmes gets the
    // same "not found" as a genuinely missing id — no confirming who else exists.
    if (programmeRestriction && !programmeRestriction.includes(student.programme)) {
      throw new NotFoundException('Student not found');
    }
    return this.publicStudent(student);
  }

  async update(collegeId: string, id: string, dto: UpdateStudentDto) {
    await this.findOne(collegeId, id);
    const {
      fullName,
      phone,
      cgpa,
      dateOfBirth,
      tenthPercentage,
      twelfthPercentage,
      ugPercentage,
      semesterMarks,
      ...studentFields
    } = dto;

    const student = await this.prisma.$transaction(async (tx) => {
      if (fullName !== undefined || phone !== undefined) {
        const existing = await tx.student.findUniqueOrThrow({ where: { id } });
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            ...(fullName !== undefined ? { fullName } : {}),
            ...(phone !== undefined ? { phone } : {}),
          },
        });
      }
      return tx.student.update({
        where: { id },
        data: {
          ...studentFields,
          ...(cgpa !== undefined ? { cgpa: cgpa != null ? new Prisma.Decimal(cgpa) : null } : {}),
          ...this.extendedData({
            dateOfBirth,
            tenthPercentage,
            twelfthPercentage,
            ugPercentage,
            semesterMarks,
          }),
        },
        include: { user: true },
      });
    });

    return this.publicStudent(student);
  }

  /** Toggle login access. Deactivating also revokes the student's sessions. */
  async setActive(collegeId: string, id: string, isActive: boolean) {
    const student = await this.prisma.student.findFirst({ where: { id, collegeId } });
    if (!student) throw new NotFoundException('Student not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.student.update({ where: { id }, data: { isActive } });
      await tx.user.update({ where: { id: student.userId }, data: { isActive } });
      if (!isActive) {
        await tx.refreshToken.updateMany({
          where: { userId: student.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    });

    return { success: true, isActive };
  }

  // ─────────────── Placement Officer verification ───────────────

  // Verify (→ VERIFIED) or reject (→ REJECTED + reason) a student's profile.
  async verify(collegeId: string, id: string, verifierId: string, dto: VerifyStudentDto) {
    const student = await this.prisma.student.findFirst({ where: { id, collegeId } });
    if (!student) throw new NotFoundException('Student not found');

    const data: Prisma.StudentUpdateInput =
      dto.action === 'verify'
        ? {
            verificationStatus: 'VERIFIED',
            verifiedById: verifierId,
            verifiedAt: new Date(),
            rejectionReason: null,
          }
        : {
            verificationStatus: 'REJECTED',
            rejectionReason: dto.reason ?? null,
            verifiedById: verifierId,
            verifiedAt: null,
          };

    const updated = await this.prisma.student.update({
      where: { id },
      data,
      include: { user: true },
    });

    // Notify the student of the verification outcome.
    if (dto.action === 'verify') {
      await this.notifications.notify({
        userId: updated.userId,
        collegeId,
        type: 'PROFILE_VERIFIED',
        title: 'Profile verified',
        body: 'Your profile has been verified. You can now apply to eligible jobs.',
        link: '/me/profile',
      });
    } else {
      await this.notifications.notify({
        userId: updated.userId,
        collegeId,
        type: 'PROFILE_REJECTED',
        title: 'Profile needs changes',
        body: dto.reason
          ? `Your profile was sent back: ${dto.reason}`
          : 'Your profile needs changes before it can be verified.',
        link: '/me/profile',
      });
    }

    return this.publicStudent(updated);
  }

  // ─────────────── Student self-service (resolved from JWT) ───────────────

  async getOwn(userId: string) {
    return this.publicStudent(await this.ownStudent(userId));
  }

  // Students edit their own academic/profile fields (never rollNumber, which is
  // the officer-assigned identity). Students are admin-created and trusted (there
  // is no self-signup), so editing does NOT drop them out of VERIFIED — otherwise
  // every profile edit would silently hide all eligible jobs from them.
  async updateOwnProfile(userId: string, dto: UpdateOwnProfileDto) {
    const student = await this.ownStudent(userId);
    const {
      fullName,
      phone,
      cgpa,
      dateOfBirth,
      tenthPercentage,
      twelfthPercentage,
      ugPercentage,
      semesterMarks,
      ...academic
    } = dto;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (fullName !== undefined || phone !== undefined) {
        await tx.user.update({
          where: { id: student.userId },
          data: {
            ...(fullName !== undefined ? { fullName } : {}),
            ...(phone !== undefined ? { phone } : {}),
          },
        });
      }
      const next = await tx.student.update({
        where: { id: student.id },
        data: {
          ...academic,
          ...(cgpa !== undefined ? { cgpa: cgpa != null ? new Prisma.Decimal(cgpa) : null } : {}),
          ...this.extendedData({
            dateOfBirth,
            tenthPercentage,
            twelfthPercentage,
            ugPercentage,
            semesterMarks,
          }),
        },
        include: { user: true, resume: { select: { fileUrl: true } } },
      });
      const { overall: completion } = computeCompletion(next);
      if (completion !== next.profileCompletion) {
        return tx.student.update({
          where: { id: student.id },
          data: { profileCompletion: completion },
          include: { user: true, resume: { select: { fileUrl: true } } },
        });
      }
      return next;
    });

    return this.publicStudent(updated);
  }

  // Submit the profile for officer review. Allowed from PENDING/REJECTED only.
  async submitOwn(userId: string) {
    const student = await this.ownStudent(userId);
    if (student.verificationStatus === 'SUBMITTED') {
      throw new BadRequestException('Profile already submitted and awaiting review');
    }
    if (student.verificationStatus === 'VERIFIED') {
      throw new BadRequestException('Profile is already verified');
    }
    const updated = await this.prisma.student.update({
      where: { id: student.id },
      data: { verificationStatus: 'SUBMITTED', rejectionReason: null },
      include: { user: true, resume: { select: { fileUrl: true } } },
    });

    // Alert the college's officers that a profile is awaiting review.
    await this.notifications.notifyOfficers(student.collegeId, {
      type: 'PROFILE_SUBMITTED',
      title: 'Profile submitted for review',
      body: `${updated.user.fullName} (${updated.rollNumber}) submitted their profile for verification.`,
      link: `/students/${updated.id}`,
    });

    return this.publicStudent(updated);
  }

  // One-time opt-in for the current placement cycle — separate from profile
  // verification, feeds the Placement Progress funnel's "Registered" stage.
  async setPlacementRegistration(userId: string, registered: boolean) {
    const student = await this.ownStudent(userId);
    const updated = await this.prisma.student.update({
      where: { id: student.id },
      data: { registeredForPlacements: registered },
      include: { user: true, resume: { select: { fileUrl: true } } },
    });
    return this.publicStudent(updated);
  }

  private async ownStudent(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: { user: true, resume: { select: { fileUrl: true } } },
    });
    if (!student) throw new ForbiddenException('No student profile for this account');
    return student;
  }

  private async assertUnique(collegeId: string, email: string, rollNumber: string) {
    const emailTaken = await this.prisma.user.findUnique({ where: { email } });
    if (emailTaken) throw new BadRequestException(`Email already in use: ${email}`);
    const rollTaken = await this.prisma.student.findFirst({
      where: { collegeId, rollNumber },
    });
    if (rollTaken) throw new BadRequestException(`Roll number already exists: ${rollNumber}`);
  }

  // Maps one CSV row to a CreateStudentDto. The per-row CSV only carries the
  // identity columns (reg no / name / email); school, programme, passout year
  // and current year come from the batch defaults set on the import form. A
  // row may still override any of those by including the column. Accepts
  // both the current "school"/"programme" headers and the old "course"/
  // "branch" headers, so nominal rolls colleges already have on file keep working.
  private rowToDto(row: Record<string, string>, defaults: ImportStudentsDto): CreateStudentDto {
    const get = (k: string) => (row[k] ?? '').trim();
    // Accept friendly aliases: "regno"/"registrationnumber" → rollNumber, "name" → fullName.
    const first = (...keys: string[]) => {
      for (const k of keys) {
        const v = get(k);
        if (v !== '') return v;
      }
      return '';
    };
    const num = (k: string, label: string): number | undefined => {
      const v = get(k);
      if (v === '') return undefined;
      const n = Number(v);
      if (Number.isNaN(n)) throw new BadRequestException(`Invalid number for ${label}: ${v}`);
      return n;
    };

    const email = first('email', 'mailid', 'mail');
    if (email === '') throw new BadRequestException('email is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException(`Invalid email: ${email}`);
    }
    const fullName = first('fullname', 'name');
    if (fullName === '') throw new BadRequestException('name is required');
    const rollNumber = first('rollnumber', 'regno', 'registrationnumber', 'regno.');
    if (rollNumber === '') throw new BadRequestException('reg no is required');

    const school = first('school', 'course') || (defaults.school ?? '').trim();
    if (school === '') throw new BadRequestException('school is required (set it on the form)');
    const programme = first('programme', 'program', 'branch') || (defaults.programme ?? '').trim() || school;
    const gradYear = num('graduationyear', 'graduationYear') ?? defaults.graduationYear;
    if (gradYear == null)
      throw new BadRequestException('passout year is required (set it on the form)');
    const currentYear = num('currentyear', 'currentYear') ?? defaults.currentYear;

    return {
      fullName,
      email,
      rollNumber,
      school,
      programme,
      graduationYear: gradYear,
      currentYear,
      enrollmentNumber: get('enrollmentnumber') || undefined,
      phone: get('phone') || undefined,
      cgpa: num('cgpa', 'cgpa'),
      ugPercentage: num('ugpercentage', 'ugPercentage'),
      tenthPercentage: num('tenthpercentage', 'tenthPercentage'),
      twelfthPercentage: num('twelfthpercentage', 'twelfthPercentage'),
      activeBacklogs: num('activebacklogs', 'activeBacklogs'),
      totalBacklogs: num('totalbacklogs', 'totalBacklogs'),
    };
  }

  // Builds the prisma write data for the extended profile fields that need
  // conversion (DOB string→Date, percentages→Decimal, semester marks→Json).
  private extendedData(d: {
    dateOfBirth?: string;
    tenthPercentage?: number;
    twelfthPercentage?: number;
    ugPercentage?: number;
    semesterMarks?: { label: string; score: string }[];
  }) {
    return {
      ...(d.dateOfBirth !== undefined
        ? { dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null }
        : {}),
      ...(d.tenthPercentage !== undefined
        ? {
            tenthPercentage:
              d.tenthPercentage != null ? new Prisma.Decimal(d.tenthPercentage) : null,
          }
        : {}),
      ...(d.twelfthPercentage !== undefined
        ? {
            twelfthPercentage:
              d.twelfthPercentage != null ? new Prisma.Decimal(d.twelfthPercentage) : null,
          }
        : {}),
      ...(d.ugPercentage !== undefined
        ? { ugPercentage: d.ugPercentage != null ? new Prisma.Decimal(d.ugPercentage) : null }
        : {}),
      ...(d.semesterMarks !== undefined
        ? { semesterMarks: d.semesterMarks as unknown as Prisma.InputJsonValue }
        : {}),
    };
  }

  private publicStudent(s: {
    id: string;
    rollNumber: string;
    enrollmentNumber: string | null;
    school: string;
    programme: string;
    graduationYear: number;
    currentYear: number | null;
    cgpa: Prisma.Decimal | null;
    activeBacklogs: number;
    totalBacklogs: number;
    dateOfBirth: Date | null;
    gender: string | null;
    hasDisability: boolean | null;
    disabilityDetails: string | null;
    personalEmail: string | null;
    linkedinUrl: string | null;
    tenthPercentage: Prisma.Decimal | null;
    twelfthPercentage: Prisma.Decimal | null;
    ugPercentage: Prisma.Decimal | null;
    semesterMarks: Prisma.JsonValue;
    nationality: string | null;
    panNumber: string | null;
    currentAddress: string | null;
    permanentAddress: string | null;
    city: string | null;
    state: string | null;
    pinCode: string | null;
    fatherName: string | null;
    fatherOccupation: string | null;
    fatherPhone: string | null;
    department: string | null;
    specialization: string | null;
    admissionYear: number | null;
    currentSemester: number | null;
    hasArrearHistory: boolean | null;
    tenthBoard: string | null;
    tenthSchool: string | null;
    tenthPassingYear: number | null;
    twelfthBoard: string | null;
    twelfthSchool: string | null;
    twelfthStream: string | null;
    twelfthPassingYear: number | null;
    ugCollege: string | null;
    ugDegree: string | null;
    ugSpecialization: string | null;
    languagesKnown: string | null;
    communicationSkillRating: number | null;
    higherStudiesPlanned: boolean | null;
    entrepreneurshipInterest: boolean | null;
    registeredForPlacements: boolean;
    verificationStatus: string;
    verifiedAt: Date | null;
    rejectionReason: string | null;
    profileCompletion: number;
    isActive: boolean;
    createdAt: Date;
    user: {
      id: string;
      email: string;
      fullName: string;
      phone: string | null;
      isActive: boolean;
      lastLoginAt: Date | null;
    };
    resume?: { fileUrl: string } | null;
  }) {
    const { overall: profileCompletion, steps: profileSteps } = computeCompletion(s);
    return {
      id: s.id,
      rollNumber: s.rollNumber,
      enrollmentNumber: s.enrollmentNumber,
      school: s.school,
      programme: s.programme,
      graduationYear: s.graduationYear,
      currentYear: s.currentYear,
      cgpa: s.cgpa != null ? Number(s.cgpa) : null,
      activeBacklogs: s.activeBacklogs,
      totalBacklogs: s.totalBacklogs,
      dateOfBirth: s.dateOfBirth,
      gender: s.gender,
      hasDisability: s.hasDisability,
      disabilityDetails: s.disabilityDetails,
      personalEmail: s.personalEmail,
      linkedinUrl: s.linkedinUrl,
      tenthPercentage: s.tenthPercentage != null ? Number(s.tenthPercentage) : null,
      twelfthPercentage: s.twelfthPercentage != null ? Number(s.twelfthPercentage) : null,
      ugPercentage: s.ugPercentage != null ? Number(s.ugPercentage) : null,
      semesterMarks: s.semesterMarks,
      nationality: s.nationality,
      panNumber: s.panNumber,
      currentAddress: s.currentAddress,
      permanentAddress: s.permanentAddress,
      city: s.city,
      state: s.state,
      pinCode: s.pinCode,
      fatherName: s.fatherName,
      fatherOccupation: s.fatherOccupation,
      fatherPhone: s.fatherPhone,
      department: s.department,
      specialization: s.specialization,
      admissionYear: s.admissionYear,
      currentSemester: s.currentSemester,
      hasArrearHistory: s.hasArrearHistory,
      tenthBoard: s.tenthBoard,
      tenthSchool: s.tenthSchool,
      tenthPassingYear: s.tenthPassingYear,
      twelfthBoard: s.twelfthBoard,
      twelfthSchool: s.twelfthSchool,
      twelfthStream: s.twelfthStream,
      twelfthPassingYear: s.twelfthPassingYear,
      ugCollege: s.ugCollege,
      ugDegree: s.ugDegree,
      ugSpecialization: s.ugSpecialization,
      languagesKnown: s.languagesKnown,
      communicationSkillRating: s.communicationSkillRating,
      higherStudiesPlanned: s.higherStudiesPlanned,
      entrepreneurshipInterest: s.entrepreneurshipInterest,
      registeredForPlacements: s.registeredForPlacements,
      verificationStatus: s.verificationStatus,
      verifiedAt: s.verifiedAt,
      rejectionReason: s.rejectionReason,
      profileCompletion,
      profileSteps,
      isActive: s.isActive,
      createdAt: s.createdAt,
      resumeComplete: !!s.resume?.fileUrl,
      user: {
        id: s.user.id,
        email: s.user.email,
        fullName: s.user.fullName,
        phone: s.user.phone,
        isActive: s.user.isActive,
        lastLoginAt: s.user.lastLoginAt,
      },
    };
  }
}

// Profile-completion checklist (0–100). Mirrors the student step-form wizard
// fields in packages/shared/src/profile.ts.
function computeCompletion(s: {
  user: { fullName: string; phone: string | null };
  personalEmail: string | null;
  gender: string | null;
  hasDisability: boolean | null;
  dateOfBirth: Date | null;
  nationality: string | null;
  panNumber: string | null;
  linkedinUrl: string | null;
  currentAddress: string | null;
  permanentAddress: string | null;
  city: string | null;
  state: string | null;
  pinCode: string | null;
  fatherName: string | null;
  fatherOccupation: string | null;
  fatherPhone: string | null;
  school: string;
  programme: string;
  department: string | null;
  specialization: string | null;
  admissionYear: number | null;
  graduationYear: number;
  currentSemester: number | null;
  cgpa: Prisma.Decimal | null;
  activeBacklogs: number;
  totalBacklogs: number;
  hasArrearHistory: boolean | null;
  tenthBoard: string | null;
  tenthSchool: string | null;
  tenthPassingYear: number | null;
  tenthPercentage: Prisma.Decimal | null;
  twelfthBoard: string | null;
  twelfthSchool: string | null;
  twelfthStream: string | null;
  twelfthPassingYear: number | null;
  twelfthPercentage: Prisma.Decimal | null;
  ugCollege: string | null;
  ugDegree: string | null;
  ugSpecialization: string | null;
  ugPercentage: Prisma.Decimal | null;
  languagesKnown: string | null;
  communicationSkillRating: number | null;
  higherStudiesPlanned: boolean | null;
  entrepreneurshipInterest: boolean | null;
}): { overall: number; steps: StepCompletion[] } {
  const profile: Record<string, unknown> = {
    fullName: s.user.fullName,
    phone: s.user.phone,
    personalEmail: s.personalEmail,
    gender: s.gender,
    hasDisability: s.hasDisability,
    dateOfBirth: s.dateOfBirth ? s.dateOfBirth.toISOString().slice(0, 10) : null,
    nationality: s.nationality,
    panNumber: s.panNumber,
    linkedinUrl: s.linkedinUrl,
    currentAddress: s.currentAddress,
    permanentAddress: s.permanentAddress,
    city: s.city,
    state: s.state,
    pinCode: s.pinCode,
    fatherName: s.fatherName,
    fatherOccupation: s.fatherOccupation,
    fatherPhone: s.fatherPhone,
    school: s.school,
    programme: s.programme,
    department: s.department,
    specialization: s.specialization,
    admissionYear: s.admissionYear,
    graduationYear: s.graduationYear,
    currentSemester: s.currentSemester,
    cgpa: s.cgpa != null ? Number(s.cgpa) : null,
    activeBacklogs: s.activeBacklogs,
    totalBacklogs: s.totalBacklogs,
    hasArrearHistory: s.hasArrearHistory,
    tenthBoard: s.tenthBoard,
    tenthSchool: s.tenthSchool,
    tenthPassingYear: s.tenthPassingYear,
    tenthPercentage: s.tenthPercentage != null ? Number(s.tenthPercentage) : null,
    twelfthBoard: s.twelfthBoard,
    twelfthSchool: s.twelfthSchool,
    twelfthStream: s.twelfthStream,
    twelfthPassingYear: s.twelfthPassingYear,
    twelfthPercentage: s.twelfthPercentage != null ? Number(s.twelfthPercentage) : null,
    ugCollege: s.ugCollege,
    ugDegree: s.ugDegree,
    ugSpecialization: s.ugSpecialization,
    ugPercentage: s.ugPercentage != null ? Number(s.ugPercentage) : null,
    languagesKnown: s.languagesKnown,
    communicationSkillRating: s.communicationSkillRating,
    higherStudiesPlanned: s.higherStudiesPlanned,
    entrepreneurshipInterest: s.entrepreneurshipInterest,
  };
  return computeProfileCompletion(profile);
}

/** Minimal RFC-4180-ish CSV parser: handles quoted fields, commas, and CRLF. */
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
  // trailing field/record (file may not end with newline)
  if (field !== '' || record.length > 0) pushRecord();

  // drop fully-empty records
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

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
