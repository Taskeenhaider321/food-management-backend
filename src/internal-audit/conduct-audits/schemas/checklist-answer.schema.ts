import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema()
export class ChecklistAnswer extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ChecklistQuestion', required: true })
  question: MongooseSchema.Types.ObjectId;

  @Prop()
  Remarks?: string;

  @Prop()
  EvidenceDoc?: string;

  @Prop()
  YesNoAnswer?: string;

  @Prop()
  GradingSystemAnswer?: number;

  @Prop()
  GoodFairPoorAnswer?: string;

  @Prop()
  SafeAtRiskAnswer?: string;

  @Prop()
  PassFailAnswer?: string;

  @Prop()
  CompliantNonCompliantAnswer?: string;

  @Prop()
  ConformObservationAnswer?: string;
}

export const ChecklistAnswerSchema = SchemaFactory.createForClass(ChecklistAnswer);
