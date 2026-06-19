import { IsNotEmpty, IsString } from 'class-validator';

export class ActionReasonDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class WorkflowActionDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  actor: string;
}
