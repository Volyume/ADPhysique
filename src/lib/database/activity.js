export function createActivityRepository({
  db,
  uid,
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
    const d = await db();
    const day = entryDate || activityDayKey();
    const updatedAt = now();
    const value = Math.max(0, Math.min(200000, Math.round(Number(steps) || 0)));
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

  async function insertCardioLog(userId, session = {}) {
    if (!userId) return null;
    const d = await db();
    const id = session.id || uid();
    const createdAt = now();
    const day = session.entryDate || activityDayKey();
    const durationMin = Math.max(0, Math.min(1440, Math.round(Number(session.durationMin) || 0)));
    const row = {
      user_id: userId,
      id,
      entry_date: day,
      activity_id: session.activityId ?? null,
      activity_name: String(session.activityName || 'Cardio'),
      category: session.category ?? null,
      duration_min: durationMin,
      intensity: session.intensity || 'moderate',
      met: session.met != null ? Number(session.met) : null,
      est_kcal: session.estKcal != null ? Math.max(0, Math.round(Number(session.estKcal))) : null,
      recovery_impact: session.recoveryImpact ?? null,
      impact_type: session.impactType ?? null,
      distance: session.distance != null ? Number(session.distance) : null,
      avg_hr: session.avgHr != null ? Math.round(Number(session.avgHr)) : null,
      source: session.source || 'manual',
      notes: session.notes ?? null,
      created_at: createdAt,
      updated_at: createdAt,
      deleted_at: null,
      ext_id: session.extId ?? null,
    };
    await d.runAsync(
      `INSERT INTO cardio_log (user_id, id, entry_date, activity_id, activity_name,
         category, duration_min, intensity, met, est_kcal, recovery_impact,
         impact_type, distance, avg_hr, source, notes, created_at, updated_at, deleted_at, ext_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [row.user_id, row.id, row.entry_date, row.activity_id, row.activity_name,
        row.category, row.duration_min, row.intensity, row.met, row.est_kcal,
        row.recovery_impact, row.impact_type, row.distance, row.avg_hr, row.source,
        row.notes, row.created_at, row.updated_at, row.deleted_at, row.ext_id],
    );
    scheduleSync();
    return rowToCamel(row);
  }

  async function cardioExtIdExists(userId, extId) {
    if (!userId || !extId) return false;
    const d = await db();
    const row = await d.getFirstAsync(
      'SELECT 1 AS hit FROM cardio_log WHERE user_id = ? AND ext_id = ? LIMIT 1',
      [userId, extId],
    );
    return !!row;
  }

  async function updateCardioLog(userId, id, fields = {}) {
    if (!userId || !id) return null;
    const d = await db();
    const updatedAt = now();
    const allowed = {
      entry_date: fields.entryDate, activity_id: fields.activityId,
      activity_name: fields.activityName, category: fields.category,
      duration_min: fields.durationMin != null ? Math.max(0, Math.round(Number(fields.durationMin))) : undefined,
      intensity: fields.intensity, met: fields.met,
      est_kcal: fields.estKcal != null ? Math.max(0, Math.round(Number(fields.estKcal))) : undefined,
      recovery_impact: fields.recoveryImpact, impact_type: fields.impactType,
      distance: fields.distance, avg_hr: fields.avgHr, source: fields.source, notes: fields.notes,
    };
    const sets = [];
    const args = [];
    for (const [col, val] of Object.entries(allowed)) {
      if (val !== undefined) { sets.push(`${col} = ?`); args.push(val); }
    }
    if (!sets.length) return null;
    sets.push('updated_at = ?'); args.push(updatedAt);
    args.push(userId, id);
    await d.runAsync(`UPDATE cardio_log SET ${sets.join(', ')} WHERE user_id = ? AND id = ?`, args);
    scheduleSync();
    return getCardioLogById(userId, id);
  }

  async function deleteCardioLog(userId, id) {
    if (!userId || !id) return false;
    const d = await db();
    const updatedAt = now();
    await d.runAsync(
      'UPDATE cardio_log SET deleted_at = ?, updated_at = ? WHERE user_id = ? AND id = ?',
      [updatedAt, updatedAt, userId, id],
    );
    scheduleSync();
    return true;
  }

  async function getCardioLogById(userId, id) {
    if (!userId || !id) return null;
    const d = await db();
    const row = await d.getFirstAsync(
      'SELECT * FROM cardio_log WHERE user_id = ? AND id = ?',
      [userId, id],
    );
    return row ? rowToCamel(row) : null;
  }

  async function getCardioLogForDate(userId, entryDate) {
    if (!userId) return [];
    const d = await db();
    const day = entryDate || activityDayKey();
    const rows = await d.getAllAsync(
      'SELECT * FROM cardio_log WHERE user_id = ? AND entry_date = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      [userId, day],
    );
    return rows.map(rowToCamel);
  }

  async function getCardioLogRange(userId, fromDate, toDate) {
    if (!userId) return [];
    const d = await db();
    const rows = await d.getAllAsync(
      `SELECT * FROM cardio_log
       WHERE user_id = ? AND entry_date >= ? AND entry_date <= ? AND deleted_at IS NULL
       ORDER BY entry_date DESC, created_at DESC`,
      [userId, fromDate, toDate],
    );
    return rows.map(rowToCamel);
  }

  async function getRecentCardioLog(userId, limit = 50) {
    if (!userId) return [];
    const d = await db();
    const rows = await d.getAllAsync(
      'SELECT * FROM cardio_log WHERE user_id = ? AND deleted_at IS NULL ORDER BY entry_date DESC, created_at DESC LIMIT ?',
      [userId, Math.max(1, Math.min(500, limit | 0))],
    );
    return rows.map(rowToCamel);
  }

  async function getCardioLogForPush(userId, days = 400) {
    if (!userId) return [];
    const d = await db();
    const cutoff = now() - days * 86400000;
    const rows = await d.getAllAsync(
      'SELECT * FROM cardio_log WHERE user_id = ? AND updated_at >= ? ORDER BY updated_at ASC',
      [userId, cutoff],
    );
    return rows.map(rowToCamel);
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
    if (!userId || !row?.id) return null;
    const d = await db();
    const toMs = (t) => (t == null ? null : (typeof t === 'number' ? t : Date.parse(t) || null));
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
        row.category ?? null, Math.round(Number(row.duration_min) || 0), row.intensity ?? 'moderate',
        row.met != null ? Number(row.met) : null, row.est_kcal != null ? Math.round(Number(row.est_kcal)) : null,
        row.recovery_impact ?? null, row.impact_type ?? null,
        row.distance != null ? Number(row.distance) : null, row.avg_hr != null ? Math.round(Number(row.avg_hr)) : null,
        row.source ?? 'manual', row.notes ?? null,
        toMs(row.created_at) ?? now(), toMs(row.updated_at) ?? now(), toMs(row.deleted_at),
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
    if (!userId || !row?.entry_date) return;
    const d = await db();
    const toMs = (v) => v == null ? now() : (typeof v === 'string' ? new Date(v).getTime() : v);
    await d.runAsync(
      `INSERT OR REPLACE INTO daily_steps (user_id, entry_date, steps, source, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        row.entry_date,
        Math.max(0, Math.round(Number(row.steps) || 0)),
        row.source ?? 'manual',
        toMs(row.updated_at),
      ],
    );
  }

  return {
    activityDayKey,
    cardioExtIdExists,
    deleteCardioLog,
    getCardioLogById,
    getCardioLogForDate,
    getCardioLogForPush,
    getCardioLogRange,
    getCardioLogUpdatedAt,
    getDailySteps,
    getDailyStepsForPush,
    getDailyStepsRange,
    getDailyStepsToday,
    getDailyStepsUpdatedAt,
    getRecentCardioLog,
    insertCardioLog,
    insertCardioLogFromCloud,
    insertDailyStepsFromCloud,
    setDailySteps,
    updateCardioLog,
  };
}
