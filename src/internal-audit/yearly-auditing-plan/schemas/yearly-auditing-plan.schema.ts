import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ _id: false })
export class Selected {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ProcessOwner' })
  Process: MongooseSchema.Types.ObjectId;

  @Prop({ enum: ['High Risk', 'Medium Risk', 'Low Risk'] })
  Risk: string;

  @Prop({ type: [String] })
  monthNames: string[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'InternalAuditor' })
  AssignedAuditor?: MongooseSchema.Types.ObjectId;
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class YearlyAuditingPlan extends Document {
  @Prop({ required: true })
  Year: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department' })
  UserDepartment: MongooseSchema.Types.ObjectId;

  @Prop({ type: [Selected] })
  Selected: Selected[];

  @Prop({ enum: ['Active', 'Completed', 'Draft'], default: 'Active' })
  Status: string;

  @Prop()
  CreatedBy: string;

  @Prop({ type: Date })
  CreationDate: Date;
}

export const YearlyAuditingPlanSchema = SchemaFactory.createForClass(YearlyAuditingPlan);
