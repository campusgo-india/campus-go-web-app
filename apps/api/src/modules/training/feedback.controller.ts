import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { UserRole } from '@campusgo/shared';
import type { JwtPayload } from '@campusgo/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { TrainingFeedbackService } from './feedback.service';
import { SubmitFeedbackDto } from './dto';

@Controller('training/feedback')
@Roles(
  UserRole.COLLEGE_ADMIN,
  UserRole.PLACEMENT_OFFICER,
  UserRole.PLACEMENT_COORDINATOR,
  UserRole.MANAGEMENT,
  UserRole.TRAINING,
)
export class TrainingFeedbackController {
  constructor(private readonly feedback: TrainingFeedbackService) {}

  @Get('analytics')
  async analytics(@CurrentUser() user: JwtPayload) {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return { data: await this.feedback.analytics(user.collegeId) };
  }
}

/** Student: check for / submit the post-session rating pop-up. */
@Controller('me/training/feedback')
@Roles(UserRole.STUDENT)
export class MeTrainingFeedbackController {
  constructor(private readonly feedback: TrainingFeedbackService) {}

  @Get('pending')
  async pending(@CurrentUser() user: JwtPayload) {
    return { data: await this.feedback.getPending(user.sub) };
  }

  @Post()
  async submit(@CurrentUser() user: JwtPayload, @Body() dto: SubmitFeedbackDto) {
    return { data: await this.feedback.submit(user.sub, dto) };
  }
}
