import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';

@Schema({ _id: false })
export class Answer {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Question' })
  question: MongooseSchema.Types.ObjectId;

  @Prop({ type: [String] })
  CheckboxesAnswers?: string[];

  @Prop()
  multipleChoiceAnswer?: string;

  @Prop()
  shortTextAnswer?: string;

  @Prop()
  longTextAnswer?: string;

  @Prop({ type: [String] })
  checkboxGridAnswers?: string[];

  @Prop({ type: [String] })
  multipleChoiceGridAnswers?: string[];

  @Prop()
  dropdownAnswer?: string;

  /** Stored as HH:mm (or free-text time), not a Date — avoids CastError on submit. */
  @Prop()
  timeAnswer?: string;

  /** Stored as YYYY-MM-DD (or free-text date), not a Date — avoids CastError on submit. */
  @Prop()
  dateAnswer?: string;

  @Prop()
  linearScaleAnswer?: number;
}

export const AnswerSchema = SchemaFactory.createForClass(Answer);
