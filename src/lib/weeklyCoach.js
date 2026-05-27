/**
 * weeklyCoach.js
 * Core algorithm for Volyume Pro weekly coaching output.
 * Pure functions only — no side effects, no DB calls, no I/O.
 *
 * Translates check-in data + weight trend + training data into a
 * unified coaching card: trend summary, what's working, adjustments,
 * and a plain-English rationale.
 */

import { getTrainingNote } from './coachingGoals';
import { shouldSuggestDietBreak, computeFFMFloor } from './nutritionEngine';
import { detectEdPatternFlag, hasEdPatternCleared } from './edPatternDetector';
import { detectDifferentialTrigger } from './differentialPaywall';

// ─── EWMA ────────────────────────────────────────────────────────────────────

/**
 * Exponential weighted moving average over an array of { weightKg, loggedAt } entries.
 * alpha = 0.1 ≈ 10-day memory; alpha = 0.05 ≈ 20-day memory.
 * Returns an array of { loggedAt, rawKg, ewmaKg } aligned to input.
 *
 * Distinct from nutritionEngine.computeEWMA. This one uses a slow alpha
 * (~10-day memory) for the weekly-coach trend signal. The faster variant
 * in nutritionEngine uses alpha 0.28 (~3.5-day memory) for diet-planning
 * surfaces. Output shapes differ deliberately so callers can't mix them
 * up by accident.
 */
export function computeEWMA(weights, alpha = 0.1) {
  if (!weights || weights.length === 0) return [];
  const sorted = [...weights].sort((a, b) => a.loggedAt - b.loggedAt);
  const result = [];
  let ema = sorted[0].weightKg;
  for (const w of sorted) {
    ema = alpha * w.weightKg + (1 - alpha) * ema;
    result.push({ loggedAt: w.loggedAt, rawKg: w.weightKg, ewmaKg: Math.round(ema * 100) / 100 });
  }
  return result;
}

/**
 * Returns the latest EWMA value from a weights array, or null if insufficient data.
 */
export function getLatestEwma(weights, alpha = 0.1) {
  const series = computeEWMA(weights, alpha);
  return series.length ? series[series.length - 1].ewmaKg : null;
}

/**
 * Signed weekly trend in % of body weight per week. -1.5 means the
 * EWMA has dropped 1.5% in the last 7 days. Returns null when
 * there aren't enough readings to compute a meaningful trend.
 *
 * Used by the ED-pattern detector for its rapid-loss signal.
 */
export function computeWeeklyTrendPct(morningWeights, currentBodyweightKg = null) {
  if (!morningWeights || morningWeights.length < 4) return null;
  const ewmaNow = getLatestEwma(morningWeights);
  const ewmaPrior = getEwmaSevenDaysAgo(morningWeights);
  if (ewmaNow == null || ewmaPrior == null) return null;
  const reference = currentBodyweightKg || ewmaNow;
  if (!reference) return null;
  return ((ewmaNow - ewmaPrior) / reference) * 100;
}

/**
 * Returns the EWMA from 7 days ago (approximate), or null.
 */
export function getEwmaSevenDaysAgo(weights, alpha = 0.1) {
  const series = computeEWMA(weights, alpha);
  if (series.length < 2) return null;
  const cutoff = Date.now() - 7 * 86400000;
  // Find the closest entry at or before 7 days ago
  const older = [...series].reverse().find(e => e.loggedAt <= cutoff);
  return older?.ewmaKg ?? series[0].ewmaKg;
}

// ─── Data confidence assessment ──────────────────────────────────────────────

/**
 * Returns a confidence level for the current check-in data set.
 * Used to gate calorie/training adjustments — we hold the plan when data is thin.
 *
 * level: 'high' | 'medium' | 'low' | 'data_hold'
 * reasons: array of plain-English strings explaining the level
 * holdMessage: string to surface to the user when data_hold
 */
export function assessDataConfidence({ weigh_ins, adherenceKnown, weeksInPhase, hasUnusualEvent }) {
  const reasons = [];
  let level = 'high';

  if (weigh_ins < 3) {
    return {
      level: 'data_hold',
      reasons: ['Fewer than 3 weigh-ins this week'],
      holdMessage: "Need at least 3 morning weights for a reliable trend. Calories held this week. Log daily and the next check-in has clean data to act on.",
    };
  }

  if (hasUnusualEvent && weigh_ins < 5) {
    return {
      level: 'data_hold',
      reasons: ['Unusual event flagged with limited weight data'],
      holdMessage: "Unusual week flagged and weight data is thin. Scale isn't a reliable signal right now. Calories held. Log consistently next week for a clean read.",
    };
  }

  if (weigh_ins < 5) { level = 'medium'; reasons.push('Fewer than 5 weigh-ins'); }
  if (!adherenceKnown) { if (level === 'high') level = 'medium'; reasons.push('Nutrition adherence not reported'); }
  if (weeksInPhase < 2) { level = 'low'; reasons.push('Less than 2 weeks of trend data'); }
  if (hasUnusualEvent) { if (level === 'high') level = 'medium'; reasons.push('Unusual week flagged'); }

  return { level, reasons, holdMessage: null };
}

// ─── Autoregulation matrix ────────────────────────────────────────────────────

/**
 * Maps check-in data to a recovery score 1–4.
 *   1 = No soreness, healed early (energy ≥4, soreness ≤1)
 *   2 = Healed just in time (energy ≥3, soreness ≤2)
 *   3 = Still slightly sore (energy ≤3 or soreness ≥3)
 *   4 = Soreness limits performance (soreness ≥4)
 */
