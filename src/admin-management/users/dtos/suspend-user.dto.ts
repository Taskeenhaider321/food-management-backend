import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SuspendUserDto {
  @ApiProperty({ description: 'true to suspend the user, false to activate (lift suspension)' })
  @IsBoolean()
  suspended: boolean;
}
