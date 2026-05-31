/**
 * recoveryEMA.js
 * Exponentially-weighted moving averages over session recovery feedback.
 *
 * Half-life model: a data point loses half its weight every `halfLifeDays`.
 * weight(age_days) = 0.5 ^ (age_days / halfLifeDays)
 *
 * Pure functions, no DB calls, no side effects.
 */

const HALF_LIFE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Computes a time-decayed weighted average of a numeric field across
 * feedback entries, anchored to `now`.
 *
 * @param {Array<{ value:number, at:number }>} points - {value, at(ms)} list
 * @param {number} now            - reference epoch ms (default Date.now())
 * @param {number} halfLifeDays   - decay half-life (default 7)
 * @returns {number|null} weighted average, or null if no points
 */
export function emaValue(points, now = Date.now(), halfLifeDays = HALF_LIFE_DAYS) {
  if (!points || points.length === 0) return null;
  let wSum = 0;
  let vSum = 0;
  for (const p of points) {
    if (p.value == null || isNaN(p.value)) continue;
    const ageDays = Math.max(0, (now - p.at) / DAY_MS);
    const w = Math.pow(0.5, ageDays / halfLifeDays);
    wSum += w;
    vSum += w * p.value;
  }
  if (wSum === 0) return null;
  return vSum / wSum;
}

/**
 * Builds soreness / fatigue / joint EMA series from a list of completed
 * workouts (each with feedback fields) plus per-set joint discomfort.
 *
 * @param {Array} workouts - completed workouts with
 *   { startedAt|createdAt, soreness24hBefore, fatigueLevel } and optional
 *   maxJointDiscomfort (caller-computed from workout_set_flags / sets)
 * @param {number} now
 * @returns {{ soreness:number|null, fatigue:number|null, joint:number|null }}
 */
export function computeRecoveryEMAs(workouts, now = Date.now()) {
  const sorenessPts = [];
  const fatiguePts = [];
  const jointPts = [];

  for (const w of workouts) {
    const at = w.startedAt ?? w.createdAt ?? w.created_at ?? null;
    if (!at) continue;
    if (w.soreness24hBefore != null) sorenessPts.push({ value: w.soreness24hBefore, at });
    if (w.fatigueLevel != null) fatiguePts.push({ value: w.fatigueLevel, at });
    const j = w.maxJointDiscomfort ?? w.jointDiscomfort ?? null;
    if (j != null) jointPts.push({ value: j, at });
  }

  return {
    soreness: emaValue(sorenessPts, now),
    fatigue: emaValue(fatiguePts, now),
    joint: emaValue(jointPts, now),
  };
}

/**
 * Week-over-week percentage change of an EMA, comparing the EMA anchored
 * at `now` vs the EMA anchored 7 days earlier.
 *
 * @param {Array<{value:number, at:number}>} points
 * @param {number} now
 * @returns {number|null} signed percent change, null if insufficient data
 */
export function emaWeekOverWeekPct(points, now = Date.now()) {
  const current = emaValue(points, now);
  const prior = emaValue(
    points.filter(p => p.at <= now - 7 * DAY_MS),
    now - 7 * DAY_MS,
  );
  if (current == null || prior == null || prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

/**
 * Builds a daily-bucketed sparkline series (most recent last) for a field,
 * suitable for the Sparkline component. Each bucket is the simple mean for that day;
 * empty days are interpolated as null-skipped (caller filters).
 *
 * @param {Array<{value:number, at:number}>} points
 * @param {number} days  - window length (default 28)
 * @param {number} now
 * @returns {number[]} array of length ≤ days (existing days only)
 */
export function dailySeries(points, days = 28, now = Date.now()) {
  const buckets = new Map();
  const start = now - days * DAY_MS;
  for (const p of points) {
    if (p.at < start) continue;
    const dayIdx = Math.floor((p.at - start) / DAY_MS);
    if (!buckets.has(dayIdx)) buckets.set(dayIdx, []);
    buckets.get(dayIdx).push(p.value);
  }
  const out = [];
  for (let i = 0; i < days; i++) {
    if (buckets.has(i)) {
      const arr = buckets.get(i);
      out.push(arr.reduce((a, b) => a + b, 0) / arr.length);
    }
  }
  return out;
}
