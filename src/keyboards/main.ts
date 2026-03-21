import { Markup } from 'telegraf';
import { DailyPlan, ExerciseProgress, GoalType, OnboardingStep, ProfileQuestionStep } from '../types/index.js';
import { exercisesMap } from '../data/exercises.js';

export const mainMenuLabels = {
  today: 'Сегодня',
  status: 'Самочувствие',
  exercises: 'Упражнения',
  progress: 'Прогресс',
  profile: 'Анкета',
  weekReport: 'Отчет за неделю',
  skipEvening: 'Убрать вечер',
  skipToday: 'Убрать день',
  notificationsOn: 'Включить уведомления',
  notificationsOff: 'Отключить уведомления'
} as const;

export function mainMenu(notificationsEnabled = true) {
  return Markup.keyboard([
    [mainMenuLabels.today, mainMenuLabels.status],
    [mainMenuLabels.exercises, mainMenuLabels.progress],
    [mainMenuLabels.profile, mainMenuLabels.weekReport],
    [mainMenuLabels.skipEvening, mainMenuLabels.skipToday],
    [notificationsEnabled ? mainMenuLabels.notificationsOff : mainMenuLabels.notificationsOn]
  ])
    .resize()
    .persistent();
}

export function profileActionsKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('РР·РјРµРЅРёС‚СЊ Р°РЅРєРµС‚Сѓ', 'profile:edit_menu')],
    [Markup.button.callback('РќР°Р·Р°Рґ', 'main_menu')]
  ]);
}

export function profileEditMenuKeyboard() {
  const fields: Array<[string, ProfileQuestionStep]> = [
    ['РРјСЏ', 'name'],
    ['РџРѕР»', 'sex'],
    ['Р’РѕР·СЂР°СЃС‚', 'age'],
    ['Р РѕСЃС‚', 'height'],
    ['Р’РµСЃ', 'weight'],
    ['Р¦РµР»СЊ', 'goal'],
    ['РЎСЂРѕРє С†РµР»Рё', 'goal_timeline'],
    ['РћРїС‹С‚', 'experience'],
    ['РћР±РѕСЂСѓРґРѕРІР°РЅРёРµ', 'equipment'],
    ['Р”РЅРµР№ РІ РЅРµРґРµР»СЋ', 'workout_days'],
    ['РњРёРЅСѓС‚ РІ РґРµРЅСЊ', 'workout_minutes'],
    ['РљР°СЂРґРёРѕ', 'cardio'],
    ['РћРіСЂР°РЅРёС‡РµРЅРёСЏ', 'limitations'],
    ['РўСЂР°РІРјС‹', 'injuries'],
    ['РђРєС‚РёРІРЅРѕСЃС‚СЊ', 'activity'],
    ['РЎРѕРЅ', 'sleep'],
    ['Р“РѕСЂРѕРґ', 'timezone']
  ];

  return Markup.inlineKeyboard([
    ...fields.map(([label, step]) => [Markup.button.callback(label, `profile:edit:${step}`)]),
    [Markup.button.callback('РќР°Р·Р°Рґ Рє Р°РЅРєРµС‚Рµ', 'profile')],
    [Markup.button.callback('Р’ РјРµРЅСЋ', 'main_menu')]
  ]);
}

export function profileEditCancelKeyboard() {
  return Markup.inlineKeyboard([[Markup.button.callback('РћС‚РјРµРЅР°', 'profile:cancel')]]);
}

export function profileEditSexKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('РњСѓР¶С‡РёРЅР°', 'profile:value:sex:male')],
    [Markup.button.callback('Р–РµРЅС‰РёРЅР°', 'profile:value:sex:female')],
    [Markup.button.callback('РћС‚РјРµРЅР°', 'profile:cancel')]
  ]);
}

export function profileEditGoalKeyboard() {
  const buttons: Array<[string, GoalType]> = [
    ['Р–РёСЂРѕСЃР¶РёРіР°РЅРёРµ', 'fat_loss'],
    ['РњС‹С€С†С‹', 'muscle_gain'],
    ['РЎРёР»Р°', 'strength'],
    ['Р¤РѕСЂРјР°', 'general_fitness'],
    ['РњРѕР±РёР»СЊРЅРѕСЃС‚СЊ', 'mobility'],
    ['РћСЃР°РЅРєР°', 'posture'],
    ['Р’С‹РЅРѕСЃР»РёРІРѕСЃС‚СЊ', 'endurance']
  ];

  return Markup.inlineKeyboard([
    ...buttons.map(([label, value]) => [Markup.button.callback(label, `profile:value:goal:${value}`)]),
    [Markup.button.callback('РћС‚РјРµРЅР°', 'profile:cancel')]
  ]);
}

