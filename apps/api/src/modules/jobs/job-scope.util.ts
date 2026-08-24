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

// A Placement Officer only ever sees/manages COLLEGE-scoped jobs they
// personally posted — College Admin keeps full college-wide visibility (they
// oversee the whole team). Coordinators are scoped separately, by programme,
// not by creator. PLATFORM-broadcast jobs are excluded from this restriction:
// they're never "owned" by any one officer, and every officer at a targeted
// college retains read/manage access to their own applicants on them.
//
// Shared across jobs.service.ts, rounds.service.ts, and applications.service.ts
// so an officer scoped out of a colleague's job on the list/detail view is
// scoped out of its rounds, pipeline, and applicant export too — not just the
// job record itself.
export function ownJobWhere(viewer?: Viewer): Prisma.JobWhereInput {
  if (viewer?.role === 'PLACEMENT_OFFICER') {
    return { OR: [{ createdById: viewer.userId }, { scope: 'PLATFORM' }] };
  }
  return {};
}

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
