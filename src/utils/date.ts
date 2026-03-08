import { DayType } from '../types/index.js';

export function localDateString(timezone: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

export function localDateParts(timezone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  });

  const values = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  ) as Record<string, string>;

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    weekdayShort: values.weekday
  };
}

export function currentWeekday(timezone: string): number {
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };

  return map[localDateParts(timezone).weekdayShort];
}

export function dayOfYear(year: number, month: number, day: number): number {
  const current = Date.UTC(year, month - 1, day);
  const start = Date.UTC(year, 0, 1);
  return Math.floor((current - start) / 86_400_000) + 1;
}

export function inferDayType(weekday: number): DayType {
  if (weekday === 5) return 'friday';
  if (weekday === 0 || weekday === 6) return 'weekend';
  return 'workday';
}
