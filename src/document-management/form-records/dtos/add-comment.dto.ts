import { IsMongoId, IsString } from 'class-validator';

export class AddCommentDto {
  @IsMongoId()
  resultId: string;

  @IsString()
  comment: string;
}
