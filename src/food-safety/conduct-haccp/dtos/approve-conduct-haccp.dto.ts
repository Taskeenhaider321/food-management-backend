import { IsString, IsNotEmpty } from 'class-validator';

export class ApproveConductHaccpDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  ApprovedBy: string;
}
