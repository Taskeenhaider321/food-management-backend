import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsString, MinLength } from 'class-validator';

export class AddAccountCredentialsDto {
  @ApiProperty()
  @IsMongoId()
  auditorId: string;

  @ApiProperty()
  @IsString()
  userName: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;
}

export class ResetAccountCredentialsDto {
  @ApiProperty()
  @IsMongoId()
  auditorId: string;

  @ApiProperty()
  @IsString()
  newUserName: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}
