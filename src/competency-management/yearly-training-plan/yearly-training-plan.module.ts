// TEST/hr/yearly-training-plan/yearly-training-plan.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { YearlyTrainingPlanController } from './yearly-training-plan.controller';
import { YearlyTrainingPlanService } from './yearly-training-plan.service';
import {
  YearlyTrainingPlan,
  YearlyTrainingPlanSchema,
} from './schemas/yearly-training-plan.schema';
import {
  Department,
  DepartmentSchema,
} from '../../admin-management/department/schemas/department.schema';
import { Training, TrainingSchema } from '../training/schemas/training.schema';
import {
  Company,
  CompanySchema,
} from '../../admin-management/company/schemas/company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: YearlyTrainingPlan.name, schema: YearlyTrainingPlanSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Training.name, schema: TrainingSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [YearlyTrainingPlanController],
  providers: [YearlyTrainingPlanService],
  exports: [YearlyTrainingPlanService],
})
export class YearlyTrainingPlanModule {}
