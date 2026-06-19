import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TrainerDocument = Trainer & Document;

@Schema({ _id: false })
export class TrainerTrainingEntry {
  @Prop({ type: Types.ObjectId, ref: 'Training' })
  training?: Types.ObjectId;

  @Prop({ enum: ['Pending', 'Active'], default: 'Pending' })
  resultStatus?: string;
}

@Schema({ timestamps: true })
export class Trainer {
  @Prop({ type: Types.ObjectId, ref: 'Profile', required: true, unique: true })
  profileId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  specialities: string[];

  @Prop({ type: [TrainerTrainingEntry], default: [] })
  trainings: TrainerTrainingEntry[];
}

export const TrainerSchema = SchemaFactory.createForClass(Trainer);
