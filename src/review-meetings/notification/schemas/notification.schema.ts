import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Notification extends Document {
  @Prop()
  Venue: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department' })
  UserDepartment: MongooseSchema.Types.ObjectId;

  @Prop()
  MRMNo: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Agenda' }] })
  Agendas: MongooseSchema.Types.ObjectId[];

  @Prop({ type: Date })
  Date: Date;

  @Prop()
  Time: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'MeetingParticipant' }] })
  Participants: MongooseSchema.Types.ObjectId[];

  @Prop()
  CreatedBy: string;

  @Prop({ type: Date })
  CreationDate: Date;

  @Prop()
  UpdatedBy: string;

  @Prop({ type: Date })
  UpdationDate: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
