import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProcessOwnerHooks } from '../hooks/process-owner.hooks';

export type ProcessOwnerDocument = ProcessOwner & Document;

@Schema({ _id: false })
export class DeputyProcessOwner {
  @Prop({ required: true })
  name: string;

  @Prop()
  designation?: string;

  @Prop()
  phoneNumber?: string;

  @Prop()
  email?: string;
}

export const DeputyProcessOwnerSchema = SchemaFactory.createForClass(DeputyProcessOwner);

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class ProcessOwner {
  @Prop()
  processCode?: string;

  @Prop({ type: Types.ObjectId, ref: 'Profile', required: true })
  profileId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  departmentId?: Types.ObjectId;

  @Prop({ required: true })
  processName: string;

  @Prop({
    enum: ['High Risk', 'Medium Risk', 'Low Risk'],
    required: true,
  })
  riskAssessment: string;

  @Prop({ type: [String], default: [] })
  activities: string[];

  @Prop({ type: [String], default: [] })
  specialInstructions: string[];

  @Prop({ type: [String], default: [] })
  shiftBreaks: string[];

  @Prop({ type: [String], default: [] })
  criticalAreas: string[];

  @Prop()
  reason?: string;

  @Prop({ default: false })
  hasDeputy: boolean;

  @Prop({ type: DeputyProcessOwnerSchema })
  deputyOwner?: DeputyProcessOwner;

  @Prop({ default: true })
  isEnabled: boolean;

  @Prop()
  createdBy?: string;
}

export const ProcessOwnerSchema = SchemaFactory.createForClass(ProcessOwner);

ProcessOwnerSchema.pre('save', ProcessOwnerHooks.generateProcessCode);
