import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DepartmentDocument = Department & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Department {
  @Prop({ type: Types.ObjectId, ref: 'Company' })
  companyId: Types.ObjectId;

  @Prop()
  departmentName: string;

  @Prop({ required: true })
  shortName: string;

  @Prop({ enum: ['active', 'inactive', 'paused'], default: 'active' })
  status: string;

  /** Per-company human-readable id, e.g. D01, D02 (unique together with companyId). */
  @Prop()
  departmentCode?: string;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);

DepartmentSchema.index(
  { companyId: 1, departmentCode: 1 },
  {
    unique: true,
    partialFilterExpression: {
      departmentCode: { $exists: true, $type: 'string' },
    },
  },
);

DepartmentSchema.index({ companyId: 1, status: 1 });
DepartmentSchema.index({ companyId: 1, departmentName: 1 });
