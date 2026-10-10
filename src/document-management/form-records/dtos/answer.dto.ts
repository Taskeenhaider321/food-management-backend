import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsMongoId,
} from 'class-validator';

export class AnswerDto {
  @IsMongoId()
  question: string;

  @IsOptional()
  @IsArray()
  CheckboxesAnswers?: string[];

  @IsOptional()
  @IsString()
  multipleChoiceAnswer?: string;

  @IsOptional()
  @IsString()
  shortTextAnswer?: string;

  @IsOptional()
  @IsString()
  longTextAnswer?: string;

  @IsOptional()
  @IsArray()
  checkboxGridAnswers?: string[];

  @IsOptional()
  @IsArray()
  multipleChoiceGridAnswers?: string[];

  @IsOptional()
  @IsString()
  dropdownAnswer?: string;

  @IsOptional()
  @IsString()
  timeAnswer?: string;

  @IsOptional()
  @IsString()
  dateAnswer?: string;

  @IsOptional()
  @IsNumber()
  linearScaleAnswer?: number;
}
