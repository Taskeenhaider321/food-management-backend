import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MonthlyTrainingPlanDocument = MonthlyTrainingPlan & Document;

@Schema({ _id: false })
export class ConductDocumentEntry {
  @Prop()
  label?: string;

  @Prop({ required: true })
  url: string;
}

@Schema({ _id: true })
export class SessionEmployeeEvaluation {
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
  employeeId: Types.ObjectId;

  @Prop()
  marks?: number;

  @Prop()
  rating?: number;

  @Prop({ default: false })
  isPresent?: boolean;

  @Prop({ default: false })
  isPass?: boolean;

  @Prop()
  remarks?: string;

  @Prop()
  reviewComments?: string;

  @Prop({
    enum: ['Pending', 'Evaluated', 'Conducted'],
    default: 'Pending',
  })
  status: string;

  @Prop()
  evaluatedAt?: Date;

  @Prop()
  evaluatedBy?: string;

  @Prop()
  conductNotes?: string;

  @Prop({ type: [ConductDocumentEntry], default: [] })
  conductDocuments: ConductDocumentEntry[];

  @Prop()
  conductedAt?: Date;

  @Prop()
  conductedBy?: string;
}

@Schema({ _id: false })
export class PlanStatusHistoryEntry {
  @Prop({ required: true })
  status: string;

  @Prop({ type: Date, default: Date.now })
  changedAt: Date;

  @Prop({ default: 'System' })
  changedBy: string;

  @Prop()
  note?: string;
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class MonthlyTrainingPlan {
  @Prop({ default: false })
  Assigned: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  UserDepartment: Types.ObjectId;

  @Prop()
  ActualDate: Date;

  @Prop({ enum: ['Conducted', 'Not Conducted'], default: 'Not Conducted' })
  TrainingResultStatus: string;

  @Prop()
  Date: number;

  @Prop({ required: true })
  Year: string;

  @Prop({ required: true })
  Month: string;

  @Prop({ required: true })
  Time: string;

  @Prop({ required: true })
  DepartmentText: string;

  @Prop({ type: Types.ObjectId, ref: 'Training' })
  Training: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  Trainer: Types.ObjectId;

  @Prop([{ type: Types.ObjectId, ref: 'User' }])
  Trainers: Types.ObjectId[];

  @Prop([{ type: Types.ObjectId, ref: 'Employee' }])
  Employee: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'YearlyTrainingPlan' })
  YearlyTrainingPlan: Types.ObjectId;

  @Prop({ required: true })
  Venue: string;

  @Prop({ required: true })
  Duration: string;

  @Prop([String])
  Images: string[];

  @Prop({ enum: ['Internal', 'External'], required: true })
  InternalExternal: string;

  @Prop({
    enum: ['Tentative', 'Pending', 'Scheduled', 'Postponed', 'Cancelled'],
    default: 'Tentative',
  })
  ScheduleStatus: string;

  @Prop({ type: [PlanStatusHistoryEntry], default: [] })
  StatusHistory: PlanStatusHistoryEntry[];

  /** Optional explicit session window (preferred over Date + Time + Duration). */
  @Prop({ type: Date })
  SessionStartAt?: Date;

  @Prop({ type: Date })
  SessionEndAt?: Date;

  @Prop()
  CreatedBy: string;

  @Prop()
  CreationDate: Date;

  @Prop()
  AssignedBy: string;

  @Prop()
  AssignedDate: Date;

  @Prop({ type: [SessionEmployeeEvaluation], default: [] })
  SessionEvaluations: SessionEmployeeEvaluation[];
}

export const MonthlyTrainingPlanSchema = SchemaFactory.createForClass(MonthlyTrainingPlan);

MonthlyTrainingPlanSchema.index({ UserDepartment: 1, Year: 1, Month: 1 });
MonthlyTrainingPlanSchema.index({ Trainers: 1, SessionStartAt: 1 });
MonthlyTrainingPlanSchema.index({ TrainingResultStatus: 1, ScheduleStatus: 1 });
