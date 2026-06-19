import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class DecisionDto {
  @IsOptional()
  @IsString()
  Hazard?: string;

  @IsOptional()
  @IsBoolean()
  Q1?: boolean;

  @IsOptional()
  @IsBoolean()
  Q1A?: boolean;

  @IsOptional()
  @IsBoolean()
  Q2?: boolean;

  @IsOptional()
  @IsBoolean()
  Q3?: boolean;

  @IsOptional()
  @IsBoolean()
  Q4?: boolean;
}
