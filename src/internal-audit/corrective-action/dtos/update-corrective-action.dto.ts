import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator';

export class UpdateCorrectiveActionDto {
  @IsMongoId()
  userId: string;

  @IsMongoId()
  actionId: string;

  @IsArray()
  Answers: any[];

  @IsArray()
  files: any[];

  @IsOptional()
  @IsString()
  updatedBy?: string;
}
