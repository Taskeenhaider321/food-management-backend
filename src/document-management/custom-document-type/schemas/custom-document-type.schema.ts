import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CustomDocumentTypeDocument = CustomDocumentType & Document;

/**
 * Per-form/tab document type definitions.
 * Scoped by `scopeKey` so Team types never leak into Describe Product, etc.
 */
@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class CustomDocumentType {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true, default: '' })
  description?: string;

  /** Third segment of DocumentId: Company/Dept/{documentNumber}/001 */
  @Prop({ required: true, min: 1, max: 99 })
  documentNumber: number;

  /** Stable icon key (book, clipboard, file, list, shield, …) */
  @Prop({ required: true, default: 'file' })
  icon: string;

  /**
   * Form/tab scope, e.g.
   * food-safety.team | food-safety.describe-product | document-management.documents
   */
  @Prop({ required: true, index: true })
  scopeKey: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  })
  companyId: MongooseSchema.Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdBy?: string;
}

export const CustomDocumentTypeSchema =
  SchemaFactory.createForClass(CustomDocumentType);

CustomDocumentTypeSchema.index(
  { companyId: 1, scopeKey: 1, title: 1 },
  { unique: true },
);
CustomDocumentTypeSchema.index(
  { companyId: 1, scopeKey: 1, documentNumber: 1 },
  { unique: true },
);
