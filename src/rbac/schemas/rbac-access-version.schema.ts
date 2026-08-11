import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RbacAccessVersionDocument = RbacAccessVersion & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'rbacaccessversions',
})
export class RbacAccessVersion {
  /** `global` or `company:<companyId>` */
  @Prop({ required: true, unique: true, index: true })
  scopeKey: string;

  @Prop({ type: Number, default: 1 })
  version: number;
}

export const RbacAccessVersionSchema =
  SchemaFactory.createForClass(RbacAccessVersion);
