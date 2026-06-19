import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CompanyStatus } from '../schemas/company.schema';

/** Initial company-admin user created alongside the company. */
export class CompanyAdminDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'admin@abc.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'john.admin' })
  @IsString()
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
  companyName: string;

  @ApiProperty({ example: 'ABC' })
  @IsString()
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
  email: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsString()
  companyLogo?: string;

  @ApiPropertyOptional({ enum: CompanyStatus })
  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  @ApiPropertyOptional({ description: 'Bootstrap a company-admin user during company creation' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CompanyAdminDto)
  admin?: CompanyAdminDto;
}
