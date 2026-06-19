import { BadRequestException } from '@nestjs/common';

export const TRAINING_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Week blocks W1–W4: days 1–7, 8–14, 15–21, 22–end (local calendar). */
export function weekOfMonthBoundsLocal(
  year: number,
  monthName: string,
  weekNum: number,
): { start: Date; end: Date } {
  const mi = TRAINING_MONTH_NAMES.indexOf(
    monthName as (typeof TRAINING_MONTH_NAMES)[number],
  );
  if (mi < 0) {
    throw new BadRequestException(`Invalid month name: ${monthName}`);
  }
  const w = Math.min(Math.max(weekNum, 1), 4);
  const lastDay = new Date(year, mi + 1, 0).getDate();
  const startDay = 1 + (w - 1) * 7;
  const endDay = Math.min(startDay + 6, lastDay);
  return {
    start: new Date(year, mi, startDay, 0, 0, 0, 0),
    end: new Date(year, mi, endDay, 23, 59, 59, 999),
  };
}

/** Full calendar month bounds (local time). */
export function monthBoundsLocal(
  year: number,
  monthName: string,
): { start: Date; end: Date } {
  const mi = TRAINING_MONTH_NAMES.indexOf(
    monthName as (typeof TRAINING_MONTH_NAMES)[number],
  );
  if (mi < 0) {
    throw new BadRequestException(`Invalid month name: ${monthName}`);
  }
  const lastDay = new Date(year, mi + 1, 0).getDate();
  return {
    start: new Date(year, mi, 1, 0, 0, 0, 0),
    end: new Date(year, mi, lastDay, 23, 59, 59, 999),
  };
}

export function unionWeekBoundsLocal(
  year: number,
  monthName: string,
  weekNumbers: number[],
): { start: Date; end: Date } | null {
  const valid = [...new Set(weekNumbers)]
    .map((n) => parseInt(String(n), 10))
    .filter((n) => n >= 1 && n <= 4);
  if (!valid.length) return null;
  const bounds = valid.map((w) => weekOfMonthBoundsLocal(year, monthName, w));
  const start = new Date(Math.min(...bounds.map((b) => b.start.getTime())));
  const end = new Date(Math.max(...bounds.map((b) => b.end.getTime())));
  return { start, end };
}

export function assertSessionWithinWeekUnion(
  sessionStart: Date,
  sessionEnd: Date,
  union: { start: Date; end: Date },
): void {
  if (sessionStart.getTime() >= sessionEnd.getTime()) {
    throw new BadRequestException('Session start must be before end time');
  }
  if (
    sessionStart.getTime() < union.start.getTime() ||
    sessionEnd.getTime() > union.end.getTime()
  ) {
    throw new BadRequestException(
      'Session must fall within the selected month',
    );
  }
}

export function parseTimeParts(timeStr: string): { h: number; m: number } {
  if (!timeStr || typeof timeStr !== 'string') return { h: 9, m: 0 };
  const s = timeStr.trim();
  const isPm = /pm/i.test(s);
  const isAm = /am/i.test(s);
  const core = s.replace(/\s*(am|pm)\s*/i, '').trim();
  const [hs, ms] = core.split(':');
  let h = parseInt(hs, 10);
  let m = parseInt(ms, 10);
  if (Number.isNaN(h)) h = 9;
  if (Number.isNaN(m)) m = 0;
  if (isPm && h < 12) h += 12;
  if (isAm && h === 12) h = 0;
  return { h, m };
}

export function durationToMinutes(duration: string): number {
  if (!duration || typeof duration !== 'string') return 60;
  const d = duration.toLowerCase();
  const hm = d.match(/(\d+(?:\.\d+)?)\s*h/);
  if (hm) return Math.round(parseFloat(hm[1]) * 60);
  const mm = d.match(/(\d+)\s*m/);
  if (mm) return parseInt(mm[1], 10);
  const n = parseInt(d, 10);
  return Number.isNaN(n) ? 60 : n;
}

export function legacyToSessionRange(
  yearStr: string,
  monthName: string,
  dayNum: number,
  time: string,
  duration: string,
): { start: Date; end: Date } {
  const year = parseInt(yearStr, 10);
  const mi = TRAINING_MONTH_NAMES.indexOf(
    monthName as (typeof TRAINING_MONTH_NAMES)[number],
  );
  if (mi < 0 || Number.isNaN(year)) {
    throw new BadRequestException('Invalid year or month for session');
  }
  const { h, m } = parseTimeParts(time);
  const start = new Date(year, mi, dayNum, h, m, 0, 0);
  const mins = durationToMinutes(duration);
  const end = new Date(start.getTime() + mins * 60 * 1000);
  return { start, end };
}

export function formatTimeHhMm(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDurationFromMinutes(totalMins: number): string {
  if (totalMins < 60) return `${totalMins} min`;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return m ? `${h}h ${m}m` : `${h} hour${h === 1 ? '' : 's'}`;
}
