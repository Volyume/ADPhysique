/**
 * blockProgression.js — Campaign 18 block-progression amendment.
 *
 * THE DEFECT THIS REPLACES. Programme position was a single integer,
 * `programmes.next_workout_index`, advanced by `advancePlanNextWorkout` on ANY
 * completion regardless of which routine was performed. So an athlete whose
 * next required session was Legs, who trained Push & Arms instead, had the
 * pointer moved PAST Legs. Legs was never performed and never marked anything:
 * it was consumed by a counter. There was no representation anywhere in the
 * app of "this required session is still outstanding".
 *
 * VOLYUME TRAINING IS SESSION-SEQUENCED, NOT CALENDAR-SEQUENCED. Dates remain
 * the authority for elapsed time, evidence freshness and history. They are not
 * the authority for which workout is next, whether a week is finished, or
 * whether the recovery phase has begun.
 *
 * THE TWO DIMENSIONS, kept apart deliberately:
 *
 *   EXECUTION TRUTH     what was actually performed. Owned entirely by the
 *                       existing workout/set rows. Nothing here writes,
 *                       fabricates or erases a single set.
 *   SESSION RESOLUTION  whether the programme should keep bringing this
 *                       required session back. That is all it decides.
 *
 * Conflating them is what produces both forbidden outcomes: marking a
 * part-performed session COMPLETED (which claims work that never happened) and
 * marking it SKIPPED (which erases work that did).
 *
 * REQUIRED SESSIONS COME FROM THE PROGRAMME, NOT FROM EXECUTION. A workout row
 * proves something was performed; it cannot say what was required, because an
 * outstanding or skipped session has no row at all. So the required set is
 * always the programme's own routines for the week, and execution is matched
 * ONTO it.
 *
 * IDENTITY: (mesocycleWeekId, routineId), proven sufficient in
 * requiredSessionIdentity.test.js. Names repeat legitimately (the bikini
 * Glute Focus split lists "Glutes" twice in one week) but each entry is its own
 * routine row with its own uid, so the pair is unique and survives renames,
 * exercise substitution, reordering and restarts.
 *
 * PURE. No I/O, no clock. Callers supply rows and, where a decision needs
 * "now", pass it in.
 */

/**
 * What has become of one required session.
 *
 * These are PROGRESSION states. They are not a replacement for the granular
 * execution ledger, and three of them say nothing at all about how much work
 * was done.
 */
export const SESSION_STATE = Object.freeze({
  OUTSTANDING: 'outstanding',
  COMPLETED: 'completed',
  SKIPPED_BY_USER: 'skipped_by_user',
  ENDED_EARLY: 'ended_early',
});

/** The two states a caller may persist explicitly. COMPLETED is derived. */
export const EXPLICIT_RESOLUTIONS = Object.freeze([
  SESSION_STATE.SKIPPED_BY_USER,
  SESSION_STATE.ENDED_EARLY,
]);

/**
 * Resolved for PROGRESSION purposes only.
 *
 * All three resolved states stop the programme bringing the session back. They
 * remain completely different things to the coaching layer, which must never
 * report a skipped or ended-early session as a completed workout.
 */
export function isResolved(state) {
  return state === SESSION_STATE.COMPLETED
    || state === SESSION_STATE.SKIPPED_BY_USER
    || state === SESSION_STATE.ENDED_EARLY;
}

/** Did the athlete actually train this session, in full? */
export function isPerformedInFull(state) {
  return state === SESSION_STATE.COMPLETED;
}

const str = (v) => (typeof v === 'string' && v.length ? v : null);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * THE ONE CURRENT RESOLUTION for a required instance.
 *
 * Storage holds at most one live resolution per instance, but sync can deliver
 * duplicates or a stale row alongside a newer one, and the answer must not
 * depend on which arrived first. Ordering is therefore TOTAL: newest
 * resolvedAt, then newest updatedAt, then the id as a final deterministic
 * tie-break. Shuffling the input cannot change the result.
 */
