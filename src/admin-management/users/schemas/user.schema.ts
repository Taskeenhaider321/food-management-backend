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

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class User {
  @Prop({ type: Types.ObjectId, ref: 'Company' })
  companyId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  departmentId?: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true, unique: true, trim: true })
  userName: string;

  @Prop({ required: true, minlength: 7, trim: true })
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
}

export const UserSchema = SchemaFactory.createForClass(User);
