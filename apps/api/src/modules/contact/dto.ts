import { Transform, Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';
import { PHONE_REGEX } from '@campusgo/shared';

const PHONE_MESSAGE = 'Enter a valid 10-digit mobile number';

/**
 * Marketing-site "Contact us" / "Request a demo" form — no auth, public.
 * Every field is required (the marketing form makes them all compulsory);
 * only `source` is optional and defaults to CONTACT.
 */
export class SubmitContactEnquiryDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  institution!: string;

  @IsString()
  @MinLength(2)
  designation!: string;

  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;

  @IsString()
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  phone!: string;

  @IsString()
  @MinLength(10)
  message!: string;

  // Distinguishes the "Request a Demo" CTA from the general Contact form —
  // same fields, different intent, so the notification email reads right.
  @IsOptional()
  @IsIn(['CONTACT', 'DEMO'])
  source?: 'CONTACT' | 'DEMO';
}

/** Platform-Admin listing of submitted leads. */
export class ListLeadsDto {
  @IsOptional()
  @IsIn(['CONTACT', 'DEMO'])
  source?: 'CONTACT' | 'DEMO';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
