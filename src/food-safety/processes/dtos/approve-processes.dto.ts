import { IsString, IsNotEmpty } from 'class-validator';

export class ApproveProcessesDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  approvedBy: string;
}
