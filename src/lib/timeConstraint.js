/**
 * timeConstraint.js — Campaign 16 closure: the user's session length is a
 * CONSTRAINT, not a label.
 *
 * FOUNDER LAW: "THE USER'S REQUESTED SESSION DURATION IS A PLAN CONSTRAINT,
 * NOT MERELY AN ESTIMATION LABEL. Volyume must build the strongest sensible
 * hypertrophy programme that fits inside the user's stated time
 * availability. Do NOT simply generate the unconstrained volume
 * prescription and report that it takes longer."
 *
 * WHAT WAS WRONG
 *
 * The engine generated the volume its landmarks asked for, trimmed only
 * until its hard caps were satisfied, and then stamped an honest duration
 * on the result. A user asking for 45 minutes routinely received 66 to 78
 * minute sessions with a note explaining that this was normal. Accurately
 * describing an 80-minute workout does not answer a 45-minute request.
 *
 * The trim could not do better because everything in a short session was
 * protected: each muscle had exactly one exercise, and "never remove a
 * muscle's only exercise" made the whole session untrimmable. The
 * protection is right; what was missing is that a muscle trained on more
 * than one day can lose ONE of those days without losing the muscle.
 *
 * THE SCIENCE, STATED HONESTLY
 *
 * Weekly volume matters for hypertrophy and has diminishing returns. There
 * is no scientifically exact optimal session length and this module does
 * not invent one - there is no "45-minute hypertrophy maximum" anywhere in
 * it. This is constraint optimisation: fit the most useful training into
 * the time the user actually has, and say so plainly when it cannot be
 * done.
 *
 * THE LADDER, in the founder's order
 *
 *   1. redundant selections and duplicate movement coverage
 *   2. the minimum sensible number of exercises for the muscular roles
 *   3. prioritised / weak-point volume preserved preferentially
 *   4. useful structural coverage preserved
 *   5. discretionary volume trimmed from lowest-priority muscles first
 *   6. frequency redistributed across the user's AVAILABLE sessions, never
 *      by adding a day
 *   7. rest and transition time left realistic
 *   8. delivered volume recounted after every material trim (the caller
 *      builds the weekly summary from the workouts this returns, so the
 *      recount is structural rather than a step that can be forgotten)
 *
 * WHAT IT MAY NEVER DO
 *
 * No supersets, no implausibly short rest, no deleting a muscle's only
 * exercise in the week, no added training days, and no silent breach of a
 * hard volume or safety invariant. When the constraint genuinely cannot be
 * met, it says so rather than quietly returning an 80-minute session.
 */

export const FIT_STATUS = Object.freeze({
  /** Everything fits inside the requested length. */
  FIT: 'fit',
  /**
   * A legitimate lower-volume plan was produced inside the time
   * constraint, without breaching a hard minimum.
   */
  CONSTRAINED_BUT_VALID: 'constrained_but_valid',
  /**
   * The requested days and length cannot honestly carry the required
   * minimum programme. The user is owed a choice.
   */
  USER_DECISION_REQUIRED: 'user_decision_required',
});

/**
 * How far over the requested length a session may land and still count as
 * fitting.
 *
 * A PRODUCT HEURISTIC, not science: the duration is an estimate built from
 * assumed set and rest times, and a real session drifts either side of it.
 * Five minutes is small enough that it cannot be used to excuse the defect
 * this module exists to fix - it turns 45 into at most 50, never into 65 -
 * and large enough that a plan is not churned to chase a rounding error.
 */
export const TIME_TOLERANCE_MIN = 5;

/**
 * Muscle trim priority, lowest priority FIRST.
 *
 * The order is ordinary bodybuilding practice, not a discovery: when a
 * session will not fit, the accessories give way before the movements the
 * programme is built around. Weak points are lifted out of this order
 * entirely by the caller's `weakPointKeys` and trimmed last of all.
 */
const TRIM_ORDER = [
  'forearms', 'abs', 'calves', 'traps', 'adductors', 'abductors',
  'rear_delts', 'front_delts', 'biceps', 'triceps', 'side_delts',
  'glutes', 'hamstrings', 'quads', 'back', 'chest',
];

const priorityOf = (muscle, weakPointKeys) => {
  if (weakPointKeys.includes(muscle)) return 1000; // never first to go
  const i = TRIM_ORDER.indexOf(muscle);
  return i === -1 ? 0 : i;
};

