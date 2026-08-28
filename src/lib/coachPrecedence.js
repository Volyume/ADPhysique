/**
 * coachPrecedence.js — Campaign 18 jobs 3, 11 and 16.
 *
 * THE THREE THINGS THAT MUST NOT BE CONFUSED, and the fourth that is not a
 * failure:
 *
 *   PLAN                  the prescription itself looks wrong.
 *   EXECUTION             the user has not run the prescription consistently
 *                         enough for it to be judged.
 *   RECOVERY              the prescription may be right, and recovery
 *                         evidence says progression should be restrained.
 *   INSUFFICIENT_EVIDENCE we do not know, and saying so is the answer.
 *
 * FOUNDER LAW (job 3): "poor body-weight progress + low calorie adherence
 * must NOT immediately mean increase calories" and "poor gym performance +
 * poor training adherence must NOT immediately mean replace exercises or
 * rebuild the programme".
 *
 * WHY THIS IS A SEPARATE MODULE. Every engine in the app can already decide
 * what to do once it knows what the evidence means. What none of them could
 * do was agree on what the evidence MEANS - and the same week's data was
 * therefore free to read as a plan failure in one engine and as an adherence
 * gap in another. The classification lives here, once, and both sides read
 * it.
 *
 * THE DAY LAW STANDS. Nothing here knows what weekday anybody trains, and
 * nothing here can produce a day-specific nutrition target. Training evidence
 * only ever qualifies the INTERPRETATION of a nutrition reading.
 *
 * TRAINING DOES NOT DEPEND ON FOOD LOGGING (job 14, a core product law). A
 * user who never opens the food diary gets the full training classification.
 * Missing nutrition evidence makes nutrition UNKNOWN; it never degrades a
 * training answer, and it is never presented as a cause.
 *
 * PURE. No I/O, no clock.
 */
import { SIGNAL } from './coachContext';

/** What is actually limiting progress, per domain. */
export const LIMITER = Object.freeze({
  PLAN: 'plan',
  EXECUTION: 'execution',
  RECOVERY: 'recovery',
  INSUFFICIENT_EVIDENCE: 'insufficient_evidence',
  // CC31 (section 20): a physical restriction, not the athlete and not
  // the plan, explains the week. Never an adherence accusation.
  CONSTRAINED: 'constrained',
});

/**
 * The intervention ladder, smallest first.
 *
 * FOUNDER'S ORDERING, adopted as stated. The instruction was not to hard-code
 * it if an existing product law required a different order; inspection found
 * none that does. What DOES sit outside this ladder, and above all of it:
 *
 *   - Safety holds. The FFM energy floor, the rapid-loss protection, the
 *     calorie floors and the ED/calm-mode lockouts are senior to every entry
 *     here and are enforced by their own engines. This ladder can only ever
 *     choose to do LESS than they already permit, never more.
 *   - Explicit user intent (job 9). A lane the user has taken over is not a
 *     lane this ladder may use.
 */
export const INTERVENTION = Object.freeze({
  NONE: 'none',
  EXPLAIN: 'explain',
  PRESCRIPTION: 'prescription',
  EXERCISE: 'exercise',
  VOLUME: 'volume',
  NUTRITION_TARGET: 'nutrition_target',
  STRUCTURE: 'structure',
});

const LADDER = [
  INTERVENTION.NONE,
  INTERVENTION.EXPLAIN,
  INTERVENTION.PRESCRIPTION,
  INTERVENTION.EXERCISE,
  INTERVENTION.VOLUME,
  INTERVENTION.NUTRITION_TARGET,
  INTERVENTION.STRUCTURE,
];

/** Position on the ladder; -1 for anything unrecognised. */
export function interventionRank(kind) {
  return LADDER.indexOf(kind);
}

/** The smallest of a set of proposed interventions. */
export function smallestIntervention(kinds = []) {
  const ranked = (Array.isArray(kinds) ? kinds : [])
    .filter((k) => interventionRank(k) >= 0)
    .sort((a, b) => interventionRank(a) - interventionRank(b));
  return ranked[0] ?? INTERVENTION.NONE;
}

// ─── Classification ─────────────────────────────────────────────────────────

