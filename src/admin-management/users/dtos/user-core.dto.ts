import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRoleType } from '../schemas/user.schema';

export const ROLE_VALUES: UserRoleType[] = [
  UserRoleType.SUPER_ADMIN,
  UserRoleType.COMPANY_ADMIN,
  UserRoleType.COMPANY_USER,
  UserRoleType.COMPANY_TRAINER,
  UserRoleType.COMPANY_EMPLOYEE,
];

/** Maps legacy seed values to canonical roleType. */
export function normalizeRoleType(input?: string): UserRoleType {
  if (!input) return UserRoleType.COMPANY_USER;
  const legacy: Record<string, UserRoleType> = {
    SUPER_ADMIN: UserRoleType.SUPER_ADMIN,
    COMPANY_ADMIN: UserRoleType.COMPANY_ADMIN,
    USER: UserRoleType.COMPANY_USER,
    COMPANY_TRAINER: UserRoleType.COMPANY_TRAINER,
    COMPANY_EMPLOYEE: UserRoleType.COMPANY_EMPLOYEE,
    'super-admin': UserRoleType.SUPER_ADMIN,
    'company-admin': UserRoleType.COMPANY_ADMIN,
    'company-user': UserRoleType.COMPANY_USER,
    'company-trainer': UserRoleType.COMPANY_TRAINER,
    'company-employee': UserRoleType.COMPANY_EMPLOYEE,
  };
  return legacy[input] ?? UserRoleType.COMPANY_USER;
}

/** Authentication + RBAC fields only (no profile data). */
export class UserCoreDto {
  @ApiProperty({ example: 'Ali' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'ali@test.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'ali123' })
  @IsString()
  userName: string;

  @ApiProperty({ example: 'SecurePass1' })
  @IsString()
  @MinLength(7)
  password: string;

  @ApiProperty({ description: 'Role _id' })
  @IsMongoId()
  roleId: string;

  @ApiPropertyOptional({
    enum: ROLE_VALUES,
    description:
      'Also accepts SUPER_ADMIN, COMPANY_ADMIN, USER for backward compatibility',
  })
  @IsOptional()
  @IsString()
  roleType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  departmentId?: string;
}
