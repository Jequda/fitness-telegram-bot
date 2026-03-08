export type DayType = 'workday' | 'friday' | 'weekend';
export type WellnessState =
  | 'normal'
  | 'tired'
  | 'sleepy'
  | 'sore'
  | 'getting_sick'
  | 'no_energy';

export type WorkoutBlockType = 'morning' | 'work' | 'evening' | 'weekend_main' | 'minimum';
export type ExerciseCategory =
  | 'mobility'
  | 'strength_upper'
  | 'strength_lower'
  | 'core'
  | 'cardio'
  | 'recovery';
export type EquipmentType =
  | 'bodyweight'
  | 'dumbbells'
  | 'pullup_bar'
  | 'dip_bars'
  | 'resistance_bands'
  | 'kettlebell'
  | 'bench'
  | 'stationary_bike'
  | 'treadmill'
  | 'jump_rope';
export type GoalType =
  | 'fat_loss'
  | 'muscle_gain'
  | 'strength'
  | 'general_fitness'
  | 'mobility'
  | 'posture'
  | 'endurance';
export type SexType = 'male' | 'female';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type OnboardingStep =
  | 'name'
  | 'sex'
  | 'age'
  | 'height'
  | 'weight'
  | 'goal'
  | 'experience'
  | 'equipment'
  | 'workout_days'
  | 'workout_minutes'
  | 'cardio'
  | 'limitations'
  | 'injuries'
  | 'activity'
  | 'sleep'
  | 'timezone'
  | 'completed';

export interface Exercise {
  id: string;
  title: string;
  category: ExerciseCategory;
  description: string;
  steps: string[];
  repsHint: string;
  logUnit: 'reps' | 'seconds' | 'cycles';
  logOptions: number[];
  equipment: EquipmentType[];
  difficulty: ExperienceLevel;
  muscleGroups: string[];
  weightOptionsKg?: number[];
  photoUrl?: string;
}

export interface WorkoutItem {
  exerciseId: string;
  sets: string;
  notes?: string;
}

export interface WorkoutBlock {
  type: WorkoutBlockType;
  title: string;
  summary: string;
  items: WorkoutItem[];
}

export interface DailyPlan {
  date: string;
  dayType: DayType;
  wellnessState: WellnessState;
  blocks: WorkoutBlock[];
  eveningSkipped: boolean;
  wholeDaySkipped: boolean;
}

export interface ExerciseSetLog {
  setNumber: number;
  value: number;
  unit: Exercise['logUnit'];
  weightKg?: number;
  loggedAt: string;
}

export interface ExerciseProgress {
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  targetSets?: string;
  loggedSets: ExerciseSetLog[];
  difficulty?: 'easy' | 'ok' | 'hard';
  comment?: string;
  lastUpdatedAt?: string;
}

export interface DailyLog {
  date: string;
  wellnessState?: WellnessState;
  completedBlocks: WorkoutBlockType[];
  skippedEvening: boolean;
  skippedAll: boolean;
  progressByExercise: Record<string, ExerciseProgress>;
}

export interface UserProfile {
  isOnboarded: boolean;
  name: string;
  sex: SexType | '';
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  goal: GoalType | '';
  experienceLevel: ExperienceLevel | '';
  equipment: EquipmentType[];
  workoutDaysPerWeek: number | null;
  workoutMinutesPerDay: number | null;
  hasDailyCardio: boolean | null;
  cardioTypes: string[];
  injuries: string;
  limitations: string;
  activityLevel: string;
  averageSleepHours: number | null;
  timezone: string;
}

export interface UserState {
  chatId: number;
  timezone: string;
  profile: UserProfile;
  dailyLogs: DailyLog[];
  skippedDates: string[];
  skipEveningDates: string[];
  carryOverLoad: number;
  ai: {
    enabled: boolean;
    model: string;
    history: Array<{
      role: 'user' | 'assistant';
      content: string;
      createdAt: string;
    }>;
    lastError?: string;
  };
  ui: {
    onboarding?: {
      step: OnboardingStep;
    };
    progressDraft?: {
      date: string;
      exerciseId: string;
      pendingSetNumber: number;
      pendingValue?: number;
    };
  };
}
