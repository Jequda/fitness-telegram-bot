import { exercisesMap } from '../data/exercises.js';
import { DailyLog, DailyPlan, ExerciseProgress, ExerciseSetLog, WorkoutBlockType } from '../types/index.js';
import { readState, upsertLog, writeState } from './storage.js';
import { localDateString } from '../utils/date.js';

function emptyProgress(targetSets?: string): ExerciseProgress {
  return {
    status: 'not_started',
    targetSets,
    loggedSets: []
  };
}

const unitLabels = {
  reps: 'повт.',
  seconds: 'сек',
  cycles: 'циклов'
} as const;

const statusLabels: Record<ExerciseProgress['status'], string> = {
  not_started: 'не начато',
  in_progress: 'в процессе',
  completed: 'завершено',
  skipped: 'пропущено'
};

const difficultyLabels: Record<NonNullable<ExerciseProgress['difficulty']>, string> = {
  easy: 'легко',
  ok: 'нормально',
  hard: 'тяжело'
};

export async function ensureDailyLog(chatId: number, date?: string): Promise<DailyLog> {
  const state = await readState(chatId);
  const resolvedDate = date ?? localDateString(state.timezone);
  const existing = state.dailyLogs.find((item) => item.date === resolvedDate);
  if (existing) return existing;

  const created: DailyLog = {
    date: resolvedDate,
    completedBlocks: [],
    skippedEvening: state.skipEveningDates.includes(resolvedDate),
    skippedAll: state.skippedDates.includes(resolvedDate),
    progressByExercise: {}
  };
  await upsertLog(chatId, created);
  return created;
}

export async function getExerciseProgress(chatId: number, date: string, exerciseId: string, targetSets?: string): Promise<ExerciseProgress> {
  const log = await ensureDailyLog(chatId, date);
  return log.progressByExercise[exerciseId] ?? emptyProgress(targetSets);
}

function getExerciseBlockMap(plan: DailyPlan): Record<string, WorkoutBlockType> {
  return Object.fromEntries(plan.blocks.flatMap((block) => block.items.map((item) => [item.exerciseId, block.type])));
}

function recomputeCompletedBlocks(log: DailyLog, plan: DailyPlan): WorkoutBlockType[] {
  const completed = plan.blocks
    .filter((block) =>
      block.items.every((item) => {
        const progress = log.progressByExercise[item.exerciseId];
        return progress && (progress.status === 'completed' || progress.status === 'skipped');
      })
    )
    .map((block) => block.type);

  return [...new Set(completed)];
}

async function updateLog(chatId: number, mutator: (log: DailyLog) => DailyLog) {
  const state = await readState(chatId);
  const date = localDateString(state.timezone);
  const current = await ensureDailyLog(chatId, date);
  await upsertLog(chatId, mutator(current));
}

export async function setProgressDraft(chatId: number, exerciseId: string, pendingSetNumber: number) {
  const state = await readState(chatId);
  state.ui.progressDraft = {
    date: localDateString(state.timezone),
    exerciseId,
    pendingSetNumber
  };
  await writeState(state);
}

export async function clearProgressDraft(chatId: number) {
  const state = await readState(chatId);
  state.ui.progressDraft = undefined;
  await writeState(state);
}

export async function setDraftValue(chatId: number, exerciseId: string, value: number) {
  const state = await readState(chatId);
  if (!state.ui.progressDraft || state.ui.progressDraft.exerciseId !== exerciseId) return;
  state.ui.progressDraft.pendingValue = value;
  await writeState(state);
}

export async function appendExerciseSet(chatId: number, plan: DailyPlan, exerciseId: string, setLog: ExerciseSetLog) {
  await updateLog(chatId, (log) => {
    const item = plan.blocks.flatMap((block) => block.items).find((entry) => entry.exerciseId === exerciseId);
    const current = log.progressByExercise[exerciseId] ?? emptyProgress(item?.sets);
    const nextProgress: ExerciseProgress = {
      ...current,
      status: 'in_progress',
      targetSets: current.targetSets ?? item?.sets,
      loggedSets: [...current.loggedSets, setLog],
      lastUpdatedAt: setLog.loggedAt
    };

    const nextLog: DailyLog = {
      ...log,
      progressByExercise: {
        ...log.progressByExercise,
        [exerciseId]: nextProgress
      }
    };

    nextLog.completedBlocks = recomputeCompletedBlocks(nextLog, plan);
    return nextLog;
  });
}

