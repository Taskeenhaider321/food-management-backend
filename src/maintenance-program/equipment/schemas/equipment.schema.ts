import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EquipmentHooks } from '../hooks/equipment.hooks';

export type EquipmentDocument = Equipment & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Equipment {
  @Prop({ unique: true })
  equipmentCode: string;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  UserDepartment: Types.ObjectId;

  @Prop({ required: true })
  equipmentName: string;

  @Prop({ required: true })
  equipmentLocation: string;

  @Prop({ required: true })
  Range: string;

  @Prop({ type: Object, required: true })
  callibration: any;

  @Prop()
  CreatedBy: string;

  @Prop()
  CreationDate: Date;
}

export const EquipmentSchema = SchemaFactory.createForClass(Equipment);

// ✅ Attach hook from separate file
EquipmentSchema.pre('save', EquipmentHooks.generateEquipmentCode);
