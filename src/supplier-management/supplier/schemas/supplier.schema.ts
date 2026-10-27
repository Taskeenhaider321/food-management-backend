import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SupplierHooks } from '../hooks/supplier.hooks';
import {
  SUPPLIER_RISK_LEVELS,
  SUPPLIER_TYPES,
  SUPPLIER_WORKFLOW_STATUSES,
} from '../constants/supplier.enums';

export type SupplierDocument = Supplier & Document;

@Schema({ _id: false })
export class SupplierAddress {
  @Prop()
  line1?: string;

  @Prop()
  line2?: string;

  @Prop()
  city?: string;

  @Prop()
  provinceState?: string;

  @Prop()
  postalCode?: string;

  @Prop()
  country?: string;
}

@Schema({ _id: false })
export class SupplierCertificationEntry {
  @Prop({ required: true })
  catalogueId: string;

  @Prop()
  label?: string;

  @Prop({
    enum: ['certification', 'regulatory', 'individual_qualification'],
    default: 'certification',
  })
  kind?: string;

  @Prop()
  certificateNumber?: string;

  @Prop({ type: Date })
  expiryDate?: Date;

  @Prop()
  documentUrl?: string;

  @Prop({ type: Date })
  uploadedAt?: Date;
}

@Schema({ _id: false })
export class SupplierReviewHistoryEntry {
  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  by: string;

  @Prop({ type: Date, default: Date.now })
  at: Date;

  @Prop()
  note?: string;

  @Prop({ type: Number })
  riskScore?: number;
}

@Schema({ _id: false })
export class SupplierEvaluationCategory {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  label: string;

  @Prop({ type: Number, required: true })
  score: number;

  @Prop({ type: Number, required: true })
  weight: number;
}

@Schema({ _id: false })
export class SupplierEvaluation {
  @Prop({ type: [SupplierEvaluationCategory], default: [] })
  categories: SupplierEvaluationCategory[];

  @Prop({ type: Number })
  weightedScore?: number;

  @Prop({ enum: SUPPLIER_RISK_LEVELS })
  riskLevel?: string;

  @Prop()
  evaluatedBy?: string;

  @Prop({ type: Date })
  evaluatedAt?: Date;

  @Prop()
  notes?: string;

  @Prop({ default: false })
  criticalIssuesFlag?: boolean;
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Supplier {
  @Prop({ unique: true })
  supplierCode: string;

  @Prop()
  supplierName?: string;

  @Prop({ type: Types.ObjectId, ref: 'Company' })
  companyId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  departmentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Profile' })
  profileId?: Types.ObjectId;

  @Prop({ enum: SUPPLIER_TYPES })
  supplierType?: string;

  @Prop({ type: SupplierAddress })
  address?: SupplierAddress;

  @Prop({ type: [String], default: [] })
  contactNo: string[];

  @Prop()
  contactPerson?: string;

  @Prop({ type: [String], default: [] })
  productServiceOffered: string[];

  @Prop({ type: [SupplierCertificationEntry], default: [] })
  certifications?: SupplierCertificationEntry[];

  @Prop({ enum: ['low', 'medium', 'high'] })
  riskCategory?: string;

  @Prop({ type: Date })
  dueAt?: Date;

  @Prop({ type: Date })
  currentApprovalAt?: Date;

  @Prop({ type: Date })
  nextApprovalAt?: Date;

  @Prop({ enum: ['pending', 'approved', 'disapproved'], default: 'pending' })
  approvalStatus?: string;

  @Prop({ enum: SUPPLIER_WORKFLOW_STATUSES, default: 'pending_review' })
  workflowStatus?: string;

  @Prop({ type: [SupplierReviewHistoryEntry], default: [] })
  reviewHistory?: SupplierReviewHistoryEntry[];

  @Prop({ type: SupplierEvaluation })
  evaluation?: SupplierEvaluation;

  @Prop({ default: false })
  criticalIssuesFlag?: boolean;

  @Prop()
  approvedScope?: string;

  @Prop()
  approvedBy?: string;

  @Prop({ type: Date })
  approvalDate?: Date;

  @Prop()
  disapprovedBy?: string;

  @Prop()
  disapprovalReason?: string;

  @Prop({ type: Date })
  disapprovalDate?: Date;

  @Prop()
  createdBy?: string;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);

SupplierSchema.pre('save', SupplierHooks.generateSupplierCode);
