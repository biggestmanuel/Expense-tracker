/** Today as `YYYY-MM-DD` in local time (never UTC, to avoid day drift). */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function currentMonth(): string {
  return todayISO().slice(0, 7);
}

/** `YYYY-MM-DD` -> `YYYY-MM` */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** Number of days in a `YYYY-MM` month. */
export function daysInMonth(month: string): number {
  const [year, monthIndex] = month.split("-").map(Number) as [number, number];
  return new Date(year, monthIndex, 0).getDate();
}

/** First day of `YYYY-MM` as `YYYY-MM-DD`. */
export function monthStart(month: string): string {
  return `${month}-01`;
}

/** Last day of `YYYY-MM` as `YYYY-MM-DD`. */
export function monthEnd(month: string): string {
  return `${month}-${pad(daysInMonth(month))}`;
}

export function addMonths(month: string, delta: number): string {
  const [year, monthIndex] = month.split("-").map(Number) as [number, number];
  const shifted = new Date(year, monthIndex - 1 + delta, 1);
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}`;
}

/** The last `count` months ending at `end`, oldest first. */
export function monthRange(end: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addMonths(end, i - count + 1));
}

export function formatDate(date: string): string {
  const parsed = parseISODate(date);
  if (!parsed) return date;
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function formatMonth(month: string): string {
  const parsed = parseISODate(monthStart(month));
  if (!parsed) return month;
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(parsed);
}

export function formatLongToday(): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function parseISODate(date: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [, y, m, d] = match as unknown as [string, string, string, string];
  const parsed = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}