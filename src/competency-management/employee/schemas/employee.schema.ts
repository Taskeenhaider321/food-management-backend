import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EmployeeDocument = Employee & Document;

@Schema({ _id: false })
export class EmployeeTrainingEntry {
  @Prop({ type: Types.ObjectId, ref: 'Training' })
  training?: Types.ObjectId;

  @Prop({ enum: ['Pending', 'Active'], default: 'Pending' })
  resultStatus?: string;

  @Prop()
  marks?: number;

  @Prop()
  remarks?: string;

  @Prop({ default: false })
  isPresent?: boolean;

  @Prop({ default: false })
  isPass?: boolean;
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Employee {
  @Prop({ type: Types.ObjectId, ref: 'Profile', required: true })
  profileId: Types.ObjectId;

  @Prop()
  designation?: string;

  @Prop()
  cv?: string;

  @Prop({ type: [EmployeeTrainingEntry], default: [] })
  trainings: EmployeeTrainingEntry[];
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);

EmployeeSchema.index({ profileId: 1 });
EmployeeSchema.index({ 'trainings.training': 1 });
