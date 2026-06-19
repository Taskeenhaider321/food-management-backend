import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DerivedModuleDocument = DerivedModule & Document;

/**
 * A global customization of a MasterModule with a cherry-picked permission subset.
 *
 * Two types of modules exist in the system:
 * 1. **MasterModule** (seeded) — carries ALL permissions for that module.
 * 2. **DerivedModule** (created at runtime by super-admin) — references a MasterModule
 *    but includes only a **selected subset** of its permissions, with optional name overrides.
 *
 * Both are global. Any company can be assigned either type through roles.
 * Multiple DerivedModules can exist for the same MasterModule with different subsets.
 */
@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class DerivedModule {
  @Prop({ type: Types.ObjectId, ref: 'MasterModule', required: true })
  masterModuleId: Types.ObjectId;

  @Prop({ trim: true })
  customName?: string;

  @Prop({ type: Object })
  resourceCustomNames?: Record<string, string>;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'MasterPermission' }], default: [] })
  selectedPermissionIds: Types.ObjectId[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const DerivedModuleSchema = SchemaFactory.createForClass(DerivedModule);
