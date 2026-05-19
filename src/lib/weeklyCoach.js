/**
 * weeklyCoach.js
 * Core algorithm for Volyume Pro weekly coaching output.
 * Pure functions only — no side effects, no DB calls, no I/O.
 *
 * Translates check-in data + weight trend + training data into a
 * unified coaching card: trend summary, what's working, adjustments,
 * and a plain-English rationale.
 */

// ─── EWMA ────────────────────────────────────────────────────────────────────

/**
 * Exponential weighted moving average over an array of { weightKg, loggedAt } entries.
 * alpha = 0.1 ≈ 10-day memory; alpha = 0.05 ≈ 20-day memory.
 * Returns an array of { loggedAt, rawKg, ewmaKg } aligned to input.
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

// ─── Phase configuration ──────────────────────────────────────────────────────

const PHASE_CONFIG = {
  agg_cut:   { label: 'Aggressive cut',  goalRatePct: -1.00, isCut: true,  isBulk: false },
  mod_cut:   { label: 'Moderate cut',    goalRatePct: -0.625, isCut: true, isBulk: false },
  mild_cut:  { label: 'Mild cut',        goalRatePct: -0.375, isCut: true, isBulk: false },
  recomp:    { label: 'Recomp',          goalRatePct: -0.125, isCut: false, isBulk: false },
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

const WHY_LIBRARY = {
  on_target_holding: [
    "Weight's trending exactly as planned. The algorithm doesn't change what's working (that's a feature, not a bug).",
    "Everything's on track this week. Hold the course and keep the effort level consistent.",
    "Your trend is right where it needs to be. No changes needed. This is what good progress feels like.",
    "Solid week. Weight and performance are both trending the right way. Stay the course.",
  ],
  off_target_cal_up: [
    "Weight's moving faster than your target rate, so bringing calories up slightly will protect what you've built.",
    "You're gaining a little more than planned, so a small calorie bump will slow it down without disrupting momentum.",
  ],
  off_target_cal_down: [
    "Weight isn't moving at the rate you're aiming for. A modest calorie reduction keeps the plan on track.",
    "Progress has stalled slightly versus your goal. A small calorie adjustment gets things moving again.",
    "The trend's behind schedule, so a controlled reduction moves things in the right direction without a dramatic cut.",
  ],
  recovery_lagging: [
    "Recovery's lagging: sleep dropped, soreness is up. A lighter week now pays back the next four.",
    "Your body is asking for less right now. Backing off training slightly protects the quality of next week's sessions.",
    "Energy and soreness signals are telling us to ease back. This isn't losing progress. It's protecting it.",
  ],
  performance_regressed: [
    "Performance dropped on some key lifts. Before changing volume, we recover first. Then we push again.",
    "Strength has dipped recently. The priority is stabilising performance before any further increases.",
  ],
  building_baseline: [
    "You're in the early weeks of logging. Volyume is building your baseline, and adjustments start once the data is more established.",
    "Not enough data yet to make confident adjustments. Keep logging weight and sessions and we'll start coaching properly soon.",
  ],
  stabilise_sessions: [
    "Sessions were inconsistent this week. Stable training is the most important variable, and we don't adjust anything else until that's solid.",
    "Less than half your planned sessions were completed. Getting back on schedule takes priority over any programming tweak.",
  ],
  steps_bump: [
    "Weight trend is behind target and steps have room to increase. More daily movement is the most recovery-friendly way to close the gap.",
    "Bumping the daily step target is the lowest-fatigue lever available and it won't affect training quality.",
  ],
  deload_suggested: [
    "Several signals (soreness, energy, and performance) are pointing in the same direction. A lighter week now sets up a stronger block after.",
    "Fatigue is accumulating across multiple signals. One reduced week is the most efficient path to your next personal best.",
  ],
  diet_break_suggested: [
    "Eight or more consecutive weeks in a calorie deficit is a long time. One week at maintenance restores hormone levels and makes the next phase of dieting more effective.",
    "A short maintenance break after an extended deficit pays compound interest: better adherence, better training, better results in the weeks that follow.",
  ],
  push_volume: [
    "Recovery is solid, energy is high, and performance is climbing. This is the window to push volume a notch higher.",
    "All the signals are green this week. Adding a little more work while recovery supports it is how progress compounds.",
  ],
  low_data_weight: [
    "Not enough weight data this week to make reliable trend calculations. Keep logging morning weight and the trend will stabilise.",
    "Weight data is limited this week, so the algorithm is working with what it has. More daily logs will sharpen the picture.",
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
 */