/**
 * What is limiting the NUTRITION side?
 *
 * Read in this order, and the order is the product:
 *
 *   1. No usable weight trend -> INSUFFICIENT_EVIDENCE. Everything below
 *      depends on knowing which way the scale is going.
 *   2. Trend is on target -> PLAN is fine; nothing to solve.
 *   3. Trend off target, but intake evidence is UNKNOWN -> we cannot tell
 *      whether the target failed or was never eaten. Not a plan problem, and
 *      explicitly NOT an adherence accusation.
 *   4. Trend off target and the user missed the target IN THE DIRECTION THAT
 *      EXPLAINS IT -> EXECUTION. The target has not been tested.
 *   5. Trend off target and the target WAS eaten -> PLAN. This is the only
 *      route to a calorie change from the trend.
 *
 * Step 4's direction test is the subtle one and it matters. Someone bulking
 * who is not gaining AND ate under target has not disproved their target.
 * Someone bulking who is not gaining while eating AT or OVER it has: their
 * maintenance is higher than we thought, and that is a real plan finding.
 */
export function classifyNutritionLimiter(context) {
  const trend = context?.weight?.trend;
  const intake = context?.nutrition?.intake;
  const coverage = context?.nutrition?.coverage;

  if (!trend || trend.signal === SIGNAL.UNKNOWN) {
    return { limiter: LIMITER.INSUFFICIENT_EVIDENCE, because: 'weight_trend_unknown' };
  }
  if (trend.signal === SIGNAL.GOOD) {
    return { limiter: LIMITER.PLAN, because: 'on_target', onTarget: true };
  }
  if (!intake || intake.signal === SIGNAL.UNKNOWN) {
    return {
      limiter: LIMITER.INSUFFICIENT_EVIDENCE,
      because: coverage?.signal === SIGNAL.UNKNOWN ? 'intake_coverage_unknown' : 'intake_unknown',
    };
  }
  if (intake.signal === SIGNAL.POOR) {
    // Which way did the trend need to move, and which way did they miss?
    // Same sign means the miss explains the outcome, so the target is
    // untested. Opposite sign means the target genuinely under-delivered
    // despite the miss, which is still a real plan finding.
    const missDirection = Number(intake.direction) || 0;
    // `shortfall` is +1 when the athlete needs MORE energy for the trend to
    // reach its intent and -1 when they need less, so it carries the sign of
    // the change the coach would otherwise make. `direction` is -1 when they
    // ate UNDER target and +1 when they ate over. OPPOSITE signs mean the
    // miss points the same way as the shortfall, so it explains the outcome
    // and the target was never actually tested.
    //
    // With no stated shortfall the test is INERT rather than guessed: an
    // unknown intended direction may neither excuse a change nor withhold
    // one.
    const shortfall = shortfallDirection(context);
    const missExplains = shortfall !== 0 && missDirection !== 0
      && Math.sign(missDirection) !== Math.sign(shortfall);
    if (missExplains) {
      return { limiter: LIMITER.EXECUTION, because: 'target_not_eaten', direction: missDirection };
    }
    return { limiter: LIMITER.PLAN, because: 'off_target_despite_miss', onTarget: false };
  }
  return { limiter: LIMITER.PLAN, because: 'off_target_on_adherence', onTarget: false };
}

/**
 * Does the athlete need MORE energy (+1) or LESS (-1) for the trend to reach
 * its intended direction? Supplied by the caller as `weight.shortfall`,
 * because only the goal-phase logic knows what "intended" means; 0 when the
 * caller could not say, which makes the direction test inert rather than
 * guessed.
 */
function shortfallDirection(context) {
  return Number(context?.weight?.shortfall) || 0;
}

/**
 * What is limiting the TRAINING side?
 *
 *   1. Execution unknown or poor -> EXECUTION. A programme cannot be judged
 *      on sessions that did not happen. This is the guard that stops a
 *      plateau produced by absence being read as a plateau produced by the
 *      prescription.
 *   2. Recovery poor -> RECOVERY. Progression should be restrained; the
 *      prescription is not thereby condemned.
 *   3. Progress unknown -> INSUFFICIENT_EVIDENCE.
 *   4. Progress poor with the programme genuinely run and recovered from
 *      -> PLAN.
 *
 * Nutrition appears NOWHERE in this function, deliberately. It is a
 * qualification on what we may SAY (see nutritionQualifier below), never an
 * input to whether training evidence is judgeable.
 */
