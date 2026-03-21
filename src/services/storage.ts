import { PoolClient } from 'pg';
import { DailyLog, EquipmentType, ExerciseProgress, ExerciseSetLog, GoalType, UserProfile, UserState } from '../types/index.js';
import { getStateRow, listStateRows, migrateLegacyStateIfNeeded, query, withTransaction } from './db.js';
import { logInfo, logWarn } from './logger.js';
import { normalizeTimezone } from '../utils/date.js';

function buildDefaultProfile(): UserProfile {
  return {
    isOnboarded: false,
    name: '',
    sex: '',
    age: null,
    heightCm: null,
    weightKg: null,
    goal: '',
    goalTargetWeeks: null,
    experienceLevel: '',
    equipment: ['bodyweight'],
    workoutDaysPerWeek: null,
    workoutMinutesPerDay: null,
    hasDailyCardio: null,
    cardioTypes: [],
    injuries: '',
    limitations: '',
    activityLevel: '',
    averageSleepHours: null,
    timezone: process.env.TIMEZONE || 'Europe/Moscow'
  };
}

function normalizeState(state: Partial<UserState>, chatId: number): UserState {
  const profile = state.profile ?? buildDefaultProfile();
  const timezone = normalizeTimezone(state.timezone || profile.timezone || process.env.TIMEZONE || 'Europe/Moscow');

  return {
    chatId,
    timezone,
    notificationsEnabled: state.notificationsEnabled ?? true,
    profile: {
      ...buildDefaultProfile(),
      ...profile,
      timezone,
      equipment: (profile.equipment?.length ? profile.equipment : ['bodyweight']) as EquipmentType[],
      cardioTypes: profile.cardioTypes ?? []
    },
    dailyLogs: (state.dailyLogs ?? []).map((log) => ({
      ...log,
      completedBlocks: log.completedBlocks ?? [],
      skippedEvening: log.skippedEvening ?? false,
      skippedAll: log.skippedAll ?? false,
      progressByExercise: Object.fromEntries(
        Object.entries(log.progressByExercise ?? {}).map(([exerciseId, progress]) => [
          exerciseId,
          {
            status: progress.status ?? 'not_started',
            targetSets: progress.targetSets,
            loggedSets: progress.loggedSets ?? [],
            difficulty: progress.difficulty,
            comment: progress.comment,
            lastUpdatedAt: progress.lastUpdatedAt
          }
        ])
      )
    })),
    skippedDates: state.skippedDates ?? [],
    skipEveningDates: state.skipEveningDates ?? [],
    carryOverLoad: state.carryOverLoad ?? 0,
    ai: {
      enabled: state.ai?.enabled ?? false,
      model: state.ai?.model || process.env.OPENAI_MODEL || 'gpt-5-mini',
      history: (state.ai?.history ?? []).slice(-20),
      lastError: state.ai?.lastError
    },
    ui: {
      onboarding: state.ui?.onboarding ?? { step: 'name' },
      profileEdit: state.ui?.profileEdit,
      progressDraft: state.ui?.progressDraft
    }
  };
}

function mapProgressRows(
  progressRows: Array<{
    date: string;
    exercise_id: string;
    status: string;
    target_sets: string | null;
    difficulty: string | null;
    comment: string | null;
    last_updated_at: Date | null;
  }>,
  setRows: Array<{
    date: string;
    exercise_id: string;
    set_number: number;
    value: number;
    unit: ExerciseSetLog['unit'];
    weight_kg: number | null;
    logged_at: Date;
  }>
) {
  const setsByKey = new Map<string, ExerciseSetLog[]>();
  for (const row of setRows) {
    const key = `${row.date}:${row.exercise_id}`;
    const list = setsByKey.get(key) ?? [];
    list.push({
      setNumber: row.set_number,
      value: row.value,
      unit: row.unit,
      weightKg: row.weight_kg ?? undefined,
      loggedAt: row.logged_at.toISOString()
    });
    setsByKey.set(key, list);
  }

  const progressByDate = new Map<string, Record<string, ExerciseProgress>>();
  for (const row of progressRows) {
    const dateMap = progressByDate.get(row.date) ?? {};
    dateMap[row.exercise_id] = {
      status: row.status as ExerciseProgress['status'],
      targetSets: row.target_sets ?? undefined,
      loggedSets: setsByKey.get(`${row.date}:${row.exercise_id}`) ?? [],
      difficulty: (row.difficulty as ExerciseProgress['difficulty']) ?? undefined,
      comment: row.comment ?? undefined,
      lastUpdatedAt: row.last_updated_at?.toISOString()
    };
    progressByDate.set(row.date, dateMap);
  }

  return progressByDate;
}

