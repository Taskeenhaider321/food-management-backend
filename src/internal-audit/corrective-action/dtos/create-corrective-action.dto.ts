import { IsMongoId, IsString, IsArray } from 'class-validator';

export class CreateCorrectiveActionDto {
  @IsMongoId()
  userId: string;

  @IsMongoId()
  Report: string;

  @IsArray()
  Answers: any[];

  @IsArray()
  files: any[];
}