function getRecoveryScore(energyScore, sorenessScore) {
  const e = energyScore ?? 3;
  const s = sorenessScore ?? 3;
  if (s >= 4) return 4;
  if (e <= 2 || s >= 3) return 3;
  if (e >= 4 && s <= 1) return 1;
  return 2;
}

/**
 * Maps training data to a performance score 1–4.
 * trainingPerformance: 'exceeded' | 'hit' | 'struggled' | 'dropped' | null
 */
function getPerformanceScore(sessionAdherence, prsThisWeek, trainingPerformance) {
  if (trainingPerformance === 'exceeded' || (prsThisWeek > 0 && sessionAdherence >= 0.9)) return 1;
  if (trainingPerformance === 'dropped' || sessionAdherence < 0.5) return 4;
  if (trainingPerformance === 'struggled' || sessionAdherence < 0.75) return 3;
  if (trainingPerformance === 'hit' || sessionAdherence >= 0.75) return 2;
  return 2;
}

/**
 * Autoregulation matrix: recovery (1–4) × performance (1–4) → volume signal.
 * Returns: { volumeDelta: -2|-1|0|1|2|3, trainingSignal: 'reduce'|'hold'|'push', deloadFlag: boolean }
 */
function autoregulationMatrix(recoveryScore, performanceScore) {
  // Deload: recovery 4 regardless of performance, or both 3+4
  if (recoveryScore === 4 || (recoveryScore >= 3 && performanceScore >= 4)) {
    return { volumeDelta: -2, trainingSignal: 'reduce', deloadFlag: true };
  }
  // Hold: either dimension is 3 (but not both at extreme)
  if (recoveryScore === 3 || performanceScore === 3) {
    return { volumeDelta: 0, trainingSignal: 'hold', deloadFlag: false };
  }
  // Push: both at 1 or 2
  if (recoveryScore === 1 && performanceScore === 1) {
    return { volumeDelta: 3, trainingSignal: 'push', deloadFlag: false };
  }
  if (recoveryScore === 1 || performanceScore === 1) {
    return { volumeDelta: 2, trainingSignal: 'push', deloadFlag: false };
  }
  // Both 2
  return { volumeDelta: 1, trainingSignal: 'push', deloadFlag: false };
}

// ─── Phase configuration ──────────────────────────────────────────────────────

const PHASE_CONFIG = {
  agg_cut:   { label: 'Aggressive cut',  goalRatePct: -1.00, isCut: true,  isBulk: false },
  mod_cut:   { label: 'Moderate cut',    goalRatePct: -0.625, isCut: true, isBulk: false },
  mild_cut:  { label: 'Mild cut',        goalRatePct: -0.375, isCut: true, isBulk: false },
  recomp:    { label: 'Hold muscle, lose fat', goalRatePct: -0.125, isCut: false, isBulk: false },
  maint:     { label: 'Maintenance',     goalRatePct: 0,      isCut: false, isBulk: false },
  mild_bulk: { label: 'Lean bulk',       goalRatePct: 0.1875, isCut: false, isBulk: true },
  mod_bulk:  { label: 'Lean bulk',       goalRatePct: 0.375,  isCut: false, isBulk: true },
};

// Steps target bands by phase (lower, upper in steps/day)
const STEPS_BANDS = {
  agg_cut:   { lower: 12000, upper: 14000 },
  mod_cut:   { lower: 10000, upper: 12000 },
  mild_cut:  { lower: 9000,  upper: 11000 },
  recomp:    { lower: 9000,  upper: 11000 },
  maint:     { lower: 8000,  upper: 10000 },
  mild_bulk: { lower: 7000,  upper: 9000  },
  mod_bulk:  { lower: 7000,  upper: 9000  },
};

function phaseConfig(goalPhase) {
  return PHASE_CONFIG[goalPhase] ?? PHASE_CONFIG.maint;
}

function stepsBand(goalPhase, bodyweightKg = null) {
  const band = STEPS_BANDS[goalPhase] ?? STEPS_BANDS.maint;
  // Reduce upper band for very large athletes
  if (bodyweightKg && bodyweightKg > 100) {
    return { lower: band.lower, upper: band.upper - 1000 };
  }
  return band;
}

// ─── "Why this week" copy library ────────────────────────────────────────────
// Tagged by signal type. All strings are ≤ 2 sentences, plain English.
// NO jargon: no MEV/MAV/MRV/RIR/RPE/mesocycle/deload.

// User-facing reason strings surfaced under the Precision Coaching header
// on CoachOutputScreen. The header already names Precision Coaching, so
// body lines stay terse: factual, mirror-data, short. Where Precision
// Coaching is taking a specific action (holding calories, raising steps),
// the action is named so the user can see what changed.
//
// Voice rules: docs/COACHING_VOICE_SYNTHESIS_LOCKED.md. Honesty test
// applied to every line.
const WHY_LIBRARY = {
  on_target_holding: [
    "Weight is tracking the target rate. No change needed this week.",
  ],
  off_target_cal_up: [
    "Trend is off target. Precision Coaching has raised your calorie target.",
  ],
  off_target_cal_down: [
    "Trend is off target. Precision Coaching has lowered your calorie target.",
  ],
  recovery_lagging: [
    "Recovery scores are down. Precision Coaching is holding calories until they're back.",
  ],
  performance_regressed: [
    "Strength is dipping. Precision Coaching is holding calories until it stabilises.",
  ],
  building_baseline: [
    "Not enough data yet to adjust. Keep logging weight and sessions and Precision Coaching will catch up.",
  ],
  stabilise_sessions: [
    "Sessions were inconsistent this week. Precision Coaching is holding the plan steady until adherence settles.",
  ],
  steps_bump: [
    "Trend is behind target. Precision Coaching has raised your step target as the lowest-fatigue lever.",
  ],
  deload_suggested: [
    "Recovery flags across multiple signals. Precision Coaching has scheduled a lighter week to set up the next run.",
  ],
  diet_break_suggested: [
    "Long stretch in a deficit. Precision Coaching suggests a short break at maintenance to help the next stretch.",
  ],
  push_volume: [
    "Recovery and performance both clean. Precision Coaching has added work to the plan.",
  ],
  low_data_weight: [
    "Weight data is thin this week. The trend will sharpen with more daily logs.",
  ],
  ffm_floor_hold: [
    "Precision Coaching has held your calorie target. Your seven-day average intake is at or below the safety floor for your fat-free mass.",
  ],
  rapid_loss_corrected: [
    "Weight dropped fast this week with low energy. Precision Coaching has added calories now rather than waiting two weeks.",
  ],
};

