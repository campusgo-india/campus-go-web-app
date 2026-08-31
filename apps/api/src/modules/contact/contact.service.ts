import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/prisma.module';
import type { PrismaClient } from '@campusgo/database';
import { EmailService } from '../email/email.service';
import { SubmitContactEnquiryDto } from './dto';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly email: EmailService,
  ) {}

  async submit(dto: SubmitContactEnquiryDto) {
    const source = dto.source ?? 'CONTACT';
    const enquiry = await this.prisma.contactEnquiry.create({
      data: {
        name: dto.name,
        institution: dto.institution,
        designation: dto.designation,
        email: dto.email,
        phone: dto.phone,
        message: dto.message,
        source,
      },
    });

    // Best-effort notification to the CampusGo team — the enquiry is already
    // saved above regardless of whether this send succeeds.
    const to = process.env.CONTACT_NOTIFY_EMAIL || 'campusgo@campusgoindia.com';
    const label = source === 'DEMO' ? 'Demo request' : 'Contact enquiry';
    try {
      await this.email.sendForCollege(null, {
        to,
        subject: `${label} — ${dto.institution}`,
        html: [
          `<p><strong>${label}</strong> submitted on campusgoindia.com.</p>`,
          `<p><strong>Name:</strong> ${escapeHtml(dto.name)}</p>`,
          `<p><strong>Institution:</strong> ${escapeHtml(dto.institution)}</p>`,
          dto.designation ? `<p><strong>Designation:</strong> ${escapeHtml(dto.designation)}</p>` : '',
          `<p><strong>Email:</strong> ${escapeHtml(dto.email)}</p>`,
          dto.phone ? `<p><strong>Phone:</strong> ${escapeHtml(dto.phone)}</p>` : '',
          dto.message
            ? `<p><strong>Message:</strong><br/>${escapeHtml(dto.message).replace(/\n/g, '<br/>')}</p>`
            : '',
        ]
          .filter(Boolean)
          .join('\n'),
      });
    } catch (err) {
      this.logger.error('Failed to send contact-enquiry notification email', err as Error);
    }

    return { success: true, id: enquiry.id };
  }
}
