import { Module } from '@nestjs/common';
import { AssessmentsController, MeAssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { TrainingSessionsController, MeTrainingSessionsController } from './sessions.controller';
import { TrainingSessionsService } from './sessions.service';
import { TrainingFeedbackController, MeTrainingFeedbackController } from './feedback.controller';
import { TrainingFeedbackService } from './feedback.service';
import { TrainingDashboardController } from './dashboard.controller';
import { TrainingDashboardService } from './dashboard.service';

@Module({
  controllers: [
    AssessmentsController,
    MeAssessmentsController,
    TrainingSessionsController,
    MeTrainingSessionsController,
    TrainingFeedbackController,
    MeTrainingFeedbackController,
    TrainingDashboardController,
  ],
  providers: [
    AssessmentsService,
    TrainingSessionsService,
    TrainingFeedbackService,
    TrainingDashboardService,
  ],
})
export class TrainingModule {}
