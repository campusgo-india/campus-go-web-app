import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient, TrainingPillar } from '@campusgo/database';
import { visibilityFilter } from './sessions.service';

const PILLARS: TrainingPillar[] = [
  'APTITUDE_REASONING',
  'TECHNICAL_TOOLS',
  'SOFT_SKILLS_COMMUNICATION',
  'CAREER_READINESS',
];

const PILLAR_LABEL: Record<TrainingPillar, string> = {
  APTITUDE_REASONING: 'Aptitude & Reasoning',
  TECHNICAL_TOOLS: 'Technical & Tools',
  SOFT_SKILLS_COMMUNICATION: 'Soft Skills & Communication',
  CAREER_READINESS: 'Career Readiness',
};

export type EmployabilityTier = 'TIER_1' | 'TIER_2' | 'TIER_3';

// Thresholds for the private, informational tier badge on the student
// dashboard (Tier 1 ≥80%, Tier 2 65–79%, Tier 3 <65%). This is a status tag
// only — it never gates job eligibility, which each Job decides independently
// via its own criteria.
const TIER_1_MIN = 80;
const TIER_2_MIN = 65;

function tierFor(readinessIndex: number): EmployabilityTier {
  if (readinessIndex >= TIER_1_MIN) return 'TIER_1';
  if (readinessIndex >= TIER_2_MIN) return 'TIER_2';
  return 'TIER_3';
}

interface PillarScoreRow {
  marksObtained: number;
  pillar: TrainingPillar;
  maxMarks: number;
}

interface ScoredPillar {
  pillar: TrainingPillar;
  label: string;
  percentage: number;
}

/**
 * Pure: pillar-by-pillar % + equal-weighted readiness index from one
 * student's raw score rows. Shared by the self dashboard and the department
 * cohort ranking below so both use exactly the same formula. A pillar with
 * no scores yet is excluded from the average rather than counted as 0.
 */
function computeReadiness(rows: PillarScoreRow[]) {
  const byPillar = new Map<TrainingPillar, number[]>();
  for (const r of rows) {
    if (r.maxMarks <= 0) continue;
    const pct = (r.marksObtained / r.maxMarks) * 100;
    const list = byPillar.get(r.pillar) ?? [];
    list.push(pct);
    byPillar.set(r.pillar, list);
  }

  const pillars = PILLARS.map((pillar) => {
    const list = byPillar.get(pillar);
    const percentage =
      list && list.length > 0 ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : null;
    return { pillar, label: PILLAR_LABEL[pillar], percentage };
  });

  const scoredPillars = pillars.filter((p): p is ScoredPillar => p.percentage != null);
  const readinessIndex = scoredPillars.length
    ? Math.round(scoredPillars.reduce((a, p) => a + p.percentage, 0) / scoredPillars.length)
    : 0;

  return { pillars, readinessIndex, scoredPillars };
}

interface Viewer {
  role: string;
  userId: string;
}

