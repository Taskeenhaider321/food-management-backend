import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AgendaItemDto {
  @ApiPropertyOptional({
    description: 'Existing agenda id (preserved on update)',
  })
  @IsOptional()
  @IsMongoId()
  _id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Rich text (HTML) description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Review team member id this agenda is assigned to',
  })
  @IsOptional()
  @IsMongoId()
  participant?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  order?: number;
}

export class CreateReviewPlanDto {
  @ApiPropertyOptional({
    description: 'Unique MRM number; auto-generated (MRM-001) when omitted',
  })
  @IsOptional()
  @IsString()
  mrmNumber?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  venue: string;

  @ApiProperty({ example: '2026-06-15' })
  @IsDateString()
  meetingDate: string;

  @ApiProperty({ example: '14:30' })
  @IsString()
  @IsNotEmpty()
  meetingTime: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty({ type: [String], description: 'Review team member ids' })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  participants: string[];

  @ApiProperty({ type: [AgendaItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AgendaItemDto)
  agendas: AgendaItemDto[];
}
