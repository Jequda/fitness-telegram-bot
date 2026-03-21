import { Telegraf } from 'telegraf';
import {
  exerciseDetailKeyboard,
  exerciseListKeyboard,
  exerciseValueKeyboard,
  exerciseWeightKeyboard,
  mainMenu,
  onboardingExperienceKeyboard,
  onboardingGoalKeyboard,
  onboardingPrompt,
  onboardingSexKeyboard,
  profileActionsKeyboard,
  profileEditCancelKeyboard,
  profileEditExperienceKeyboard,
  profileEditGoalKeyboard,
  profileEditMenuKeyboard,
  profileEditPrompt,
  profileEditSexKeyboard,
  progressExerciseKeyboard,
  progressOverviewKeyboard,
  wellnessKeyboard
} from '../keyboards/main.js';
import { exercisesMap } from '../data/exercises.js';
import { DailyPlan, GoalType, ProfileQuestionStep, SexType, WellnessState } from '../types/index.js';
import { volumeNotice } from '../services/adaptation.js';
import { logWarn } from '../services/logger.js';
import { dayPlanText, eveningOnlyText, exerciseCardText, workOnlyText } from '../services/messages.js';
import { getExercisePhotoFile } from '../services/media.js';
import {
  applyGoal,
  applyProfileAnswer,
  clearProfileEdit,
  getCurrentOnboardingStep,
  profileSummary,
  resetOnboarding,
  startProfileEdit
} from '../services/onboarding.js';
import { buildTodayPlan } from '../services/planner.js';
import {
  appendExerciseSet,
  clearProgressDraft,
  completeExercise,
  ensureDailyLog,
  exerciseProgressText,
  getExerciseProgress,
  progressOverviewText,
  resetExerciseProgress,
  setDraftValue,
  setProgressDraft,
  skipExercise
} from '../services/progress.js';
import { weeklyReport } from '../services/report.js';
import { readState, upsertLog, writeState } from '../services/storage.js';
import { localDateString } from '../utils/date.js';

function formatExerciseCaption(exerciseId: string, plan?: DailyPlan) {
  return exerciseCardText(exerciseId, plan);
}

async function ensureOnboarded(ctx: any) {
  const chatId = ctx.chat?.id;
  if (!chatId) return false;

  const state = await readState(chatId);
  if (state.profile.isOnboarded) return true;

  const step = getCurrentOnboardingStep(state);
  if (step === 'sex') {
    await ctx.reply(onboardingPrompt(step), onboardingSexKeyboard());
  } else if (step === 'goal') {
    await ctx.reply(onboardingPrompt(step), onboardingGoalKeyboard());
  } else if (step === 'experience') {
    await ctx.reply(onboardingPrompt(step), onboardingExperienceKeyboard());
  } else {
    await ctx.reply(onboardingPrompt(step));
  }

  return false;
}

function profileEditReply(step: ProfileQuestionStep) {
  if (step === 'sex') return { text: profileEditPrompt(step), extra: profileEditSexKeyboard() };
  if (step === 'goal') return { text: profileEditPrompt(step), extra: profileEditGoalKeyboard() };
  if (step === 'experience') return { text: profileEditPrompt(step), extra: profileEditExperienceKeyboard() };
  return { text: profileEditPrompt(step), extra: profileEditCancelKeyboard() };
}

async function menuByChat(chatId: number) {
  return mainMenu((await readState(chatId)).notificationsEnabled);
}

