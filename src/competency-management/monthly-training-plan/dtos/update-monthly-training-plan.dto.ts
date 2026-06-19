import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  ArrayMinSize,
  IsMongoId,
  IsDateString,
} from 'class-validator';

export class UpdateMonthlyTrainingPlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  Trainers?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  Training?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  Year?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  Month?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  Date?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  Time?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  DepartmentText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  Venue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  Duration?: string;

  @ApiPropertyOptional({ enum: ['Internal', 'External'] })
  @IsOptional()
  @IsEnum(['Internal', 'External'])
  InternalExternal?: string;

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

  @ApiPropertyOptional({
    description: 'ISO 8601 session start (use with SessionEndAt).',
  })
  @IsOptional()
  @IsDateString()
  SessionStartAt?: string;

  @ApiPropertyOptional({
    description: 'ISO 8601 session end.',
  })
  @IsOptional()
  @IsDateString()
  SessionEndAt?: string;
}
