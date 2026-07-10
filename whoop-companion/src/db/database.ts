/**
 * Offline-first local storage (expo-sqlite). Everything lives on the device —
 * no cloud, no account. Mirrors VOLYUME's "local DB is the source of truth"
 * architecture.
 *
 * Tables:
 *   hr_samples     live and backfilled HR + R-R (the raw stream we derive from)
 *   daily_metrics  one row per day: recovery / sleep / strain / steps / HRV / RHR
 *   cardio         logged or auto-detected activities with per-session strain
 *   journal        lightweight daily behaviour entries
 *   raw_frames     captured proprietary fd4b frames (for offline decoding)
 *   motion_samples per-second WHOOP K21 IMU movement intensity
 *   history_records deduplicated raw WHOOP history for local re-decoding
 *   kv             profile + settings
 */

import * as SQLite from 'expo-sqlite';

export type HrSampleRow = { ts: number; bpm: number; rr: number[] };
export type StepSampleRow = { ts: number; counter: number; activityClass: number | null };
export type SleepStateSampleRow = { ts: number; state: number };
export type MotionSampleRow = { ts: number; intensity: number };
export type RawVitalSampleRow = { ts: number; spo2: number | null; skinTempC: number | null };
export type RawFrameExportRow = { rowId: number; ts: number; source: string; hex: string };
export type StoredHistoryRow = { rowId: number; hex: string };
/**
 * Full WHOOP-style sleep breakdown for one night, stored as JSON so the many
 * sub-metrics (Sleep Need breakdown, the four Sleep Performance contributors,
 * stress bands, latency, wake events) travel as one column instead of ~15.
 */
