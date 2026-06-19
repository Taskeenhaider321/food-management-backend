import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class UpdateMeetingParticipantsDto {
  @ApiProperty()
  @IsMongoId()
  id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleInTeam?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactNo?: string;
}
