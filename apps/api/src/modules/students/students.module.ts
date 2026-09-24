import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { EmailModule } from '../email/email.module';
import { StudentsController } from './students.controller';
import { MeStudentController } from './me-student.controller';
import { MeActionItemsController } from './action-items.controller';
import { StudentsService } from './students.service';
import { StudentActionItemsService } from './action-items.service';

@Module({
  imports: [JobsModule, EmailModule],
  controllers: [StudentsController, MeStudentController, MeActionItemsController],
  providers: [StudentsService, StudentActionItemsService],
})
export class StudentsModule {}