export type SleepDetail = {
  performance: number | null; // composite Sleep Performance % (estimate)
  hoursVsNeeded: number | null; // %
  needMin: number | null; // Sleep Need total
  baselineMin: number | null;
  napMin: number | null;
  strainMin: number | null;
  debtMin: number | null;
  efficiency: number | null; // %
  consistency: number | null; // % (null = calibrating)
  restorativeMin: number | null;
  restorativePct: number | null; // % of asleep
  latencyMin: number | null;
  wakeEvents: number | null;
  inBedMin: number | null; // time in bed
  stressHigh: number | null; // % of TIB in HIGH stress
  stressMed: number | null;
  stressLow: number | null;
  source?: string | null; // auto_hr | manual_hr | manual_duration
  signalMin?: number | null; // minutes with HR samples in the scored window
  hrvMin?: number | null; // minutes with enough clean R-R intervals for RMSSD
  motionMin?: number | null; // minutes with WHOOP IMU or counter-derived motion evidence
  stillMin?: number | null; // minutes with still/low-motion evidence in the scored window
  movingMin?: number | null; // minutes with moving/activity evidence in the scored window
  sleepStateMin?: number | null; // minutes with decoded band sleep-state evidence
  sleepStateWakeMin?: number | null; // decoded state 0
  sleepStateStillMin?: number | null; // decoded state 1
  sleepStateAsleepMin?: number | null; // decoded state 2
  sleepStateUpMin?: number | null; // decoded state 3
  coveragePct?: number | null; // HR sample coverage across the scored window
  confidence?: 'high' | 'medium' | 'low' | null;
};
export type DailyMetricRow = {
  day: string; // YYYY-MM-DD (local)
  recovery: number | null;
  rmssd: number | null;
  rhr: number | null;
  resp: number | null; // respiratory rate (brpm), overnight
  spo2: number | null; // experimental raw-sensor candidate (%)
  skinTempC: number | null; // experimental raw-sensor candidate (C)
  sleepMin: number | null;
  sleepPerf: number | null;
  strain: number | null;
  steps: number | null;
  stepSource: 'band' | null;
  // Per-night sleep window + stage minutes (for regularity / timing trends).
  sleepStart: number | null;
  sleepEnd: number | null;
  deepMin: number | null;
  remMin: number | null;
  lightMin: number | null;
  awakeMin: number | null;
  sleepDetail: SleepDetail | null; // full WHOOP-style breakdown (JSON column)
  updatedAt: number;
};
export type CardioRow = {
  id: string;
  startTs: number;
  endTs: number;
  activity: string;
  avgHr: number | null;
  maxHr: number | null;
  trimp: number | null;
  strain: number | null;
  kcal: number | null;
  distanceM: number | null; // GPS distance (metres), outdoor workouts
  route: Array<{ lat: number; lng: number }> | null; // GPS route trace
  steps: number | null;
  cadenceSpm: number | null;
  stepSource: string | null;
  lapCount: number | null;
  source: string; // 'manual' | 'auto' | 'live' | 'nap'
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
let writeQueue: Promise<void> = Promise.resolve();

/**
 * expo-sqlite exclusive transactions reject overlapping asynchronous writes on
 * Android. Keep every local write on one queue so history chunks, live HR and
 * diagnostics cannot contend for the same database connection.
 */
function serializeWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

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
          recovery INTEGER, rmssd REAL, rhr INTEGER, resp REAL, spo2 REAL, skin_temp_c REAL,
          sleep_min INTEGER, sleep_perf REAL, strain REAL, steps INTEGER, step_source TEXT,
          sleep_start INTEGER, sleep_end INTEGER,
          deep_min INTEGER, rem_min INTEGER, light_min INTEGER, awake_min INTEGER,
          sleep_json TEXT,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS cardio (
          id TEXT PRIMARY KEY,
          start_ts INTEGER NOT NULL, end_ts INTEGER NOT NULL,
          activity TEXT NOT NULL, avg_hr INTEGER, max_hr INTEGER, trimp REAL, strain REAL,
          kcal INTEGER, distance_m REAL, route TEXT,
          steps INTEGER, cadence_spm INTEGER, step_source TEXT, lap_count INTEGER,
          source TEXT NOT NULL, notes TEXT
        );
        CREATE TABLE IF NOT EXISTS journal (
          id TEXT PRIMARY KEY, day TEXT NOT NULL, behaviour TEXT NOT NULL,
          value TEXT NOT NULL, created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS raw_frames (
          ts INTEGER NOT NULL, source TEXT NOT NULL, hex TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS history_records (
          ts INTEGER NOT NULL,
          start_id INTEGER, end_id INTEGER,
          hex TEXT NOT NULL,
          decoded INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS step_samples (
          ts INTEGER PRIMARY KEY,
          counter INTEGER NOT NULL,
          activity_class INTEGER
        );
        CREATE TABLE IF NOT EXISTS sleep_state_samples (
          ts INTEGER PRIMARY KEY,
          state INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS motion_samples (
          ts INTEGER PRIMARY KEY,
          intensity REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS raw_vital_samples (
          ts INTEGER PRIMARY KEY,
          spo2 REAL,
          skin_temp_c REAL
        );
        CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS idx_cardio_start ON cardio(start_ts);
        CREATE INDEX IF NOT EXISTS idx_journal_day ON journal(day);
        CREATE INDEX IF NOT EXISTS idx_step_samples_ts ON step_samples(ts);
        CREATE INDEX IF NOT EXISTS idx_sleep_state_samples_ts ON sleep_state_samples(ts);
        CREATE INDEX IF NOT EXISTS idx_motion_samples_ts ON motion_samples(ts);
        CREATE INDEX IF NOT EXISTS idx_raw_vital_samples_ts ON raw_vital_samples(ts);
      `);
      // Migrations: add columns for DBs created before these features. Each
      // ALTER is independent so a partial upgrade still completes.
      for (const col of [
        'resp REAL',
        'spo2 REAL',
        'skin_temp_c REAL',
        'sleep_start INTEGER',
        'sleep_end INTEGER',
        'deep_min INTEGER',
        'rem_min INTEGER',
        'light_min INTEGER',
        'awake_min INTEGER',
        'sleep_json TEXT',
        'step_source TEXT',
      ]) {
        try {
          await db.execAsync(`ALTER TABLE daily_metrics ADD COLUMN ${col}`);
        } catch {
          // Column already exists — nothing to do.
        }
      }
      for (const col of [
        'distance_m REAL',
        'route TEXT',
        'max_hr INTEGER',
        'steps INTEGER',
        'cadence_spm INTEGER',
        'step_source TEXT',
        'lap_count INTEGER',
      ]) {
        try {
          await db.execAsync(`ALTER TABLE cardio ADD COLUMN ${col}`);
        } catch {
          // Column already exists.
        }
      }
      const historyDedupe = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM kv WHERE key = 'historyRecordDedupeV1'",
      );
      if (historyDedupe?.value !== '1') {
        // Replayed history can contain the same immutable record across syncs.
        await db.execAsync(`
          DELETE FROM history_records
           WHERE rowid NOT IN (SELECT MIN(rowid) FROM history_records GROUP BY hex);
          CREATE UNIQUE INDEX IF NOT EXISTS idx_history_records_hex ON history_records(hex);
          INSERT OR REPLACE INTO kv (key, value) VALUES ('historyRecordDedupeV1', '1');
        `);
      } else {
        await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_history_records_hex ON history_records(hex)');
      }
      return db;
    })();
  }
  return dbPromise;
}

// ---- HR samples ----
export async function insertHrSample(s: HrSampleRow): Promise<void> {
  await serializeWrite(async () => {
    const db = await getDb();
    await db.runAsync(
      UPSERT_HR_SAMPLE_SQL,
      s.ts,
      s.bpm,
      JSON.stringify(s.rr ?? []),
    );
  });
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
  await serializeWrite(async () => {
    const db = await getDb();
    await db.runAsync('DELETE FROM hr_samples WHERE ts < ?', olderThanTs);
  });
}

// ---- Band step counters ----
export async function insertStepSample(s: StepSampleRow): Promise<void> {
  await serializeWrite(async () => {
    const db = await getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO step_samples (ts, counter, activity_class) VALUES (?, ?, ?)',
      s.ts,
      s.counter,
      s.activityClass,
    );
  });
}

export async function getStepSamplesBetween(fromTs: number, toTs: number): Promise<StepSampleRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ ts: number; counter: number; activity_class: number | null }>(
    'SELECT ts, counter, activity_class FROM step_samples WHERE ts >= ? AND ts <= ? ORDER BY ts ASC',
    fromTs,
    toTs,
  );
  return rows.map((r) => ({ ts: r.ts, counter: r.counter, activityClass: r.activity_class }));
}

// ---- Band sleep-state samples ----
export async function insertSleepStateSample(s: SleepStateSampleRow): Promise<void> {
  await serializeWrite(async () => {
    const db = await getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO sleep_state_samples (ts, state) VALUES (?, ?)',
      s.ts,
      s.state,
    );
  });
}

export async function getSleepStateSamplesBetween(fromTs: number, toTs: number): Promise<SleepStateSampleRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SleepStateSampleRow>(
    'SELECT ts, state FROM sleep_state_samples WHERE ts >= ? AND ts <= ? ORDER BY ts ASC',
    fromTs,
    toTs,
  );
  return rows;
}

// ---- WHOOP K21 IMU motion ----
export async function getMotionSamplesBetween(fromTs: number, toTs: number): Promise<MotionSampleRow[]> {
  const db = await getDb();
  return db.getAllAsync<MotionSampleRow>(
    'SELECT ts, intensity FROM motion_samples WHERE ts >= ? AND ts <= ? ORDER BY ts ASC',
    fromTs,
    toTs,
  );
}

// ---- Experimental raw sensor vitals ----
export async function insertRawVitalSample(s: RawVitalSampleRow): Promise<void> {
  await serializeWrite(async () => {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO raw_vital_samples (ts, spo2, skin_temp_c) VALUES (?, ?, ?)
       ON CONFLICT(ts) DO UPDATE SET
         spo2=COALESCE(excluded.spo2, raw_vital_samples.spo2),
         skin_temp_c=COALESCE(excluded.skin_temp_c, raw_vital_samples.skin_temp_c)`,
      s.ts,
      s.spo2,
      s.skinTempC,
    );
  });
}

export async function getRawVitalSamplesBetween(fromTs: number, toTs: number): Promise<RawVitalSampleRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ ts: number; spo2: number | null; skin_temp_c: number | null }>(
    'SELECT ts, spo2, skin_temp_c FROM raw_vital_samples WHERE ts >= ? AND ts <= ? ORDER BY ts ASC',
    fromTs,
    toTs,
  );
  return rows.map((r) => ({ ts: r.ts, spo2: r.spo2, skinTempC: r.skin_temp_c }));
}

