export type AuditFrequency = 'None' | 'Hourly' | 'Daily' | 'Weekly' | 'Monthly';

const FREQUENCY_MS: Record<AuditFrequency, number | null> = {
  None: null,
  Hourly: 60 * 60 * 1000,
  Daily: 24 * 60 * 60 * 1000,
  Weekly: 7 * 24 * 60 * 60 * 1000,
  Monthly: 30 * 24 * 60 * 60 * 1000,
};

export function normalizeAuditFrequency(value?: string | null): AuditFrequency {
  if (value === 'Hourly' || value === 'Daily' || value === 'Weekly' || value === 'Monthly') {
    return value;
  }
  return 'None';
}

export function frequencyIntervalMs(frequency: AuditFrequency): number | null {
  return FREQUENCY_MS[frequency];
}

export function nextCycleStart(auditDate: Date, frequency: AuditFrequency): Date | null {
  const interval = frequencyIntervalMs(frequency);
  if (!interval) return null;
  return new Date(new Date(auditDate).getTime() + interval);
}

export function isCycleElapsed(
  auditDate: Date,
  frequency: AuditFrequency,
  now: Date = new Date(),
): boolean {
  const next = nextCycleStart(auditDate, frequency);
  if (!next) return false;
  return now.getTime() >= next.getTime();
}

export function canSubmitNewAudit(
  latestAuditDate: Date | undefined,
  frequency: AuditFrequency,
  now: Date = new Date(),
): boolean {
  if (!latestAuditDate || frequency === 'None') return true;
  return isCycleElapsed(latestAuditDate, frequency, now);
}

export function canEditAuditRecord(
  audit: { AuditDate: Date; isLocked?: boolean },
  latestAuditId: string,
  auditId: string,
  frequency: AuditFrequency,
  now: Date = new Date(),
): boolean {
  if (audit.isLocked) return false;
  if (String(auditId) !== String(latestAuditId)) return false;
  if (frequency === 'None') return true;
  return !isCycleElapsed(audit.AuditDate, frequency, now);
}

export function msUntilNextSubmission(
  latestAuditDate: Date,
  frequency: AuditFrequency,
  now: Date = new Date(),
): number {
  const next = nextCycleStart(latestAuditDate, frequency);
  if (!next) return 0;
  return Math.max(0, next.getTime() - now.getTime());
}
