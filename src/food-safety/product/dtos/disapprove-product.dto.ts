import { IsString, IsNotEmpty } from 'class-validator';

export class DisapproveProductDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  Reason: string;

  @IsString()
  @IsNotEmpty()
  disapprovedBy: string;
}
