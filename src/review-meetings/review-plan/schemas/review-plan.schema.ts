import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { reviewPlanPreSave } from '../hooks/review-plan.hooks';

export const REVIEW_PLAN_STATUSES = ['Scheduled', 'Minutes Recorded'] as const;
export type ReviewPlanStatus = (typeof REVIEW_PLAN_STATUSES)[number];

@Schema()
export class AgendaItem {
  _id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  /** Rich text (HTML) agenda description */
  @Prop()
  description?: string;

  /** Review team member this agenda item is assigned to */
  @Prop({ type: Types.ObjectId, ref: 'ReviewTeamMember' })
  participant?: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  order?: number;
}

export const AgendaItemSchema = SchemaFactory.createForClass(AgendaItem);

export type ReviewPlanDocument = ReviewPlan & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'review_plans',
})
export class ReviewPlan {
  @Prop({ unique: true })
  mrmNumber: string;

  @Prop({ required: true })
  venue: string;

  @Prop({ type: Date, required: true })
  meetingDate: Date;

  @Prop({ required: true })
  meetingTime: string;

  @Prop()
  objective?: string;

  @Prop()
  remarks?: string;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'ReviewTeamMember' }],
    default: [],
  })
  participants: Types.ObjectId[];

  @Prop({ type: [AgendaItemSchema], default: [] })
  agendas: AgendaItem[];

  @Prop({ enum: REVIEW_PLAN_STATUSES, default: 'Scheduled' })
  status: ReviewPlanStatus;

  @Prop({ type: Types.ObjectId, ref: 'Company' })
  companyId?: Types.ObjectId;

  @Prop()
  createdBy?: string;
}

export const ReviewPlanSchema = SchemaFactory.createForClass(ReviewPlan);

ReviewPlanSchema.pre('save', reviewPlanPreSave);
