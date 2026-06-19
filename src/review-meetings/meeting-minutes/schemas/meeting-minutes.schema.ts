import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class MinutesRecord {
  /** Agenda subdocument id inside the linked review plan */
  @Prop({ type: Types.ObjectId, required: true })
  agendaId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ReviewTeamMember', required: true })
  participant: Types.ObjectId;

  /** Rich text (HTML) discussion points */
  @Prop()
  discussion?: string;

  /** Rich text (HTML) responsibility / action required */
  @Prop()
  responsibility?: string;

  @Prop({ type: Date })
  targetDate?: Date;
}

export const MinutesRecordSchema = SchemaFactory.createForClass(MinutesRecord);

export type MeetingMinutesDocument = MeetingMinutes & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'meeting_minutes',
})
export class MeetingMinutes {
  @Prop({
    type: Types.ObjectId,
    ref: 'ReviewPlan',
    required: true,
    unique: true,
  })
  reviewPlan: Types.ObjectId;

  @Prop({ type: [MinutesRecordSchema], default: [] })
  records: MinutesRecord[];

  @Prop({ type: Types.ObjectId, ref: 'Company' })
  companyId?: Types.ObjectId;

  @Prop()
  createdBy?: string;
}

export const MeetingMinutesSchema =
  SchemaFactory.createForClass(MeetingMinutes);
