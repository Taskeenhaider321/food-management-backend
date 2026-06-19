import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRoleType } from '../schemas/user.schema';

const USER_ROLE_TYPES: UserRoleType[] = [
  UserRoleType.SUPER_ADMIN,
  UserRoleType.COMPANY_ADMIN,
  UserRoleType.COMPANY_USER,
  UserRoleType.COMPANY_TRAINER,
  UserRoleType.COMPANY_EMPLOYEE,
];

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Required for PATCH users/update-user' })
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(7)
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  roleId?: string;

  @ApiPropertyOptional({ enum: USER_ROLE_TYPES })
  @IsOptional()
  @IsIn(USER_ROLE_TYPES)
  roleType?: UserRoleType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSuspended?: boolean;
}
