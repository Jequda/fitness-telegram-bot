import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { getCurrentDayType } from './calendar.js';
import { volumeNotice } from './adaptation.js';
import { dayPlanText, eveningOnlyText, workOnlyText } from './messages.js';
import { buildTodayPlan } from './planner.js';
import { weeklyReport } from './report.js';
import { listStates } from './storage.js';

async function sendToUsers(bot: Telegraf, callback: (chatId: number) => Promise<string | undefined>) {
  const states = await listStates();
  for (const state of states.filter((item) => item.profile.isOnboarded)) {
    const text = await callback(state.chatId);
    if (!text) continue;
    await bot.telegram.sendMessage(state.chatId, text);
  }
}

export function registerSchedulers(bot: Telegraf) {
  const timezone = process.env.TIMEZONE || 'Europe/Moscow';

  cron.schedule(
    '30 9 * * *',
    async () => {
      if ((await getCurrentDayType(timezone)) === 'weekend') return;
      await sendToUsers(bot, async (chatId) => {
        const plan = await buildTodayPlan(chatId);
        return dayPlanText(plan, await volumeNotice(chatId));
      });
    },
    { timezone }
  );

  cron.schedule(
    '0 12 * * *',
    async () => {
      await sendToUsers(bot, async (chatId) => {
        const plan = await buildTodayPlan(chatId);
        return plan.dayType === 'weekend' ? dayPlanText(plan, await volumeNotice(chatId)) : workOnlyText(plan);
      });
    },
    { timezone }
  );

  cron.schedule(
    '0 19 * * *',
    async () => {
      await sendToUsers(bot, async (chatId) => {
        const plan = await buildTodayPlan(chatId);
        return plan.dayType === 'weekend' ? undefined : eveningOnlyText(plan);
      });
    },
    { timezone }
  );

  cron.schedule(
    '0 21 * * 0',
    async () => {
      await sendToUsers(bot, async (chatId) => weeklyReport(chatId));
    },
    { timezone }
  );
}
