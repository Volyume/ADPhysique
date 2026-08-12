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
import {
  shouldSuggestDietBreak,
  computeFFMFloor,
  resolveFfmFloorWeightKg,
  computeAdaptiveTDEEAdjustment,
  computeStepTrendModifier,
  computeEWMA as nutritionComputeEWMA,
} from './nutritionEngine';
import { localDayKey } from './dayKey';
import { robustTrackingLatest, robustTrackingSevenDaysAgoPoint } from './robustTrend';
import { computeMacroCycle, computeRefeedDay } from './coachApply';
import { detectEdPatternFlag, hasEdPatternCleared } from './edPatternDetector';
import { detectDifferentialTrigger } from './differentialPaywall';
import { cycleTrendAnnotation } from './cyclePhase';

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
  // trend with NaN. F3 (EN-6): non-positive weights are corrupt rows too — a
  // single 0 kg import/sync artefact drags the EWMA hard enough to fire a fake
  // rapid-loss/ED signal from noise.
  const clean = weights.filter((w) => w && Number.isFinite(Number(w.weightKg)) && Number(w.weightKg) > 0);
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
export function computeWeeklyTrendPct(morningWeights, currentBodyweightKg = null, nowMs = Date.now()) {
  if (!morningWeights || morningWeights.length < 4) return null;
  // C10A RB6-2 (founder-commissioned): the comparator can be a pre-gap
  // point, so the raw difference can describe months of change. This
  // returns a PER-WEEK rate, which is what every consumer's threshold is
  // stated in, so the elapsed span is divided out. No reading is dropped
  // and no threshold moved; a long gap simply stops being read as though
  // both weights were taken a week apart.
  const ewmaNow = getLatestEwma(morningWeights);
  const ewmaPrior = getEwmaSevenDaysAgo(morningWeights, 0.1, nowMs);
  if (ewmaNow == null || ewmaPrior == null) return null;
  const reference = currentBodyweightKg || ewmaNow;
  if (!reference) return null;
  const weeks = elapsedWeeksSinceComparator(weeklyComparatorMs(morningWeights, nowMs), nowMs) ?? 1;
  return (((ewmaNow - ewmaPrior) / reference) * 100) / weeks;
}

/**
 * C10A RB6-2: the timestamp of the comparator the weekly rate is measured
 * against - the most recent EWMA point at or before nowMs - 7d. Exported
 * so the rate can be normalised by the time that actually elapsed.
 */
export function weeklyComparatorMs(morningWeights, nowMs = Date.now()) {
  const cutoff = nowMs - 7 * 86400000;
  let comparatorMs = null;
  for (const w of (Array.isArray(morningWeights) ? morningWeights : [])) {
    const t = Number(w?.loggedAt);
    if (Number.isFinite(t) && t <= cutoff && (comparatorMs == null || t > comparatorMs)) comparatorMs = t;
  }
  return comparatorMs;
}

/**
 * C10A RB6-2: how many weeks actually separate the comparator from now.
 *
 * The rapid-loss and max-safe-loss thresholds are stated PER WEEK. The
 * comparator, however, is only guaranteed to be at or before seven days
 * ago - after a long gap it can be months old, and the raw difference was
 * being handed to a per-week threshold as though the two readings were a
 * week apart. A 6% loss across 180 days was read as -6%/week and tripped
 * a -1.5%/week gate that the true rate (about -0.23%/week) does not.
 *
 * Dividing by the elapsed span is the whole fix: it keeps every reading
 * (so a genuine large loss is never discarded, which is what a freshness
 * cut-off would have risked), invents no new duration, and leaves the
 * threshold itself untouched. Floored at 1 so a comparator exactly seven
 * days old behaves exactly as it always has.
 */
export function elapsedWeeksSinceComparator(comparatorMs, nowMs = Date.now()) {
  if (!Number.isFinite(comparatorMs)) return null;
  const days = (nowMs - comparatorMs) / 86400000;
  if (!Number.isFinite(days) || days <= 0) return null;
  return Math.max(1, days / 7);
}

/**
 * C6 RB6-2 (D97-25): is the week-over-week comparator itself recent?
 * The comparator is the most recent timed point at or before nowMs - 7d;
 * a genuine weekly comparison requires it within the 14-day detraining
 * boundary. Exported for the pins.
 */
export function weeklyComparatorFresh(morningWeights, nowMs) {
  const cutoff = nowMs - 7 * 86400000;
  let comparatorMs = null;
  for (const w of (Array.isArray(morningWeights) ? morningWeights : [])) {
    const t = Number(w?.loggedAt);
    if (Number.isFinite(t) && t <= cutoff && (comparatorMs == null || t > comparatorMs)) comparatorMs = t;
  }
  return comparatorMs != null && comparatorMs >= nowMs - 14 * 86400000;
}

/**
 * Returns the EWMA from 7 days ago (approximate), or null.
 * F10 (EN-5): `nowMs` is the injectable clock (defaults to Date.now() for
 * existing callers) so identical inputs give identical outputs. Inside
 * runWeeklyCoach the clock is read ONCE at the entry and threaded down;
 * it is never re-read mid-run.
 */
