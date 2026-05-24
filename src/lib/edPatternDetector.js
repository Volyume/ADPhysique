/**
 * edPatternDetector.js
 *
 * Multi-signal harm-prevention check. Reads recent weight history,
 * weekly check-ins, and food-logging adherence to decide whether to
 * raise an ED-pattern flag this week. The detector is pure: no DB,
 * no I/O. Callers hand it the rolled-up state and act on the result.
 *
 * Locked in MOVE_2_ED_PATTERN_DETECTION.md.
 *
 * Signals (any of which independently is normal -- the fire happens
 * when they stack):
 *
 *   s1: rapid_loss              -1.5%% body weight per week or worse
 *   s2: low_energy              energy score <= 2 for >= 2 weeks
 *   s3: sustained_under_adherence   adherence = 'under' for >= 2 of
 *                                   the last 3 weeks
 *   s4: weight_only_checkins    no food data on weeks that have a
 *                               check-in (>= 2 of last 3 weeks)
 *
 * Threshold:
 *
 *   goal_lock_advanced = false  fire on >= 2 signals
 *   goal_lock_advanced = true   fire on >= 3 signals
 *
 * The FFM energy floor is a separate guardrail (in nutritionEngine)
 * and is never affected by goal_lock_advanced.
 */

const RAPID_LOSS_PCT_PER_WEEK = -1.5;
const LOW_ENERGY_THRESHOLD = 2;
const LOW_ENERGY_MIN_WEEKS = 2;
const UNDER_ADHERENCE_MIN_WEEKS = 2;
const UNDER_ADHERENCE_WINDOW = 3;
const WEIGHT_ONLY_MIN_WEEKS = 2;
const WEIGHT_ONLY_WINDOW = 3;

/**
 * @param {Object} userState
 * @param {number|null} userState.weightTrendPctPerWeek
 *   trailing weekly trend, signed. -1.5 means dropping 1.5% of body
 *   weight per week. Null when there aren't enough readings.
 * @param {Array<Object>} weeklyHistory
 *   most-recent-first. Each entry: { energy, adherence, hasFoodData }.
 *   adherence is 'under' | 'hit' | 'over' | null.
 * @param {boolean} goalLockAdvanced
 * @returns {{
 *   fired: boolean,
 *   reason: string,
 *   signals: { s1: boolean, s2: boolean, s3: boolean, s4: boolean, count: number },
 *   thresholdRequired: number
 * }}
 */
export function detectEdPatternFlag(userState, weeklyHistory, goalLockAdvanced = false) {
  const history = Array.isArray(weeklyHistory) ? weeklyHistory : [];

  const s1 = isRapidLoss(userState?.weightTrendPctPerWeek);
  const s2 = isLowEnergySustained(history);
  const s3 = isUnderAdherenceSustained(history);
  const s4 = isWeightOnlyCheckins(history);

  const signalsFired = [s1, s2, s3, s4].filter(Boolean).length;
  const required = goalLockAdvanced ? 3 : 2;
  const fired = signalsFired >= required;

  return {
    fired,
    reason: fired ? buildReason({ s1, s2, s3, s4 }) : null,
    signals: { s1, s2, s3, s4, count: signalsFired },
    thresholdRequired: required,
  };
}

/**
 * Has the user's risk pattern abated for two consecutive weeks?
 * Used by the engine to decide when to clear a previously-raised
 * flag. Takes the same history shape and current weight trend, but
 * we walk back signal-by-signal: the most recent 2 weeks must each
 * show no signal firing.
 */
export function hasEdPatternCleared(userState, weeklyHistory) {
  const history = Array.isArray(weeklyHistory) ? weeklyHistory : [];
  if (history.length < 2) return false;
  // Build per-week signal evaluations for the most recent 2 weeks.
  // Rapid-loss is a trailing trend so it applies to the current week
  // only; for the prior week we cannot know its then-trend without
  // historical trend snapshots. We approximate: if current trend is
  // not rapid AND last 2 weeks both have energy > threshold AND
  // adherence in {hit, over} AND food data present, the flag clears.
  const recentTwo = history.slice(0, 2);
  const energyOk = recentTwo.every(w => (w?.energy ?? null) == null || w.energy > LOW_ENERGY_THRESHOLD);
  const adherenceOk = recentTwo.every(w => (w?.adherence ?? null) !== 'under');
  const foodOk = recentTwo.every(w => w?.hasFoodData === true);
  const lossOk = !isRapidLoss(userState?.weightTrendPctPerWeek);
  return energyOk && adherenceOk && foodOk && lossOk;
}

// ─── Signal helpers ──────────────────────────────────────────────────────────

function isRapidLoss(weightTrendPctPerWeek) {
  if (weightTrendPctPerWeek == null || !Number.isFinite(weightTrendPctPerWeek)) return false;
  return weightTrendPctPerWeek <= RAPID_LOSS_PCT_PER_WEEK;
}

function isLowEnergySustained(history) {
  if (history.length < LOW_ENERGY_MIN_WEEKS) return false;
  const recent = history.slice(0, LOW_ENERGY_MIN_WEEKS);
  return recent.every(w => (w?.energy ?? null) != null && w.energy <= LOW_ENERGY_THRESHOLD);
}

function isUnderAdherenceSustained(history) {
  const window = history.slice(0, UNDER_ADHERENCE_WINDOW);
  if (window.length < UNDER_ADHERENCE_MIN_WEEKS) return false;
  const underWeeks = window.filter(w => w?.adherence === 'under').length;
  return underWeeks >= UNDER_ADHERENCE_MIN_WEEKS;
}

function isWeightOnlyCheckins(history) {
  const window = history.slice(0, WEIGHT_ONLY_WINDOW);
  if (window.length < WEIGHT_ONLY_MIN_WEEKS) return false;
  // Only count weeks that actually had a check-in (otherwise we'd
  // penalise a user who simply skipped a week). hasFoodData is false
  // means the check-in happened without food logged.
  const weightOnly = window.filter(w => w?.hasCheckin === true && w?.hasFoodData === false).length;
  return weightOnly >= WEIGHT_ONLY_MIN_WEEKS;
}

function buildReason({ s1, s2, s3, s4 }) {
  const parts = [];
  if (s1) parts.push('rapid weight loss');
  if (s2) parts.push('sustained low energy');
  if (s3) parts.push('under-target intake');
  if (s4) parts.push('weight-only check-ins');
  return parts.join(' + ');
}

// Exported for tests so the thresholds are visible at the call site.
export const ED_PATTERN_CONSTANTS = {
  RAPID_LOSS_PCT_PER_WEEK,
  LOW_ENERGY_THRESHOLD,
  LOW_ENERGY_MIN_WEEKS,
  UNDER_ADHERENCE_MIN_WEEKS,
  UNDER_ADHERENCE_WINDOW,
  WEIGHT_ONLY_MIN_WEEKS,
  WEIGHT_ONLY_WINDOW,
};
