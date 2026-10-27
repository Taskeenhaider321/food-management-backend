import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ProfilePayloadDto } from '../../../admin-management/profile/dtos/profile-fields.dto';

export class BulkImportEmployeeRowDto {
  @ApiProperty({ example: 'Ali' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Khan' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'Quality Officer' })
  @IsString()
  designation: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Matched case-insensitively within the actor company',
  })
  @IsOptional()
  @IsString()
  departmentName?: string;

  @ApiProperty({ enum: ['male', 'female', 'other', 'prefer-not-to-say'] })
  @IsIn(['male', 'female', 'other', 'prefer-not-to-say'])
  gender: string;

  @ApiPropertyOptional({ example: 'ali@test.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '1998-01-01' })
  @IsOptional()
  @IsString()
  dob?: string;

  @ApiPropertyOptional({ description: 'National identity / CNIC number' })
  @IsOptional()
  @IsString()
  nationalIdentity?: string;

  @ApiPropertyOptional({ description: 'CV file URL after upload' })
  @IsOptional()
  @IsString()
  cv?: string;

  @ApiPropertyOptional({ type: ProfilePayloadDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProfilePayloadDto)
  profile?: ProfilePayloadDto;
}

export class BulkImportEmployeesDto {
  @ApiProperty({ type: [BulkImportEmployeeRowDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkImportEmployeeRowDto)
  employees: BulkImportEmployeeRowDto[];
}
