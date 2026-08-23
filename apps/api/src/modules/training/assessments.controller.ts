import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '@campusgo/shared';
import type { JwtPayload } from '@campusgo/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { AssessmentsService } from './assessments.service';
import { BulkScoreEntryDto, CreateAssessmentDto, ImportScoresDto, UpdateAssessmentDto } from './dto';

@Controller('training/assessments')
@Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return { data: await this.assessments.list(this.collegeId(user)) };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.assessments.findOnePublic(this.collegeId(user), id) };
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAssessmentDto) {
    return { data: await this.assessments.create(this.collegeId(user), user.sub, dto) };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentDto,
  ) {
    return { data: await this.assessments.update(this.collegeId(user), id, dto) };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.assessments.remove(this.collegeId(user), id) };
  }

  @Get(':id/scores')
  async listScores(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.assessments.listScores(this.collegeId(user), id) };
  }

  @Post(':id/scores')
  async bulkEnterScores(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: BulkScoreEntryDto,
  ) {
    return {
      data: await this.assessments.bulkEnterScores(this.collegeId(user), id, user.sub, dto),
    };
  }

  @Post(':id/scores/import')
  async importScores(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ImportScoresDto,
  ) {
    return { data: await this.assessments.importScores(this.collegeId(user), id, user.sub, dto) };
  }
}

/** Student: browse active assessments and take/view own scores. */
@Controller('me/training/assessments')
@Roles(UserRole.STUDENT)
export class MeAssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return { data: await this.assessments.listForStudent(user.sub) };
  }
}
