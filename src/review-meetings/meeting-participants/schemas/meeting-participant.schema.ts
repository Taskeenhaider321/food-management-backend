import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MeetingParticipantsHooks } from '../hooks/meeting-participants.hooks';

export type MeetingParticipantDocument = MeetingParticipant & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'participants',
})
export class MeetingParticipant {
  @Prop({ type: Types.ObjectId, ref: 'Profile', required: true })
  profileId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  departmentId?: Types.ObjectId;

  @Prop({ unique: true })
  participantCode: string;

  @Prop()
  designation?: string;

  @Prop()
  roleInTeam?: string;

  @Prop()
  contactNo?: string;

  @Prop()
  createdBy?: string;

  @Prop({ type: Date })
  creationDate?: Date;

  @Prop()
  updatedBy?: string;

  @Prop({ type: Date })
  updationDate?: Date;
}

export const MeetingParticipantSchema =
  SchemaFactory.createForClass(MeetingParticipant);

/** Mongoose 7+: save middleware is async; do not use `next()` (it is not passed). */
MeetingParticipantSchema.pre('save', async function () {
  await MeetingParticipantsHooks.generateParticipantId(this);
});