// ---- Daily metrics ----
export async function upsertDailyMetric(m: DailyMetricRow): Promise<void> {
  await serializeWrite(async () => {
    const db = await getDb();
    const resp = cleanRespiratoryRate(m.resp);
    const sleepPerf = cleanSleepFraction(m.sleepPerf);
    const sleepDetail = cleanSleepDetail(m.sleepDetail);
    await db.runAsync(
    `INSERT INTO daily_metrics (day, recovery, rmssd, rhr, resp, spo2, skin_temp_c, sleep_min, sleep_perf, strain, steps, step_source,
       sleep_start, sleep_end, deep_min, rem_min, light_min, awake_min, sleep_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(day) DO UPDATE SET
       recovery=excluded.recovery, rmssd=excluded.rmssd, rhr=excluded.rhr, resp=excluded.resp,
       spo2=excluded.spo2, skin_temp_c=excluded.skin_temp_c,
       sleep_min=excluded.sleep_min, sleep_perf=excluded.sleep_perf,
       strain=excluded.strain, steps=excluded.steps, step_source=excluded.step_source,
       sleep_start=excluded.sleep_start, sleep_end=excluded.sleep_end,
       deep_min=excluded.deep_min, rem_min=excluded.rem_min,
       light_min=excluded.light_min, awake_min=excluded.awake_min,
       sleep_json=excluded.sleep_json,
       updated_at=excluded.updated_at`,
    m.day,
    m.recovery,
    m.rmssd,
    m.rhr,
    resp,
    cleanPct(m.spo2),
    cleanSkinTemp(m.skinTempC),
    m.sleepMin,
    sleepPerf,
    m.strain,
    m.steps,
    m.stepSource,
    m.sleepStart,
    m.sleepEnd,
    m.deepMin,
    m.remMin,
    m.lightMin,
    m.awakeMin,
    sleepDetail ? JSON.stringify(sleepDetail) : null,
      m.updatedAt,
    );
  });
}

