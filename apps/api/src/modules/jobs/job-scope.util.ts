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

export type RecruitmentProgress =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'CLOSED_FOR_APPLICATIONS'
  | 'IN_PROGRESS'
  | 'COMPLETED';

/**
 * A clearer, at-a-glance stage than the raw Job.status (DRAFT/PUBLISHED/
 * CLOSED) — layers in how far recruitment has actually progressed:
 *  - Published: live, still taking applications
 *  - Closed for applications: officer closed it, or the deadline passed
 *  - In progress: the officer has started the round funnel (created ≥1 round)
 *  - Completed: a candidate has been selected for an offer
 * "Completed" is not a lock — an officer can still select more candidates
 * afterwards (RoundsService.place allows it).
 */
export function computeRecruitmentProgress(
  jobStatus: string,
  rounds: { status: string }[],
  opts: { hasPlacement: boolean; applicationDeadline?: Date | null } = { hasPlacement: false },
): RecruitmentProgress {
  if (jobStatus === 'DRAFT') return 'DRAFT';
  if (opts.hasPlacement) return 'COMPLETED';
  if (rounds.length > 0) return 'IN_PROGRESS';
  const deadlinePassed =
    opts.applicationDeadline != null && opts.applicationDeadline.getTime() < Date.now();
  if (jobStatus === 'CLOSED' || deadlinePassed) return 'CLOSED_FOR_APPLICATIONS';
  return 'PUBLISHED';
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
