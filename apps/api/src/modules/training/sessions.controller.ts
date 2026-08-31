import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '@campusgo/shared';
import type { JwtPayload } from '@campusgo/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { TrainingSessionsService } from './sessions.service';
import { CreateSessionDto, ImportAttendanceDto, MarkAttendanceDto, UpdateSessionDto } from './dto';

@Controller('training/sessions')
@Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER, UserRole.TRAINING)
export class TrainingSessionsController {
  constructor(private readonly sessions: TrainingSessionsService) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return { data: await this.sessions.list(this.collegeId(user)) };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.sessions.findOnePublic(this.collegeId(user), id) };
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSessionDto) {
    return { data: await this.sessions.create(this.collegeId(user), user.sub, dto) };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return { data: await this.sessions.update(this.collegeId(user), id, dto) };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.sessions.remove(this.collegeId(user), id) };
  }

  @Get(':id/attendance')
  async listAttendance(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.sessions.listAttendance(this.collegeId(user), id) };
  }

  @Post(':id/attendance')
  async markAttendance(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: MarkAttendanceDto,
  ) {
    return { data: await this.sessions.markAttendance(this.collegeId(user), id, user.sub, dto) };
  }

  @Post(':id/attendance/import')
  async importAttendance(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ImportAttendanceDto,
  ) {
    return { data: await this.sessions.importAttendance(this.collegeId(user), id, user.sub, dto) };
  }
}

/** Student: full session calendar with own attendance status. */
@Controller('me/training/sessions')
@Roles(UserRole.STUDENT)
export class MeTrainingSessionsController {
  constructor(private readonly sessions: TrainingSessionsService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return { data: await this.sessions.listForStudent(user.sub) };
  }
}
