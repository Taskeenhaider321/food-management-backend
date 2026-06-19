import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Answer, AnswerSchema } from './answer.schema';

@Schema()
export class FormRecords extends Document {
  @Prop({ unique: true })
  FormRecordId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department' })
  UserDepartment: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ListOfForms' })
  Form: MongooseSchema.Types.ObjectId;

  @Prop()
  FillBy: string;

  @Prop()
  VerifiedBy?: string;

  @Prop({ enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' })
  Status: string;

  @Prop({ type: Date, default: Date.now })
  FillDate: Date;

  @Prop({ type: Date })
  VerificationDate?: Date;

  @Prop()
  Comment?: string;

  @Prop({ type: [AnswerSchema] })
  answers: Answer[];
}

export const FormRecordsSchema = SchemaFactory.createForClass(FormRecords);
