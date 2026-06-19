import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ _id: false })
export class SelectedAnswer {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ChecklistAnswer' })
  Answer: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date })
  TargetDate?: Date;
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Reports extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ConductAudits', required: true })
  ConductAudit: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department' })
  UserDepartment: MongooseSchema.Types.ObjectId;

  @Prop({ type: [SelectedAnswer] })
  SelectedAnswers: SelectedAnswer[];

  @Prop({ type: Date })
  ReportDate: Date;

  @Prop()
  ReportBy: string;
}

export const ReportsSchema = SchemaFactory.createForClass(Reports);
