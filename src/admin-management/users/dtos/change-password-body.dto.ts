import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/** Body for `PATCH /users/:id/change-password` (user id is in the path). */
export class ChangePasswordBodyDto {
  @ApiProperty({ description: 'New password (min 7 characters)', example: 'NewSecurePass123' })
  @IsString()
  @MinLength(7)
  password: string;
}
