import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TrainingDocument = Training & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Training {
  @Prop({ required: true })
  trainingName: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Company' })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  UserDepartment: Types.ObjectId;

  @Prop({ required: true })
  evaluationCriteria: string;

  @Prop()
  TrainingMaterial: string;

  @Prop()
  creationDate: Date;
}

export const TrainingSchema = SchemaFactory.createForClass(Training);

TrainingSchema.index({ companyId: 1, UserDepartment: 1 });
TrainingSchema.index({ trainingName: 1, companyId: 1 });
