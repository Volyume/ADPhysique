/**
 * weeklyCoach.js
 * Core algorithm for Volyume Pro weekly coaching output.
 * Pure functions only, no side effects, no DB calls, no I/O.
 *
 * Translates check-in data + weight trend + training data into a
 * unified coaching card: trend summary, what's working, adjustments,
 * and a plain-English rationale.
 */

import { getTrainingNote, isCompetitionGoal, dayCalorieCyclingAllowed } from './coachingGoals';
import { cutCardioTarget, nextCardioTarget, cardioRecoveryFlag } from './cardio/cardioEngine';
import {
  shouldSuggestDietBreak,
  computeFFMFloor,
  computeAdaptiveTDEEAdjustment,
  computeStepTrendModifier,
  computeEWMA as nutritionComputeEWMA,
} from './nutritionEngine';
import { localDayKey } from './dayKey';
import { robustTrackingLatest, robustTrackingSevenDaysAgo } from './robustTrend';
import { computeMacroCycle, computeRefeedDay } from './coachApply';
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
  if (!Array.isArray(weights)) return [];
  // Drop malformed rows (null entries, missing or non-numeric weightKg) before
  // smoothing so one corrupt weigh-in cannot crash the coach or poison the
  // trend with NaN.
  const clean = weights.filter((w) => w && Number.isFinite(Number(w.weightKg)));
  if (clean.length === 0) return [];
  const sorted = [...clean].sort((a, b) => a.loggedAt - b.loggedAt);
  const result = [];
  let ema = Number(sorted[0].weightKg);
  for (const w of sorted) {
    ema = alpha * Number(w.weightKg) + (1 - alpha) * ema;
    result.push({ loggedAt: w.loggedAt, rawKg: Number(w.weightKg), ewmaKg: Math.round(ema * 100) / 100 });
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
 * Used to gate calorie/training adjustments, we hold the plan when data is thin.
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
function getRecoveryScore(energyScore, sorenessScore, stressScore = null) {
  const e = energyScore ?? 3;
  const s = sorenessScore ?? 3;
  let score;
  if (s >= 4) score = 4;
  else if (e <= 2 || s >= 3) score = 3;
  else if (e >= 4 && s <= 1) score = 1;
  else score = 2;
  // PIPE-001 / ALGO-006: high life stress impairs recovery. Stress runs 1 (low)
  // to 5 (very high) on the check-in. A high-stress week can only worsen the
  // read toward a hold, never improve it, so the matrix won't push more volume
  // onto someone who is frazzled outside the gym. Below 4 (high) it's left to
  // energy and soreness as before, so existing behaviour is unchanged.
  const st = stressScore ?? null;
  if (st != null && st >= 4 && score < 3) score = 3;
  return score;
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

// Map the coaching-phase vocabulary used upstream (coachingGoals
// TRAINING_PHASES.coachingPhaseKey) onto the keys this module configures.
// 'bulk' ("Build muscle (bulk)" / "Strength + size", a moderate surplus) had
// no PHASE_CONFIG/STEPS_BANDS entry, so it silently fell through to
// maintenance: a bulking user was coached at a 0% goal rate and never
// recognised as on-target for their surplus. Map it to mod_bulk.
const PHASE_ALIASES = { bulk: 'mod_bulk' };

function normalisePhaseKey(goalPhase) {
  return PHASE_ALIASES[goalPhase] ?? goalPhase;
}

function phaseConfig(goalPhase) {
  const key = normalisePhaseKey(goalPhase);
  return PHASE_CONFIG[key] ?? PHASE_CONFIG.maint;
}

function stepsBand(goalPhase, bodyweightKg = null) {
  const band = STEPS_BANDS[normalisePhaseKey(goalPhase)] ?? STEPS_BANDS.maint;
  // Reduce upper band for very large athletes
  if (bodyweightKg && bodyweightKg > 100) {
    return { lower: band.lower, upper: band.upper - 1000 };
  }
  return band;
}

// ─── "Why this week" copy library ────────────────────────────────────────────
// Tagged by signal type. All strings are ≤ 2 sentences, plain English.
// NO jargon: no MEV/MAV/MRV/RIR/RPE/mesocycle/deload.

// User-facing reason strings surfaced under the coaching header on
// CoachOutputScreen. Founder decision 2026-06-03: state the call plainly
// without naming "Precision Coaching" in every line. The header carries the
// branding; the body reads like a coach talking. Terse, factual, mirror-data.
//
// Voice rules: docs/COACHING_VOICE_SYNTHESIS_LOCKED.md. Honesty test
// applied to every line.
const WHY_LIBRARY = {
  on_target_holding: [
    "Weight is tracking the target rate. No change needed this week.",
  ],
  off_target_cal_up: [
    "Trend is off target, so your calorie target goes up.",
  ],
  off_target_cal_down: [
    "Trend is off target, so your calorie target comes down.",
  ],
  recovery_lagging: [
    "Your recovery's down. Calories hold until it's back.",
  ],
  performance_regressed: [
    "Your strength is dipping. Calories hold until it stabilises.",
  ],
  building_baseline: [
    "Not enough data yet to adjust. Keep logging weight and sessions and the read will catch up.",
  ],
  stabilise_sessions: [
    "Sessions were inconsistent this week, so the plan holds steady until that settles.",
  ],
  steps_bump: [
    "Trend is behind target, so your step target goes up: it's the lowest-fatigue lever.",
  ],
  deload_suggested: [
    "Recovery's flagging across several signals, so next week is lighter to set up the next run.",
  ],
  diet_break_suggested: [
    "You've been in a deficit a long stretch. A short break at maintenance will help the next one.",
  ],
  push_volume: [
    "Recovery and performance both look clean, so there's more work in the plan.",
  ],
  low_data_weight: [
    "Weight data is thin this week. The trend will sharpen with more daily logs.",
  ],
  ffm_floor_hold: [
    "Your calorie target holds. Your seven-day average intake is at or below the safety floor for your fat-free mass.",
  ],
  rapid_loss_corrected: [
    "Weight dropped fast this week with low energy, so calories go up now rather than waiting two weeks.",
  ],
};

function pickWhy(keys, seed = 0) {
  const pool = keys.flatMap(k => WHY_LIBRARY[k] ?? []);
  if (!pool.length) return "Continue as planned. Check back next week.";
  return pool[seed % pool.length];
}

/**
 * PIPE-003: lift lightweight structured flags out of the free-text note rather
 * than collapsing it to a single yes/no. The boolean hasUnusualEvent still
 * drives the confidence hold; these flags let the engine treat an illness or
 * injury week as a safety reason to hold progression and let callers surface
 * the context. Deliberately simple word matching, not NLP. Word boundaries
 * keep "ill" from firing on "will"/"skill" and "pain" stays its own token.
 */
export function parseNoteFlags(notes) {
  const flags = { travel: false, illness: false, injury: false, missedLogging: false, menstrual: false };
  if (!notes || typeof notes !== 'string') return flags;
  const t = notes.toLowerCase();
  flags.travel = /\b(travel\w*|holiday|vacation|flight|flying|hotel|trip|away)\b/.test(t);
  flags.illness = /\b(ill|illness|sick|cold|flu|fever|virus|covid|unwell|poorly)\b/.test(t);
  flags.injury = /\b(injur\w*|tweak\w*|strain\w*|sprain\w*|hurt|pulled|pain)\b/.test(t);
  flags.missedLogging = /\b(forgot|missed|untracked)\b/.test(t) || /did\s*n[o']?t?\s*log/.test(t) || /no\s+log/.test(t);
  flags.menstrual = /\b(period|menstr\w*|pms)\b/.test(t) || t.includes('time of the month');
  return flags;
}

/**
 * ALGO-004: the single source of truth for translating the check-in's stored
 * calorie answer ('yes'/'no'/'untracked') into the engine vocabulary
 * ('hit'/'under'/'over'/'no'/'untracked'). Used by the coach screen at load,
 * by the history builder, and by tests, so the stored and runtime vocabularies
 * can't drift across the persistence boundary. avgKcal + targetKcal split a
 * plain 'no' into a direction; without them a 'no' stays a neutral off-target
 * rather than guessing a direction and sizing a correction the wrong way.
 */
export function mapCalsAdherence(raw, avgKcal = null, targetKcal = null) {
  if (raw == null) return null;
  if (raw === 'untracked' || raw === 'hit' || raw === 'under' || raw === 'over') return raw;
  if (raw === 'yes') return 'hit';
  if (raw === 'no') {
    if (avgKcal != null && targetKcal) return avgKcal < targetKcal ? 'under' : 'over';
    return 'no';
  }
  return raw;
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
    sessionsCompleted: _sessionsCompletedRaw = 0,
    sessionsPlanned: _sessionsPlannedRaw = 3,
    prsThisWeek: _prsThisWeekRaw = 0,
    goalPhase = 'maint',
    trainingGoal = null,
    weeksInPhase: _weeksInPhaseRaw = 1,
    goalStartDate = null,
    consecutiveOffTargetWeeks = 0,
    consecutivePoorRecoveryWeeks = 0,
    lastCalAdjustmentDirection: _lastCalAdjustmentDirection = null,
    lastCalAdjustmentWeeksAgo = 99,
    currentCalTarget = null,
    // Current daily macros, read from nutrition_targets by the caller.
    // Only used to build the high-day / low-day carb cycle (row 6); the
    // cycle holds protein and fat and shifts carbs onto training days.
    // PIPE-007 (by design, founder 2026-06-08): weekly coaching decisions run
    // off total calories and weight trend, not macro adherence. Macros inform
    // the carb cycle only; protein sufficiency is set at plan time, not policed
    // weekly here.
    currentProteinG = null,
    currentCarbsG = null,
    currentFatG = null,
    // Maintenance (tdee) and the timestamp of the last applied refeed,
    // both read from the caller. Drive the refeed cadence (row 7).
    currentMaintenanceKcal = null,
    lastRefeedAt = null,
    currentStepsTarget = 8000,
    // Whether the user keeps a daily step target. Defaults true so existing
    // users and every prior caller are unchanged. When false (the user opted
    // out at setup or in Settings) the coach makes no step prescription and
    // treats the step lever as unavailable, so cardio becomes the next lever
    // straight away instead of waiting for steps to reach the band ceiling.
    stepsEnabled = true,
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
    // Cardio integration (QA P2/P3/D1). Optional; defaults make every prior
    // caller a no-op. currentCardioTarget is the applied target from last week;
    // cardioSessionsLogged + cardioWeekSummary come from the week's cardio_log;
    // cardioEnabled gates the non-cut acknowledgement.
    currentCardioTarget = null,
    cardioSessionsLogged = 0,
    cardioWeekSummary = null,
    cardioEnabled = true,
    // The week's cardio compliance verdict from the check-in ('hit' | 'mostly'
    // | 'missed'). It is pre-filled from the cardio_log and the user can
    // override it (cardio done but not logged here). When present it drives the
    // next cardio dose instead of recomputing compliance from the raw logged
    // count, so the coach acts on the check-in answer. Null leaves the prior
    // log-only behaviour unchanged for every other caller.
    cardioCompliance = null,
    // COMP-026 (B) step-trend modifier inputs. Optional; null/absent leaves
    // every prior caller byte-identical (no modifier, update gain stays 0.50).
    // dailyStepsSeries is getDailyStepsRange output over ~42 days
    // ([{ entryDate, steps, source }]); stepsTodayKey anchors the recent/
    // baseline windows and defaults to today (a test can pin it).
    dailyStepsSeries = null,
    stepsTodayKey = null,
  } = inputs;

  // Defensive sanitisation. These come from DB counts and date math; coerce any
  // non-finite value to a safe integer so it can never leak into user-facing
  // copy (e.g. "You hit all -Infinity of your sessions" or "Week Infinity").
  const _safeInt = (v, d) => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : d);
  const sessionsCompleted = _safeInt(_sessionsCompletedRaw, 0);
  const sessionsPlanned = _safeInt(_sessionsPlannedRaw, 3);
  const prsThisWeek = _safeInt(_prsThisWeekRaw, 0);
  const weeksInPhase = Number.isFinite(_weeksInPhaseRaw) ? Math.max(1, Math.round(_weeksInPhaseRaw)) : 1;

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
      weekLabel: `Week ${Number.isFinite(weeksInPhase) ? Math.round(weeksInPhase) : 1} · ${phaseConfig(goalPhase).label}`,
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
  // PIPE-001: stress (1 low … 5 very high) feeds recovery scoring below.
  const stressScore    = checkin?.stressScore    ?? null;
  const calsAdherence  = checkin?.calsAdherence  ?? 'untracked';
  // PIPE-004 (kept by design): stepsAdherence is a legacy subjective chip the
  // current check-in no longer collects. It stays as an explicit fallback for
  // old rows that carry it (used in WHAT'S WORKING below); modern rows pass
  // stepsAvg instead. Founder decision 2026-06-08: keep the fallback, don't
  // drop it, so historical check-ins still read correctly.
  const stepsAdherence = checkin?.stepsAdherence ?? null;
  // Week's average steps: auto when 4+ days are registered, else the manual
  // figure the user typed on the check-in. A secondary signal: it refines the
  // step note and stops the coach raising a target the user is not yet
  // hitting. Null on legacy check-ins, in which case behaviour is unchanged.
  const stepsAvg       = checkin?.stepsAvg       ?? null;
  const cycleOverride  = !!(checkin?.cycleOverride);
  const sleepHours     = checkin?.sleepHours     ?? null;

  // Seed for rotating copy variants. Anchor to Monday-UTC week buckets so the
  // same calendar week always yields the same seed regardless of whether the
  // caller stored weekStart as a Sunday-anchored or Monday-anchored timestamp.
  // (The notifications module uses Monday; some older check-in rows stored
  // Sunday, without this normalisation the same week could produce different
  // copy variants depending on the write path.)
  // NOTE (UK-local rule exemption): the UTC arithmetic here is deliberate and is
  // NOT a user-facing date. It is only a deterministic bucket for choosing a
  // copy variant, so it must be stable across timezones, not local. Do not
  // "fix" it to local: that would make the same week pick different copy by
  // timezone. The user-facing week boundary lives in dayKey.localWeekStartMs.
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

  // COMP-024 decision-promotion: the off-target DECISION reads (onTarget /
  // offTargetDirection) use the cycle-robust TREND-TRACKING trend
  // (robustTrackingEwma: Holt's level+trend + an asymmetric robust clamp on the
  // residual-from-prediction). It damps transient water-weight spikes WITHOUT
  // lagging sustained gains/losses — the median-|residual| scale lets a
  // consistent trend pass while clamping lone outliers, fixing the over-damping
  // that held the original promotion (the bulk_aggressive regression, §12).
  // SAFETY stays on the plain less-damped EWMA: rapid-loss (actualRatePct <=
  // -1.5 below), the +calorie boost magnitude, and the ED detector
  // (computeWeeklyTrendPct) all read the plain trend, never this robust read.
  const robustNow = morningWeights.length >= 3 ? robustTrackingLatest(morningWeights) : null;
  const robustPrior = morningWeights.length >= 3 ? robustTrackingSevenDaysAgo(morningWeights) : null;
  const robustWeightDelta = (robustNow != null && robustPrior != null)
    ? Math.round((robustNow - robustPrior) * 100) / 100
    : null;
  const robustRatePct = (robustWeightDelta != null && bwRef)
    ? (robustWeightDelta / bwRef) * 100
    : null;
  // Fall back to the plain rate when there isn't enough data for the robust read.
  const decisionRatePct = robustRatePct != null ? robustRatePct : actualRatePct;

  const onTarget = (decisionRatePct != null)
    ? Math.abs(decisionRatePct - phase.goalRatePct) <= 0.2 * Math.abs(phase.goalRatePct) + 0.05
    : null;

  const offTargetDirection = (decisionRatePct != null)
    ? Math.sign(decisionRatePct - phase.goalRatePct)
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
    Number.isFinite(weeksInPhase) && weeksInPhase >= 1 ? `Week ${Math.round(weeksInPhase)}` : null,
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
  const recoveryScore   = getRecoveryScore(energyScore, sorenessScore, stressScore);
  const performanceScore = getPerformanceScore(sessionAdherence, prsThisWeek, trainingPerformance);
  const matrix = autoregulationMatrix(recoveryScore, performanceScore);

  let volumeSignal = matrix.volumeDelta;
  let trainingSignal = matrix.trainingSignal;
  const matrixDeload = matrix.deloadFlag && consecutivePoorRecoveryWeeks >= 1;

  // PIPE-002 + PIPE-003 safety cap. A flagged joint pain, or an illness/injury
  // mentioned in the free-text note, blocks progression regardless of the
  // autoregulation read. Pain and illness are safety signals: hold volume and
  // drop any push. It can only cap an increase, never turn a planned reduce or
  // deload into a progress, so a recovery week still reduces as intended.
  const jointPainFlagged = !!(checkin?.jointPain);
  const noteFlags = parseNoteFlags(checkin?.notes);
  const safetyHold = jointPainFlagged || noteFlags.injury || noteFlags.illness;
  let safetyHoldNote = null;
  if (safetyHold && trainingSignal !== 'reduce') {
    if (volumeSignal > 0) volumeSignal = 0;
    if (trainingSignal === 'push') trainingSignal = 'hold';
    safetyHoldNote = jointPainFlagged
      ? 'You flagged joint pain, so the plan holds rather than adding work. Ease the load on the sore movement or swap it for a pain-free variation.'
      : 'You flagged feeling unwell or hurt this week, so the plan holds rather than adding work until it settles.';
  }

  const recoveryFlag = matrixDeload ? 'deload_suggested' : ((poorRecovery || safetyHold) ? 'concerned' : 'normal');
  const loadSignal = trainingSignal === 'push' ? 'progress' : trainingSignal;

  const baseTrainingNote = getTrainingNote(trainingGoal, volumeSignal, trainingSignal, matrixDeload);
  const trainingNote = safetyHoldNote ? `${safetyHoldNote} ${baseTrainingNote}` : baseTrainingNote;

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

  // Adaptive TDEE (decision: "adaptive when confident"). Once there are ~4
  // weeks of weight data, size the calorie change from the actual-vs-expected
  // energy balance instead of a blunt fixed step. computeAdaptiveTDEEAdjustment
  // is already damped (50%) and FFM-floor-clamped; below we only let it RESIZE
  // the change in the SAME direction the simple off-target logic chose (never
  // reverse it), still inside the off-target gate, the 2-week cooldown and the
  // +/-5% cap. Before ~4 weeks, or without a maintenance estimate, the fixed
  // steps stand. The rapid-loss safety boost is never overridden.
  let adaptiveCal = { adjustmentKcal: 0, confidence: 'insufficient_data' };
  // COMP-026 (B): computed on every eligible run (for telemetry + the COMP-004
  // line); only feeds the gain back in when it is active. Default-inert.
  let stepModifier = { gain: 0.5, active: false, direction: 0, reason: 'not_evaluated' };
  let stepTrendApplied = false;
  if (currentMaintenanceKcal && currentCalTarget && Array.isArray(morningWeights) && morningWeights.length >= 14) {
    const adherenceFactor = calsAdherence === 'under' ? 0.9
      : calsAdherence === 'over' ? 1.1
      : 1.0; // 'hit'
    const series = morningWeights
      .filter(w => w && w.weightKg != null && w.loggedAt != null)
      .slice()
      .sort((a, b) => a.loggedAt - b.loggedAt)
      .map(w => ({ weightKg: w.weightKg, date: new Date(w.loggedAt).toISOString() }));
    const ewmaData = nutritionComputeEWMA(series);
    const ffmFloorContext = (recentIntakeAvgKcal != null && recentIntakeDaysLogged >= 5)
      ? {
        weightKg: bodyweightKg ?? series[series.length - 1]?.weightKg ?? null,
        recentIntakeAvgKcal, recentIntakeDaysLogged, bodyFatPercent, bodyFatSource, sex,
      }
      : null;
    const adaptiveArgs = {
      ewmaData,
      prescribedKcal: currentCalTarget,
      currentTDEEEstimate: currentMaintenanceKcal,
      adherenceFactor,
      ffmFloorContext,
      rapidLossOverride,
    };
    adaptiveCal = computeAdaptiveTDEEAdjustment(adaptiveArgs);

    // COMP-026 (B): a sustained step-level shift that AGREES with the direction
    // the weight trend already chose lets the resize update a little faster
    // (gain 0.50 -> max 0.65). The sign is taken from the first (gain-0.50)
    // pass; when the modifier is active we recompute with its gain so every
    // safety clamp (FFM floor, rapid-loss, +/-5% cap) re-applies on top. Steps
    // never produce, size or reverse a change. Never runs on the rapid-loss
    // path (that boost is fixed and senior).
    if (Array.isArray(dailyStepsSeries) && dailyStepsSeries.length && !rapidLossOverride) {
      stepModifier = computeStepTrendModifier({
        stepRows: dailyStepsSeries,
        todayKey: stepsTodayKey || localDayKey(Date.now()),
        adjustmentSign: Math.sign(adaptiveCal.adjustmentKcal),
      });
      if (stepModifier.active && stepModifier.gain !== 0.5) {
        adaptiveCal = computeAdaptiveTDEEAdjustment({ ...adaptiveArgs, updateGain: stepModifier.gain });
      }
    }
  }
  const useAdaptiveCal = adaptiveCal.confidence === 'high';

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
      // Losing too fast, protect muscle (standard, non-compressed)
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

    // Adaptive resize (when confident): use the energy-balance-sized change
    // instead of the fixed step, but only in the SAME direction the logic
    // above chose, and never for the rapid-loss safety boost. This right-sizes
    // the nudge (smaller when the discrepancy is small, avoiding
    // overcorrection) without ever reversing the direction or bypassing a
    // safety gate.
    if (useAdaptiveCal && !rapidLossOverride && change !== 0
        && adaptiveCal.adjustmentKcal !== 0
        && Math.sign(adaptiveCal.adjustmentKcal) === Math.sign(change)) {
      change = adaptiveCal.adjustmentKcal;
      // COMP-026 (B): the applied change was energy-balance-sized AND the step
      // modifier was active and agreed, so this week's change was gain-resized.
      // Drives the COMP-004 line + the CoachOutput receipt. The "moving less"
      // copy is suppressed by the card under any open wellbeing/ED flag.
      stepTrendApplied = stepModifier.active;
    }

    // Cap at ±5% of current target. The rapid-loss compression has
    // its own absolute +300 cap above; the percentage cap can only
    // tighten it further on smaller targets, never relax it.
    if (currentCalTarget > 0) {
      const maxChange = Math.round(currentCalTarget * 0.05);
      change = Math.sign(change) * Math.min(Math.abs(change), maxChange);
    }

    if (change !== 0) {
      // COMP-026 (B) receipt: when the applied change was gain-resized by an
      // active step trend, append one sentence (the WHY_LIBRARY receipt
      // pattern). Rides with calorieAdjustment so it disappears too if a senior
      // clamp (FFM floor / ED lockout) later nulls the change.
      const note = stepTrendApplied
        ? `${calNote} Your step trend backed this up, so the change is sized with more confidence.`
        : calNote;
      calorieAdjustment = { change, note };
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
    Number.isFinite(bodyweightKg) && bodyweightKg > 0 &&
    Number.isFinite(recentIntakeAvgKcal) &&
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

  if (!stepsEnabled) {
    // User opted out of step targets. No step prescription at all; the
    // cardio block below sees the step lever as unavailable and can fire.
    stepsAdjustment = null;
  } else if (phase.isCut && !onTarget && offTargetDirection > 0 && !poorRecovery) {
    if (stepsAvg != null && currentStepsTarget > 0 && stepsAvg < currentStepsTarget * 0.9) {
      // Secondary signal: the user is not even hitting their current target,
      // so raising it would not help. Ask them to hold the current one first.
      stepsAdjustment = {
        target: currentStepsTarget,
        change: 0,
        note: `You averaged ${stepsAvg.toLocaleString('en-GB')} steps against your ${currentStepsTarget.toLocaleString('en-GB')} target. Hit that consistently before adding more.`,
      };
    } else {
      // Losing too slowly, bump steps if room
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
  // When steps are disabled the step lever is unavailable, so treat it as
  // already maxed and let cardio be the next lever the coach reaches for.
  const stepsAtUpperBand = !stepsEnabled || currentStepsTarget >= band.upper;
  const cardioConditionsMet = phase.isCut && !onTarget && offTargetDirection > 0 && stepsAtUpperBand;

  if (cardioConditionsMet && poorRecovery) {
    cardioAdjustment = {
      prescribed: false,
      type: null,
      note: 'Cardio paused this week. Recovery takes priority.',
    };
  } else if (cardioConditionsMet) {
    // Structured target from the cardio engine (tested). P2: when a target was
    // already applied, the next dose reflects actual logged compliance
    // (escalate on hit + still off-trend, hold + explain on miss, capped, never
    // spiral). First time, derive the base cut target. poorRecovery is handled
    // by the branch above, so it is false here. The user still picks the
    // activity (note says "your choice").
    const target = currentCardioTarget
      ? nextCardioTarget({
        currentTarget: currentCardioTarget,
        sessionsLogged: cardioSessionsLogged,
        stillOffTrendInCut: true,
        poorRecovery: false,
        complianceOverride: cardioCompliance,
      })
      : cutCardioTarget(consecutiveOffTargetWeeks, goalPhase);
    cardioAdjustment = {
      prescribed: !target.paused,
      type: target.includesInterval ? 'Cardio boost' : 'Steady cardio',
      note: target.note,
      target,
    };
  }

  // D1 (founder: light acknowledgement): outside a cut the coach sets no cardio
  // target (available, not allocated) but acknowledges cardio the user logged.
  // Factual, non-escalating, no Apply. Null when there is nothing to say.
  let cardioAcknowledgement = null;
  if (!phase.isCut && cardioEnabled && cardioSessionsLogged > 0) {
    const n = cardioSessionsLogged;
    cardioAcknowledgement = `${n} cardio session${n === 1 ? '' : 's'} logged this week. No cardio target in this phase, it stays your call.`;
  }

  // P3: a one-line recovery caution when hard cardio is stacking up, using the
  // week's high-impact count + the recovery signal the coach already has.
  const cardioFlag = cardioWeekSummary
    ? cardioRecoveryFlag({ weekSummary: cardioWeekSummary, recoveryTrendDown: poorRecovery })
    : null;

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
        ? `You've been eating below maintenance for ${weeksInPhase} weeks. A full week at maintenance will let your body reset before continuing.`
        : 'Eight or more consecutive weeks below maintenance is a long stretch. A week at your full calorie need lets your body reset and makes the next stretch more effective.';
    }
  }

  // ── HIGH-DAY / LOW-DAY MACRO CYCLE (GAP row 6) ────────────────────────────
  // Carb cycle for advanced cutters and physique competitors only.
  // Beginner / intermediate cuts stay flat (founder decision
  // 2026-05-27). Protein and fat are held; carbs shift onto training
  // days so the weekly average kcal is unchanged. The split is computed
  // here and surfaced as a confirm-then-apply card; nothing writes until
  // the user taps Apply (CoachOutputScreen.handleApplyMacroCycle).
  let macroCycle = null;
  // Shared gate (coachingGoals.dayCalorieCyclingAllowed): the meal-plan
  // assembler reads the same predicate so the coach card and the plate plan
  // can never disagree on who gets train/rest cycling.
  if (dayCalorieCyclingAllowed({ goalPhase, goalLockAdvanced, trainingGoal })) {
    const trainingDays = Math.max(1, Math.min(6, Math.round(sessionsPlanned)));
    const split = computeMacroCycle(
      { targetKcal: currentCalTarget, proteinG: currentProteinG, carbsG: currentCarbsG, fatG: currentFatG },
      trainingDays,
    );
    if (split) {
      const dayWord = trainingDays === 1 ? 'day' : 'days';
      macroCycle = {
        ...split,
        note: `Carbs move onto your ${trainingDays} training ${dayWord}: ${split.trainingDay.carbsG}g on training days, ${split.restDay.carbsG}g on rest days. Protein and fat stay the same and your weekly average holds at ${currentCalTarget} kcal.`,
      };
    }
  }

  // ── REFEED DAY (GAP row 7) ────────────────────────────────────────────────
  // A single day raised to maintenance via carbs, for aggressive cuts
  // and physique competitors only (matches the refeed entitlement in
  // proGate). The coach proposes it on a cadence (weekly for
  // competitors, every two weeks for an aggressive cut) and the user
  // confirms before the swap. Applying schedules it onto the next
  // training day (CoachOutputScreen.handleApplyRefeed); nothing writes
  // until then. Builds on row 6's day-level framing.
  let refeed = null;
  const refeedEligible = phase.isCut && (goalPhase === 'agg_cut' || isCompetitionGoal(trainingGoal));
  if (refeedEligible) {
    const frequencyWeeks = isCompetitionGoal(trainingGoal) ? 1 : 2;
    const weeksSinceRefeed = lastRefeedAt
      ? Math.floor((Date.now() - lastRefeedAt) / (7 * 86400000))
      : null;
    const due = weeksSinceRefeed === null || weeksSinceRefeed >= frequencyWeeks;
    if (due) {
      const target = computeRefeedDay({
        targetKcal: currentCalTarget,
        tdee: currentMaintenanceKcal,
        proteinG: currentProteinG,
        fatG: currentFatG,
      });
      if (target) {
        refeed = {
          ...target,
          frequencyWeeks,
          note: `Take a refeed on your next training day. Eat up to ${target.kcal} kcal, lifting carbs to ${target.carbsG}g while protein and fat stay the same. A day at maintenance during a long cut helps protect training and hormones.`,
        };
      }
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
    whatWorking.push(`You hit all ${sessionsPlanned} of your sessions.`);
  } else if (sessionAdherence >= 0.75) {
    whatWorking.push(`You hit ${sessionsCompleted} of your ${sessionsPlanned} sessions.`);
  }

  if (prsThisWeek > 0) {
    whatWorking.push(`You set ${prsThisWeek} new PR${prsThisWeek > 1 ? 's' : ''} this week.`);
  }

  // Prefer the registered/entered average; fall back to the legacy subjective
  // chip for old check-ins that only carry stepsAdherence.
  if (stepsEnabled && stepsAvg != null && currentStepsTarget > 0) {
    if (stepsAvg >= currentStepsTarget) {
      whatWorking.push(`You hit your step target, averaging ${stepsAvg.toLocaleString('en-GB')} a day.`);
    } else if (stepsAvg >= currentStepsTarget * 0.9) {
      whatWorking.push(`You came close to your step target, averaging ${stepsAvg.toLocaleString('en-GB')} a day.`);
    }
  } else if (stepsEnabled && stepsAdherence === 'hit') {
    whatWorking.push('You hit your step target.');
  } else if (stepsEnabled && stepsAdherence === 'mostly') {
    whatWorking.push('You came close to your step target.');
  }

  if (calsAdherence === 'hit') {
    whatWorking.push('You hit your calorie target.');
  }

  if (excellentRec) {
    whatWorking.push('Your energy and recovery were strong.');
  } else if (!poorRecovery && energyScore != null) {
    whatWorking.push('Your recovery was in range.');
  }

  if (onTarget && weightDelta != null) {
    whatWorking.push(`Your weight trend is on target (${rateLabel}).`);
  }

  // Fallback, only when literally nothing to say
  if (whatWorking.length === 0) {
    whatWorking.push('You logged your check-in.');
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

  // ── PRIMARY (U-B-1 §2) ────────────────────────────────────────────────────
  // Surface the engine's EXISTING single-winner priority (whyKeys[0], the
  // deterministic ladder above) as a structured field so the CoachOutput hero
  // reflects the engine's own top decision rather than a screen heuristic.
  // Additive + deterministic: it reads the already-computed ladder and changes
  // nothing about which adjustments fire, any threshold, or the confirm-then-
  // apply contract. ED-safety reasons (ffm_floor_hold, rapid_loss_corrected)
  // and the holding state map to domain:null — they are shown by the always-
  // visible safety/lead zone and must NEVER become a collapsible/applyable hero.
  const PRIMARY_DOMAIN_BY_WHY = {
    deload_suggested: 'deload',
    diet_break_suggested: 'dietBreak',
    recovery_lagging: 'training',
    push_volume: 'training',
    off_target_cal_up: 'calories',
    off_target_cal_down: 'calories',
    steps_bump: 'steps',
  };
  const primaryReasonKey = whyKeys[0] ?? null;
  const primary = {
    domain: PRIMARY_DOMAIN_BY_WHY[primaryReasonKey] ?? null,
    reasonKey: primaryReasonKey,
  };

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
    // U-B-1 §2: the engine's top decision, derived from whyKeys[0] above.
    primary,
    // P3 cardio recovery caution (one line or null); D1 non-cut acknowledgement
    // (one line or null). Both plain notes, no Apply.
    cardioFlag,
    cardioAcknowledgement,
    whyThisWeek,
    deloadSuggested,
    deloadNote,
    dietBreakSuggested,
    dietBreakNote,
    dietBreakWeeksInDeficit,
    macroCycle,
    refeed,
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
    // PIPE-002 / PIPE-003: surface the safety context so the caller and
    // telemetry can see why progression was held this week.
    jointPainFlagged,
    safetyHold,
    noteFlags,
    goalPhase,
    differential_output,
    // COMP-026 (B): the full modifier result for telemetry
    // (step_tdee_modifier_evaluated) and the COMP-004 trend line. stepTrendApplied
    // is true only when an applied calorie change THIS run was actually
    // gain-resized AND survived every senior safety clamp (FFM floor / ED
    // lockout can null the change after the resize, in which case it is false).
    stepModifier,
    stepTrendApplied: stepTrendApplied && calorieAdjustment != null,
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
    // U-B-1 §2: this path has no applyable adjustment to hero — the lead/holding
    // state shows instead (domain null), reasonKey mirrors whyThisWeek.
    primary: { domain: null, reasonKey: 'stabilise_sessions' },
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
