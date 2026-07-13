import { Model } from 'mongoose';

const DOCUMENT_TYPE_MAP: Record<string, number> = {
  Manuals: 1,
  Procedures: 2,
  SOPs: 3,
  Forms: 4,
};

type CompanyRef = {
  shortName?: string;
};

type DepartmentDoc = {
  shortName?: string;
  companyId?: CompanyRef | string | null;
};

type DocumentIdTarget = {
  isNew: boolean;
  DocumentId?: string;
  Department: unknown;
  DocumentType: string;
  model: (name: string) => Model<DepartmentDoc>;
  constructor: unknown;
};

export async function assignHaccpDocumentId(target: DocumentIdTarget) {
  if (!target.isNew || target.DocumentId) {
    return;
  }

  const DepartmentModel = target.model('Department');

  const department = await DepartmentModel.findById(target.Department)
    .populate<{ companyId: CompanyRef | null }>('companyId')
    .lean()
    .exec();

  if (!department) {
    throw new Error('Department not found');
  }

  const company = department.companyId;
  if (!company || typeof company !== 'object' || !company.shortName) {
    throw new Error('Company not found in Department');
  }

  const documentTypeNumber = DOCUMENT_TYPE_MAP[target.DocumentType];
  if (!documentTypeNumber) {
    throw new Error('Invalid Document Type');
  }

  const ScopeModel = target.constructor as Model<{ DocumentId?: string }>;

  const latestDocument = await ScopeModel.findOne(
    { Department: target.Department, DocumentType: target.DocumentType },
    { DocumentId: 1 },
  )
    .sort({ DocumentId: -1 })
    .lean()
    .exec();

  let nextNumericPart = 1;

  if (latestDocument?.DocumentId) {
    const parts = latestDocument.DocumentId.split('/');
    const numericPart = parseInt(parts[3], 10);
    if (!isNaN(numericPart)) {
      nextNumericPart = numericPart + 1;
    }
  }

  if (!department.shortName) {
    throw new Error('Department shortName is missing');
  }

  target.DocumentId = `${company.shortName}/${department.shortName}/${documentTypeNumber}/${nextNumericPart
    .toString()
    .padStart(3, '0')}`;
}
