import { IsString, IsNotEmpty } from 'class-validator';

export class ApproveDecisionTreeDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  approvedBy: string;
}
