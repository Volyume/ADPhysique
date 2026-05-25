/**
 * Engine simulator runner.
 *
 * Locked in TESTING_STRATEGY_LOCKED.md lines 22-72. Feeds a synthetic
 * user through `runWeeklyCoach()` for N weeks, evolving state between
 * weeks the same way the production app does (apply adjustments,
 * track ED-pattern flag, build history, etc.).
 *
 *   import { simulate } from '../runner';
 *
 *   const result = simulate({
 *     user: { weight_kg: 80, bf_pct: 20, sex: 'M', goal: 'mild_cut',
 *             baselineKcal: 2400 },
 *     weeks: 12,
 *     weeklyInputs: [
 *       { weight_kg: 79.8, adherence: 'hit', energy: 4, soreness: 2 },
 *       ...
 *     ],
 *   });
 *
 *   expect(result.weekByWeek[3].heldDecisions).toEqual([]);
 *   expect(result.finalState.currentCalTarget).toBeLessThan(2400);
 *
 * The runner does NOT reproduce 100% of the production code path —
 * it skips screens, persistence, sync, and telemetry. The point is
 * the engine math: each scenario asserts on weekly outputs +
 * cumulative state. Anything that lives outside `runWeeklyCoach` is
 * out of scope.
 *
 * Inputs are deliberately sparse: each weekly input only needs the
 * fields that drive engine decisions (weight, energy, soreness,
 * adherence, optional sessions / prs / intake). Sensible defaults
 * fill the rest.
 */
import { runWeeklyCoach } from '../../src/lib/weeklyCoach';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function _defaultUser() {
  return {
    weight_kg: 80,
    bf_pct: 20,
    sex: 'M',
    goal: 'maint',
    trainingGoal: null,
    baselineKcal: 2400,
    sessionsPlanned: 4,
    scoffPositive: false,
    goalLockAdvanced: false,
    userTier: 'free',
    hasUsedTrial: false,
  };
}

function _morningWeightsAtWeek(weeklyWeights, weekIndex, initialWeight) {
  // Build the morning-weights array for an engine call at week
  // `weekIndex`. All timestamps anchor to Date.now() so the latest
  // reading is "today" and earlier readings extend backward day by
  // day. This is what `getEwmaSevenDaysAgo` expects — without it
  // the 7-day-cutoff lookback can't locate "last week's EWMA" and
  // the weight delta comes out as 0.
  //
  // Each weekly weight is the END-of-week weight; daily readings
  // within a week linearly interpolate from the previous week's end
  // to this week's. Daily granularity (7 per week) gives the EWMA
  // (alpha=0.1) enough datapoints to converge to the true rate.
  const out = [];
  const tinyJitter = (d) => ((d % 2 === 0 ? 1 : -1) * 0.03);
  let lastEnd = initialWeight;
  const nowMs = Date.now();
  for (let w = 0; w <= weekIndex; w++) {
    const thisEnd = weeklyWeights[w];
    for (let d = 0; d < 7; d++) {
      const daysBack = (weekIndex - w) * 7 + (6 - d);
      const frac = (d + 1) / 7;
      const interpolated = lastEnd + (thisEnd - lastEnd) * frac;
      out.push({
        loggedAt: nowMs - daysBack * 86400000,
        weightKg: interpolated + tinyJitter(d),
      });
    }
    lastEnd = thisEnd;
  }
  return out;
}

function _stepState(state, weekInput, output) {
  // Apply calorie adjustment to running target. The engine returns
  // signed kcal/wk; positive = add (cut→smaller deficit, bulk→more
  // surplus), negative = subtract.
  const change = output?.adjustments?.calories?.change ?? 0;
  if (change !== 0) {
    state.currentCalTarget = Math.max(1200, state.currentCalTarget + change);
    state.lastCalAdjustmentDirection = change > 0 ? 'up' : 'down';
    state.lastCalAdjustmentWeeksAgo = 0;
    state.totalAdjustments++;
  } else {
    state.lastCalAdjustmentWeeksAgo++;
  }

  // Off-target streak. Production code resets when the engine
  // adjusts; the simulator follows the same rule for consistency.
  const onTarget = !!output?.trend?.onTarget;
  if (onTarget || change !== 0) {
    state.consecutiveOffTargetWeeks = 0;
  } else {
    state.consecutiveOffTargetWeeks++;
  }

  // Recovery streak.
  const e = weekInput.energy ?? 3;
  const s = weekInput.soreness ?? 2;
  const poorRecovery = e <= 2 || s >= 4;
  if (poorRecovery) state.consecutivePoorRecoveryWeeks++;
  else state.consecutivePoorRecoveryWeeks = 0;

  // ED-pattern flag state machine (mirror of production: raise on
  // first fire, clear on confirmed clearance).
  if (output?.edPatternFired) state.edPatternOpen = true;
  if (output?.edPatternClearedThisWeek) state.edPatternOpen = false;

  // Weekly history. Most-recent-first, capped at 12 weeks (more than
  // the 3-week window any detector uses).
  state.recentWeeklyHistory.unshift({
    adherence: weekInput.adherence ?? 'hit',
    energy: e,
    soreness: s,
    hasCheckin: true,
    hasFoodData: weekInput.intakeKcal != null,
  });
  if (state.recentWeeklyHistory.length > 12) {
    state.recentWeeklyHistory.length = 12;
  }
}

