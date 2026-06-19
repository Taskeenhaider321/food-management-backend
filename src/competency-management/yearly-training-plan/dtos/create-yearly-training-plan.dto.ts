// TEST/hr/yearly-training-plan/dtos/create-yearly-training-plan.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class YearlyPlanTrainingDto {
  @ApiProperty()
  @IsString()
  Training: string;
}

export class YearlyPlanMonthDto {
  @ApiProperty()
  @IsString()
  MonthName: string;

  @ApiProperty({ type: [YearlyPlanTrainingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => YearlyPlanTrainingDto)
  Trainings: YearlyPlanTrainingDto[];
}

export class CreateYearlyTrainingPlanDto {
  @ApiPropertyOptional({
    description:
      'Optional. Omitted values are resolved from the signed-in user (assigned department or first company department).',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? undefined : value,
  )
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Defaults to the signed-in user name or email when omitted.',
  })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiProperty()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return value;
    const n = typeof value === 'number' ? value : parseInt(String(value), 10);
    return Number.isNaN(n) ? value : n;
  })
  @IsNumber()
  Year: number;

  @ApiProperty({ type: [YearlyPlanMonthDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => YearlyPlanMonthDto)
  Month: YearlyPlanMonthDto[];
}
