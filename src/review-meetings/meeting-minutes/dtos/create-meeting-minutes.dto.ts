import {
  IsArray,
  IsDateString,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MinutesRecordDto {
  @ApiProperty({ description: 'Agenda subdocument id from the review plan' })
  @IsMongoId()
  agendaId: string;

  @ApiProperty({ description: 'Review team member id' })
  @IsMongoId()
  participant: string;

  @ApiPropertyOptional({ description: 'Rich text (HTML) discussion points' })
  @IsOptional()
  @IsString()
  discussion?: string;

  @ApiPropertyOptional({
    description: 'Rich text (HTML) responsibility / action required',
  })
  @IsOptional()
  @IsString()
  responsibility?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsDateString()
  targetDate?: string;
}

export class CreateMeetingMinutesDto {
  @ApiProperty({ description: 'Review plan (MRM) id' })
  @IsMongoId()
  reviewPlan: string;

  @ApiProperty({ type: [MinutesRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MinutesRecordDto)
  records: MinutesRecordDto[];
}
