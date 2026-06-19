import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PersonalRequisitionDocument = PersonalRequisition & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class PersonalRequisition {
  @Prop({ enum: ['Approved', 'Disapproved', 'Pending'], default: 'Pending' })
  Status: string;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  departmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Company' })
  companyId: Types.ObjectId;

  @Prop()
  Reason?: string;

  @Prop()
  Station: string;

  @Prop()
  JobTitle: string;

  @Prop()
  DepartmentText: string;

  @Prop({ required: true })
  Section: string;

  @Prop({ required: true })
  Supervisor: string;

  @Prop({
    enum: [
      'Permanent',
      'Contractual',
      'Specific Record',
      'Part Time',
      'Temporary',
      'Internship',
    ],
  })
  EmploymentType: string;

  @Prop()
  GrossSalary: number;

  @Prop()
  NetSalary: number;

  @Prop()
  BasicSalaryDetail: string;

  @Prop()
  AllowanceDetail: string;

  @Prop()
  IncentivesDetail: string;

  @Prop({ required: true })
  MiniQualification: string;

  @Prop({ required: true })
  MiniExperienced: string;

  @Prop({ required: true })
  IndustrySpecificExp: string;

  @Prop({ required: true })
  AgeBracket: string;

  @Prop({ enum: ['High', 'Medium', 'Average', 'Not Applicable'] })
  ComputerSkill: string;

  @Prop({ enum: ['High', 'Medium', 'Average', 'Not Applicable'] })
  CommunicationSkill: string;

  @Prop({
    enum: [
      'New Business Need',
      'New Structure Need',
      'New Target Requirement',
      'Department Extension',
      'Work Overload Sharing',
      'Employee Resignation',
    ],
  })
  Justification: string;

  @Prop()
  Others: string;

  @Prop({ required: true })
  Designation: string;

  @Prop({ required: true })
  MainJobResponsibility: string;

  @Prop()
  RequestInitiatedBy: string;

  @Prop()
  RequestBy: string;

  @Prop()
  RequestDate: Date;

  @Prop()
  ApprovedBy: string;

  @Prop()
  ApprovalDate: Date;

  @Prop()
  DisapprovedBy: string;

  @Prop()
  DisapprovalDate: Date;
}

export const PersonalRequisitionSchema =
  SchemaFactory.createForClass(PersonalRequisition);
