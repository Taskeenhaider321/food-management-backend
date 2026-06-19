import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InternalAuditorDocument = InternalAuditor & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class InternalAuditor {
  @Prop({ type: Types.ObjectId, ref: 'Profile', required: true })
  profileId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  departmentId: Types.ObjectId;

  @Prop({ enum: ['Lead Auditor', 'Staff Auditor'], default: 'Staff Auditor' })
  roleInTeam: string;

  @Prop()
  experience?: string;

  @Prop({ type: [String], default: [] })
  skills: string[];

  @Prop()
  education?: string;

  @Prop({ type: [String], default: [] })
  supportingDocuments: string[];

  @Prop({ default: false })
  isApprovedAuditor: boolean;

  @Prop({ type: [String], default: [] })
  approvalDocuments: string[];

  @Prop()
  approvedAuditorLetter?: string;

  @Prop({ default: true })
  isEnabled: boolean;

  @Prop()
  createdBy?: string;
}

export const InternalAuditorSchema = SchemaFactory.createForClass(InternalAuditor);
