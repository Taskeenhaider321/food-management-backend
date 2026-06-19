import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConductAuditsController } from './conduct-audits.controller';
import { ConductAuditsService } from './conduct-audits.service';
import { ConductAudits, ConductAuditsSchema } from './schemas/conduct-audits.schema';
import { ChecklistAnswer, ChecklistAnswerSchema } from './schemas/checklist-answer.schema';
import { Checklist, ChecklistSchema } from '../create-checklist/schemas/checklist.schema';
import { ChecklistQuestion, ChecklistQuestionSchema } from '../create-checklist/schemas/checklist-question.schema';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ConductAudits.name, schema: ConductAuditsSchema },
      { name: ChecklistAnswer.name, schema: ChecklistAnswerSchema },
      { name: Checklist.name, schema: ChecklistSchema },
      { name: ChecklistQuestion.name, schema: ChecklistQuestionSchema },
      { name: 'User', schema: {} },
    ]),
    CloudinaryModule,
  ],
  controllers: [ConductAuditsController],
  providers: [ConductAuditsService],
})
export class ConductAuditsModule {}
