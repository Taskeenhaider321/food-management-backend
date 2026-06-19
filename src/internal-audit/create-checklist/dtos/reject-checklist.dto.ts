import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsString } from 'class-validator';

export class RejectChecklistDto {
  @ApiProperty()
  @IsMongoId()
  id: string;

  @ApiProperty()
  @IsString()
  rejectedBy: string;

  @ApiProperty()
  @IsString()
  Reason: string;
}
