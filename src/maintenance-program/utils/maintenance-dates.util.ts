export type MaintenanceFrequencyType =
  | 'Daily'
  | 'Weekly'
  | 'Monthly'
  | 'Quarterly'
  | 'Yearly';

export function getFrequencyType(frequency: unknown): MaintenanceFrequencyType {
  if (typeof frequency === 'string') {
    return frequency as MaintenanceFrequencyType;
  }
  if (frequency && typeof frequency === 'object' && 'type' in frequency) {
    return String((frequency as { type?: string }).type) as MaintenanceFrequencyType;
  }
  return 'Monthly';
}

export function calculateNextMaintenanceDueDate(
  frequencyType: string,
  fromDate: Date = new Date(),
): Date {
  const next = new Date(fromDate);

  switch (frequencyType) {
    case 'Daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'Weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'Monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'Quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'Yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setDate(next.getDate() + 1);
  }

  return next;
}
