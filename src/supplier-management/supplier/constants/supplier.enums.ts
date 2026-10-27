export const SUPPLIER_TYPES = [
  'Trader / Commission Agent',
  'Manufacturer',
  'Service Provider',
  'Retailer',
  'Sub-Contractor',
] as const;

export type SupplierType = (typeof SUPPLIER_TYPES)[number];

export const SUPPLIER_WORKFLOW_STATUSES = [
  'draft',
  'pending_review',
  'returned',
  'on_hold',
  'rejected',
  'approved',
] as const;

export type SupplierWorkflowStatus =
  (typeof SUPPLIER_WORKFLOW_STATUSES)[number];

export const SUPPLIER_RISK_LEVELS = [
  'low',
  'moderate',
  'high',
  'very_high',
] as const;

export type SupplierEvaluationRiskLevel =
  (typeof SUPPLIER_RISK_LEVELS)[number];

export const SUPPLIER_REVIEW_ACTIONS = [
  'submitted',
  'returned',
  'on_hold',
  'rejected',
  'approved',
  'evaluation_saved',
] as const;

export type SupplierReviewAction = (typeof SUPPLIER_REVIEW_ACTIONS)[number];
