import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient } from '@campusgo/database';
import { PlacementPolicyService } from '../placement-policy/placement-policy.service';
import { SubmitStudentFeedbackDto } from './dto';

@Injectable()
export class StudentFeedbackService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly placementPolicy: PlacementPolicyService,
  ) {}

  private async studentForUser(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true, collegeId: true, programme: true, graduationYear: true },
    });
    if (!student) throw new ForbiddenException('No student profile for this account');
    return student;
  }

  // ─────────────── Student (self) ───────────────

  async getMine(userId: string) {
    const student = await this.studentForUser(userId);
    const [feedback, window] = await Promise.all([
      this.prisma.studentFeedback.findUnique({ where: { studentId: student.id } }),
      this.placementPolicy.getFeedbackWindow(student.collegeId),
    ]);
    return {
      submitted: !!feedback,
      open: window.open,
      programme: student.programme,
      batch: student.graduationYear,
      feedback: feedback ?? null,
    };
  }

  async submitMine(userId: string, dto: SubmitStudentFeedbackDto) {
    const student = await this.studentForUser(userId);
    const window = await this.placementPolicy.getFeedbackWindow(student.collegeId);
    if (!window.open) {
      throw new BadRequestException(
        'Placement feedback is not open yet — your placement cell will announce when it opens.',
      );
    }

    const existing = await this.prisma.studentFeedback.findUnique({
      where: { studentId: student.id },
    });
    if (existing) throw new BadRequestException('You have already submitted feedback');

    await this.prisma.studentFeedback.create({
      data: {
        collegeId: student.collegeId,
        studentId: student.id,
        academicYear: dto.academicYear.trim(),
        placementStatus: dto.placementStatus,
        placementOpportunities: dto.placementOpportunities,
        careerGuidance: dto.careerGuidance,
        placementTraining: dto.placementTraining,
        communicationOfOpportunities: dto.communicationOfOpportunities,
        placementCellSupport: dto.placementCellSupport,
        industryInteraction: dto.industryInteraction,
        overallSupport: dto.overallSupport,
        suggestions: dto.suggestions?.trim() || null,
      },
    });
    return { success: true };
  }

  // ─────────────── Officer / Admin ───────────────

  // Every submission plus a pooled average per rating — the placement team's
  // end-of-season summary. No student-programme filter for v1: the ratings
  // are anonymous-in-spirit (individual free-text suggestions are still
  // attributable via rollNumber for follow-up, matching the printed form,
  // which is not anonymous either).
  async summary(collegeId: string) {
    const rows = await this.prisma.studentFeedback.findMany({
      where: { collegeId },
      include: {
        student: { select: { rollNumber: true, programme: true, user: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const RATING_KEYS = [
      'placementOpportunities',
      'careerGuidance',
      'placementTraining',
      'communicationOfOpportunities',
      'placementCellSupport',
      'industryInteraction',
      'overallSupport',
    ] as const;
    const averages = Object.fromEntries(
      RATING_KEYS.map((k) => [
        k,
        rows.length ? Math.round((rows.reduce((sum, r) => sum + r[k], 0) / rows.length) * 10) / 10 : null,
      ]),
    );

    return {
      responseCount: rows.length,
      averages,
      responses: rows.map((r) => ({
        id: r.id,
        rollNumber: r.student.rollNumber,
        fullName: r.student.user.fullName,
        programme: r.student.programme,
        academicYear: r.academicYear,
        placementStatus: r.placementStatus,
        placementOpportunities: r.placementOpportunities,
        careerGuidance: r.careerGuidance,
        placementTraining: r.placementTraining,
        communicationOfOpportunities: r.communicationOfOpportunities,
        placementCellSupport: r.placementCellSupport,
        industryInteraction: r.industryInteraction,
        overallSupport: r.overallSupport,
        suggestions: r.suggestions,
        createdAt: r.createdAt,
      })),
    };
  }
}