export function classifyTrainingLimiter(context) {
  const execution = context?.training?.execution;
  const progress = context?.training?.progress;
  const recovery = context?.recovery?.systemic;

  // CC31 (section 20; the section 7 matrix's EXECUTION row): a shortfall
  // EXPLAINED by the user's active restriction reclassifies as
  // CONSTRAINED before the execution read can call it 'sessions_missed'.
  // The condition is deliberately narrow and evidence-backed: an active
  // episode alone never reclassifies an ordinary no-show week - the
  // restriction must actually have SHAPED a session this week, through
  // an excused omission or a recorded substitution (the section 18
  // record; D112 R7 widened this from omissions-only, which made a
  // fully-substituted week unreachable - audit T2-13). An unknown
  // execution read stays INSUFFICIENT_EVIDENCE below - unknown is not a
  // restriction story.
  const pc = context?.training?.physicalConstraint;
  const constraintShapedWeek = !!pc?.active
    && (Number(pc.excusedThisWeek) > 0 || Number(pc.reshapedThisWeek) > 0);
  if (constraintShapedWeek && execution?.signal === SIGNAL.POOR) {
    return {
      limiter: LIMITER.CONSTRAINED,
      because: 'constraint_explained_shortfall',
      scope: Array.isArray(pc.affectedMuscles) ? pc.affectedMuscles : [],
    };
  }

  if (!execution || execution.signal === SIGNAL.UNKNOWN) {
    return { limiter: LIMITER.INSUFFICIENT_EVIDENCE, because: 'execution_unknown' };
  }
  if (execution.signal === SIGNAL.POOR) {
    return { limiter: LIMITER.EXECUTION, because: 'sessions_missed' };
  }
  if (recovery?.signal === SIGNAL.POOR) {
    return { limiter: LIMITER.RECOVERY, because: 'recovery_poor', scope: recovery.scope ?? 'systemic' };
  }
  if (!progress || progress.signal === SIGNAL.UNKNOWN) {
    return { limiter: LIMITER.INSUFFICIENT_EVIDENCE, because: 'progress_unknown' };
  }
  if (progress.signal === SIGNAL.POOR) {
    // Section 20's REGRESSION half (D112 R7; audit T2-12): a week the
    // restriction demonstrably reshaped is not clean programme evidence,
    // so the fall is attributed to the restriction before the programme.
    // The block slope itself is now computed over capability-eligible
    // sets, so a regression manufactured PURELY by the restriction no
    // longer reaches here; what does reach here on a reshaped week still
    // is not grounds to propose exercise changes.
    if (constraintShapedWeek) {
      return {
        limiter: LIMITER.CONSTRAINED,
        because: 'constraint_reshaped_regression',
        scope: Array.isArray(pc.affectedMuscles) ? pc.affectedMuscles : [],
      };
    }
    return { limiter: LIMITER.PLAN, because: 'not_progressing_on_a_run_programme' };
  }
  return { limiter: LIMITER.PLAN, because: 'progressing', progressing: true };
}

/** Both, in one call. */
export function classifyLimiters(context) {
  return {
    nutrition: classifyNutritionLimiter(context),
    training: classifyTrainingLimiter(context),
  };
}

/**
 * May we say anything about nutrition when explaining a TRAINING outcome?
 *
 * FOUNDER LAW (job 5): "Training stalls + nutrition unknown because diary
 * coverage is poor -> UNKNOWN, not 'nutrition caused it'." And: "do not
 * punish the user for not using the diary."
 *
 * Returns 'supports' only where the evidence genuinely exists AND the
 * training side is otherwise judgeable. Everything else is 'unknown', which
 * the copy layer renders as silence rather than as a hedge.
 */
export function nutritionQualifier(context) {
  const coverage = context?.nutrition?.coverage;
  const intake = context?.nutrition?.intake;
  if (coverage?.signal !== SIGNAL.GOOD || !intake || intake.signal === SIGNAL.UNKNOWN) {
    return { state: 'unknown', because: 'not_enough_logged_days' };
  }
  return intake.signal === SIGNAL.GOOD
    ? { state: 'supports', because: 'target_was_eaten' }
    : { state: 'qualifies', because: 'target_was_not_eaten', direction: Number(intake.direction) || 0 };
}

