import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TeamMemberDocument = TeamMember & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class TeamMember {
  @Prop({ type: Types.ObjectId, ref: 'Profile' })
  profileId?: Types.ObjectId;

  @Prop({ required: true })
  fullName: string;

  @Prop()
  designation?: string;

  @Prop()
  roleInTeam?: string;

  @Prop({ type: [String], default: [] })
  trainingAttended: string[];

  @Prop()
  documentUrl?: string;

  @Prop()
  createdBy?: string;
}

export const TeamMemberSchema = SchemaFactory.createForClass(TeamMember);
