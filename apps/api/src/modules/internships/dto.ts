import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { EmploymentType } from '@campusgo/database';
import { PHONE_REGEX } from '@campusgo/shared';
import { EmptyToUndefined, NormalizeUrl } from '../../common/transforms';

const PHONE_MESSAGE = 'Enter a valid 10-digit mobile number';

export class CreateInternshipDto {
  @IsString() @MinLength(2) companyName!: string;
  @IsString() @MinLength(2) role!: string;
  @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType;
  @IsOptional() @IsString() @MinLength(1) domain?: string;
  @IsOptional() @IsString() @MinLength(1) skills?: string;
  @IsString() @MinLength(1) location!: string;
  @IsOptional() @IsBoolean() isPaid?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) stipend?: number;
  @EmptyToUndefined() @IsOptional() @IsDateString() startDate?: string;
  @EmptyToUndefined() @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() isPpo?: boolean;
  @IsOptional() @IsString() description?: string;
  // Point-of-contact at the company.
  @IsString() @MinLength(1) pocName!: string;
  @IsEmail() pocEmail!: string;
  @IsString() @Matches(PHONE_REGEX, { message: PHONE_MESSAGE }) pocPhone!: string;
  @NormalizeUrl() @IsOptional() @IsString() certificateUrl?: string;
}

// Officer/Admin create: same fields as the student's own form, plus which
// student it's for (the student derives this from their own session instead).
export class OfficerCreateInternshipDto extends CreateInternshipDto {
  @IsString() @MinLength(1) studentId!: string;
}

export class UpdateInternshipDto {
  @IsOptional() @IsString() @MinLength(2) companyName?: string;
  @IsOptional() @IsString() @MinLength(2) role?: string;
  @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType;
  @IsOptional() @IsString() @MinLength(1) domain?: string;
  @IsOptional() @IsString() @MinLength(1) skills?: string;
  @IsOptional() @IsString() @MinLength(1) location?: string;
  @IsOptional() @IsBoolean() isPaid?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) stipend?: number;
  @EmptyToUndefined() @IsOptional() @IsDateString() startDate?: string;
  @EmptyToUndefined() @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() isPpo?: boolean;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() @MinLength(1) pocName?: string;
  @IsOptional() @IsEmail() pocEmail?: string;
  @IsOptional() @IsString() @Matches(PHONE_REGEX, { message: PHONE_MESSAGE }) pocPhone?: string;
  @NormalizeUrl() @IsOptional() @IsString() certificateUrl?: string;
}
