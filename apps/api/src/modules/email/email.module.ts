import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

// Not @Global(): imported explicitly by each module that sends mail directly
// (CollegesModule's test-send endpoint, NotificationsModule's send-on-notify
// hook, StudentsModule and UsersModule's welcome/credential emails) rather
// than growing the app's global-module surface.
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
