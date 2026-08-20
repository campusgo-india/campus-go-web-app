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
import { InternshipsService } from './internships.service';
import { CreateInternshipDto, OfficerCreateInternshipDto, UpdateInternshipDto } from './dto';

/** Officer/Admin: view every student-reported internship at the college
 * (grouped by batch in the UI), and now fine-tune any record — add one on a
 * student's behalf, correct/fill in fields, or remove one. Students still
 * self-report and manage their own via /me/internships; there is still no
 * separate "verification" workflow — an officer edit just overwrites in place. */
@Controller('internships')
@Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
export class InternshipsController {
  constructor(private readonly internships: InternshipsService) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return { data: await this.internships.list(this.collegeId(user)) };
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: OfficerCreateInternshipDto) {
    return { data: await this.internships.create(this.collegeId(user), dto) };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateInternshipDto,
  ) {
    return { data: await this.internships.update(this.collegeId(user), id, dto) };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.internships.remove(this.collegeId(user), id) };
  }
}

/** Student: manage own internship submissions (create/edit only; no delete). */
@Controller('me/internships')
@Roles(UserRole.STUDENT)
export class MeInternshipsController {
  constructor(private readonly internships: InternshipsService) {}

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return { data: await this.internships.listOwn(user.sub) };
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateInternshipDto) {
    return { data: await this.internships.createOwn(user.sub, dto) };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateInternshipDto,
  ) {
    return { data: await this.internships.updateOwn(user.sub, id, dto) };
  }
}
