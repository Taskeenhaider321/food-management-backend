import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';
import { CreateYearlyPlanDto } from './create-yearly-plan.dto';

export class UpdateYearlyPlanDto extends CreateYearlyPlanDto {
  @ApiProperty({ description: 'Yearly plan document _id' })
  @IsMongoId()
  _id: string;
}
