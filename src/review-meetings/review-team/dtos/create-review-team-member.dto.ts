import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewTeamMemberDto {
  @ApiProperty({ description: 'Full name of the team member' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNo?: string;

  @ApiPropertyOptional({
    description:
      'Role in team, e.g. Chairperson, Management Representative, Department Head, Reviewer, Observer, Participant, Other',
  })
  @IsOptional()
  @IsString()
  roleInTeam?: string;
}

export class BulkCreateReviewTeamMembersDto {
  @ApiProperty({ type: [CreateReviewTeamMemberDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateReviewTeamMemberDto)
  members: CreateReviewTeamMemberDto[];
}
