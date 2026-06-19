import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Types } from 'mongoose';
import {
  CREATION_METHODS,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
} from '../../common/constants';
import type {
  CreationMethod,
  DocumentStatus,
  DocumentType,
} from '../../common/constants';
import {
  TimelineEntry,
  TimelineEntrySchema,
} from '../../common/timeline.schema';

export type DocumentDocument = Document & MongooseDocument;

/**
 * Snapshot of a document before a tracked edit (after a rejection or
 * disapproval), so previous and updated versions stay auditable.
 */
@Schema({ _id: false })
export class DocumentVersionEntry {
  @Prop({ required: true })
  revisionNo: number;

  @Prop()
  name?: string;

  @Prop()
  documentType?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Department' }], default: [] })
  departments: Types.ObjectId[];

  @Prop()
  editorContent?: string;

  @Prop()
  fileUrl?: string;

  @Prop()
  fileName?: string;

  @Prop({ type: [String], default: [] })
  changedFields: string[];

  @Prop({ required: true })
  changedBy: string;

  @Prop({ type: Date, default: Date.now })
  changedAt: Date;
}

export const DocumentVersionEntrySchema =
  SchemaFactory.createForClass(DocumentVersionEntry);

@Schema({
  collection: 'dm_documents',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class Document {
  /** Auto-generated: CompanyShortName/DeptShortName/TypeCode/Increment (e.g. ABC/QA/1/001). */
  @Prop({ unique: true })
  documentId: string;

  @Prop({ type: Types.ObjectId, ref: 'Company' })
  companyId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: DOCUMENT_TYPES })
  documentType: DocumentType;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Department' }],
    required: true,
  })
  departments: Types.ObjectId[];

  @Prop({ required: true, enum: CREATION_METHODS })
  creationMethod: CreationMethod;

  /** Set when creationMethod = upload */
  @Prop()
  fileUrl?: string;

  @Prop()
  fileName?: string;

  /** Set when creationMethod = editor (rich text HTML) */
  @Prop()
  editorContent?: string;

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

  @Prop({ type: [DocumentVersionEntrySchema], default: [] })
  versions: DocumentVersionEntry[];
}

export const DocumentSchema = SchemaFactory.createForClass(Document);

DocumentSchema.index({ companyId: 1, status: 1 });