export function runWeeklyCoach(inputs) {
  const {
    checkin,
    morningWeights = [],
    sessionsCompleted = 0,
    sessionsPlanned = 3,
    prsThisWeek = 0,
    goalPhase = 'maint',
    weeksInPhase = 1,
    consecutiveOffTargetWeeks = 0,
    consecutivePoorRecoveryWeeks = 0,
    lastCalAdjustmentDirection = null,
    lastCalAdjustmentWeeksAgo = 99,
    currentCalTarget = null,
    currentStepsTarget = 8000,
    bodyweightKg = null,
    units = 'kg',
  } = inputs;

  const phase = phaseConfig(goalPhase);
  const energyScore    = checkin?.energyScore    ?? null;
  const sorenessScore  = checkin?.sorenessScore  ?? null;
  const calsAdherence  = checkin?.calsAdherence  ?? 'untracked';
  const stepsAdherence = checkin?.stepsAdherence ?? null;
  const cycleOverride  = !!(checkin?.cycleOverride);
  const sleepHours     = checkin?.sleepHours     ?? null;

  // Seed for rotating copy variants (week-based so same week always gives same copy)
  const weekSeed = checkin?.weekStart ? Math.floor(checkin.weekStart / (7 * 86400000)) : 0;

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

  // ── RECOVERY SIGNALS ─────────────────────────────────────────────────────
  const poorEnergy    = energyScore != null && energyScore <= 2;
  const highSoreness  = sorenessScore != null && sorenessScore >= 4;
  const poorRecovery  = poorEnergy || highSoreness;
  const excellentRec  = energyScore != null && energyScore >= 4 && sorenessScore != null && sorenessScore <= 2;

  // ── TRAINING SIGNAL ───────────────────────────────────────────────────────
  let volumeSignal = 0;
  let loadSignal   = 'progress';
  let recoveryFlag = 'normal';
  let trainingNote = '';

  if (poorRecovery && consecutivePoorRecoveryWeeks >= 1) {
    volumeSignal = -2;
    loadSignal   = 'reduce';
    recoveryFlag = 'deload_suggested';
    trainingNote = 'Recovery is flagged. Cut sets back and focus on quality.';
  } else if (poorRecovery) {
    volumeSignal = 0;
    loadSignal   = 'hold';
    recoveryFlag = 'concerned';
    trainingNote = 'Energy and soreness are elevated. Hold the plan steady this week.';
  } else if (excellentRec && prsThisWeek > 0) {
    volumeSignal = 2;
    loadSignal   = 'progress';
    recoveryFlag = 'normal';
    trainingNote = 'Recovery is excellent and performance is climbing. Push harder.';
  } else if (excellentRec) {
    volumeSignal = 1;
    loadSignal   = 'progress';
    recoveryFlag = 'normal';
    trainingNote = 'Recovery is solid. Keep the effort level up.';
  } else {
    volumeSignal = 0;
    loadSignal   = 'progress';
    recoveryFlag = 'normal';
    trainingNote = 'Hold your current plan. Performance and recovery look stable.';
  }

  const trainingSignal = loadSignal === 'reduce' ? 'reduce' : loadSignal === 'hold' ? 'hold' : 'push';

  // ── CALORIE ADJUSTMENT ────────────────────────────────────────────────────
  let calorieAdjustment = null;

  const canAdjustCals = (
    !cycleOverride &&
    currentCalTarget != null &&
    calsAdherence !== 'untracked' &&
    consecutiveOffTargetWeeks >= 2 &&
    lastCalAdjustmentWeeksAgo >= 2  // cooldown: don't adjust two weeks in a row
  );

  if (canAdjustCals && !onTarget) {
    let change = 0;
    let calNote = '';

    if (phase.isCut && offTargetDirection > 0) {
      // Losing too slowly
      change = calsAdherence === 'hit' ? -150 : -100;
      calNote = `Reduce by ${Math.abs(change)} kcal/day. The deficit needs a small nudge.`;
    } else if (phase.isCut && offTargetDirection < 0) {
      // Losing too fast — protect muscle
      change = +125;
      calNote = `Increase by ${change} kcal/day. You're losing faster than planned, so this protects muscle.`;
    } else if (phase.isBulk && offTargetDirection < 0) {
      // Gaining too slowly
      change = +150;
      calNote = `Increase by ${change} kcal/day. You're gaining slower than planned.`;
    } else if (phase.isBulk && offTargetDirection > 0) {
      // Gaining too fast
      change = -125;
      calNote = `Reduce by ${Math.abs(change)} kcal/day. You're gaining a little faster than planned.`;
    }

    // Cap at ±5% of current target
    if (currentCalTarget > 0) {
      const maxChange = Math.round(currentCalTarget * 0.05);
      change = Math.sign(change) * Math.min(Math.abs(change), maxChange);
    }

    if (change !== 0) {
      calorieAdjustment = { change, note: calNote };
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
        note: `${newTarget.toLocaleString()}/day target. More movement is the most recovery-friendly lever.`,
      };
    } else {
      stepsAdjustment = {
        target: currentStepsTarget,
        note: `${currentStepsTarget.toLocaleString()}/day. Steps are at the upper end, so consider light cardio next.`,
      };
    }
  } else if (phase.isCut || phase.goalRatePct === 0) {
    stepsAdjustment = {
      target: currentStepsTarget,
      note: `${currentStepsTarget.toLocaleString()}/day. Hold the current target.`,
    };
  }

  // ── CARDIO PRESCRIPTION ───────────────────────────────────────────────────
  let cardioAdjustment = null;
  const stepsAtUpperBand = currentStepsTarget >= band.upper;

  if (phase.isCut && !onTarget && offTargetDirection > 0 && stepsAtUpperBand && !poorRecovery) {
    if (consecutiveOffTargetWeeks >= 4 && goalPhase === 'agg_cut') {
      cardioAdjustment = {
        prescribed: true,
        type: 'LISS + HIIT',
        note: 'Add 1 HIIT session (10–15 min) on top of existing steady-state cardio.',
      };
    } else {
      cardioAdjustment = {
        prescribed: true,
        type: 'LISS',
        note: 'Add 3 × 20–30 min steady-state cardio at an easy pace (you should be able to hold a conversation).',
      };
    }
  } else if (poorRecovery && cardioAdjustment?.prescribed) {
    cardioAdjustment = {
      prescribed: false,
      type: null,
      note: 'Cardio paused this week. Recovery takes priority.',
    };
  }

  // ── DELOAD / RECOVERY WEEK SUGGESTION ────────────────────────────────────
  let deloadSuggested = false;
  let deloadNote = null;
  let deloadTriggers = 0;

  if (consecutivePoorRecoveryWeeks >= 2)               deloadTriggers++;
  if (recoveryFlag === 'deload_suggested')              deloadTriggers++;
  if (weeksInPhase >= 6 && phase.isCut)                deloadTriggers++;
  if (sleepHours != null && sleepHours < 6 && poorEnergy) deloadTriggers++;

  if (deloadTriggers >= 2) {
    deloadSuggested = true;
    deloadNote = 'Reduce sets by around half this week, keep the same exercises and weights. Your body is asking for a breather. One lighter week sets up a stronger block after.';
  }

  // ── DIET BREAK SUGGESTION ─────────────────────────────────────────────────
  let dietBreakSuggested = false;
  let dietBreakNote = null;

  if (phase.isCut && weeksInPhase >= 8 && poorRecovery) {
    dietBreakSuggested = true;
    dietBreakNote = 'After 8+ weeks in a calorie deficit, one week at maintenance restores energy and makes the next stretch of dieting more effective.';
  }

  // ── WHAT'S WORKING ────────────────────────────────────────────────────────
  const whatWorking = [];

  if (sessionAdherence >= 1.0) {
    whatWorking.push(`Sessions: ${sessionsCompleted}/${sessionsPlanned}. All done.`);
  } else if (sessionAdherence >= 0.75) {
    whatWorking.push(`Sessions: ${sessionsCompleted}/${sessionsPlanned}. Solid week.`);
  }

  if (prsThisWeek > 0) {
    whatWorking.push(`${prsThisWeek} personal best${prsThisWeek > 1 ? 's' : ''} this week.`);
  }

  if (stepsAdherence === 'hit') {
    whatWorking.push('Steps target hit.');
  } else if (stepsAdherence === 'mostly') {
    whatWorking.push('Steps mostly on target.');
  }

  if (calsAdherence === 'hit') {
    whatWorking.push('Calorie target on point.');
  }

  if (excellentRec) {
    whatWorking.push('Energy and recovery are excellent.');
  } else if (!poorRecovery && energyScore != null) {
    whatWorking.push('Recovery is manageable. No red flags.');
  }

  if (onTarget && weightDelta != null) {
    whatWorking.push(`Weight trend is right on target (${rateLabel}).`);
  }

  // Fallback — always show at least one bullet
  if (whatWorking.length === 0) {
    whatWorking.push('Showing up and logging. That\'s the baseline everything else builds on.');
  }

  // ── "WHY THIS WEEK" ───────────────────────────────────────────────────────
  const whyKeys = [];

  if (deloadSuggested)                          whyKeys.push('deload_suggested');
  else if (dietBreakSuggested)                  whyKeys.push('diet_break_suggested');
  else if (poorRecovery)                        whyKeys.push('recovery_lagging');
  else if (volumeSignal >= 1 && excellentRec)   whyKeys.push('push_volume');
  else if (calorieAdjustment?.change > 0)       whyKeys.push('off_target_cal_up');
  else if (calorieAdjustment?.change < 0)       whyKeys.push('off_target_cal_down');
  else if (stepsAdjustment?.target > currentStepsTarget) whyKeys.push('steps_bump');
  else                                          whyKeys.push('on_target_holding');

  if (!enoughWeightData) whyKeys.push('low_data_weight');

  const whyThisWeek = pickWhy(whyKeys, weekSeed);

  // ── ASSEMBLE OUTPUT ───────────────────────────────────────────────────────
  return {
    hasEnoughData: true,
    dataNote: null,
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
    adherenceNote: null,
    prsThisWeek,
    sessionsCompleted,
    sessionsPlanned,
    volumeSignal,
    loadSignal,
    recoveryFlag,
    goalPhase,
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
