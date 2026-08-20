import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UserRole } from '@campusgo/shared';
import type { JwtPayload } from '@campusgo/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto } from './dto';

/**
 * Tenant: the caller's own college catalog. Reads are open to officers too
 * (to populate student/job/alumni forms); mutations are College-Admin-only —
 * self-serve catalog management, same as Team and College Settings.
 */
@Controller('courses')
@Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return { data: await this.courses.listForCollege(this.collegeId(user)) };
  }

  @Post()
  @Roles(UserRole.COLLEGE_ADMIN)
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCourseDto) {
    return { data: await this.courses.create(this.collegeId(user), dto) };
  }

  @Patch(':id')
  @Roles(UserRole.COLLEGE_ADMIN)
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return { data: await this.courses.update(this.collegeId(user), id, dto) };
  }

  @Delete(':id')
  @Roles(UserRole.COLLEGE_ADMIN)
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.courses.remove(this.collegeId(user), id) };
  }
}

/** Platform Admin: manage a college's course catalog. */
@Controller('colleges/:collegeId/courses')
@Roles(UserRole.PLATFORM_ADMIN)
export class CollegeCoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  async list(@Param('collegeId') collegeId: string) {
    return { data: await this.courses.listForCollege(collegeId) };
  }

  @Post()
  async create(@Param('collegeId') collegeId: string, @Body() dto: CreateCourseDto) {
    return { data: await this.courses.create(collegeId, dto) };
  }

  @Patch(':id')
  async update(
    @Param('collegeId') collegeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return { data: await this.courses.update(collegeId, id, dto) };
  }

  @Delete(':id')
  async remove(@Param('collegeId') collegeId: string, @Param('id') id: string) {
    return { data: await this.courses.remove(collegeId, id) };
  }
}
