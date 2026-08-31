import { BadRequestException, Controller, Get, Param } from '@nestjs/common';
import { UserRole } from '@campusgo/shared';
import type { JwtPayload } from '@campusgo/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { AnalyticsService } from './analytics.service';

// Every endpoint here is read-only, so Placement Coordinator/Management/
// Training all get full access — same as College Admin/Placement Officer.
// NOTE: unlike students/jobs/internships, these aren't yet scoped to a
// coordinator's assigned programmes (the underlying queries are college-wide
// aggregates); a coordinator currently sees the whole college's placement
// numbers here, same as everyone else with access.
@Controller('analytics')
@Roles(
  UserRole.COLLEGE_ADMIN,
  UserRole.PLACEMENT_OFFICER,
  UserRole.PLACEMENT_COORDINATOR,
  UserRole.MANAGEMENT,
  UserRole.TRAINING,
)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  @Get('placement')
  async placement(@CurrentUser() user: JwtPayload) {
    return { data: await this.analytics.placement(this.collegeId(user)) };
  }

  @Get('placement-dashboard')
  async placementDashboard(@CurrentUser() user: JwtPayload) {
    return { data: await this.analytics.placementDashboard(this.collegeId(user)) };
  }

  @Get('placement-funnel')
  async placementFunnel(@CurrentUser() user: JwtPayload) {
    return { data: await this.analytics.placementFunnel(this.collegeId(user)) };
  }

  @Get('programme-wise-placement')
  async programmeWisePlacement(@CurrentUser() user: JwtPayload) {
    return { data: await this.analytics.programmeWisePlacement(this.collegeId(user)) };
  }

  @Get('active-drives')
  async activeDrives(@CurrentUser() user: JwtPayload) {
    return { data: await this.analytics.activeDrives(this.collegeId(user)) };
  }

  @Get('students-requiring-attention')
  async studentsRequiringAttention(@CurrentUser() user: JwtPayload) {
    return { data: await this.analytics.studentsRequiringAttention(this.collegeId(user)) };
  }

  @Get('students-requiring-attention/:category')
  async studentsInAttentionCategory(
    @CurrentUser() user: JwtPayload,
    @Param('category') category: string,
  ) {
    return {
      data: await this.analytics.studentsInAttentionCategory(this.collegeId(user), category),
    };
  }

  @Get('jobs')
  async jobs(@CurrentUser() user: JwtPayload) {
    return { data: await this.analytics.jobs(this.collegeId(user)) };
  }

  @Get('students')
  async students(@CurrentUser() user: JwtPayload) {
    return { data: await this.analytics.students(this.collegeId(user)) };
  }

  @Get('funnel')
  async funnel(@CurrentUser() user: JwtPayload) {
    return { data: await this.analytics.funnel(this.collegeId(user)) };
  }

  @Get('breakdowns')
  async breakdowns(@CurrentUser() user: JwtPayload) {
    return { data: await this.analytics.breakdowns(this.collegeId(user)) };
  }

  @Get('insights')
  async insights(@CurrentUser() user: JwtPayload) {
    return { data: await this.analytics.insights(this.collegeId(user)) };
  }
}
