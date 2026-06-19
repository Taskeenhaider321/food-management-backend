import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { workRequestPreSave } from '../hooks/work-request.hooks';

export type WorkRequestDocument = WorkRequest & Document;

export type WorkRequestHistoryEntry = {
  type: string;
  user: string;
  at: Date;
  comment?: string;
  from?: string;
  to?: string;
};

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class WorkRequest {
  @Prop({ unique: true })
  MWRId: string;

  @Prop({ type: Types.ObjectId, ref: 'Machinery' })
  Machinery: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Equipment' })
  Equipment?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  UserDepartment?: Types.ObjectId;

  @Prop()
  Date: Date;

  @Prop()
  Time: Date;

  @Prop()
  Area: string;

  @Prop({ required: true })
  Priority: string;

  @Prop({ type: [String], required: true })
  Discipline: string[];

  @Prop({ required: true })
  Description: string;

  @Prop({ required: true })
  SpecialInstruction: string;

  @Prop({ type: [String], default: [] })
  imageURLs: string[];

  @Prop({ type: [String], default: [] })
  documentURLs: string[];

  @Prop({ type: [String], default: [] })
  completionImageURLs: string[];

  @Prop({ type: [String], default: [] })
  completionDocumentURLs: string[];

  @Prop()
  CompletionRemarks?: string;

  @Prop()
  StartTime?: Date;

  @Prop()
  EndTime?: Date;

  @Prop({
    enum: ['Approved', 'Completed', 'Pending', 'Rejected'],
    default: 'Pending',
  })
  Status: string;

  @Prop()
  JobAssigned?: string;

  @Prop()
  Designation?: string;

  @Prop()
  DetailOfWork?: string;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  Department?: Types.ObjectId;

  @Prop()
  Reason?: string;

  @Prop()
  CreatedBy: string;

  @Prop()
  CreationDate: Date;

  @Prop()
  RejectedBy?: string;

  @Prop()
  RejectionDate?: Date;

  @Prop()
  AcceptedBy?: string;

  @Prop()
  AcceptionDate?: Date;

  @Prop()
  CompletedBy?: string;

  @Prop()
  CompletionDate?: Date;

  @Prop({ type: Array, default: [] })
  History: WorkRequestHistoryEntry[];
}

export const WorkRequestSchema =
  SchemaFactory.createForClass(WorkRequest);

WorkRequestSchema.pre('save', workRequestPreSave);