function cleanRespiratoryRate(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 9 && value <= 24 ? value : null;
}

function cleanPct(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function cleanSkinTemp(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value >= 15 && value <= 45 ? Math.round(value * 10) / 10 : null;
}

function cleanNonNegative(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, value);
}

function cleanSleepFraction(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value > 2) return (cleanPct(value) ?? 0) / 100;
  return Math.max(0, Math.min(1, value));
}

function cleanSleepDetail(detail: SleepDetail | null | undefined): SleepDetail | null {
  if (!detail) return null;
  const confidence =
    detail.confidence === 'high' || detail.confidence === 'medium' || detail.confidence === 'low'
      ? detail.confidence
      : null;
  return {
    ...detail,
    performance: cleanPct(detail.performance),
    hoursVsNeeded: cleanPct(detail.hoursVsNeeded),
    needMin: cleanNonNegative(detail.needMin),
    baselineMin: cleanNonNegative(detail.baselineMin),
    napMin: cleanNonNegative(detail.napMin),
    strainMin: cleanNonNegative(detail.strainMin),
    debtMin: cleanNonNegative(detail.debtMin),
    efficiency: cleanPct(detail.efficiency),
    consistency: cleanPct(detail.consistency),
    restorativeMin: cleanNonNegative(detail.restorativeMin),
    restorativePct: cleanPct(detail.restorativePct),
    latencyMin: cleanNonNegative(detail.latencyMin),
    wakeEvents: cleanNonNegative(detail.wakeEvents),
    inBedMin: cleanNonNegative(detail.inBedMin),
    stressHigh: cleanPct(detail.stressHigh),
    stressMed: cleanPct(detail.stressMed),
    stressLow: cleanPct(detail.stressLow),
    signalMin: cleanNonNegative(detail.signalMin),
    hrvMin: cleanNonNegative(detail.hrvMin),
    motionMin: cleanNonNegative(detail.motionMin),
    stillMin: cleanNonNegative(detail.stillMin),
    movingMin: cleanNonNegative(detail.movingMin),
    sleepStateMin: cleanNonNegative(detail.sleepStateMin),
    sleepStateWakeMin: cleanNonNegative(detail.sleepStateWakeMin),
    sleepStateStillMin: cleanNonNegative(detail.sleepStateStillMin),
    sleepStateAsleepMin: cleanNonNegative(detail.sleepStateAsleepMin),
    sleepStateUpMin: cleanNonNegative(detail.sleepStateUpMin),
    coveragePct: cleanPct(detail.coveragePct),
    confidence,
  };
}

