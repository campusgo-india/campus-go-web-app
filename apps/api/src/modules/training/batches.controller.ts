import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '@campusgo/shared';
import type { JwtPayload } from '@campusgo/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { TrainingBatchesService } from './batches.service';
import { CreateBatchDto, SetBatchMembersDto, UpdateBatchDto } from './dto';

@Controller('training/batches')
@Roles(UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER)
export class TrainingBatchesController {
  constructor(private readonly batches: TrainingBatchesService) {}

  private collegeId(user: JwtPayload): string {
    if (!user.collegeId) throw new BadRequestException('No college context');
    return user.collegeId;
  }

  @Get()
  async list(@CurrentUser() user: JwtPayload) {
    return { data: await this.batches.list(this.collegeId(user)) };
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBatchDto) {
    return { data: await this.batches.create(this.collegeId(user), user.sub, dto) };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBatchDto,
  ) {
    return { data: await this.batches.update(this.collegeId(user), id, dto) };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.batches.remove(this.collegeId(user), id) };
  }

  @Get(':id/members')
  async listMembers(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.batches.listMembers(this.collegeId(user), id) };
  }

  @Post(':id/members')
  async setMembers(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SetBatchMembersDto,
  ) {
    return { data: await this.batches.setMembers(this.collegeId(user), id, dto) };
  }
}
