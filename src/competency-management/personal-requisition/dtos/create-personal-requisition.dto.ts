// TEST/hr/personal-requisition/dtos/create-personal-requisition.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class CreatePersonalRequisitionDto {
  @ApiProperty({ description: 'Department ID' })
  @IsString()
  departmentId: string;

  @ApiProperty()
  @IsString()
  addedBy: string;

  @ApiPropertyOptional({ description: 'Station' })
  @IsString()
  Station: string;

  @ApiProperty()
  @IsString()
  JobTitle: string;

  // @ApiProperty()
  // @IsString()
  // DepartmentText: string;

  @ApiProperty()
  @IsString()
  Section: string;

  @ApiProperty()
  @IsString()
  Supervisor: string;

  @ApiProperty({ enum: ['Permanent', 'Contractual', 'Specific Record', 'Part Time', 'Temporary', 'Internship'] })
  @IsEnum(['Permanent', 'Contractual', 'Specific Record', 'Part Time', 'Temporary', 'Internship'])
  EmploymentType: string;

  @ApiProperty()
  @IsNumber()
  GrossSalary: number;

  @ApiProperty()
  @IsNumber()
  NetSalary: number;

  @ApiProperty()
  @IsString()
  BasicSalaryDetail: string;

  @ApiProperty()
  @IsString()
  AllowanceDetail: string;

  @ApiProperty()
  @IsString()
  IncentivesDetail: string;

  @ApiProperty()
  @IsString()
  MiniQualification: string;

  @ApiProperty()
  @IsString()
  MiniExperienced: string;

  @ApiProperty()
  @IsString()
  IndustrySpecificExp: string;

  @ApiProperty()
  @IsString()
  AgeBracket: string;

  @ApiProperty({ enum: ['High', 'Medium', 'Average', 'Not Applicable'] })
  @IsEnum(['High', 'Medium', 'Average', 'Not Applicable'])
  ComputerSkill: string;

  @ApiProperty({ enum: ['High', 'Medium', 'Average', 'Not Applicable'] })
  @IsEnum(['High', 'Medium', 'Average', 'Not Applicable'])
  CommunicationSkill: string;

  @ApiProperty({ enum: ['New Business Need', 'New Structure Need', 'New Target Requirement', 'Department Extension', 'Work Overload Sharing', 'Employee Resignation'] })
  @IsEnum(['New Business Need', 'New Structure Need', 'New Target Requirement', 'Department Extension', 'Work Overload Sharing', 'Employee Resignation'])
  Justification: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  Others?: string;

  @ApiProperty()
  @IsString()
  Designation: string;

  @ApiProperty()
  @IsString()
  MainJobResponsibility: string;
}

export class UpdatePersonStatusDto {
  @ApiProperty()
  @IsString()
  personId: string;

  @ApiProperty({ enum: ['Approved', 'Disapproved'] })
  @IsEnum(['Approved', 'Disapproved'])
  status: string;

  @ApiProperty()
  @IsString()
  updatedBy: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  Reason?: string;
}