// ─── Minimum effective intervention (job 11) ────────────────────────────────

/**
 * Which domains may change this week, and how much.
 *
 * FOUNDER LAW: "do not change training AND nutrition simultaneously merely
 * because both engines found weak evidence. If one intervention is
 * sufficient, prefer it and observe the response. Where independent
 * high-confidence evidence genuinely supports both changes, both may change -
 * but the receipt must explain each independently."
 *
 * "Strong independent justification" is not a new threshold invented here: it
 * is exactly `limiter === PLAN`, which by construction already required that
 * domain's own coverage and adherence/execution to be GOOD. A domain whose
 * evidence is thin cannot reach PLAN, so it can never be half of a
 * change-both decision.
 *
 * Returns { nutrition, training, both, holds[] } where each domain carries
 * the largest intervention it is ALLOWED, not the one it will necessarily
 * make - the owning engine still applies its own safety gates on top and may
 * do less.
 */
export function chooseInterventions(context, limiters = null) {
  const l = limiters || classifyLimiters(context);
  const holds = [];

  const nutritionAllowed = (() => {
    if (l.nutrition.limiter === LIMITER.PLAN && l.nutrition.onTarget === false) {
      return INTERVENTION.NUTRITION_TARGET;
    }
    if (l.nutrition.limiter === LIMITER.EXECUTION) {
      holds.push({ domain: 'nutrition', reason: 'target_not_eaten' });
      return INTERVENTION.EXPLAIN;
    }
    if (l.nutrition.limiter === LIMITER.INSUFFICIENT_EVIDENCE) {
      holds.push({ domain: 'nutrition', reason: l.nutrition.because });
      return INTERVENTION.NONE;
    }
    return INTERVENTION.NONE; // on target: keep
  })();

  const trainingAllowed = (() => {
    // CC31 (section 20): under CONSTRAINED the intervention caps at
    // EXPLAIN (plus exercise-substitution OFFERS for affected slots,
    // which the owning surfaces already carry via the section 9.4/17
    // flows). Volume adds for affected muscles are blocked at the
    // per-muscle apply path; unaffected muscles coach normally. And
    // NOTHING here reaches nutrition: a restricted week is never a
    // calorie story (see conflictOutcome's neverClaim).
    if (l.training.limiter === LIMITER.CONSTRAINED) {
      holds.push({ domain: 'training', reason: 'constraint_active' });
      return INTERVENTION.EXPLAIN;
    }
    if (l.training.limiter === LIMITER.EXECUTION) {
      holds.push({ domain: 'training', reason: 'sessions_missed' });
      return INTERVENTION.EXPLAIN;
    }
    if (l.training.limiter === LIMITER.RECOVERY) {
      // Restraint is itself an intervention, and the smallest one that
      // addresses recovery is a volume hold rather than an exercise change.
      return INTERVENTION.VOLUME;
    }
    if (l.training.limiter === LIMITER.INSUFFICIENT_EVIDENCE) {
      holds.push({ domain: 'training', reason: l.training.because });
      return INTERVENTION.NONE;
    }
    if (l.training.progressing) return INTERVENTION.NONE; // keep: it is working
    // A judged, run, recovered programme that is not moving. The smallest
    // thing that plausibly fixes it comes first; the owning engine decides
    // whether a prescription change is enough or an exercise must go.
    return INTERVENTION.EXERCISE;
  })();

  const changesNutrition = nutritionAllowed === INTERVENTION.NUTRITION_TARGET;
  const changesTraining = trainingAllowed === INTERVENTION.EXERCISE
    || trainingAllowed === INTERVENTION.VOLUME;

  return {
    nutrition: nutritionAllowed,
    training: trainingAllowed,
    // Both may change only when each reached PLAN on its own evidence. There
    // is no path here in which two weak readings add up to two changes.
    both: changesNutrition && changesTraining,
    smallest: smallestIntervention([nutritionAllowed, trainingAllowed]),
    holds,
  };
}

