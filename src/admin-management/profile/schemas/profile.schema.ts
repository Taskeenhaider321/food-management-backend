import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProfileDocument = Profile & Document;

@Schema({ _id: false })
export class ProfileIdentity {
  @Prop()
  type?: string;

  @Prop()
  number?: string;

  @Prop()
  country?: string;
}

@Schema({ _id: false })
export class ProfileDocItem {
  @Prop()
  label?: string;

  @Prop()
  url?: string;

  @Prop({ type: Date })
  uploadedAt?: Date;
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Profile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop()
  avatar?: string;

  @Prop()
  designation?: string;

  @Prop()
  age?: number;

  @Prop({ type: Date })
  DOB?: Date;

  @Prop()
  phoneNo?: string;

  @Prop()
  address?: string;

  @Prop({ type: ProfileIdentity })
  identity?: ProfileIdentity;

  @Prop({ type: [String], default: [] })
  qualification: string[];

  @Prop({ type: [String], default: [] })
  experience: string[];

  @Prop({ type: [String], default: [] })
  skills: string[];

  @Prop({ type: [ProfileDocItem], default: [] })
  docs: ProfileDocItem[];
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);
