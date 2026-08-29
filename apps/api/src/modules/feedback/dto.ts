import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PlacementStatus, RecruiterVerdict } from '@campusgo/database';

export class SubmitEmployerFeedbackDto {
  @IsString() @MinLength(1) @MaxLength(200) contactPerson!: string;
  @IsOptional() @IsString() @MaxLength(200) designation?: string;

  @IsInt() @Min(1) @Max(5) knowledgeSkills!: number;
  @IsInt() @Min(1) @Max(5) communicationSkills!: number;
  @IsInt() @Min(1) @Max(5) problemSolving!: number;
  @IsInt() @Min(1) @Max(5) teamworkAdaptability!: number;
  @IsInt() @Min(1) @Max(5) professionalism!: number;
  @IsInt() @Min(1) @Max(5) overallEmployability!: number;
  @IsInt() @Min(1) @Max(5) curriculumRelevance!: number;
  @IsInt() @Min(1) @Max(5) trainingEffectiveness!: number;

  @IsOptional() @IsString() @MaxLength(4000) improvementAreas?: string;
  @IsOptional() @IsString() @MaxLength(4000) suggestions?: string;
  @IsEnum(RecruiterVerdict) recruitAgain!: RecruiterVerdict;
}

export class SubmitStudentFeedbackDto {
  @IsString() @MinLength(1) @MaxLength(20) academicYear!: string;
  @IsEnum(PlacementStatus) placementStatus!: PlacementStatus;

  @IsInt() @Min(1) @Max(5) placementOpportunities!: number;
  @IsInt() @Min(1) @Max(5) careerGuidance!: number;
  @IsInt() @Min(1) @Max(5) placementTraining!: number;
  @IsInt() @Min(1) @Max(5) communicationOfOpportunities!: number;
  @IsInt() @Min(1) @Max(5) placementCellSupport!: number;
  @IsInt() @Min(1) @Max(5) industryInteraction!: number;
  @IsInt() @Min(1) @Max(5) overallSupport!: number;

  @IsOptional() @IsString() @MaxLength(4000) suggestions?: string;
}

export class SetFeedbackWindowDto {
  @IsBoolean() open!: boolean;
}