// ─── THE COORDINATION GATE (adversarial closure, job C) ─────────────────────

/**
 * WHAT WAS WRONG, stated plainly. `chooseInterventions` above encodes the
 * founder's minimum-effective-intervention law, and until now its ONLY
 * consumer was `coachStory` - the copy layer. So the app could describe a
 * precedence it did not practise: the sentence said "we changed one thing this
 * week" while the engines were free to change two. Precedence that exists only
 * in the story is not precedence.
 *
 * THE SHAPE CHOSEN (founder option 2, not option 1). The domain engines stay
 * authoritative. `nutritionEngine` still owns calorie floors, the FFM energy
 * floor and the ED lockouts; `weeklyCoach`'s autoregulation still owns the
 * volume decision; `planEngine` still owns structure. Routing those through a
 * single chooser would move safety-critical clamps away from the code that
 * owns them, which is the opposite of what Section 2 requires. Instead this
 * gate sits ACROSS their real, already-computed proposals and answers one
 * question: given what each engine actually decided this week, which of those
 * changes may proceed together?
 *
 * IT CAN ONLY EVER WITHHOLD. There is no path here that creates a change,
 * enlarges one, reverses one or relaxes a clamp. Every safety gate in every
 * engine still runs, and this runs on what survives them.
 *
 * SAFETY IS SENIOR TO PRECEDENCE, exactly as the ladder's own header says. A
 * change the caller marks as safety-driven (the rapid-loss correction) and any
 * volume REDUCTION are never withheld: easing an athlete who is not recovering,
 * or feeding one who is losing weight too fast, must never wait its turn
 * behind a coordination rule.
 *
 * THE THREE RULES:
 *
 *   R1 NUTRITION PERMISSION. A target the athlete did not eat has not been
 *      tested, so the answer is to hold it rather than to pick a new number.
 *   R2 TRAINING PERMISSION. Volume may not be ADDED to a programme that is
 *      not being run, or to an athlete whose recovery evidence calls for
 *      restraint. Reductions are untouched.
 *   R3 MINIMUM EFFECTIVE INTERVENTION. The founder's law is specific: "do not
 *      change training AND nutrition simultaneously MERELY BECAUSE BOTH
 *      ENGINES FOUND WEAK EVIDENCE." So this fires on the weak half, never on
 *      the pair. When both domains want to move in the same week, whichever
 *      one could not reach a real verdict on its own evidence
 *      (INSUFFICIENT_EVIDENCE) is the one that waits, because its change is
 *      the one nobody could read afterwards. A domain that DID reach PLAN
 *      keeps its change: two strong independent findings may both act, and the
 *      receipt explains each on its own.
 *
 *      It is deliberately NOT a blanket "smallest rung wins". Ordinary weekly
 *      autoregulation moves volume most weeks; treating every routine nudge as
 *      an intervention competing with a calorie decision would withhold
 *      well-evidenced nutrition changes for no coaching reason.
 *
 * @param {object} p
 * @param {object} p.context    the coach context
 * @param {object} [p.limiters] classifyLimiters output, if already computed
 * @param {object} p.proposed   { calorieChange, volumeChange } - the engines'
 *                              REAL proposals for this run, signed
 * @param {object} [p.safety]   { calorie: boolean } - proposals that are
 *                              safety corrections and outrank this gate
 * @returns {{ allowCalorieChange, allowVolumeChange, holds, both }}
 */