/**
 * Fit an assembled week inside the requested session length.
 *
 * Pure. `estimate(exercises)` is the caller's own session estimator, passed
 * in so this module cannot drift from the number the user is shown - the
 * founder's contract is explicit that we must not optimise against one
 * estimate and display another.
 *
 * @param {Array} workouts   [{ name, exercises: [{ _m, _req, sets, ... }] }]
 * @param {object} opts
 * @param {number} opts.sessionLengthMinutes  0/null means no constraint
 * @param {(exercises: Array) => number} opts.estimate
 * @param {string[]} [opts.weakPointKeys]
 * @param {number} [opts.minSetsPerEntry]
 * @param {number} [opts.tolerance]
 * @returns {{ workouts: Array, status: string, over: Array, trimmed: boolean }}
 */
export function fitToTimeBudget(workouts, {
  sessionLengthMinutes,
  estimate,
  weakPointKeys = [],
  minSetsPerEntry = 3,
  tolerance = TIME_TOLERANCE_MIN,
  structuralFloors = {},
  weeklyFloors = {},
  priorityMuscles = [],
} = {}) {
  const budget = Number(sessionLengthMinutes) || 0;
  if (!budget || typeof estimate !== 'function' || !Array.isArray(workouts)) {
    return { workouts, status: FIT_STATUS.FIT, over: [], trimmed: false };
  }
  const ceiling = budget + tolerance;

  const result = workouts.map(w => ({ ...w, exercises: w.exercises.map(e => ({ ...e })) }));
  let trimmed = false;

  /** Muscles trained in exactly ONE session across the week. */
  const sessionCount = {};
  for (const w of result) {
    for (const m of new Set(w.exercises.map(e => e._m).filter(Boolean))) {
      sessionCount[m] = (sessionCount[m] ?? 0) + 1;
    }
  }

  // The per-session volume a muscle must keep. Computed by the caller from
  // the real landmarks (MEV, maintenance floors, weak-point boosts), and
  // treated here as a HARD floor.
  //
  // The founder's ladder says to preserve prioritised and structural volume
  // and forbids silently breaching a volume invariant. Without this the
  // resolver happily trimmed a de-emphasised division's quads below their
  // maintenance floor and a weak point below the boost the user asked for,
  // which is a different plan, not a shorter one. When the floors mean the
  // session cannot fit, the honest answer is USER_DECISION_REQUIRED, and
  // that is what falls out below.
  const muscleTotal = (exercises, m) =>
    exercises.reduce((sum, e) => sum + (e._m === m ? (e.sets ?? 0) : 0), 0);
  const floorFor = m => structuralFloors[m] ?? 0;

  // WEEKLY floor, on top of the per-session structural one.
  //
  // structuralFloors only covers the muscles a division treats as
  // structural, so a muscle outside it had a floor of zero here and could
  // be trimmed freely. The caller supplies a real per-muscle weekly floor
  // (its MEV, or the maintenance floor where that is higher), because
  // "do not silently violate a hard volume invariant" means the muscle's
  // own minimum, not a single number for the whole body.
  //
  // The bound is min(what the muscle already had, its floor): a muscle that
  // started below its floor is simply not trimmed further, rather than
  // being treated as having room because it was already short.
  const weeklyBefore = {};
  for (const w of result) {
    for (const e of w.exercises) {
      if (!e._m) continue;
      weeklyBefore[e._m] = (weeklyBefore[e._m] ?? 0) + (e.sets ?? 0);
    }
  }
  const weeklyNow = m => result.reduce((sum, w) => sum + muscleTotal(w.exercises, m), 0);
  const weeklyFloor = m => Math.min(weeklyBefore[m] ?? 0, weeklyFloors[m] ?? 0);
  const weeklyAllows = (m, cost) => weeklyNow(m) - cost >= weeklyFloor(m);
  // Volume the resolver may not touch.
  //
  // A weak point is what the user explicitly asked to prioritise. A
  // PRIORITY muscle is one the division deliberately emphasises - a Bikini
  // athlete's glutes are the point of the plan, not discretionary volume -
  // and trimming it produces a different plan rather than a shorter one.
  const isProtected = m => weakPointKeys.includes(m) || priorityMuscles.includes(m);

  for (const w of result) {
    let safety = 40;
    while (estimate(w.exercises) > ceiling && safety-- > 0) {
      const before = w.exercises.length;

      // ── 1 and 2: redundant coverage, down to one exercise per muscle ────
      // A second exercise for a muscle that already has one in this session
      // adds an angle, not coverage. When the clock will not allow both,
      // the angle is the discretionary half. `_req` entries are the ones
      // credited with covering a required movement, so they are kept.
      const seen = new Map();
      let dropIdx = -1;
      for (let i = 0; i < w.exercises.length; i++) {
        const ex = w.exercises[i];
        const m = ex._m;
        if (!m) continue;
        if (seen.has(m) && !ex._req
          && !isProtected(m)
          && muscleTotal(w.exercises, m) - (ex.sets ?? 0) >= floorFor(m)
          && weeklyAllows(m, ex.sets ?? 0)) {
          dropIdx = i;
        } else if (!seen.has(m)) {
          seen.set(m, i);
        }
      }

      // ── 6: frequency redistribution across AVAILABLE sessions ───────────
      // A muscle trained on more than one day can lose one of those days
      // and still be trained. This lowers frequency; it never removes the
      // muscle from the week, and it never adds a day. Lowest-priority
      // muscle first, weak points last, and never the session opener.
      if (dropIdx === -1) {
        let worstPriority = Infinity;
        for (let i = w.exercises.length - 1; i >= 1; i--) {
          const m = w.exercises[i]._m;
          if (!m) continue;
          // Sole-session muscles are untouchable: dropping one here takes
          // the muscle to zero for the WEEK, which is the defect this
          // campaign already fixed once and must not reintroduce.
          if ((sessionCount[m] ?? 0) <= 1) continue;
          if (isProtected(m)) continue;
          // Removing this exercise takes the muscle below the volume the
          // programme has to keep in THIS session.
          if (muscleTotal(w.exercises, m) - (w.exercises[i].sets ?? 0) < floorFor(m)) continue;
          if (!weeklyAllows(m, w.exercises[i].sets ?? 0)) continue;
          const p = priorityOf(m, weakPointKeys);
          if (p < worstPriority) { worstPriority = p; dropIdx = i; }
        }
      }

      if (dropIdx !== -1) {
        const dropped = w.exercises[dropIdx];
        w.exercises.splice(dropIdx, 1);
        // The muscle is one session less frequent now.
        if (dropped._m && !w.exercises.some(e => e._m === dropped._m)) {
          sessionCount[dropped._m] = Math.max(0, (sessionCount[dropped._m] ?? 1) - 1);
        }
        trimmed = true;
        continue;
      }

      // ── 3, 4, 5: shave discretionary sets, lowest priority first ────────
      // Never below the anti-fragmentation floor: a two-set entry is not a
      // smaller version of the exercise, it is a worse one.
      let setIdx = -1;
      let setPriority = Infinity;
      for (let i = w.exercises.length - 1; i >= 0; i--) {
        const ex = w.exercises[i];
        if ((ex.sets ?? 0) <= minSetsPerEntry) continue;
        if (isProtected(ex._m)) continue;
        if (muscleTotal(w.exercises, ex._m) - 1 < floorFor(ex._m)) continue;
        if (!weeklyAllows(ex._m, 1)) continue;
        const p = priorityOf(ex._m, weakPointKeys);
        if (p < setPriority) { setPriority = p; setIdx = i; }
      }
      if (setIdx !== -1) {
        w.exercises[setIdx].sets -= 1;
        trimmed = true;
        continue;
      }

      // Nothing left that may be given up without breaching a floor.
      if (w.exercises.length === before) break;
    }
  }

  const over = result
    .map(w => ({ name: w.name, minutes: Math.ceil(estimate(w.exercises)) }))
    .filter(x => x.minutes > ceiling);

  const status = over.length > 0
    ? FIT_STATUS.USER_DECISION_REQUIRED
    : (trimmed ? FIT_STATUS.CONSTRAINED_BUT_VALID : FIT_STATUS.FIT);

  return { workouts: result, status, over, trimmed };
}

