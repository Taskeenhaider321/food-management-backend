import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class ConductAudits extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department' })
  UserDepartment: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Checklist' })
  Checklist: MongooseSchema.Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'ChecklistAnswer' }] })
  Answers: MongooseSchema.Types.ObjectId[];

  @Prop()
  AuditBy: string;

  @Prop({ type: Date })
  AuditDate: Date;

  @Prop({ default: false })
  isLocked: boolean;

  @Prop()
  UpdatedBy?: string;

  @Prop({ type: Date })
  UpdatedAt?: Date;
}

export const ConductAuditsSchema = SchemaFactory.createForClass(ConductAudits);
