/**
 * coachContext.js — Campaign 18 job 1 + job 2.
 *
 * THE ONE COACHING CONTEXT. Volyume has several good engines - the plan
 * engine, the nutrition engine, the weekly coach, the block reviewer - and
 * until now each read the raw evidence for itself. That is how two screens
 * come to describe the same week differently: not because either is wrong,
 * but because nothing forced them to agree on what the evidence SAYS before
 * they each decided what to DO about it.
 *
 * FOUNDER LAW (job 2): "Create one authoritative coaching context used by
 * cross-domain decisions. It should expose facts/signals with provenance...
 * DO NOT collapse this into ATHLETE_SCORE = 73. Different decisions require
 * different evidence."
 *
 * So this module produces FACTS, not a verdict and never a score. Every fact
 * carries:
 *
 *   signal    GOOD | POOR | UNKNOWN - and UNKNOWN is a real answer, never a
 *             synonym for POOR (job 8).
 *   value     the underlying number, when there is one.
 *   coverage  how much of the window the evidence actually covers.
 *   source    which authority produced it, so no engine can quietly
 *             substitute its own reading of the same thing.
 *
 * NOT LOGGED IS NOT ZERO (job 8, and Campaign 17's law carried across
 * domains). Three food-logged days out of fourteen is insufficient nutrition
 * evidence, not poor nutrition. No answer to the joint question is unknown,
 * not "no pain". Sparse weigh-ins are an uncertain trend, not a flat one.
 *
 * THE DAY LAW STANDS (Campaign 17A, restated by Campaign 18 as
 * non-negotiable). Nothing here knows or asks what weekday anybody trains.
 * There is no training-day target, no rest-day target, no weekday carb
 * cycling. Training evidence may qualify how a nutrition READING is
 * interpreted; it can never produce a day-specific target.
 *
 * DUPLICATE NO AUTHORITY (job 1). This module computes no trend, no floor,
 * no e1RM and no adherence percentage of its own. The caller passes in the
 * values the existing authorities already produced (robustTrend, blockMetrics,
 * the food rollups, nutritionEngine) and this module only classifies them.
 * That is deliberate: a second opinion about the same number is exactly the
 * incoherence Campaign 18 exists to remove.
 *
 * PURE. No I/O, no clock (the caller passes nowMs where freshness matters).
 */

/**
 * What the evidence says. Three values, and the third is not a failure.
 *
 * "The coaching system should be able to say: we don't have enough
 * information to change this yet. That is intelligence, not failure."
 */
export const SIGNAL = Object.freeze({
  GOOD: 'good',
  POOR: 'poor',
  UNKNOWN: 'unknown',
});

/**
 * Which authority produced a fact. Recorded so a receipt can name it and so a
 * future engine cannot silently swap in its own derivation.
 */
export const SOURCE = Object.freeze({
  SESSION_LOG: 'session_log',
  BLOCK_METRICS: 'block_metrics',
  EXERCISE_PROGRESSION: 'exercise_progression',
  CHECKIN: 'checkin',
  FOOD_ROLLUPS: 'food_rollups',
  NUTRITION_TARGET: 'nutrition_target',
  ROBUST_TREND: 'robust_trend',
  USER_PROFILE: 'user_profile',
  USER_CHOICE: 'user_choice',
});

// ─── Product heuristics, written down as heuristics ─────────────────────────
//
// Every number below is a judgement call about how much evidence is enough.
// They live here, named, rather than as bare literals inside a branch, because
// Campaign 18's whole point is that one idea of "enough" is shared across
// domains instead of each engine inventing its own.

/** Sessions actually completed, as a fraction of planned, to call execution good. */
export const TRAINING_EXECUTION_GOOD = 0.8;
/** Below this, execution is genuinely poor rather than merely imperfect. */
export const TRAINING_EXECUTION_POOR = 0.6;
/** Fewer planned sessions than this and the ratio says nothing worth acting on. */
export const MIN_PLANNED_SESSIONS = 2;

