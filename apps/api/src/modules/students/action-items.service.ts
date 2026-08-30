import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient } from '@campusgo/database';
import { JobsService } from '../jobs/jobs.service';
import { visibilityFilter } from '../training/sessions.service';
import { PILLAR_LABEL } from '../training/dashboard.service';

// Tunable thresholds for the "Actions Required" nudges on the student's own
// Profile page. Deliberately plain constants, not per-college config — if a
// college ever wants these adjustable, that's a follow-up.
const RESUME_STALE_DAYS = 45;
const INACTIVE_DAYS = 30;

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

export interface ActionItem {
  key: 'profile' | 'resume' | 'inactive' | 'assessment';
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}

@Injectable()
export class StudentActionItemsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly jobs: JobsService,
  ) {}

  async getForUser(userId: string): Promise<ActionItem[]> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: { resume: true },
    });
    if (!student) throw new ForbiddenException('No student profile for this account');

    const batchIds = (
      await this.prisma.trainingBatchMember.findMany({
        where: { studentId: student.id },
        select: { batchId: true },
      })
    ).map((m) => m.batchId);

    const [lastApplication, pendingAssessment, matchingJobsCount] = await Promise.all([
      this.prisma.application.findFirst({
        where: { studentId: student.id },
        orderBy: { appliedAt: 'desc' },
        select: { appliedAt: true },
      }),
      this.prisma.assessment.findFirst({
        where: {
          collegeId: student.collegeId,
          isActive: true,
          ...visibilityFilter(student.school, student.programme, batchIds),
          scores: { none: { studentId: student.id } },
        },
        orderBy: { scheduledAt: 'asc' },
        select: { pillar: true },
      }),
      this.jobs.matchingOpenJobsCount(userId),
    ]);

    const items: ActionItem[] = [];

    // 1. Profile completion — the one that unlocks everything else, so it
    // always leads when incomplete.
    const completion = student.profileCompletion ?? 0;
    if (student.verificationStatus !== 'VERIFIED' || completion < 100) {
      items.push({
        key: 'profile',
        title: 'Complete Your Profile',
        body: `Your profile is ${completion}% complete. Complete it immediately.`,
        ctaLabel: 'Complete Now',
        ctaHref: '/me/profile/edit',
      });
    }

    // 2. Resume staleness — only meaningful once one exists at all; a
    // student with no resume yet already gets steered there by profile
    // completion (resume upload factors into it).
    if (student.resume?.fileUrl) {
      const ageDays = daysSince(student.resume.updatedAt);
      if (ageDays >= RESUME_STALE_DAYS) {
        items.push({
          key: 'resume',
          title: 'Update Your Resume',
          body: `Your resume was last updated ${ageDays} days ago. Keep it updated for upcoming opportunities.`,
          ctaLabel: 'Update Resume',
          ctaHref: '/me/resume',
        });
      }
    }

    // 3. Inactivity — only worth nudging if there's actually something to
    // apply to right now.
    const inactiveDays = lastApplication ? daysSince(lastApplication.appliedAt) : null;
    if (matchingJobsCount > 0 && (inactiveDays == null || inactiveDays >= INACTIVE_DAYS)) {
      items.push({
        key: 'inactive',
        title: 'Get Active in Placements',
        body: inactiveDays == null
          ? `You haven't applied for a job yet. ${matchingJobsCount} opportunity${matchingJobsCount === 1 ? '' : 'ies'} currently match your profile.`
          : `You haven't applied for a job in the last ${inactiveDays} days. ${matchingJobsCount} opportunit${matchingJobsCount === 1 ? 'y' : 'ies'} currently match your profile.`,
        ctaLabel: 'Explore Jobs',
        ctaHref: '/me/jobs',
      });
    }

    // 4. Pending assessment — earliest-scheduled one not yet scored.
    if (pendingAssessment) {
      items.push({
        key: 'assessment',
        title: 'Assessment Pending',
        body: `Your ${PILLAR_LABEL[pendingAssessment.pillar]} assessment is pending. Complete it to update your Placement Readiness score.`,
        ctaLabel: 'Take Assessment',
        ctaHref: '/me/training/assessments',
      });
    }

    return items;
  }
}
