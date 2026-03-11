import { EquipmentType, GoalType, OnboardingStep, ProfileQuestionStep, SexType, UserState } from '../types/index.js';
import { goalLabel } from './storage.js';
import { normalizeTimezone, resolveTimezoneFromInput } from '../utils/date.js';

const onboardingSteps: OnboardingStep[] = [
  'name',
  'sex',
  'age',
  'height',
  'weight',
  'goal',
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
  advanceOnboarding(state);
}

export function applySex(state: UserState, sex: SexType) {
  state.profile.sex = sex;
  advanceOnboarding(state);
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
      state.profile.age = Number(input);
      break;
    case 'height':
      state.profile.heightCm = Number(input);
      break;
    case 'weight':
      state.profile.weightKg = Number(input);
      break;
    case 'goal':
      state.profile.goal = input as GoalType;
      break;
    case 'experience':
      state.profile.experienceLevel = experienceMap[normalized] ?? 'advanced';
      break;
    case 'equipment':
      state.profile.equipment = parseEquipment(input);
      break;
    case 'workout_days':
      state.profile.workoutDaysPerWeek = Number(input);
      break;
    case 'workout_minutes':
      state.profile.workoutMinutesPerDay = Number(input);
      break;
    case 'cardio': {
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
    }
    case 'limitations':
      state.profile.limitations = normalized === 'нет' ? '' : input;
      break;
    case 'injuries':
      state.profile.injuries = normalized === 'нет' ? '' : input;
      break;
    case 'activity':
      state.profile.activityLevel = input;
      break;
    case 'sleep':
      state.profile.averageSleepHours = Number(input);
      break;
    case 'timezone':
      {
        const timezone = resolveTimezoneFromInput(input);
        if (!timezone) {
          throw new Error('CITY_TIMEZONE_NOT_FOUND');
        }
        state.profile.timezone = timezone;
        state.timezone = timezone;
      }
      break;
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
    `Активность: ${profile.activityLevel || 'не указана'}`,
    `Сон: ${profile.averageSleepHours ?? 'не указан'} ч`,
    `Часовой пояс: ${profile.timezone}`
  ].join('\n');
}
