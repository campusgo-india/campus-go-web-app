import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

// Not @Global(): only CollegesModule (test-send endpoint) and NotificationsModule
// (send-on-notify hook) need this, so it's imported explicitly by those two rather
// than growing the app's global-module surface.
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
