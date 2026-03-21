import { exercisesMap } from './exercises.js';
import { DayType, EquipmentType, ExperienceLevel, UserProfile, WellnessState, WorkoutBlock, WorkoutItem } from '../types/index.js';

type Candidate = WorkoutItem & {
  minLevel?: ExperienceLevel;
};

const levelRank: Record<ExperienceLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2
};

function resolvedLevel(profile: UserProfile): ExperienceLevel {
  return profile.experienceLevel || 'beginner';
}

function canUseLevel(profile: UserProfile, required?: ExperienceLevel) {
  if (!required) return true;
  return levelRank[resolvedLevel(profile)] >= levelRank[required];
}

function hasEquipment(profile: UserProfile, item: EquipmentType) {
  return profile.equipment.includes(item);
}

function pushIfAllowed(pool: Candidate[], profile: UserProfile, candidate: Candidate, requiredEquipment?: EquipmentType) {
  if (requiredEquipment && !hasEquipment(profile, requiredEquipment)) return;
  if (!canUseLevel(profile, candidate.minLevel)) return;
  pool.push(candidate);
}

function hashSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function makeRandom(seed: string) {
  let value = hashSeed(seed) || 1;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function pickRandom<T>(items: T[], count: number, seed: string): T[] {
  if (items.length <= count) return [...items];

  const random = makeRandom(seed);
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, count);
}

function pickOne<T>(items: T[], seed: string): T {
  return pickRandom(items, 1, seed)[0];
}

function uniqueItems(items: WorkoutItem[]): WorkoutItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.exerciseId)) return false;
    seen.add(item.exerciseId);
    return true;
  });
}

function upperWorkout(profile: UserProfile, seed: string): WorkoutItem[] {
  const pool: Candidate[] = [];

  if (hasEquipment(profile, 'pullup_bar')) {
    pushIfAllowed(pool, profile, { exerciseId: 'pullups', sets: '4 x 6-10', minLevel: 'intermediate' });
  }
  if (hasEquipment(profile, 'resistance_bands')) {
    pushIfAllowed(pool, profile, { exerciseId: 'band_row', sets: '4 x 12-20' });
    pushIfAllowed(pool, profile, { exerciseId: 'band_pull_apart', sets: '3 x 15-25' });
  }
  if (hasEquipment(profile, 'dip_bars')) {
    pushIfAllowed(pool, profile, { exerciseId: 'dips', sets: '4 x 8-12', minLevel: 'intermediate' });
  }
  if (hasEquipment(profile, 'dumbbells')) {
    pushIfAllowed(pool, profile, { exerciseId: 'db_floor_press', sets: '3 x 8-12' });
    pushIfAllowed(pool, profile, { exerciseId: 'db_row', sets: '4 x 10-12' });
    pushIfAllowed(pool, profile, { exerciseId: 'db_overhead_press', sets: '3 x 8-12', minLevel: 'intermediate' });
    pushIfAllowed(pool, profile, { exerciseId: 'db_biceps_curl', sets: '3 x 10-15' });
    pushIfAllowed(pool, profile, { exerciseId: 'db_triceps_extension', sets: '3 x 10-15' });
  }

  pushIfAllowed(pool, profile, { exerciseId: 'pushups', sets: '4 x 10-20' });
  pushIfAllowed(pool, profile, { exerciseId: 'incline_pushups', sets: '3 x 10-20' });
  pushIfAllowed(pool, profile, { exerciseId: 'pike_pushups', sets: '3 x 6-12', minLevel: 'intermediate' });

  const level = resolvedLevel(profile);
  const targetCount = level === 'beginner' ? 3 : level === 'intermediate' ? 4 : 5;
  const selected = pickRandom(pool, targetCount, `${seed}:upper`);

  if (!selected.some((item) => item.exerciseId === 'pushups' || item.exerciseId === 'db_floor_press')) {
    selected.unshift(hasEquipment(profile, 'dumbbells') ? { exerciseId: 'db_floor_press', sets: '3 x 8-12' } : { exerciseId: 'pushups', sets: '4 x 10-20' });
  }

  return uniqueItems(selected);
}

