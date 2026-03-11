import { DayType } from '../types/index.js';
import { findFromCityStateProvince, lookupViaCity } from 'city-timezones';

const defaultTimeZone = process.env.TIMEZONE || 'Europe/Moscow';

const timezoneAliases: Record<string, string> = {
  moscow: 'Europe/Moscow',
  'moscow, russia': 'Europe/Moscow',
  'europe/moscow': 'Europe/Moscow',
  'москва': 'Europe/Moscow',
  'мск': 'Europe/Moscow',
  'россия/москва': 'Europe/Moscow'
};

function isValidIanaTimezone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function pickBestCityMatch(input: string) {
  const normalizedInput = input.trim().toLowerCase();
  const direct = lookupViaCity(input);
  const fuzzy = findFromCityStateProvince(input);

  const matches = [...direct, ...fuzzy]
    .filter((item, index, list) => list.findIndex((candidate) => `${candidate.city}|${candidate.province}|${candidate.country}|${candidate.timezone}` === `${item.city}|${item.province}|${item.country}|${item.timezone}`) === index)
    .sort((left, right) => {
      const leftExact = Number(left.city.toLowerCase() === normalizedInput || left.city_ascii.toLowerCase() === normalizedInput);
      const rightExact = Number(right.city.toLowerCase() === normalizedInput || right.city_ascii.toLowerCase() === normalizedInput);
      if (leftExact !== rightExact) return rightExact - leftExact;
      return right.pop - left.pop;
    });

  return matches[0];
}

export function resolveTimezoneFromInput(input?: string | null): string | null {
  const raw = input?.trim();
  if (!raw) return defaultTimeZone;

  const alias = timezoneAliases[raw.toLowerCase()];
  const candidate = alias ?? raw;
  if (isValidIanaTimezone(candidate)) return candidate;

  return pickBestCityMatch(raw)?.timezone ?? null;
}

export function normalizeTimezone(input?: string | null): string {
  return resolveTimezoneFromInput(input) ?? defaultTimeZone;
}

export function localDateString(timezone: string): string {
  const resolvedTimezone = normalizeTimezone(timezone);
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: resolvedTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

export function localDateParts(timezone: string) {
  const resolvedTimezone = normalizeTimezone(timezone);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolvedTimezone,
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
