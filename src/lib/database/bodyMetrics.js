function timestampToMs(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  return value;
}

function metricDateToMs(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const ms = new Date(`${value}T00:00:00Z`).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function createBodyMetricsRepository({
  db,
  uid,
  rowToCamel,
  scheduleSync = () => {},
  now = () => Date.now(),
}) {
  async function logBodyMetric(userId, data) {
    const d = await db();
    const id = uid();
    const createdAt = now();
    await d.runAsync(
      `INSERT INTO body_metric_log
        (id, user_id, logged_at, weight_kg, body_fat_percent, body_fat_source,
         waist_cm, chest_cm, hips_cm, thigh_cm, arm_cm,
         shoulders_cm, forearm_cm, ham_cm, calf_cm, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, userId, data.loggedAt ?? createdAt,
        data.weightKg ?? null, data.bodyFatPercent ?? null, data.bodyFatSource ?? null,
        data.waistCm ?? null, data.chestCm ?? null, data.hipsCm ?? null,
        data.thighCm ?? null, data.armCm ?? null,
        data.shouldersCm ?? null, data.forearmCm ?? null, data.hamCm ?? null,
        data.calfCm ?? null, data.notes ?? null, createdAt,
      ],
    );
    scheduleSync();
    return { id, userId, createdAt, ...data };
  }

  async function getBodyMetricLog(userId, limitRows = 90) {
    const d = await db();
    const rows = await d.getAllAsync(
      'SELECT * FROM body_metric_log WHERE user_id = ? ORDER BY logged_at DESC LIMIT ?',
      [userId, limitRows],
    );
    return rows.map(rowToCamel);
  }

  async function getLatestBodyWeight(userId) {
    const d = await db();
    const [bodyRow, morningRow] = await Promise.all([
      d.getFirstAsync(
        `SELECT weight_kg, logged_at FROM body_metric_log
         WHERE user_id = ? AND weight_kg IS NOT NULL
         ORDER BY logged_at DESC LIMIT 1`,
        [userId],
      ),
      d.getFirstAsync(
        `SELECT weight_kg, logged_at FROM morning_weights
         WHERE user_id = ? AND weight_kg IS NOT NULL
         ORDER BY logged_at DESC LIMIT 1`,
        [userId],
      ),
    ]);
    const bodyTs = bodyRow?.logged_at ?? 0;
    const morningTs = morningRow?.logged_at ?? 0;
    const winner = bodyTs >= morningTs ? bodyRow : morningRow;
    if (winner && winner.weight_kg != null) {
      return { weightKg: winner.weight_kg, loggedAt: winner.logged_at };
    }
    return null;
  }

  async function getBodyWeightNearestTo(userId, t) {
    if (!userId || !Number.isFinite(t)) return null;
    const d = await db();
    const union = `
      SELECT weight_kg, logged_at FROM body_metric_log
        WHERE user_id = ? AND weight_kg IS NOT NULL
      UNION ALL
      SELECT weight_kg, logged_at FROM morning_weights
        WHERE user_id = ? AND weight_kg IS NOT NULL`;
    const onOrBefore = await d.getFirstAsync(
      `SELECT weight_kg, logged_at FROM (${union})
         WHERE logged_at <= ?
         ORDER BY logged_at DESC LIMIT 1`,
      [userId, userId, t],
    );
    const pick = onOrBefore ?? await d.getFirstAsync(
      `SELECT weight_kg, logged_at FROM (${union})
         ORDER BY ABS(logged_at - ?) ASC LIMIT 1`,
      [userId, userId, t],
    );
    if (pick && pick.weight_kg != null) {
      return { weightKg: pick.weight_kg, loggedAt: pick.logged_at };
    }
    return null;
  }

  async function getLatestBodyComposition(userId) {
    const d = await db();
    const row = await d.getFirstAsync(
      `SELECT body_fat_percent, body_fat_source, logged_at
         FROM body_metric_log
        WHERE user_id = ? AND body_fat_percent IS NOT NULL
        ORDER BY logged_at DESC LIMIT 1`,
      [userId],
    ).catch(() => null);
    if (!row || row.body_fat_percent == null) return null;
    return {
      bodyFatPercent: row.body_fat_percent,
      bodyFatSource: row.body_fat_source ?? null,
      loggedAt: row.logged_at ?? 0,
    };
  }

  async function getAllBodyMetricsForUser(userId) {
    const d = await db();
    const rows = await d.getAllAsync('SELECT * FROM body_metric_log WHERE user_id = ?', [userId]);
    return rows.map(rowToCamel);
  }

  async function insertBodyMetricFromCloud(userId, metric) {
    const d = await db();
    await d.runAsync(
      `INSERT OR REPLACE INTO body_metric_log
        (id, user_id, logged_at, weight_kg, body_fat_percent, body_fat_source,
         waist_cm, chest_cm, hips_cm, thigh_cm, arm_cm, shoulders_cm,
         forearm_cm, ham_cm, calf_cm, notes, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        metric.id, userId,
        metricDateToMs(metric.metric_date) ?? timestampToMs(metric.logged_at),
        metric.body_weight ?? null,
        metric.body_fat_percent ?? null,
        metric.body_fat_source ?? null,
        metric.waist ?? null,
        metric.chest ?? null,
        metric.hips ?? null,
        metric.quads ?? null,
        metric.arms ?? null,
        metric.shoulders ?? null,
        metric.forearms ?? null,
        metric.hamstrings ?? null,
        metric.calves ?? null,
        metric.notes ?? null,
        timestampToMs(metric.created_at) ?? now(),
        timestampToMs(metric.updated_at) ?? now(),
        metric.deleted_at ? timestampToMs(metric.deleted_at) : null,
      ],
    );
  }

  async function getBodyMetricUpdatedAt(userId, id) {
    if (!id) return null;
    const d = await db();
    const row = await d.getFirstAsync(
      'SELECT updated_at FROM body_metric_log WHERE id = ? AND user_id = ?',
      [id, userId],
    );
    return row?.updated_at ?? null;
  }

  return {
    getAllBodyMetricsForUser,
    getBodyMetricLog,
    getBodyMetricUpdatedAt,
    getBodyWeightNearestTo,
    getLatestBodyComposition,
    getLatestBodyWeight,
    insertBodyMetricFromCloud,
    logBodyMetric,
  };
}
