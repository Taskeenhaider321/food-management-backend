import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FoodSafetyPlanController } from './food-safety-plan.controller';
import { FoodSafetyPlanService } from './food-safety-plan.service';
import { FoodSafetySchema } from './schemas/food-safety-plan.schema';
import { PlanSchema } from './schemas/plan.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'FoodSafety', schema: FoodSafetySchema },
      { name: 'Plan', schema: PlanSchema },
    ]),
  ],
  controllers: [FoodSafetyPlanController],
  providers: [FoodSafetyPlanService],
  exports: [FoodSafetyPlanService],
})
export class FoodSafetyPlanModule {}
