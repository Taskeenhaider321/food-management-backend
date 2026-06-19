import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { reviewTeamMemberPreSave } from '../hooks/review-team.hooks';

export type ReviewTeamMemberDocument = ReviewTeamMember & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'review_team_members',
})
export class ReviewTeamMember {
  @Prop({ unique: true })
  memberCode: string;

  @Prop({ required: true })
  fullName: string;

  @Prop()
  designation?: string;

  @Prop()
  email?: string;

  @Prop()
  phoneNo?: string;

  @Prop()
  roleInTeam?: string;

  @Prop({ type: Types.ObjectId, ref: 'Company' })
  companyId?: Types.ObjectId;

  @Prop()
  createdBy?: string;
}

export const ReviewTeamMemberSchema =
  SchemaFactory.createForClass(ReviewTeamMember);

ReviewTeamMemberSchema.pre('save', reviewTeamMemberPreSave);
