import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ACTIVE_HACCP_STATUSES } from '../../common/constants';
import {
  TimelineEntry,
  TimelineEntrySchema,
} from '../../common/timeline.schema';
import {
  VersionEntry,
  VersionEntrySchema,
} from '../../common/version.schema';
import { ProductHooks } from '../hooks/product.hooks';

@Schema({ _id: false })
export class ProductDetails {
  @Prop({ required: true }) Name: string;
  @Prop() Origin?: string;
  @Prop() RawMaterial?: string;
  @Prop() PackingMaterial?: string;
  @Prop() PhysicalProperties?: string;
  @Prop() ChemicalProperties?: string;
  @Prop() ProductDescription?: string;
  @Prop() MicrobialProperties?: string;
  @Prop() Allergens?: string;
  @Prop() IntendedUsers?: string;
  @Prop() StorageConditions?: string;
  @Prop() LabellingInstructions?: string;
  @Prop() Transportation?: string;
  @Prop() FoodSafetyRisk?: string;
  @Prop() ShelfLife?: string;
  @Prop() Consumer?: string;
  @Prop() TargtMarket?: string;
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Product extends Document {
  @Prop({ unique: true })
  DocumentId: string;

  @Prop({ type: Object })
  User?: Record<string, any>;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department', required: true })
  Department: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department', required: true })
  UserDepartment: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['Manuals', 'Procedures', 'SOPs', 'Forms'] })
  DocumentType: string;

  @Prop({ type: ProductDetails, required: true })
  ProductDetails: ProductDetails;

  @Prop({ default: 0 }) RevisionNo: number;
  @Prop({ enum: ACTIVE_HACCP_STATUSES, default: 'In Review' })
  Status: string;

  @Prop({ default: true })
  enabled: boolean;

  @Prop({ type: [TimelineEntrySchema], default: [] })
  timeline: TimelineEntry[];

  @Prop({ type: [VersionEntrySchema], default: [] })
  versions: VersionEntry[];

  @Prop() Reason?: string;
  @Prop() CreatedBy?: string;
  @Prop({ default: Date.now }) CreationDate: Date;
  @Prop() UpdatedBy?: string;
  @Prop() UpdationDate?: Date;
  @Prop() ApprovedBy?: string;
  @Prop() ApprovalDate?: Date;
  @Prop() DisapprovedBy?: string;
  @Prop() DisapprovalDate?: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

/* 🔗 attach hook */
ProductSchema.pre('save', ProductHooks.generateDocumentId);
