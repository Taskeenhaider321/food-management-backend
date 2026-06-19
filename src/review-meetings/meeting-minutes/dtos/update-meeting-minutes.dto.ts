import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MinutesRecordDto } from './create-meeting-minutes.dto';

export class UpdateMeetingMinutesDto {
  @ApiPropertyOptional({ type: [MinutesRecordDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MinutesRecordDto)
  records?: MinutesRecordDto[];
}
