import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * Single audit-trail event. Every status change (and resubmission / enable /
 * disable) across the Document Management module appends one of these.
 */
@Schema({ _id: false })
export class TimelineEntry {
  /** e.g. Created, Reviewed, Approved, Rejected, Disapproved, Resubmitted, Enabled, Disabled */
  @Prop({ required: true })
  action: string;

  /** Status of the record after the action was performed. */
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
