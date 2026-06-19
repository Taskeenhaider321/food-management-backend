import { IsString, IsNotEmpty } from 'class-validator';

export class ApproveProductDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  approvedBy: string;
}
