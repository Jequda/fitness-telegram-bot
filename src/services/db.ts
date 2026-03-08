import fs from 'node:fs';
import { Pool, PoolClient } from 'pg';
import { logInfo, logWarn } from './logger.js';
import { getRuntimePath } from '../utils/paths.js';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://fitness_bot:fitness_bot@localhost:5432/fitness_bot';

let pool: Pool | null = null;

function getPool() {
  pool ??= new Pool({ connectionString });
  return pool;
}

export async function initializeDb() {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      chat_id BIGINT PRIMARY KEY,
      timezone TEXT NOT NULL,
      carry_over_load INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      chat_id BIGINT PRIMARY KEY REFERENCES users(chat_id) ON DELETE CASCADE,
      is_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
      name TEXT NOT NULL DEFAULT '',
      sex TEXT NOT NULL DEFAULT '',
      age INTEGER,
      height_cm INTEGER,
      weight_kg DOUBLE PRECISION,
      goal TEXT NOT NULL DEFAULT '',
      experience_level TEXT NOT NULL DEFAULT '',
      workout_days_per_week INTEGER,
      workout_minutes_per_day INTEGER,
      has_daily_cardio BOOLEAN,
      injuries TEXT NOT NULL DEFAULT '',
      limitations TEXT NOT NULL DEFAULT '',
      activity_level TEXT NOT NULL DEFAULT '',
      average_sleep_hours DOUBLE PRECISION,
      timezone TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_equipment (
      chat_id BIGINT NOT NULL REFERENCES users(chat_id) ON DELETE CASCADE,
      equipment TEXT NOT NULL,
      PRIMARY KEY (chat_id, equipment)
    );

    CREATE TABLE IF NOT EXISTS user_cardio_types (
      chat_id BIGINT NOT NULL REFERENCES users(chat_id) ON DELETE CASCADE,
      cardio_type TEXT NOT NULL,
      PRIMARY KEY (chat_id, cardio_type)
    );

    CREATE TABLE IF NOT EXISTS user_ai_state (
      chat_id BIGINT PRIMARY KEY REFERENCES users(chat_id) ON DELETE CASCADE,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      model TEXT NOT NULL DEFAULT '',
      last_error TEXT
    );

    CREATE TABLE IF NOT EXISTS user_ai_history (
      id BIGSERIAL PRIMARY KEY,
      chat_id BIGINT NOT NULL REFERENCES users(chat_id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_ui_state (
      chat_id BIGINT PRIMARY KEY REFERENCES users(chat_id) ON DELETE CASCADE,
      onboarding_step TEXT NOT NULL DEFAULT 'name',
      progress_draft_date TEXT,
      progress_draft_exercise_id TEXT,
      progress_draft_pending_set_number INTEGER,
      progress_draft_pending_value INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_skip_dates (
      chat_id BIGINT NOT NULL REFERENCES users(chat_id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      skip_type TEXT NOT NULL,
      PRIMARY KEY (chat_id, date, skip_type)
    );

    CREATE TABLE IF NOT EXISTS daily_logs (
      chat_id BIGINT NOT NULL REFERENCES users(chat_id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      wellness_state TEXT,
      skipped_evening BOOLEAN NOT NULL DEFAULT FALSE,
      skipped_all BOOLEAN NOT NULL DEFAULT FALSE,
      PRIMARY KEY (chat_id, date)
    );

    CREATE TABLE IF NOT EXISTS daily_log_completed_blocks (
      chat_id BIGINT NOT NULL,
      date TEXT NOT NULL,
      block_type TEXT NOT NULL,
      PRIMARY KEY (chat_id, date, block_type),
      FOREIGN KEY (chat_id, date) REFERENCES daily_logs(chat_id, date) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exercise_progress (
      chat_id BIGINT NOT NULL,
      date TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      status TEXT NOT NULL,
      target_sets TEXT,
      difficulty TEXT,
      comment TEXT,
      last_updated_at TIMESTAMPTZ,
      PRIMARY KEY (chat_id, date, exercise_id),
      FOREIGN KEY (chat_id, date) REFERENCES daily_logs(chat_id, date) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exercise_set_logs (
      chat_id BIGINT NOT NULL,
      date TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      value DOUBLE PRECISION NOT NULL,
      unit TEXT NOT NULL,
      weight_kg DOUBLE PRECISION,
      logged_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (chat_id, date, exercise_id, set_number),
      FOREIGN KEY (chat_id, date, exercise_id) REFERENCES exercise_progress(chat_id, date, exercise_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS calendar_cache (
      year INTEGER PRIMARY KEY,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      data TEXT NOT NULL
    );

  `);
  logInfo('Database initialized', { connectionString: connectionString.replace(/:[^:@/]+@/, ':***@') });
}

export async function closeDb() {
  if (!pool) return;
  await pool.end();
  pool = null;
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function query<T = any>(sql: string, params: unknown[] = []) {
  return getPool().query<T>(sql, params);
}

export async function getStateRow(chatId: number) {
  const exists = await getPool().query(`SELECT to_regclass('public.user_states') AS table_name`);
  if (!exists.rows[0]?.table_name) return undefined;
  const result = await getPool().query('SELECT state FROM user_states WHERE chat_id = $1', [chatId]);
  return result.rows[0]?.state;
}

export async function upsertStateRow(chatId: number, state: unknown) {
  const exists = await getPool().query(`SELECT to_regclass('public.user_states') AS table_name`);
  if (!exists.rows[0]?.table_name) {
    await getPool().query(`
      CREATE TABLE user_states (
        chat_id BIGINT PRIMARY KEY,
        state JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }
  await getPool().query(
    `
      INSERT INTO user_states (chat_id, state)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (chat_id)
      DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()
    `,
    [chatId, JSON.stringify(state)]
  );
}

export async function listStateRows() {
  const exists = await getPool().query(`SELECT to_regclass('public.user_states') AS table_name`);
  if (!exists.rows[0]?.table_name) return [];
  const result = await getPool().query('SELECT chat_id, state FROM user_states ORDER BY chat_id');
  return result.rows as Array<{ chat_id: number; state: unknown }>;
}

export async function migrateLegacyStateIfNeeded() {
  const legacyPath = getRuntimePath('state.json');
  if (!fs.existsSync(legacyPath)) return;

  try {
    const raw = JSON.parse(fs.readFileSync(legacyPath, 'utf-8')) as { chatId?: number };
    if (!raw.chatId) return;
    const existing = await getStateRow(raw.chatId);
    if (existing) return;
    await upsertStateRow(raw.chatId, raw);
    logWarn('Legacy JSON state migrated to Postgres', { legacyPath, chatId: raw.chatId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown migration error';
    logWarn('Legacy JSON state migration skipped', { legacyPath, error: message });
  }
}
