// TEST/hr/monthly-training-plan/monthly-training-plan.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MonthlyTrainingPlanController } from './monthly-training-plan.controller';
import { MonthlyTrainingPlanService } from './monthly-training-plan.service';
import { MonthlyTrainingPlan, MonthlyTrainingPlanSchema } from './schemas/monthly-training-plan.schema';
import { User, UserSchema } from '../../admin-management/users/schemas/user.schema';
import { Training, TrainingSchema } from '../training/schemas/training.schema';
import { YearlyTrainingPlan, YearlyTrainingPlanSchema } from '../yearly-training-plan/schemas/yearly-training-plan.schema';
import { Employee, EmployeeSchema } from '../employee/schemas/employee.schema';
import { Department, DepartmentSchema } from '../../admin-management/department/schemas/department.schema';
import { Profile, ProfileSchema } from '../../admin-management/profile/schemas/profile.schema';
import { Trainer, TrainerSchema } from '../trainer/schemas/trainer.schema';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MonthlyTrainingPlan.name, schema: MonthlyTrainingPlanSchema },
      { name: User.name, schema: UserSchema },
      { name: Training.name, schema: TrainingSchema },
      { name: YearlyTrainingPlan.name, schema: YearlyTrainingPlanSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Profile.name, schema: ProfileSchema },
      { name: Trainer.name, schema: TrainerSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [MonthlyTrainingPlanController],
  providers: [MonthlyTrainingPlanService],
  exports: [MonthlyTrainingPlanService],
})
export class MonthlyTrainingPlanModule {}
