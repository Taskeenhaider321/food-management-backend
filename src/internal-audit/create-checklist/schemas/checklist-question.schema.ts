import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema()
export class ChecklistQuestion extends Document {
  @Prop({ required: true })
  questionText: string;

  @Prop()
  description?: string;

  @Prop({ default: false })
  Required: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ResponseGroup' })
  responseGroup?: MongooseSchema.Types.ObjectId;

  @Prop({
    enum: [
      'Yes/No',
      'GradingSystem',
      'Good/Fair/Poor',
      'Safe/AtRisk',
      'Pass/Fail',
      'Compliant/NonCompliant',
      'Conform/MinorNonConform/MajorNonConform/CriticalNonConform/Observation',
      'Custom',
    ],
  })
  ComplianceType?: string;

  @Prop({ default: 0 })
  order: number;
}

export const ChecklistQuestionSchema = SchemaFactory.createForClass(ChecklistQuestion);
