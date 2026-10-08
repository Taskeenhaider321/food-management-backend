import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { DOCUMENT_TYPE_CODES } from './constants';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function actorDisplayName(actor: any): string {
  return actor?.name || actor?.userName || actor?.email || 'Unknown user';
}

function resolveDocumentTypeCode(
  documentType: string,
  documentTypeCode?: number,
): number {
  if (
    typeof documentTypeCode === 'number' &&
    Number.isFinite(documentTypeCode) &&
    documentTypeCode >= 1
  ) {
    return Math.floor(documentTypeCode);
  }

  const legacy =
    (DOCUMENT_TYPE_CODES as Record<string, number>)[documentType] ??
    ({
      Manuals: 1,
      Procedures: 2,
      SOPs: 3,
      Forms: 4,
    } as Record<string, number>)[documentType];

  if (legacy) return legacy;

  throw new BadRequestException(
    'Invalid document type — provide documentTypeCode from a custom document type',
  );
}

/**
 * Generates a controlled document id:
 * `CompanyShortName/DepartmentShortName/DocumentTypeCode/IncrementNumber`
 */
export async function generateDocumentId(
  departmentModel: Model<any>,
  scopeModel: Model<any>,
  departmentId: string,
  documentType: string,
  documentTypeCode?: number,
): Promise<{ documentId: string; companyId: any }> {
  const department = await departmentModel
    .findById(departmentId)
    .populate('companyId')
    .lean();

  if (!department) {
    throw new NotFoundException('Department not found');
  }

  const company: any = department.companyId;
  if (!company || typeof company !== 'object' || !company.shortName) {
    throw new BadRequestException(
      'Department is not linked to a company with a short name',
    );
  }

  const typeCode = resolveDocumentTypeCode(documentType, documentTypeCode);
  const prefix = `${company.shortName}/${department.shortName}/${typeCode}/`;

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
