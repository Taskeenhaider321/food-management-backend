import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ProfilePayloadDto } from '../../../admin-management/profile/dtos/profile-fields.dto';

/** Name + email; `companyId` is taken from the JWT in the controller, not the body. */
export class MeetingParticipantUserDto {
  @ApiProperty({ example: 'Ali' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'ali@company.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  departmentId?: string;
}

export class MeetingParticipantRoleDto {
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

export class CreateMeetingParticipantsDto {
  @ApiPropertyOptional({ description: 'Department scope for listings' })
  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @ApiProperty({ type: MeetingParticipantUserDto })
  @ValidateNested()
  @Type(() => MeetingParticipantUserDto)
  user: MeetingParticipantUserDto;

  @ApiProperty({ type: ProfilePayloadDto })
  @ValidateNested()
  @Type(() => ProfilePayloadDto)
  profile: ProfilePayloadDto;

  @ApiProperty({ type: MeetingParticipantRoleDto })
  @ValidateNested()
  @Type(() => MeetingParticipantRoleDto)
  participant: MeetingParticipantRoleDto;
}
