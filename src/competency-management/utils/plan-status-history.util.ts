export type PlanStatusHistoryEntry = {
  status: string;
  changedAt: Date;
  changedBy: string;
  note?: string;
};

export function actorDisplayName(actor?: {
  name?: string;
  email?: string;
}): string {
  if (typeof actor?.name === 'string' && actor.name.trim()) {
    return actor.name.trim();
  }
  if (typeof actor?.email === 'string' && actor.email.trim()) {
    return actor.email.trim();
  }
  return 'System';
}

export function appendPlanStatusHistory(
  plan: {
    ScheduleStatus?: string;
    StatusHistory?: PlanStatusHistoryEntry[];
  },
  newStatus: string,
  changedBy: string,
  note?: string,
): void {
  const previous = plan.ScheduleStatus;
  if (previous === newStatus && !note?.trim()) {
    return;
  }
  if (!plan.StatusHistory) {
    plan.StatusHistory = [];
  }
  plan.StatusHistory.push({
    status: newStatus,
    changedAt: new Date(),
    changedBy,
    ...(note?.trim() ? { note: note.trim() } : {}),
  });
  plan.ScheduleStatus = newStatus;
}

export function seedInitialPlanStatus(
  plan: {
    ScheduleStatus?: string;
    StatusHistory?: PlanStatusHistoryEntry[];
  },
  initialStatus: string,
  changedBy: string,
): void {
  if (plan.StatusHistory?.length) {
    return;
  }
  plan.ScheduleStatus = initialStatus;
  plan.StatusHistory = [
    {
      status: initialStatus,
      changedAt: new Date(),
      changedBy,
    },
  ];
}
