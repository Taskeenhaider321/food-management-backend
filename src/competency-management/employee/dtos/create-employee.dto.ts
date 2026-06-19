import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProfilePayloadDto } from '../../../admin-management/profile/dtos/profile-fields.dto';

export class EmployeeTrainingInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  training?: string;
}

export class EmployeeRolePayloadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional({ description: 'CV file URL after upload' })
  @IsOptional()
  @IsString()
  cv?: string;

  @ApiPropertyOptional({ type: [EmployeeTrainingInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeeTrainingInputDto)
  trainings?: EmployeeTrainingInputDto[];
}

export class EmployeeUserInputDto {
  @ApiProperty({ example: 'Ali' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'ali@test.com' })
  @IsEmail()
  email: string;

  /** Optional in request; generated on backend for employee onboarding. */
  @ApiPropertyOptional({ example: 'ali123' })
  @IsOptional()
  @IsString()
  userName?: string;

  /** Optional in request; generated on backend for employee onboarding. */
  @ApiPropertyOptional({ example: 'SecurePass1' })
  @IsOptional()
  @IsString()
  @MinLength(7)
  password?: string;

  @ApiPropertyOptional({ description: 'Optional RBAC role _id for the new user' })
  @IsOptional()
  @IsMongoId()
  roleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  departmentId?: string;
}

export class CreateEmployeeDto {
  @ApiProperty({ type: EmployeeUserInputDto })
  @ValidateNested()
  @Type(() => EmployeeUserInputDto)
  user: EmployeeUserInputDto;

  @ApiProperty({ type: ProfilePayloadDto })
  @ValidateNested()
  @Type(() => ProfilePayloadDto)
  profile: ProfilePayloadDto;

  @ApiProperty({ type: EmployeeRolePayloadDto })
  @ValidateNested()
  @Type(() => EmployeeRolePayloadDto)
  employee: EmployeeRolePayloadDto;
}