function lowerWorkout(profile: UserProfile, seed: string): WorkoutItem[] {
  const pool: Candidate[] = [];

  if (hasEquipment(profile, 'dumbbells')) {
    pushIfAllowed(pool, profile, { exerciseId: 'goblet_squat', sets: '4 x 10-12' });
    pushIfAllowed(pool, profile, { exerciseId: 'rdl', sets: '4 x 10-12' });
    pushIfAllowed(pool, profile, { exerciseId: 'db_reverse_lunge', sets: '3 x 8-10 на ногу', minLevel: 'intermediate' });
  }

  pushIfAllowed(pool, profile, { exerciseId: 'air_squats', sets: '3 x 15-20' });
  pushIfAllowed(pool, profile, { exerciseId: 'reverse_lunge', sets: '3 x 10-12 на ногу' });
  pushIfAllowed(pool, profile, { exerciseId: 'glute_bridge', sets: '3 x 12-20' });
  pushIfAllowed(pool, profile, { exerciseId: 'calf_raise', sets: '3 x 15-25' });

  const level = resolvedLevel(profile);
  const targetCount = level === 'beginner' ? 3 : 4;
  const selected = pickRandom(pool, targetCount, `${seed}:lower`);

  if (!selected.some((item) => item.exerciseId === 'calf_raise')) {
    selected.push({ exerciseId: 'calf_raise', sets: '3 x 15-25' });
  }

  return uniqueItems(selected);
}

function coreWorkout(profile: UserProfile, seed: string): WorkoutItem[] {
  const pool: Candidate[] = [
    { exerciseId: 'plank', sets: '3 x 20-60 сек' },
    { exerciseId: 'reverse_crunch', sets: '3 x 12-20' },
    { exerciseId: 'side_plank', sets: '2 x 20-40 сек' },
    { exerciseId: 'dead_bug', sets: '3 x 8-12 на сторону' },
    { exerciseId: 'bicycle_crunch', sets: '3 x 12-20 на сторону' },
    { exerciseId: 'bird_dog', sets: '3 x 8-12 на сторону' },
    { exerciseId: 'hollow_hold', sets: '3 x 15-40 сек', minLevel: 'intermediate' }
  ];

  if (hasEquipment(profile, 'pullup_bar')) {
    pushIfAllowed(pool, profile, { exerciseId: 'hanging_knee_raise', sets: '3 x 10-15', minLevel: 'intermediate' });
  }

  const level = resolvedLevel(profile);
  const targetCount = level === 'beginner' ? 3 : 4;
  const selected = pickRandom(pool, targetCount, `${seed}:core`);

  if (!selected.some((item) => item.exerciseId === 'plank' || item.exerciseId === 'hollow_hold')) {
    selected.unshift(level === 'beginner' ? { exerciseId: 'plank', sets: '3 x 20-60 сек' } : { exerciseId: 'hollow_hold', sets: '3 x 15-40 сек' });
  }

  return uniqueItems(selected);
}

function cardioAddOn(profile: UserProfile, seed: string): WorkoutItem[] {
  const pool: Candidate[] = [];
  const level = resolvedLevel(profile);

  if (profile.hasDailyCardio) {
    if (hasEquipment(profile, 'stationary_bike')) pool.push({ exerciseId: 'stationary_bike', sets: '15-25 минут' });
    if (hasEquipment(profile, 'jump_rope')) pool.push({ exerciseId: 'jump_rope', sets: level === 'beginner' ? '4 x 45-60 сек' : '5 x 60-90 сек' });
    pool.push({ exerciseId: 'walking', sets: '20-30 минут' });
    return [pickOne(pool, `${seed}:cardio:daily`)];
  }

  if (profile.goal === 'fat_loss' || profile.goal === 'endurance') {
    if (hasEquipment(profile, 'jump_rope')) {
      pool.push({
        exerciseId: 'jump_rope',
        sets: profile.goal === 'fat_loss' && profile.goalTargetWeeks && profile.goalTargetWeeks <= 8 ? '6 x 60-90 сек' : '5 x 60-90 сек'
      });
    }
    pool.push({
      exerciseId: 'mountain_climbers',
      sets:
        profile.goal === 'fat_loss' && profile.goalTargetWeeks && profile.goalTargetWeeks <= 8
          ? '4 x 30-45 сек'
          : level === 'beginner'
            ? '3 x 20-30 сек'
            : '3 x 30-40 сек',
      minLevel: 'intermediate'
    });
    pool.push({ exerciseId: 'walking', sets: '20-30 минут' });
    return [pickOne(pool.filter((item) => canUseLevel(profile, item.minLevel)), `${seed}:cardio:goal`)];
  }

  return [];
}

