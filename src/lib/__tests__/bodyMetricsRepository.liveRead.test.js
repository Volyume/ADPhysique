/**
 * D16 (NAV-2, weigh-in edit/delete/history): "trend-based detection re-runs
 * on the corrected series after any edit or delete."
 *
 * The repository has no cache of its own: every read (getBodyMetricLog,
 * getLatestBodyWeight, getLatestBodyComposition) goes straight to SQLite on
 * every call. This test proves that end-to-end against a tiny in-memory
 * fake connection (not a mock of the assertions, an actual row store), so a
 * log -> edit -> read sequence really does see the corrected value, and a
 * log -> delete -> read sequence really does stop seeing the deleted entry
 * (the entry that fed body-fat% into the BMR/floor calculation on the next
 * weekly-coach run, for instance, via CoachOutputScreen's live
 * getBodyMetricLog(user.id, 60) read). No memoization exists anywhere in
 * this path to invalidate.
 *
 * See bodyMetricsRepository.test.js for the per-call unit tests, and
 * CoachOutputScreen.morningWeightsSource.guard.test.js for why the
 * rapid-loss / ED-pattern trend signal itself (edPatternDetector's s1,
 * fed by weeklyCoach's computeWeeklyTrendPct) is untouched by this table:
 * that signal is sourced from the separate morning_weights table, which
 * this feature does not manage.
 */
import { createBodyMetricsRepository } from '../database/bodyMetrics';

function createInMemoryConn() {
  let rows = [];

  function matchesWhere(row, userId) {
    return row.user_id === userId;
  }

  return {
    rows: () => rows,
    async runAsync(sql, params) {
      if (sql.includes('INSERT INTO body_metric_log')) {
        const [
          id, user_id, logged_at, weight_kg, body_fat_percent, body_fat_source,
          waist_cm, chest_cm, hips_cm, thigh_cm, arm_cm,
          shoulders_cm, forearm_cm, ham_cm, calf_cm, notes, created_at,
        ] = params;
        rows.push({
          id, user_id, logged_at, weight_kg, body_fat_percent, body_fat_source,
          waist_cm, chest_cm, hips_cm, thigh_cm, arm_cm,
          shoulders_cm, forearm_cm, ham_cm, calf_cm, notes, created_at,
          updated_at: null, deleted_at: null,
        });
        return { changes: 1 };
      }
      if (sql.includes('UPDATE body_metric_log SET\n         logged_at')) {
        const [
          logged_at, weight_kg, body_fat_percent, body_fat_source,
          waist_cm, chest_cm, hips_cm, thigh_cm, arm_cm,
          shoulders_cm, forearm_cm, ham_cm, calf_cm, notes,
          updated_at, id, user_id,
        ] = params;
        const row = rows.find((r) => r.id === id && r.user_id === user_id && !r.deleted_at);
        if (!row) return { changes: 0 };
        Object.assign(row, {
          logged_at, weight_kg, body_fat_percent, body_fat_source,
          waist_cm, chest_cm, hips_cm, thigh_cm, arm_cm,
          shoulders_cm, forearm_cm, ham_cm, calf_cm, notes, updated_at,
        });
        return { changes: 1 };
      }
      if (sql.includes('SET deleted_at = ?, updated_at = ?')) {
        const [deleted_at, updated_at, id, user_id] = params;
        const row = rows.find((r) => r.id === id && r.user_id === user_id && !r.deleted_at);
        if (!row) return { changes: 0 };
        Object.assign(row, { deleted_at, updated_at });
        return { changes: 1 };
      }
      throw new Error(`unhandled runAsync SQL in test fake: ${sql}`);
    },
    async getAllAsync(sql, params) {
      if (sql.includes('FROM body_metric_log')) {
        const [userId, limit] = params;
        const excludeDeleted = sql.includes('deleted_at IS NULL');
        return rows
          .filter((r) => matchesWhere(r, userId) && (!excludeDeleted || !r.deleted_at))
          .sort((a, b) => b.logged_at - a.logged_at)
          .slice(0, limit);
      }
      return [];
    },
    async getFirstAsync(sql, params) {
      if (sql.includes('FROM body_metric_log') && sql.includes('body_fat_percent')) {
        const [userId] = params;
        const candidates = rows
          .filter((r) => r.user_id === userId && r.body_fat_percent != null && !r.deleted_at)
          .sort((a, b) => b.logged_at - a.logged_at);
        return candidates[0] ?? null;
      }
      return null;
    },
  };
}

