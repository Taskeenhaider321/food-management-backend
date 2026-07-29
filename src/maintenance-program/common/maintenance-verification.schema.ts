import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MAINTENANCE_VERIFICATION_ANSWERS } from './maintenance-verification.constants';

@Schema({ _id: false })
export class MaintenanceVerificationChecklistItem {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  label: string;

  @Prop({ default: false })
  mandatory: boolean;

  @Prop({ required: true, enum: MAINTENANCE_VERIFICATION_ANSWERS })
  answer: string;

  @Prop()
  reason?: string;
}

export const MaintenanceVerificationChecklistItemSchema =
  SchemaFactory.createForClass(MaintenanceVerificationChecklistItem);
