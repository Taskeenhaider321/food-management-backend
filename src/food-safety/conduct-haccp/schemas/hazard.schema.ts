import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema()
export class Hazard extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ProcessDetails' })
  Process?: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['Biological', 'Chemical', 'Physical', 'Halal', 'Allergen'] })
  type: string;

  @Prop()
  Description?: string;

  @Prop()
  ControlMeasures?: string;

  @Prop({ enum: [1, 2, 3, 4, 5] })
  Occurence?: number;

  @Prop({ enum: [1, 2, 3, 4, 5] })
  Severity?: number;

  @Prop()
  SignificanceLevel?: number;
}

export const HazardSchema = SchemaFactory.createForClass(Hazard);