function pickWhy(keys, seed = 0) {
  const pool = keys.flatMap(k => WHY_LIBRARY[k] ?? []);
  if (!pool.length) return "Continue as planned. Check back next week.";
  return pool[seed % pool.length];
}

// ─── Main algorithm ───────────────────────────────────────────────────────────

/**
 * runWeeklyCoach(inputs) → output card object
 *
 * @param {object} inputs
 * @param {object|null}   inputs.checkin                    - from weekly_checkins row (camelCase)
 * @param {Array}         inputs.morningWeights             - [{weightKg, loggedAt}] last 14 days
 * @param {number}        inputs.sessionsCompleted
 * @param {number}        inputs.sessionsPlanned
 * @param {number}        inputs.prsThisWeek
 * @param {string}        inputs.goalPhase                  - 'agg_cut'|'mod_cut'|'mild_cut'|'recomp'|'maint'|'mild_bulk'|'mod_bulk'
 * @param {number}        inputs.weeksInPhase               - weeks since phase was set
 * @param {number}        inputs.consecutiveOffTargetWeeks  - weeks trend has been off-target same direction
 * @param {number}        inputs.consecutivePoorRecoveryWeeks
 * @param {string|null}   inputs.lastCalAdjustmentDirection - 'up'|'down'|null
 * @param {number}        inputs.lastCalAdjustmentWeeksAgo  - weeks since last cal change (cooldown)
 * @param {number|null}   inputs.currentCalTarget           - kcal/day, or null if not set
 * @param {number}        inputs.currentStepsTarget
 * @param {number|null}   inputs.bodyweightKg
 * @param {string}        inputs.units                      - 'kg'|'lbs'
 * @param {boolean}       inputs.scoffPositive              - wellbeing screen was positive; gates deficit suggestions
 */
