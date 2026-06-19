import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ _id: false })
export class AgendaDetail {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Agenda', required: true })
  Agenda: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date })
  TargetDate: Date;

  @Prop()
  Discussion: string;

  @Prop()
  Responsibilities: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'MeetingParticipant' }] })
  Participants: MongooseSchema.Types.ObjectId[];
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class MRM extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Notification', required: true })
  Notification: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department' })
  UserDepartment: MongooseSchema.Types.ObjectId;

  @Prop({ type: [AgendaDetail] })
  AgendaDetails: AgendaDetail[];

  @Prop()
  CreatedBy: string;

  @Prop({ type: Date })
  CreationDate: Date;

  @Prop()
  UpdatedBy: string;

  @Prop({ type: Date })
  UpdationDate: Date;
}

export const MRMSchema = SchemaFactory.createForClass(MRM);
