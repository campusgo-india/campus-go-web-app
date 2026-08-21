import { Module } from '@nestjs/common';
import { SchoolsController, CollegeSchoolsController } from './courses.controller';
import { SchoolsService } from './courses.service';

@Module({
  controllers: [SchoolsController, CollegeSchoolsController],
  providers: [SchoolsService],
})
export class SchoolsModule {}
