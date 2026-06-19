import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MonthlyAuditingPlanController } from './monthly-auditing-plan.controller';
import { MonthlyAuditingPlanService } from './monthly-auditing-plan.service';
import { MonthlyAuditingPlan, MonthlyAuditingPlanSchema } from './schemas/monthly-auditing-plan.schema';
import { ProcessOwner, ProcessOwnerSchema } from '../process-owner/schemas/process-owner.schema';
import { User, UserSchema } from '../../admin-management/users/schemas/user.schema';
import { YearlyAuditingPlan, YearlyAuditingPlanSchema } from '../yearly-auditing-plan/schemas/yearly-auditing-plan.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MonthlyAuditingPlan.name, schema: MonthlyAuditingPlanSchema },
      { name: YearlyAuditingPlan.name, schema: YearlyAuditingPlanSchema },
      { name: ProcessOwner.name, schema: ProcessOwnerSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [MonthlyAuditingPlanController],
  providers: [MonthlyAuditingPlanService],
})
export class MonthlyAuditingPlanModule {}
