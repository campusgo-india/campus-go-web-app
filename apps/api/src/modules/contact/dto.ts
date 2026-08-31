import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { PHONE_REGEX } from '@campusgo/shared';
import { EmptyToUndefined } from '../../common/transforms';

const PHONE_MESSAGE = 'Enter a valid 10-digit mobile number';

/** Marketing-site "Contact us" / "Request a demo" form — no auth, public. */
export class SubmitContactEnquiryDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  institution!: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  designation?: string;

  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;

  @EmptyToUndefined()
  @IsOptional()
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  phone?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  message?: string;

  // Distinguishes the "Request a Demo" CTA from the general Contact form —
  // same fields, different intent, so the notification email reads right.
  @IsOptional()
  @IsIn(['CONTACT', 'DEMO'])
  source?: 'CONTACT' | 'DEMO';
}
