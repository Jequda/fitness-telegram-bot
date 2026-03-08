import { readState } from './storage.js';

export async function shouldReduceVolume(chatId: number): Promise<boolean> {
  const state = await readState(chatId);
  const recent = [...state.dailyLogs].slice(-3);
  if (recent.length < 2) return false;
  const tiredDays = recent.filter((item) => item.wellnessState === 'tired' || item.wellnessState === 'sleepy' || item.wellnessState === 'no_energy');
  return tiredDays.length >= 2;
}

export async function volumeNotice(chatId: number): Promise<string> {
  if (!(await shouldReduceVolume(chatId))) return '';
  return '⚠️ Последние дни ты отмечал усталость. Бот режет недельный объём автоматически: меньше добивок, меньше лишней нагрузки.';
}
