import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'User _id', example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  userId: string;

  @ApiProperty({ description: 'New password (min 7 characters)', example: 'NewSecurePass123' })
  @IsString()
  @MinLength(7)
  password: string;

  /** @deprecated Use `userId` */
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  _id?: string;

  /** @deprecated Use `password` */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(7)
  Password?: string;
}
