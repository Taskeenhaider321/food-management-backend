import {
  IsArray,
  IsDateString,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AgendaItemDto } from './create-review-plan.dto';

export class UpdateReviewPlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mrmNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  venue?: string;

  @ApiPropertyOptional({ example: '2026-06-15' })
  @IsOptional()
  @IsDateString()
  meetingDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  participants?: string[];

  @ApiPropertyOptional({ type: [AgendaItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgendaItemDto)
  agendas?: AgendaItemDto[];
}
