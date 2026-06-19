import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MasterModuleDocument = MasterModule & Document;

/**
 * Global module catalog (seeded once). Super-admin sees the full list.
 * Company-specific display names live on {@link CompanyModule}; this document is never mutated per company.
 */
@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class MasterModule {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  defaultName?: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  key: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const MasterModuleSchema = SchemaFactory.createForClass(MasterModule);
