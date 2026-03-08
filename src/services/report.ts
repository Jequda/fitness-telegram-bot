import { readState } from './storage.js';
import { exercisesMap } from '../data/exercises.js';

export async function weeklyReport(chatId: number): Promise<string> {
  const state = await readState(chatId);
  const recent = [...state.dailyLogs].slice(-7);
  const completed = recent.reduce((acc, item) => acc + item.completedBlocks.length, 0);
  const skipped = recent.filter((item) => item.skippedAll || item.skippedEvening).length;
  const growthSignals = recent
    .flatMap((item) => Object.entries(item.progressByExercise))
    .filter(([, value]) => value.difficulty === 'ok' || value.difficulty === 'easy').length;
  const loggedSets = recent.reduce(
    (acc, item) => acc + Object.values(item.progressByExercise).reduce((sum, progress) => sum + progress.loggedSets.length, 0),
    0
  );
  const completedExercises = recent.reduce(
    (acc, item) => acc + Object.values(item.progressByExercise).filter((progress) => progress.status === 'completed').length,
    0
  );
  const topExercise = Object.entries(
    recent.reduce<Record<string, number>>((acc, item) => {
      Object.entries(item.progressByExercise).forEach(([exerciseId, progress]) => {
        acc[exerciseId] = (acc[exerciseId] ?? 0) + progress.loggedSets.length;
      });
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1])[0];

  return [
    '📊 Недельный отчёт',
    `Сделано блоков: ${completed}`,
    `Завершено упражнений: ${completedExercises}`,
    `Записано подходов: ${loggedSets}`,
    `Пропусков / снятых блоков: ${skipped}`,
    `Сигналов роста по упражнениям: ${growthSignals}`,
    topExercise ? `Больше всего работы: ${exercisesMap[topExercise[0]]?.title ?? topExercise[0]} (${topExercise[1]} подходов)` : 'Топ-упражнение недели пока не определилось.',
    state.carryOverLoad > 0 ? `На следующую неделю переносится объём: ${state.carryOverLoad}` : 'Переносов на следующую неделю нет.'
  ].join('\n');
}
