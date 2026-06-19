import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ _id: false })
class ProcessLimit {
  @Prop()
  TargetRange?: string;

  @Prop()
  ActionPoint?: string;

  @Prop()
  CriticalCtrlPoint?: string;
}

@Schema({ _id: false })
class MonitoringPlan {
  @Prop()
  Who?: string;

  @Prop()
  When?: string;

  @Prop()
  What?: string;

  @Prop()
  How?: string;
}

@Schema({ _id: false })
class VerificationPlan {
  @Prop()
  Who?: string;

  @Prop()
  When?: string;

  @Prop()
  What?: string;

  @Prop()
  How?: string;
}

@Schema()
export class Plan extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Decision' })
  Decision?: MongooseSchema.Types.ObjectId;

  @Prop()
  HazardToControl?: string;

  @Prop()
  ControlMeasures?: string;

  @Prop()
  JustificationLink?: string;

  @Prop()
  CorrectiveAction?: string;

  @Prop()
  MonitoringRef?: string;

  @Prop()
  VerificationRef?: string;

  @Prop({ type: ProcessLimit })
  ProcessLimit?: ProcessLimit;

  @Prop({ type: MonitoringPlan })
  MonitoringPlan?: MonitoringPlan;

  @Prop({ type: VerificationPlan })
  VerificationPlan?: VerificationPlan;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
