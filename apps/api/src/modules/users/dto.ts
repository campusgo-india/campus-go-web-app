import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { UserRole, PHONE_REGEX } from '@campusgo/shared';
import { EmptyToUndefined } from '../../common/transforms';

const PHONE_MESSAGE = 'Enter a valid 10-digit mobile number';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;

  @IsIn([UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_COORDINATOR])
  role!:
    | typeof UserRole.COLLEGE_ADMIN
    | typeof UserRole.PLACEMENT_OFFICER
    | typeof UserRole.PLACEMENT_COORDINATOR;

  @EmptyToUndefined()
  @IsOptional()
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  phone?: string;

  // PLACEMENT_COORDINATOR only: the programmes they're responsible
  // for — may cover more than one (e.g. BBA & MBA).
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedProgrammes?: string[];

  // Optional: set the teammate's password directly. If omitted, a random temp
  // password is generated and returned once.
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() fullName?: string;
  @EmptyToUndefined()
  @IsOptional()
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  phone?: string;
  @IsOptional()
  @IsIn([UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER, UserRole.PLACEMENT_COORDINATOR])
  role?: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedProgrammes?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}
