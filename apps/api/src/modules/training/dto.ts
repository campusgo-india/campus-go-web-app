import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { AssessmentPhase, SessionStatus, TrainingPillar } from '@campusgo/database';
import { NormalizeUrl } from '../../common/transforms';

export class CreateAssessmentDto {
  @IsString() @MinLength(2) name!: string;
  @IsEnum(TrainingPillar) pillar!: TrainingPillar;
  @IsEnum(AssessmentPhase) phase!: AssessmentPhase;
  @NormalizeUrl() @IsString() @MinLength(1) externalUrl!: string;
  @Type(() => Number) @IsInt() @Min(1) maxMarks!: number;
  // Optional — some tests are open-ended with no fixed date/time.
  @IsOptional() @IsDateString() scheduledAt?: string;
  // Targeting: omit/empty both = every active student at the college.
  @IsOptional() @IsArray() @IsString({ each: true }) targetProgrammes?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) targetBatchIds?: string[];
}

export class UpdateAssessmentDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsEnum(TrainingPillar) pillar?: TrainingPillar;
  @IsOptional() @IsEnum(AssessmentPhase) phase?: AssessmentPhase;
  @IsOptional() @NormalizeUrl() @IsString() @MinLength(1) externalUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxMarks?: number;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) targetProgrammes?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) targetBatchIds?: string[];
}

export class ScoreRowDto {
  @IsString() @MinLength(1) studentId!: string;
  @Type(() => Number) @IsNumber() @Min(0) marksObtained!: number;
}

export class BulkScoreEntryDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScoreRowDto)
  rows!: ScoreRowDto[];
}

// The dropped file is read client-side and sent as base64 — CSV text or XLSX
// binary, both fit the same shape. fileName's extension picks the parser.
export class ImportScoresDto {
  @IsString() @MinLength(1) fileBase64!: string;
  @IsString() @MinLength(1) fileName!: string;
}

export class CreateSessionDto {
  @IsString() @MinLength(2) title!: string;
  @IsOptional() @IsEnum(TrainingPillar) pillar?: TrainingPillar;
  @IsOptional() @IsString() trainerName?: string;
  @IsOptional() @IsString() description?: string;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
  // Targeting: omit/empty both = every active student at the college.
  @IsOptional() @IsArray() @IsString({ each: true }) targetProgrammes?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) targetBatchIds?: string[];
}

export class UpdateSessionDto {
  @IsOptional() @IsString() @MinLength(2) title?: string;
  @IsOptional() @IsEnum(TrainingPillar) pillar?: TrainingPillar;
  @IsOptional() @IsString() trainerName?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsEnum(SessionStatus) status?: SessionStatus;
  @IsOptional() @IsArray() @IsString({ each: true }) targetProgrammes?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) targetBatchIds?: string[];
}

export class CreateBatchDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateBatchDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() description?: string;
}

export class SetBatchMembersDto {
  @IsArray() @IsString({ each: true }) studentIds!: string[];
}

export class AttendanceRowDto {
  @IsString() @MinLength(1) studentId!: string;
  @IsBoolean() present!: boolean;
}

export class MarkAttendanceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceRowDto)
  rows!: AttendanceRowDto[];
}

// Bulk attendance import — same base64 file shape as ImportScoresDto.
export class ImportAttendanceDto {
  @IsString() @MinLength(1) fileBase64!: string;
  @IsString() @MinLength(1) fileName!: string;
}

export class SubmitFeedbackDto {
  @IsString() @MinLength(1) sessionId!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) contentQuality!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) trainerDelivery!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) relevanceToPlacement!: number;
}
