import { Telegraf } from 'telegraf';
import {
  aiChatExitLabel,
  aiChatKeyboard,
  mainMenu,
  mainMenuLabels,
  onboardingActivityKeyboard,
  onboardingExperienceKeyboard,
  onboardingGoalKeyboard,
  onboardingPrompt,
  onboardingSexKeyboard,
  profileActionsKeyboard,
  progressExerciseKeyboard
} from '../keyboards/main.js';
import { exercisesMap } from '../data/exercises.js';
import { applyOnboardingAnswer, applyProfileAnswer, getCurrentOnboardingStep, profileSummary } from '../services/onboarding.js';
import { askTrainer } from '../services/openai.js';
import { appendExerciseSet, clearProgressDraft, exerciseProgressText, getExerciseProgress } from '../services/progress.js';
import { buildTodayPlan } from '../services/planner.js';
import { readState, writeState } from '../services/storage.js';
import { logError } from '../services/logger.js';

function validationMessage(error: Error) {
  switch (error.message) {
    case 'CITY_TIMEZONE_NOT_FOUND':
      return 'Не удалось определить часовой пояс по этому городу. Напиши город точнее, например: Москва, Санкт-Петербург, Екатеринбург.';
    case 'INVALID_AGE':
      return 'Возраст нужно ввести числом от 12 до 90.';
    case 'INVALID_HEIGHT':
      return 'Рост нужно ввести целым числом от 120 до 230 см.';
    case 'INVALID_WEIGHT':
      return 'Вес нужно ввести числом от 35 до 300 кг. Можно использовать десятичную точку или запятую.';
    case 'INVALID_GOAL_TIMELINE':
      return 'Срок цели нужно ввести числом от 2 до 104 недель.';
    case 'INVALID_WORKOUT_DAYS':
      return 'Количество тренировочных дней должно быть от 1 до 7.';
    case 'INVALID_WORKOUT_MINUTES':
      return 'Минуты на тренировку должны быть в диапазоне от 10 до 240.';
    case 'INVALID_ACTIVITY':
      return 'Для активности нужно выбрать один из вариантов кнопкой ниже.';
    case 'INVALID_SLEEP':
      return 'Сон нужно ввести числом от 3 до 16 часов. Например: 7.5';
    default:
      return '';
  }
}

function stepKeyboard(step: ReturnType<typeof getCurrentOnboardingStep>) {
  if (step === 'sex') return onboardingSexKeyboard();
  if (step === 'goal') return onboardingGoalKeyboard();
  if (step === 'experience') return onboardingExperienceKeyboard();
  if (step === 'activity') return onboardingActivityKeyboard();
  return undefined;
}

export function registerOnboarding(bot: Telegraf) {
  bot.on('text', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return;

    const state = await readState(chatId);

    if (text === aiChatExitLabel) {
      state.ai.enabled = false;
      await writeState(state);
      return ctx.reply('Вышел из чата с тренером.', mainMenu(state.notificationsEnabled));
    }

    if (text === mainMenuLabels.aiTrainer) {
      state.ai.enabled = true;
      state.ai.history = [];
      await writeState(state);
      const name = state.profile.name ? `, ${state.profile.name}` : '';
      return ctx.reply(
        `Привет${name}! Я твой AI тренер. Спрашивай о тренировках, питании, восстановлении — отвечу с учётом твоего профиля.\n\nДля выхода нажми «${aiChatExitLabel}».`,
        aiChatKeyboard()
      );
    }

    if (state.ai.enabled) {
      await ctx.sendChatAction('typing');
      try {
        const reply = await askTrainer(text, state.ai.history, state.profile);
        state.ai.history.push(
          { role: 'user', content: text, createdAt: new Date().toISOString() },
          { role: 'assistant', content: reply, createdAt: new Date().toISOString() }
        );
        if (state.ai.history.length > 20) state.ai.history = state.ai.history.slice(-20);
        state.ai.lastError = undefined;
        await writeState(state);
        return ctx.reply(reply, aiChatKeyboard());
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logError('OpenAI request failed', { chatId, error: message });
        state.ai.lastError = message;
        await writeState(state);
        return ctx.reply('Не удалось получить ответ от AI. Попробуй ещё раз.', aiChatKeyboard());
      }
    }

    if (state.ui.progressDraft?.awaitingCustomWeight) {
      const draft = state.ui.progressDraft;
      const weight = parseFloat(text.replace(',', '.'));
      if (isNaN(weight) || weight < 0.5 || weight > 50) {
        return ctx.reply('Введи вес числом от 0.5 до 50 кг (например: 7.5 или 12).');
      }
      const exercise = exercisesMap[draft.exerciseId];
      const plan = await buildTodayPlan(chatId);
      await appendExerciseSet(chatId, plan, draft.exerciseId, {
        setNumber: draft.pendingSetNumber,
        value: draft.pendingValue!,
        unit: exercise.logUnit,
        weightKg: weight,
        loggedAt: new Date().toISOString()
      });
      await clearProgressDraft(chatId);
      const progress = await getExerciseProgress(chatId, plan.date, draft.exerciseId);
      return ctx.reply(await exerciseProgressText(chatId, plan, draft.exerciseId), progressExerciseKeyboard(draft.exerciseId, progress));
    }

    const profileEditStep = state.ui.profileEdit?.step;
    if (profileEditStep) {
      try {
        applyProfileAnswer(state, profileEditStep, text);
        await writeState(state);
        return ctx.reply(`Анкета обновлена.\n\n${profileSummary(state)}`, profileActionsKeyboard());
      } catch (error) {
        if (error instanceof Error) {
          const message = validationMessage(error);
          if (message) {
            return ctx.reply(message, profileEditStep === 'activity' ? onboardingActivityKeyboard() : profileActionsKeyboard());
          }
        }
        throw error;
      }
    }

    if (state.profile.isOnboarded) return;

    const step = getCurrentOnboardingStep(state);
    const keyboard = stepKeyboard(step);
    if (keyboard) {
      return ctx.reply(onboardingPrompt(step), keyboard);
    }

    try {
      applyOnboardingAnswer(state, text);
      await writeState(state);
    } catch (error) {
      if (error instanceof Error) {
        const message = validationMessage(error);
        if (message) {
          return ctx.reply(message, step === 'activity' ? onboardingActivityKeyboard() : undefined);
        }
      }
      throw error;
    }

    const nextStep = getCurrentOnboardingStep(state);
    if (nextStep === 'completed') {
      return ctx.reply(`Анкета заполнена.\n\n${profileSummary(state)}`, mainMenu(state.notificationsEnabled));
    }

    const nextKeyboard = stepKeyboard(nextStep);
    return ctx.reply(onboardingPrompt(nextStep), nextKeyboard);
  });
}