async function seedNormalizedState(client: PoolClient, state: UserState) {
  await persistState(client, state);
}

async function migrateLegacyJsonbRows() {
  const rows = await listStateRows();
  if (!rows.length) return;

  for (const row of rows) {
    const state = normalizeState(row.state as Partial<UserState>, Number(row.chat_id));
    const userExists = await query<{ exists: boolean }>('SELECT TRUE as exists FROM users WHERE chat_id = $1', [state.chatId]);
    if (userExists.rowCount) continue;
    await withTransaction(async (client) => {
      await seedNormalizedState(client, state);
    });
    logWarn('Legacy JSONB row migrated to normalized tables', { chatId: state.chatId });
  }
}

export async function initializeState() {
  await migrateLegacyStateIfNeeded();
  await migrateLegacyJsonbRows();
  return 'postgresql';
}

async function persistState(client: PoolClient, state: UserState) {
  const normalized = normalizeState(state, state.chatId);

  await client.query(
    `
      INSERT INTO users (chat_id, timezone, notifications_enabled, carry_over_load)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (chat_id)
      DO UPDATE SET
        timezone = EXCLUDED.timezone,
        notifications_enabled = EXCLUDED.notifications_enabled,
        carry_over_load = EXCLUDED.carry_over_load,
        updated_at = NOW()
    `,
    [normalized.chatId, normalized.timezone, normalized.notificationsEnabled, normalized.carryOverLoad]
  );

  await client.query(
    `
      INSERT INTO user_profiles (
        chat_id, is_onboarded, name, sex, age, height_cm, weight_kg, goal, experience_level,
        goal_target_weeks, workout_days_per_week, workout_minutes_per_day, has_daily_cardio, injuries, limitations,
        activity_level, average_sleep_hours, timezone
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      ON CONFLICT (chat_id)
      DO UPDATE SET
        is_onboarded = EXCLUDED.is_onboarded,
        name = EXCLUDED.name,
        sex = EXCLUDED.sex,
        age = EXCLUDED.age,
        height_cm = EXCLUDED.height_cm,
        weight_kg = EXCLUDED.weight_kg,
        goal = EXCLUDED.goal,
        goal_target_weeks = EXCLUDED.goal_target_weeks,
        experience_level = EXCLUDED.experience_level,
        workout_days_per_week = EXCLUDED.workout_days_per_week,
        workout_minutes_per_day = EXCLUDED.workout_minutes_per_day,
        has_daily_cardio = EXCLUDED.has_daily_cardio,
        injuries = EXCLUDED.injuries,
        limitations = EXCLUDED.limitations,
        activity_level = EXCLUDED.activity_level,
        average_sleep_hours = EXCLUDED.average_sleep_hours,
        timezone = EXCLUDED.timezone
    `,
    [
      normalized.chatId,
      normalized.profile.isOnboarded,
      normalized.profile.name,
      normalized.profile.sex,
      normalized.profile.age,
      normalized.profile.heightCm,
      normalized.profile.weightKg,
      normalized.profile.goal,
      normalized.profile.experienceLevel,
      normalized.profile.goalTargetWeeks,
      normalized.profile.workoutDaysPerWeek,
      normalized.profile.workoutMinutesPerDay,
      normalized.profile.hasDailyCardio,
      normalized.profile.injuries,
      normalized.profile.limitations,
      normalized.profile.activityLevel,
      normalized.profile.averageSleepHours,
      normalized.profile.timezone
    ]
  );

  await client.query('DELETE FROM user_equipment WHERE chat_id = $1', [normalized.chatId]);
  for (const equipment of normalized.profile.equipment) {
    await client.query('INSERT INTO user_equipment (chat_id, equipment) VALUES ($1, $2)', [normalized.chatId, equipment]);
  }

  await client.query('DELETE FROM user_cardio_types WHERE chat_id = $1', [normalized.chatId]);
  for (const cardioType of normalized.profile.cardioTypes) {
    await client.query('INSERT INTO user_cardio_types (chat_id, cardio_type) VALUES ($1, $2)', [normalized.chatId, cardioType]);
  }

  await client.query(
    `
      INSERT INTO user_ai_state (chat_id, enabled, model, last_error)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (chat_id)
      DO UPDATE SET enabled = EXCLUDED.enabled, model = EXCLUDED.model, last_error = EXCLUDED.last_error
    `,
    [normalized.chatId, normalized.ai.enabled, normalized.ai.model, normalized.ai.lastError ?? null]
  );

  await client.query('DELETE FROM user_ai_history WHERE chat_id = $1', [normalized.chatId]);
  for (const item of normalized.ai.history) {
    await client.query(
      'INSERT INTO user_ai_history (chat_id, role, content, created_at) VALUES ($1, $2, $3, $4)',
      [normalized.chatId, item.role, item.content, item.createdAt]
    );
  }

  await client.query(
    `
      INSERT INTO user_ui_state (
        chat_id, onboarding_step, profile_edit_step, progress_draft_date, progress_draft_exercise_id,
        progress_draft_pending_set_number, progress_draft_pending_value
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (chat_id)
      DO UPDATE SET
        onboarding_step = EXCLUDED.onboarding_step,
        profile_edit_step = EXCLUDED.profile_edit_step,
        progress_draft_date = EXCLUDED.progress_draft_date,
        progress_draft_exercise_id = EXCLUDED.progress_draft_exercise_id,
        progress_draft_pending_set_number = EXCLUDED.progress_draft_pending_set_number,
        progress_draft_pending_value = EXCLUDED.progress_draft_pending_value
    `,
    [
      normalized.chatId,
      normalized.ui.onboarding?.step ?? 'name',
      normalized.ui.profileEdit?.step ?? null,
      normalized.ui.progressDraft?.date ?? null,
      normalized.ui.progressDraft?.exerciseId ?? null,
      normalized.ui.progressDraft?.pendingSetNumber ?? null,
      normalized.ui.progressDraft?.pendingValue ?? null
    ]
  );

  await client.query('DELETE FROM user_skip_dates WHERE chat_id = $1', [normalized.chatId]);
  for (const date of normalized.skippedDates) {
    await client.query('INSERT INTO user_skip_dates (chat_id, date, skip_type) VALUES ($1, $2, $3)', [normalized.chatId, date, 'all']);
  }
  for (const date of normalized.skipEveningDates) {
    await client.query('INSERT INTO user_skip_dates (chat_id, date, skip_type) VALUES ($1, $2, $3)', [normalized.chatId, date, 'evening']);
  }

  await client.query('DELETE FROM exercise_set_logs WHERE chat_id = $1', [normalized.chatId]);
  await client.query('DELETE FROM exercise_progress WHERE chat_id = $1', [normalized.chatId]);
  await client.query('DELETE FROM daily_log_completed_blocks WHERE chat_id = $1', [normalized.chatId]);
  await client.query('DELETE FROM daily_logs WHERE chat_id = $1', [normalized.chatId]);

  for (const log of normalized.dailyLogs) {
    await client.query(
      'INSERT INTO daily_logs (chat_id, date, wellness_state, skipped_evening, skipped_all) VALUES ($1, $2, $3, $4, $5)',
      [normalized.chatId, log.date, log.wellnessState ?? null, log.skippedEvening, log.skippedAll]
    );

    for (const blockType of log.completedBlocks) {
      await client.query(
        'INSERT INTO daily_log_completed_blocks (chat_id, date, block_type) VALUES ($1, $2, $3)',
        [normalized.chatId, log.date, blockType]
      );
    }

    for (const [exerciseId, progress] of Object.entries(log.progressByExercise)) {
      await client.query(
        `
          INSERT INTO exercise_progress (chat_id, date, exercise_id, status, target_sets, difficulty, comment, last_updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          normalized.chatId,
          log.date,
          exerciseId,
          progress.status,
          progress.targetSets ?? null,
          progress.difficulty ?? null,
          progress.comment ?? null,
          progress.lastUpdatedAt ?? null
        ]
      );

      for (const setLog of progress.loggedSets) {
        await client.query(
          `
            INSERT INTO exercise_set_logs (chat_id, date, exercise_id, set_number, value, unit, weight_kg, logged_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            normalized.chatId,
            log.date,
            exerciseId,
            setLog.setNumber,
            setLog.value,
            setLog.unit,
            setLog.weightKg ?? null,
            setLog.loggedAt
          ]
        );
      }
    }
  }
}

