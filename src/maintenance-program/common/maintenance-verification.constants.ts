export const MAINTENANCE_VERIFICATION_ANSWERS = ['Yes', 'No', 'N/A'] as const;
export type MaintenanceVerificationAnswer =
  (typeof MAINTENANCE_VERIFICATION_ANSWERS)[number];

export const MAINTENANCE_RECORD_STATUSES = [
  'In Review',
  'Verified',
] as const;
export type MaintenanceRecordStatus =
  (typeof MAINTENANCE_RECORD_STATUSES)[number];

export const MWR_EXTENDED_STATUSES = [
  'Pending',
  'Approved',
  'Rejected',
  'In Review',
  'Verified',
  'Completed',
] as const;

export type MaintenanceVerificationItemDefinition = {
  key: string;
  label: string;
  mandatory: boolean;
};

export const MAINTENANCE_VERIFICATION_CHECKLIST: MaintenanceVerificationItemDefinition[] =
  [
    {
      key: 'equipmentReassembled',
      label:
        'Equipment reassembled correctly and all guards/safety devices are installed.',
      mandatory: false,
    },
    {
      key: 'workAreaChecked',
      label:
        'Work area checked and confirmed free from tools, spare parts, debris, and contamination risks.',
      mandatory: false,
    },
    {
      key: 'cleaningCompleted',
      label:
        'Cleaning completed and equipment visually verified as hygienic.',
      mandatory: true,
    },
    {
      key: 'functionalChecks',
      label:
        'Functional checks completed (trial run, interlocks, alarms, etc.).',
      mandatory: false,
    },
    {
      key: 'lineClearance',
      label: 'Line clearance confirmed before equipment restart.',
      mandatory: true,
    },
    {
      key: 'calibrationStatus',
      label: 'Calibration status verified (where applicable).',
      mandatory: false,
    },
    {
      key: 'signOffCompleted',
      label: 'Maintenance and QA/Production sign-off completed.',
      mandatory: false,
    },
    {
      key: 'workOrderDocumented',
      label:
        'Work order and maintenance changes documented and traceable.',
      mandatory: false,
    },
    {
      key: 'productSafetyRisk',
      label:
        'Product safety risk assessed and confirmed as controlled before equipment release.',
      mandatory: false,
    },
  ];
