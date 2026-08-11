import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CompanyModuleAssignmentDocument = CompanyModuleAssignment &
  Document;

/**
 * Per-company ceiling for a master module.
 * Super Admin assigns which modules a company may use, optional display-name
 * overrides, and which MasterPermission subset the company (and its users)
 * may receive. User grants must always be a subset of this ceiling.
 */
@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class CompanyModuleAssignment {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'MasterModule',
    required: true,
    index: true,
  })
  masterModuleId: Types.ObjectId;

  /** Company-specific display name; falls back to MasterModule.name */
  @Prop({ trim: true })
  customName?: string;

  /** Optional resource-key → display label overrides for this company */
  @Prop({ type: Object })
  resourceCustomNames?: Record<string, string>;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'MasterPermission' }],
    default: [],
  })
  selectedPermissionIds: Types.ObjectId[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedBy?: Types.ObjectId;
}

export const CompanyModuleAssignmentSchema = SchemaFactory.createForClass(
  CompanyModuleAssignment,
);

CompanyModuleAssignmentSchema.index(
  { companyId: 1, masterModuleId: 1 },
  { unique: true },
);
