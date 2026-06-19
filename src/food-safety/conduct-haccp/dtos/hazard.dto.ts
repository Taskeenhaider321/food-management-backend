import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';

export class HazardDto {
  @IsOptional()
  @IsString()
  Process?: string;

  @IsString()
  @IsEnum(['Biological', 'Chemical', 'Physical', 'Halal', 'Allergen'])
  type: string;

  @IsOptional()
  @IsString()
  Description?: string;

  @IsOptional()
  @IsString()
  ControlMeasures?: string;

  @IsOptional()
  @IsNumber()
  @IsEnum([1, 2, 3, 4, 5])
  Occurence?: number;

  @IsOptional()
  @IsNumber()
  @IsEnum([1, 2, 3, 4, 5])
  Severity?: number;

  @IsOptional()
  @IsNumber()
  SignificanceLevel?: number;
}
