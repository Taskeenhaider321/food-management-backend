import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Types } from 'mongoose';
import {
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  QUESTION_TYPES,
} from '../../common/constants';
import type {
  DocumentStatus,
  DocumentType,
  QuestionType,
} from '../../common/constants';
import {
  TimelineEntry,
  TimelineEntrySchema,
} from '../../common/timeline.schema';

/* ---------------- LEGACY QUESTION MODEL ----------------
 * Kept registered so existing form-records answers can still populate their
 * referenced questions. New forms embed questions directly. */

@Schema()
export class Question extends MongooseDocument {
  @Prop({ required: true })
  questionType: string;

  @Prop({ required: true })
  questionText: string;

  @Prop({ type: [String] })
  options?: string[];

  @Prop({ type: [String] })
  rows?: string[];

  @Prop({ type: [String] })
  columns?: string[];

  @Prop()
  minValue?: number;

  @Prop()
  maxValue?: number;

  @Prop({ default: false })
  Required: boolean;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);

/* ---------------- EMBEDDED FORM QUESTION ---------------- */

@Schema()
export class FormQuestion {
  @Prop({ required: true, enum: QUESTION_TYPES })
  questionType: QuestionType;

  @Prop({ required: true })
  questionText: string;

  @Prop()
  description?: string;

  /** Multiple Choice / Checkboxes / Dropdown choices */
  @Prop({ type: [String], default: undefined })
  options?: string[];

  /** Grid question rows */
  @Prop({ type: [String], default: undefined })
  rows?: string[];

  /** Grid question columns */
  @Prop({ type: [String], default: undefined })
  columns?: string[];

  /** Linear scale bounds */
  @Prop()
  minValue?: number;

  @Prop()
  maxValue?: number;

  @Prop()
  minLabel?: string;

  @Prop()
  maxLabel?: string;

  /** Image / Video question media url */
  @Prop()
  mediaUrl?: string;

  @Prop({ default: false })
  required: boolean;

  @Prop({ default: 0 })
  order: number;
}

export const FormQuestionSchema = SchemaFactory.createForClass(FormQuestion);

/* ---------------- CUSTOM FREQUENCY SETTINGS ---------------- */

@Schema({ _id: false })
export class FormCustomSettings {
  @Prop()
  frequencyRule?: string;

  @Prop()
  reminderConfiguration?: string;

  @Prop()
  bannerImage?: string;

  @Prop()
  themeColor?: string;

  @Prop()
  formStyling?: string;
}

export const FormCustomSettingsSchema =
  SchemaFactory.createForClass(FormCustomSettings);

/* ---------------- FORM VERSION SNAPSHOT ---------------- */

@Schema({ _id: false })
export class FormVersionEntry {
  @Prop({ required: true })
  revisionNo: number;

  @Prop()
  formName?: string;

  @Prop()
  description?: string;

  @Prop()
  maintenanceFrequency?: string;

  @Prop({ type: [FormQuestionSchema], default: [] })
  questions: FormQuestion[];

  @Prop({ type: [String], default: [] })
  changedFields: string[];

  @Prop({ required: true })
  changedBy: string;

  @Prop({ type: Date, default: Date.now })
  changedAt: Date;
}

export const FormVersionEntrySchema =
  SchemaFactory.createForClass(FormVersionEntry);

/* ---------------- LIST OF FORMS ---------------- */

@Schema({
  collection: 'dm_forms',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class ListOfForms extends MongooseDocument {
  /** Auto-generated: CompanyShortName/DeptShortName/TypeCode/Increment (e.g. ABC/QA/4/001). */
  @Prop({ unique: true })
  documentId: string;

  @Prop({ type: Types.ObjectId, ref: 'Company' })
  companyId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  formName: string;

  @Prop()
  description?: string;

  @Prop({ required: true, enum: DOCUMENT_TYPES })
  documentType: DocumentType;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Department' }],
    required: true,
  })
  departments: Types.ObjectId[];

  /** e.g. "Every 1 Hour" ... "Every 23 Hours", Daily, Weekly, Monthly, Quarterly, Yearly, Custom */
  @Prop({ required: true })
  maintenanceFrequency: string;

  @Prop({ type: FormCustomSettingsSchema })
  customSettings?: FormCustomSettings;

  @Prop({ type: [FormQuestionSchema], default: [] })
  questions: FormQuestion[];

  @Prop({ enum: DOCUMENT_STATUSES, default: 'In Review' })
  status: DocumentStatus;

  @Prop({ default: true })
  enabled: boolean;

  /** Latest rejection / disapproval reason. */
  @Prop()
  reason?: string;

  @Prop({ default: 0 })
  revisionNo: number;

  @Prop()
  createdBy?: string;

  @Prop()
  updatedBy?: string;

  @Prop({ type: [TimelineEntrySchema], default: [] })
  timeline: TimelineEntry[];

  @Prop({ type: [FormVersionEntrySchema], default: [] })
  versions: FormVersionEntry[];
}

export const ListOfFormsSchema = SchemaFactory.createForClass(ListOfForms);

ListOfFormsSchema.index({ companyId: 1, status: 1 });