export function profileEditExperienceKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('РќРѕРІРёС‡РѕРє', 'profile:value:experience:beginner')],
    [Markup.button.callback('РЎСЂРµРґРЅРёР№', 'profile:value:experience:intermediate')],
    [Markup.button.callback('РџСЂРѕРґРІРёРЅСѓС‚С‹Р№', 'profile:value:experience:advanced')],
    [Markup.button.callback('РћС‚РјРµРЅР°', 'profile:cancel')]
  ]);
}

export function exerciseDetailKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Р’С‹Р±СЂР°С‚СЊ РґСЂСѓРіРѕРµ СѓРїСЂР°Р¶РЅРµРЅРёРµ', 'exercises')],
    [Markup.button.callback('Р“Р»Р°РІРЅРѕРµ РјРµРЅСЋ', 'main_menu')]
  ]);
}

export const wellnessKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('РќРѕСЂРјР°Р»СЊРЅРѕ', 'wellness:normal'), Markup.button.callback('РЈСЃС‚Р°Р»', 'wellness:tired')],
  [Markup.button.callback('РќРµ РІС‹СЃРїР°Р»СЃСЏ', 'wellness:sleepy'), Markup.button.callback('РўСЏРЅРµС‚ / Р±РѕР»РёС‚', 'wellness:sore')],
  [Markup.button.callback('Р—Р°Р±РѕР»РµРІР°СЋ', 'wellness:getting_sick'), Markup.button.callback('РќРµС‚ СЃРёР»', 'wellness:no_energy')]
]);

export function onboardingSexKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('РњСѓР¶С‡РёРЅР°', 'onboarding:sex:male')],
    [Markup.button.callback('Р–РµРЅС‰РёРЅР°', 'onboarding:sex:female')]
  ]);
}

export function onboardingGoalKeyboard() {
  const buttons: Array<[string, GoalType]> = [
    ['Р–РёСЂРѕСЃР¶РёРіР°РЅРёРµ', 'fat_loss'],
    ['РњС‹С€С†С‹', 'muscle_gain'],
    ['РЎРёР»Р°', 'strength'],
    ['Р¤РѕСЂРјР°', 'general_fitness'],
    ['РњРѕР±РёР»СЊРЅРѕСЃС‚СЊ', 'mobility'],
    ['РћСЃР°РЅРєР°', 'posture'],
    ['Р’С‹РЅРѕСЃР»РёРІРѕСЃС‚СЊ', 'endurance']
  ];

  return Markup.inlineKeyboard(buttons.map(([label, value]) => [Markup.button.callback(label, `onboarding:goal:${value}`)]));
}

export function onboardingExperienceKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('РќРѕРІРёС‡РѕРє', 'onboarding:experience:РќРѕРІРёС‡РѕРє')],
    [Markup.button.callback('РЎСЂРµРґРЅРёР№', 'onboarding:experience:РЎСЂРµРґРЅРёР№')],
    [Markup.button.callback('РџСЂРѕРґРІРёРЅСѓС‚С‹Р№', 'onboarding:experience:РџСЂРѕРґРІРёРЅСѓС‚С‹Р№')]
  ]);
}

export function exerciseListKeyboard() {
  return Markup.inlineKeyboard([
    ...Object.values(exercisesMap).map((exercise) => [Markup.button.callback(exercise.title, `ex:${exercise.id}`)]),
    [Markup.button.callback('РќР°Р·Р°Рґ', 'main_menu')]
  ]);
}

export function progressOverviewKeyboard(plan: DailyPlan, progressByExercise: Record<string, ExerciseProgress | undefined>) {
  return Markup.inlineKeyboard([
    ...plan.blocks.flatMap((block) =>
      block.items.map((item) => {
        const progress = progressByExercise[item.exerciseId];
        const marker =
          progress?.status === 'completed'
            ? 'вњ…'
            : progress?.status === 'in_progress'
              ? 'рџџЎ'
              : progress?.status === 'skipped'
                ? 'вЏ­'
                : 'вљЄ';
        return [Markup.button.callback(`${marker} ${exercisesMap[item.exerciseId]?.title ?? item.exerciseId}`, `pg:${item.exerciseId}`)];
      })
    ),
    [Markup.button.callback('РћР±РЅРѕРІРёС‚СЊ СЃРїРёСЃРѕРє РїСЂРѕРіСЂРµСЃСЃР°', 'progress')],
    [Markup.button.callback('РќР°Р·Р°Рґ', 'main_menu')]
  ]);
}

