export const DOCUMENT_TYPES = ['Manual', 'Procedure', 'SOP', 'Form'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** Codes used when generating Document IDs (CompanyShortName/DeptShortName/Code/Increment). */
export const DOCUMENT_TYPE_CODES: Record<DocumentType, number> = {
  Manual: 1,
  Procedure: 2,
  SOP: 3,
  Form: 4,
};

export const DOCUMENT_STATUSES = [
  'In Review',
  'Reviewed',
  'Approved',
  'Rejected',
  'Disapproved',
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const CREATION_METHODS = ['upload', 'editor'] as const;
export type CreationMethod = (typeof CREATION_METHODS)[number];

export const CHANGE_REQUEST_STATUSES = [
  'Request Pending',
  'Approved',
  'Disapproved',
] as const;
export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number];

export const QUESTION_TYPES = [
  'Short Answer',
  'Paragraph',
  'Multiple Choice',
  'Checkboxes',
  'Dropdown',
  'Date',
  'Time',
  'Number',
  'File Upload',
  'Linear Scale',
  'Multiple Choice Grid',
  'Checkbox Grid',
  'Section Break',
  'Image',
  'Video',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
