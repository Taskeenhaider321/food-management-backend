import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { FoodSafetyHooks } from '../hooks/food-safety-plan.hooks';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class FoodSafety extends Document {
  @Prop({ unique: true })
  DocumentId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department' })
  UserDepartment?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department', required: true })
  Department: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ['Manuals', 'Procedures', 'SOPs', 'Forms'] })
  DocumentType: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'DecisionTree' })
  DecisionTree?: MongooseSchema.Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Plan' }] })
  Plans: MongooseSchema.Types.ObjectId[];

  @Prop({ default: 0 })
  RevisionNo: number;

  @Prop({ enum: ['Pending', 'Approved', 'Disapproved'], default: 'Pending' })
  Status: string;

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

export const FoodSafetySchema =
  SchemaFactory.createForClass(FoodSafety);

/* 🔗 attach hook */
FoodSafetySchema.pre('save', FoodSafetyHooks.generateDocumentId);
