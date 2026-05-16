import { ActivityLevel, EquipmentType, GoalType, OnboardingStep, ProfileQuestionStep, SexType, UserState } from '../types/index.js';
import { goalLabel } from './storage.js';
import { resolveTimezoneFromInput } from '../utils/date.js';

const onboardingSteps: OnboardingStep[] = [
  'name',
  'sex',
  'age',
  'height',
  'weight',
  'goal',
  'goal_timeline',
  'experience',
  'equipment',
  'workout_days',
  'workout_minutes',
  'cardio',
  'limitations',
  'injuries',
  'activity',
  'sleep',
  'timezone',
  'completed'
];

export const profileQuestionSteps = onboardingSteps.filter((step): step is ProfileQuestionStep => step !== 'completed');

const experienceMap: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
  новичок: 'beginner',
  средний: 'intermediate',
  продвинутый: 'advanced'
};

const activityMap: Record<string, ActivityLevel> = {
  sedentary: 'sedentary',
  light: 'light',
  moderate: 'moderate',
  high: 'high',
  'офис': 'sedentary',
  'сидячая работа': 'sedentary',
  'мало двигаюсь': 'sedentary',
  'немного хожу': 'light',
  'лёгкая активность': 'light',
  'легкая активность': 'light',
  'много хожу': 'moderate',
  'на ногах': 'moderate',
  'активный день': 'moderate',
  'физическая работа': 'high',
  'тяжелая работа': 'high',
  'тяжёлая работа': 'high'
};

const equipmentMap: Record<string, EquipmentType> = {
  bodyweight: 'bodyweight',
  dumbbells: 'dumbbells',
  pullup_bar: 'pullup_bar',
  dip_bars: 'dip_bars',
  resistance_bands: 'resistance_bands',
  kettlebell: 'kettlebell',
  bench: 'bench',
  stationary_bike: 'stationary_bike',
  treadmill: 'treadmill',
  jump_rope: 'jump_rope',
  'свой вес': 'bodyweight',
  'вес тела': 'bodyweight',
  гантели: 'dumbbells',
  турник: 'pullup_bar',
  брусья: 'dip_bars',
  резинки: 'resistance_bands',
  резина: 'resistance_bands',
  гиря: 'kettlebell',
  скамья: 'bench',
  велотренажер: 'stationary_bike',
  велотренажёр: 'stationary_bike',
  дорожка: 'treadmill',
  скакалка: 'jump_rope'
};

export function getCurrentOnboardingStep(state: UserState): OnboardingStep {
  return state.ui.onboarding?.step ?? 'name';
}

export function advanceOnboarding(state: UserState) {
  const current = getCurrentOnboardingStep(state);
  const index = onboardingSteps.indexOf(current);
  const next = onboardingSteps[Math.min(index + 1, onboardingSteps.length - 1)];
  state.ui.onboarding = { step: next };
}

export function resetOnboarding(state: UserState) {
  state.profile.isOnboarded = false;
  state.ui.onboarding = { step: 'name' };
  state.ui.profileEdit = undefined;
}

export function applyGoal(state: UserState, goal: GoalType) {
  state.profile.goal = goal;
  state.ui.onboarding = { step: 'goal_timeline' };
}

export function applySex(state: UserState, sex: SexType) {
  state.profile.sex = sex;
  advanceOnboarding(state);
}

function parseIntegerInRange(input: string, min: number, max: number, errorCode: string) {
  if (!/^\d+$/.test(input)) {
    throw new Error(errorCode);
  }
  const value = Number(input);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(errorCode);
  }
  return value;
}

function parseNumberInRange(input: string, min: number, max: number, errorCode: string) {
  const normalized = input.replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(errorCode);
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(errorCode);
  }
  return value;
}

function parseActivityLevel(input: string): ActivityLevel {
  const normalized = input.trim().toLowerCase();
  const value = activityMap[normalized];
  if (!value) throw new Error('INVALID_ACTIVITY');
  return value;
}

function parseEquipment(input: string): EquipmentType[] {
  const parsed = input
    .split(',')
    .map((item) => equipmentMap[item.trim().toLowerCase()])
    .filter((item): item is EquipmentType => Boolean(item));

  return parsed.length ? [...new Set(parsed)] : ['bodyweight'];
}