function mapDaily(r: {
  day: string;
  recovery: number | null;
  rmssd: number | null;
  rhr: number | null;
  resp: number | null;
  spo2: number | null;
  skin_temp_c: number | null;
  sleep_min: number | null;
  sleep_perf: number | null;
  strain: number | null;
  steps: number | null;
  step_source: string | null;
  sleep_start: number | null;
  sleep_end: number | null;
  deep_min: number | null;
  rem_min: number | null;
  light_min: number | null;
  awake_min: number | null;
  sleep_json: string | null;
  updated_at: number;
}): DailyMetricRow {
  let sleepDetail: SleepDetail | null = null;
  if (r.sleep_json) {
    try {
      sleepDetail = JSON.parse(r.sleep_json) as SleepDetail;
    } catch {
      sleepDetail = null;
    }
  }
  return {
    day: r.day,
    recovery: r.recovery,
    rmssd: r.rmssd,
    rhr: r.rhr,
    resp: cleanRespiratoryRate(r.resp),
    spo2: cleanPct(r.spo2),
    skinTempC: cleanSkinTemp(r.skin_temp_c),
    sleepMin: r.sleep_min,
    sleepPerf: cleanSleepFraction(r.sleep_perf),
    strain: r.strain,
    steps: r.step_source === 'band' ? r.steps : null,
    stepSource: r.step_source === 'band' ? 'band' : null,
    sleepStart: r.sleep_start ?? null,
    sleepEnd: r.sleep_end ?? null,
    deepMin: r.deep_min ?? null,
    remMin: r.rem_min ?? null,
    lightMin: r.light_min ?? null,
    awakeMin: r.awake_min ?? null,
    sleepDetail: cleanSleepDetail(sleepDetail),
    updatedAt: r.updated_at,
  };
}

/**
 * Remove legacy values that cannot be proven to come from validated WHOOP
 * fields: phone steps and the old speculative raw-vital byte offsets.
 */
