import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CorrectiveActionController } from './corrective-action.controller';
import { CorrectiveActionService } from './corrective-action.service';
import { CorrectiveAction, CorrectiveActionSchema } from './schemas/corrective-action.schema';
import { Reports, ReportsSchema } from '../reports/schemas/reports.schema';
import {
  ConductAudits,
  ConductAuditsSchema,
} from '../conduct-audits/schemas/conduct-audits.schema';
import { Checklist, ChecklistSchema } from '../create-checklist/schemas/checklist.schema';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CorrectiveAction.name, schema: CorrectiveActionSchema },
      { name: Reports.name, schema: ReportsSchema },
      { name: ConductAudits.name, schema: ConductAuditsSchema },
      { name: Checklist.name, schema: ChecklistSchema },
      { name: 'User', schema: {} },
    ]),
    CloudinaryModule,
  ],
  controllers: [CorrectiveActionController],
  providers: [CorrectiveActionService],
})
export class CorrectiveActionModule {}
