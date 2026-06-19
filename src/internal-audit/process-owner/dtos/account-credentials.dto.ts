import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsString, MinLength } from 'class-validator';

export class AddProcessOwnerCredentialsDto {
  @ApiProperty()
  @IsMongoId()
  processId: string;

  @ApiProperty()
  @IsString()
  userName: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;
}

export class ResetProcessOwnerCredentialsDto {
  @ApiProperty()
  @IsMongoId()
  processId: string;

  @ApiProperty()
  @IsString()
  newUserName: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}
