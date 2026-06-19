import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CompanyDocument = Company & Document;

export enum CompanyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Company {
  @Prop({ required: true, trim: true })
  companyName: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  shortName: string;

  @Prop({ type: String, default: '' })
  address: string;

  @Prop({ type: String, default: '' })
  contactNo: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
    match: /^\S+@\S+\.\S+$/,
  })
  email: string;

  @Prop({ default: '' })
  companyLogo: string;

  @Prop({ type: String, enum: CompanyStatus, default: CompanyStatus.ACTIVE })
  status: CompanyStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const CompanySchema = SchemaFactory.createForClass(Company);
