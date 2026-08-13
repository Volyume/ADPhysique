/**
 * planFit.js — how well the athlete's chosen schedule fits the plan Volyume
 * would build for them.
 *
 * FOUNDER LAW: "The recommendation must be derived from the actual Volyume
 * prescription." No lookup table, no "4 days = 45-55 minutes", no universal
 * minutes-per-session optimum - there is no scientific basis for one. Two
 * athletes choosing four sessions can legitimately get different answers,
 * because their plans are different.
 *
 * HOW IT WORKS
 *
 * It runs the REAL generator. Not an approximation of it, not a parallel
 * model of it: `generatePlan` is pure and deterministic, so asking it "what
 * would you build at 3 sessions of 45 minutes?" is free and its answer is
 * exactly what the user would receive. Every alternative offered is
 * computed the same way. Nothing is persisted.
 *
 * WHAT IT ANSWERS
 *
 *   1. can a coherent plan be built at this schedule at all?
 *   2. can the plan Volyume actually wants to start with be delivered
 *      without trimming for the clock?
 *   3. would more time simply go unused?
 *
 * WHAT IT MUST NEVER DO
 *
 * Change the user's selection, add a session, invent volume to fill spare
 * time, or nag. It recommends; the athlete decides.
 *
 * COPY
 *
 * The state names below are internal. Everything the user reads comes from
 * `fitCopy` and is written for someone who goes to the gym and has never
 * read a training paper: no MEV, no volume landmarks, no capacity envelope,
 * no movement families. "Sophisticated underneath, obvious on the surface."
 */

/**
 * Internal fit states. NEVER rendered directly - `fitCopy` translates them.
 */
export const PLAN_FIT = Object.freeze({
  /** The plan Volyume wants to start with fits, with room to spare. */
  EXTRA_HEADROOM: 'extra_headroom',
  /** The plan Volyume wants to start with fits. */
  FULL_TARGET_FIT: 'full_target_fit',
  /** A real plan fits, with some lower-priority work started lighter. */
  VALID_TIME_CONSTRAINED: 'valid_time_constrained',
  /** Not without making the sessions longer. The athlete needs a choice. */
  INSUFFICIENT_FOR_VALID_PLAN: 'insufficient_for_valid_plan',
});

/**
 * How much spare time counts as "plenty".
 *
 * A PRODUCT HEURISTIC. The estimate is approximate and real sessions drift,
 * so this is deliberately generous: it takes a clear fifteen minutes of
 * unused time before we tell someone they have picked more than they need.
 */
const HEADROOM_MIN = 15;

/**
 * Classify one generated plan against the length that was asked for.
 *
 * `timeConstraint` is the engine's own structured result, so this cannot
 * drift from what generation actually did.
 */
export function classifyFit(plan, requestedMinutes) {
  const status = plan?.timeConstraint?.status ?? null;
  if (status === 'user_decision_required') return PLAN_FIT.INSUFFICIENT_FOR_VALID_PLAN;
  if (status === 'constrained_but_valid') return PLAN_FIT.VALID_TIME_CONSTRAINED;

  const longest = Math.max(0, ...(plan?.workouts ?? []).map(w => w.estimatedDurationMinutes ?? 0));
  if (requestedMinutes && longest > 0 && (requestedMinutes - longest) >= HEADROOM_MIN) {
    return PLAN_FIT.EXTRA_HEADROOM;
  }
  return PLAN_FIT.FULL_TARGET_FIT;
}

/** Is this state one the athlete can proceed on without a decision? */
export const isWorkable = state => state !== PLAN_FIT.INSUFFICIENT_FOR_VALID_PLAN;

/**
 * The full assessment for a selected schedule, plus alternatives that are
 * CALCULATED rather than assumed.
 *
 * @param {object} params
 * @param {object} params.inputs        the engine inputs for the current answers
 * @param {(inputs: object) => object} params.generate  normally generatePlan
 * @param {number[]} [params.durationOptions]  the durations the UI offers
 * @param {number[]} [params.dayOptions]       the session counts the UI offers
 * @returns {{
 *   state: string, daysPerWeek: number, sessionLengthMinutes: number,
 *   longestSessionMinutes: number, typicalSessionMinutes: number,
 *   alternatives: Array<{kind, daysPerWeek, sessionLengthMinutes, state}>,
 * }}
 */
export function assessPlanFit({
  inputs,
  generate,
  durationOptions = [45, 60, 75, 90],
  dayOptions = [2, 3, 4, 5, 6],
} = {}) {
  const requested = Number(inputs?.sessionLengthMinutes) || 0;
  const days = Number(inputs?.daysPerWeek) || 0;
  const plan = generate(inputs);
  const state = classifyFit(plan, requested);

  const durations = (plan?.workouts ?? []).map(w => w.estimatedDurationMinutes ?? 0);
  const longest = Math.max(0, ...durations);
  const typical = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  // Alternatives are only offered when the current choice is not already
  // delivering the plan we would start with. Suggesting changes to someone
  // whose schedule already works is nagging.
  const alternatives = [];
  if (state === PLAN_FIT.VALID_TIME_CONSTRAINED
    || state === PLAN_FIT.INSUFFICIENT_FOR_VALID_PLAN) {
    // More time, same number of sessions. The smallest step that works.
    for (const minutes of durationOptions.filter(m => m > requested).sort((a, b) => a - b)) {
      const alt = classifyFit(generate({ ...inputs, sessionLengthMinutes: minutes }), minutes);
      if (alt === PLAN_FIT.FULL_TARGET_FIT || alt === PLAN_FIT.EXTRA_HEADROOM) {
        alternatives.push({
          kind: 'longer_sessions', daysPerWeek: days, sessionLengthMinutes: minutes, state: alt,
        });
        break;
      }
    }
    // More sessions, same length. Offered as an OPTION; Volyume never
    // changes the athlete's day count itself.
    for (const d of dayOptions.filter(x => x > days).sort((a, b) => a - b)) {
      const alt = classifyFit(generate({ ...inputs, daysPerWeek: d }), requested);
      if (alt === PLAN_FIT.FULL_TARGET_FIT || alt === PLAN_FIT.EXTRA_HEADROOM) {
        alternatives.push({
          kind: 'more_sessions', daysPerWeek: d, sessionLengthMinutes: requested, state: alt,
        });
        break;
      }
    }
  }

  return {
    state,
    daysPerWeek: days,
    sessionLengthMinutes: requested,
    longestSessionMinutes: longest,
    typicalSessionMinutes: typical,
    alternatives,
  };
}

