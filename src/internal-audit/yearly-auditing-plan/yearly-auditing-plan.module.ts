import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { YearlyAuditingPlanController } from './yearly-auditing-plan.controller';
import { YearlyAuditingPlanService } from './yearly-auditing-plan.service';
import { YearlyAuditingPlan, YearlyAuditingPlanSchema } from './schemas/yearly-auditing-plan.schema';
import { ProcessOwner, ProcessOwnerSchema } from '../process-owner/schemas/process-owner.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: YearlyAuditingPlan.name, schema: YearlyAuditingPlanSchema },
      { name: ProcessOwner.name, schema: ProcessOwnerSchema },
    ]),
  ],
  controllers: [YearlyAuditingPlanController],
  providers: [YearlyAuditingPlanService],
  exports: [YearlyAuditingPlanService],
})
export class YearlyAuditingPlanModule {}
