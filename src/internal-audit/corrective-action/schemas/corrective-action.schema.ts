import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ _id: false })
export class CorrectiveAnswer {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ChecklistAnswer', required: true })
  question: MongooseSchema.Types.ObjectId;

  @Prop()
  Remarks?: string;

  @Prop()
  Correction?: string;

  @Prop()
  CorrectiveAction?: string;

  @Prop()
  RootCause?: string;

  @Prop()
  EvidenceDoc?: string;

  @Prop()
  CorrectiveDoc?: string;

  @Prop({ type: Object })
  ComplianceLevelValue?: any;
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class CorrectiveAction extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Reports', required: true })
  Report: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department' })
  UserDepartment: MongooseSchema.Types.ObjectId;

  @Prop({ type: [CorrectiveAnswer] })
  Answers: CorrectiveAnswer[];

  @Prop()
  CorrectionBy: string;

  @Prop({ type: Date })
  CorrectionDate: Date;
}

export const CorrectiveActionSchema = SchemaFactory.createForClass(CorrectiveAction);
