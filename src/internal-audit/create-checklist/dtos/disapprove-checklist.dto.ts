import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsString } from 'class-validator';

export class DisapproveChecklistDto {
  @ApiProperty()
  @IsMongoId()
  id: string;

  @ApiProperty()
  @IsString()
  disapprovedBy: string;

  @ApiProperty()
  @IsString()
  Reason: string;
}