export function pickCurrentResolution(rows = []) {
  const valid = (Array.isArray(rows) ? rows : []).filter(
    (r) => r && r.deletedAt == null && EXPLICIT_RESOLUTIONS.includes(r.resolution),
  );
  if (!valid.length) return null;
  return [...valid].sort((a, b) => (
    num(b.resolvedAt) - num(a.resolvedAt)
    || num(b.updatedAt) - num(a.updatedAt)
    || String(b.id ?? '').localeCompare(String(a.id ?? ''))
  ))[0];
}

/**
 * THE RESOLUTION PRECEDENCE TABLE (founder pin).
 *
 * Stated as a table rather than a chain of ifs so the answer can never come to
 * depend on the order the branches happen to be written in. Each row is the
 * founder's numbered rule.
 *
 *   #  explicit        other completion   result
 *   1  none            no                 OUTSTANDING
 *   2  none            yes                COMPLETED
 *   3  SKIPPED         no                 SKIPPED_BY_USER
 *   4  SKIPPED         yes                COMPLETED - real performed work is
 *                                         stronger truth than an earlier
 *                                         intention to skip
 *   5  ENDED_EARLY     no                 ENDED_EARLY - the session's own
 *                                         finished workout row must NOT
 *                                         relabel it as fully completed
 *   6  ENDED_EARLY     yes                ENDED_EARLY, flagged as a conflict.
 *                                         Volyume has no reopen/resume
 *                                         transition, so this combination is
 *                                         not reachable by any authorised
 *                                         path. It is reported as
 *                                         diagnostically invalid rather than
 *                                         silently upgraded, because guessing
 *                                         here would either claim work that
 *                                         was not authorised as a completion
 *                                         or discard a real workout row.
 *
 * "Other completion" deliberately excludes the ended-early session's OWN
 * workout row, which always exists and is not evidence of anything further.
 */
export const RESOLUTION_PRECEDENCE = Object.freeze([
  { rule: 1, explicit: null, otherCompletion: false, state: SESSION_STATE.OUTSTANDING, because: 'not_yet_resolved' },
  { rule: 2, explicit: null, otherCompletion: true, state: SESSION_STATE.COMPLETED, because: 'performed' },
  { rule: 3, explicit: SESSION_STATE.SKIPPED_BY_USER, otherCompletion: false, state: SESSION_STATE.SKIPPED_BY_USER, because: 'skipped_by_user' },
  { rule: 4, explicit: SESSION_STATE.SKIPPED_BY_USER, otherCompletion: true, state: SESSION_STATE.COMPLETED, because: 'performed_after_skip' },
  { rule: 5, explicit: SESSION_STATE.ENDED_EARLY, otherCompletion: false, state: SESSION_STATE.ENDED_EARLY, because: 'ended_early' },
  { rule: 6, explicit: SESSION_STATE.ENDED_EARLY, otherCompletion: true, state: SESSION_STATE.ENDED_EARLY, because: 'ended_early', conflict: 'ended_early_with_later_completion' },
]);

/**
 * Look the answer up in the table. No branch order, no guessing.
 *
 * @param {string|null} explicit         the current explicit resolution type
 * @param {boolean} hasOtherCompletion   a completed workout row that is NOT the
 *                                       ended-early session's own row
 */
export function precedenceFor(explicit, hasOtherCompletion) {
  return RESOLUTION_PRECEDENCE.find(
    (row) => row.explicit === (explicit ?? null)
      && row.otherCompletion === !!hasOtherCompletion,
  ) ?? RESOLUTION_PRECEDENCE[0];
}

/**
 * The required sessions for ONE programme week, in programme order.
 *
 * `routines` is the plan's routine rows. Ordering is the plan's own
 * `position`, which an explicit permanent reorder updates and a temporary
 * out-of-order execution does not - so choosing a different workout today can
 * never renumber the programme.
 */
export function requiredSessions(weekId, routines = []) {
  const week = str(weekId);
  if (!week) return [];
  return (Array.isArray(routines) ? routines : [])
    .filter((r) => str(r?.id))
    .map((r, i) => ({
      mesocycleWeekId: week,
      routineId: r.id,
      name: r.name ?? '',
      // Programme order, not weekday and not the order things were done in.
      position: Number.isFinite(Number(r.position)) ? Number(r.position) : i,
    }))
    .sort((a, b) => a.position - b.position)
    .map((s, i) => ({ ...s, order: i + 1 }));
}