export async function readState(chatId: number): Promise<UserState> {
  const userResult = await query<{ chat_id: string; timezone: string; notifications_enabled: boolean; carry_over_load: number }>(
    'SELECT chat_id, timezone, notifications_enabled, carry_over_load FROM users WHERE chat_id = $1',
    [chatId]
  );

  if (!userResult.rowCount) {
    const state = normalizeState({}, chatId);
    await writeState(state);
    logInfo('Default user state created in normalized database', { chatId });
    return state;
  }

  const [
    profileResult,
    equipmentResult,
    cardioResult,
    aiStateResult,
    aiHistoryResult,
    uiStateResult,
    skipDatesResult,
    dailyLogsResult,
    completedBlocksResult,
    progressResult,
    setLogsResult
  ] = await Promise.all([
    query<any>('SELECT * FROM user_profiles WHERE chat_id = $1', [chatId]),
    query<{ equipment: EquipmentType }>('SELECT equipment FROM user_equipment WHERE chat_id = $1 ORDER BY equipment', [chatId]),
    query<{ cardio_type: string }>('SELECT cardio_type FROM user_cardio_types WHERE chat_id = $1 ORDER BY cardio_type', [chatId]),
    query<any>('SELECT * FROM user_ai_state WHERE chat_id = $1', [chatId]),
    query<any>('SELECT role, content, created_at FROM user_ai_history WHERE chat_id = $1 ORDER BY created_at DESC LIMIT 20', [chatId]),
    query<any>('SELECT * FROM user_ui_state WHERE chat_id = $1', [chatId]),
    query<{ date: string; skip_type: string }>('SELECT date, skip_type FROM user_skip_dates WHERE chat_id = $1 ORDER BY date', [chatId]),
    query<any>('SELECT * FROM daily_logs WHERE chat_id = $1 ORDER BY date', [chatId]),
    query<{ date: string; block_type: any }>('SELECT date, block_type FROM daily_log_completed_blocks WHERE chat_id = $1 ORDER BY date', [chatId]),
    query<any>('SELECT * FROM exercise_progress WHERE chat_id = $1 ORDER BY date, exercise_id', [chatId]),
    query<any>('SELECT * FROM exercise_set_logs WHERE chat_id = $1 ORDER BY date, exercise_id, set_number', [chatId])
  ]);

  const user = userResult.rows[0];
  const profileRow = profileResult.rows[0];
  const aiState = aiStateResult.rows[0];
  const uiState = uiStateResult.rows[0];
  const completedByDate = new Map<string, any[]>();
  for (const row of completedBlocksResult.rows) {
    const list = completedByDate.get(row.date) ?? [];
    list.push(row.block_type);
    completedByDate.set(row.date, list);
  }

  const progressByDate = mapProgressRows(progressResult.rows, setLogsResult.rows);

  const state = normalizeState(
    {
      chatId,
      timezone: user.timezone,
      notificationsEnabled: user.notifications_enabled ?? true,
      carryOverLoad: user.carry_over_load,
      profile: {
        isOnboarded: profileRow?.is_onboarded ?? false,
        name: profileRow?.name ?? '',
        sex: profileRow?.sex ?? '',
        age: profileRow?.age ?? null,
        heightCm: profileRow?.height_cm ?? null,
        weightKg: profileRow?.weight_kg ?? null,
        goal: profileRow?.goal ?? '',
        goalTargetWeeks: profileRow?.goal_target_weeks ?? null,
        experienceLevel: profileRow?.experience_level ?? '',
        equipment: equipmentResult.rows.map((row) => row.equipment),
        workoutDaysPerWeek: profileRow?.workout_days_per_week ?? null,
        workoutMinutesPerDay: profileRow?.workout_minutes_per_day ?? null,
        hasDailyCardio: profileRow?.has_daily_cardio ?? null,
        cardioTypes: cardioResult.rows.map((row) => row.cardio_type),
        injuries: profileRow?.injuries ?? '',
        limitations: profileRow?.limitations ?? '',
        activityLevel: profileRow?.activity_level ?? '',
        averageSleepHours: profileRow?.average_sleep_hours ?? null,
        timezone: profileRow?.timezone ?? user.timezone
      },
      dailyLogs: dailyLogsResult.rows.map((row) => ({
        date: row.date,
        wellnessState: row.wellness_state ?? undefined,
        completedBlocks: completedByDate.get(row.date) ?? [],
        skippedEvening: row.skipped_evening,
        skippedAll: row.skipped_all,
        progressByExercise: progressByDate.get(row.date) ?? {}
      })),
      skippedDates: skipDatesResult.rows.filter((row) => row.skip_type === 'all').map((row) => row.date),
      skipEveningDates: skipDatesResult.rows.filter((row) => row.skip_type === 'evening').map((row) => row.date),
      ai: {
        enabled: aiState?.enabled ?? false,
        model: aiState?.model || process.env.OPENAI_MODEL || 'gpt-5-mini',
        lastError: aiState?.last_error ?? undefined,
        history: aiHistoryResult.rows
          .map((row) => ({
            role: row.role,
            content: row.content,
            createdAt: row.created_at.toISOString()
          }))
          .reverse()
      },
      ui: {
        onboarding: { step: uiState?.onboarding_step ?? 'name' },
        profileEdit: uiState?.profile_edit_step ? { step: uiState.profile_edit_step } : undefined,
        progressDraft:
          uiState?.progress_draft_exercise_id && uiState?.progress_draft_pending_set_number
            ? {
                date: uiState.progress_draft_date,
                exerciseId: uiState.progress_draft_exercise_id,
                pendingSetNumber: uiState.progress_draft_pending_set_number,
                pendingValue: uiState.progress_draft_pending_value ?? undefined
              }
            : undefined
      }
    },
    chatId
  );

  return state;
}