export function runWeeklyCoach(inputs) {
  const {
    checkin,
    morningWeights = [],
    sessionsCompleted = 0,
    sessionsPlanned = 3,
    prsThisWeek = 0,
    goalPhase = 'maint',
    trainingGoal = null,
    weeksInPhase = 1,
    goalStartDate = null,
    consecutiveOffTargetWeeks = 0,
    consecutivePoorRecoveryWeeks = 0,
    lastCalAdjustmentDirection = null,
    lastCalAdjustmentWeeksAgo = 99,
    currentCalTarget = null,
    currentStepsTarget = 8000,
    bodyweightKg = null,
    units = 'kg',
    scoffPositive = false,
    // FFM-floor safety context (Move #1). Optional; floor only fires
    // when the caller supplies a 7-day intake average AND at least 5
    // days of food data within that window. Body composition inputs
    // determine which FFM path computeFFMFloor takes.
    bodyFatPercent = null,
    bodyFatSource = null,
    sex = null,
    recentIntakeAvgKcal = null,
    recentIntakeDaysLogged = 0,
    // ED-pattern detector context (Move #2). Optional: when not
    // supplied the detector is skipped. recentWeeklyHistory is
    // most-recent-first, each entry { energy, adherence, hasCheckin,
    // hasFoodData }. goalLockAdvanced raises the firing threshold
    // from 2 signals to 3. edPatternOpen is the current open flag
    // state read from the DB (so we know whether to check for
    // clearance instead of for a fresh raise).
    recentWeeklyHistory = null,
    goalLockAdvanced = false,
    edPatternOpen = false,
    // Move #4 differential paywall context. Trigger only fires for
    // free-tier users; paid tiers carry the
    // 'differential_paywall_disabled' feature flag per
    // COMPLETE_TIER_SCOPE_LOCKED.md. hasUsedTrial selects the CTA
    // (try_pro_14d vs buy_pro). weeksLiftStalled and missingTdeeSignal
    // are caller-computed: weeksLiftStalled from insightsEngine's
    // stalled_lift signal duration; missingTdeeSignal true when
    // reported calorie adherence and observed weight movement
    // contradict (caller does the comparison).
    userTier = 'complete',     // default to complete keeps closed-test users out
    hasUsedTrial = false,
    weeksLiftStalled = null,
    missingTdeeSignal = false,
    blockEnded = false,
  } = inputs;

  // ── DATA CONFIDENCE ───────────────────────────────────────────────────────
  const confidence = assessDataConfidence({
    weigh_ins: morningWeights.length,
    adherenceKnown: checkin?.calsAdherence !== 'untracked' && checkin?.calsAdherence != null,
    weeksInPhase,
    hasUnusualEvent: !!(checkin?.notes?.trim()),
  });

  if (confidence.level === 'data_hold') {
    const ewmaNow = morningWeights.length ? getLatestEwma(morningWeights) : null;
    return {
      hasEnoughData: false,
      dataNote: confidence.holdMessage,
      confidence: confidence.level,
      weekLabel: `Week ${weeksInPhase} · ${phaseConfig(goalPhase).label}`,
      trend: { ewma7: ewmaNow, delta: null, onTarget: false, deltaLabel: 'Log morning weight', rateLabel: null },
      whatWorking: ['Check-in saved.'],
      adjustments: { training: { signal: 'hold', note: 'Plan unchanged. A few more weigh-ins needed to act on.' }, calories: null, steps: null, cardio: null },
      whyThisWeek: confidence.holdMessage,
      deloadSuggested: false, deloadNote: null, dietBreakSuggested: false, dietBreakNote: null,
      heldDecisions: [],
      rapidWeightLossFlag: false,
      ffmFloorHeld: false,
      ffmFloorContext: null,
      adherenceNote: null, prsThisWeek, sessionsCompleted, sessionsPlanned,
      volumeSignal: 0, loadSignal: 'hold', recoveryFlag: 'normal', goalPhase,
    };
  }

  const phase = phaseConfig(goalPhase);
  const energyScore    = checkin?.energyScore    ?? null;
  const sorenessScore  = checkin?.sorenessScore  ?? null;
  const calsAdherence  = checkin?.calsAdherence  ?? 'untracked';
  const stepsAdherence = checkin?.stepsAdherence ?? null;
  const cycleOverride  = !!(checkin?.cycleOverride);
  const sleepHours     = checkin?.sleepHours     ?? null;

  // Seed for rotating copy variants. Anchor to Monday-UTC week buckets so the
  // same calendar week always yields the same seed regardless of whether the
  // caller stored weekStart as a Sunday-anchored or Monday-anchored timestamp.
  // (The notifications module uses Monday; some older check-in rows stored
  // Sunday — without this normalisation the same week could produce different
  // copy variants depending on the write path.)
  const weekSeed = (() => {
    if (!checkin?.weekStart) return 0;
    const d = new Date(checkin.weekStart);
    const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - day);
    return Math.floor(d.getTime() / (7 * 86400000));
  })();

  // ── EWMA weight calculations ──────────────────────────────────────────────
  const ewma7Today   = morningWeights.length >= 3 ? getLatestEwma(morningWeights) : null;
  const ewma7LastWk  = morningWeights.length >= 3 ? getEwmaSevenDaysAgo(morningWeights) : null;
  const bwRef        = bodyweightKg ?? ewma7Today ?? null;

  const weightDelta  = (ewma7Today != null && ewma7LastWk != null)
    ? Math.round((ewma7Today - ewma7LastWk) * 100) / 100
    : null;

  const actualRatePct = (weightDelta != null && bwRef)
    ? (weightDelta / bwRef) * 100
    : null;

  const onTarget = (actualRatePct != null)
    ? Math.abs(actualRatePct - phase.goalRatePct) <= 0.2 * Math.abs(phase.goalRatePct) + 0.05
    : null;

  const offTargetDirection = (actualRatePct != null)
    ? Math.sign(actualRatePct - phase.goalRatePct)
    : 0;

  const enoughWeightData = morningWeights.length >= 4;
  const hasEnoughData = weeksInPhase >= 2 && enoughWeightData;

  // ── Format trend labels ───────────────────────────────────────────────────
  const u = units === 'lbs' ? 'lbs' : 'kg';
  const displayDelta = weightDelta != null
    ? (weightDelta >= 0 ? `+${Math.abs(weightDelta)}${u}` : `-${Math.abs(weightDelta)}${u}`)
    : null;

  const deltaLabel = displayDelta
    ? `${displayDelta} this week`
    : enoughWeightData ? 'Calculating…' : 'Log morning weight';

  const rateLabel = weightDelta != null
    ? (weightDelta > 0.01 ? `gaining ${Math.abs(weightDelta)}${u}/wk` :
       weightDelta < -0.01 ? `losing ${Math.abs(weightDelta)}${u}/wk` : 'stable')
    : null;

  // ── Week label ────────────────────────────────────────────────────────────
  const weekLabel = [
    weeksInPhase >= 1 ? `Week ${weeksInPhase}` : null,
    phase.label,
  ].filter(Boolean).join(' · ');

  // ── PRE-FILTERS ───────────────────────────────────────────────────────────

  // Not enough data yet
  if (!hasEnoughData) {
    const dataNote = weeksInPhase < 2
      ? 'Keep logging. Adjustments start after your second week.'
      : 'Log your morning weight at least 4 days this week to get trend coaching.';
    return _buildBaselineOutput({ weekLabel, deltaLabel, rateLabel, ewma7Today, weightDelta, prsThisWeek, sessionsCompleted, sessionsPlanned, dataNote, weekSeed, onTarget });
  }

  // Adherence gate (Andy Morgan rule): < 50% sessions → stabilise first
  const sessionAdherence = sessionsPlanned > 0 ? sessionsCompleted / sessionsPlanned : 1;
  if (sessionAdherence < 0.5) {
    return _buildAdherenceOutput({ weekLabel, deltaLabel, rateLabel, ewma7Today, weightDelta, prsThisWeek, sessionsCompleted, sessionsPlanned, weekSeed, onTarget });
  }

  // ── RECOVERY & PERFORMANCE SIGNALS (autoregulation matrix) ─────────────
  const poorEnergy   = energyScore != null && energyScore <= 2;
  const highSoreness = sorenessScore != null && sorenessScore >= 4;
  const poorRecovery = poorEnergy || highSoreness;
  const excellentRec = energyScore != null && energyScore >= 4 && sorenessScore != null && sorenessScore <= 2;

  const trainingPerformance = checkin?.trainingPerformance ?? null;
  const recoveryScore   = getRecoveryScore(energyScore, sorenessScore);
  const performanceScore = getPerformanceScore(sessionAdherence, prsThisWeek, trainingPerformance);
  const matrix = autoregulationMatrix(recoveryScore, performanceScore);

  const volumeSignal = matrix.volumeDelta;
  const trainingSignal = matrix.trainingSignal;
  const matrixDeload = matrix.deloadFlag && consecutivePoorRecoveryWeeks >= 1;
  const recoveryFlag = matrixDeload ? 'deload_suggested' : (poorRecovery ? 'concerned' : 'normal');
  const loadSignal = trainingSignal === 'push' ? 'progress' : trainingSignal;

  const trainingNote = getTrainingNote(trainingGoal, volumeSignal, trainingSignal, matrixDeload);

  // ── CALORIE ADJUSTMENT ────────────────────────────────────────────────────
  let calorieAdjustment = null;
  let rapidLossCorrectionApplied = false;

  // At low/medium confidence, require an extra week before adjusting
  const offTargetWeeksRequired = confidence.level === 'high' ? 2 : 3;

  // Move #3 rapid-loss compression: when the safety condition fires
  // (weekly loss <= -1.5% AND energy_score <= 2 AND not cycle-flagged)
  // on a cutting phase, Precision Coaching bypasses the two-week
  // cooldown AND the consecutiveOffTargetWeeks gate to add calories
  // immediately. Upward-only by design -- the same condition during
  // a bulk does not compress the downward gate. Locked in
  // MOVE_3_UPWARD_GATE_COMPRESSION.md.
  const rapidLossOverride = !!(
    phase.isCut &&
    !cycleOverride &&
    actualRatePct !== null && actualRatePct <= -1.5 &&
    energyScore !== null && energyScore <= 2
  );

  const canAdjustCals = (
    !cycleOverride &&
    !scoffPositive &&
    currentCalTarget != null &&
    calsAdherence !== 'untracked' &&
    (
      rapidLossOverride ||
      (
        consecutiveOffTargetWeeks >= offTargetWeeksRequired &&
        lastCalAdjustmentWeeksAgo >= 2  // cooldown: don't adjust two weeks in a row
      )
    )
  );

  if (canAdjustCals && (rapidLossOverride || !onTarget)) {
    let change = 0;
    let calNote = '';

    if (rapidLossOverride) {
      // Magnitude scales with how far past -1.5% the actual rate
      // sits. Base +125 (matches the existing fast-loss adjustment),
      // +150 per additional 1.0% of weekly loss, capped at +300 per
      // MOVE_3_UPWARD_GATE_COMPRESSION.md.
      const severityExcess = Math.max(0, -1.5 - actualRatePct);
      const scaledBoost = Math.round(125 + severityExcess * 150);
      change = Math.min(300, scaledBoost);
      calNote = "Weight is dropping faster than the target rate and energy is low. Adding calories straight away to protect recovery.";
      rapidLossCorrectionApplied = true;
    } else if (phase.isCut && offTargetDirection > 0) {
      // Losing too slowly
      change = calsAdherence === 'hit' ? -150 : -100;
      calNote = "Weight is coming down slower than the target rate.";
    } else if (phase.isCut && offTargetDirection < 0) {
      // Losing too fast — protect muscle (standard, non-compressed)
      change = +125;
      calNote = "Weight is dropping faster than the target rate. Slowing it down protects muscle.";
    } else if (phase.isBulk && offTargetDirection < 0) {
      // Gaining too slowly
      change = +150;
      calNote = "Weight gain is below the target rate.";
    } else if (phase.isBulk && offTargetDirection > 0) {
      // Gaining too fast
      change = -125;
      calNote = "Weight is going on faster than the target rate. Pulling back keeps fat gain in check.";
    }

    // Cap at ±5% of current target. The rapid-loss compression has
    // its own absolute +300 cap above; the percentage cap can only
    // tighten it further on smaller targets, never relax it.
    if (currentCalTarget > 0) {
      const maxChange = Math.round(currentCalTarget * 0.05);
      change = Math.sign(change) * Math.min(Math.abs(change), maxChange);
    }

    if (change !== 0) {
      calorieAdjustment = { change, note: calNote };
    }
  }

  // ── FFM FLOOR SAFETY GATE ────────────────────────────────────────────────
  // Mountjoy 2014/2023 IOC RED-S consensus: 30 kcal/kg fat-free mass per
  // day is the threshold below which sustained intake is "problematic
  // low energy availability". If the user's 7-day rolling intake sits
  // at or below their FFM-derived floor and Precision Coaching was
  // about to suggest a calorie cut, Precision Coaching refuses the cut
  // and surfaces it as a held decision instead. Calorie INCREASES are
  // never blocked. Data sufficiency gate: only fires with >=5 days of
  // intake logged in the last 7.
  let ffmFloorHeld = false;
  let ffmFloorContext = null;
  if (
    bodyweightKg != null &&
    recentIntakeAvgKcal != null &&
    recentIntakeDaysLogged >= 5
  ) {
    const floor = computeFFMFloor(bodyweightKg, {
      bodyFatPercent,
      bodyFatSource,
      sex,
    });
    ffmFloorContext = {
      floorKcal: floor.floorKcal,
      ffmKg: floor.ffmKg,
      source: floor.source,
      recentIntakeAvgKcal,
      recentIntakeDaysLogged,
    };
    if (
      recentIntakeAvgKcal <= floor.floorKcal &&
      calorieAdjustment != null &&
      calorieAdjustment.change < 0
    ) {
      ffmFloorHeld = true;
      calorieAdjustment = null;
    }
  }

  // ── STEPS PRESCRIPTION ────────────────────────────────────────────────────
  let stepsAdjustment = null;
  const band = stepsBand(goalPhase, bwRef);

  if (phase.isCut && !onTarget && offTargetDirection > 0 && !poorRecovery) {
    // Losing too slowly — bump steps if room
    const newTarget = Math.min(currentStepsTarget + 1000, band.upper);
    if (newTarget > currentStepsTarget) {
      stepsAdjustment = {
        target: newTarget,
        change: newTarget - currentStepsTarget,
        note: "Adding a bit more daily movement is the gentlest way to widen the deficit without touching your food.",
      };
    } else {
      stepsAdjustment = {
        target: currentStepsTarget,
        change: 0,
        note: "Steps are already near the upper limit. If more deficit is needed, light cardio is the next lever.",
      };
    }
  } else if (phase.isCut || phase.goalRatePct === 0) {
    stepsAdjustment = {
      target: currentStepsTarget,
      change: 0,
      note: "Steps target stays the same this week.",
    };
  }

  // ── CARDIO PRESCRIPTION ───────────────────────────────────────────────────
  // Cardio fires for cut + off-target high + steps already maxed.
  // Poor recovery overrides the prescription with a "pause" message instead
  // of letting cardio compound the recovery deficit.
  let cardioAdjustment = null;
  const stepsAtUpperBand = currentStepsTarget >= band.upper;
  const cardioConditionsMet = phase.isCut && !onTarget && offTargetDirection > 0 && stepsAtUpperBand;

  if (cardioConditionsMet && poorRecovery) {
    cardioAdjustment = {
      prescribed: false,
      type: null,
      note: 'Cardio paused this week. Recovery takes priority.',
    };
  } else if (cardioConditionsMet) {
    if (consecutiveOffTargetWeeks >= 4 && goalPhase === 'agg_cut') {
      cardioAdjustment = {
        prescribed: true,
        type: 'Cardio boost',
        note: 'Add one short high-intensity interval session (10 to 15 min) on top of your steady-paced cardio.',
      };
    } else {
      cardioAdjustment = {
        prescribed: true,
        type: 'Steady cardio',
        note: 'Add 3 sessions of 20 to 30 min at an easy pace. You should be able to hold a conversation throughout.',
      };
    }
  }

  // ── RAPID WEIGHT LOSS SAFETY FLAG ────────────────────────────────────────
  const rapidWeightLossFlag = !!(
    actualRatePct !== null &&
    actualRatePct < -1.5 &&
    energyScore !== null && energyScore <= 2 &&
    !cycleOverride
  );

  // ── DELOAD / RECOVERY WEEK SUGGESTION ────────────────────────────────────
  let deloadSuggested = false;
  let deloadNote = null;
  let deloadTriggers = 0;

  if (consecutivePoorRecoveryWeeks >= 2)               deloadTriggers++;
  if (matrixDeload)                                    deloadTriggers++;
  if (weeksInPhase >= 6 && phase.isCut)                deloadTriggers++;
  if (sleepHours != null && sleepHours < 6 && poorEnergy) deloadTriggers++;

  if (deloadTriggers >= 2) {
    deloadSuggested = true;
    deloadNote = 'Reduce sets by around half this week, keep the same exercises and weights. Your body is asking for a breather. One lighter week sets you up for a stronger run after.';
  }

  // ── DIET BREAK SUGGESTION ─────────────────────────────────────────────────
  let dietBreakSuggested = false;
  let dietBreakNote = null;
  let dietBreakWeeksInDeficit = 0;

  // Prefer the precise goalStartDate from the user profile (set when they
  // select a cutting phase) so the trigger is anchored to the real start
  // date rather than the approximate weeksInPhase counter.
  if (phase.isCut) {
    if (goalStartDate) {
      const dietBreakResult = shouldSuggestDietBreak(goalStartDate);
      if (dietBreakResult.suggest) {
        dietBreakSuggested = true;
        dietBreakWeeksInDeficit = dietBreakResult.weeksInDeficit;
        dietBreakNote = dietBreakResult.weeksInDeficit >= 12
          ? `You have been eating below maintenance for ${dietBreakResult.weeksInDeficit} weeks. A full week at maintenance will help your body reset before continuing.`
          : 'Eight or more consecutive weeks eating below maintenance is a long time. One week at your full calorie need helps your body reset and makes the next stretch more effective.';
      }
    } else if (weeksInPhase >= 8) {
      // Fallback when goalStartDate is not stored (older profiles).
      dietBreakSuggested = true;
      dietBreakWeeksInDeficit = weeksInPhase;
      dietBreakNote = weeksInPhase >= 12
        ? `You've been eating below maintenance for ${weeksInPhase} weeks. Precision Coaching suggests a full week at maintenance to let your body reset before continuing.`
        : 'Eight or more consecutive weeks below maintenance is a long stretch. Precision Coaching suggests a week at your full calorie need to let your body reset and make the next stretch more effective.';
    }
  }

  // ── ED-PATTERN DETECTOR (Move #2) ─────────────────────────────────────────
  // Multi-signal harm-prevention check. Reads recent weight trend +
  // weekly history and decides whether to raise an ED-pattern flag
  // or, if one is already open, whether to clear it. The output is
  // attached to the coach output so the caller (DB layer) can write
  // the state machine transition. A raised flag also injects an
  // ed_pattern_lockout held decision so the held-decisions card
  // renders the locked copy with CTAs.
  let edPatternResult = null;
  let edPatternClearedThisWeek = false;
  if (recentWeeklyHistory) {
    const weightTrendPctPerWeek = computeWeeklyTrendPct(morningWeights, bodyweightKg);
    if (edPatternOpen) {
      const cleared = hasEdPatternCleared({ weightTrendPctPerWeek }, recentWeeklyHistory);
      if (cleared) {
        edPatternClearedThisWeek = true;
      }
    } else {
      const result = detectEdPatternFlag(
        { weightTrendPctPerWeek },
        recentWeeklyHistory,
        goalLockAdvanced,
      );
      if (result.fired) {
        edPatternResult = result;
      }
    }
  }

  // ── HELD DECISIONS ────────────────────────────────────────────────────────
  const heldDecisions = [];

  // ED-pattern lockout takes the top slot: it's the strongest hold,
  // and the held-decision card uses its type to switch to the rich
  // locked-copy variant rather than the plain reason string. Same
  // shape as the FFM floor: a downward calorie suggestion is wiped
  // so the engine never pushes a deeper deficit while the flag is up.
  if (edPatternResult?.fired || edPatternOpen) {
    if (calorieAdjustment && calorieAdjustment.change < 0) {
      calorieAdjustment = null;
    }
    heldDecisions.push({
      type: 'ed_pattern_lockout',
      reason: 'Calorie cut held. Multiple safety signals are active. See the held-decision card for details.',
      signals: edPatternResult?.signals ?? null,
      goalLockAdvanced: !!goalLockAdvanced,
    });
  } else if (edPatternClearedThisWeek) {
    heldDecisions.push({
      type: 'ed_pattern_cleared',
      reason: 'Hold lifted. The signals that triggered the hold have settled for two weeks. Standard coaching resumes next week.',
    });
  }

  // FFM-floor hold goes second because it's a safety hold that
  // supersedes the other calorie-hold reasons. The user needs to see
  // this one above any "still gathering data" or "trend is on target"
  // type messages.
  if (ffmFloorHeld && ffmFloorContext) {
    heldDecisions.push({
      type: 'ffm_floor',
      reason: `Calorie target held. Your seven-day average intake of ${Math.round(ffmFloorContext.recentIntakeAvgKcal)} kcal is at or below your safety floor of ${ffmFloorContext.floorKcal} kcal. Eating below this level for long stretches breaks down muscle and stalls recovery.`,
    });
  }

  // Move #3: surface the rapid-loss compression as a structured
  // held-decision row. Renders in HeldDecisionsCard with the locked
  // RAPID_LOSS_CORRECTED_COPY title + body. Includes the magnitude
  // applied so the card can show "+N kcal added" instead of being
  // an abstract reason string.
  if (rapidLossCorrectionApplied && calorieAdjustment) {
    heldDecisions.push({
      type: 'rapid_loss_corrected',
      reason: `Calorie target raised by ${calorieAdjustment.change} kcal. Weight dropped ${Math.abs(actualRatePct).toFixed(1)}% this week with low energy; the standard two-week wait is bypassed.`,
      kcalDelta: calorieAdjustment.change,
      weeklyLossPct: parseFloat(actualRatePct.toFixed(2)),
      energyScore,
    });
  }

  if ((phase.isCut || phase.isBulk) && currentCalTarget !== null && calorieAdjustment === null && !ffmFloorHeld) {
    if (scoffPositive) {
      heldDecisions.push({ type: 'calories', reason: "Calories held. Wellbeing screen flagged restriction concerns." });
    } else if (cycleOverride) {
      heldDecisions.push({ type: 'calories', reason: "Calories held. Cycle was flagged this week so the weight reading isn't a reliable signal." });
    } else if (onTarget) {
      heldDecisions.push({ type: 'calories', reason: "Calories held. Trend is on target." });
    } else if (lastCalAdjustmentWeeksAgo < 2) {
      heldDecisions.push({ type: 'calories', reason: "Calories held. Last adjustment needs more weeks to show in the trend." });
    } else if (consecutiveOffTargetWeeks < offTargetWeeksRequired) {
      const weeksLeft = offTargetWeeksRequired - consecutiveOffTargetWeeks;
      heldDecisions.push({ type: 'calories', reason: `Calories held. ${weeksLeft} more week${weeksLeft !== 1 ? 's' : ''} of the same trend needed before adjusting.` });
    } else if (calsAdherence === 'untracked') {
      heldDecisions.push({ type: 'calories', reason: "Calories held. Adherence wasn't tracked, so adjusting now would be a guess." });
    }
  }

  // ── WHAT'S WORKING ────────────────────────────────────────────────────────
  const whatWorking = [];

  if (sessionAdherence >= 1.0) {
    whatWorking.push(`Sessions ${sessionsCompleted}/${sessionsPlanned}.`);
  } else if (sessionAdherence >= 0.75) {
    whatWorking.push(`Sessions ${sessionsCompleted}/${sessionsPlanned}.`);
  }

  if (prsThisWeek > 0) {
    whatWorking.push(`${prsThisWeek} PR${prsThisWeek > 1 ? 's' : ''} this week.`);
  }

  if (stepsAdherence === 'hit') {
    whatWorking.push('Step target hit.');
  } else if (stepsAdherence === 'mostly') {
    whatWorking.push('Step target mostly hit.');
  }

  if (calsAdherence === 'hit') {
    whatWorking.push('Calorie target hit.');
  }

  if (excellentRec) {
    whatWorking.push('Energy and recovery strong.');
  } else if (!poorRecovery && energyScore != null) {
    whatWorking.push('Recovery in range.');
  }

  if (onTarget && weightDelta != null) {
    whatWorking.push(`Weight trend on target (${rateLabel}).`);
  }

  // Fallback — only when literally nothing to say
  if (whatWorking.length === 0) {
    whatWorking.push('Data logged.');
  }

  // ── "WHY THIS WEEK" ───────────────────────────────────────────────────────
  const whyKeys = [];

  // FFM-floor hold supersedes other why-keys when it fires. The user
  // needs to see the safety reason above any other framing. Rapid-
  // loss compression takes precedence over the generic
  // off_target_cal_up so the user sees the safety framing rather than
  // the standard adjustment story.
  if (ffmFloorHeld)                             whyKeys.push('ffm_floor_hold');
  else if (rapidLossCorrectionApplied)          whyKeys.push('rapid_loss_corrected');
  else if (deloadSuggested)                     whyKeys.push('deload_suggested');
  else if (dietBreakSuggested)                  whyKeys.push('diet_break_suggested');
  else if (poorRecovery)                        whyKeys.push('recovery_lagging');
  else if (volumeSignal >= 1 && excellentRec)   whyKeys.push('push_volume');
  else if (calorieAdjustment?.change > 0)       whyKeys.push('off_target_cal_up');
  else if (calorieAdjustment?.change < 0)       whyKeys.push('off_target_cal_down');
  else if (stepsAdjustment?.target > currentStepsTarget) whyKeys.push('steps_bump');
  else                                          whyKeys.push('on_target_holding');

  if (!enoughWeightData) whyKeys.push('low_data_weight');

  const whyThisWeek = pickWhy(whyKeys, weekSeed);

  // ── DIFFERENTIAL PAYWALL (Move #4) ────────────────────────────────────────
  // Pure detector. Returns { shown:false } for paid users, when the
  // adherence 2-of-3 gate fails, or when no context signal matches.
  const differential_output = detectDifferentialTrigger({
    userTier,
    hasUsedTrial,
    calsAdherence,
    recentWeeklyHistory,
    energyScore,
    sorenessScore,
    deloadSuggested,
    blockEnded,
    weeksLiftStalled,
    missingTdeeSignal,
  });

  // ── ASSEMBLE OUTPUT ───────────────────────────────────────────────────────
  return {
    hasEnoughData: true,
    dataNote: null,
    confidence: confidence.level,
    weekLabel,
    trend: {
      ewma7: ewma7Today,
      delta: weightDelta,
      onTarget: onTarget ?? false,
      deltaLabel,
      rateLabel,
    },
    whatWorking,
    adjustments: {
      training: { signal: trainingSignal, note: trainingNote },
      calories: calorieAdjustment,
      steps: stepsAdjustment,
      cardio: cardioAdjustment,
    },
    whyThisWeek,
    deloadSuggested,
    deloadNote,
    dietBreakSuggested,
    dietBreakNote,
    dietBreakWeeksInDeficit,
    heldDecisions,
    rapidWeightLossFlag,
    rapidLossCorrectionApplied,
    ffmFloorHeld,
    ffmFloorContext,
    edPatternFired: !!edPatternResult?.fired,
    edPatternSignals: edPatternResult?.signals ?? null,
    edPatternClearedThisWeek,
    goalLockAdvanced: !!goalLockAdvanced,
    adherenceNote: null,
    prsThisWeek,
    sessionsCompleted,
    sessionsPlanned,
    volumeSignal,
    loadSignal,
    recoveryFlag,
    goalPhase,
    differential_output,
  };
}