export function coordinateChanges({
  context = null, limiters = null, proposed = {}, safety = {},
} = {}) {
  const l = limiters || classifyLimiters(context);
  const plan = chooseInterventions(context, l);
  const holds = [];

  const calorieChange = Number(proposed.calorieChange) || 0;
  const volumeChange = Number(proposed.volumeChange) || 0;
  const calorieIsSafety = !!safety.calorie;
  // Easing off is never a coordination question.
  const volumeIsRestraint = volumeChange < 0;

  let allowCalorieChange = calorieChange !== 0;
  let allowVolumeChange = volumeChange !== 0;

  // R1.
  if (allowCalorieChange && !calorieIsSafety
      && l.nutrition.limiter === LIMITER.EXECUTION) {
    allowCalorieChange = false;
    holds.push({ domain: 'nutrition', reason: 'target_not_eaten' });
  }

  // R2.
  if (allowVolumeChange && !volumeIsRestraint) {
    if (l.training.limiter === LIMITER.EXECUTION) {
      allowVolumeChange = false;
      holds.push({ domain: 'training', reason: 'sessions_missed' });
    } else if (l.training.limiter === LIMITER.CONSTRAINED) {
      // CC31 (section 20): a week whose shortfall the restriction
      // explains proves nothing about the dose, so a body-wide ADD is
      // withheld - with the constraint named, never adherence. A future
      // progressing week under the same episode proposes normally, and
      // the per-muscle apply hold protects the affected muscles there.
      allowVolumeChange = false;
      holds.push({ domain: 'training', reason: 'constraint_active' });
    } else if (l.training.limiter === LIMITER.RECOVERY) {
      allowVolumeChange = false;
      holds.push({ domain: 'training', reason: 'recovery_calls_for_restraint' });
    }
  }

  // R3. Only reached when both survived their own permission rule.
  if (allowCalorieChange && allowVolumeChange && !volumeIsRestraint) {
    if (l.training.limiter === LIMITER.INSUFFICIENT_EVIDENCE) {
      allowVolumeChange = false;
      holds.push({ domain: 'training', reason: 'one_change_at_a_time' });
    } else if (!calorieIsSafety
        && l.nutrition.limiter === LIMITER.INSUFFICIENT_EVIDENCE) {
      allowCalorieChange = false;
      holds.push({ domain: 'nutrition', reason: 'one_change_at_a_time' });
    }
  }

  return { allowCalorieChange, allowVolumeChange, holds, both: !!plan.both };
}

// ─── The conflict matrix (job 16) ───────────────────────────────────────────

/**
 * The founder's ten dangerous combinations, expressed as a lookup rather than
 * a state machine.
 *
 * Each row is derived from the classification above rather than restating it,
 * so the matrix cannot drift away from the behaviour: this function answers
 * "what may change, what must hold, what may be claimed, what stays unknown"
 * for whatever context it is handed.
 */
export function conflictOutcome(context) {
  const l = classifyLimiters(context);
  const plan = chooseInterventions(context, l);
  const qualifier = nutritionQualifier(context);

  const mayClaim = [];
  const mustRemainUnknown = [];

  if (context?.weight?.trend?.signal === SIGNAL.UNKNOWN) mustRemainUnknown.push('weight_direction');
  else mayClaim.push('weight_direction');

  if (qualifier.state === 'unknown') mustRemainUnknown.push('nutrition_interpretation');
  else mayClaim.push('nutrition_interpretation');

  if (context?.training?.execution?.signal === SIGNAL.UNKNOWN) mustRemainUnknown.push('training_execution');
  else mayClaim.push('training_execution');

  if (context?.recovery?.systemic?.signal === SIGNAL.UNKNOWN) mustRemainUnknown.push('recovery');
  else mayClaim.push('recovery');

  if (l.training.limiter === LIMITER.INSUFFICIENT_EVIDENCE) mustRemainUnknown.push('training_progress');

  return {
    limiters: l,
    mayChange: [
      ...(plan.nutrition === INTERVENTION.NUTRITION_TARGET ? ['nutrition_target'] : []),
      ...(plan.training === INTERVENTION.EXERCISE ? ['exercise'] : []),
      ...(plan.training === INTERVENTION.VOLUME ? ['volume'] : []),
    ],
    mustHold: plan.holds.map((h) => h.domain),
    mayClaim,
    mustRemainUnknown,
    // NEVER claimable from this layer, in any combination. Correlation is not
    // causation and the app does not observe the mechanism.
    // CC31 (PD-4 wiring + section 20): the capability entries join the
    // register - an active restriction never becomes a recovery verdict
    // about the person ("you are recovering badly") and never justifies a
    // nutrition action. runWeeklyCoach records this block on every
    // output, and the invariant suite holds the REAL outputs to it.
    neverClaim: [
      'nutrition_caused_training_outcome',
      'training_caused_weight_outcome',
      'capability_caused_recovery_outcome',
      'constraint_justified_nutrition_change',
    ],
  };
}
