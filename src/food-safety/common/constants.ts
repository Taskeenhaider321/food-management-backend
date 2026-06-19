export const HACCP_DOCUMENT_TYPES = [
  'Manuals',
  'Procedures',
  'SOPs',
  'Forms',
] as const;
export type HaccpDocumentType = (typeof HACCP_DOCUMENT_TYPES)[number];

export const HACCP_DOCUMENT_TYPE_CODES: Record<HaccpDocumentType, number> = {
  Manuals: 1,
  Procedures: 2,
  SOPs: 3,
  Forms: 4,
};

export const HACCP_STATUSES = [
  'In Review',
  'Reviewed',
  'Approved',
  'Rejected',
  'Disapproved',
  'Pending', // legacy — treated as In Review
] as const;
export type HaccpStatus = (typeof HACCP_STATUSES)[number];

export const ACTIVE_HACCP_STATUSES = [
  'In Review',
  'Reviewed',
  'Approved',
  'Rejected',
  'Disapproved',
] as const;
