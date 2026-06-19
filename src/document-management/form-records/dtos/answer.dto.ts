import { IsOptional, IsString, IsNumber, IsArray, IsDateString, IsMongoId } from 'class-validator';

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
  @IsDateString()
  timeAnswer?: Date;

  @IsOptional()
  @IsDateString()
  dateAnswer?: Date;

  @IsOptional()
  @IsNumber()
  linearScaleAnswer?: number;
}
