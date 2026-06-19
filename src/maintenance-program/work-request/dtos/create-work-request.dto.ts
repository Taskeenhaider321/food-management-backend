import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkRequestDto {
  @ApiProperty({ description: 'Machine ID', required: false })
  @IsOptional()
  @IsString()
  MachineId?: string;

  @ApiProperty({ description: 'Equipment ID (measuring device)', required: false })
  @IsOptional()
  @IsString()
  EquipmentId?: string;

  @ApiProperty({ description: 'Department ID', required: false })
  @IsOptional()
  @IsString()
  departmentId: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Area / Location' })
  @IsString()
  Area: string;

  @ApiProperty({ description: 'Priority' })
  @IsString()
  Priority: string;

  @ApiProperty({
    description: 'Discipline (JSON stringified array)',
    type: String,
    example: '["Mechanical"]',
  })
  @IsString()
  Discipline: string;

  @ApiProperty({ description: 'Description' })
  @IsString()
  Description: string;

  @ApiProperty({ description: 'Special instruction' })
  @IsString()
  SpecialInstruction: string;
}

export class RejectWorkRequestDto {
  @ApiProperty({ description: 'Rejection reason' })
  @IsString()
  Reason: string;

  @ApiProperty({ description: 'Rejected by user ID' })
  @IsString()
  rejectedBy: string;
}

export class AcceptWorkRequestDto {
  @ApiProperty({ description: 'Job assigned to' })
  @IsString()
  JobAssigned: string;

  @ApiProperty({ description: 'Designation' })
  @IsString()
  Designation: string;

  @ApiProperty({ description: 'Detail of work' })
  @IsString()
  DetailOfWork: string;

  @ApiProperty({ description: 'Accepted by user ID' })
  @IsString()
  acceptedBy: string;
}

export class CompleteWorkRequestDto {
  @ApiProperty({ description: 'Completed by user ID' })
  @IsString()
  completedBy: string;

  @ApiProperty({ description: 'Completion remarks / reason', required: false })
  @IsOptional()
  @IsString()
  CompletionRemarks?: string;
}

export class ChangePriorityDto {
  @ApiProperty({ description: 'New priority' })
  @IsString()
  Priority: string;

  @ApiProperty({ description: 'Reason for priority change' })
  @IsString()
  Reason: string;

  @ApiProperty({ description: 'Changed by user ID' })
  @IsString()
  changedBy: string;
}

export class ResubmitWorkRequestDto {
  @ApiProperty({ description: 'Resubmitted by user ID' })
  @IsString()
  resubmittedBy: string;
}
