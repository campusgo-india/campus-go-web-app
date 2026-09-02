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
} from 'class-validator';
import { ApplicationStage, InterviewResult } from '@campusgo/database';

export class ChangeStageDto {
  @IsEnum(ApplicationStage) stage!: ApplicationStage;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() rejectionReason?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) offerCtc?: number;
}

export class CreateInterviewDto {
  @IsString() @MinLength(1) roundName!: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsString() mode?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsEnum(InterviewResult) result?: InterviewResult;
  @IsOptional() @IsString() feedback?: string;
}

export class UpdateInterviewDto {
  @IsOptional() @IsString() @MinLength(1) roundName?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsString() mode?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsEnum(InterviewResult) result?: InterviewResult;
  @IsOptional() @IsString() feedback?: string;
}

// Manually add applicants to a job by roll number — for late requests after a
// job has closed, or bulk-importing a company's own applicant tracker.
// Deliberately bypasses the self-service apply() checks (job status,
// deadline, eligibility): an officer choosing to do this is the override.
export class BulkAddApplicantsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  rollNumbers!: string[];
}

export class VerifyOfferDto {
  @IsBoolean() approve!: boolean;
}