export async function writeState(state: UserState) {
  const normalized = normalizeState(state, state.chatId);
  await withTransaction(async (client) => {
    await persistState(client, normalized);
  });
  logInfo('User state written to normalized database', {
    chatId: normalized.chatId,
    dailyLogs: normalized.dailyLogs.length,
    onboarded: normalized.profile.isOnboarded,
    notificationsEnabled: normalized.notificationsEnabled
  });
}

export async function upsertLog(chatId: number, log: DailyLog) {
  const state = await readState(chatId);
  const idx = state.dailyLogs.findIndex((item) => item.date === log.date);
  if (idx >= 0) state.dailyLogs[idx] = { ...state.dailyLogs[idx], ...log };
  else state.dailyLogs.push(log);
  await writeState(state);
  logInfo('Daily log upserted in normalized database', {
    chatId,
    date: log.date,
    existed: idx >= 0,
    progressEntries: Object.keys(log.progressByExercise ?? {}).length
  });
}

export async function listStates(): Promise<UserState[]> {
  const result = await query<{ chat_id: string }>('SELECT chat_id FROM users ORDER BY chat_id');
  return Promise.all(result.rows.map((row) => readState(Number(row.chat_id))));
}

export function goalLabel(goal: GoalType | '') {
  const labels: Record<GoalType, string> = {
    fat_loss: 'снижение жира',
    muscle_gain: 'набор мышц',
    strength: 'сила',
    general_fitness: 'общая форма',
    mobility: 'мобильность',
    posture: 'осанка',
    endurance: 'выносливость'
  };

  return goal ? labels[goal] : 'не задана';
}
