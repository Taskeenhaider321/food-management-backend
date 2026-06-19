import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CreateChecklistController } from './create-checklist.controller';
import { CreateChecklistService } from './create-checklist.service';
import { Checklist, ChecklistSchema } from './schemas/checklist.schema';
import { ChecklistQuestion, ChecklistQuestionSchema } from './schemas/checklist-question.schema';
import { ResponseGroup, ResponseGroupSchema } from './schemas/response-group.schema';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';
import { DefaultResponseGroupsSeed } from './seeds/default-response-groups.seed';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Checklist.name, schema: ChecklistSchema },
      { name: ChecklistQuestion.name, schema: ChecklistQuestionSchema },
      { name: ResponseGroup.name, schema: ResponseGroupSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [CreateChecklistController],
  providers: [CreateChecklistService, DefaultResponseGroupsSeed],
  exports: [CreateChecklistService],
})
export class CreateChecklistModule {}