/**
 * Decorate each duration the UI offers with how the plan fits at it.
 *
 * Labels describe the FIT, not a minute threshold, and the module header
 * says so: there is no universal optimum and none is implied here.
 */
export function assessDurationOptions({ inputs, generate, durationOptions = [45, 60, 75, 90] } = {}) {
  return durationOptions.map((minutes) => {
    const state = classifyFit(generate({ ...inputs, sessionLengthMinutes: minutes }), minutes);
    return { minutes, state, label: durationLabel(state) };
  });
}

/** Calm one-word-ish decoration for a duration choice. */
export function durationLabel(state) {
  switch (state) {
    case PLAN_FIT.INSUFFICIENT_FOR_VALID_PLAN: return 'Too tight';
    case PLAN_FIT.VALID_TIME_CONSTRAINED: return 'Works';
    case PLAN_FIT.EXTRA_HEADROOM: return 'Plenty of room';
    case PLAN_FIT.FULL_TARGET_FIT: return 'Recommended';
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Plain English
// ---------------------------------------------------------------------------

/**
 * What the athlete reads.
 *
 * The everyday-gym-user test applies to every string here: someone who
 * trains, understands sets and reps, and has never read a training paper
 * should understand it immediately. No internal vocabulary, no percentages,
 * no claim that any schedule is "optimal".
 *
 * @param {string} state
 * @param {object} ctx { daysPerWeek, sessionLengthMinutes, typicalSessionMinutes,
 *                       alternatives }
 */
export function fitCopy(state, ctx = {}) {
  const {
    daysPerWeek, sessionLengthMinutes, typicalSessionMinutes, alternatives = [],
  } = ctx;
  const sessions = daysPerWeek === 1 ? '1 workout' : `${daysPerWeek} workouts`;
  switch (state) {
    case PLAN_FIT.EXTRA_HEADROOM:
      return {
        title: 'Plenty of time',
        body: typicalSessionMinutes
          ? `You have got more time than your plan needs. Most workouts should take around ${roundToFive(typicalSessionMinutes)} minutes.`
          : 'You have got more time than your plan needs, so most workouts should finish earlier than that.',
      };
    case PLAN_FIT.FULL_TARGET_FIT:
      return {
        title: 'Great fit',
        body: `${sessions} of around ${sessionLengthMinutes} minutes gives us enough room for the training we would normally recommend for you.`,
      };
    case PLAN_FIT.VALID_TIME_CONSTRAINED:
      return {
        title: 'Tighter fit',
        body: 'This works. We will keep your workouts focused and start some of the less important work a little lighter so your sessions actually fit.',
      };
    case PLAN_FIT.INSUFFICIENT_FOR_VALID_PLAN:
    default:
      return {
        title: 'Needs a choice',
        body: alternatives.length
          ? `We cannot fit everything we would normally include into ${sessions} of ${sessionLengthMinutes} minutes without your workouts running longer. Here are your options.`
          : `We cannot fit everything we would normally include into ${sessions} of ${sessionLengthMinutes} minutes. You can still start here, and your workouts will run a little longer than that.`,
      };
  }
}

/** Plain-English label for one calculated alternative. */
export function alternativeCopy(alt) {
  if (!alt) return null;
  if (alt.kind === 'longer_sessions') {
    return {
      label: `${alt.daysPerWeek} x ${alt.sessionLengthMinutes} min`,
      detail: 'Gives us room for the full plan we would normally start you on.',
    };
  }
  return {
    label: `${alt.daysPerWeek} x ${alt.sessionLengthMinutes} min`,
    detail: 'Spreading the same work over another session gives it more room.',
  };
}

/**
 * The "keep what I chose" option. Never framed as the wrong answer, and never
 * dressed up either: when the schedule genuinely cannot hold the plan, this
 * says how long the longest workout is likely to take rather than implying it
 * will finish on time.
 */
export function keepChoiceCopy({
  daysPerWeek, sessionLengthMinutes, state, longestSessionMinutes,
} = {}) {
  const overruns = state === PLAN_FIT.INSUFFICIENT_FOR_VALID_PLAN
    && longestSessionMinutes > sessionLengthMinutes;
  return {
    label: `${daysPerWeek} x ${sessionLengthMinutes} min`,
    detail: overruns
      ? `Keep this. Your longest workout should take around ${roundToFive(longestSessionMinutes)} minutes.`
      : 'The best plan we can build around the time you have.',
  };
}

/** Rounded so the copy never implies minute-level precision. */
function roundToFive(n) {
  return Math.round(n / 5) * 5;
}
