import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ _id: false })
export class ResponseOption {
  @Prop({ required: true })
  label: string;

  @Prop({ default: '#ffffff' })
  backgroundColor: string;

  @Prop({ default: '#000000' })
  textColor: string;
}

export const ResponseOptionSchema = SchemaFactory.createForClass(ResponseOption);

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class ResponseGroup extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ type: [ResponseOptionSchema], default: [] })
  options: ResponseOption[];

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department' })
  UserDepartment?: MongooseSchema.Types.ObjectId;

  @Prop()
  CreatedBy?: string;
}

export const ResponseGroupSchema = SchemaFactory.createForClass(ResponseGroup);
