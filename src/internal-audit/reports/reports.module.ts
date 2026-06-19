import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Reports, ReportsSchema } from './schemas/reports.schema';
import { Checklist, ChecklistSchema } from '../create-checklist/schemas/checklist.schema';
import {
  ConductAudits,
  ConductAuditsSchema,
} from '../conduct-audits/schemas/conduct-audits.schema';
import {
  ChecklistAnswer,
  ChecklistAnswerSchema,
} from '../conduct-audits/schemas/checklist-answer.schema';
import {
  ChecklistQuestion,
  ChecklistQuestionSchema,
} from '../create-checklist/schemas/checklist-question.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reports.name, schema: ReportsSchema },
      { name: Checklist.name, schema: ChecklistSchema },
      { name: ConductAudits.name, schema: ConductAuditsSchema },
      { name: ChecklistAnswer.name, schema: ChecklistAnswerSchema },
      { name: ChecklistQuestion.name, schema: ChecklistQuestionSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