/** Food-logged days in the last 7 before intake is measurable at all. */
export const MIN_INTAKE_DAYS = 5;
/** How far measured intake may sit from target and still count as followed. */
export const INTAKE_ON_TARGET_FRACTION = 0.10;

/** Weigh-ins needed before a trend is a trend rather than two points. */
export const MIN_WEIGH_INS = 4;

/** Days after which a check-in stops describing the present. */
export const CHECKIN_FRESH_DAYS = 14;

// A MISSING VALUE MUST NOT BECOME ZERO. Number(null), Number(undefined given
// a default) and Number('') all coerce to 0 or NaN in ways that would let an
// absent reading arrive as a real one - which is job 8's whole prohibition
// expressed as a two-line helper. Anything that is not genuinely a finite
// number returns null, and every caller treats null as UNKNOWN.
const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const clampFraction = (n, d) => (d > 0 ? n / d : null);

/**
 * One fact. `signal` is required; everything else is provenance.
 */
function fact(signal, { value = null, coverage = null, source = null, detail = null } = {}) {
  return { signal, value, coverage, source, detail };
}

/** The unknown fact, with the reason it is unknown. Used a great deal. */
function unknown(source, detail) {
  return fact(SIGNAL.UNKNOWN, { source, detail });
}

// ─── TRAINING ───────────────────────────────────────────────────────────────

/**
 * Did the user actually run the programme?
 *
 * THE DISTINCTION THAT MATTERS MOST (job 3). A programme cannot be judged by
 * results it never produced. Four sessions out of sixteen is not a verdict on
 * the prescription; it is the absence of one.
 */
export function trainingExecutionFact({ sessionsCompleted = null, sessionsPlanned = null } = {}) {
  const done = num(sessionsCompleted);
  const planned = num(sessionsPlanned);
  if (done == null || planned == null || planned < MIN_PLANNED_SESSIONS) {
    return unknown(SOURCE.SESSION_LOG, 'not enough planned sessions to judge');
  }
  const ratio = clampFraction(done, planned);
  const signal = ratio >= TRAINING_EXECUTION_GOOD ? SIGNAL.GOOD
    : ratio < TRAINING_EXECUTION_POOR ? SIGNAL.POOR
      : SIGNAL.GOOD; // the middle band is imperfect, not poor: it still tested the plan
  return fact(signal, {
    value: ratio, coverage: planned, source: SOURCE.SESSION_LOG,
    detail: `${done} of ${planned} sessions`,
  });
}

/**
 * Is the training itself moving?
 *
 * Takes the block slope the block metrics already computed, or falls back to
 * the PR count the weekly coach already reads. It derives neither.
 */
export function trainingProgressFact({ blockE1rmSlopePct = null, prsThisWeek = null, execution = null } = {}) {
  const slope = num(blockE1rmSlopePct);
  // An unrun block cannot report progress. This is the guard that stops a
  // flat line produced by absence being read as a flat line produced by
  // effort - the single most dangerous confusion in this whole campaign.
  if (execution?.signal === SIGNAL.UNKNOWN || execution?.signal === SIGNAL.POOR) {
    return unknown(SOURCE.BLOCK_METRICS, 'not enough training completed to judge progress');
  }
  if (slope != null) {
    return fact(slope > 0 ? SIGNAL.GOOD : SIGNAL.POOR, {
      value: slope, source: SOURCE.BLOCK_METRICS, detail: 'block strength slope',
    });
  }
  const prs = num(prsThisWeek);
  if (prs == null) return unknown(SOURCE.SESSION_LOG, 'no strength evidence this week');
  return fact(prs > 0 ? SIGNAL.GOOD : SIGNAL.UNKNOWN, {
    value: prs, source: SOURCE.SESSION_LOG, detail: 'personal records this week',
  });
}

// ─── RECOVERY ───────────────────────────────────────────────────────────────

