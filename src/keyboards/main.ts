import { Markup } from 'telegraf';
import { DailyPlan, ExerciseProgress, GoalType, OnboardingStep } from '../types/index.js';
import { exercisesMap } from '../data/exercises.js';

export const mainMenu = Markup.inlineKeyboard([
  [Markup.button.callback('Сегодня', 'today'), Markup.button.callback('Самочувствие', 'status')],
  [Markup.button.callback('Упражнения', 'exercises'), Markup.button.callback('Прогресс', 'progress')],
  [Markup.button.callback('Анкета', 'profile'), Markup.button.callback('Убрать вечер', 'skip_evening')],
  [Markup.button.callback('Убрать день', 'skip_day'), Markup.button.callback('Недельный отчёт', 'week_report')]
]);

export const wellnessKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('Нормально', 'wellness:normal'), Markup.button.callback('Устал', 'wellness:tired')],
  [Markup.button.callback('Не выспался', 'wellness:sleepy'), Markup.button.callback('Тянет / болит', 'wellness:sore')],
  [Markup.button.callback('Заболеваю', 'wellness:getting_sick'), Markup.button.callback('Нет сил', 'wellness:no_energy')]
]);

export function onboardingSexKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Мужчина', 'onboarding:sex:male')],
    [Markup.button.callback('Женщина', 'onboarding:sex:female')]
  ]);
}

export function onboardingGoalKeyboard() {
  const buttons: Array<[string, GoalType]> = [
    ['Жиросжигание', 'fat_loss'],
    ['Мышцы', 'muscle_gain'],
    ['Сила', 'strength'],
    ['Форма', 'general_fitness'],
    ['Мобильность', 'mobility'],
    ['Осанка', 'posture'],
    ['Выносливость', 'endurance']
  ];

  return Markup.inlineKeyboard(buttons.map(([label, value]) => [Markup.button.callback(label, `onboarding:goal:${value}`)]));
}

export function onboardingExperienceKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Новичок', 'onboarding:experience:Новичок')],
    [Markup.button.callback('Средний', 'onboarding:experience:Средний')],
    [Markup.button.callback('Продвинутый', 'onboarding:experience:Продвинутый')]
  ]);
}

export function exerciseListKeyboard() {
  return Markup.inlineKeyboard([
    ...Object.values(exercisesMap).map((exercise) => [Markup.button.callback(exercise.title, `ex:${exercise.id}`)]),
    [Markup.button.callback('Назад', 'main_menu')]
  ]);
}

export function progressOverviewKeyboard(plan: DailyPlan, progressByExercise: Record<string, ExerciseProgress | undefined>) {
  return Markup.inlineKeyboard([
    ...plan.blocks.flatMap((block) =>
      block.items.map((item) => {
        const progress = progressByExercise[item.exerciseId];
        const marker =
          progress?.status === 'completed'
            ? '✅'
            : progress?.status === 'in_progress'
              ? '🟡'
              : progress?.status === 'skipped'
                ? '⏭'
                : '⚪';
        return [Markup.button.callback(`${marker} ${exercisesMap[item.exerciseId]?.title ?? item.exerciseId}`, `pg:${item.exerciseId}`)];
      })
    ),
    [Markup.button.callback('Обновить список прогресса', 'progress')],
    [Markup.button.callback('Назад', 'main_menu')]
  ]);
}

export function progressExerciseKeyboard(exerciseId: string, progress: ExerciseProgress) {
  const exercise = exercisesMap[exerciseId];
  if (!exercise) {
    return Markup.inlineKeyboard([[Markup.button.callback('Назад', 'progress')]]);
  }

  const nextSetNumber = progress.loggedSets.length + 1;
  return Markup.inlineKeyboard([
    [Markup.button.callback(`➕ Подход ${nextSetNumber}`, `ps:${exerciseId}`)],
    ...(progress.loggedSets.length > 0
      ? [[
          Markup.button.callback('✅ Легко', `done:${exerciseId}:easy`),
          Markup.button.callback('✅ Нормально', `done:${exerciseId}:ok`),
          Markup.button.callback('✅ Тяжело', `done:${exerciseId}:hard`)
        ]]
      : []),
    [Markup.button.callback('Сбросить запись', `reset:${exerciseId}`)],
    [Markup.button.callback('Пропустить', `sk:${exerciseId}`), Markup.button.callback('Назад', 'progress')]
  ]);
}

export function exerciseValueKeyboard(exerciseId: string) {
  const exercise = exercisesMap[exerciseId];
  if (!exercise) return Markup.inlineKeyboard([[Markup.button.callback('Назад', 'progress')]]);
  return Markup.inlineKeyboard([
    ...exercise.logOptions.reduce<Array<ReturnType<typeof Markup.button.callback>[]>>((rows, option, index) => {
      const rowIndex = Math.floor(index / 3);
      rows[rowIndex] ??= [];
      rows[rowIndex].push(Markup.button.callback(String(option), `pv:${exerciseId}:${option}`));
      return rows;
    }, []),
    [Markup.button.callback('Назад', `pg:${exerciseId}`)]
  ]);
}

export function exerciseWeightKeyboard(exerciseId: string) {
  const exercise = exercisesMap[exerciseId];
  if (!exercise) return Markup.inlineKeyboard([[Markup.button.callback('Назад', 'progress')]]);
  const values = exercise.weightOptionsKg ?? [];

  return Markup.inlineKeyboard([
    ...values.reduce<Array<ReturnType<typeof Markup.button.callback>[]>>((rows, option, index) => {
      const rowIndex = Math.floor(index / 3);
      rows[rowIndex] ??= [];
      rows[rowIndex].push(Markup.button.callback(`${option} кг`, `pw:${exerciseId}:${option}`));
      return rows;
    }, []),
    [Markup.button.callback('Без веса', `pw:${exerciseId}:skip`)],
    [Markup.button.callback('Назад', `pg:${exerciseId}`)]
  ]);
}

export function onboardingPrompt(step: OnboardingStep) {
  const prompts: Record<Exclude<OnboardingStep, 'completed'>, string> = {
    name: 'Как тебя зовут?',
    sex: 'Выбери пол.',
    age: 'Сколько тебе лет?',
    height: 'Какой у тебя рост в сантиметрах?',
    weight: 'Какой у тебя вес в килограммах?',
    goal: 'Выбери цель кнопкой ниже.',
    experience: 'Выбери свой уровень подготовки.',
    equipment:
      'Перечисли доступное оборудование через запятую. Например: свой вес, гантели, турник, брусья, резинки.',
    workout_days: 'Сколько дней в неделю реально готов тренироваться?',
    workout_minutes: 'Сколько минут в день можешь тратить на тренировку?',
    cardio: 'Есть ли ежедневное кардио? Напиши "нет" или "да: ходьба, велосипед".',
    limitations: 'Есть ли ограничения по движениям, боли или запреты врача? Если нет, напиши "нет".',
    injuries: 'Есть ли травмы или проблемные зоны? Если нет, напиши "нет".',
    activity: 'Какой у тебя уровень активности вне тренировок? Например: офис, много хожу, физическая работа.',
    sleep: 'Сколько часов сна в среднем получается?',
    timezone: 'Какой у тебя часовой пояс? Например: Europe/Moscow.'
  };

  return prompts[step];
}
