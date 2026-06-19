import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MachineryHooks } from '../hooks/machinery.hooks';

export type MachineryDocument = Machinery & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Machinery {
  @Prop({ unique: true })
  machineCode: string;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  UserDepartment: Types.ObjectId;

  @Prop({ required: true })
  machineName: string;

  @Prop({ required: true })
  machinaryLocation: string;

  @Prop({ type: Object, required: true })
  maintenanceFrequency: {
    type: string;
    reason: string;
  };

  @Prop()
  lastMaintenanceDate: Date;

  @Prop()
  nextMaintenanceDueDate: Date;

  @Prop({ default: 'Preventive' })
  maintainanceType: string;

  @Prop()
  CreatedBy: string;

  @Prop()
  CreationDate: Date;
}

export const MachinerySchema = SchemaFactory.createForClass(Machinery);

// ✅ attach hook
MachinerySchema.pre('save', MachineryHooks.generateMachineCode);
