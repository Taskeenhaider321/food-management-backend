import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  Matches,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Fields a user may change on their own profile. Role, company, department,
 * username and suspension state are deliberately excluded.
 */
export class UpdateMyProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Display name; derived from first + last name when omitted',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({
    description:
      'Profile photo URL (https). Send an empty string to remove it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Matches(/^(https:\/\/\S+)?$/, { message: 'avatarUrl must be an https URL' })
  avatarUrl?: string;
}

export class ChangeMyPasswordDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @ApiPropertyOptional({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}
