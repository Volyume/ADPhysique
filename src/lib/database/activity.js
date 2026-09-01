import {
  isBoundedString,
  isLocalDayKey,
  isPersistedEpochMs,
  isStrictNumberInRange,
  parseCloudEpochMs,
} from '../numericBoundary';

const STEP_SOURCES = new Set(['manual', 'auto', 'watch', 'apple_health', 'health_connect', 'google_fit']);

export function createActivityRepository({
  db,
  rowToCamel,
  scheduleSync = () => {},
  dayKey,
  now = () => Date.now(),
}) {
  function activityDayKey(ms = now()) {
    return dayKey(ms);
  }

  async function setDailySteps(userId, { entryDate, steps, source = 'manual' } = {}) {
    if (!userId) return null;
    const day = entryDate || activityDayKey();
    const updatedAt = now();
    if (!isLocalDayKey(day)
      || !isStrictNumberInRange(steps, 0, 200000)
      || !STEP_SOURCES.has(source)
      || !isPersistedEpochMs(updatedAt)) {
      throw new TypeError('setDailySteps: invalid activity values');
    }
    const value = Math.round(steps);
    const d = await db();
    await d.runAsync(
      `INSERT INTO daily_steps (user_id, entry_date, steps, source, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, entry_date) DO UPDATE SET
         steps = excluded.steps,
         source = excluded.source,
         updated_at = excluded.updated_at`,
      [userId, day, value, source, updatedAt],
    );
    scheduleSync();
    return { entryDate: day, steps: value, source, updatedAt };
  }

  async function getDailySteps(userId, entryDate) {
    if (!userId) return null;
    const d = await db();
    const day = entryDate || activityDayKey();
    const row = await d.getFirstAsync(
      'SELECT * FROM daily_steps WHERE user_id = ? AND entry_date = ?',
      [userId, day],
    );
    return row ? rowToCamel(row) : null;
  }

  async function getDailyStepsToday(userId) {
    return getDailySteps(userId, activityDayKey());
  }

  async function getDailyStepsRange(userId, fromDate, toDate) {
    if (!userId) return [];
    const d = await db();
    const rows = await d.getAllAsync(
      `SELECT * FROM daily_steps
       WHERE user_id = ? AND entry_date >= ? AND entry_date <= ?
       ORDER BY entry_date ASC`,
      [userId, fromDate, toDate],
    );
    return rows.map(rowToCamel);
  }

  async function deleteCardioLog(userId, id) {
    if (!userId || !id) return false;
    const updatedAt = now();
    if (!isPersistedEpochMs(updatedAt)) throw new TypeError('deleteCardioLog: invalid timestamp');
    const d = await db();
    await d.runAsync(
      'UPDATE cardio_log SET deleted_at = ?, updated_at = ? WHERE user_id = ? AND id = ?',
      [updatedAt, updatedAt, userId, id],
    );
    scheduleSync();
    return true;
  }

  async function getCardioLogUpdatedAt(userId, id) {
    if (!userId || !id) return null;
    const d = await db();
    const row = await d.getFirstAsync(
      'SELECT updated_at FROM cardio_log WHERE user_id = ? AND id = ?',
      [userId, id],
    );
    return row?.updated_at ?? null;
  }

  async function insertCardioLogFromCloud(userId, row) {
    if (!userId || !isBoundedString(row?.id, 200) || !isLocalDayKey(row?.entry_date)) return false;
    const fallbackNow = now();
    const createdAt = parseCloudEpochMs(row.created_at, { fallback: fallbackNow });
    const updatedAt = parseCloudEpochMs(row.updated_at, { fallback: createdAt });
    const deletedAt = parseCloudEpochMs(row.deleted_at, { nullable: true });
    const duration = row.duration_min ?? 0;
    const met = row.met ?? null;
    const calories = row.est_kcal ?? null;
    const distance = row.distance ?? null;
    const avgHr = row.avg_hr ?? null;
    const optionalText = [
      [row.activity_id, 200], [row.activity_name, 300], [row.category, 100],
      [row.recovery_impact, 100], [row.impact_type, 100], [row.notes, 5000],
      [row.ext_id, 300],
    ];
    if (!isPersistedEpochMs(fallbackNow)
      || createdAt === undefined || updatedAt === undefined || deletedAt === undefined
      || !isStrictNumberInRange(duration, 0, 1440)
      || (met != null && !isStrictNumberInRange(met, 0, 50))
      || (calories != null && !isStrictNumberInRange(calories, 0, 50000))
      || (distance != null && !isStrictNumberInRange(distance, 0, 1000000))
      || (avgHr != null && !isStrictNumberInRange(avgHr, 0, 300))
      || (row.intensity != null && !isBoundedString(row.intensity, 40))
      || (row.source != null && !STEP_SOURCES.has(row.source))
      || optionalText.some(([value, limit]) => value != null && !isBoundedString(value, limit))) return false;
    const d = await db();
    await d.runAsync(
      `INSERT INTO cardio_log (user_id, id, entry_date, activity_id, activity_name,
         category, duration_min, intensity, met, est_kcal, recovery_impact,
         impact_type, distance, avg_hr, source, notes, created_at, updated_at, deleted_at, ext_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, id) DO UPDATE SET
         entry_date = excluded.entry_date,
         activity_id = excluded.activity_id,
         activity_name = excluded.activity_name,
         category = excluded.category,
         duration_min = excluded.duration_min,
         intensity = excluded.intensity,
         met = excluded.met,
         est_kcal = excluded.est_kcal,
         recovery_impact = excluded.recovery_impact,
         impact_type = excluded.impact_type,
         distance = excluded.distance,
         avg_hr = excluded.avg_hr,
         source = excluded.source,
         notes = excluded.notes,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at,
         ext_id = excluded.ext_id`,
      [userId, row.id, row.entry_date, row.activity_id ?? null, row.activity_name ?? 'Cardio',
        row.category ?? null, Math.round(duration), row.intensity ?? 'moderate',
        met, calories != null ? Math.round(calories) : null,
        row.recovery_impact ?? null, row.impact_type ?? null,
        distance, avgHr != null ? Math.round(avgHr) : null,
        row.source ?? 'manual', row.notes ?? null,
        createdAt, updatedAt, deletedAt,
        row.ext_id ?? null],
    );
    return true;
  }

  async function getDailyStepsForPush(userId, days = 400) {
    if (!userId) return [];
    const d = await db();
    const cutoff = activityDayKey(now() - days * 86400000);
    const rows = await d.getAllAsync(
      'SELECT * FROM daily_steps WHERE user_id = ? AND entry_date >= ? ORDER BY entry_date ASC',
      [userId, cutoff],
    );
    return rows.map(rowToCamel);
  }

  async function getDailyStepsUpdatedAt(userId, entryDate) {
    if (!userId || !entryDate) return null;
    const d = await db();
    const row = await d.getFirstAsync(
      'SELECT updated_at FROM daily_steps WHERE user_id = ? AND entry_date = ?',
      [userId, entryDate],
    );
    return row?.updated_at ?? null;
  }

  async function insertDailyStepsFromCloud(userId, row) {
    if (!userId || !isLocalDayKey(row?.entry_date)
      || !isStrictNumberInRange(row?.steps, 0, 200000)
      || !STEP_SOURCES.has(row?.source ?? 'manual')) return false;
    const updatedAt = parseCloudEpochMs(row.updated_at, { fallback: now() });
    if (updatedAt === undefined) return false;
    const d = await db();
    await d.runAsync(
      `INSERT OR REPLACE INTO daily_steps (user_id, entry_date, steps, source, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        row.entry_date,
        Math.round(row.steps),
        row.source ?? 'manual',
        updatedAt,
      ],
    );
    return true;
  }

  return {
    activityDayKey,
    deleteCardioLog,
    getCardioLogUpdatedAt,
    getDailySteps,
    getDailyStepsForPush,
    getDailyStepsRange,
    getDailyStepsToday,
    getDailyStepsUpdatedAt,
    insertCardioLogFromCloud,
    insertDailyStepsFromCloud,
    setDailySteps,
  };
}
