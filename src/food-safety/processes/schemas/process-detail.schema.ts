import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema()
export class ProcessDetail extends Document {
  @Prop({ required: true })
  Name: string;

  @Prop()
  ProcessNum?: string;

  @Prop({ required: true })
  Description: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'ProcessDetail' }] })
  subProcesses: MongooseSchema.Types.ObjectId[];
}

export const ProcessDetailSchema = SchemaFactory.createForClass(ProcessDetail);
