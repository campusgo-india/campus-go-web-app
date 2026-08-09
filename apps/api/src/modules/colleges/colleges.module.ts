import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { CollegesController } from './colleges.controller';
import { CollegesService } from './colleges.service';

@Module({
  imports: [EmailModule],
  controllers: [CollegesController],
  providers: [CollegesService],
})
export class CollegesModule {}
