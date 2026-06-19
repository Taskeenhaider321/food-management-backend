import { IsMongoId, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AnswerDto } from './answer.dto';

export class CreateFormRecordsDto {
  @IsMongoId()
  departmentId: string;

  @IsMongoId()
  Form: string;

  @IsString()
  filledBy: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