@Injectable()
export class TrainingDashboardService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  // A Placement Coordinator only ever sees their assigned programmes — same
  // pattern as students.service.ts/applications.service.ts/rounds.service.ts.
  // Resolved fresh from the DB on every call so a reassignment takes effect
  // without requiring re-login. Returns null (no restriction) for every other
  // role.
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

  // Officer/admin (and programme-scoped coordinator) cohort-wide view: pre vs
  // post-test pillar averages, the readiness-tier distribution, and attendance
  // — everything the training team needs to spot who's falling behind, in one
  // call. A Coordinator only ever sees students in their assigned programmes.
  async getForOfficer(collegeId: string, viewer?: Viewer) {
    const programmeRestriction = await this.programmeRestriction(viewer);
    const studentWhere = {
      collegeId,
      graduatedAt: null,
      ...(programmeRestriction ? { programme: { in: programmeRestriction } } : {}),
    };
    const students = await this.prisma.student.findMany({
      where: studentWhere,
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);

    const [scores, attendance, sessions, assessments] = await Promise.all([
      this.prisma.assessmentScore.findMany({
        where: { studentId: { in: studentIds } },
        select: {
          studentId: true,
          marksObtained: true,
          assessmentId: true,
          assessment: { select: { pillar: true, maxMarks: true, phase: true } },
        },
      }),
      this.prisma.trainingAttendance.findMany({
        where: { studentId: { in: studentIds } },
        select: { present: true, sessionId: true },
      }),
      this.prisma.trainingSession.findMany({
        where: { collegeId },
        orderBy: { startsAt: 'desc' },
        take: 20,
        select: { id: true, title: true, startsAt: true, status: true },
      }),
      this.prisma.assessment.findMany({
        where: { collegeId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, name: true, pillar: true, phase: true, maxMarks: true },
      }),
    ]);

    // Readiness distribution: one readiness index per student (equal-weighted
    // pillar average, identical formula to the student's own dashboard),
    // bucketed into tiers. Students with no scores yet aren't counted in the
    // average (would wrongly depress it) but are reported separately.
    const scoresByStudent = new Map<string, PillarScoreRow[]>();
    for (const s of scores) {
      const list = scoresByStudent.get(s.studentId) ?? [];
      list.push({
        marksObtained: Number(s.marksObtained),
        pillar: s.assessment.pillar,
        maxMarks: s.assessment.maxMarks,
      });
      scoresByStudent.set(s.studentId, list);
    }
    const tierCounts: Record<EmployabilityTier, number> = { TIER_1: 0, TIER_2: 0, TIER_3: 0 };
    let readinessSum = 0;
    let assessedCount = 0;
    for (const id of studentIds) {
      const rows = scoresByStudent.get(id);
      if (!rows || rows.length === 0) continue;
      const { readinessIndex, scoredPillars } = computeReadiness(rows);
      if (scoredPillars.length === 0) continue;
      tierCounts[tierFor(readinessIndex)]++;
      readinessSum += readinessIndex;
      assessedCount++;
    }
    const readiness = {
      average: assessedCount ? Math.round(readinessSum / assessedCount) : 0,
      assessedCount,
      notYetAssessedCount: studentIds.length - assessedCount,
      tierCounts,
    };

    // Pillar breakdown: pooled PRE vs POST average % per pillar, across every
    // scored row in scope — the "pre vs post-test analysis" view.
    const byPillarPhase = new Map<string, number[]>();
    for (const s of scores) {
      if (s.assessment.maxMarks <= 0) continue;
      const pct = (Number(s.marksObtained) / s.assessment.maxMarks) * 100;
      const key = `${s.assessment.pillar}-${s.assessment.phase}`;
      const list = byPillarPhase.get(key) ?? [];
      list.push(pct);
      byPillarPhase.set(key, list);
    }
    const avg = (list: number[] | undefined) =>
      list && list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : null;
    const pillars = PILLARS.map((pillar) => ({
      pillar,
      label: PILLAR_LABEL[pillar],
      prePct: avg(byPillarPhase.get(`${pillar}-PRE`)),
      postPct: avg(byPillarPhase.get(`${pillar}-POST`)),
    }));

    // Attendance: overall %, plus per-session breakdown (most recent 20).
    const attendanceTotal = attendance.length;
    const attendancePresent = attendance.filter((a) => a.present).length;
    const overallAttendancePct = attendanceTotal
      ? Math.round((attendancePresent / attendanceTotal) * 100)
      : 0;
    const attendanceBySession = new Map<string, { present: number; total: number }>();
    for (const a of attendance) {
      const row = attendanceBySession.get(a.sessionId) ?? { present: 0, total: 0 };
      row.total++;
      if (a.present) row.present++;
      attendanceBySession.set(a.sessionId, row);
    }
    const sessionsOut = sessions.map((s) => {
      const row = attendanceBySession.get(s.id);
      return {
        id: s.id,
        title: s.title,
        startsAt: s.startsAt,
        status: s.status,
        attendancePct: row && row.total ? Math.round((row.present / row.total) * 100) : null,
        markedCount: row?.total ?? 0,
      };
    });

    // Assessments: average score % per assessment (most recent 20).
    const scoresByAssessment = new Map<string, number[]>();
    for (const s of scores) {
      if (s.assessment.maxMarks <= 0) continue;
      const pct = (Number(s.marksObtained) / s.assessment.maxMarks) * 100;
      const list = scoresByAssessment.get(s.assessmentId) ?? [];
      list.push(pct);
      scoresByAssessment.set(s.assessmentId, list);
    }
    const assessmentsOut = assessments.map((a) => ({
      id: a.id,
      name: a.name,
      pillar: a.pillar,
      phase: a.phase,
      averagePct: avg(scoresByAssessment.get(a.id)),
      scoredCount: scoresByAssessment.get(a.id)?.length ?? 0,
    }));

    return {
      studentCount: studentIds.length,
      readiness,
      pillars,
      overallAttendancePct,
      sessions: sessionsOut,
      assessments: assessmentsOut,
    };
  }

  // Everything the "My Employability" page needs in one call, mirroring the
  // aggregated-response shape students.service.ts uses for profile completion.
  async getForUser(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true, collegeId: true, school: true, programme: true, graduationYear: true },
    });
    if (!student) throw new ForbiddenException('No student profile for this account');
    const { id: studentId, collegeId, school, programme, graduationYear } = student;

    const scores = await this.prisma.assessmentScore.findMany({
      where: { studentId },
      include: { assessment: { select: { pillar: true, maxMarks: true } } },
    });
    const { pillars, readinessIndex, scoredPillars } = computeReadiness(
      scores.map((s) => ({
        marksObtained: Number(s.marksObtained),
        pillar: s.assessment.pillar,
        maxMarks: s.assessment.maxMarks,
      })),
    );

    const tier = tierFor(readinessIndex);
    const gapToNextTier =
      tier === 'TIER_1' ? null : tier === 'TIER_2' ? TIER_1_MIN - readinessIndex : TIER_2_MIN - readinessIndex;
    const weakestPillar = scoredPillars.length
      ? scoredPillars.reduce((a, b) => (b.percentage < a.percentage ? b : a))
      : null;

    // Department rank: every non-graduated student in the same college +
    // programme + graduating batch, ranked by the identical readiness formula.
    // Informational only — never surfaced to classmates, never used to gate
    // anything (job eligibility is decided independently per Job).
    const cohort = await this.prisma.student.findMany({
      where: { collegeId, programme, graduationYear, graduatedAt: null },
      select: { id: true },
    });
    const cohortIds = cohort.map((c) => c.id);
    const cohortScores = await this.prisma.assessmentScore.findMany({
      where: { studentId: { in: cohortIds } },
      select: { studentId: true, marksObtained: true, assessment: { select: { pillar: true, maxMarks: true } } },
    });
    const scoresByStudent = new Map<string, typeof cohortScores>();
    for (const s of cohortScores) {
      const list = scoresByStudent.get(s.studentId) ?? [];
      list.push(s);
      scoresByStudent.set(s.studentId, list);
    }
    const ranked = cohortIds
      .map((cid) => ({
        id: cid,
        readinessIndex: computeReadiness(
          (scoresByStudent.get(cid) ?? []).map((s) => ({
            marksObtained: Number(s.marksObtained),
            pillar: s.assessment.pillar,
            maxMarks: s.assessment.maxMarks,
          })),
        ).readinessIndex,
      }))
      .sort((a, b) => b.readinessIndex - a.readinessIndex);
    const deptRank = {
      rank: ranked.findIndex((r) => r.id === studentId) + 1,
      total: cohortIds.length,
    };

    // Track & attendance: session status counts are scoped to sessions this
    // student is actually eligible for (untargeted, or targeting their
    // programme/batch); the attendance percentage is only over sessions actually
    // marked for this student.
    const batchIds = await this.prisma.trainingBatchMember
      .findMany({ where: { studentId }, select: { batchId: true } })
      .then((rows) => rows.map((r) => r.batchId));
    const visible = visibilityFilter(school, programme, batchIds);

    const [attendanceRows, statusCounts, nextSession] = await Promise.all([
      this.prisma.trainingAttendance.findMany({ where: { studentId }, select: { present: true } }),
      this.prisma.trainingSession.groupBy({
        by: ['status'],
        where: { collegeId, ...visible },
        _count: { _all: true },
      }),
      this.prisma.trainingSession.findFirst({
        where: {
          collegeId,
          ...visible,
          status: { in: ['SCHEDULED', 'ONGOING'] },
          startsAt: { gt: new Date() },
        },
        orderBy: { startsAt: 'asc' },
        select: { title: true, startsAt: true },
      }),
    ]);

    const attendanceTotal = attendanceRows.length;
    const attendancePresent = attendanceRows.filter((a) => a.present).length;
    const attendancePct = attendanceTotal
      ? Math.round((attendancePresent / attendanceTotal) * 100)
      : 0;

    const countFor = (statuses: string[]) =>
      statusCounts.filter((c) => statuses.includes(c.status)).reduce((a, c) => a + c._count._all, 0);
    const completedCount = countFor(['COMPLETED']);
    const ongoingCount = countFor(['SCHEDULED', 'ONGOING']);

    return {
      readinessIndex,
      tier,
      gapToNextTier,
      weakestPillar,
      deptRank,
      pillars,
      attendancePct,
      completedCount,
      ongoingCount,
      nextSession,
    };
  }
}
