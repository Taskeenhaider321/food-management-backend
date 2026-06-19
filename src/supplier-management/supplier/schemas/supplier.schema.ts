import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SupplierHooks } from '../hooks/supplier.hooks';

export type SupplierDocument = Supplier & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Supplier {
  @Prop({ unique: true })
  supplierCode: string;

  @Prop({ type: Types.ObjectId, ref: 'Profile', required: true })
  profileId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  contactNo: string[];

  @Prop()
  contactPerson?: string;

  @Prop({ type: [String], default: [] })
  productServiceOffered: string[];

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
