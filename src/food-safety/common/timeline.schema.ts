import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class TimelineEntry {
  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  status: string;

  @Prop({ required: true })
  user: string;

  @Prop({ type: Date, default: Date.now })
  at: Date;

  @Prop()
  reason?: string;
}

export const TimelineEntrySchema = SchemaFactory.createForClass(TimelineEntry);