function workBlock(profile: UserProfile, seed: string): WorkoutBlock {
  const pool: WorkoutItem[] = [
    { exerciseId: 'thoracic_stretch', sets: '2 x 30-40 сек' },
    { exerciseId: 'neck_mobility', sets: '6-8 на сторону' },
    { exerciseId: 'scapular_retraction', sets: '2 x 12-15' },
    { exerciseId: 'air_squats', sets: '2 x 15-20' },
    { exerciseId: 'box_breathing', sets: '4-6 циклов' },
    { exerciseId: 'hip_mobility', sets: '6-8 на сторону' }
  ];

  const selected = pickRandom(pool, 4, `${seed}:work`);
  return {
    type: 'work',
    title: 'Блок на работе',
    summary: 'Короткая перезагрузка без перегруза. Состав слегка меняется по дням.',
    items: selected
  };
}

function minimumBlock(profile: UserProfile, seed: string): WorkoutBlock {
  const items = [{ exerciseId: 'minimum_complex', sets: '2-3 круга' }, ...cardioAddOn(profile, `${seed}:minimum`)];
  return {
    type: 'minimum',
    title: 'Минимум, но не ноль',
    summary: 'Когда сил мало, бот оставляет короткий, но живой минимум.',
    items
  };
}

function eveningStrength(dayType: DayType, profile: UserProfile, seed: string): WorkoutBlock {
  const upper = upperWorkout(profile, `${seed}:upper`).slice(0, dayType === 'friday' ? 2 : resolvedLevel(profile) === 'beginner' ? 3 : 4);
  const lower = lowerWorkout(profile, `${seed}:lower`).slice(0, resolvedLevel(profile) === 'beginner' ? 1 : 2);
  const core = coreWorkout(profile, `${seed}:core`).slice(0, dayType === 'friday' ? 2 : resolvedLevel(profile) === 'beginner' ? 2 : 3);
  const finisher = cardioAddOn(profile, `${seed}:finisher`).slice(0, dayType === 'friday' ? 0 : 1);

  return {
    type: 'evening',
    title: dayType === 'friday' ? 'Пятничная облегчённая тренировка' : 'Вечерняя домашняя тренировка',
    summary:
      dayType === 'friday'
        ? 'Нагрузка мягче, но упражнения всё равно меняются, чтобы не было однообразия.'
        : 'Упражнения подбираются по цели, оборудованию и уровню подготовки. Список обновляется по дням.',
    items: [...upper, ...lower, ...core, ...finisher]
  };
}

function weekendMain(profile: UserProfile, seed: string): WorkoutBlock {
  const upper = upperWorkout(profile, `${seed}:weekend:upper`).slice(0, 3);
  const lower = lowerWorkout(profile, `${seed}:weekend:lower`).slice(0, 3);
  const core = coreWorkout(profile, `${seed}:weekend:core`).slice(0, resolvedLevel(profile) === 'beginner' ? 2 : 3);
  const cardio = cardioAddOn(profile, `${seed}:weekend:cardio`).slice(0, 1);

  return {
    type: 'weekend_main',
    title: 'Основная тренировка выходного дня',
    summary: 'Более длинная тренировка. Наполнение меняется от дня к дню, но остаётся в рамках твоего уровня.',
    items: [...upper, ...lower, ...core, ...cardio]
  };
}

export function buildBlocks(dayType: DayType, wellness: WellnessState, profile: UserProfile, seed = 'default'): WorkoutBlock[] {
  if (wellness === 'getting_sick') {
    return [workBlock(profile, `${seed}:recovery`)];
  }

  if (wellness === 'no_energy' || wellness === 'sleepy') {
    return dayType === 'weekend'
      ? [minimumBlock(profile, `${seed}:weekend-minimum`)]
      : [workBlock(profile, `${seed}:work-light`), minimumBlock(profile, `${seed}:minimum-light`)];
  }

  if (wellness === 'tired' || wellness === 'sore') {
    return dayType === 'weekend'
      ? [minimumBlock(profile, `${seed}:weekend-tired`), workBlock(profile, `${seed}:weekend-work`)]
      : [workBlock(profile, `${seed}:work-tired`), minimumBlock(profile, `${seed}:minimum-tired`)];
  }

  if (dayType === 'weekend') {
    return [weekendMain(profile, `${seed}:weekend-main`)];
  }

  return [workBlock(profile, `${seed}:work-main`), eveningStrength(dayType, profile, `${seed}:evening-main`)];
}

export function supportsExerciseForProfile(profile: UserProfile, exerciseId: string) {
  const exercise = exercisesMap[exerciseId];
  if (!exercise) return false;
  return exercise.equipment.every((item) => item === 'bodyweight' || hasEquipment(profile, item));
}
