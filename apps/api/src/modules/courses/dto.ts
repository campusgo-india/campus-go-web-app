import { IsArray, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

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
}
