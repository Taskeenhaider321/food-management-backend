import { IsString, IsEnum, IsArray, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUploadDocumentsDto {
  @ApiProperty({ description: 'Department ID' })
  @IsString()
  departmentId: string;

  @ApiProperty({ description: 'User department ID' })
  @IsString()
  userDepartmentId: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Company ID' })
  @IsString()
  companyId: string;

  @ApiProperty({ description: 'Document name' })
  @IsString()
  DocumentName: string;

  @ApiProperty({ description: 'Document type', enum: ['Manuals', 'Procedures', 'SOPs', 'Forms'] })
  @IsEnum(['Manuals', 'Procedures', 'SOPs', 'Forms'])
  DocumentType: string;
}

export class ReviewUploadedDocumentDto {
  @ApiProperty({ description: 'Document ID' })
  @IsString()
  documentId: string;

  @ApiProperty({ description: 'Reviewed by' })
  @IsString()
  reviewBy: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Company ID' })
  @IsString()
  companyId: string;
}

export class RejectUploadedDocumentDto {
  @ApiProperty({ description: 'Document ID' })
  @IsString()
  documentId: string;

  @ApiProperty({ description: 'Rejected by' })
  @IsString()
  rejectBy: string;

  @ApiProperty({ description: 'Rejection reason' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Company ID' })
  @IsString()
  companyId: string;
}

export class ApproveUploadedDocumentDto {
  @ApiProperty({ description: 'Document ID' })
  @IsString()
  documentId: string;

  @ApiProperty({ description: 'Approved by' })
  @IsString()
  approvedBy: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Company ID' })
  @IsString()
  companyId: string;
}

export class  DisapproveUploadedDocumentDto {
  @ApiProperty({ description: 'Document ID' })
  @IsString()
  documentId: string;

  @ApiProperty({ description: 'Disapproved by' })
  @IsString()
  disapprovedBy: string;

  @ApiProperty({ description: 'Disapproval reason' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Company ID' })
  @IsString()
  companyId: string;
}

export class CommentDocumentDto {
  @ApiProperty({ description: 'Object index' })
  @IsNumber()
  objIndex: number;

  @ApiProperty({ description: 'Comment' })
  @IsString()
  comment: string;
}

export class ReplaceDocumentDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Company ID' })
  @IsString()
  companyId: string;
}
