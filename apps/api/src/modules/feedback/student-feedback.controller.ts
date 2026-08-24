import { BadRequestException, Controller, Get, Post, Body } from '@nestjs/common';
import { UserRole } from '@campusgo/shared';
import type { JwtPayload } from '@campusgo/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { StudentFeedbackService } from './student-feedback.service';
import { SubmitStudentFeedbackDto } from './dto';

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

/** Officer/admin: aggregate view of every submitted student feedback. */
@Controller('feedback/students')
@Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
export class OfficerStudentFeedbackController {
  constructor(private readonly feedback: StudentFeedbackService) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  @Get()
  async summary(@CurrentUser() user: JwtPayload) {
    return { data: await this.feedback.summary(this.collegeId(user)) };
  }
}
