import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ACTIVE_HACCP_STATUSES } from '../../common/constants';
import {
  TimelineEntry,
  TimelineEntrySchema,
} from '../../common/timeline.schema';
import {
  VersionEntry,
  VersionEntrySchema,
} from '../../common/version.schema';
import { ConductHaccpHooks } from '../hooks/conduct-haccp.hooks';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class ConductHaccp extends Document {
  @Prop({ unique: true })
  DocumentId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department', required: true })
  Department: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department', required: true })
  UserDepartment: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['Manuals', 'Procedures', 'SOPs', 'Forms'] })
  DocumentType: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Processes', required: true })
  Process: MongooseSchema.Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'HaccpTeam' }], required: true })
  Teams: MongooseSchema.Types.ObjectId[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Hazard' }] })
  Hazards: MongooseSchema.Types.ObjectId[];

  @Prop({ default: 0 })
  RevisionNo: number;

  @Prop({ enum: ACTIVE_HACCP_STATUSES, default: 'In Review' })
  Status: string;

  @Prop({ default: true })
  enabled: boolean;

  @Prop({ type: [TimelineEntrySchema], default: [] })
  timeline: TimelineEntry[];

  @Prop({ type: [VersionEntrySchema], default: [] })
  versions: VersionEntry[];

  @Prop() Reason?: string;
  @Prop() CreatedBy?: string;
  @Prop({ default: Date.now }) CreationDate: Date;
  @Prop() UpdatedBy?: string;
  @Prop() UpdationDate?: Date;
  @Prop() ApprovedBy?: string;
  @Prop() ApprovalDate?: Date;
  @Prop() DisapprovedBy?: string;
  @Prop() DisapprovalDate?: Date;
}

export const ConductHaccpSchema =
  SchemaFactory.createForClass(ConductHaccp);

/* 🔗 attach hook */
ConductHaccpSchema.pre('save', ConductHaccpHooks.generateDocumentId);