// ─── Helper output builders ───────────────────────────────────────────────────

function _buildBaselineOutput({ weekLabel, deltaLabel, rateLabel, ewma7Today, weightDelta, prsThisWeek, sessionsCompleted, sessionsPlanned, dataNote, weekSeed, onTarget }) {
  return {
    hasEnoughData: false,
    dataNote,
    weekLabel,
    trend: { ewma7: ewma7Today, delta: weightDelta, onTarget: onTarget ?? false, deltaLabel, rateLabel },
    whatWorking: ['Logging consistently. The data is building.'],
    adjustments: {
      training: { signal: 'hold', note: 'Continue your plan as written.' },
      calories: null,
      steps: null,
      cardio: null,
    },
    whyThisWeek: pickWhy(['building_baseline'], weekSeed),
    deloadSuggested: false,
    deloadNote: null,
    dietBreakSuggested: false,
    dietBreakNote: null,
    heldDecisions: [],
    rapidWeightLossFlag: false,
    ffmFloorHeld: false,
    ffmFloorContext: null,
    adherenceNote: null,
    prsThisWeek,
    sessionsCompleted,
    sessionsPlanned,
    volumeSignal: 0,
    loadSignal: 'progress',
    recoveryFlag: 'normal',
    goalPhase: 'maint',
  };
}

function _buildAdherenceOutput({ weekLabel, deltaLabel, rateLabel, ewma7Today, weightDelta, prsThisWeek, sessionsCompleted, sessionsPlanned, weekSeed, onTarget }) {
  return {
    hasEnoughData: true,
    dataNote: null,
    weekLabel,
    trend: { ewma7: ewma7Today, delta: weightDelta, onTarget: onTarget ?? false, deltaLabel, rateLabel },
    whatWorking: ['Showing up, even partially, keeps the habit alive.'],
    adjustments: {
      training: { signal: 'hold', note: 'Get back to your full plan before changing anything.' },
      calories: null,
      steps: null,
      cardio: null,
    },
    whyThisWeek: pickWhy(['stabilise_sessions'], weekSeed),
    deloadSuggested: false,
    deloadNote: null,
    dietBreakSuggested: false,
    dietBreakNote: null,
    adherenceNote: `${sessionsCompleted} of ${sessionsPlanned} sessions completed. Getting back on schedule takes priority over any programming change.`,
    prsThisWeek,
    sessionsCompleted,
    sessionsPlanned,
    volumeSignal: 0,
    loadSignal: 'hold',
    recoveryFlag: 'normal',
    goalPhase: 'maint',
  };
}
