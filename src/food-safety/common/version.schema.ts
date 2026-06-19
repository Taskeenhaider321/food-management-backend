import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class VersionEntry {
  @Prop({ required: true })
  revisionNo: number;

  @Prop({ type: [String], default: [] })
  changedFields: string[];

  @Prop({ required: true })
  changedBy: string;

  @Prop({ type: Date, default: Date.now })
  changedAt: Date;

  @Prop({ type: Object })
  snapshot?: Record<string, unknown>;
}

export const VersionEntrySchema = SchemaFactory.createForClass(VersionEntry);
