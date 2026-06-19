import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class MonthlyAuditingPlan extends Document {
  @Prop({ type: Date })
  ActualDate: Date;

  @Prop({ enum: ['Conducted', 'Not Conducted'], default: 'Not Conducted' })
  AuditResultStatus: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department' })
  UserDepartment: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  Date: number;

  @Prop({ required: true })
  Month: string;

  @Prop({ required: true })
  Year: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department', required: true })
  Department: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ProcessOwner' })
  ProcessOwner: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  LeadAuditor: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  TeamAuditor: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'YearlyAuditingPlan' })
  YearlyAuditingPlan: MongooseSchema.Types.ObjectId;

  @Prop()
  CreatedBy: string;

  @Prop({ type: Date })
  CreationDate: Date;
}

export const MonthlyAuditingPlanSchema = SchemaFactory.createForClass(MonthlyAuditingPlan);
