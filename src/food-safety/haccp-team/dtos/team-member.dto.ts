import { IsArray, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TeamMemberDto {
  @IsOptional()
  @IsMongoId()
  profileId?: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  designation: string;

  @IsOptional()
  @IsString()
  roleInTeam?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trainingAttended?: string[];

  @IsOptional()
  @IsString()
  documentUrl?: string;
}
