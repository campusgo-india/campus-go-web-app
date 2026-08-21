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

@Injectable()
export class TrainingDashboardService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  // Everything the "My Employability" page needs in one call, mirroring the
  // aggregated-response shape students.service.ts uses for profile completion.
  async getForUser(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true, collegeId: true, programme: true, graduationYear: true },
    });
    if (!student) throw new ForbiddenException('No student profile for this account');
    const { id: studentId, collegeId, programme, graduationYear } = student;

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
    const visible = visibilityFilter(programme, batchIds);

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
