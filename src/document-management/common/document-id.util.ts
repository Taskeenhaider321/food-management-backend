import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { DOCUMENT_TYPE_CODES, DocumentType } from './constants';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function actorDisplayName(actor: any): string {
  return actor?.name || actor?.userName || actor?.email || 'Unknown user';
}

/**
 * Generates a controlled document id in the format
 * `CompanyShortName/DepartmentShortName/DocumentTypeCode/IncrementNumber`
 * (e.g. ABC/QA/1/001). The increment is scoped to the company + department +
 * document type prefix within the given collection.
 */
export async function generateDocumentId(
  departmentModel: Model<any>,
  scopeModel: Model<any>,
  departmentId: string,
  documentType: DocumentType,
): Promise<{ documentId: string; companyId: any }> {
  const department = await departmentModel
    .findById(departmentId)
    .populate('companyId')
    .lean();

  if (!department) {
    throw new NotFoundException('Department not found');
  }

  const company: any = (department as any).companyId;
  if (!company || typeof company !== 'object' || !company.shortName) {
    throw new BadRequestException(
      'Department is not linked to a company with a short name',
    );
  }

  const typeCode = DOCUMENT_TYPE_CODES[documentType];
  if (!typeCode) {
    throw new BadRequestException('Invalid document type');
  }

  const prefix = `${company.shortName}/${(department as any).shortName}/${typeCode}/`;

  const existing = await scopeModel
    .find({ documentId: new RegExp(`^${escapeRegExp(prefix)}`) })
    .select('documentId')
    .lean();

  let next = 1;
  for (const doc of existing as Array<{ documentId?: string }>) {
    const numeric = parseInt(doc.documentId?.split('/')[3] ?? '', 10);
    if (!Number.isNaN(numeric) && numeric >= next) {
      next = numeric + 1;
    }
  }

  return {
    documentId: `${prefix}${next.toString().padStart(3, '0')}`,
    companyId: company._id,
  };
}
