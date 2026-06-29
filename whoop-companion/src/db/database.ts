/**
 * Offline-first local storage (expo-sqlite). Everything lives on the device —
 * no cloud, no account. Mirrors VOLYUME's "local DB is the source of truth"
 * architecture.
 *
 * Tables:
 *   hr_samples     per-notification live HR + R-R (the raw stream we derive from)
 *   daily_metrics  one row per day: recovery / sleep / strain / steps / HRV / RHR
 *   cardio         logged or auto-detected activities with per-session strain
 *   journal        lightweight daily behaviour entries
 *   raw_frames     captured proprietary fd4b frames (for offline decoding)
 *   kv             profile + settings
 */

import * as SQLite from 'expo-sqlite';

export type HrSampleRow = { ts: number; bpm: number; rr: number[] };
export type DailyMetricRow = {
  day: string; // YYYY-MM-DD (local)
  recovery: number | null;
  rmssd: number | null;
  rhr: number | null;
  resp: number | null; // respiratory rate (brpm), overnight
  sleepMin: number | null;
  sleepPerf: number | null;
  strain: number | null;
  steps: number | null;
  // Per-night sleep window + stage minutes (for regularity / timing trends).
  sleepStart: number | null;
  sleepEnd: number | null;
  deepMin: number | null;
  remMin: number | null;
  lightMin: number | null;
  awakeMin: number | null;
  updatedAt: number;
};
export type CardioRow = {
  id: string;
  startTs: number;
  endTs: number;
  activity: string;
  avgHr: number | null;
  trimp: number | null;
  strain: number | null;
  kcal: number | null;
  source: string; // 'manual' | 'auto'
  notes: string | null;
};
export type JournalRow = {
  id: string;
  day: string;
  behaviour: string;
  value: string;
  createdAt: number;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('whoop-companion.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS hr_samples (
          ts INTEGER PRIMARY KEY,
          bpm INTEGER NOT NULL,
          rr TEXT
        );
        CREATE TABLE IF NOT EXISTS daily_metrics (
          day TEXT PRIMARY KEY,
          recovery INTEGER, rmssd REAL, rhr INTEGER, resp REAL,
          sleep_min INTEGER, sleep_perf REAL, strain REAL, steps INTEGER,
          sleep_start INTEGER, sleep_end INTEGER,
          deep_min INTEGER, rem_min INTEGER, light_min INTEGER, awake_min INTEGER,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS cardio (
          id TEXT PRIMARY KEY,
          start_ts INTEGER NOT NULL, end_ts INTEGER NOT NULL,
          activity TEXT NOT NULL, avg_hr INTEGER, trimp REAL, strain REAL,
          kcal INTEGER, source TEXT NOT NULL, notes TEXT
        );
        CREATE TABLE IF NOT EXISTS journal (
          id TEXT PRIMARY KEY, day TEXT NOT NULL, behaviour TEXT NOT NULL,
          value TEXT NOT NULL, created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS raw_frames (
          ts INTEGER NOT NULL, source TEXT NOT NULL, hex TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS idx_cardio_start ON cardio(start_ts);
        CREATE INDEX IF NOT EXISTS idx_journal_day ON journal(day);
      `);
      // Migrations: add columns for DBs created before these features. Each
      // ALTER is independent so a partial upgrade still completes.
      for (const col of [
        'resp REAL',
        'sleep_start INTEGER',
        'sleep_end INTEGER',
        'deep_min INTEGER',
        'rem_min INTEGER',
        'light_min INTEGER',
        'awake_min INTEGER',
      ]) {
        try {
          await db.execAsync(`ALTER TABLE daily_metrics ADD COLUMN ${col}`);
        } catch {
          // Column already exists — nothing to do.
        }
      }
      return db;
    })();
  }
  return dbPromise;
}

// ---- HR samples ----
export async function insertHrSample(s: HrSampleRow): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO hr_samples (ts, bpm, rr) VALUES (?, ?, ?)',
    s.ts,
    s.bpm,
    JSON.stringify(s.rr ?? []),
  );
}

export async function getHrSamplesBetween(fromTs: number, toTs: number): Promise<HrSampleRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ ts: number; bpm: number; rr: string | null }>(
    'SELECT ts, bpm, rr FROM hr_samples WHERE ts >= ? AND ts <= ? ORDER BY ts ASC',
    fromTs,
    toTs,
  );
  return rows.map((r) => ({ ts: r.ts, bpm: r.bpm, rr: r.rr ? (JSON.parse(r.rr) as number[]) : [] }));
}

/** Trim the raw HR stream to keep storage bounded (default: keep 30 days). */
export async function pruneHrSamples(olderThanTs: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM hr_samples WHERE ts < ?', olderThanTs);
}

// ---- Daily metrics ----
export async function upsertDailyMetric(m: DailyMetricRow): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO daily_metrics (day, recovery, rmssd, rhr, resp, sleep_min, sleep_perf, strain, steps,
       sleep_start, sleep_end, deep_min, rem_min, light_min, awake_min, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(day) DO UPDATE SET
       recovery=excluded.recovery, rmssd=excluded.rmssd, rhr=excluded.rhr, resp=excluded.resp,
       sleep_min=excluded.sleep_min, sleep_perf=excluded.sleep_perf,
       strain=excluded.strain, steps=excluded.steps,
       sleep_start=excluded.sleep_start, sleep_end=excluded.sleep_end,
       deep_min=excluded.deep_min, rem_min=excluded.rem_min,
       light_min=excluded.light_min, awake_min=excluded.awake_min,
       updated_at=excluded.updated_at`,
    m.day,
    m.recovery,
    m.rmssd,
    m.rhr,
    m.resp,
    m.sleepMin,
    m.sleepPerf,
    m.strain,
    m.steps,
    m.sleepStart,
    m.sleepEnd,
    m.deepMin,
    m.remMin,
    m.lightMin,
    m.awakeMin,
    m.updatedAt,
  );
}

function mapDaily(r: {
  day: string;
  recovery: number | null;
  rmssd: number | null;
  rhr: number | null;
  resp: number | null;
  sleep_min: number | null;
  sleep_perf: number | null;
  strain: number | null;
  steps: number | null;
  sleep_start: number | null;
  sleep_end: number | null;
  deep_min: number | null;
  rem_min: number | null;
  light_min: number | null;
  awake_min: number | null;
  updated_at: number;
}): DailyMetricRow {
  return {
    day: r.day,
    recovery: r.recovery,
    rmssd: r.rmssd,
    rhr: r.rhr,
    resp: r.resp ?? null,
    sleepMin: r.sleep_min,
    sleepPerf: r.sleep_perf,
    strain: r.strain,
    steps: r.steps,
    sleepStart: r.sleep_start ?? null,
    sleepEnd: r.sleep_end ?? null,
    deepMin: r.deep_min ?? null,
    remMin: r.rem_min ?? null,
    lightMin: r.light_min ?? null,
    awakeMin: r.awake_min ?? null,
    updatedAt: r.updated_at,
  };
}

export async function getDailyMetric(day: string): Promise<DailyMetricRow | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<Parameters<typeof mapDaily>[0]>(
    'SELECT * FROM daily_metrics WHERE day = ?',
    day,
  );
  return r ? mapDaily(r) : null;
}

export async function getRecentDailyMetrics(limit = 30): Promise<DailyMetricRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Parameters<typeof mapDaily>[0]>(
    'SELECT * FROM daily_metrics ORDER BY day DESC LIMIT ?',
    limit,
  );
  return rows.map(mapDaily);
}

