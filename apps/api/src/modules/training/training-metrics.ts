import type { PrismaClient } from '@campusgo/database';

export interface TrainingMetrics {
  /** Present ÷ marked sessions, 0–100. Null when no attendance is recorded yet. */
  attendancePct: number | null;
  /** Mean of marks ÷ max marks across the student's scored assessments, 0–100. */
  scorePct: number | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Training attendance % and average assessment score % per student — the
 * figures a job's training eligibility criteria are checked against. */
export async function loadTrainingMetrics(
  prisma: PrismaClient,
  studentIds: string[],
): Promise<Map<string, TrainingMetrics>> {
  const out = new Map<string, TrainingMetrics>();
  if (studentIds.length === 0) return out;

  const [attendance, scores] = await Promise.all([
    prisma.trainingAttendance.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, present: true },
    }),
    prisma.assessmentScore.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, marksObtained: true, assessment: { select: { maxMarks: true } } },
    }),
  ]);

  const att = new Map<string, { present: number; total: number }>();
  for (const a of attendance) {
    const row = att.get(a.studentId) ?? { present: 0, total: 0 };
    row.total++;
    if (a.present) row.present++;
    att.set(a.studentId, row);
  }
  const sc = new Map<string, number[]>();
  for (const s of scores) {
    if (!s.assessment.maxMarks) continue;
    const list = sc.get(s.studentId) ?? [];
    list.push((Number(s.marksObtained) / s.assessment.maxMarks) * 100);
    sc.set(s.studentId, list);
  }

  for (const id of studentIds) {
    const a = att.get(id);
    const list = sc.get(id);
    out.set(id, {
      attendancePct: a && a.total ? round1((a.present / a.total) * 100) : null,
      scorePct: list && list.length ? round1(list.reduce((x, y) => x + y, 0) / list.length) : null,
    });
  }
  return out;
}

/** True when any of these jobs sets a training criterion. */
export function hasTrainingCriteria(
  jobs: Array<{ minTrainingAttendance?: unknown; minTrainingScore?: unknown }>,
): boolean {
  return jobs.some((j) => j.minTrainingAttendance != null || j.minTrainingScore != null);
}
