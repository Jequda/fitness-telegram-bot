import { exercisesMap } from '../data/exercises.js';
import { DailyPlan, WorkoutBlock, WellnessState } from '../types/index.js';

const unitLabels = {
  reps: 'повт.',
  seconds: 'сек',
  cycles: 'циклов'
} as const;

const wellnessLabels: Record<WellnessState, string> = {
  normal: 'нормально',
  tired: 'устал',
  sleepy: 'не выспался',
  sore: 'тянет / болит',
  getting_sick: 'заболеваю',
  no_energy: 'нет сил'
};

function blockText(block: WorkoutBlock): string {
  const lines = block.items.map((item, index) => {
    const ex = exercisesMap[item.exerciseId];
    return `${index + 1}. ${ex?.title ?? item.exerciseId} - ${item.sets}${item.notes ? ` (${item.notes})` : ''}`;
  });

  return [`Тренировочный блок: ${block.title}`, block.summary, ...lines].join('\n');
}

export function dayPlanText(plan: DailyPlan, volumeMessage = ''): string {
  if (plan.wholeDaySkipped) {
    return `Сегодня тренировки сняты. Остаток можно догнать позже.\n${volumeMessage}`.trim();
  }

  const titleMap = {
    workday: 'рабочий день',
    friday: 'пятница',
    weekend: 'выходной / праздник'
  } as const;

  return [
    `План на ${plan.date}`,
    `Тип дня: ${titleMap[plan.dayType]}`,
    `Самочувствие: ${wellnessLabels[plan.wellnessState]}`,
    plan.eveningSkipped ? 'Вечерняя тренировка снята.' : '',
    volumeMessage,
    ...plan.blocks.map(blockText)
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function workOnlyText(plan: DailyPlan): string {
  const block = plan.blocks.find((item) => item.type === 'work');
  if (!block) return 'На сегодня рабочего блока нет.';
  return blockText(block);
}

export function eveningOnlyText(plan: DailyPlan): string {
  const block = plan.blocks.find((item) => item.type === 'evening' || item.type === 'weekend_main' || item.type === 'minimum');
  if (!block) return 'На сегодня вечерний блок снят или не нужен.';
  return blockText(block);
}

export function exerciseCardText(exerciseId: string): string {
  const exercise = exercisesMap[exerciseId];
  if (!exercise) return 'Упражнение не найдено.';

  return [
    `Упражнение: ${exercise.title}`,
    exercise.description,
    `Плановый ориентир: ${exercise.repsHint}`,
    `Логирование: ${exercise.logOptions.join(' / ')} ${unitLabels[exercise.logUnit]}`,
    '',
    ...exercise.steps.map((step, index) => `${index + 1}. ${step}`)
  ].join('\n');
}
