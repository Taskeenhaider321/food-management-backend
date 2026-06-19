import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Schema as MongooseSchema, Types } from 'mongoose';

export class UploadedDocument {
  @Prop()
  RevisionNo?: number;

  @Prop()
  DocumentUrl?: string;

  @Prop()
  CreationDate?: Date;

  @Prop()
  CreatedBy?: string;

  @Prop()
  ReviewDate?: Date;

  @Prop()
  ReviewedBy?: string;

  @Prop()
  ApprovalDate?: Date;

  @Prop()
  ApprovedBy?: string;

  @Prop()
  Comment?: string;
}

export type UploadDocumentsDocument = UploadDocuments & MongooseDocument;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class UploadDocuments {
  @Prop()
  DocumentName: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department' })
  UserDepartment: Types.ObjectId;

  @Prop({ unique: true })
  DocumentId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department', required: true })
  Department: Types.ObjectId;

  @Prop({ required: true, enum: ['Manuals', 'Procedures', 'SOPs', 'Forms'] })
  DocumentType: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Department' }] })
  SendToDepartments: Types.ObjectId[];

  @Prop({ default: 0 })
  RevisionNo: number;

  @Prop({ enum: ['Pending', 'Reviewed', 'Rejected', 'Approved', 'Disapproved'], default: 'Pending' })
  Status: string;

  @Prop()
  Reason?: string;

  @Prop()
  CreatedBy: string;

  @Prop({ default: Date.now })
  CreationDate: Date;

  @Prop()
  UpdatedBy?: string;

  @Prop()
  UpdationDate?: Date;

  @Prop()
  ReviewedBy?: string;

  @Prop()
  ReviewDate?: Date;

  @Prop()
  RejectedBy?: string;

  @Prop()
  RejectionDate?: Date;

  @Prop()
  DisapprovedBy?: string;

  @Prop()
  DisapprovalDate?: Date;

  @Prop()
  ApprovedBy?: string;

  @Prop()
  ApprovalDate?: Date;

  @Prop({ type: [UploadedDocument] })
  UploadedDocuments: UploadedDocument[];
}

export const UploadDocumentsSchema = SchemaFactory.createForClass(UploadDocuments);
