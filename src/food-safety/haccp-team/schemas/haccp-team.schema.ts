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
import { HaccpTeamHooks } from '../hooks/haccp-team.hooks';

export type HaccpTeamDocument = HaccpTeam & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class HaccpTeam extends Document {
  @Prop({ unique: true })
  DocumentId: string;

  @Prop({ required: true })
  TeamName: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department', required: true })
  Department: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department', required: true })
  UserDepartment: MongooseSchema.Types.ObjectId;

  @Prop({ enum: ['Manuals', 'Procedures', 'SOPs', 'Forms'], required: true })
  DocumentType: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'TeamMember' }] })
  TeamMembers: MongooseSchema.Types.ObjectId[];

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

  @Prop()
  Reason?: string;

  @Prop()
  CreatedBy: string;

  @Prop({ type: Date, default: Date.now })
  CreationDate: Date;

  @Prop()
  ApprovedBy?: string;

  @Prop({ type: Date })
  ApprovalDate?: Date;

  @Prop()
  DisapprovedBy?: string;

  @Prop({ type: Date })
  DisapprovalDate?: Date;
}

export const HaccpTeamSchema =
  SchemaFactory.createForClass(HaccpTeam);

// ✅ Attach hook cleanly
HaccpTeamSchema.pre('save', HaccpTeamHooks.generateDocumentId);