/**
 * Systemic recovery, from the check-in the user actually answered.
 *
 * SCOPE IS PART OF THE FACT (job 6). This is the whole-body reading. A
 * muscle-specific recovery cost is a different question with a different
 * answer, and the two are allowed to differ - what is forbidden is saying
 * "you recovered well" and reducing the programme for poor recovery without
 * the explanation making that distinction truthful. The scope travels with
 * the fact so a receipt cannot lose it.
 */
export function systemicRecoveryFact({
  hasCheckin = false, energyScore = null, sorenessScore = null,
  consecutivePoorRecoveryWeeks = 0, lastCheckinAt = null, nowMs = null,
} = {}) {
  const stale = lastCheckinAt != null && nowMs != null
    && (nowMs - Number(lastCheckinAt)) > CHECKIN_FRESH_DAYS * 86400000;
  const energy = num(energyScore);
  const soreness = num(sorenessScore);
  // NO ANSWER IS UNKNOWN, NOT "NO PAIN" (job 8).
  if (!hasCheckin || stale || (energy == null && soreness == null)) {
    return { ...unknown(SOURCE.CHECKIN, stale ? 'check-in is out of date' : 'no check-in answered'), scope: 'systemic' };
  }
  const poor = (energy != null && energy <= 2) || (soreness != null && soreness >= 4);
  const repeated = Number(consecutivePoorRecoveryWeeks) || 0;
  return {
    ...fact(poor ? SIGNAL.POOR : SIGNAL.GOOD, {
      value: repeated, source: SOURCE.CHECKIN,
      detail: poor ? 'low energy or high soreness reported' : 'energy and soreness in range',
    }),
    scope: 'systemic',
  };
}

// ─── NUTRITION ──────────────────────────────────────────────────────────────

/**
 * How much of the week the food diary actually covers.
 *
 * Separated from the adherence reading below because they answer different
 * questions, and running them together is precisely how "did not log" becomes
 * "ate badly".
 */
export function intakeCoverageFact({ recentIntakeDaysLogged = 0, intakeReadFailed = false } = {}) {
  // A read that THREW is not an empty diary. Campaign 1's law, carried here:
  // a failure must never be presented as evidence of anything.
  if (intakeReadFailed) return unknown(SOURCE.FOOD_ROLLUPS, 'could not read the food diary');
  // Sanitised through the same helper every other reading uses: a NaN or an
  // Infinity is not a day count, and must never reach user-facing copy.
  // (Caught by engineRobustness.fuzz, which is the guard working.)
  const days = Math.max(0, Math.min(7, Math.round(num(recentIntakeDaysLogged) ?? 0)));
  if (days < MIN_INTAKE_DAYS) {
    return { ...unknown(SOURCE.FOOD_ROLLUPS, `only ${days} of the last 7 days logged`), value: days };
  }
  return fact(SIGNAL.GOOD, { value: days, coverage: 7, source: SOURCE.FOOD_ROLLUPS, detail: `${days} of 7 days logged` });
}

/**
 * Did the user actually eat the target they were given?
 *
 * THE QUESTION CASE B TURNS ON. A target that was never eaten has not been
 * tested, and changing an untested number teaches the app nothing and the
 * user less. `direction` records WHICH WAY they missed, because that is what
 * decides whether a proposed change is still informative.
 *
 * Self-report is used only when the diary cannot answer. The diary is the
 * senior source: it is a measurement, and the check-in answer is a memory.
 */