/**
 * Resolve every required session for one programme week.
 *
 * @param {object} p
 * @param {string} p.weekId
 * @param {Array}  p.routines     the plan's routines (the REQUIRED set)
 * @param {Array}  p.workouts     workout rows for this week (execution truth)
 * @param {Array}  p.resolutions  explicit resolution rows for this week
 *
 * PRECEDENCE, and the reasoning behind it:
 *
 *   1. A genuine full completion that is NOT the ended-early session outranks
 *      everything. If the athlete skipped Legs on Monday and then actually
 *      trained Legs on Thursday, they trained Legs. No "reopen" flow is
 *      needed for that to be true, and the alternative - telling someone they
 *      skipped work they demonstrably did - is the worse failure. Volyume has
 *      no undo-a-resolution flow and this design deliberately does not add one.
 *   2. An explicit resolution row. This is where ENDED_EARLY lives, and it has
 *      to outrank the plain completion check because an ended-early session
 *      does have a finished workout row - deriving from that alone would
 *      relabel it COMPLETED and erase the distinction the coaching layer needs.
 *   3. A completed workout row.
 *   4. Otherwise OUTSTANDING.
 */
export function resolveWeekSessions({
  weekId, routines = [], workouts = [], resolutions = [],
} = {}) {
  const required = requiredSessions(weekId, routines);
  const week = str(weekId);

  const completedByRoutine = new Map();
  for (const w of Array.isArray(workouts) ? workouts : []) {
    if (w?.deletedAt != null) continue;
    if (!(w?.isCompleted === 1 || w?.isCompleted === true)) continue;
    if (str(w?.mesocycleWeekId) !== week) continue;
    const rid = str(w?.routineId);
    if (!rid) continue;
    if (!completedByRoutine.has(rid)) completedByRoutine.set(rid, []);
    completedByRoutine.get(rid).push(w);
  }

  // Group the raw resolution rows per instance, THEN pick one deterministically
  // - so a duplicate or stale row arriving from sync in a different order can
  // never change the answer.
  const resolutionRowsByRoutine = new Map();
  for (const r of Array.isArray(resolutions) ? resolutions : []) {
    if (str(r?.mesocycleWeekId) !== week) continue;
    const rid = str(r?.routineId);
    if (!rid) continue;
    if (!resolutionRowsByRoutine.has(rid)) resolutionRowsByRoutine.set(rid, []);
    resolutionRowsByRoutine.get(rid).push(r);
  }

  return required.map((s) => {
    const completions = completedByRoutine.get(s.routineId) ?? [];
    const resolution = pickCurrentResolution(resolutionRowsByRoutine.get(s.routineId) ?? []);
    const explicit = resolution?.resolution ?? null;

    // The ended-early session's OWN workout row is not evidence of anything
    // further, so it is excluded before the table is consulted.
    const endedEarlyWorkoutId = explicit === SESSION_STATE.ENDED_EARLY
      ? str(resolution.workoutId) : null;
    const otherCompletion = completions.find((w) => str(w.id) !== endedEarlyWorkoutId) ?? null;

    const row = precedenceFor(explicit, !!otherCompletion);
    const workoutId = row.state === SESSION_STATE.COMPLETED
      ? (otherCompletion?.id ?? completions[0]?.id ?? null)
      : (row.state === SESSION_STATE.ENDED_EARLY ? endedEarlyWorkoutId : null);

    return {
      ...s,
      state: row.state,
      workoutId: workoutId ?? null,
      because: row.because,
      rule: row.rule,
      ...(row.conflict ? { conflict: row.conflict } : {}),
    };
  });
}

/**
 * The next required session still needing resolution in this week, in
 * programme order, or null when the week is progression-resolved.
 *
 * NOT "last completed + 1". Training A then C leaves B next, because B is
 * simply the first thing in programme order that is still outstanding.
 */
