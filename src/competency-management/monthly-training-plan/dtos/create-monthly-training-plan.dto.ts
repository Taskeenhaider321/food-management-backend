// TEST/hr/monthly-training-plan/dtos/create-monthly-training-plan.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsArray,
  IsBoolean,
  IsOptional,
  IsEnum,
  ArrayMinSize,
  IsMongoId,
  IsDateString,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateMonthlyTrainingPlanDto {
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

  @ApiProperty()
  @IsString()
  createdBy: string;

  @ApiProperty({
    type: [String],
    description: 'One or more trainer user IDs',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  Trainers: string[];

  @ApiProperty()
  @IsString()
  Training: string;

  @ApiProperty()
  @IsString()
  Year: string;

  @ApiProperty()
  @IsString()
  Month: string;

  @ApiPropertyOptional({
    description:
      'Calendar day of month (legacy). Omit when sending SessionStartAt / SessionEndAt.',
  })
  @ValidateIf((o) => !o.SessionStartAt)
  @Type(() => Number)
  @IsNumber()
  Date?: number;

  @ApiPropertyOptional({
    description:
      'Start time e.g. 09:30 (legacy). Omit when sending SessionStartAt / SessionEndAt.',
  })
  @ValidateIf((o) => !o.SessionStartAt)
  @IsString()
  Time?: string;

  @ApiPropertyOptional({
    description: 'Display label; defaults to department name when omitted',
  })
  @IsOptional()
  @IsString()
  DepartmentText?: string;

  @ApiProperty()
  @IsString()
  Venue: string;

  @ApiPropertyOptional({
    description: 'Legacy duration label. Omit when sending SessionStartAt / SessionEndAt.',
  })
  @ValidateIf((o) => !o.SessionStartAt)
  @IsString()
  Duration?: string;

  @ApiPropertyOptional({
    description: 'ISO 8601 start (preferred with SessionEndAt).',
  })
  @IsOptional()
  @IsDateString()
  SessionStartAt?: string;

  @ApiPropertyOptional({
    description: 'ISO 8601 end (must be after SessionStartAt).',
  })
  @IsOptional()
  @IsDateString()
  SessionEndAt?: string;

  @ApiProperty({ enum: ['Internal', 'External'] })
  @IsEnum(['Internal', 'External'])
  InternalExternal: string;

  @ApiPropertyOptional({
    enum: ['Tentative', 'Pending', 'Scheduled', 'Postponed', 'Cancelled'],
  })
  @IsOptional()
  @IsEnum(['Tentative', 'Pending', 'Scheduled', 'Postponed', 'Cancelled'])
  ScheduleStatus?: string;
}

export class AssignEmployeeDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  employeeIds: string[];

  @ApiProperty()
  @IsString()
  monthlyId: string;
}

export class UpdateTrainingStatusDto {
  @ApiProperty()
  @IsString()
  EmployeeId: string;

  @ApiProperty()
  @IsString()
  trainingId: string;

  @ApiProperty()
  @IsNumber()
  Marks: number;

  @ApiProperty()
  @IsBoolean()
  IsPass: boolean;

  @ApiProperty()
  @IsBoolean()
  IsPresent: boolean;

  @ApiProperty()
  @IsString()
  Remarks: string;
}

export class UploadImagesDto {
  @ApiProperty()
  @IsString()
  planId: string;

  @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' } })
  Images: any;
}
