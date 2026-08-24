import { Module } from '@nestjs/common';
import {
  EmployerFeedbackController,
  OfficerEmployerFeedbackListController,
  PlatformEmployerFeedbackController,
  PublicEmployerFeedbackController,
} from './employer-feedback.controller';
import { EmployerFeedbackService } from './employer-feedback.service';
import { MeFeedbackController, OfficerStudentFeedbackController } from './student-feedback.controller';
import { StudentFeedbackService } from './student-feedback.service';

@Module({
  controllers: [
    EmployerFeedbackController,
    OfficerEmployerFeedbackListController,
    PlatformEmployerFeedbackController,
    PublicEmployerFeedbackController,
    MeFeedbackController,
    OfficerStudentFeedbackController,
  ],
  providers: [EmployerFeedbackService, StudentFeedbackService],
})
export class FeedbackModule {}
