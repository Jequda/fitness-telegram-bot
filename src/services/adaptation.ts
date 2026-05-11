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
  return '� >A;54=85 4=8 BK >B<5G0; CAB0;>ABL. >B @565B =545;L=K9 >1JQ< 02B><0B8G5A:8: <5=LH5 4>182>:, <5=LH5 ;8H=59 =03@C7:8.';
}
