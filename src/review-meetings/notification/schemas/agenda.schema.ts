import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema()
export class Agenda extends Document {
  @Prop({ required: true })
  Name: string;

  @Prop()
  Description: string;

  /** When set, this agenda is assigned to that meeting participant. */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'MeetingParticipant' })
  meetingParticipantId?: Types.ObjectId;
}

export const AgendaSchema = SchemaFactory.createForClass(Agenda);
