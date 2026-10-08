/** Stable form/tab scopes for custom document types. Never use display names. */
export const DOCUMENT_TYPE_SCOPE_KEYS = {
  FOOD_SAFETY_TEAM: 'food-safety.team',
  FOOD_SAFETY_DESCRIBE_PRODUCT: 'food-safety.describe-product',
  FOOD_SAFETY_FLOW_DIAGRAM: 'food-safety.flow-diagram',
  FOOD_SAFETY_RISK_ASSESSMENT: 'food-safety.risk-assessment',
  FOOD_SAFETY_CCP_OPRP: 'food-safety.ccp-oprp',
  DOCUMENT_MANAGEMENT_DOCUMENTS: 'document-management.documents',
  DOCUMENT_MANAGEMENT_FORMS: 'document-management.forms',
  DOCUMENT_MANAGEMENT_CHANGE_REQUEST: 'document-management.change-request',
  AUDITS_CHECKLIST: 'audits.checklist',
} as const;

export type DocumentTypeScopeKey =
  (typeof DOCUMENT_TYPE_SCOPE_KEYS)[keyof typeof DOCUMENT_TYPE_SCOPE_KEYS];