export function intakeAdherenceFact({
  coverage, recentIntakeAvgKcal = null, targetKcal = null, calsAdherence = null,
} = {}) {
  const avg = num(recentIntakeAvgKcal);
  const target = num(targetKcal);
  if (coverage?.signal === SIGNAL.GOOD && avg != null && target != null && target > 0) {
    const delta = avg - target;
    const within = Math.abs(delta) / target <= INTAKE_ON_TARGET_FRACTION;
    return {
      ...fact(within ? SIGNAL.GOOD : SIGNAL.POOR, {
        value: avg, coverage: coverage.value, source: SOURCE.FOOD_ROLLUPS,
        detail: within ? 'measured intake close to target' : 'measured intake away from target',
      }),
      direction: within ? 0 : Math.sign(delta),
    };
  }
  // Fall back to what they told us, if they told us anything at all.
  if (calsAdherence === 'hit') {
    return { ...fact(SIGNAL.GOOD, { source: SOURCE.CHECKIN, detail: 'reported hitting the target' }), direction: 0 };
  }
  if (calsAdherence === 'under' || calsAdherence === 'over') {
    return {
      ...fact(SIGNAL.POOR, { source: SOURCE.CHECKIN, detail: `reported eating ${calsAdherence} target` }),
      direction: calsAdherence === 'under' ? -1 : 1,
    };
  }
  return { ...unknown(SOURCE.FOOD_ROLLUPS, 'not enough logged days and no reported adherence'), direction: 0 };
}

/**
 * Protein specifically, because it is the macro the coaching protects.
 * Reported only where the diary can support it.
 */
export function proteinAdherenceFact({ coverage, recentProteinAvgG = null, targetProteinG = null } = {}) {
  const avg = num(recentProteinAvgG);
  const target = num(targetProteinG);
  if (coverage?.signal !== SIGNAL.GOOD || avg == null || target == null || target <= 0) {
    return unknown(SOURCE.FOOD_ROLLUPS, 'not enough logged days to judge protein');
  }
  return fact(Math.abs(avg - target) / target <= INTAKE_ON_TARGET_FRACTION ? SIGNAL.GOOD : SIGNAL.POOR, {
    value: avg, coverage: coverage.value, source: SOURCE.FOOD_ROLLUPS, detail: 'measured protein against target',
  });
}

// ─── BODY WEIGHT ────────────────────────────────────────────────────────────
//
// JOB 7, THE FOUR ROLES. The same day's weight answers four different
// questions and the right statistic differs by question. They are named here
// so a consumer picks deliberately rather than reaching for whatever is
// nearest:
//
//   LATEST MEASUREMENT  what the scale said this morning. For display, and
//                       for nothing that must be stable.
//   ROBUST TREND        the outlier-resistant smoothed line (robustTrend.js).
//                       For "is this going the way we intended".
//   SAFETY WEIGHT       nutritionEngine.resolveFfmFloorWeightKg. The ONE
//                       weight any floor is computed from, and never any of
//                       the others.
//   RATE OF CHANGE      percent of bodyweight per week, normalised for the
//                       elapsed span (weeklyCoach.computeWeeklyTrendPct).
//                       For every "faster/slower than intended" judgement.
//
// This module classifies the RATE, because that is the only one a
// cross-domain decision asks about. It computes none of them.

/**
 * Is bodyweight moving the way the goal intends?
 *
 * SPARSE WEIGH-INS ARE UNCERTAINTY, NOT A FLAT TREND (job 8).
 */
export function weightTrendFact({
  ratePctPerWeek = null, weighInCount = 0, goalPhase = null, onTarget = null,
} = {}) {
  const rate = num(ratePctPerWeek);
  const count = Number(weighInCount) || 0;
  if (rate == null || count < MIN_WEIGH_INS) {
    return { ...unknown(SOURCE.ROBUST_TREND, `${count} weigh-ins is not enough for a trend`), value: rate };
  }
  if (onTarget == null) {
    return fact(SIGNAL.UNKNOWN, {
      value: rate, coverage: count, source: SOURCE.ROBUST_TREND,
      detail: 'no goal direction to judge the trend against',
    });
  }
  return fact(onTarget ? SIGNAL.GOOD : SIGNAL.POOR, {
    value: rate, coverage: count, source: SOURCE.ROBUST_TREND,
    detail: onTarget ? 'moving as intended' : 'not moving as intended',
    ...(goalPhase ? {} : {}),
  });
}

