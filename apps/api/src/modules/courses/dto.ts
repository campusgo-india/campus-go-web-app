import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSchoolDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) programmes?: string[];
}

export class UpdateSchoolDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) programmes?: string[];
}
