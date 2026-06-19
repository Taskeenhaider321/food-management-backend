import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { preventiveMaintenancePreSave } from '../hooks/preventive-maintenance.hooks';

export type PreventiveMaintenanceDocument =
  PreventiveMaintenance & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class PreventiveMaintenance {
  @Prop({ unique: true })
  maintenanceCode: string;

  @Prop({ type: Types.ObjectId, ref: 'Machinery' })
  Machinery: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  UserDepartment: Types.ObjectId;

  @Prop({ required: true })
  dateType: string;

  @Prop()
  lastMaintainanceDate: Date;

  @Prop()
  nextMaintainanceDate: Date;

  @Prop({ required: true })
  natureOfFault: string;

  @Prop({ required: true })
  rootCause: string;

  @Prop({ required: true })
  detailOfWork: string;

  @Prop({ required: true })
  replacement: string;

  @Prop()
  uploadImage: string;

  @Prop({ type: [String], default: [] })
  uploadImages: string[];

  @Prop()
  generateCertificate: string;

  @Prop({ type: [String], default: [] })
  certificates: string[];

  @Prop()
  SubmitBy: string;

  @Prop()
  SubmitDate: Date;
}

export const PreventiveMaintenanceSchema =
  SchemaFactory.createForClass(PreventiveMaintenance);

PreventiveMaintenanceSchema.pre(
  'save',
  preventiveMaintenancePreSave,
);
