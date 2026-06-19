import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MasterPermissionDocument = MasterPermission & Document;

/**
 * Global permission row (one per seeded endpoint / action). Linked to {@link MasterModule} only.
 * Grouping in UIs uses the `resource` string (e.g. company, department); no separate resource collection.
 */
@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class MasterPermission {
  @Prop({ type: Types.ObjectId, ref: 'MasterModule', required: true })
  moduleId: Types.ObjectId;

  @Prop({ required: true, trim: true, lowercase: true })
  resource: string;

  /** Shared sub-tab / resource-group title; same for all rows with the same module + resource. */
  @Prop({ trim: true })
  resourceGroupLabel?: string;

  @Prop({ required: true, trim: true, lowercase: true })
  action: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  key: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ trim: true })
  defaultName?: string;

  @Prop({ trim: true, uppercase: true })
  method?: string;

  @Prop({ trim: true })
  path?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const MasterPermissionSchema = SchemaFactory.createForClass(MasterPermission);
