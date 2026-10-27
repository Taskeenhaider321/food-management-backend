import { DOCUMENT_TYPE_SCOPE_KEYS } from '../scope-keys';

export type DefaultDocumentTypeSeed = {
  title: string;
  icon: string;
  documentNumber: number;
};

export const DEFAULT_DOCUMENT_TYPES_BY_SCOPE: Record<
  string,
  DefaultDocumentTypeSeed[]
> = {
  [DOCUMENT_TYPE_SCOPE_KEYS.DOCUMENT_MANAGEMENT_DOCUMENTS]: [
    { title: 'Manual', icon: 'book', documentNumber: 1 },
    { title: 'Procedure', icon: 'clipboard', documentNumber: 2 },
    { title: 'SOP', icon: 'file', documentNumber: 3 },
    { title: 'Work Instructions', icon: 'list', documentNumber: 4 },
    { title: 'Records', icon: 'clipboard', documentNumber: 5 },
    { title: 'Risk Assessment', icon: 'shield', documentNumber: 6 },
    {
      title: 'Finished Product Specifications',
      icon: 'check',
      documentNumber: 7,
    },
    {
      title: 'Raw Material Specifications',
      icon: 'wrench',
      documentNumber: 8,
    },
    { title: 'Job Description', icon: 'users', documentNumber: 9 },
  ],
  [DOCUMENT_TYPE_SCOPE_KEYS.DOCUMENT_MANAGEMENT_FORMS]: [
    { title: 'Forms', icon: 'clipboard', documentNumber: 1 },
  ],
};
