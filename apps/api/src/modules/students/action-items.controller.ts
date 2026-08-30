import { Controller, Get } from '@nestjs/common';
import { UserRole } from '@campusgo/shared';
import type { JwtPayload } from '@campusgo/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { StudentActionItemsService } from './action-items.service';

/** Student: "Actions Required" nudges on their own Profile page. */
@Controller('me/action-items')
@Roles(UserRole.STUDENT)
export class MeActionItemsController {
  constructor(private readonly actionItems: StudentActionItemsService) {}

  @Get()
  async get(@CurrentUser() user: JwtPayload) {
    return { data: await this.actionItems.getForUser(user.sub) };
  }
}
