import { BadRequestException } from '@nestjs/common';
import { TimelineEntry } from './timeline.schema';
import { VersionEntry } from './version.schema';

export interface HaccpWorkflowRecord {
  Status: string;
  Reason?: string;
  RevisionNo?: number;
  enabled?: boolean;
  timeline?: TimelineEntry[];
  versions?: VersionEntry[];
  ApprovedBy?: string;
  ApprovalDate?: Date;
  DisapprovedBy?: string;
  DisapprovalDate?: Date;
}

export function normalizeStatus(status?: string): string {
  if (!status || status === 'Pending') return 'In Review';
  return status;
}

export function canEditRecord(record: HaccpWorkflowRecord): boolean {
  const status = normalizeStatus(record.Status);
  return (
    status === 'In Review' ||
    status === 'Rejected' ||
    status === 'Disapproved'
  );
}

export function shouldTrackChanges(record: HaccpWorkflowRecord): boolean {
  const status = normalizeStatus(record.Status);
  return status === 'Rejected' || status === 'Disapproved';
}

function pushTimeline(
  record: HaccpWorkflowRecord,
  entry: Partial<TimelineEntry>,
) {
  if (!record.timeline) record.timeline = [];
  record.timeline.push({
    action: entry.action!,
    status: entry.status!,
    user: entry.user!,
    at: entry.at ?? new Date(),
    reason: entry.reason,
  } as TimelineEntry);
}

export function initCreatedTimeline(
  record: HaccpWorkflowRecord,
  userName: string,
) {
  record.Status = 'In Review';
  record.enabled = record.enabled ?? true;
  record.timeline = [
    {
      action: 'Created',
      status: 'In Review',
      user: userName,
      at: new Date(),
    } as TimelineEntry,
  ];
}

export function reviewRecord(record: HaccpWorkflowRecord, userName: string) {
  const status = normalizeStatus(record.Status);
  if (status !== 'In Review') {
    throw new BadRequestException(
      'Only records in review can be marked as reviewed',
    );
  }
  record.Status = 'Reviewed';
  pushTimeline(record, {
    action: 'Reviewed',
    status: 'Reviewed',
    user: userName,
  });
}

export function approveRecord(record: HaccpWorkflowRecord, userName: string) {
  const status = normalizeStatus(record.Status);
  if (status !== 'Reviewed') {
    throw new BadRequestException('Only reviewed records can be approved');
  }
  record.Status = 'Approved';
  record.ApprovedBy = userName;
  record.ApprovalDate = new Date();
  record.DisapprovedBy = undefined;
  record.DisapprovalDate = undefined;
  record.Reason = undefined;
  pushTimeline(record, {
    action: 'Approved',
    status: 'Approved',
    user: userName,
  });
}

export function rejectRecord(
  record: HaccpWorkflowRecord,
  userName: string,
  reason: string,
) {
  const status = normalizeStatus(record.Status);
  if (status !== 'In Review' && status !== 'Reviewed') {
    throw new BadRequestException(
      'Only records in review or reviewed can be rejected',
    );
  }
  record.Status = 'Rejected';
  record.Reason = reason;
  record.ApprovedBy = undefined;
  record.ApprovalDate = undefined;
  pushTimeline(record, {
    action: 'Rejected',
    status: 'Rejected',
    user: userName,
    reason,
  });
}

export function disapproveRecord(
  record: HaccpWorkflowRecord,
  userName: string,
  reason: string,
) {
  const status = normalizeStatus(record.Status);
  if (status !== 'Approved') {
    throw new BadRequestException('Only approved records can be disapproved');
  }
  record.Status = 'Disapproved';
  record.Reason = reason;
  record.ApprovedBy = undefined;
  record.ApprovalDate = undefined;
  record.DisapprovedBy = userName;
  record.DisapprovalDate = new Date();
  pushTimeline(record, {
    action: 'Disapproved',
    status: 'Disapproved',
    user: userName,
    reason,
  });
}

export function toggleEnabledRecord(
  record: HaccpWorkflowRecord,
  userName: string,
) {
  const status = normalizeStatus(record.Status);
  if (status !== 'Reviewed' && status !== 'Approved') {
    throw new BadRequestException(
      'Only reviewed or approved records can be enabled or disabled',
    );
  }
  record.enabled = !record.enabled;
  pushTimeline(record, {
    action: record.enabled ? 'Enabled' : 'Disabled',
    status: record.Status,
    user: userName,
  });
}

export function resubmitRecord(
  record: HaccpWorkflowRecord,
  userName: string,
  changedFields: string[],
  snapshot?: Record<string, unknown>,
) {
  if (!shouldTrackChanges(record)) return;

  if (!record.versions) record.versions = [];
  record.versions.push({
    revisionNo: record.RevisionNo ?? 0,
    changedFields:
      changedFields.length > 0 ? changedFields : ['No fields changed'],
    changedBy: userName,
    changedAt: new Date(),
    snapshot,
  } as VersionEntry);

  record.RevisionNo = (record.RevisionNo ?? 0) + 1;
  record.Status = 'In Review';
  record.Reason = undefined;
  pushTimeline(record, {
    action: 'Resubmitted',
    status: 'In Review',
    user: userName,
  });
}
