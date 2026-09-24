/**
 * blockWeekProgress.js
 *
 * THE CONTRACT MISMATCH THIS CLOSES (progress-tab audit 2026-09-24, finding
 * F2; lead ruling D33, register D199 in
 * docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md).
 * `BlockProgressCard` (src/components/BlockProgressCard.js:14) documents its
 * input as `blockProgress [{ muscle, label, actual, planned }]` and renders
 * `{p.actual}/{p.planned}` off it directly (line 79). Both surfaces that feed
 * it (`useProgressData.js`'s `loadBlockState`, `HomeScreen.js`'s
 * `loadBlockProgress`) used to hand it the RAW rows of
 * `getPlannedMuscleVolume(week.id)` (database.js:6248-6259), whose columns
 * are `id, mesocycle_week_id, muscle, planned_sets, mev, mav, mrv, source,
 * created_at, updated_at`. None of `planned`, `actual` or `label` exist on
 * that row, so the Consistency card rendered empty bars and a bare "/" for
 * every muscle. `buildBlockProgressRows` is the one mapper both surfaces now
 * share, so the card's contract is satisfied identically everywhere it is
 * fed, and it can never drift back out of sync between them.
 *
 * BLOCK WEEK, NOT CALENDAR WEEK (the ruling). The planned row belongs to a
 * BLOCK week: `getCurrentBlockWeekIndex` (mesocycle.js:164-171) is
 * floor(local days since the block's start date / 7) + 1, so a block that
 * starts on a Wednesday runs its weeks Wednesday to Tuesday, never Monday to
 * Sunday. "Actual" must count only the sets logged inside THAT block week's
 * own seven days, on both the Consistency and the Home card; counting a
 * rolling "last 7 days" instead (as Home used to) credits a Monday session on
 * a Wednesday-started block to the wrong block week. `blockWeekSpan` is the
 * single place that turns a block's start date and a week index into that
 * span, using local calendar-day arithmetic (never a fixed 7*86400000 ms
 * step) so a span that crosses a UK clock change still starts and ends at
 * local midnight -- exactly the reasoning `dayKey.js`'s `localWeekEndMs`
 * already uses for the Monday-anchored week.
 *
 * Pure, no I/O: callers (`useProgressData.js`, `HomeScreen.js`) own every DB
 * read and pass this module plain values.
 */
import { MUSCLE_DISPLAY_NAMES } from './algorithms';

/**
 * The block week's own span: local start-of-day of
 * (blockStartMs + (weekIndex - 1) * 7 local days) up to, but not including,
 * the same boundary 7 local days later.
 *
 * Local calendar-day arithmetic throughout (Date's own setDate/setHours),
 * never a raw millisecond offset (`weekIndex * 7 * DAY_MS`) -- a UK clock
 * change inside the span (e.g. 2026-10-25) makes the real span 167 or 169
 * hours, not 168, and both bounds must still land exactly on local midnight
 * rather than drifting by the DST hour.
 *
 * @param {number} blockStartMs epoch ms of the block's start date
 * @param {number} weekIndex 1-based block week index
 * @returns {{startMs: number, endMs: number} | null} null when either input
 *   is not finite, or weekIndex is less than 1
 */
export function blockWeekSpan(blockStartMs, weekIndex) {
  if (!Number.isFinite(blockStartMs) || !Number.isFinite(weekIndex) || weekIndex < 1) {
    return null;
  }
  const idx = Math.floor(weekIndex);
  const start = new Date(blockStartMs);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + (idx - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

/**
 * Maps RAW `planned_muscle_volume` rows plus a computed actual-volume map
 * (the shape `calculateWeeklyVolume` returns, `{ [muscle]: { workingSets,
 * ... } }`) onto `BlockProgressCard`'s exact contract:
 * `[{ muscle, label, planned, actual }]`.
 *
 * @param {Array<Object>} plannedRows raw rows (snake_case `planned_sets`) or
 *   already-camelCased ones (`plannedSets`) -- both accepted
 * @param {Object} [actualByMuscle] `{ [muscle]: { workingSets } }`, e.g. the
 *   output of `calculateWeeklyVolume` (src/lib/algorithms.js)
 * @param {{limit?: number}} [options] slice to the top `limit` rows (by
 *   planned sets) when given; omit to return every row with planned sets
 *   (the Consistency card's ruling: it shows every planned muscle, unlike
 *   Home's glance-surface top eight)
 * @returns {Array<{muscle: string, label: string, planned: number, actual: number}>}
 */
export function buildBlockProgressRows(plannedRows, actualByMuscle = {}, { limit } = {}) {
  const rows = (Array.isArray(plannedRows) ? plannedRows : [])
    .map((p) => {
      const muscle = p?.muscle;
      const planned = p?.planned_sets ?? p?.plannedSets ?? 0;
      const actual = Math.round(actualByMuscle?.[muscle]?.workingSets || 0);
      return { muscle, label: MUSCLE_DISPLAY_NAMES[muscle] || muscle, planned, actual };
    })
    .filter((p) => p.planned > 0)
    .sort((a, b) => b.planned - a.planned || String(a.muscle).localeCompare(String(b.muscle)));
  return Number.isFinite(limit) ? rows.slice(0, limit) : rows;
}
