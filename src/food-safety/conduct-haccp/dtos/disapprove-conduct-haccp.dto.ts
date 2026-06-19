import { IsString, IsNotEmpty } from 'class-validator';

export class DisapproveConductHaccpDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  Reason: string;

  @IsString()
  @IsNotEmpty()
  DisapprovedBy: string;
}