export function nextOutstandingSession(sessions = []) {
  return (Array.isArray(sessions) ? sessions : [])
    .filter((s) => s?.state === SESSION_STATE.OUTSTANDING)
    .sort((a, b) => a.order - b.order)[0] ?? null;
}

/** Is every required session in this week resolved? Time never answers this. */
export function weekProgressionResolved(sessions = []) {
  const list = Array.isArray(sessions) ? sessions : [];
  return list.length > 0 && list.every((s) => isResolved(s.state));
}

/**
 * How the athlete's execution should be REPORTED, as distinct from what the
 * programme has resolved.
 *
 * The amendment is explicit: after three completions, one skip and one
 * ended-early, progression may be finished while "you completed all your
 * workouts" would be false. This keeps the honest counts available so no
 * coaching surface has to guess.
 */
export function executionSummary(sessions = []) {
  const list = Array.isArray(sessions) ? sessions : [];
  const count = (state) => list.filter((s) => s.state === state).length;
  return {
    required: list.length,
    completed: count(SESSION_STATE.COMPLETED),
    skipped: count(SESSION_STATE.SKIPPED_BY_USER),
    endedEarly: count(SESSION_STATE.ENDED_EARLY),
    outstanding: count(SESSION_STATE.OUTSTANDING),
    resolved: list.filter((s) => isResolved(s.state)).length,
  };
}

// ─── DISPLAY ────────────────────────────────────────────────────────────────

/**
 * The name to show the athlete for one required session.
 *
 * FOUNDER RULING. Where a display name repeats inside the same programme week
 * - and it legitimately can, the bikini Glute Focus split has two "Glutes"
 * sessions - qualify it by its programme position:
 *
 *   Glutes · Workout 2 of 6
 *
 * A unique name is left alone, because "Skip Legs this time?" is clearer than
 * "Skip Legs · Workout 3 of 4 this time?" when there is only one Legs.
 *
 * The count is computed from the actual required set, never hard-coded, and
 * the position is PROGRAMME order rather than any weekday. Exercise content is
 * deliberately not used to disambiguate: it can be substituted or edited and
 * is not the stable session identity.
 *
 * Display context only. Identity remains (mesocycleWeekId, routineId).
 */
export function sessionDisplayName(session, sessions = []) {
  const name = session?.name ?? '';
  if (!name) return '';
  const all = Array.isArray(sessions) ? sessions : [];
  const duplicates = all.filter((s) => (s?.name ?? '') === name).length;
  if (duplicates <= 1) return name;
  return `${name} · Workout ${session.order} of ${all.length}`;
}

/**
 * The one-time skip confirmation.
 *
 * Neutral, no guilt, no mandatory reason, and explicit that the programme is
 * not being changed - because the single most likely misreading of a Skip
 * button is "this removes the workout".
 *
 * `recoveryNext` is true only when this is the LAST unresolved session before
 * the block's own planned recovery week, in which case the athlete is told
 * what resolving it will start.
 */
export function skipConfirmation(session, sessions = [], { recoveryNext = false } = {}) {
  const label = sessionDisplayName(session, sessions);
  if (!label) return null;
  const body = `This will move past this workout without logging it as completed. It won't remove ${session.name} from your programme or change future workouts.`;
  return {
    title: `Skip ${label} this time?`,
    body: recoveryNext ? `${body} After this, your recovery week will begin.` : body,
    confirm: 'Skip this time',
    cancel: 'Keep it',
  };
}

/**
 * The end-early confirmation, offered when the athlete finishes a session with
 * meaningful planned work still unresolved.
 *
 * Says exactly what survives and what does not: the logged work counts, the
 * untouched exercises are not recorded as done, and the programme moves on.
 */
export function endEarlyConfirmation(session, sessions = [], { recoveryNext = false } = {}) {
  const label = sessionDisplayName(session, sessions);
  const body = "The work you've logged will still count. The exercises you didn't do won't be logged as completed, and Volyume will move on from this workout.";
  return {
    title: label ? `Finish ${label} here?` : 'Finish for today?',
    body: recoveryNext ? `${body} After this, your recovery week will begin.` : body,
    confirm: 'Finish for today',
    cancel: 'Keep going',
  };
}
