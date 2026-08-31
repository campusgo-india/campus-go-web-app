import { BadRequestException, Controller, Get, Patch, Post, Body } from '@nestjs/common';
import { UserRole } from '@campusgo/shared';
import type { JwtPayload } from '@campusgo/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { StudentFeedbackService } from './student-feedback.service';
import { PlacementPolicyService } from '../placement-policy/placement-policy.service';
import { SetFeedbackWindowDto, SubmitStudentFeedbackDto } from './dto';

/** Student: end-of-placement-season survey, submitted once. */
@Controller('me/feedback')
@Roles(UserRole.STUDENT)
export class MeFeedbackController {
  constructor(private readonly feedback: StudentFeedbackService) {}

  @Get()
  async getMine(@CurrentUser() user: JwtPayload) {
    return { data: await this.feedback.getMine(user.sub) };
  }

  @Post()
  async submit(@CurrentUser() user: JwtPayload, @Body() dto: SubmitStudentFeedbackDto) {
    return { data: await this.feedback.submitMine(user.sub, dto) };
  }
}

/** Officer/admin (+ coordinator/management, view-only): aggregate view of every submitted student feedback. */
@Controller('feedback/students')
@Roles(
  UserRole.COLLEGE_ADMIN,
  UserRole.PLACEMENT_OFFICER,
  UserRole.PLACEMENT_COORDINATOR,
  UserRole.MANAGEMENT,
)
export class OfficerStudentFeedbackController {
  constructor(
    private readonly feedback: StudentFeedbackService,
    private readonly placementPolicy: PlacementPolicyService,
  ) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  @Get()
  async summary(@CurrentUser() user: JwtPayload) {
    return { data: await this.feedback.summary(this.collegeId(user)) };
  }

  @Get('window')
  async getWindow(@CurrentUser() user: JwtPayload) {
    return { data: await this.placementPolicy.getFeedbackWindow(this.collegeId(user)) };
  }

  @Patch('window')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
  async setWindow(@CurrentUser() user: JwtPayload, @Body() dto: SetFeedbackWindowDto) {
    return { data: await this.placementPolicy.setFeedbackWindow(this.collegeId(user), dto.open, user.sub) };
  }
}
