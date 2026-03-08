import { DayType } from '../types/index.js';
import { currentWeekday, dayOfYear, inferDayType, localDateParts } from '../utils/date.js';
import { query } from './db.js';

type CalendarCode = '0' | '1' | '2' | '4';

const apiBase = process.env.RUSSIAN_CALENDAR_API_BASE || 'https://isdayoff.ru/api/getdata';

async function fetchYearCalendar(year: number): Promise<string> {
  const response = await fetch(`${apiBase}?year=${year}&pre=1`);
  if (!response.ok) {
    throw new Error(`Failed to load Russian calendar for ${year}: ${response.status}`);
  }

  const data = (await response.text()).trim();
  if (!data || !/^[0124]+$/.test(data)) {
    throw new Error(`Unexpected calendar payload for ${year}`);
  }

  return data;
}

async function getYearCalendar(year: number): Promise<string> {
  const cached = await query<{ data: string }>('SELECT data FROM calendar_cache WHERE year = $1', [year]);
  if (cached.rowCount && cached.rows[0]?.data) return cached.rows[0].data;

  const data = await fetchYearCalendar(year);
  await query(
    `
      INSERT INTO calendar_cache (year, data)
      VALUES ($1, $2)
      ON CONFLICT (year)
      DO UPDATE SET data = EXCLUDED.data, fetched_at = NOW()
    `,
    [year, data]
  );
  return data;
}

export async function getCurrentDayType(timezone: string): Promise<DayType> {
  const weekday = currentWeekday(timezone);
  const fallback = inferDayType(weekday);

  try {
    const { year, month, day } = localDateParts(timezone);
    const calendar = await getYearCalendar(year);
    const index = dayOfYear(year, month, day) - 1;
    const code = (calendar[index] ?? '1') as CalendarCode;

    if (code === '1') return 'weekend';
    return weekday === 5 ? 'friday' : 'workday';
  } catch {
    return fallback;
  }
}