export function getEwmaSevenDaysAgo(weights, alpha = 0.1, nowMs = Date.now()) {
  const series = computeEWMA(weights, alpha);
  if (series.length < 2) return null;
  const cutoff = nowMs - 7 * 86400000;
  // Find the most recent entry at or before 7 days ago. If none precedes the
  // cutoff the 7-day trend is NOT yet computable — return null rather than
  // falling back to the earliest recent reading (which would treat a sub-7-day
  // span as a full weekly rate and ~2x-overstate loss/gain, feeding a wrong
  // on/off-target verdict and calorie adjustment). D1 #3.
  const older = [...series].reverse().find(e => e.loggedAt <= cutoff);
  return older?.ewmaKg ?? null;
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
      // C10C: the gate counts DISTINCT calendar days (weighInDayCount
      // above), so "3 weigh-ins" was incomplete - three readings on one
      // morning do not satisfy it. The holdMessage already said so; this
      // reason line now matches it.
      reasons: ['Morning weights on fewer than 3 different days this week'],
      holdMessage: "Need morning weights from at least 3 different days for a reliable trend. Calories held this week. Log daily and the next check-in has clean data to act on.",
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

// ─── Photo-corroboration bounded step (D18, founder decision 2026-07-09) ──────
// Founder ruling D18 (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md)
// on plan-F §4.4 (docs/exercise-planning-2026-07-09/plan-F-photo-corroboration.md):
// a strong, ALREADY-AGREEING progress-photo trend may raise the data-confidence
// caption by EXACTLY ONE bounded step, never lower it, never originate it.
//
// The ordered ladder the step walks. 'data_hold' is deliberately absent: a data
// hold is a safety hold and can never be lifted by a photo signal (indexOf
// returns -1 below, so the level is returned unchanged). 'high' is the ceiling
// (the Math.min clamps there).
export const PHOTO_CORROBORATION_CONFIDENCE_LADDER = Object.freeze(['low', 'medium', 'high']);

/**
 * Bounded photo-corroboration step (D18 / plan-F §4.4). A strong, already-
 * agreeing progress-photo trend may raise the data-confidence level by EXACTLY
 * ONE step (low -> medium, medium -> high), never lowering, never originating,
 * never moving 'data_hold', clamped at 'high'. Pure: no I/O, no randomness;
 * same inputs give the same output (deterministic per CLAUDE.md §2).
 *
 * This function ONLY ever returns a level. It has no path into any calorie,
 * macro, training, refeed, diet-break or floor value: the caller (runWeeklyCoach)
 * uses the pre-corroboration `confidence.level` for every decision
 * (offTargetWeeksRequired and everything downstream) and only feeds the raised
 * level into the EMITTED `confidence` display field, so adjustments,
 * heldDecisions and all safety floors stay byte-identical whether or not a scan
 * corroborates (pinned by the bounded-delta safety-floor isolation guard,
 * D18).
 *
 * @param {string} baseLevel - the logs-only confidence level
 *   ('high'|'medium'|'low'|'data_hold').
 * @param {object|null} [photoCorroboration] - caller-supplied signal; the
 *   engine never reads a scan itself.
 * @param {boolean} photoCorroboration.eligible - true only for a scored scan
 *   at Moderate+ confidence with 3+ comparable points (caller-derived from the
 *   v2 evidence packet's eligibleForAssessment).
 * @param {string|null} photoCorroboration.direction - 'supports' (agrees with
 *   the decision the logs already leaned toward) raises one step; 'conflicts'
 *   and null never move the level (the rule never lowers and never originates).
 * @param {object} [opts]
 * @param {boolean} [opts.suppressed=false] - when true (calm mode / open or
 *   just-fired ED flag / any safety hold) the level is returned unchanged.
 * @returns {string} the (possibly) one-step-raised level.
 */
export function corroborateConfidenceLevel(baseLevel, photoCorroboration, { suppressed = false } = {}) {
  if (suppressed) return baseLevel;
  if (!photoCorroboration || photoCorroboration.eligible !== true) return baseLevel;
  if (photoCorroboration.direction !== 'supports') return baseLevel; // never lowers, never originates
  const idx = PHOTO_CORROBORATION_CONFIDENCE_LADDER.indexOf(baseLevel);
  if (idx < 0) return baseLevel; // 'data_hold' or unknown: never moved
  return PHOTO_CORROBORATION_CONFIDENCE_LADDER[Math.min(idx + 1, PHOTO_CORROBORATION_CONFIDENCE_LADDER.length - 1)];
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
  // read towards a hold, never improve it, so the matrix won't push more volume
  // onto someone who is frazzled outside the gym. Below 4 (high) it's left to
  // energy and soreness as before, so existing behaviour is unchanged.
  const st = stressScore ?? null;
  if (st != null && st >= 4 && score < 3) score = 3;
  return score;
}

// Stage 4 (§3.3, founder order 2026-08-09): strong PR evidence is DENSITY,
// not a binary. Roughly one all-time PR per three completed sessions.
const PR_DENSITY_STRONG = 0.3;
// A caller-supplied block e1RM slope at or above this reads as strong
// performance even without all-time PRs (returning users progress for
// weeks below old bests; the binary missed them entirely).
const BLOCK_SLOPE_STRONG_PCT = 1.5;

/**
 * Maps training data to a performance score 1–4.
 * trainingPerformance: 'exceeded' | 'hit' | 'struggled' | 'dropped' | null
 *
 * Stage 4 (§3.3): the old top-grade route "any PR + adherence" over-
 * rewarded a single cheap PR every time. With the completed-session count
 * available the top grade needs PR DENSITY (or a real block e1RM slope,
 * caller-supplied); without a session count the legacy binary stands so
 * older callers are unchanged.
 */
function getPerformanceScore(sessionAdherence, prsThisWeek, trainingPerformance, sessionsCompleted = null, blockE1rmSlopePct = null) {
  const prStrong = sessionsCompleted != null && sessionsCompleted > 0
    ? prsThisWeek / sessionsCompleted >= PR_DENSITY_STRONG
    : prsThisWeek > 0;
  const slopeStrong = blockE1rmSlopePct != null && blockE1rmSlopePct >= BLOCK_SLOPE_STRONG_PCT;
  if (trainingPerformance === 'exceeded' || ((prStrong || slopeStrong) && sessionAdherence >= 0.9)) return 1;
  if (trainingPerformance === 'dropped' || sessionAdherence < 0.5) return 4;
  if (trainingPerformance === 'struggled' || sessionAdherence < 0.75) return 3;
  if (trainingPerformance === 'hit' || sessionAdherence >= 0.75) return 2;
  return 2;
}

/**
 * Stage 4 (founder order 2026-08-09, blueprint §3.3; cause-gating from
 * the Stage 4 adversarial review): week-in-block fatigue context. An
 * observed recovery grade 3 in the block's PEAK week (the final
 * accumulation week) is the ramp doing its job — expected accumulating
 * fatigue — so the push/hold branch reads it as a 2. The softening is
 * STRICTLY cause-gated: only a grade 3 caused by SORENESS with decent
 * energy and no high life stress is the ramp talking. A grade 3 from
 * low energy or high stress (PIPE-001: stress can only worsen the read,
 * never improve it) is never softened. It is also NEVER softened when:
 * the grade is 4 (deload thresholds untouched), the week is anything
 * but the peak (an early grade 3 is a genuine early warning), or the
 * fatigue is persistent — EITHER counter (>= 1 prior poor-recovery week
 * or >= 1 prior grade-3 soreness week) means it predates the peak.
 * Blocks shorter than 3 accumulation weeks have no meaningful ramp to
 * accumulate fatigue from, so no softening there either.
 */
function contextAdjustedRecovery(recoveryScore, {
  blockWeekIndex = null,
  blockAccumWeeks = null,
  consecutivePoorRecoveryWeeks = 0,
  consecutiveGrade3RecoveryWeeks = 0,
  sorenessScore = null,
  energyScore = null,
  stressScore = null,
} = {}) {
  const isPeakWeek = Number.isFinite(blockWeekIndex) && Number.isFinite(blockAccumWeeks)
    && blockAccumWeeks >= 3 && blockWeekIndex === blockAccumWeeks;
  const sorenessDriven = sorenessScore != null && sorenessScore >= 3
    && (energyScore == null || energyScore >= 3)
    && (stressScore == null || stressScore < 4);
  if (recoveryScore === 3 && isPeakWeek && sorenessDriven
    && consecutivePoorRecoveryWeeks < 1 && consecutiveGrade3RecoveryWeeks < 1) return 2;
  return recoveryScore;
}

/**
 * Autoregulation matrix: recovery (1–4) × performance (1–4) → volume signal.
 * Returns: { volumeDelta: -2|-1|0|1|2|3, trainingSignal: 'reduce'|'hold'|'push', deloadFlag: boolean }
 *
 * Stage 4: `recoveryForPush` is the week-context-adjusted recovery grade
 * used ONLY by the hold/push branches; the deload branch always reads the
 * RAW grade (the founder red line: deload thresholds unchanged).
 */
function autoregulationMatrix(recoveryScore, performanceScore, recoveryForPush = recoveryScore) {
  // Deload: recovery 4 regardless of performance, or both 3+4 — RAW grade.
  if (recoveryScore === 4 || (recoveryScore >= 3 && performanceScore >= 4)) {
    return { volumeDelta: -2, trainingSignal: 'reduce', deloadFlag: true };
  }
  // Hold: either dimension is 3 (but not both at extreme)
  if (recoveryForPush === 3 || performanceScore === 3) {
    return { volumeDelta: 0, trainingSignal: 'hold', deloadFlag: false };
  }
  // Push: both at 1 or 2
  if (recoveryForPush === 1 && performanceScore === 1) {
    return { volumeDelta: 3, trainingSignal: 'push', deloadFlag: false };
  }
  if (recoveryForPush === 1 || performanceScore === 1) {
    return { volumeDelta: 2, trainingSignal: 'push', deloadFlag: false };
  }
  // Both 2
  return { volumeDelta: 1, trainingSignal: 'push', deloadFlag: false };
}

// ─── Phase configuration ──────────────────────────────────────────────────────

// EN-4 (founder rulings 2026-07-02): the dead agg_cut/mod_cut rows are gone —
// coachingGoals.phaseToCoachingKey has never emitted them, so no stored user
// can hold them (an unknown key falls back to maint below). recomp is LIVE:
// the recomp phase maps here at -0.125 %/wk instead of aliasing to maint.
// recomp is deliberately NOT a cut (isCut: false): it must never gain the cut
// levers (calorie resize, refeed, diet break, macro cycling) — pinned by
// phaseVocab.en4.replay.test.js V3.
const PHASE_CONFIG = {
  mild_cut:  { label: 'Mild cut',        goalRatePct: -0.375, isCut: true, isBulk: false },
  recomp:    { label: 'Hold muscle, lose fat', goalRatePct: -0.125, isCut: false, isBulk: false },
  maint:     { label: 'Maintenance',     goalRatePct: 0,      isCut: false, isBulk: false },
  mild_bulk: { label: 'Lean bulk',       goalRatePct: 0.1875, isCut: false, isBulk: true },
  mod_bulk:  { label: 'Lean bulk',       goalRatePct: 0.375,  isCut: false, isBulk: true },
};

// Steps target bands by phase (lower, upper in steps/day)
const STEPS_BANDS = {
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
    "Recovery's good and your lifts are moving, so there's a bit more work in the plan this week.",
  ],
  // D15 (founder ruling 2026-07-09): fires only when exceededEscalationApplied
  // is true, i.e. only on the week the bounded one-step escalation actually
  // moves a number. No streak/shame framing, no mention of weight, body or
  // intake (training-volume-only), matches the existing push_volume register.
  exceeded_escalation: [
    "You have been ahead of your plan for three weeks running, so your coach is moving you along a little faster this week.",
  ],
  low_data_weight: [
    "Weight data is thin this week. The trend will sharpen with more daily logs.",
  ],
  ffm_floor_hold: [
    "Your calorie target holds. Your seven-day average intake is at or below the safety floor for your lean mass.",
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
 * @param {string}        inputs.goalPhase                  - 'mild_cut'|'recomp'|'maint'|'mild_bulk'|'mod_bulk' (or the 'bulk' alias)
 * @param {number}        inputs.weeksInPhase               - weeks since phase was set
 * @param {number|null}   inputs.evidencedWeeksInPhase      - C6 P-2 (D97-20): distinct weeks in this
 *   phase with a saved weekly run, caller-derived. Bounds CLAIM copy only (week label, diet-break
 *   wording); never the phase clock, gates or triggers. Null = claims behave as before.
 * @param {number}        inputs.consecutiveOffTargetWeeks  - weeks trend has been off-target same direction
 * @param {number}        inputs.consecutivePoorRecoveryWeeks
 * @param {number}        inputs.consecutiveExceededWeeks   - D15 (founder ruling 2026-07-09): consecutive
 *   PRIOR weeks whose check-in trainingPerformance verdict was 'exceeded' (checkinDerive.js's
 *   over-performance case). Caller-derived from logged history exactly like the two counters
 *   above; gates the bounded one-step volume escalation below, never invents the underlying signal.
 * @param {boolean}       inputs.calmMode                   - D15: wellbeing calm-mode read. Gates ONLY
 *   the sustained over-performance escalation (never the base weekly push signal, which stays
 *   unsuppressed like every other training-only surface in this file).
 * @param {number|null}   inputs.blockWeekIndex             - Stage 4: live block week (1-based); null when
 *   no live block (including completed_awaiting_decision).
 * @param {number|null}   inputs.blockAccumWeeks            - Stage 4: accumulation weeks (plannedWeeks - 1).
 * @param {number|null}   inputs.blockE1rmSlopePct          - Stage 4 seam: block-so-far e1RM slope from
 *   blockMetrics (Stage 6 wires it); an alternative strong-performance route to PR density.
 * @param {string|null}   inputs.lastCalAdjustmentDirection - 'up'|'down'|null
 * @param {number}        inputs.lastCalAdjustmentWeeksAgo  - weeks since last cal change (cooldown)
 * @param {number|null}   inputs.currentCalTarget           - kcal/day, or null if not set
 * @param {number}        inputs.currentStepsTarget
 * @param {number|null}   inputs.bodyweightKg
 * @param {string}        inputs.units                      - 'kg'|'lbs'
 * @param {boolean}       inputs.scoffPositive              - wellbeing screen was positive; gates deficit suggestions
 * @param {number}        [inputs.nowMs]                    - injectable clock (epoch ms); defaults to Date.now()
 */
export function runWeeklyCoach(inputs) {
  const {
    // F10 (EN-5): the engine's single clock read. Every time-anchored read in
    // this run (7-day trend cutoff, steps today-key fallback, diet-break weeks,
    // refeed cadence, ED-detector trend) uses this ONE value, so identical
    // inputs + the same nowMs give byte-identical outputs. Defaulting here at
    // the public entry keeps every existing caller unchanged; the clock is
    // never read a second time inside the run.
    nowMs = Date.now(),
    checkin,
    morningWeights = [],
    sessionsCompleted: _sessionsCompletedRaw = 0,
    sessionsPlanned: _sessionsPlannedRaw = 3,
    prsThisWeek: _prsThisWeekRaw = 0,
    goalPhase = 'maint',
    trainingGoal = null,
    weeksInPhase: _weeksInPhaseRaw = 1,
    // C6 P-2 (D97-20): distinct weeks in this phase with real coached
    // evidence (saved weekly runs), caller-derived like the consecutive-week
    // counters. The phase CLOCK is untouched (gates, deload and diet-break
    // triggers still read wall-clock weeksInPhase); this input only bounds
    // the CLAIMS the run makes about the user's past, so months away can
    // never be narrated as continuously coached months. Null (every legacy
    // caller) keeps claims byte-identical to before.
    evidencedWeeksInPhase: _evidencedWeeksRaw = null,
    goalStartDate = null,
    consecutiveOffTargetWeeks = 0,
    consecutivePoorRecoveryWeeks = 0,
    // D15 (founder ruling 2026-07-09, plan-G section 3): sustained
    // over-performance counter, threaded in exactly like the two counters
    // above rather than recomputed inside the engine, so the engine stays
    // pure and the derivation lives with the other consecutive-week reads
    // at the caller (CoachOutputScreen). Default 0 keeps every existing
    // caller (tests, the simulator harness) byte-identical.
    consecutiveExceededWeeks = 0,
    // D15: defaults false so every existing caller is unaffected. See the
    // ED-SAFETY note above the escalation block below for why this is the
    // one training-only signal in this file that IS calm-mode-gated.
    calmMode = false,
    // Stage 4 (2026-08-09, blueprint §3.3): week-in-block fatigue context.
    // blockWeekIndex is the live block week (1-based); blockAccumWeeks the
    // number of accumulation weeks (plannedWeeks - 1). Callers pass null
    // when no live block exists (including a finished block awaiting its
    // decision), which keeps the engine byte-identical to before.
    blockWeekIndex = null,
    blockAccumWeeks = null,
    // Stage 4 seam: a caller-supplied block-so-far e1RM slope (%) from
    // blockMetrics.computeBlockPerformance; Stage 6 wires it. Null keeps
    // the legacy PR-only performance read.
    blockE1rmSlopePct = null,
    // Stage 4 review remediation: consecutive prior weeks whose check-in
    // soreness was already grade-3 territory (sorenessScore >= 3),
    // caller-derived like the sibling counters. The poor-recovery counter
    // only sees energy <= 2 / soreness >= 4, so without this a user sore
    // every single week would still read as "expected peak fatigue".
    consecutiveGrade3RecoveryWeeks = 0,
    // D18 (founder decision 2026-07-09, plan-F §4.4): optional caller-supplied
    // photo-corroboration signal, { eligible: boolean, direction: 'supports' |
    // 'conflicts' | null }. Defaults null so every existing caller is
    // byte-identical. It can ONLY raise the EMITTED data-confidence caption by
    // one bounded step (see the PHOTO CORROBORATION block before the return);
    // it never reaches any calorie/macro/training/floor path. The engine never
    // reads a scan itself — the caller derives this from the v2 evidence packet.
    photoCorroboration = null,
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
    // Whether a daily step target is in play. DORMANT IN PRODUCTION
    // (comment corrected 2026-08-10, Campaign 4 review; behaviour
    // unchanged). It used to say the user opts out "at setup or in
    // Settings" - there is no such control, and there never is one today:
    // the ONLY production call site (CoachOutputScreen: "Step targets are
    // not part of the shipped coaching product") passes stepsEnabled:false
    // with currentStepsTarget:0, so every branch below that needs a step
    // target is unreachable in the shipped app. The default stays true so
    // prior callers and the engine's own tests are unchanged. Whether to
    // revive or retire the steps lever is an open product call, recorded
    // as founder item FR-C4-11. When false the coach makes no step
    // prescription; any deficit change comes from the calorie side.
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
    // Campaign 1 P0-7 D1: true when the intake read THREW (as opposed to a
    // genuinely empty diary). The FFM floor gate cannot evaluate without
    // intake, so a failed read holds any calorie CUT rather than letting
    // the cut proceed floor-blind.
    intakeReadFailed = false,
    // Wave-3 review + founder decision 2026-07-02: epoch ms of the most
    // recently COMPLETED weekly check-in (the caller reads it from the
    // check-in store). Gates B1's food-diary stand-in: a skipped week only
    // adjusts while a completed check-in exists within the last 14 days,
    // because the cycle flag, energy score and most ED-detector signals
    // only exist inside a check-in. Missing/unknown fails toward the freeze.
    lastCheckinAt = null,
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
  // C6 P-2 (D97-20): evidence-bounded phase claims. weeksInPhase stays the
  // wall-clock phase clock for every gate and trigger (NOT reset, NOT
  // decayed - D91-25 untouched). But copy that asserts what the user has
  // been doing ("Week N", "below maintenance for N weeks") must not count
  // weeks with no coached evidence. A one-week tolerance absorbs the
  // boundary week either side of a phase start, so a continuously coached
  // user's numbers are unchanged; a genuine gap switches the claims to the
  // evidenced count and to set-age wording that asserts only provable facts.
  const evidencedWeeksInPhase = Number.isFinite(_evidencedWeeksRaw)
    ? Math.max(1, Math.min(weeksInPhase, Math.round(_evidencedWeeksRaw)))
    : null;
  const phaseClaimGap = evidencedWeeksInPhase != null && evidencedWeeksInPhase < weeksInPhase - 1;
  const claimedWeeksInPhase = phaseClaimGap ? evidencedWeeksInPhase : weeksInPhase;

  // ── DATA CONFIDENCE ───────────────────────────────────────────────────────
  // F10 (EN-8): "this week's weigh-ins" counts DISTINCT local calendar days,
  // not raw rows. morningWeights spans ~14 days and can carry same-day
  // duplicates (re-weighs, import/sync artefacts), so the raw row count let
  // three weigh-ins on ONE day pass the 3-weigh-in gate as a week of data.
  // Timestamped rows are deduped by localDayKey and windowed to the 7 days
  // ending at the most recent weigh-in (data-anchored, not clock-anchored, so
  // the read stays pure); rows without a usable timestamp cannot be deduped or
  // windowed and keep counting one each, exactly as before. The result is
  // always <= the old row count, so this gate can only ever HOLD more than
  // before — never adjust more.
  const weighInDayCount = (() => {
    const rows = (Array.isArray(morningWeights) ? morningWeights : []).filter(Boolean);
    const timed = rows.filter((w) => Number.isFinite(Number(w.loggedAt)));
    const untimed = rows.length - timed.length;
    if (!timed.length) return untimed;
    // C6 R-1 (D97-22): the week window is anchored on nowMs, the engine's
    // one injected clock - NOT on the newest row. Data-anchoring meant a
    // user whose last seven weigh-ins were six months ago scored a full
    // week of "this week's" data, cleared the hold at high confidence and
    // could be cut on a trend that was never measured. Clock-anchoring is
    // strictly more conservative: the count can only fall, so the data
    // hold can only fire MORE often, never less. Purity is unchanged
    // (nowMs is already a pure input; every sibling window uses it).
    const weekWindowStartMs = nowMs - 7 * 86400000;
    const distinctDays = new Set(
      timed
        .filter((w) => Number(w.loggedAt) >= weekWindowStartMs)
        .map((w) => localDayKey(Number(w.loggedAt))),
    );
    return distinctDays.size + untimed;
  })();
  const confidence = assessDataConfidence({
    weigh_ins: weighInDayCount,
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
      // D18: a data hold is a safety hold — corroboration can never lift it,
      // and it is blocked from surfacing. Emitted here for output-shape parity
      // with the main-card return.
      photoCorroborationApplied: false,
      photoCorroborationBlocked: true,
      weekLabel: `Week ${Number.isFinite(claimedWeeksInPhase) ? Math.round(claimedWeeksInPhase) : 1} · ${phaseConfig(goalPhase).label}`,
      trend: { ewma7: ewmaNow, delta: null, onTarget: false, deltaLabel: 'Log morning weight', rateLabel: null },
      whatWorking: ['Check-in saved.'],
      adjustments: { training: { signal: 'hold', note: 'Plan unchanged. A few more weigh-ins needed to act on.' }, calories: null, steps: null },
      whyThisWeek: confidence.holdMessage,
      deloadSuggested: false, deloadNote: null, dietBreakSuggested: false, dietBreakNote: null,
      heldDecisions: [],
      rapidWeightLossFlag: false,
      ffmFloorHeld: false,
      ffmFloorContext: null,
      adherenceNote: null, prsThisWeek, sessionsCompleted, sessionsPlanned,
      volumeSignal: 0, loadSignal: 'hold', recoveryFlag: 'normal', goalPhase,
      exceededEscalationApplied: false,
      peakWeekContextApplied: false,
      // D16: no adjustments exist on this path (all null above), so there is
      // nothing an autonomous mode could auto-apply either way.
      autoApplyHoldActive: false,
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
  const ewma7LastWk  = morningWeights.length >= 3 ? getEwmaSevenDaysAgo(morningWeights, 0.1, nowMs) : null;
  const bwRef        = bodyweightKg ?? ewma7Today ?? null;

  // C6 R-1 (D97-22): when every weigh-in predates the seven-day window,
  // "today's" EWMA and "last week's" EWMA are the SAME stale point and the
  // delta degenerates to 0 - which read as "+0kg this week" / "stable"
  // about a week with no readings. A week with no readings has no delta:
  // null, so deltaLabel falls back to its honest 'Log morning weight'.
  const latestWeighInMs = (() => {
    const timed = (Array.isArray(morningWeights) ? morningWeights : [])
      .map((w) => Number(w?.loggedAt)).filter(Number.isFinite);
    return timed.length ? Math.max(...timed) : null;
  })();
  const weekHasReadings = latestWeighInMs != null && latestWeighInMs >= nowMs - 7 * 86400000;
  // C6 RB6-2 (D97-25): the OTHER end of the comparison must be recent
  // too - on the first weigh-ins back the comparator was a pre-gap point
  // and a months-long change was spoken (and safety-flagged) as "this
  // week". Both guards feed every consumer downstream: display, the
  // rapid-loss flag (via actualRatePct) and the decision trend below.
  const comparatorFresh = weeklyComparatorFresh(morningWeights, nowMs);

  const weightDelta  = (weekHasReadings && ewma7Today != null && ewma7LastWk != null)
    ? Math.round((ewma7Today - ewma7LastWk) * 100) / 100
    : null;

  // C10A RB6-2: same normalisation as computeWeeklyTrendPct, and it must
  // be the same or the rapid-loss flag and the ED detector would read the
  // same weigh-ins as two different rates. weightDelta is measured against
  // the comparator found below, so the span is divided out here too.
  const comparatorWeeks = elapsedWeeksSinceComparator(
    weeklyComparatorMs(morningWeights, nowMs), nowMs,
  ) ?? 1;
  const actualRatePct = (weightDelta != null && bwRef)
    ? ((weightDelta / bwRef) * 100) / comparatorWeeks
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
  const robustPriorPoint = morningWeights.length >= 3
    ? robustTrackingSevenDaysAgoPoint(morningWeights, {}, nowMs) : null;
  const robustPrior = robustPriorPoint?.ewmaKg ?? null;
  const robustWeightDelta = (robustNow != null && robustPrior != null)
    ? Math.round((robustNow - robustPrior) * 100) / 100
    : null;
  // C10B: this rate is compared against phase.goalRatePct, which is stated
  // PER WEEK, so the elapsed span has to be divided out here too. The
  // sub-week direction was already guarded (robustTrackingSevenDaysAgo
  // returns null rather than scaling a 2-4 day span up); the super-week
  // direction was not, so a comparator months old had its whole change
  // read as one week's. That is the DECISION read: it drives onTarget and
  // offTargetDirection, and through them the calorie adjustment - a 4%
  // loss across 90 days read as -4%/week flipped the verdict from
  // "slower than target" to "faster than target" and moved calories the
  // wrong way. Same helper as the safety path, so the two cannot disagree
  // about how long a gap was; no threshold or policy is touched.
  const robustWeeks = elapsedWeeksSinceComparator(robustPriorPoint?.loggedAt ?? null, nowMs) ?? 1;
  const robustRatePct = (robustWeightDelta != null && bwRef)
    ? ((robustWeightDelta / bwRef) * 100) / robustWeeks
    : null;
  // Fall back to the plain rate when there isn't enough data for the robust read.
  const decisionRatePct = robustRatePct != null ? robustRatePct : actualRatePct;

  // On-target band: proportional to the goal rate, but never tighter than
  // 0.15 %/week — real morning-weigh-in noise. Without the floor, maintenance
  // (goalRatePct 0) collapsed to a ±0.05 %/week band and judged normal noise as
  // off-target (wrong verdict/copy). The floor only WIDENS the band for low-goal
  // phases; cut/bulk bands are unchanged, and it never makes the coach more
  // eager to declare off-target. Rapid-loss safety reads the plain trend
  // separately and is unaffected. D1 #6.
  const onTargetBand = Math.max(0.2 * Math.abs(phase.goalRatePct) + 0.05, 0.15);
  const onTarget = (decisionRatePct != null)
    ? Math.abs(decisionRatePct - phase.goalRatePct) <= onTargetBand
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

  // C6 RB6-2 CLAIM half (D97-25, lead-ruled; the safety half is
  // founder-gated): when the week-over-week comparator is a pre-gap
  // point, the change is real but it is NOT "this week" and NOT a
  // "/wk" rate - a six-month loss was being narrated in per-week
  // vocabulary on the surface that decides about food. Wording only;
  // every numeric consumer is untouched pending the founder's fork.
  const deltaLabel = displayDelta
    ? (comparatorFresh ? `${displayDelta} this week` : `${displayDelta} since you last logged regularly`)
    : enoughWeightData ? 'Calculating…' : 'Log morning weight';

  const rateLabel = weightDelta != null
    ? (comparatorFresh
      ? (weightDelta > 0.01 ? `gaining ${Math.abs(weightDelta)}${u}/wk` :
         weightDelta < -0.01 ? `losing ${Math.abs(weightDelta)}${u}/wk` : 'stable')
      : (Math.abs(weightDelta) <= 0.01 ? 'little change across the gap'
        : `${weightDelta > 0 ? 'up' : 'down'} ${Math.abs(weightDelta)}${u} across the gap`))
    : null;

  // ── Week label ────────────────────────────────────────────────────────────
  const weekLabel = [
    Number.isFinite(claimedWeeksInPhase) && claimedWeeksInPhase >= 1 ? `Week ${Math.round(claimedWeeksInPhase)}` : null,
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

  // Adherence gate (Andy Morgan rule): < 50% sessions → stabilise first.
  // Campaign 1 P0-7 D5: an unknown denominator routes to the stabilise
  // path (0), never to "perfect adherence" (1) - matching interBlock's
  // protective plannedSets > 0 ? ... : 0 posture.
  const sessionAdherence = sessionsPlanned > 0 ? sessionsCompleted / sessionsPlanned : 0;
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
  const performanceScore = getPerformanceScore(sessionAdherence, prsThisWeek, trainingPerformance, sessionsCompleted, blockE1rmSlopePct);
  // Stage 4: the deload branch inside the matrix always reads the RAW
  // recovery grade; only hold/push read the week-context adjustment,
  // which is cause-gated (soreness-driven only) and persistence-gated.
  const recoveryForPush = contextAdjustedRecovery(recoveryScore, {
    blockWeekIndex, blockAccumWeeks, consecutivePoorRecoveryWeeks,
    consecutiveGrade3RecoveryWeeks, sorenessScore, energyScore, stressScore,
  });
  const peakWeekContextApplied = recoveryForPush !== recoveryScore;
  const matrix = autoregulationMatrix(recoveryScore, performanceScore, recoveryForPush);

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

  // Stage 4 review remediation: a context-softened push must never borrow
  // the generic "recovery is excellent" push copy — the user just reported
  // real (expected) fatigue. Name the actual mechanism instead.
  const baseTrainingNote = peakWeekContextApplied && trainingSignal === 'push'
    ? 'Peak-week fatigue is part of the plan, not a warning. Strong work; your recovery week lands next.'
    : getTrainingNote(trainingGoal, volumeSignal, trainingSignal, matrixDeload);
  // D15: reassignable. The sustained-escalation block below only ever
  // overwrites this AFTER confirming safetyHold is false (so safetyHoldNote
  // is guaranteed null at that point) and recomputes it from the same
  // getTrainingNote helper with the escalated volumeSignal, never hand-rolling
  // new copy.
  let trainingNote = safetyHoldNote ? `${safetyHoldNote} ${baseTrainingNote}` : baseTrainingNote;

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

  // B1: a real food diary (>= 5 logged days this week) is an adherence record
  // in its own right, so a SKIPPED check-in no longer freezes recalibration —
  // the check-in stays the wellbeing/safety capture and the moment the
  // adjustment is presented, but the maths refreshes weekly from weights +
  // rollups. Without food data the old rule stands: untracked never adjusts.
  // Founder decision 2026-07-02 (Wave-3 review): the stand-in only unfreezes
  // recalibration while the wellbeing capture has not gone dark. One skipped
  // week still adjusts (B1's point); a user with no completed check-in in the
  // last 14 days returns to the old freeze. This week's own check-in counts.
  // C6 P-4 (D97-20): "completed check-in" means a row with check-in
  // ANSWERS. The sleep-only row a workout summary writes is not wellbeing
  // capture (same evidence rule as the recovery counters and FB-36), so it
  // can neither stand as this week's check-in here nor - via the caller's
  // lastCheckinAt - hold the 14-day gate open. Stricter only: without a
  // real check-in the recalibration freeze stands, exactly the founder
  // decision's stated intent.
  const checkinCompleted = !!checkin
    && (checkin.energyScore != null || checkin.sorenessScore != null || checkin.calsAdherence != null);
  const checkinRecentEnough = checkinCompleted
    || (Number.isFinite(lastCheckinAt) && (nowMs - lastCheckinAt) <= 14 * 86400000);
  const foodDiaryStandsIn = recentIntakeDaysLogged >= 5
    && Number(recentIntakeAvgKcal) > 0
    && checkinRecentEnough;
  const canAdjustCals = (
    !cycleOverride &&
    !scoffPositive &&
    currentCalTarget != null &&
    (calsAdherence !== 'untracked' || foodDiaryStandsIn) &&
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
      // F3 (EN-6): > 0, matching computeEWMA — a corrupt 0 kg row here fed
      // computeFFMFloor (which throws on non-positive weight) with no
      // try/catch above it, so one bad row could abort the whole coach run.
      .filter(w => w && Number.isFinite(Number(w.weightKg)) && Number(w.weightKg) > 0 && w.loggedAt != null)
      .slice()
      .sort((a, b) => a.loggedAt - b.loggedAt)
      .map(w => ({ weightKg: w.weightKg, date: new Date(w.loggedAt).toISOString() }));
    const ewmaData = nutritionComputeEWMA(series);
    // F3 (EN-6): the FFM-floor context only forms around a genuinely positive
    // weight; otherwise it is omitted (the floor simply doesn't evaluate,
    // which holds the status quo rather than throwing).
    // Campaign 1 P0-6: BOTH floor evaluations in this run now resolve their
    // weight through the one canonical resolver, so the adaptive context and
    // the enforcing gate below can never compute different floors for the
    // same user state (profile -> EWMA today -> last valid weigh-in).
    const ffmWeightKg = resolveFfmFloorWeightKg({
      profileWeightKg: bodyweightKg,
      ewmaTodayKg: ewma7Today,
      lastWeighInKg: series[series.length - 1]?.weightKg,
    });
    const ffmFloorContext = (recentIntakeAvgKcal != null && recentIntakeDaysLogged >= 5 && ffmWeightKg != null)
      ? {
        weightKg: ffmWeightKg,
        recentIntakeAvgKcal, recentIntakeDaysLogged, bodyFatPercent, bodyFatSource, sex,
      }
      : null;
    const adaptiveArgs = {
      ewmaData,
      prescribedKcal: currentCalTarget,
      currentTDEEEstimate: currentMaintenanceKcal,
      adherenceFactor,
      // B1: with a real food diary (same >= 5-day evidentiary bar as the FFM
      // floor context above) the model reads the ACTUAL 7-day intake average
      // instead of the prescribed x bucket guess. Null keeps the old estimate
      // byte-identically (replay-pinned).
      actualIntakeKcal: (recentIntakeDaysLogged >= 5 && Number(recentIntakeAvgKcal) > 0)
        ? Number(recentIntakeAvgKcal)
        : null,
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
        todayKey: stepsTodayKey || localDayKey(nowMs),
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
  // Wave-3 review blocker fix (2026-07-02): the gate used to require a
  // profile bodyweightKg with no fallback, so a null profile weight let a
  // cut through while intake sat at or below the floor.
  // Campaign 1 P0-6: the gate now uses the SAME canonical resolver as the
  // adaptive floor context above (profile -> EWMA today -> last valid
  // weigh-in), so the floor a user is shown is the floor that gates them,
  // and a 1-2-weigh-in user (no EWMA yet) keeps floor protection via the
  // last-weigh-in step instead of losing it.
  const lastValidWeighInKg = (() => {
    // Input order is not guaranteed (the adaptive block above sorts its own
    // copy), so find the most recent VALID weigh-in explicitly - the same
    // value the adaptive context's sorted series ends on.
    let best = null;
    for (const w of Array.isArray(morningWeights) ? morningWeights : []) {
      if (!w || !Number.isFinite(Number(w.weightKg)) || Number(w.weightKg) <= 0 || w.loggedAt == null) continue;
      if (best == null || w.loggedAt > best.loggedAt) best = w;
    }
    return best ? Number(best.weightKg) : null;
  })();
  const ffmGateWeightKg = resolveFfmFloorWeightKg({
    profileWeightKg: bodyweightKg,
    ewmaTodayKg: ewma7Today,
    lastWeighInKg: lastValidWeighInKg,
  });
  if (
    ffmGateWeightKg != null &&
    Number.isFinite(recentIntakeAvgKcal) &&
    recentIntakeDaysLogged >= 5
  ) {
    const floor = computeFFMFloor(ffmGateWeightKg, {
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

  // Campaign 1 P0-7 D1: when the intake read FAILED, the floor gate above
  // never evaluated - hold any cut rather than proceed floor-blind. Same
  // most-protective shape as the FFM hold; upward/neutral moves pass.
  let intakeReadHeld = false;
  if (intakeReadFailed && calorieAdjustment != null && calorieAdjustment.change < 0) {
    intakeReadHeld = true;
    calorieAdjustment = null;
  }

  // ── STEPS PRESCRIPTION ────────────────────────────────────────────────────
  let stepsAdjustment = null;
  const band = stepsBand(goalPhase, bwRef);

  if (!stepsEnabled) {
    // No step target in play, so no step prescription at all. THIS IS THE
    // BRANCH PRODUCTION TAKES: the only call site passes stepsEnabled:false
    // (see the parameter note above and FR-C4-11). There is no user-facing
    // opt-out control; the branches below are retained-dormant code.
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
          note: "Steps are already near the upper limit, so this lever holds. Any further change comes from the calorie side.",
        };
      }
    }
  } else if (phase.isCut || (!phase.isBulk && phase.goalRatePct <= 0)) {
    // Cuts, maintenance AND recomp get the explicit hold note; bulks set no
    // step target at all. Written as a rate test (not a key test) so recomp's
    // -0.125 %/wk mapping (EN-4) keeps the note maintenance gave it.
    stepsAdjustment = {
      target: currentStepsTarget,
      change: 0,
      note: "Steps target stays the same this week.",
    };
  }

  // D95 (Campaign 4): the cardio prescription/acknowledgement block is
  // removed under the founder's cardio boundary ruling. Calories and steps
  // settle above this point, so no other prescription changes.

  // ── RAPID WEIGHT LOSS SAFETY FLAG ────────────────────────────────────────
  // F3 (EN-9): `<=` so this flag agrees with the correction gate above
  // (rapidLossOverride) and the ED detector (isRapidLoss) at exactly -1.5%.
  // Previously the correction fired at the boundary while this flag reported
  // false — two consumers of the same sacred threshold disagreeing.
  const rapidWeightLossFlag = !!(
    actualRatePct !== null &&
    actualRatePct <= -1.5 &&
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
    // Stage 7-8 review #5: the applied cut is now the strain-scaled
    // share of each muscle's own recent volume (computeDeloadVolume),
    // so "around half" over-promised. The note stays qualitative; the
    // apply row states the exact share once it is applied.
    deloadNote = 'Ease your sets right back this week, keep the same exercises and weights. Your body is asking for a breather. One lighter week sets you up for a stronger run after.';
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
      // F10 (EN-5): pass the injected clock into shouldSuggestDietBreak's
      // existing currentDate parameter (its default is new Date()).
      const dietBreakResult = shouldSuggestDietBreak(goalStartDate, new Date(nowMs));
      if (dietBreakResult.suggest) {
        dietBreakSuggested = true;
        dietBreakWeeksInDeficit = dietBreakResult.weeksInDeficit;
        // C6 P-2 (D97-20): with a phase-continuity gap the suggestion stays
        // (it is protective) but the claim may only state the provable fact
        // - when the cut was SET - never what the user has been eating.
        dietBreakNote = phaseClaimGap
          ? `This cut has been set for ${dietBreakResult.weeksInDeficit} weeks. A full week at maintenance will help your body reset before continuing.`
          : dietBreakResult.weeksInDeficit >= 12
            ? `You have been eating below maintenance for ${dietBreakResult.weeksInDeficit} weeks. A full week at maintenance will help your body reset before continuing.`
            : 'Eight or more consecutive weeks eating below maintenance is a long time. One week at your full calorie need helps your body reset and makes the next stretch more effective.';
      }
    } else if (weeksInPhase >= 8) {
      // Fallback when goalStartDate is not stored (older profiles).
      dietBreakSuggested = true;
      dietBreakWeeksInDeficit = weeksInPhase;
      dietBreakNote = phaseClaimGap
        ? `This cut has been set for ${weeksInPhase} weeks. A full week at maintenance will let your body reset before continuing.`
        : weeksInPhase >= 12
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
    // F3 (EN-2): sex threads the per-day ED floor through computeMacroCycle so
    // a floored target can never be offered a sub-floor rest day.
    const split = computeMacroCycle(
      { targetKcal: currentCalTarget, proteinG: currentProteinG, carbsG: currentCarbsG, fatG: currentFatG },
      trainingDays,
      { sex },
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
  // A single day raised to maintenance via carbs, for physique competitors
  // on a cut only. The coach proposes it on a weekly cadence and the user
  // confirms before the swap. Applying schedules it onto the next
  // training day (CoachOutputScreen.handleApplyRefeed); nothing writes
  // until then. Builds on row 6's day-level framing. (The fortnightly
  // agg_cut cadence died with the dead agg_cut vocabulary — EN-4.)
  let refeed = null;
  const refeedEligible = phase.isCut && isCompetitionGoal(trainingGoal);
  if (refeedEligible) {
    const frequencyWeeks = 1;
    const weeksSinceRefeed = lastRefeedAt
      ? Math.floor((nowMs - lastRefeedAt) / (7 * 86400000))
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
    const weightTrendPctPerWeek = computeWeeklyTrendPct(morningWeights, bodyweightKg, nowMs);
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
  const edPatternHeld = !!(edPatternResult?.fired || edPatternOpen);
  if (edPatternHeld) {
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
      reason: `Calorie target held. Your seven-day average intake of ${Math.round(ffmFloorContext.recentIntakeAvgKcal)} kcal is at or below your safety floor of ${ffmFloorContext.floorKcal} kcal. Eating below this level for long stretches can compromise recovery and lean mass.`,
    });
  }

  // Campaign 1 P0-7 D1: the intake-read hold explains itself the same way.
  if (intakeReadHeld) {
    heldDecisions.push({
      type: 'intake_read_failed',
      reason: 'Calorie target held. Your food diary could not be read this run, so the safety floor check could not confirm a reduction is safe. Nothing changes until the next successful check.',
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

  // F3 (EN-10): never stack a generic "calories held" reason under the ED
  // lockout — two different explanations for the same held decision dilute
  // the safety message the lockout card is meant to lead with.
  if ((phase.isCut || phase.isBulk) && currentCalTarget !== null && calorieAdjustment === null && !ffmFloorHeld && !edPatternHeld) {
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
      heldDecisions.push({ type: 'calories', reason: "Calories stay where they are. Food wasn't tracked this week, so any change would be a guess." });
    }
  }

  // ── AUTONOMY-MODE HOLD GATE (D16, Ultimate-Audit item 11 refinement) ──────
  // Founder ruling 2026-07-10 (pass3-v2-founder-decisions.md:166 named the
  // Coached/Collaborative/Manual modes; NA-coaching-10, :186-187, "Coached
  // never auto-applies while a safety hold / ED-flag / suppression is
  // active"). Hold set: deload, poor recovery, safety hold, FFM floor, ED
  // flag, rapid loss, wellbeing-screen restriction, calm mode (D16 list
  // plus scoffPositive, restored hands-on: the June rule's "suppression"
  // covers it and every sibling gate, D15/D18, already includes it). Whatever coachAutonomy
  // mode is active in the caller, an open hold forces confirm-first
  // behaviour -- a more autonomous mode changes WHO confirms, never whether
  // the apply path's clamps run. This is the ONE place that answers "is a
  // hold open right now"; CoachOutputScreen reads this single emitted flag
  // rather than re-deriving the hold list, the same "emit one flag so a
  // display-only consumer never has to re-derive the reads it cannot see"
  // pattern as photoCorroborationBlocked (D18) below. Deterministic: derived
  // only from already-computed named booleans in this run, no I/O, no
  // randomness, no new engine input required.
  const autoApplyHoldActive = !!(
    deloadSuggested ||
    matrixDeload ||
    poorRecovery ||
    safetyHold ||
    ffmFloorHeld ||
    edPatternHeld ||
    rapidWeightLossFlag ||
    scoffPositive ||
    calmMode
  );

  // ── SUSTAINED OVER-PERFORMANCE ESCALATION (D15) ───────────────────────────
  // Founder ruling 2026-07-09 (D15 / plan-G section 3.2, "BOTH (a) and (b)"):
  // once the check-in's own trainingPerformance verdict has read 'exceeded'
  // for consecutiveExceededWeeks running (the new caller-supplied counter
  // above) AND this week's own autoregulation read is ALREADY a push, the
  // push may move exactly one extra step, never past autoregulationMatrix's
  // own existing +3 ceiling (line ~196 above) and never bypassing
  // computeVolumeApply's downstream [mev, mrv] clamp (coachApply.js:283-307)
  // — that clamp is untouched by this change. It moves nothing on a
  // hold/reduce week and never invents a push that was not already there.
  //
  // Gated off entirely (weaker signal always wins) while ANY safety hold is
  // open: a surfaced deload suggestion, the matrix's own deload read, poor
  // recovery, the joint-pain/illness/injury safety hold, the FFM-floor
  // calorie hold, an open or just-fired ED-pattern flag, the rapid
  // weight-loss safety correction, a positive wellbeing-screen restriction
  // flag, or calm mode. Deterministic: a new named input, same-input-same-
  // output, no I/O, no randomness.
  const EXCEEDED_ESCALATION_WEEKS = 3;
  const MATRIX_PUSH_CEILING = 3; // autoregulationMatrix's own existing ceiling
  const exceededEscalationEligible = (
    consecutiveExceededWeeks >= EXCEEDED_ESCALATION_WEEKS &&
    trainingSignal === 'push' &&
    // Stage 4 review remediation: a push manufactured by the peak-week
    // softening is not the raw-matrix evidence D15 was built on.
    !peakWeekContextApplied &&
    !deloadSuggested &&
    !matrixDeload &&
    !poorRecovery &&
    !safetyHold &&
    !ffmFloorHeld &&
    !edPatternHeld &&
    !rapidWeightLossFlag &&
    !scoffPositive &&
    !calmMode
  );
  let exceededEscalationApplied = false;
  if (exceededEscalationEligible && volumeSignal < MATRIX_PUSH_CEILING) {
    volumeSignal = Math.min(volumeSignal + 1, MATRIX_PUSH_CEILING);
    trainingNote = getTrainingNote(trainingGoal, volumeSignal, trainingSignal, matrixDeload);
    exceededEscalationApplied = true;
  }

  // ── WHAT'S WORKING ────────────────────────────────────────────────────────
  const whatWorking = [];

  // Identity register (T9 follow-up, founder GO): name the behaviour as who
  // the user is becoming, not a bare count. Copy only; thresholds unchanged and
  // the honesty test holds (true whenever the sessions were genuinely trained).
  if (sessionAdherence >= 1.0) {
    whatWorking.push(`You trained all ${sessionsPlanned} sessions this week. That is showing up.`);
  } else if (sessionAdherence >= 0.75) {
    whatWorking.push(`You trained ${sessionsCompleted} of your ${sessionsPlanned} sessions this week. That is showing up.`);
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
  // D15: the sustained-escalation receipt takes precedence over the plain
  // push_volume line (it is a more specific instance of the same push,
  // only ever set when exceededEscalationApplied is true, which itself
  // requires trainingSignal === 'push' with every safety hold clear).
  else if (exceededEscalationApplied)           whyKeys.push('exceeded_escalation');
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
    exceeded_escalation: 'training',
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
  // U4 (additive, no maths changed): a reassuring note when a female user who
  // flagged their period this week shows a small water-plausible rise. Never
  // fires on a loss, never alters a target/floor/threshold — annotation only.
  const cyclePhaseNote = cycleTrendAnnotation({
    sex,
    menstrual: noteFlags?.menstrual,
    trendPctPerWeek: computeWeeklyTrendPct(morningWeights, bodyweightKg, nowMs),
  });

  // ── PHOTO CORROBORATION (D18, founder decision 2026-07-09; plan-F §4.4) ────
  // A strong, already-agreeing progress-photo trend (photoCorroboration:
  // eligible === true means 3+ comparable scans at Moderate+ confidence;
  // direction 'supports' means the scan agrees with the decision the logged
  // data was already leaning toward) may raise the EMITTED data-confidence
  // caption by EXACTLY ONE bounded step, clamped at 'high', never lowering,
  // never originating, never moving 'data_hold' (the data_hold early return
  // above never reaches this block).
  //
  // It moves ONLY the emitted `confidence` field. The pre-corroboration
  // `confidence.level` is what fed offTargetWeeksRequired and therefore every
  // calorie/macro/training/floor decision earlier in this run, so adjustments,
  // heldDecisions and all floors stay byte-identical whether or not a scan
  // corroborates — the narrowed bounded-delta safety-floor isolation guard
  // (D18) pins exactly that.
  // Deterministic: a pure function of named inputs, no I/O, no randomness.
  //
  // Suppressed entirely (photoCorroborationBlocked) under calm mode, an open or
  // just-fired ED-pattern flag, the FFM-floor hold, the rapid-loss safety
  // correction, the joint-pain/illness/injury safety hold, or a positive
  // wellbeing-screen restriction flag — wired into the existing hold reads in
  // this run, not a new mechanism. The flag is emitted so a display-only
  // consumer can gate the same rule faithfully (it carries the scoffPositive/
  // calm reads it cannot otherwise see) without persisting or syncing any
  // photo-derived value (photos and their derived data never leave the device).
  const photoCorroborationBlocked = !!(
    edPatternHeld ||
    ffmFloorHeld ||
    rapidWeightLossFlag ||
    safetyHold ||
    scoffPositive ||
    calmMode
  );
  const emittedConfidenceLevel = corroborateConfidenceLevel(
    confidence.level,
    photoCorroboration,
    { suppressed: photoCorroborationBlocked },
  );
  const photoCorroborationApplied = emittedConfidenceLevel !== confidence.level;

  return {
    hasEnoughData: true,
    dataNote: null,
    confidence: emittedConfidenceLevel,
    // D18: true only on a run where a strong, already-agreeing scan actually
    // raised the emitted confidence caption one step; false otherwise.
    photoCorroborationApplied,
    // D18: the engine's authoritative "corroboration is unsafe to surface this
    // week" read (calm mode / ED flag / any safety hold), so a display-only
    // consumer never has to re-derive scoffPositive/calm to gate the caption.
    photoCorroborationBlocked,
    weekLabel,
    trend: {
      ewma7: ewma7Today,
      delta: weightDelta,
      onTarget: onTarget ?? false,
      deltaLabel,
      rateLabel,
    },
    // U4: cycle-phase water-rise reassurance (or null). Additive; see cyclePhase.js.
    cyclePhaseNote,
    whatWorking,
    adjustments: {
      training: { signal: trainingSignal, note: trainingNote },
      calories: calorieAdjustment,
      steps: stepsAdjustment,
    },
    // U-B-1 §2: the engine's top decision, derived from whyKeys[0] above.
    primary,
    whyThisWeek,
    deloadSuggested,
    deloadNote,
    dietBreakSuggested,
    dietBreakNote,
    dietBreakWeeksInDeficit,
    // C6 P-2 (D97-20): false when a phase-continuity gap means "in a
    // deficit for N weeks" cannot be claimed; the card then states the
    // cut's set-age instead. True for every continuously coached user
    // and every legacy caller.
    dietBreakContinuityEvidenced: !phaseClaimGap,
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
    // D15: true only on the week the bounded one-step escalation actually
    // moved volumeSignal. Drives the exceeded_escalation copy (whyKeys
    // above) and lets the caller persist it into the saved output (so next
    // run's consecutiveExceededWeeks derivation and telemetry both have it).
    exceededEscalationApplied,
    // Stage 4: true only when the peak-week fatigue context actually
    // softened this week's recovery read for the push/hold branch (the
    // Stage 8 explanation layer names it; deload paths never set it).
    peakWeekContextApplied,
    // PIPE-002 / PIPE-003: surface the safety context so the caller and
    // telemetry can see why progression was held this week.
    jointPainFlagged,
    safetyHold,
    noteFlags,
    goalPhase,
    // D16: single emitted "any hold is open" flag for autonomy-mode
    // auto-apply gating (see the AUTONOMY-MODE HOLD GATE block above).
    autoApplyHoldActive,
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
    },
    whyThisWeek: pickWhy(['building_baseline'], weekSeed),
    peakWeekContextApplied: false,
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
    exceededEscalationApplied: false,
    // D16: no adjustments exist on this path (all null above), so there is
    // nothing an autonomous mode could auto-apply either way.
    autoApplyHoldActive: false,
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
    },
    whyThisWeek: pickWhy(['stabilise_sessions'], weekSeed),
    // U-B-1 §2: this path has no applyable adjustment to hero — the lead/holding
    // state shows instead (domain null), reasonKey mirrors whyThisWeek.
    primary: { domain: null, reasonKey: 'stabilise_sessions' },
    peakWeekContextApplied: false,
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
    exceededEscalationApplied: false,
    // D16: no adjustments exist on this path (all null above), so there is
    // nothing an autonomous mode could auto-apply either way.
    autoApplyHoldActive: false,
  };
}