// ---- Cardio ----
export async function insertCardio(c: CardioRow): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO cardio (id, start_ts, end_ts, activity, avg_hr, trimp, strain, kcal, source, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    c.id,
    c.startTs,
    c.endTs,
    c.activity,
    c.avgHr,
    c.trimp,
    c.strain,
    c.kcal,
    c.source,
    c.notes,
  );
}

export async function deleteCardio(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM cardio WHERE id = ?', id);
}

export async function listCardio(limit = 50): Promise<CardioRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    start_ts: number;
    end_ts: number;
    activity: string;
    avg_hr: number | null;
    trimp: number | null;
    strain: number | null;
    kcal: number | null;
    source: string;
    notes: string | null;
  }>('SELECT * FROM cardio ORDER BY start_ts DESC LIMIT ?', limit);
  return rows.map((r) => ({
    id: r.id,
    startTs: r.start_ts,
    endTs: r.end_ts,
    activity: r.activity,
    avgHr: r.avg_hr,
    trimp: r.trimp,
    strain: r.strain,
    kcal: r.kcal,
    source: r.source,
    notes: r.notes,
  }));
}

// ---- Journal ----
export async function insertJournal(j: JournalRow): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO journal (id, day, behaviour, value, created_at) VALUES (?, ?, ?, ?, ?)',
    j.id,
    j.day,
    j.behaviour,
    j.value,
    j.createdAt,
  );
}

export async function listJournal(day: string): Promise<JournalRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    day: string;
    behaviour: string;
    value: string;
    created_at: number;
  }>('SELECT * FROM journal WHERE day = ? ORDER BY created_at DESC', day);
  return rows.map((r) => ({
    id: r.id,
    day: r.day,
    behaviour: r.behaviour,
    value: r.value,
    createdAt: r.created_at,
  }));
}

// ---- Raw frames ----
export async function insertRawFrame(ts: number, source: string, hex: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO raw_frames (ts, source, hex) VALUES (?, ?, ?)', ts, source, hex);
}

export async function countRawFrames(): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM raw_frames');
  return r?.n ?? 0;
}

export async function getAllRawFrames(limit = 20000): Promise<Array<{ ts: number; source: string; hex: string }>> {
  const db = await getDb();
  return db.getAllAsync<{ ts: number; source: string; hex: string }>(
    'SELECT ts, source, hex FROM raw_frames ORDER BY ts ASC LIMIT ?',
    limit,
  );
}

export async function clearRawFrames(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM raw_frames');
}

// ---- KV (profile / settings) ----
export async function kvGet(key: string): Promise<string | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
  return r?.value ?? null;
}

export async function kvSet(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    key,
    value,
  );
}