function applyStepAnswer(state: UserState, step: ProfileQuestionStep, rawInput: string) {
  const input = rawInput.trim();
  const normalized = input.toLowerCase();

  switch (step) {
    case 'name':
      state.profile.name = input;
      break;
    case 'sex':
      state.profile.sex = normalized === 'женщина' ? 'female' : 'male';
      break;
    case 'age':
      state.profile.age = parseIntegerInRange(input, 12, 90, 'INVALID_AGE');
      break;
    case 'height':
      state.profile.heightCm = parseIntegerInRange(input, 120, 230, 'INVALID_HEIGHT');
      break;
    case 'weight':
      state.profile.weightKg = parseNumberInRange(input, 35, 300, 'INVALID_WEIGHT');
      break;
    case 'goal':
      state.profile.goal = input as GoalType;
      break;
    case 'goal_timeline':
      state.profile.goalTargetWeeks = parseIntegerInRange(input, 2, 104, 'INVALID_GOAL_TIMELINE');
      break;
    case 'experience':
      state.profile.experienceLevel = experienceMap[normalized] ?? 'advanced';
      break;
    case 'equipment':
      state.profile.equipment = parseEquipment(input);
      break;
    case 'workout_days':
      state.profile.workoutDaysPerWeek = parseIntegerInRange(input, 1, 7, 'INVALID_WORKOUT_DAYS');
      break;
    case 'workout_minutes':
      state.profile.workoutMinutesPerDay = parseIntegerInRange(input, 10, 240, 'INVALID_WORKOUT_MINUTES');
      break;
    case 'cardio':
      if (normalized === 'нет') {
        state.profile.hasDailyCardio = false;
        state.profile.cardioTypes = [];
      } else {
        const cleaned = normalized.startsWith('да:') ? normalized.slice(3) : normalized.replace(/^да\s+/, '');
        state.profile.hasDailyCardio = true;
        state.profile.cardioTypes = cleaned
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
      break;
    case 'limitations':
      state.profile.limitations = normalized === 'нет' ? '' : input;
      break;
    case 'injuries':
      state.profile.injuries = normalized === 'нет' ? '' : input;
      break;
    case 'activity':
      state.profile.activityLevel = parseActivityLevel(input);
      break;
    case 'sleep':
      state.profile.averageSleepHours = parseNumberInRange(input, 3, 16, 'INVALID_SLEEP');
      break;
    case 'timezone': {
      const timezone = resolveTimezoneFromInput(input);
      if (!timezone) throw new Error('CITY_TIMEZONE_NOT_FOUND');
      state.profile.timezone = timezone;
      state.timezone = timezone;
      break;
    }
    default:
      break;
  }
}

export function applyOnboardingAnswer(state: UserState, rawInput: string) {
  const step = getCurrentOnboardingStep(state);
  if (step === 'completed') return;

  applyStepAnswer(state, step, rawInput);

  advanceOnboarding(state);
  if (getCurrentOnboardingStep(state) === 'completed') {
    state.profile.isOnboarded = true;
  }
}

export function startProfileEdit(state: UserState, step: ProfileQuestionStep) {
  state.ui.profileEdit = { step };
}

export function clearProfileEdit(state: UserState) {
  state.ui.profileEdit = undefined;
}

export function applyProfileAnswer(state: UserState, step: ProfileQuestionStep, rawInput: string) {
  applyStepAnswer(state, step, rawInput);
  state.profile.isOnboarded = true;
  clearProfileEdit(state);
}

function sexLabel(sex: UserState['profile']['sex']) {
  if (sex === 'male') return 'мужчина';
  if (sex === 'female') return 'женщина';
  return 'не указан';
}

function experienceLabel(level: UserState['profile']['experienceLevel']) {
  if (level === 'beginner') return 'новичок';
  if (level === 'intermediate') return 'средний';
  if (level === 'advanced') return 'продвинутый';
  return 'не указан';
}

export function activityLabel(level: UserState['profile']['activityLevel']) {
  if (level === 'sedentary') return 'сидячая работа / офис';
  if (level === 'light') return 'немного хожу';
  if (level === 'moderate') return 'много хожу / на ногах';
  if (level === 'high') return 'физическая работа';
  return 'не указана';
}

const equipmentLabels: Record<EquipmentType, string> = {
  bodyweight: 'свой вес',
  dumbbells: 'гантели',
  pullup_bar: 'турник',
  dip_bars: 'брусья',
  resistance_bands: 'резинки',
  kettlebell: 'гиря',
  bench: 'скамья',
  stationary_bike: 'велотренажер',
  treadmill: 'беговая дорожка',
  jump_rope: 'скакалка'
};

export function profileSummary(state: UserState) {
  const profile = state.profile;
  return [
    'Анкета пользователя',
    `Имя: ${profile.name || 'не указано'}`,
    `Пол: ${sexLabel(profile.sex)}`,
    `Цель: ${goalLabel(profile.goal)}`,
    `Срок цели: ${profile.goalTargetWeeks ? `${profile.goalTargetWeeks} нед.` : 'не указан'}`,
    `Возраст: ${profile.age ?? 'не указан'}`,
    `Рост: ${profile.heightCm ?? 'не указан'} см`,
    `Вес: ${profile.weightKg ?? 'не указан'} кг`,
    `Опыт: ${experienceLabel(profile.experienceLevel)}`,
    `Оборудование: ${profile.equipment.map((item) => equipmentLabels[item]).join(', ')}`,
    `Тренировок в неделю: ${profile.workoutDaysPerWeek ?? 'не указано'}`,
    `Минут в день: ${profile.workoutMinutesPerDay ?? 'не указано'}`,
    `Кардио: ${profile.hasDailyCardio ? profile.cardioTypes.join(', ') || 'есть' : 'нет'}`,
    `Ограничения: ${profile.limitations || 'нет'}`,
    `Травмы: ${profile.injuries || 'нет'}`,
    `Активность: ${activityLabel(profile.activityLevel)}`,
    `Сон: ${profile.averageSleepHours ?? 'не указан'} ч`,
    `Часовой пояс: ${profile.timezone}`
  ].join('\n');
}