export function progressExerciseKeyboard(exerciseId: string, progress: ExerciseProgress) {
  const exercise = exercisesMap[exerciseId];
  if (!exercise) {
    return Markup.inlineKeyboard([[Markup.button.callback('РќР°Р·Р°Рґ', 'progress')]]);
  }

  const nextSetNumber = progress.loggedSets.length + 1;
  return Markup.inlineKeyboard([
    [Markup.button.callback(`вћ• РџРѕРґС…РѕРґ ${nextSetNumber}`, `ps:${exerciseId}`)],
    ...(progress.loggedSets.length > 0
      ? [[
          Markup.button.callback('вњ… Р›РµРіРєРѕ', `done:${exerciseId}:easy`),
          Markup.button.callback('вњ… РќРѕСЂРјР°Р»СЊРЅРѕ', `done:${exerciseId}:ok`),
          Markup.button.callback('вњ… РўСЏР¶РµР»Рѕ', `done:${exerciseId}:hard`)
        ]]
      : []),
    [Markup.button.callback('РЎР±СЂРѕСЃРёС‚СЊ Р·Р°РїРёСЃСЊ', `reset:${exerciseId}`)],
    [Markup.button.callback('РџСЂРѕРїСѓСЃС‚РёС‚СЊ', `sk:${exerciseId}`), Markup.button.callback('РќР°Р·Р°Рґ', 'progress')]
  ]);
}

export function exerciseValueKeyboard(exerciseId: string) {
  const exercise = exercisesMap[exerciseId];
  if (!exercise) return Markup.inlineKeyboard([[Markup.button.callback('РќР°Р·Р°Рґ', 'progress')]]);
  return Markup.inlineKeyboard([
    ...exercise.logOptions.reduce<Array<ReturnType<typeof Markup.button.callback>[]>>((rows, option, index) => {
      const rowIndex = Math.floor(index / 3);
      rows[rowIndex] ??= [];
      rows[rowIndex].push(Markup.button.callback(String(option), `pv:${exerciseId}:${option}`));
      return rows;
    }, []),
    [Markup.button.callback('РќР°Р·Р°Рґ', `pg:${exerciseId}`)]
  ]);
}

export function exerciseWeightKeyboard(exerciseId: string) {
  const exercise = exercisesMap[exerciseId];
  if (!exercise) return Markup.inlineKeyboard([[Markup.button.callback('РќР°Р·Р°Рґ', 'progress')]]);
  const values = exercise.weightOptionsKg ?? [];

  return Markup.inlineKeyboard([
    ...values.reduce<Array<ReturnType<typeof Markup.button.callback>[]>>((rows, option, index) => {
      const rowIndex = Math.floor(index / 3);
      rows[rowIndex] ??= [];
      rows[rowIndex].push(Markup.button.callback(`${option} РєРі`, `pw:${exerciseId}:${option}`));
      return rows;
    }, []),
    [Markup.button.callback('Р‘РµР· РІРµСЃР°', `pw:${exerciseId}:skip`)],
    [Markup.button.callback('РќР°Р·Р°Рґ', `pg:${exerciseId}`)]
  ]);
}

