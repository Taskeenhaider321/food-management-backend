import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RoleDocument = Role & Document;
export type SystemRoleKind = 'SUPER_ADMIN' | 'COMPANY_ADMIN';

/**
 * Bridge between users and access. Roles are global — any role can be assigned to any company's users.
 *
 * A role carries two kinds of module references:
 * - **moduleIds** (MasterModule) — grants ALL permissions for those seeded modules.
 * - **derivedModuleIds** (DerivedModule) — grants only the cherry-picked permission subset.
 *
 * Both can be mixed in the same role: e.g. full ADMIN_MANAGEMENT + read-only DOCUMENT_MANAGEMENT.
 */
@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Role {
  @Prop({ required: true, trim: true })
  roleName: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Company' })
  companyId?: Types.ObjectId;

  @Prop({ enum: ['SUPER_ADMIN', 'COMPANY_ADMIN'], required: false })
  systemRole?: SystemRoleKind;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'MasterModule' }], default: [] })
  moduleIds: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'DerivedModule' }], default: [] })
  derivedModuleIds: Types.ObjectId[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
