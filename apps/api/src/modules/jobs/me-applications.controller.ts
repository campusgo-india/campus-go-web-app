import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { UserRole } from '@campusgo/shared';
import type { JwtPayload } from '@campusgo/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { ApplicationsService } from './applications.service';

class SetOfferLetterDto {
  @IsString() @MinLength(1) offerLetterUrl!: string;
}

// Student's own applications. Resolved from the JWT (user.sub → Student) — no
// :studentId, so students can only ever see their own pipeline (no IDOR).
@Controller('me/applications')
@Roles(UserRole.STUDENT)
export class MeApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  async listMine(@CurrentUser() user: JwtPayload) {
    return { data: await this.applications.listMine(user.sub) };
  }

  @Post(':id/withdraw')
  async withdraw(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return { data: await this.applications.withdraw(user.sub, id) };
  }

  @Patch(':id/offer-letter')
  async setOfferLetter(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SetOfferLetterDto,
  ) {
    return { data: await this.applications.setOwnOfferLetter(user.sub, id, dto.offerLetterUrl) };
  }
}
