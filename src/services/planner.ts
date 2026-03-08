import { buildBlocks } from '../data/plans.js';
import { getCurrentDayType } from './calendar.js';
import { readState } from './storage.js';
import { localDateString } from '../utils/date.js';
import { DailyPlan, WellnessState } from '../types/index.js';

export async function buildTodayPlan(chatId: number, wellness?: WellnessState): Promise<DailyPlan> {
  const state = await readState(chatId);
  const date = localDateString(state.timezone);
  const savedWellness = state.dailyLogs.find((item) => item.date === date)?.wellnessState;
  const resolvedWellness = wellness ?? savedWellness ?? 'normal';
  const dayType = await getCurrentDayType(state.timezone);
  const eveningSkipped = state.skipEveningDates.includes(date);
  const wholeDaySkipped = state.skippedDates.includes(date);

  let blocks = buildBlocks(dayType, resolvedWellness, state.profile);

  if (wholeDaySkipped) {
    blocks = [];
  } else if (eveningSkipped) {
    blocks = blocks.filter((item) => item.type !== 'evening' && item.type !== 'weekend_main');
  }

  return {
    date,
    dayType,
    wellnessState: resolvedWellness,
    blocks,
    eveningSkipped,
    wholeDaySkipped
  };
}
