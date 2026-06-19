import { IsString, IsNotEmpty } from 'class-validator';

export class ApproveFoodSafetyPlanDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  approvedBy: string;
}
