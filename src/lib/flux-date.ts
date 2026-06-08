import {
  format,
  getDaysInMonth,
  startOfMonth,
  startOfDay,
  subDays,
  isSameDay,
} from "date-fns";

/** Canonical key for a calendar date: yyyy-MM-dd */
export function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function todayKey(): string {
  return dateKey(new Date());
}

export interface MonthInfo {
  year: number;
  monthIndex: number;
  label: string; // e.g. "June 2026"
  daysInMonth: number;
  /** date keys for every day of the active month */
  dayKeys: string[];
  todayDayNumber: number; // 1-based day of month for today, or 0 if not this month
}

export function getMonthInfo(reference = new Date()): MonthInfo {
  const start = startOfMonth(reference);
  const daysInMonth = getDaysInMonth(reference);
  const dayKeys: string[] = [];
  for (let d = 0; d < daysInMonth; d++) {
    const day = new Date(start.getFullYear(), start.getMonth(), d + 1);
    dayKeys.push(dateKey(day));
  }
  const now = new Date();
  const isThisMonth =
    now.getFullYear() === start.getFullYear() &&
    now.getMonth() === start.getMonth();
  return {
    year: start.getFullYear(),
    monthIndex: start.getMonth(),
    label: format(reference, "MMMM yyyy"),
    daysInMonth,
    dayKeys,
    todayDayNumber: isThisMonth ? now.getDate() : 0,
  };
}

/** Returns the keys for the last `n` days ending today (oldest first). */
export function lastNDayKeys(n: number, reference = new Date()): string[] {
  const base = startOfDay(reference);
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(dateKey(subDays(base, i)));
  }
  return keys;
}

export function shortLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return format(new Date(y, m - 1, d), "MMM d");
}

export function dayNumber(key: string): number {
  return Number(key.split("-")[2]);
}

export function isToday(key: string): boolean {
  const [y, m, d] = key.split("-").map(Number);
  return isSameDay(new Date(y, m - 1, d), new Date());
}

export function isPast(key: string): boolean {
  const [y, m, d] = key.split("-").map(Number);
  return startOfDay(new Date(y, m - 1, d)) < startOfDay(new Date());
}

export interface CalendarMonth {
  year: number;
  monthIndex: number;
  label: string; // "June 2026"
  shortLabel: string; // "Jun '26"
  dayKeys: string[];
  /** number of empty leading cells so day 1 lands on the right weekday */
  leadingBlanks: number;
}

function buildMonth(year: number, monthIndex: number): CalendarMonth {
  const ref = new Date(year, monthIndex, 1);
  const daysInMonth = getDaysInMonth(ref);
  const dayKeys: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dayKeys.push(dateKey(new Date(year, monthIndex, d)));
  }
  return {
    year,
    monthIndex,
    label: format(ref, "MMMM yyyy"),
    shortLabel: format(ref, "MMM ''yy"),
    dayKeys,
    leadingBlanks: ref.getDay(),
  };
}

/** Every month from the current month through December of next year. */
export function buildMonths(reference = new Date()): CalendarMonth[] {
  const startYear = reference.getFullYear();
  const startMonth = reference.getMonth();
  const months: CalendarMonth[] = [];
  for (let y = startYear; y <= startYear + 1; y++) {
    const from = y === startYear ? startMonth : 0;
    for (let m = from; m <= 11; m++) {
      months.push(buildMonth(y, m));
    }
  }
  return months;
}

export function currentMonthIndex(months: CalendarMonth[]): number {
  const now = new Date();
  const idx = months.findIndex(
    (m) => m.year === now.getFullYear() && m.monthIndex === now.getMonth(),
  );
  return idx < 0 ? 0 : idx;
}

export const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
