import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRoleType {
  SUPER_ADMIN = 'super-admin',
  SUPER_STAFF = 'super-staff',
  COMPANY_ADMIN = 'company-admin',
  COMPANY_USER = 'company-user',
  COMPANY_TRAINER = 'company-trainer',
  COMPANY_EMPLOYEE = 'company-employee',
}

export const PERSON_ROLE_VALUES = ['employee', 'trainer', 'auditor'] as const;
export type PersonRole = (typeof PERSON_ROLE_VALUES)[number];

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class User {
  @Prop({ type: Types.ObjectId, ref: 'Company' })
  companyId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  departmentId?: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  /** Self-service profile fields (editable by the user on /profile). */
  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true })
  bio?: string;

  @Prop({ trim: true })
  country?: string;

  @Prop({ trim: true })
  city?: string;

  /** Profile photo (HTTPS URL from the upload service). */
  @Prop({ trim: true })
  avatarUrl?: string;

  @Prop({ type: [String], enum: PERSON_ROLE_VALUES, default: [] })
  personRoles?: PersonRole[];

  @Prop({ required: true, unique: true, trim: true })
  userName: string;

  @Prop({ required: true, minlength: 7 })
  password: string;

  @Prop({ type: Types.ObjectId, ref: 'Role' })
  roleId?: Types.ObjectId;

  @Prop({
    enum: [
      'super-admin',
      'super-staff',
      'company-admin',
      'company-user',
      'company-trainer',
      'company-employee',
    ],
    default: 'super-admin',
  })
  roleType: UserRoleType;

  @Prop({ default: false })
  isSuspended: boolean;

  /**
   * Password-setup invitation (Company Admin onboarding). Only a SHA-256 hash
   * of the emailed token is stored; hidden from queries by default.
   */
  @Prop({ select: false, index: true, sparse: true })
  passwordSetupTokenHash?: string;

  @Prop({ select: false })
  passwordSetupTokenExpiresAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
