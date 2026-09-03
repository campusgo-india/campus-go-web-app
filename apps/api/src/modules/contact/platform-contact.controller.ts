import { Controller, Get, Query } from '@nestjs/common';
import { UserRole } from '@campusgo/shared';
import { Roles } from '../../common/decorators';
import { ContactService } from './contact.service';
import { ListLeadsDto } from './dto';

/** Platform-Admin view of marketing-site leads (Contact us / Request a demo). */
@Controller('platform/leads')
@Roles(UserRole.PLATFORM_ADMIN)
export class PlatformContactController {
  constructor(private readonly contact: ContactService) {}

  @Get()
  async list(@Query() query: ListLeadsDto) {
    const { items, meta } = await this.contact.list(query);
    return { data: items, meta };
  }
}