export async function completeExercise(chatId: number, plan: DailyPlan, exerciseId: string, difficulty: ExerciseProgress['difficulty']) {
  await updateLog(chatId, (log) => {
    const item = plan.blocks.flatMap((block) => block.items).find((entry) => entry.exerciseId === exerciseId);
    const current = log.progressByExercise[exerciseId] ?? emptyProgress(item?.sets);
    const nextLog: DailyLog = {
      ...log,
      progressByExercise: {
        ...log.progressByExercise,
        [exerciseId]: {
          ...current,
          status: 'completed',
          targetSets: current.targetSets ?? item?.sets,
          difficulty,
          lastUpdatedAt: new Date().toISOString()
        }
      }
    };

    nextLog.completedBlocks = recomputeCompletedBlocks(nextLog, plan);
    return nextLog;
  });
}

export async function skipExercise(chatId: number, plan: DailyPlan, exerciseId: string) {
  await updateLog(chatId, (log) => {
    const item = plan.blocks.flatMap((block) => block.items).find((entry) => entry.exerciseId === exerciseId);
    const nextLog: DailyLog = {
      ...log,
      progressByExercise: {
        ...log.progressByExercise,
        [exerciseId]: {
          ...(log.progressByExercise[exerciseId] ?? emptyProgress(item?.sets)),
          status: 'skipped',
          targetSets: item?.sets,
          lastUpdatedAt: new Date().toISOString()
        }
      }
    };

    nextLog.completedBlocks = recomputeCompletedBlocks(nextLog, plan);
    return nextLog;
  });
}

export async function resetExerciseProgress(chatId: number, plan: DailyPlan, exerciseId: string) {
  await updateLog(chatId, (log) => {
    const item = plan.blocks.flatMap((block) => block.items).find((entry) => entry.exerciseId === exerciseId);
    const nextProgressByExercise = { ...log.progressByExercise };
    nextProgressByExercise[exerciseId] = emptyProgress(item?.sets);
    const nextLog: DailyLog = {
      ...log,
      progressByExercise: nextProgressByExercise
    };
    nextLog.completedBlocks = recomputeCompletedBlocks(nextLog, plan);
    return nextLog;
  });
}

export async function exerciseProgressText(chatId: number, plan: DailyPlan, exerciseId: string): Promise<string> {
  const exercise = exercisesMap[exerciseId];
  if (!exercise) return 'Упражнение не найдено.';
  const item = plan.blocks.flatMap((block) => block.items).find((entry) => entry.exerciseId === exerciseId);
  const progress = await getExerciseProgress(chatId, plan.date, exerciseId, item?.sets);
  const setLines = progress.loggedSets.length
    ? progress.loggedSets.map((set) => {
        const weightPart = typeof set.weightKg === 'number' ? `, ${set.weightKg} кг` : '';
        return `• Подход ${set.setNumber}: ${set.value} ${unitLabels[set.unit]}${weightPart}`;
      })
    : ['• Пока без записанных подходов'];

  return [
    `Прогресс: ${exercise.title}`,
    `План: ${item?.sets ?? exercise.repsHint}`,
    `Статус: ${statusLabels[progress.status]}`,
    progress.difficulty ? `Оценка: ${difficultyLabels[progress.difficulty]}` : '',
    ...setLines
  ]
    .filter(Boolean)
    .concat(progress.loggedSets.length > 0 ? ['', 'После последнего подхода отметь, насколько тяжело прошло упражнение.'] : [])
    .join('\n');
}

export async function progressOverviewText(chatId: number, plan: DailyPlan): Promise<string> {
  const blockMap = getExerciseBlockMap(plan);
  const log = await ensureDailyLog(chatId, plan.date);
  const items = Object.keys(blockMap).map((exerciseId) => {
    const progress = log.progressByExercise[exerciseId];
    const marker =
      progress?.status === 'completed' ? '✅' : progress?.status === 'in_progress' ? '🟡' : progress?.status === 'skipped' ? '⏭' : '⚪';
    return `${marker} ${exercisesMap[exerciseId]?.title ?? exerciseId}`;
  });

  return ['Выбери упражнение для логирования.', ...items].join('\n');
}