function rowToCamel(row) {
  if (!row) return null;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase())] = v;
  }
  return out;
}

describe('body-metric reads reflect the corrected series live (no cache to invalidate)', () => {
  test('editing a body-fat entry changes what getBodyMetricLog and getLatestBodyComposition see next', async () => {
    const conn = createInMemoryConn();
    let clock = 1000;
    const repo = createBodyMetricsRepository({
      db: async () => conn,
      uid: () => 'bm1',
      rowToCamel,
      now: () => clock,
    });

    await repo.logBodyMetric('u1', { loggedAt: 1000, weightKg: 80, bodyFatPercent: 20, bodyFatSource: 'manual' });

    const before = await repo.getBodyMetricLog('u1', 10);
    expect(before[0].bodyFatPercent).toBe(20);
    const compBefore = await repo.getLatestBodyComposition('u1');
    expect(compBefore.bodyFatPercent).toBe(20);

    // Correct a mistyped body-fat reading.
    clock = 2000;
    const ok = await repo.updateBodyMetric('u1', 'bm1', {
      loggedAt: 1000, weightKg: 80, bodyFatPercent: 15, bodyFatSource: 'manual',
    });
    expect(ok).toBe(true);

    const after = await repo.getBodyMetricLog('u1', 10);
    expect(after[0].bodyFatPercent).toBe(15);
    const compAfter = await repo.getLatestBodyComposition('u1');
    expect(compAfter.bodyFatPercent).toBe(15);
  });

  test('deleting an entry removes it from the live series but the tombstone survives for sync', async () => {
    const conn = createInMemoryConn();
    let clock = 1000;
    const repo = createBodyMetricsRepository({
      db: async () => conn,
      uid: () => 'bm2',
      rowToCamel,
      now: () => clock,
    });

    await repo.logBodyMetric('u1', { loggedAt: 1000, weightKg: 82 });
    expect((await repo.getBodyMetricLog('u1', 10))).toHaveLength(1);

    clock = 3000;
    const ok = await repo.deleteBodyMetric('u1', 'bm2');
    expect(ok).toBe(true);

    // Default (UI/detection) read: the deleted entry is gone.
    expect(await repo.getBodyMetricLog('u1', 10)).toEqual([]);
    // Sync push's read: the tombstone is still visible so the delete propagates.
    const forSync = await repo.getBodyMetricLog('u1', 10, { includeDeleted: true });
    expect(forSync).toHaveLength(1);
    expect(forSync[0].deletedAt).toBe(3000);

    // A second delete is a no-op (already gone), not a false success.
    expect(await repo.deleteBodyMetric('u1', 'bm2')).toBe(false);
  });

  // D16 (NAV-2): "visible history list", most recent first. Also proves the
  // read order survives an edit that moves an entry's date and a delete that
  // removes one from the middle of the series.
  test('getBodyMetricLog reads history most-recent-first, and stays correctly ordered after an edit/delete', async () => {
    const conn = createInMemoryConn();
    let nextId = 1;
    const repo = createBodyMetricsRepository({
      db: async () => conn,
      uid: () => `bm${nextId++}`,
      rowToCamel,
      now: () => 9999,
    });

    await repo.logBodyMetric('u1', { loggedAt: 1000, weightKg: 80 }); // bm1
    await repo.logBodyMetric('u1', { loggedAt: 2000, weightKg: 81 }); // bm2
    await repo.logBodyMetric('u1', { loggedAt: 3000, weightKg: 82 }); // bm3

    expect((await repo.getBodyMetricLog('u1', 10)).map((r) => r.id)).toEqual(['bm3', 'bm2', 'bm1']);

    // Correct bm1's date to the most recent: it should now read first.
    await repo.updateBodyMetric('u1', 'bm1', { loggedAt: 4000, weightKg: 80 });
    expect((await repo.getBodyMetricLog('u1', 10)).map((r) => r.id)).toEqual(['bm1', 'bm3', 'bm2']);

    // Delete the middle (by date) entry: it drops out, order holds for the rest.
    await repo.deleteBodyMetric('u1', 'bm3');
    expect((await repo.getBodyMetricLog('u1', 10)).map((r) => r.id)).toEqual(['bm1', 'bm2']);
  });
});