/**
 * The honest message for a constraint that could not be met.
 *
 * Offers a real choice and never resolves it on the user's behalf. Adding a
 * training day is presented as an OPTION only, and only when it would
 * genuinely help; Volyume never increases the day count itself.
 */
export function constraintChoiceCopy({
  sessionLengthMinutes, daysPerWeek, over = [], canAddDay = false,
} = {}) {
  const worst = over.reduce((a, b) => (b.minutes > (a?.minutes ?? 0) ? b : a), null);
  const body = worst
    ? `Your current setup cannot fit the full target into ${sessionLengthMinutes}-minute sessions. The longest session comes out around ${worst.minutes} minutes.`
    : `Your current setup cannot fit the full target into ${sessionLengthMinutes}-minute sessions.`;
  const options = [
    {
      id: 'keep_length',
      label: `Keep ${sessionLengthMinutes} minutes`,
      detail: 'Use the best lower-volume plan that fits the time you have.',
    },
    {
      id: 'allow_longer',
      label: 'Allow longer sessions',
      detail: 'Keep the full training target and accept the longer session.',
    },
  ];
  if (canAddDay) {
    options.push({
      id: 'consider_extra_day',
      label: 'Consider another training day',
      detail: `A ${daysPerWeek + 1}th session would give the same work more room. Only you can decide if that fits your week.`,
    });
  }
  return { body, options };
}
