import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CompanyStatus } from '../schemas/company.schema';
import { AssignCompanyModuleDto } from '../../../rbac/dtos/company-module-assignment.dto';

/** Initial company-admin user created alongside the company. */
export class CompanyAdminDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'admin@abc.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'john.admin' })
  @IsString()
  @IsNotEmpty()
  userName: string;

  @ApiProperty({ example: 'SecurePass1', minLength: 7 })
  @IsString()
  @MinLength(7)
  password: string;

  @ApiPropertyOptional({ description: 'Optional Role _id' })
  @IsOptional()
  @IsMongoId()
  roleId?: string;
}

export class CreateCompanyDto {
  @ApiProperty({ example: 'ABC Corporation' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ example: 'ABC' })
  @IsString()
  @IsNotEmpty()
  shortName: string;

  @ApiPropertyOptional({ example: '123 Business St' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '+923001234567' })
  @IsOptional()
  @IsString()
  contactNo?: string;

  @ApiProperty({ example: 'info@abc.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsString()
  companyLogo?: string;

  @ApiPropertyOptional({ enum: CompanyStatus })
  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  @ApiProperty({
    description:
      'Required company-admin user provisioned with the company (login credentials)',
  })
  @ValidateNested()
  @Type(() => CompanyAdminDto)
  admin: CompanyAdminDto;

  @ApiPropertyOptional({
    type: [AssignCompanyModuleDto],
    description:
      'Modules + permission subsets to assign to this company (Super Admin)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignCompanyModuleDto)
  modules?: AssignCompanyModuleDto[];
}
