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
      { id: 'arms', label: ' C:8', exerciseIds: ['db_biceps_curl', 'db_triceps_extension'] }
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
      { id: 'stability', label: '!B018;870F8O', exerciseIds: ['dead_bug', 'bird_dog'] },
      { id: 'dynamic', label: 'Динамика', exerciseIds: ['reverse_crunch', 'bicycle_crunch', 'hanging_knee_raise'] }
    ]
  },
  {
    id: 'cardio',
    label: 'Кардио',
    subgroups: [
      { id: 'bodyweight', label: '57 8=25=B0@O', exerciseIds: ['mountain_climbers', 'walking'] },
      { id: 'equipment', label: '! 8=25=B0@5<', exerciseIds: ['jump_rope', 'stationary_bike'] }
    ]
  },
  {
    id: 'recovery',
    label: '>AAB0=>2;5=85',
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
  today: '!53>4=O',
  status: '!0<>GC2AB285',
  exercises: 'Упражнения',
  progress: 'Прогресс',
  profile: 'Анкета',
  weekReport: 'Отчёт за неделю',
  skipEvening: '#1@0BL 25G5@',
  skipToday: 'Убрать день',
  notificationsOn: ':;NG8BL C254><;5=8O',
  notificationsOff: 'B:;NG8BL C254><;5=8O'
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
    [Markup.button.callback('Изменить анкету', 'profile:edit_menu')],
    [Markup.button.callback('Назад', 'main_menu')]
  ]);
}

export function profileEditMenuKeyboard() {
  const fields: Array<[string, ProfileQuestionStep]> = [
    ['Имя', 'name'],
    ['Пол', 'sex'],
    ['Возраст', 'age'],
    [' >AB', 'height'],
    ['Вес', 'weight'],
    ['Цель', 'goal'],
    ['!@>: F5;8', 'goal_timeline'],
    ['Опыт', 'experience'],
    ['1>@C4>20=85', 'equipment'],
    ['=59 2 =545;N', 'workout_days'],
    ['8=CB 2 45=L', 'workout_minutes'],
    ['Кардио', 'cardio'],
    ['Ограничения', 'limitations'],
    ['"@02<K', 'injuries'],
    [':B82=>ABL', 'activity'],
    ['!>=', 'sleep'],
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
    ['!8;0', 'strength'],
    ['Форма', 'general_fitness'],
    ['Мобильность', 'mobility'],
    ['Осанка', 'posture'],
    ['K=>A;82>ABL', 'endurance']
  ];

  return Markup.inlineKeyboard([
    ...buttons.map(([label, value]) => [Markup.button.callback(label, `profile:value:goal:${value}`)]),
    [Markup.button.callback('Отмена', 'profile:cancel')]
  ]);
}

export function profileEditExperienceKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('>28G>:', 'profile:value:experience:beginner')],
    [Markup.button.callback('!@54=89', 'profile:value:experience:intermediate')],
    [Markup.button.callback('@>428=CBK9', 'profile:value:experience:advanced')],
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
    [Markup.button.callback(';02=>5 <5=N', 'main_menu')]
  ]);
}

export const wellnessKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('Нормально', 'wellness:normal'), Markup.button.callback('Устал', 'wellness:tired')],
  [Markup.button.callback('5 2KA?0;AO', 'wellness:sleepy'), Markup.button.callback('Тянет / болит', 'wellness:sore')],
  [Markup.button.callback('01>;520N', 'wellness:getting_sick'), Markup.button.callback('Нет сил', 'wellness:no_energy')]
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
    ['!8;0', 'strength'],
    ['Форма', 'general_fitness'],
    ['Мобильность', 'mobility'],
    ['Осанка', 'posture'],
    ['K=>A;82>ABL', 'endurance']
  ];

  return Markup.inlineKeyboard(buttons.map(([label, value]) => [Markup.button.callback(label, `onboarding:goal:${value}`)]));
}

export function onboardingExperienceKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('>28G>:', 'onboarding:experience:beginner')],
    [Markup.button.callback('!@54=89', 'onboarding:experience:intermediate')],
    [Markup.button.callback('@>428=CBK9', 'onboarding:experience:advanced')]
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
      [Markup.button.callback('� > 2A5< 3@C??0<', 'exercises')],
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
    [Markup.button.callback('1=>28BL A?8A>: ?@>3@5AA0', 'progress')],
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
    [Markup.button.callback('!1@>A8BL 70?8AL', `reset:${exerciseId}`)],
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
    [Markup.button.callback('57 25A0', `pw:${exerciseId}:skip`)],
    [Markup.button.callback('Назад', `pg:${exerciseId}`)]
  ]);
}

export function onboardingPrompt(step: OnboardingStep) {
  const prompts: Record<Exclude<OnboardingStep, 'completed'>, string> = {
    name: '0: B51O 7>2CB?',
    sex: 'Выбери пол.',
    age: '!:>;L:> B515 ;5B?',
    height: '0:>9 C B51O @>AB 2 A0=B8<5B@0E?',
    weight: '0:>9 C B51O 25A 2 :8;>3@0<<0E?',
    goal: 'Выбери цель кнопкой ниже.',
    goal_timeline: 'За сколько недель хочешь прийти к цели? Например: 8 или 12.',
    experience: 'K15@8 A2>9 C@>25=L ?>43>B>2:8.',
    equipment: '5@5G8A;8 4>ABC?=>5 >1>@C4>20=85 G5@57 70?OBCN. 0?@8<5@: A2>9 25A, 30=B5;8, BC@=8:, 1@CALO, @578=:8.',
    workout_days: '!:>;L:> 4=59 2 =545;N @50;L=> 3>B>2 B@5=8@>20BLAO?',
    workout_minutes: '!:>;L:> <8=CB 2 45=L <>65HL B@0B8BL =0 B@5=8@>2:C?',
    cardio: 'ABL ;8 5654=52=>5 :0@48>? 0?8H8 "=5B" 8;8 "40: E>4L10, 25;>A8?54".',
    limitations: 'ABL ;8 >3@0=8G5=8O ?> 42865=8O<, 1>;8 8;8 70?@5BK 2@0G0? A;8 =5B, =0?8H8 "=5B".',
    injuries: 'ABL ;8 B@02<K 8;8 ?@>1;5<=K5 7>=K? A;8 =5B, =0?8H8 "=5B".',
    activity: '0:>9 C B51O C@>25=L 0:B82=>AB8 2=5 B@5=8@>2>:?',
    sleep: '!:>;L:> G0A>2 A=0 2 A@54=5< ?>;CG05BAO?',
    timezone: '7 :0:>3> BK 3>@>40? 0?@8<5@: >A:20, !0=:B-5B5@1C@3, :0B5@8=1C@3, >2>A818@A:. >B A0< >?@545;8B G0A>2>9 ?>OA.'
  };

  return prompts[step];
}

export function profileEditPrompt(step: ProfileQuestionStep) {
  return ` 540:B8@>20=85 0=:5BK.\n\n${onboardingPrompt(step)}\n\n>A;5 A>E@0=5=8O 1>B >1=>28B ?@>D8;L.`;
}
