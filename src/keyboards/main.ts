import { Markup } from 'telegraf';
import { DailyPlan, ExerciseProgress, GoalType, OnboardingStep, ProfileQuestionStep } from '../types/index.js';
import { exercisesMap } from '../data/exercises.js';

type ExerciseSubgroup = {
  id: string;
  label: string;
  exerciseIds: string[];
};

type ExerciseGroup = {
  id: string;
  label: string;
  subgroups: ExerciseSubgroup[];
};

const exerciseGroups: ExerciseGroup[] = [
  {
    id: 'mobility',
    label: 'Мобилизация',
    subgroups: [
      { id: 'upper', label: 'Верх тела', exerciseIds: ['thoracic_stretch', 'neck_mobility', 'scapular_retraction'] },
      { id: 'lower', label: 'Таз и ноги', exerciseIds: ['hip_mobility'] }
    ]
  },
  {
    id: 'upper',
    label: 'Верх тела',
    subgroups: [
      { id: 'push', label: 'Жим', exerciseIds: ['pushups', 'incline_pushups', 'pike_pushups', 'dips', 'db_floor_press', 'db_overhead_press'] },
      { id: 'pull', label: 'Тяга', exerciseIds: ['pullups', 'db_row', 'band_row', 'band_pull_apart'] },
      { id: 'arms', label: 'Руки', exerciseIds: ['db_biceps_curl', 'db_triceps_extension'] }
    ]
  },
  {
    id: 'lower',
    label: 'Низ тела',
    subgroups: [
      { id: 'base', label: 'База', exerciseIds: ['air_squats', 'goblet_squat', 'reverse_lunge', 'db_reverse_lunge'] },
      { id: 'posterior', label: 'Задняя цепь', exerciseIds: ['rdl', 'glute_bridge'] },
      { id: 'calves', label: 'Икры', exerciseIds: ['calf_raise'] }
    ]
  },
  {
    id: 'core',
    label: 'Кор и пресс',
    subgroups: [
      { id: 'holds', label: 'Планки и удержания', exerciseIds: ['plank', 'side_plank', 'hollow_hold'] },
      { id: 'stability', label: 'Стабилизация', exerciseIds: ['dead_bug', 'bird_dog'] },
      { id: 'dynamic', label: 'Динамика', exerciseIds: ['reverse_crunch', 'bicycle_crunch', 'hanging_knee_raise'] }
    ]
  },
  {
    id: 'cardio',
    label: 'Кардио',
    subgroups: [
      { id: 'bodyweight', label: 'Без инвентаря', exerciseIds: ['mountain_climbers', 'walking'] },
      { id: 'equipment', label: 'С инвентарём', exerciseIds: ['jump_rope', 'stationary_bike'] }
    ]
  },
  {
    id: 'recovery',
    label: 'Восстановление',
    subgroups: [{ id: 'light', label: 'Дыхание и минимум', exerciseIds: ['box_breathing', 'minimum_complex'] }]
  }
];

function countExercises(subgroups: ExerciseSubgroup[]) {
  return subgroups.reduce((total, subgroup) => total + subgroup.exerciseIds.filter((exerciseId) => exercisesMap[exerciseId]).length, 0);
}

function getExerciseGroup(groupId?: string) {
  return exerciseGroups.find((group) => group.id === groupId);
}

function getExerciseSubgroup(groupId?: string, subgroupId?: string) {
  const group = getExerciseGroup(groupId);
  if (!group) return null;
  return group.subgroups.find((subgroup) => subgroup.id === subgroupId) ?? null;
}

export const mainMenuLabels = {
  today: 'Сегодня',
  status: 'Самочувствие',
  exercises: 'Упражнения',
  progress: 'Прогресс',
  profile: 'Анкета',
  weekReport: 'Отчёт за неделю',
  skipEvening: 'Убрать вечер',
  skipToday: 'Убрать день',
  notificationsOn: 'Включить уведомления',
  notificationsOff: 'Отключить уведомления',
  aiTrainer: '🤖 AI Тренер'
} as const;

export const aiChatExitLabel = 'Выйти из чата';

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

export function aiChatKeyboard() {
  return Markup.keyboard([[aiChatExitLabel]]).resize().persistent();
}

export function profileActionsKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Изменить анкету', 'profile:edit_menu')],
    [Markup.button.callback('Назад', 'main_menu')]
  ]);
}

export function profileEditMenuKeyboard() {
  const fields: Array<[string, ProfileQuestionStep]> = [
    ['Имя', 'name'],
    ['Пол', 'sex'],
    ['Возраст', 'age'],
    ['Рост', 'height'],
    ['Вес', 'weight'],
    ['Цель', 'goal'],
    ['Срок цели', 'goal_timeline'],
    ['Опыт', 'experience'],
    ['Оборудование', 'equipment'],
    ['Дней в неделю', 'workout_days'],
    ['Минут в день', 'workout_minutes'],
    ['Кардио', 'cardio'],
    ['Ограничения', 'limitations'],
    ['Травмы', 'injuries'],
    ['Активность', 'activity'],
    ['Сон', 'sleep'],
    ['Город', 'timezone']
  ];

  return Markup.inlineKeyboard([
    ...fields.map(([label, step]) => [Markup.button.callback(label, `profile:edit:${step}`)]),
    [Markup.button.callback('Назад к анкете', 'profile')],
    [Markup.button.callback('В меню', 'main_menu')]
  ]);
}

