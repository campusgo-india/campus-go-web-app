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
