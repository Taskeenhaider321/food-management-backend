// TEST/account-creation/users/dtos/login-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    description: 'Username for login',
    example: 'johndoe123'
  })
  @IsString()
  @IsNotEmpty()
  userName: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePass123'
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
