import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { YearlyPlanMonthDto } from './create-yearly-training-plan.dto';

export class UpdateYearlyTrainingPlanDto {
  @ApiPropertyOptional({ description: 'Department ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  Year?: number;

  @ApiPropertyOptional({ type: [YearlyPlanMonthDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => YearlyPlanMonthDto)
  Month?: YearlyPlanMonthDto[];

  @ApiPropertyOptional({
    enum: ['Tentative', 'Pending', 'Scheduled', 'Postponed', 'Cancelled'],
  })
  @IsOptional()
  @IsEnum(['Tentative', 'Pending', 'Scheduled', 'Postponed', 'Cancelled'])
  ScheduleStatus?: string;

  @ApiPropertyOptional({ description: 'Optional note stored in status history' })
  @IsOptional()
  @IsString()
  statusNote?: string;
}
