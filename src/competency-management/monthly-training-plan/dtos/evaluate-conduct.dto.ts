import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ConductDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty()
  @IsString()
  url: string;
}

export class EvaluateEmployeeDto {
  @ApiProperty()
  @IsMongoId()
  monthlyPlanId: string;

  @ApiProperty()
  @IsMongoId()
  employeeId: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  marks: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiProperty()
  @IsBoolean()
  isPresent: boolean;

  @ApiProperty()
  @IsBoolean()
  isPass: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewComments?: string;
}

export class ConductEmployeeDto {
  @ApiProperty()
  @IsMongoId()
  monthlyPlanId: string;

  @ApiProperty()
  @IsMongoId()
  employeeId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conductNotes?: string;

  @ApiPropertyOptional({ type: [ConductDocumentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConductDocumentDto)
  conductDocuments?: ConductDocumentDto[];
}
