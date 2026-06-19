import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSuperAdminDto {
  @ApiProperty({ example: 'Platform Admin' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'superadmin' })
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