export function onboardingPrompt(step: OnboardingStep) {
  const prompts: Record<Exclude<OnboardingStep, 'completed'>, string> = {
    name: 'РљР°Рє С‚РµР±СЏ Р·РѕРІСѓС‚?',
    sex: 'Р’С‹Р±РµСЂРё РїРѕР».',
    age: 'РЎРєРѕР»СЊРєРѕ С‚РµР±Рµ Р»РµС‚?',
    height: 'РљР°РєРѕР№ Сѓ С‚РµР±СЏ СЂРѕСЃС‚ РІ СЃР°РЅС‚РёРјРµС‚СЂР°С…?',
    weight: 'РљР°РєРѕР№ Сѓ С‚РµР±СЏ РІРµСЃ РІ РєРёР»РѕРіСЂР°РјРјР°С…?',
    goal: 'Р’С‹Р±РµСЂРё С†РµР»СЊ РєРЅРѕРїРєРѕР№ РЅРёР¶Рµ.',
    goal_timeline: 'Р—Р° СЃРєРѕР»СЊРєРѕ РЅРµРґРµР»СЊ С…РѕС‡РµС€СЊ РїСЂРёР№С‚Рё Рє С†РµР»Рё? РќР°РїСЂРёРјРµСЂ: 8 РёР»Рё 12.',
    experience: 'Р’С‹Р±РµСЂРё СЃРІРѕР№ СѓСЂРѕРІРµРЅСЊ РїРѕРґРіРѕС‚РѕРІРєРё.',
    equipment: 'РџРµСЂРµС‡РёСЃР»Рё РґРѕСЃС‚СѓРїРЅРѕРµ РѕР±РѕСЂСѓРґРѕРІР°РЅРёРµ С‡РµСЂРµР· Р·Р°РїСЏС‚СѓСЋ. РќР°РїСЂРёРјРµСЂ: СЃРІРѕР№ РІРµСЃ, РіР°РЅС‚РµР»Рё, С‚СѓСЂРЅРёРє, Р±СЂСѓСЃСЊСЏ, СЂРµР·РёРЅРєРё.',
    workout_days: 'РЎРєРѕР»СЊРєРѕ РґРЅРµР№ РІ РЅРµРґРµР»СЋ СЂРµР°Р»СЊРЅРѕ РіРѕС‚РѕРІ С‚СЂРµРЅРёСЂРѕРІР°С‚СЊСЃСЏ?',
    workout_minutes: 'РЎРєРѕР»СЊРєРѕ РјРёРЅСѓС‚ РІ РґРµРЅСЊ РјРѕР¶РµС€СЊ С‚СЂР°С‚РёС‚СЊ РЅР° С‚СЂРµРЅРёСЂРѕРІРєСѓ?',
    cardio: 'Р•СЃС‚СЊ Р»Рё РµР¶РµРґРЅРµРІРЅРѕРµ РєР°СЂРґРёРѕ? РќР°РїРёС€Рё "РЅРµС‚" РёР»Рё "РґР°: С…РѕРґСЊР±Р°, РІРµР»РѕСЃРёРїРµРґ".',
    limitations: 'Р•СЃС‚СЊ Р»Рё РѕРіСЂР°РЅРёС‡РµРЅРёСЏ РїРѕ РґРІРёР¶РµРЅРёСЏРј, Р±РѕР»Рё РёР»Рё Р·Р°РїСЂРµС‚С‹ РІСЂР°С‡Р°? Р•СЃР»Рё РЅРµС‚, РЅР°РїС€Рё "РЅРµС‚".',
    injuries: 'Р•СЃС‚СЊ Р»Рё С‚СЂР°РІРјС‹ РёР»Рё РїСЂРѕР±Р»РµРјРЅС‹Рµ Р·РѕРЅС‹? Р•СЃР»Рё РЅРµС‚, РЅР°РїРёС€Рё "РЅРµС‚".',
    activity: 'РљР°РєРѕР№ Сѓ С‚РµР±СЏ СѓСЂРѕРІРµРЅСЊ Р°РєС‚РёРІРЅРѕСЃС‚Рё РІРЅРµ С‚СЂРµРЅРёСЂРѕРІРѕРє? РќР°РїСЂРёРјРµСЂ: РѕС„РёСЃ, РјРЅРѕРіРѕ С…РѕР¶Сѓ, С„РёР·РёС‡РµСЃРєР°СЏ СЂР°Р±РѕС‚Р°.',
    sleep: 'РЎРєРѕР»СЊРєРѕ С‡Р°СЃРѕРІ СЃРЅР° РІ СЃСЂРµРґРЅРµРј РїРѕР»СѓС‡Р°РµС‚СЃСЏ?',
    timezone: 'РР· РєР°РєРѕРіРѕ С‚С‹ РіРѕСЂРѕРґР°? РќР°РїСЂРёРјРµСЂ: РњРѕСЃРєРІР°, РЎР°РЅРєС‚-РџРµС‚РµСЂР±СѓСЂРі, Р•РєР°С‚РµСЂРёРЅР±СѓСЂРі, РќРѕРІРѕСЃРёР±РёСЂСЃРє. Р‘РѕС‚ СЃР°Рј РѕРїСЂРµРґРµР»РёС‚ С‡Р°СЃРѕРІРѕР№ РїРѕСЏСЃ.'
  };

  return prompts[step];
}

export function profileEditPrompt(step: ProfileQuestionStep) {
  return `Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ Р°РЅРєРµС‚С‹.\n\n${onboardingPrompt(step)}\n\nРџРѕСЃР»Рµ СЃРѕС…СЂР°РЅРµРЅРёСЏ Р±РѕС‚ РѕР±РЅРѕРІРёС‚ РїСЂРѕС„РёР»СЊ.`;
}
