import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { calibrationPreSave } from '../hooks/calibration-record.hooks';

export type CalibrationRecordDocument = CalibrationRecord & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class CalibrationRecord {
  @Prop({ type: Types.ObjectId, ref: 'Equipment' })
  Equipment: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  UserDepartment: Types.ObjectId;

  @Prop({ required: true })
  CR: string;

  @Prop({ unique: true })
  callibrationCode: string;

  @Prop({ required: true })
  lastCallibrationDate: Date;

  @Prop({ required: true })
  dateType: string;

  @Prop({ required: true, enum: ['Internal', 'External'] })
  callibrationType: string;

  @Prop({
    type: {
      firstReading: Number,
      secondReading: Number,
      thirdReading: Number,
    },
    required: true,
  })
  measuredReading: {
    firstReading: number;
    secondReading: number;
    thirdReading: number;
  };

  @Prop({ required: true })
  nextCallibrationDate: Date;

  @Prop({ required: true })
  comment: string;

  @Prop({
    type: {
      ImageURL: String,
      CertificateURL: String,
      masterCertificateURL: String,
    },
  })
  internal?: {
    ImageURL?: string;
    CertificateURL?: string;
    masterCertificateURL?: string;
  };

  @Prop({
    type: {
      companyName: String,
      masterReference: String,
      exCertificateURL: String,
    },
  })
  external?: {
    companyName?: string;
    masterReference?: string;
    exCertificateURL?: string;
  };

  @Prop()
  CaliberateBy: string;

  @Prop()
  CaliberatDate: Date;
}

export const CalibrationRecordSchema =
  SchemaFactory.createForClass(CalibrationRecord);

CalibrationRecordSchema.pre('save', calibrationPreSave);
