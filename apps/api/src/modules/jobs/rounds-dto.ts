import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RoundType } from '@campusgo/database';
import { EmptyToUndefined } from '../../common/transforms';

export class CreateRoundDto {
  // Defaults to "Round N" server-side when omitted.
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsEnum(RoundType) roundType?: RoundType;
  @IsOptional() @IsString() description?: string;
  @EmptyToUndefined() @IsOptional() @IsString() venue?: string;
  @EmptyToUndefined() @IsOptional() @IsString() reportingInstructions?: string;
  // Every round carries a schedule — students need to know when to show up,
  // and the date feeds the Placement Dashboard's Active Drives.
  @IsDateString() scheduledAt!: string;
}

export class UpdateRoundDto {
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsEnum(RoundType) roundType?: RoundType;
  @IsOptional() @IsString() description?: string;
  @EmptyToUndefined() @IsOptional() @IsString() venue?: string;
  @EmptyToUndefined() @IsOptional() @IsString() reportingInstructions?: string;
  @EmptyToUndefined() @IsOptional() @IsDateString() scheduledAt?: string;
}

export class DecideRoundDto {
  // Applications that clear this round; everyone else in it is auto-rejected.
  @IsArray() @IsString({ each: true }) advanceIds!: string[];
}

export class PlaceApplicantDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) offerCtc?: number;
  @IsOptional() @IsString() offerLetterUrl?: string;
}

export class RejectApplicantDto {
  @IsOptional() @IsString() reason?: string;
}

export class BulkRoundDto {
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) applicationIds!: string[];
}

export class AttendanceRecordDto {
  @IsString() applicationId!: string;
  @IsBoolean() attended!: boolean;
}

export class MarkRoundAttendanceDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records!: AttendanceRecordDto[];
}
