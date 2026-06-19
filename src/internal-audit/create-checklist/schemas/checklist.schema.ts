import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ChecklistHooks } from '../hooks/checklist.hooks';

export type ChecklistDocument = Checklist & Document;

@Schema({ _id: false })
export class StatusTimelineEntry {
  @Prop({ required: true })
  status: string;

  @Prop({ required: true })
  userName: string;

  @Prop({ type: Date, default: Date.now })
  date: Date;

  @Prop()
  reason?: string;
}

export const StatusTimelineEntrySchema = SchemaFactory.createForClass(StatusTimelineEntry);

@Schema({ _id: false })
export class VersionHistoryEntry {
  @Prop()
  field: string;

  @Prop()
  previousValue: string;

  @Prop()
  updatedValue: string;

  @Prop()
  modifiedBy: string;

  @Prop({ type: Date, default: Date.now })
  dateTime: Date;
}

export const VersionHistoryEntrySchema = SchemaFactory.createForClass(VersionHistoryEntry);

@Schema({ _id: false })
export class ChecklistSettings {
  @Prop()
  bannerImage?: string;

  @Prop({ default: '#1976d2' })
  themeColor: string;

  @Prop({ default: 'elevated' })
  cardStyle: string;

  @Prop({ default: '#f5f5f5' })
  backgroundColor: string;

  @Prop({ default: true })
  isEnabled: boolean;

  @Prop()
  shareableLink?: string;

  @Prop({ enum: ['public', 'private'], default: 'private' })
  accessType: string;

  @Prop({
    enum: ['None', 'Hourly', 'Daily', 'Weekly', 'Monthly'],
    default: 'None',
  })
  auditFrequency: string;
}

export const ChecklistSettingsSchema = SchemaFactory.createForClass(ChecklistSettings);

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Checklist {
  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ unique: true })
  ChecklistId: string;

  @Prop({ enum: ['Manuals', 'Procedures', 'SOPs', 'Forms'], required: true })
  DocumentType: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Department' }] })
  Departments: MongooseSchema.Types.ObjectId[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department', required: true })
  Department: MongooseSchema.Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'ChecklistQuestion' }] })
  ChecklistQuestions: MongooseSchema.Types.ObjectId[];

  @Prop({ default: 0 })
  RevisionNo: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department' })
  UserDepartment: MongooseSchema.Types.ObjectId;

  @Prop({
    enum: ['In Review', 'Reviewed', 'Approved', 'Rejected', 'Disapproved'],
    default: 'In Review',
  })
  Status: string;

  @Prop()
  Reason?: string;

  @Prop()
  CreatedBy: string;

  @Prop({ type: Date, default: Date.now })
  CreationDate: Date;

  @Prop()
  UpdatedBy?: string;

  @Prop({ type: Date })
  UpdationDate?: Date;

  @Prop()
  ReviewedBy?: string;

  @Prop({ type: Date })
  ReviewDate?: Date;

  @Prop()
  ApprovedBy?: string;

  @Prop({ type: Date })
  ApprovalDate?: Date;

  @Prop()
  RejectedBy?: string;

  @Prop({ type: Date })
  RejectionDate?: Date;

  @Prop()
  DisapprovedBy?: string;

  @Prop({ type: Date })
  DisapprovalDate?: Date;

  @Prop({ type: [StatusTimelineEntrySchema], default: [] })
  statusTimeline: StatusTimelineEntry[];

  @Prop({ type: [VersionHistoryEntrySchema], default: [] })
  versionHistory: VersionHistoryEntry[];

  @Prop({ type: ChecklistSettingsSchema, default: {} })
  settings: ChecklistSettings;
}

export const ChecklistSchema = SchemaFactory.createForClass(Checklist);

ChecklistSchema.pre('save', ChecklistHooks.generateChecklistId);
