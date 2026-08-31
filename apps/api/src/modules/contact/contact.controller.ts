import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators';
import { ContactService } from './contact.service';
import { SubmitContactEnquiryDto } from './dto';

/** Public marketing-site form (Contact us / Request a demo) — no auth. */
@Controller('public/contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Public()
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async submit(@Body() dto: SubmitContactEnquiryDto) {
    return { data: await this.contact.submit(dto) };
  }
}