export async function clearUntrustedLegacyData(): Promise<void> {
  await serializeWrite(async () => {
    const db = await getDb();
    await db.execAsync(`
    UPDATE daily_metrics
       SET steps = NULL, step_source = NULL
     WHERE steps IS NOT NULL AND (step_source IS NULL OR step_source != 'band');
    UPDATE cardio
       SET steps = NULL, cadence_spm = NULL, step_source = NULL
     WHERE step_source = 'phone';
    DELETE FROM raw_vital_samples;
    UPDATE daily_metrics SET spo2 = NULL, skin_temp_c = NULL
     WHERE spo2 IS NOT NULL OR skin_temp_c IS NOT NULL;
    `);
  });
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
  await serializeWrite(async () => {
    const db = await getDb();
    await db.runAsync(
    `INSERT OR REPLACE INTO cardio (
       id, start_ts, end_ts, activity, avg_hr, max_hr, trimp, strain, kcal,
       distance_m, route, steps, cadence_spm, step_source, lap_count, source, notes
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    c.id,
    c.startTs,
    c.endTs,
    c.activity,
    c.avgHr,
    c.maxHr,
    c.trimp,
    c.strain,
    c.kcal,
    c.distanceM,
    c.route && c.route.length ? JSON.stringify(c.route) : null,
    c.steps,
    c.cadenceSpm,
    c.stepSource,
    c.lapCount,
    c.source,
      c.notes,
    );
  });
}

export async function deleteCardio(id: string): Promise<void> {
  await serializeWrite(async () => {
    const db = await getDb();
    await db.runAsync('DELETE FROM cardio WHERE id = ?', id);
  });
}

export async function listCardio(limit = 50): Promise<CardioRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    start_ts: number;
    end_ts: number;
    activity: string;
    avg_hr: number | null;
    max_hr: number | null;
    trimp: number | null;
    strain: number | null;
    kcal: number | null;
    distance_m: number | null;
    route: string | null;
    steps: number | null;
    cadence_spm: number | null;
    step_source: string | null;
    lap_count: number | null;
    source: string;
    notes: string | null;
  }>('SELECT * FROM cardio ORDER BY start_ts DESC LIMIT ?', limit);
  return rows.map((r) => {
    let route: Array<{ lat: number; lng: number }> | null = null;
    if (r.route) {
      try {
        route = JSON.parse(r.route) as Array<{ lat: number; lng: number }>;
      } catch {
        route = null;
      }
    }
    return {
      id: r.id,
      startTs: r.start_ts,
      endTs: r.end_ts,
      activity: r.activity,
      avgHr: r.avg_hr,
      maxHr: r.max_hr ?? null,
      trimp: r.trimp,
      strain: r.strain,
      kcal: r.kcal,
      distanceM: r.distance_m ?? null,
      route,
      steps: r.steps ?? null,
      cadenceSpm: r.cadence_spm ?? null,
      stepSource: r.step_source ?? null,
      lapCount: r.lap_count ?? null,
      source: r.source,
      notes: r.notes,
    };
  });
}

// ---- Journal ----
export async function insertJournal(j: JournalRow): Promise<void> {
  await serializeWrite(async () => {
    const db = await getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO journal (id, day, behaviour, value, created_at) VALUES (?, ?, ?, ?, ?)',
      j.id,
      j.day,
      j.behaviour,
      j.value,
      j.createdAt,
    );
  });
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

export async function listJournalSince(day: string): Promise<JournalRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    day: string;
    behaviour: string;
    value: string;
    created_at: number;
  }>('SELECT * FROM journal WHERE day >= ? ORDER BY day ASC, created_at ASC', day);
  return rows.map((row) => ({
    id: row.id,
    day: row.day,
    behaviour: row.behaviour,
    value: row.value,
    createdAt: row.created_at,
  }));
}

// ---- Raw frames ----
export async function insertRawFrame(ts: number, source: string, hex: string): Promise<void> {
  await insertRawFrameBatch([{ ts, source, hex }]);
}

export async function insertRawFrameBatch(frames: Array<{ ts: number; source: string; hex: string }>): Promise<void> {
  if (!frames.length) return;
  await serializeWrite(async () => {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      const statement = await db.prepareAsync('INSERT INTO raw_frames (ts, source, hex) VALUES (?, ?, ?)');
      try {
        for (const frame of frames) await statement.executeAsync(frame.ts, frame.source, frame.hex);
      } finally {
        await statement.finalizeAsync();
      }
    });
  });
}

export async function countRawFrames(): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM raw_frames');
  return r?.n ?? 0;
}

export async function getAllRawFrames(limit = 200000): Promise<Array<{ ts: number; source: string; hex: string }>> {
  const db = await getDb();
  return db.getAllAsync<{ ts: number; source: string; hex: string }>(
    'SELECT ts, source, hex FROM raw_frames ORDER BY ts ASC LIMIT ?',
    limit,
  );
}

export async function getRawFramesPage(afterRowId = 0, limit = 2000): Promise<RawFrameExportRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ row_id: number; ts: number; source: string; hex: string }>(
    'SELECT rowid AS row_id, ts, source, hex FROM raw_frames WHERE rowid > ? ORDER BY rowid ASC LIMIT ?',
    afterRowId,
    limit,
  );
  return rows.map((r) => ({ rowId: r.row_id, ts: r.ts, source: r.source, hex: r.hex }));
}

export async function clearRawFrames(): Promise<void> {
  await serializeWrite(async () => {
    const db = await getDb();
    await db.runAsync('DELETE FROM raw_frames');
  });
}

// ---- History records (strap on-device buffer, drained on reconnect) ----
// The strap records biometrics to its own flash continuously; on every connect
// we drain that buffer so data isn't lost while the app was closed. We persist
// the raw records LOSSLESSLY here so nothing is thrown away — even before the
// per-second byte layout is confirmed from real captures, these can be decoded
// (or re-decoded) offline and back-filled into hr_samples/daily_metrics.
export async function insertHistoryRecord(
  ts: number,
  hex: string,
  startId: number | null = null,
  endId: number | null = null,
): Promise<void> {
  await serializeWrite(async () => {
    const db = await getDb();
    await db.runAsync(
      'INSERT OR IGNORE INTO history_records (ts, start_id, end_id, hex, decoded) VALUES (?, ?, ?, ?, 0)',
      ts,
      startId,
      endId,
      hex,
    );
  });
}

export type HistoryPersistBatch = {
  rawTs: number;
  framesHex: string[];
  hr: HrSampleRow[];
  steps: StepSampleRow[];
  sleepStates: SleepStateSampleRow[];
  motion: MotionSampleRow[];
  rawVitals: RawVitalSampleRow[];
};

/** Persist one decoded history chunk in a single transaction. */
export async function persistHistoryBatch(batch: HistoryPersistBatch): Promise<void> {
  await serializeWrite(async () => {
    const db = await getDb();
    for (let attempt = 0; ; attempt += 1) {
      try {
        await db.withTransactionAsync(async () => {
    const historyStmt = await db.prepareAsync(
      'INSERT OR IGNORE INTO history_records (ts, start_id, end_id, hex, decoded) VALUES (?, NULL, NULL, ?, 0)',
    );
    const hrStmt = await db.prepareAsync(
      UPSERT_HR_SAMPLE_SQL,
    );
    const stepStmt = await db.prepareAsync(
      'INSERT OR REPLACE INTO step_samples (ts, counter, activity_class) VALUES (?, ?, ?)',
    );
    const sleepStmt = await db.prepareAsync(
      'INSERT OR REPLACE INTO sleep_state_samples (ts, state) VALUES (?, ?)',
    );
    const motionStmt = await db.prepareAsync(
      'INSERT OR REPLACE INTO motion_samples (ts, intensity) VALUES (?, ?)',
    );
    const vitalStmt = await db.prepareAsync(
      `INSERT INTO raw_vital_samples (ts, spo2, skin_temp_c) VALUES (?, ?, ?)
       ON CONFLICT(ts) DO UPDATE SET
         spo2=COALESCE(excluded.spo2, raw_vital_samples.spo2),
         skin_temp_c=COALESCE(excluded.skin_temp_c, raw_vital_samples.skin_temp_c)`,
    );
    try {
      for (const hex of batch.framesHex) await historyStmt.executeAsync(batch.rawTs, hex);
      for (const sample of batch.hr) {
        await hrStmt.executeAsync(sample.ts, sample.bpm, JSON.stringify(sample.rr ?? []));
      }
      for (const sample of batch.steps) {
        await stepStmt.executeAsync(sample.ts, sample.counter, sample.activityClass);
      }
      for (const sample of batch.sleepStates) await sleepStmt.executeAsync(sample.ts, sample.state);
      for (const sample of batch.motion) await motionStmt.executeAsync(sample.ts, sample.intensity);
      for (const sample of batch.rawVitals) {
        await vitalStmt.executeAsync(sample.ts, sample.spo2, sample.skinTempC);
      }
    } finally {
      // Finalize every statement even if one finalizer fails; leaked statements
      // can keep SQLite locked for the next history chunk.
      let finalizeError: unknown = null;
      for (const statement of [historyStmt, hrStmt, stepStmt, sleepStmt, motionStmt, vitalStmt]) {
        try {
          await statement.finalizeAsync();
        } catch (error) {
          finalizeError ??= error;
        }
      }
      if (finalizeError) throw finalizeError;
    }
        });
        return;
      } catch (error) {
        if (!isDatabaseLocked(error) || attempt >= 2) throw error;
        await delay(80 * (attempt + 1));
      }
    }
  });
}

const UPSERT_HR_SAMPLE_SQL = `
  INSERT INTO hr_samples (ts, bpm, rr) VALUES (?, ?, ?)
  ON CONFLICT(ts) DO UPDATE SET
    bpm=CASE
      WHEN excluded.rr != '[]' OR hr_samples.rr IS NULL OR hr_samples.rr = '[]' THEN excluded.bpm
      ELSE hr_samples.bpm
    END,
    rr=CASE
      WHEN excluded.rr != '[]' THEN excluded.rr
      ELSE COALESCE(hr_samples.rr, excluded.rr)
    END
`;

export async function countHistoryRecords(): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM history_records');
  return r?.n ?? 0;
}

export async function getStoredK21HistoryPage(afterRowId = 0, limit = 250): Promise<StoredHistoryRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ row_id: number; hex: string }>(
    `SELECT rowid AS row_id, hex
       FROM history_records
      WHERE rowid > ? AND lower(substr(hex, 19, 2)) = '15'
      ORDER BY rowid ASC
      LIMIT ?`,
    afterRowId,
    limit,
  );
  return rows.map((row) => ({ rowId: row.row_id, hex: row.hex }));
}

export async function getStoredHistoryPage(afterRowId = 0, limit = 500): Promise<StoredHistoryRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ row_id: number; hex: string }>(
    `SELECT rowid AS row_id, hex
       FROM history_records
      WHERE rowid > ?
      ORDER BY rowid ASC
      LIMIT ?`,
    afterRowId,
    limit,
  );
  return rows.map((row) => ({ rowId: row.row_id, hex: row.hex }));
}

export async function lastHistoryRecordTs(): Promise<number | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ ts: number }>('SELECT MAX(ts) AS ts FROM history_records');
  return r?.ts ?? null;
}

// ---- KV (profile / settings) ----
export async function kvGet(key: string): Promise<string | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
  return r?.value ?? null;
}

export async function kvSet(key: string, value: string): Promise<void> {
  await serializeWrite(async () => {
    const db = await getDb();
    await db.runAsync(
      'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      key,
      value,
    );
  });
}

function isDatabaseLocked(error: unknown): boolean {
  return String(error).toLowerCase().includes('database is locked');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