export function registerCommands(bot: Telegraf) {
  bot.start(async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const state = await readState(chatId);
    if (!state.profile.isOnboarded) {
      resetOnboarding(state);
      await writeState(state);
      return ctx.reply(`Добро пожаловать. Перед использованием нужно заполнить анкету.\n\n${onboardingPrompt('name')}`);
    }

    return ctx.reply('Бот-тренер запущен. Выбирай, что делать дальше.', mainMenu(state.notificationsEnabled));
  });

  bot.command('profile', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    return ctx.reply(profileSummary(await readState(chatId)), profileActionsKeyboard());
  });

  bot.command('reauth', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const state = await readState(chatId);
    resetOnboarding(state);
    await writeState(state);
    return ctx.reply(`Анкета перезапущена.\n\n${onboardingPrompt('name')}`);
  });

  bot.command('today', async (ctx) => {
    if (!(await ensureOnboarded(ctx))) return;
    const chatId = ctx.chat!.id;
    const plan = await buildTodayPlan(chatId);
    await ensureDailyLog(chatId, plan.date);
    return ctx.reply(dayPlanText(plan, await volumeNotice(chatId)), await menuByChat(chatId));
  });

  bot.command('work', async (ctx) => {
    if (!(await ensureOnboarded(ctx))) return;
    return ctx.reply(workOnlyText(await buildTodayPlan(ctx.chat!.id)), await menuByChat(ctx.chat!.id));
  });

  bot.command('evening', async (ctx) => {
    if (!(await ensureOnboarded(ctx))) return;
    return ctx.reply(eveningOnlyText(await buildTodayPlan(ctx.chat!.id)), await menuByChat(ctx.chat!.id));
  });

  bot.command('status', async (ctx) => {
    if (!(await ensureOnboarded(ctx))) return;
    return ctx.reply('Как ты себя чувствуешь сегодня?', wellnessKeyboard);
  });

  bot.command('exercises', async (ctx) => {
    if (!(await ensureOnboarded(ctx))) return;
    return ctx.reply('Выбери упражнение.', exerciseListKeyboard());
  });

  bot.command('progress', async (ctx) => {
    if (!(await ensureOnboarded(ctx))) return;
    const chatId = ctx.chat!.id;
    const plan = await buildTodayPlan(chatId);
    const log = await ensureDailyLog(chatId, plan.date);
    return ctx.reply(await progressOverviewText(chatId, plan), progressOverviewKeyboard(plan, log.progressByExercise));
  });

  bot.command('skip_evening', async (ctx) => {
    if (!(await ensureOnboarded(ctx))) return;
    const state = await readState(ctx.chat!.id);
    const date = localDateString(state.timezone);
    if (!state.skipEveningDates.includes(date)) state.skipEveningDates.push(date);
    state.carryOverLoad += 1;
    await writeState(state);
    return ctx.reply('Вечерняя тренировка на сегодня снята. Остаток нагрузки учтён.', mainMenu(state.notificationsEnabled));
  });

  bot.command('skip_today', async (ctx) => {
    if (!(await ensureOnboarded(ctx))) return;
    const state = await readState(ctx.chat!.id);
    const date = localDateString(state.timezone);
    if (!state.skippedDates.includes(date)) state.skippedDates.push(date);
    state.carryOverLoad += 2;
    await writeState(state);
    return ctx.reply('На сегодня тренировки убраны. Бот не будет тебя дожимать.', mainMenu(state.notificationsEnabled));
  });

  bot.command('week_report', async (ctx) => {
    if (!(await ensureOnboarded(ctx))) return;
    return ctx.reply(await weeklyReport(ctx.chat!.id), await menuByChat(ctx.chat!.id));
  });

  bot.command('debug_state', async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    return ctx.reply(`\n\n${JSON.stringify(await readState(chatId), null, 2)}`);
  });

  bot.action('today', async (ctx) => {
    await ctx.answerCbQuery();
    if (!(await ensureOnboarded(ctx))) return;
    const chatId = ctx.chat!.id;
    const plan = await buildTodayPlan(chatId);
    await ensureDailyLog(chatId, plan.date);
    return ctx.reply(dayPlanText(plan, await volumeNotice(chatId)), await menuByChat(chatId));
  });

  bot.action('toggle_notifications', async (ctx) => {
    await ctx.answerCbQuery();
    if (!(await ensureOnboarded(ctx))) return;
    const chatId = ctx.chat!.id;
    const state = await readState(chatId);
    state.notificationsEnabled = !state.notificationsEnabled;
    await writeState(state);
    return ctx.reply(
      state.notificationsEnabled ? 'Уведомления включены.' : 'Уведомления отключены.',
      mainMenu(state.notificationsEnabled)
    );
  });

  bot.action('profile', async (ctx) => {
    await ctx.answerCbQuery();
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    return ctx.reply(profileSummary(await readState(chatId)), profileActionsKeyboard());
  });

  bot.action('profile:edit_menu', async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.reply('Что изменить в анкете?', profileEditMenuKeyboard());
  });

  bot.action('profile:cancel', async (ctx) => {
    await ctx.answerCbQuery('Редактирование отменено');
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const state = await readState(chatId);
    clearProfileEdit(state);
    await writeState(state);
    return ctx.reply(profileSummary(state), profileActionsKeyboard());
  });

  bot.action(
    /^profile:edit:(name|sex|age|height|weight|goal|goal_timeline|experience|equipment|workout_days|workout_minutes|cardio|limitations|injuries|activity|sleep|timezone)$/,
    async (ctx) => {
      await ctx.answerCbQuery();
      const chatId = ctx.chat?.id;
      if (!chatId) return;
      const step = ctx.match[1] as ProfileQuestionStep;
      const state = await readState(chatId);
      startProfileEdit(state, step);
      await writeState(state);
      const reply = profileEditReply(step);
      return ctx.reply(reply.text, reply.extra);
    }
  );

  bot.action(/^profile:value:sex:(male|female)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const state = await readState(chatId);
    applyProfileAnswer(state, 'sex', ctx.match[1] === 'female' ? 'женщина' : 'мужчина');
    await writeState(state);
    return ctx.reply(`Анкета обновлена.\n\n${profileSummary(state)}`, profileActionsKeyboard());
  });

  bot.action(/^profile:value:goal:(fat_loss|muscle_gain|strength|general_fitness|mobility|posture|endurance)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const state = await readState(chatId);
    applyProfileAnswer(state, 'goal', ctx.match[1] as GoalType);
    await writeState(state);
    return ctx.reply(`Анкета обновлена.\n\n${profileSummary(state)}`, profileActionsKeyboard());
  });

  bot.action(/^profile:value:experience:(beginner|intermediate|advanced)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const state = await readState(chatId);
    const labels = {
      beginner: 'новичок',
      intermediate: 'средний',
      advanced: 'продвинутый'
    };
    applyProfileAnswer(state, 'experience', labels[ctx.match[1] as keyof typeof labels]);
    await writeState(state);
    return ctx.reply(`Анкета обновлена.\n\n${profileSummary(state)}`, profileActionsKeyboard());
  });

  bot.action('main_menu', async (ctx) => {
    await ctx.answerCbQuery();
    if (!(await ensureOnboarded(ctx))) return;
    return ctx.reply('Главное меню.', await menuByChat(ctx.chat!.id));
  });

  bot.action('status', async (ctx) => {
    await ctx.answerCbQuery();
    if (!(await ensureOnboarded(ctx))) return;
    return ctx.reply('Выбери состояние.', wellnessKeyboard);
  });

  bot.action('exercises', async (ctx) => {
    await ctx.answerCbQuery();
    if (!(await ensureOnboarded(ctx))) return;
    return ctx.reply('Выбери упражнение.', exerciseListKeyboard());
  });

  bot.action('progress', async (ctx) => {
    await ctx.answerCbQuery();
    if (!(await ensureOnboarded(ctx))) return;
    const chatId = ctx.chat!.id;
    const plan = await buildTodayPlan(chatId);
    const log = await ensureDailyLog(chatId, plan.date);
    return ctx.reply(await progressOverviewText(chatId, plan), progressOverviewKeyboard(plan, log.progressByExercise));
  });

  bot.action('skip_evening', async (ctx) => {
    await ctx.answerCbQuery();
    if (!(await ensureOnboarded(ctx))) return;
    const state = await readState(ctx.chat!.id);
    const date = localDateString(state.timezone);
    if (!state.skipEveningDates.includes(date)) state.skipEveningDates.push(date);
    state.carryOverLoad += 1;
    await writeState(state);
    return ctx.reply('Вечерняя тренировка на сегодня снята. Остаток нагрузки учтён.', mainMenu(state.notificationsEnabled));
  });

  bot.action('skip_day', async (ctx) => {
    await ctx.answerCbQuery();
    if (!(await ensureOnboarded(ctx))) return;
    const state = await readState(ctx.chat!.id);
    const date = localDateString(state.timezone);
    if (!state.skippedDates.includes(date)) state.skippedDates.push(date);
    state.carryOverLoad += 2;
    await writeState(state);
    return ctx.reply('На сегодня тренировки убраны. Бот не будет тебя дожимать.', mainMenu(state.notificationsEnabled));
  });

  bot.action('week_report', async (ctx) => {
    await ctx.answerCbQuery();
    if (!(await ensureOnboarded(ctx))) return;
    return ctx.reply(await weeklyReport(ctx.chat!.id), await menuByChat(ctx.chat!.id));
  });

  bot.action(/^onboarding:goal:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const state = await readState(chatId);
    applyGoal(state, ctx.match[1] as GoalType);
    await writeState(state);

    const step = getCurrentOnboardingStep(state);
    if (step === 'completed') {
      return ctx.reply(`Анкета заполнена.\n\n${profileSummary(state)}`, mainMenu(state.notificationsEnabled));
    }
    if (step === 'experience') {
      return ctx.reply(onboardingPrompt(step), onboardingExperienceKeyboard());
    }
    return ctx.reply(onboardingPrompt(step));
  });

  bot.action(/^onboarding:sex:(male|female)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const state = await readState(chatId);
    state.profile.sex = ctx.match[1] as SexType;
    state.ui.onboarding = { step: 'age' };
    await writeState(state);
    return ctx.reply(onboardingPrompt('age'));
  });

  bot.action(/^onboarding:experience:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    const state = await readState(chatId);
    state.profile.experienceLevel =
      ctx.match[1] === 'РќРѕРІРёС‡РѕРє' ? 'beginner' : ctx.match[1] === 'РЎСЂРµРґРЅРёР№' ? 'intermediate' : 'advanced';
    state.ui.onboarding = { step: 'equipment' };
    await writeState(state);
    return ctx.reply(onboardingPrompt('equipment'));
  });

  bot.action(/^wellness:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!(await ensureOnboarded(ctx))) return;
    const chatId = ctx.chat!.id;
    const wellness = ctx.match[1] as WellnessState;
    const plan = await buildTodayPlan(chatId, wellness);
    const state = await readState(chatId);
    const date = localDateString(state.timezone);
    const existingLog = await ensureDailyLog(chatId, date);
    await upsertLog(chatId, {
      date,
      wellnessState: wellness,
      completedBlocks: existingLog.completedBlocks,
      skippedEvening: state.skipEveningDates.includes(date),
      skippedAll: state.skippedDates.includes(date),
      progressByExercise: existingLog.progressByExercise
    });
    return ctx.reply(dayPlanText(plan, await volumeNotice(chatId)), await menuByChat(chatId));
  });

  bot.action(/^ex:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!(await ensureOnboarded(ctx))) return;
    const chatId = ctx.chat!.id;
    const exerciseId = ctx.match[1];
    const exercise = exercisesMap[exerciseId];
    if (!exercise) return ctx.reply('Упражнение не найдено.', await menuByChat(chatId));

    const plan = await buildTodayPlan(chatId);
    await ctx.reply(formatExerciseCaption(exerciseId, plan));

    if (exercise.photoUrl) {
      try {
        const photoFile = await getExercisePhotoFile(exerciseId, exercise.photoUrl);
        await ctx.replyWithPhoto({ source: photoFile });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown photo error';
        logWarn('Exercise photo failed, falling back to text card', {
          exerciseId,
          photoUrl: exercise.photoUrl,
          error: message
        });
      }
    }

    return ctx.reply('Что делаем дальше?', exerciseDetailKeyboard());
  });

  bot.action(/^pg:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!(await ensureOnboarded(ctx))) return;
    const chatId = ctx.chat!.id;
    const exerciseId = ctx.match[1];
    const plan = await buildTodayPlan(chatId);
    const progress = await getExerciseProgress(chatId, plan.date, exerciseId);
    if (!exercisesMap[exerciseId]) return ctx.reply('Упражнение не найдено.', await menuByChat(chatId));
    return ctx.reply(await exerciseProgressText(chatId, plan, exerciseId), progressExerciseKeyboard(exerciseId, progress));
  });

  bot.action(/^ps:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!(await ensureOnboarded(ctx))) return;
    const chatId = ctx.chat!.id;
    const exerciseId = ctx.match[1];
    const plan = await buildTodayPlan(chatId);
    if (!exercisesMap[exerciseId]) return ctx.reply('Упражнение не найдено.', await menuByChat(chatId));
    const progressText = await exerciseProgressText(chatId, plan, exerciseId);
    const loggedSets = (await ensureDailyLog(chatId, plan.date)).progressByExercise[exerciseId]?.loggedSets.length ?? 0;
    const nextSetNumber = loggedSets + 1;
    await setProgressDraft(chatId, exerciseId, nextSetNumber);
    return ctx.reply(`${progressText}\n\nВыбери объём для подхода ${nextSetNumber}.`, exerciseValueKeyboard(exerciseId));
  });

  bot.action(/^pv:([^:]+):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!(await ensureOnboarded(ctx))) return;
    const chatId = ctx.chat!.id;
    const exerciseId = ctx.match[1];
    const value = Number(ctx.match[2]);
    const exercise = exercisesMap[exerciseId];
    const state = await readState(chatId);
    const draft = state.ui.progressDraft;

    if (!draft || draft.exerciseId !== exerciseId) {
      return ctx.reply('Сессия логирования устарела. Открой упражнение заново.', await menuByChat(chatId));
    }

    await setDraftValue(chatId, exerciseId, value);
    if (exercise.weightOptionsKg?.length) {
      return ctx.reply(`Подход ${draft.pendingSetNumber}: выбери вес.`, exerciseWeightKeyboard(exerciseId));
    }

    const plan = await buildTodayPlan(chatId);
    await appendExerciseSet(chatId, plan, exerciseId, {
      setNumber: draft.pendingSetNumber,
      value,
      unit: exercise.logUnit,
      loggedAt: new Date().toISOString()
    });
    await clearProgressDraft(chatId);
    const progress = await getExerciseProgress(chatId, plan.date, exerciseId);
    return ctx.reply(await exerciseProgressText(chatId, plan, exerciseId), progressExerciseKeyboard(exerciseId, progress));
  });

  bot.action(/^pw:([^:]+):(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!(await ensureOnboarded(ctx))) return;
    const chatId = ctx.chat!.id;
    const exerciseId = ctx.match[1];
    const weightRaw = ctx.match[2];
    const exercise = exercisesMap[exerciseId];
    const state = await readState(chatId);
    const draft = state.ui.progressDraft;

    if (!draft || draft.exerciseId !== exerciseId || typeof draft.pendingValue !== 'number') {
      return ctx.reply('Сначала выбери объём подхода.', await menuByChat(chatId));
    }

    const plan = await buildTodayPlan(chatId);
    await appendExerciseSet(chatId, plan, exerciseId, {
      setNumber: draft.pendingSetNumber,
      value: draft.pendingValue,
      unit: exercise.logUnit,
      weightKg: weightRaw === 'skip' ? undefined : Number(weightRaw),
      loggedAt: new Date().toISOString()
    });
    await clearProgressDraft(chatId);
    const progress = await getExerciseProgress(chatId, plan.date, exerciseId);
    return ctx.reply(await exerciseProgressText(chatId, plan, exerciseId), progressExerciseKeyboard(exerciseId, progress));
  });

  bot.action(/^done:([^:]+):(easy|ok|hard)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!(await ensureOnboarded(ctx))) return;
    const chatId = ctx.chat!.id;
    const exerciseId = ctx.match[1];
    const difficulty = ctx.match[2] as 'easy' | 'ok' | 'hard';
    const plan = await buildTodayPlan(chatId);
    await completeExercise(chatId, plan, exerciseId, difficulty);
    const progress = await getExerciseProgress(chatId, plan.date, exerciseId);
    return ctx.reply(await exerciseProgressText(chatId, plan, exerciseId), progressExerciseKeyboard(exerciseId, progress));
  });

  bot.action(/^reset:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery('Запись упражнения сброшена');
    if (!(await ensureOnboarded(ctx))) return;
    const chatId = ctx.chat!.id;
    const exerciseId = ctx.match[1];
    const plan = await buildTodayPlan(chatId);
    await clearProgressDraft(chatId);
    await resetExerciseProgress(chatId, plan, exerciseId);
    const progress = await getExerciseProgress(chatId, plan.date, exerciseId);
    return ctx.reply(await exerciseProgressText(chatId, plan, exerciseId), progressExerciseKeyboard(exerciseId, progress));
  });

  bot.action(/^sk:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!(await ensureOnboarded(ctx))) return;
    const chatId = ctx.chat!.id;
    const exerciseId = ctx.match[1];
    const plan = await buildTodayPlan(chatId);
    await skipExercise(chatId, plan, exerciseId);
    const progress = await getExerciseProgress(chatId, plan.date, exerciseId);
    return ctx.reply(await exerciseProgressText(chatId, plan, exerciseId), progressExerciseKeyboard(exerciseId, progress));
  });
}
