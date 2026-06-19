import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { UserRoleType } from '../schemas/user.schema';

const CREATABLE_ROLE_TYPES: UserRoleType[] = [
  UserRoleType.COMPANY_ADMIN,
  UserRoleType.COMPANY_USER,
];

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

  @ApiPropertyOptional({ description: 'Optional Role _id' })
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({ description: 'Optional Company _id' })
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  // @ApiPropertyOptional({ enum: CREATABLE_ROLE_TYPES, default: UserRoleType.COMPANY_USER })
  // @IsOptional()
  // @IsIn(CREATABLE_ROLE_TYPES)
  // roleType?: UserRoleType;

  @ApiPropertyOptional({ description: 'Overrides batch departmentId for this user' })
  @IsOptional()
  // @IsMongoId()
  departmentId?: string;
}

export class CreateUserDto {
  @ApiProperty({ type: [UserCoreDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserCoreDto)
  users: UserCoreDto[];
}