// ─── USER INTENT ────────────────────────────────────────────────────────────

/**
 * What the user has explicitly decided.
 *
 * NOT A SIGNAL, AND DELIBERATELY SO (job 9). Intent is not evidence to be
 * weighed against other evidence; it is an instruction that outranks
 * inference. It sits in the context so that every consumer can see it, and it
 * carries no GOOD/POOR reading because there is nothing to judge.
 *
 * A RELEASED choice is absent from here, not remembered as a lingering
 * preference: "historical user intent should not become permanent
 * imprisonment after the user explicitly releases it."
 */
export function intentFacts({
  goalPhase = null, trainingGoal = null, division = null,
  manualVolumeMuscles = [], excludedExerciseIds = [], excludedFoodKeys = [],
  persistentFoodReplacements = 0, pinnedMealIds = [], calorieBankActive = false,
} = {}) {
  const list = (a) => (Array.isArray(a) ? a.filter(Boolean) : []);
  return {
    goalPhase, trainingGoal, division,
    manualVolumeMuscles: list(manualVolumeMuscles),
    excludedExerciseIds: list(excludedExerciseIds),
    excludedFoodKeys: list(excludedFoodKeys),
    persistentFoodReplacements: Number(persistentFoodReplacements) || 0,
    pinnedMealIds: list(pinnedMealIds),
    calorieBankActive: !!calorieBankActive,
    source: SOURCE.USER_CHOICE,
  };
}

// ─── THE CONTEXT ────────────────────────────────────────────────────────────

/**
 * Assemble the whole-athlete context.
 *
 * Returns facts grouped by domain. There is no top-level verdict and there is
 * no aggregate number, by design: `coachPrecedence.js` turns this into
 * decisions, and it does so per decision rather than once for everything.
 *
 * @param {object} inputs { nowMs, training, recovery, nutrition, weight, intent }
 */
export function buildCoachContext({
  nowMs = null, training = {}, recovery = {}, nutrition = {}, weight = {}, intent = {},
} = {}) {
  const execution = trainingExecutionFact(training);
  const progress = trainingProgressFact({ ...training, execution });
  const coverage = intakeCoverageFact(nutrition);
  return {
    training: {
      execution,
      progress,
      plateauedExerciseCount: Number(training.plateauedExerciseCount) || 0,
      blockWeekIndex: num(training.blockWeekIndex),
      blockAccumWeeks: num(training.blockAccumWeeks),
    },
    recovery: {
      systemic: systemicRecoveryFact({ ...recovery, nowMs }),
    },
    nutrition: {
      coverage,
      intake: intakeAdherenceFact({ ...nutrition, coverage }),
      protein: proteinAdherenceFact({ ...nutrition, coverage }),
      targetKcal: num(nutrition.targetKcal),
    },
    weight: {
      trend: weightTrendFact(weight),
      // WHICH WAY THE ATHLETE IS SHORT, carrying the sign of the calorie
      // change that would address it: +1 needs more energy, -1 needs less,
      // 0 unknown or on target. Supplied by the caller, because only the
      // goal-phase logic knows what "intended" means for this athlete, and
      // this module duplicates no authority.
      shortfall: Number(weight.shortfall) || 0,
    },
    intent: intentFacts(intent),
  };
}

/**
 * Every fact in the context, flattened, for a receipt or an audit.
 * Intent is excluded: it is an instruction, not a fact with a signal.
 */
export function contextFacts(context) {
  const c = context || {};
  return [
    ['training.execution', c.training?.execution],
    ['training.progress', c.training?.progress],
    ['recovery.systemic', c.recovery?.systemic],
    ['nutrition.coverage', c.nutrition?.coverage],
    ['nutrition.intake', c.nutrition?.intake],
    ['nutrition.protein', c.nutrition?.protein],
    ['weight.trend', c.weight?.trend],
  ].filter(([, f]) => f && f.signal).map(([key, f]) => ({ key, ...f }));
}
