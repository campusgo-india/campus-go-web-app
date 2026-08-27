import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@campusgo/database';

/**
 * A job is visible to a college if it's the college's own job, OR a
 * PLATFORM-broadcast job that targets the college (collegeId is null on
 * PLATFORM jobs — only targetCollegeIds is set). Shared by every job lookup
 * so a broadcast job's detail/eligible-students/export/rounds all resolve
 * consistently — a lookup that filters by `collegeId` alone silently 404s on
 * broadcast jobs.
 */
export function jobVisibleToCollege(collegeId: string): Prisma.JobWhereInput {
  return {
    OR: [{ collegeId }, { scope: 'PLATFORM', targetCollegeIds: { has: collegeId } }],
  };
}

export interface Viewer {
  role: string;
  userId: string;
}

// A Placement Officer can VIEW every COLLEGE-scoped job (list, detail,
// pipeline, funnel) — only MANAGING one (edit, publish, close, delete, or any
// round action: create/update/delete/attendance/decide/place/reject) is
// restricted to the officer who personally posted it, or College Admin (who
// keeps full manage access over the whole team). Coordinators are scoped
// separately, by programme, not by creator. PLATFORM-broadcast jobs are
// excluded from this restriction: they're never "owned" by any one officer.
//
// Shared across jobs.service.ts, rounds.service.ts, and applications.service.ts
// — call this only at the write call sites; read call sites (list/findOne/
// pipeline/funnel/export) intentionally skip it so every officer can view.
export function assertOwnJob(
  job: { createdById?: string | null; scope?: string },
  viewer?: Viewer,
) {
  if (
    viewer?.role === 'PLACEMENT_OFFICER' &&
    job.scope !== 'PLATFORM' &&
    job.createdById !== viewer.userId
  ) {
    throw new NotFoundException('Job not found');
  }
}
