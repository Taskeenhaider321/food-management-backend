import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type YearlyTrainingPlanDocument = YearlyTrainingPlan & Document;

@Schema({ _id: false })
export class YearlyPlanStatusHistoryEntry {
  @Prop({ required: true })
  status: string;

  @Prop({ type: Date, default: Date.now })
  changedAt: Date;

  @Prop({ default: 'System' })
  changedBy: string;

  @Prop()
  note?: string;
}

class TrainingWeek {
  @Prop({ type: Types.ObjectId, ref: 'Training' })
  Training: Types.ObjectId;

  @Prop({ type: [Number], default: [] })
  WeekNumbers: number[];
}

class MonthPlan {
  @Prop({ required: true })
  MonthName: string;

  @Prop([TrainingWeek])
  Trainings: TrainingWeek[];
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class YearlyTrainingPlan {
  @Prop({ type: Types.ObjectId, ref: 'Department' })
  UserDepartment: Types.ObjectId;

  @Prop({ required: true })
  Year: number;

  @Prop([MonthPlan])
  Month: MonthPlan[];

  @Prop()
  CreatedBy: string;

  @Prop()
  CreationDate: Date;

  @Prop({
    enum: ['Tentative', 'Pending', 'Scheduled', 'Postponed', 'Cancelled'],
    default: 'Tentative',
  })
  ScheduleStatus: string;

  @Prop({ type: [YearlyPlanStatusHistoryEntry], default: [] })
  StatusHistory: YearlyPlanStatusHistoryEntry[];
}

export const YearlyTrainingPlanSchema = SchemaFactory.createForClass(YearlyTrainingPlan);

YearlyTrainingPlanSchema.index({ UserDepartment: 1, Year: 1 }, { unique: true });
