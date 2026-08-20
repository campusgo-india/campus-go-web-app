import { Controller, Get } from '@nestjs/common';
import { UserRole } from '@campusgo/shared';
import type { JwtPayload } from '@campusgo/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { TrainingDashboardService } from './dashboard.service';

/** Student: the "My Employability" dashboard, aggregated in one call. */
@Controller('me/training/dashboard')
@Roles(UserRole.STUDENT)
export class TrainingDashboardController {
  constructor(private readonly dashboard: TrainingDashboardService) {}

  @Get()
  async get(@CurrentUser() user: JwtPayload) {
    return { data: await this.dashboard.getForUser(user.sub) };
  }
}
