import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema()
export class Decision extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Hazard' })
  Hazard?: MongooseSchema.Types.ObjectId;

  @Prop({ default: null })
  Q1?: boolean;

  @Prop({ default: null })
  Q1A?: boolean;

  @Prop({ default: null })
  Q2?: boolean;

  @Prop({ default: null })
  Q3?: boolean;

  @Prop({ default: null })
  Q4?: boolean;

  @Prop({ enum: ['CCP', 'OPRP', 'Not a CCP'] })
  classification?: string;
}

export const DecisionSchema = SchemaFactory.createForClass(Decision);