export function simulate({ user: userOverrides = {}, weeks = 12, weeklyInputs = [] } = {}) {
  const user = { ..._defaultUser(), ...userOverrides };

  const state = {
    totalWeeks: weeks,
    currentCalTarget: user.baselineKcal,
    consecutiveOffTargetWeeks: 0,
    consecutivePoorRecoveryWeeks: 0,
    lastCalAdjustmentDirection: null,
    lastCalAdjustmentWeeksAgo: 99,
    recentWeeklyHistory: [],
    edPatternOpen: false,
    weeksInPhase: 0,
    totalAdjustments: 0,
    ffmFloorFiredWeeks: [],
    edPatternFiredWeeks: [],
    rapidLossWeeks: [],
  };

  const weeklyWeights = weeklyInputs.map(
    (inp, i) => inp?.weight_kg ?? user.weight_kg,
  );

  const weekByWeek = [];

  for (let w = 0; w < weeks; w++) {
    const input = weeklyInputs[w] ?? {};
    state.weeksInPhase++;
    const morningWeights = _morningWeightsAtWeek(weeklyWeights, w, user.weight_kg);

    const checkin = {
      energyScore: input.energy ?? 3,
      sorenessScore: input.soreness ?? 2,
      calsAdherence: input.adherence ?? 'hit',
      notes: input.notes ?? null,
    };

    const result = runWeeklyCoach({
      checkin,
      morningWeights,
      sessionsCompleted: input.sessions ?? user.sessionsPlanned,
      sessionsPlanned: user.sessionsPlanned,
      prsThisWeek: input.prs ?? 0,
      goalPhase: user.goal,
      trainingGoal: user.trainingGoal,
      weeksInPhase: state.weeksInPhase,
      goalStartDate: null,
      consecutiveOffTargetWeeks: state.consecutiveOffTargetWeeks,
      consecutivePoorRecoveryWeeks: state.consecutivePoorRecoveryWeeks,
      lastCalAdjustmentDirection: state.lastCalAdjustmentDirection,
      lastCalAdjustmentWeeksAgo: state.lastCalAdjustmentWeeksAgo,
      currentCalTarget: state.currentCalTarget,
      currentStepsTarget: 8000,
      bodyweightKg: input.weight_kg ?? user.weight_kg,
      units: 'kg',
      scoffPositive: user.scoffPositive,
      bodyFatPercent: user.bf_pct,
      bodyFatSource: 'self_reported',
      sex: user.sex,
      recentIntakeAvgKcal: input.intakeKcal ?? null,
      recentIntakeDaysLogged: input.daysLogged ?? 0,
      recentWeeklyHistory: state.recentWeeklyHistory.slice(),
      goalLockAdvanced: user.goalLockAdvanced,
      edPatternOpen: state.edPatternOpen,
      userTier: user.userTier,
      hasUsedTrial: user.hasUsedTrial,
      weeksLiftStalled: input.weeksLiftStalled ?? null,
      missingTdeeSignal: !!input.missingTdeeSignal,
      blockEnded: !!input.blockEnded,
    });

    weekByWeek.push(result);

    if (result?.ffmFloorHeld) state.ffmFloorFiredWeeks.push(w);
    if (result?.edPatternFired) state.edPatternFiredWeeks.push(w);
    if (result?.rapidLossCorrectionApplied) state.rapidLossWeeks.push(w);

    _stepState(state, input, result);
  }

  return {
    weekByWeek,
    finalState: {
      currentCalTarget: state.currentCalTarget,
      consecutiveOffTargetWeeks: state.consecutiveOffTargetWeeks,
      lastCalAdjustmentDirection: state.lastCalAdjustmentDirection,
      edPatternOpen: state.edPatternOpen,
      weeksInPhase: state.weeksInPhase,
    },
    totalAdjustments: state.totalAdjustments,
    ffmFloorFiredWeeks: state.ffmFloorFiredWeeks,
    edPatternFiredWeeks: state.edPatternFiredWeeks,
    rapidLossWeeks: state.rapidLossWeeks,
  };
}

/**
 * Build a 12-week input array with a repeating template, optionally
 * overriding specific week indices. Convenience for scenarios where
 * most weeks are uniform.
 */
export function buildWeeklyInputs(weeks, template, overrides = {}) {
  const out = [];
  for (let w = 0; w < weeks; w++) {
    const inp = typeof template === 'function' ? template(w) : { ...template };
    if (overrides[w]) Object.assign(inp, overrides[w]);
    out.push(inp);
  }
  return out;
}
