import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Types } from 'mongoose';
import { CHANGE_REQUEST_STATUSES } from '../../common/constants';
import type { ChangeRequestStatus } from '../../common/constants';
import {
  TimelineEntry,
  TimelineEntrySchema,
} from '../../common/timeline.schema';

export type ChangeRequestDocument = ChangeRequest & MongooseDocument;

export const CHANGE_REQUEST_TARGET_MODELS = ['Document', 'ListOfForms'] as const;

@Schema({
  collection: 'dm_change_requests',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class ChangeRequest {
  /** Auto-generated request number, e.g. CR001 */
  @Prop({ unique: true })
  requestNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Company' })
  companyId?: Types.ObjectId;

  /** Controlled document (or form) the change is requested against. */
  @Prop({ type: Types.ObjectId, refPath: 'documentModel', required: true })
  document: Types.ObjectId;

  @Prop({ required: true, enum: CHANGE_REQUEST_TARGET_MODELS })
  documentModel: string;

  /** Human readable document id snapshot, e.g. ABC/QA/1/001 */
  @Prop({ required: true })
  documentRef: string;

  @Prop({ required: true })
  documentName: string;

  @Prop({ required: true })
  changeReason: string;

  @Prop({ enum: CHANGE_REQUEST_STATUSES, default: 'Request Pending' })
  status: ChangeRequestStatus;

  /** Latest disapproval reason. */
  @Prop()
  reason?: string;

  @Prop()
  createdBy?: string;

  @Prop()
  updatedBy?: string;

  @Prop({ type: [TimelineEntrySchema], default: [] })
  timeline: TimelineEntry[];
}

export const ChangeRequestSchema =
  SchemaFactory.createForClass(ChangeRequest);

ChangeRequestSchema.index({ companyId: 1, status: 1 });
