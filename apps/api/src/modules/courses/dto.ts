import { IsArray, IsIn, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

const DEGREE_LEVELS = ['UG', 'PG'] as const;

export class CreateSchoolDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) programmes?: string[];
  @IsOptional() @IsIn(DEGREE_LEVELS) degreeLevel?: 'UG' | 'PG';
}

export class UpdateSchoolDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) programmes?: string[];
  @IsOptional() @IsIn(DEGREE_LEVELS) degreeLevel?: 'UG' | 'PG';
  // { oldProgrammeName: newProgrammeName } for entries the caller edited in
  // place (not added/removed) — lets the service cascade the rename to
  // existing students/job eligibility instead of silently orphaning them.
  // A comma-separated re-type of the whole list can't otherwise tell a
  // rename apart from a remove+add.
  @IsOptional() @IsObject() programmeRenames?: Record<string, string>;
}
