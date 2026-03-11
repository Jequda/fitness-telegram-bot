import { Telegraf } from 'telegraf';
import {
  mainMenu,
  onboardingExperienceKeyboard,
  onboardingGoalKeyboard,
  onboardingPrompt,
  onboardingSexKeyboard,
  profileActionsKeyboard
} from '../keyboards/main.js';
import { applyOnboardingAnswer, applyProfileAnswer, getCurrentOnboardingStep, profileSummary } from '../services/onboarding.js';
import { readState, writeState } from '../services/storage.js';

export function registerOnboarding(bot: Telegraf) {
  bot.on('text', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return;

    const state = await readState(chatId);
    const profileEditStep = state.ui.profileEdit?.step;
    if (profileEditStep) {
      try {
        applyProfileAnswer(state, profileEditStep, text);
        await writeState(state);
        return ctx.reply(`Анкета обновлена.\n\n${profileSummary(state)}`, profileActionsKeyboard());
      } catch (error) {
        if (error instanceof Error && error.message === 'CITY_TIMEZONE_NOT_FOUND') {
          return ctx.reply('Не удалось определить часовой пояс по этому городу. Напиши город точнее, например: Москва, Saint Petersburg, New York.', profileActionsKeyboard());
        }
        throw error;
      }
    }

    if (state.profile.isOnboarded) return;

    const step = getCurrentOnboardingStep(state);
    if (step === 'sex') {
      return ctx.reply(onboardingPrompt(step), onboardingSexKeyboard());
    }
    if (step === 'goal') {
      return ctx.reply(onboardingPrompt(step), onboardingGoalKeyboard());
    }
    if (step === 'experience') {
      return ctx.reply(onboardingPrompt(step), onboardingExperienceKeyboard());
    }

    try {
      applyOnboardingAnswer(state, text);
      await writeState(state);
    } catch (error) {
      if (error instanceof Error && error.message === 'CITY_TIMEZONE_NOT_FOUND') {
        return ctx.reply('Не удалось определить часовой пояс по этому городу. Напиши город точнее, например: Москва, Saint Petersburg, New York.');
      }
      throw error;
    }

    const nextStep = getCurrentOnboardingStep(state);
    if (nextStep === 'sex') {
      return ctx.reply(onboardingPrompt(nextStep), onboardingSexKeyboard());
    }
    if (nextStep === 'goal') {
      return ctx.reply(onboardingPrompt(nextStep), onboardingGoalKeyboard());
    }
    if (nextStep === 'experience') {
      return ctx.reply(onboardingPrompt(nextStep), onboardingExperienceKeyboard());
    }
    if (nextStep === 'completed') {
      return ctx.reply(`Анкета заполнена.\n\n${profileSummary(state)}`, mainMenu);
    }

    return ctx.reply(onboardingPrompt(nextStep));
  });
}
