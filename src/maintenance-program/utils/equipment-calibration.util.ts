import {
  calculateNextMaintenanceDueDate,
  MaintenanceFrequencyType,
} from './maintenance-dates.util';

export type CalibrationFrequencyEntry = {
  type: MaintenanceFrequencyType;
  reason: string;
  lastCalibrationDate?: string;
  nextCalibrationDueDate?: string;
};

export type EquipmentCalibrationConfig = {
  internal: CalibrationFrequencyEntry[];
  external: CalibrationFrequencyEntry[];
};

export function normalizeEquipmentCalibration(
  value: unknown,
): EquipmentCalibrationConfig {
  if (!value || typeof value !== 'object') {
    return { internal: [], external: [] };
  }

  const raw = value as Record<string, unknown>;
  return {
    internal: normalizeFrequencyList(raw.internal),
    external: normalizeFrequencyList(raw.external),
  };
}

function normalizeFrequencyList(value: unknown): CalibrationFrequencyEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const entry = item as Record<string, unknown>;
      const type = String(entry.type || '') as MaintenanceFrequencyType;
      const reason = String(entry.reason || '').trim();
      if (!type || !reason) return null;
      return {
        type,
        reason,
        lastCalibrationDate: entry.lastCalibrationDate
          ? String(entry.lastCalibrationDate)
          : undefined,
        nextCalibrationDueDate: entry.nextCalibrationDueDate
          ? String(entry.nextCalibrationDueDate)
          : undefined,
      };
    })
    .filter(Boolean) as CalibrationFrequencyEntry[];
}

export function initializeCalibrationConfig(
  config: EquipmentCalibrationConfig,
  fromDate: Date = new Date(),
): EquipmentCalibrationConfig {
  const seed = (entries: CalibrationFrequencyEntry[]) =>
    entries.map((entry) => ({
      ...entry,
      lastCalibrationDate: entry.lastCalibrationDate,
      nextCalibrationDueDate:
        entry.nextCalibrationDueDate ||
        calculateNextMaintenanceDueDate(entry.type, fromDate).toISOString(),
    }));

  return {
    internal: seed(config.internal),
    external: seed(config.external),
  };
}

export function mergeCalibrationConfig(
  existing: EquipmentCalibrationConfig,
  incoming: EquipmentCalibrationConfig,
  creationDate: Date = new Date(),
): EquipmentCalibrationConfig {
  const mergeList = (
    prev: CalibrationFrequencyEntry[],
    next: CalibrationFrequencyEntry[],
  ) =>
    next.map((entry) => {
      const match = prev.find((item) => item.type === entry.type);
      if (!match) {
        return {
          ...entry,
          nextCalibrationDueDate: calculateNextMaintenanceDueDate(
            entry.type,
            creationDate,
          ).toISOString(),
        };
      }
      return {
        ...entry,
        lastCalibrationDate: entry.lastCalibrationDate || match.lastCalibrationDate,
        nextCalibrationDueDate:
          entry.nextCalibrationDueDate ||
          match.nextCalibrationDueDate ||
          calculateNextMaintenanceDueDate(entry.type, creationDate).toISOString(),
      };
    });

  return {
    internal: mergeList(existing.internal, incoming.internal),
    external: mergeList(existing.external, incoming.external),
  };
}

export function updateCalibrationEntryAfterRecord(
  config: EquipmentCalibrationConfig,
  calibrationType: 'Internal' | 'External',
  frequencyType: string,
  completedAt: Date,
): EquipmentCalibrationConfig {
  const key = calibrationType === 'Internal' ? 'internal' : 'external';
  const nextDate = calculateNextMaintenanceDueDate(frequencyType, completedAt);

  return {
    ...config,
    [key]: config[key].map((entry) =>
      entry.type === frequencyType
        ? {
            ...entry,
            lastCalibrationDate: completedAt.toISOString(),
            nextCalibrationDueDate: nextDate.toISOString(),
          }
        : entry,
    ),
  };
}