export function profileEditCancelKeyboard() {
  return Markup.inlineKeyboard([[Markup.button.callback('Отмена', 'profile:cancel')]]);
}

export function profileEditSexKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Мужчина', 'profile:value:sex:male')],
    [Markup.button.callback('Женщина', 'profile:value:sex:female')],
    [Markup.button.callback('Отмена', 'profile:cancel')]
  ]);
}

export function profileEditGoalKeyboard() {
  const buttons: Array<[string, GoalType]> = [
    ['Жиросжигание', 'fat_loss'],
    ['Мышцы', 'muscle_gain'],
    ['Сила', 'strength'],
    ['Форма', 'general_fitness'],
    ['Мобильность', 'mobility'],
    ['Осанка', 'posture'],
    ['Выносливость', 'endurance']
  ];

  return Markup.inlineKeyboard([
    ...buttons.map(([label, value]) => [Markup.button.callback(label, `profile:value:goal:${value}`)]),
    [Markup.button.callback('Отмена', 'profile:cancel')]
  ]);
}

export function profileEditExperienceKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Новичок', 'profile:value:experience:beginner')],
    [Markup.button.callback('Средний', 'profile:value:experience:intermediate')],
    [Markup.button.callback('Продвинутый', 'profile:value:experience:advanced')],
    [Markup.button.callback('Отмена', 'profile:cancel')]
  ]);
}

export function profileEditActivityKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Офис / сидячая', 'profile:value:activity:sedentary')],
    [Markup.button.callback('Немного хожу', 'profile:value:activity:light')],
    [Markup.button.callback('Много хожу', 'profile:value:activity:moderate')],
    [Markup.button.callback('Физическая работа', 'profile:value:activity:high')],
    [Markup.button.callback('Отмена', 'profile:cancel')]
  ]);
}

export function exerciseDetailKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Выбрать другое упражнение', 'exercises')],
    [Markup.button.callback('Главное меню', 'main_menu')]
  ]);
}

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
    [Markup.button.callback('Новичок', 'onboarding:experience:beginner')],
    [Markup.button.callback('Средний', 'onboarding:experience:intermediate')],
    [Markup.button.callback('Продвинутый', 'onboarding:experience:advanced')]
  ]);
}

export function onboardingActivityKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Офис / сидячая', 'onboarding:activity:sedentary')],
    [Markup.button.callback('Немного хожу', 'onboarding:activity:light')],
    [Markup.button.callback('Много хожу', 'onboarding:activity:moderate')],
    [Markup.button.callback('Физическая работа', 'onboarding:activity:high')]
  ]);
}

export function exerciseListKeyboard(groupId?: string, subgroupId?: string) {
  const subgroup = getExerciseSubgroup(groupId, subgroupId);
  if (subgroup) {
    return Markup.inlineKeyboard([
      ...subgroup.exerciseIds
        .map((exerciseId) => exercisesMap[exerciseId])
        .filter((exercise): exercise is NonNullable<typeof exercise> => Boolean(exercise))
        .map((exercise) => [Markup.button.callback(exercise.title, `ex:${exercise.id}`)]),
      [Markup.button.callback('← К подгруппам', `exg:${groupId}`)],
      [Markup.button.callback('В меню', 'main_menu')]
    ]);
  }

  const group = getExerciseGroup(groupId);
  if (group) {
    return Markup.inlineKeyboard([
      ...group.subgroups.map((item) => [
        Markup.button.callback(`${item.label} · ${item.exerciseIds.filter((exerciseId) => exercisesMap[exerciseId]).length}`, `exsg:${group.id}:${item.id}`)
      ]),
      [Markup.button.callback('← По всем группам', 'exercises')],
      [Markup.button.callback('В меню', 'main_menu')]
    ]);
  }

  return Markup.inlineKeyboard([
    ...exerciseGroups.map((item) => [Markup.button.callback(`${item.label} · ${countExercises(item.subgroups)}`, `exg:${item.id}`)]),
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
    [Markup.button.callback('Ввести свой вес', `pw:${exerciseId}:custom`)],
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
    goal_timeline: 'За сколько недель хочешь прийти к цели? Например: 8 или 12.',
    experience: 'Выбери свой уровень подготовки.',
    equipment: 'Перечисли доступное оборудование через запятую. Например: свой вес, гантели, турник, брусья, резинки.',
    workout_days: 'Сколько дней в неделю реально готов тренироваться?',
    workout_minutes: 'Сколько минут в день можешь тратить на тренировку?',
    cardio: 'Есть ли ежедневное кардио? Напиши "нет" или "да: ходьба, велосипед".',
    limitations: 'Есть ли ограничения по движениям, боли или запреты врача? Если нет, напиши "нет".',
    injuries: 'Есть ли травмы или проблемные зоны? Если нет, напиши "нет".',
    activity: 'Какой у тебя уровень активности вне тренировок?',
    sleep: 'Сколько часов сна в среднем получается?',
    timezone: 'Из какого ты города? Например: Москва, Санкт-Петербург, Екатеринбург, Новосибирск. Бот сам определит часовой пояс.'
  };

  return prompts[step];
}

export function profileEditPrompt(step: ProfileQuestionStep) {
  return `Редактирование анкеты.\n\n${onboardingPrompt(step)}\n\nПосле сохранения бот обновит профиль.`;
}
