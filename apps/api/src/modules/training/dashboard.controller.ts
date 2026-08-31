import { BadRequestException, Controller, Get } from '@nestjs/common';
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

/**
 * Officer/admin cohort-wide training analytics — pre/post-test pillar
 * breakdown, readiness-tier distribution, attendance. A Placement Coordinator
 * gets the same view scoped to their assigned programmes; Management (view-
 * only) and Training (manages the module) both get the unscoped view too.
 */
@Controller('training/dashboard')
@Roles(
  UserRole.COLLEGE_ADMIN,
  UserRole.PLACEMENT_OFFICER,
  UserRole.PLACEMENT_COORDINATOR,
  UserRole.MANAGEMENT,
  UserRole.TRAINING,
)
export class TrainingOfficerDashboardController {
  constructor(private readonly dashboard: TrainingDashboardService) {}

  @Get()
  async get(@CurrentUser() user: JwtPayload) {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return {
      data: await this.dashboard.getForOfficer(user.collegeId, { role: user.role, userId: user.sub }),
    };
  }
}
