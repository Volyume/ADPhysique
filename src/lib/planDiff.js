// Plan diff/preview (ULTIMATE-PLANDIFF-01). Pure, deterministic helpers that
// turn the current active plan and a prospective (dry-run) plan into a plain
// before/after view-model, so a Pro user sees what plan changes would
// change BEFORE the active mesocycle is overwritten.
//
// No DB, no writes — the screen reads the current plan (getActivePlan ->
// getRoutinesForPlan -> getRoutineExercisesWithDetails) and the dry-run plan
// (generatePlanDryRun) and feeds normalised summaries in here. The diff shows
// the SAME structural facts to everyone (dual-audience); only surrounding prose
// changes by tone.

import { SPLIT_LABELS } from './planEngine';

/**
 * A friendly label for a split code, or the value itself if already friendly
 * (division splits arrive as labels like "V-Taper"). Reuses planEngine's
 * SPLIT_LABELS so the rebuild diff names a split exactly as the rest of the app
 * does — one source of truth, no drift.
 */
export function splitLabel(code) {
  if (!code) return null;
  return SPLIT_LABELS[code] || code;
}

const uniqueSorted = (names) =>
  [...new Set((names || []).filter(Boolean))].sort((a, b) => a.localeCompare(b));

/**
 * Normalise a prospective dry-run plan (planEngine output) into a summary.
 *
 * Campaign 9 cosmetic patch: the dry run keeps blocked entries inside its
 * raw positional plan, because the plan-diff indices are derived from that
 * structure and removing them would desynchronise it. That is correct for
 * the DATA and wrong for the PREVIEW - an exercise the user has set aside
 * was appearing in "moves" as though Volyume intended to prescribe it,
 * when the commit will not write it at all.
 *
 * So the presentation summary drops those names and counts them instead.
 * `plan` itself is never touched: positional indices, and everything the
 * commit path reads, are byte-identical. The diff algorithm is unchanged
 * too; it simply stops being handed a name that was never going to be
 * prescribed, which makes it more accurate rather than less.
 *
 * @param {{ splitType?: string, workouts?: Array }} plan
 * @param {number|null} sessionLengthMinutes
 * @param {{ blockedSlots?: Array<{exerciseName?: string|null}> }} [opts]
 *   the dry run's own blockedSlots, when it reported any.
 */
export function summariseProspectivePlan(plan, sessionLengthMinutes = null, { blockedSlots = null } = {}) {
  const workouts = Array.isArray(plan?.workouts) ? plan.workouts : [];
  const blockedNames = new Set(
    (Array.isArray(blockedSlots) ? blockedSlots : [])
      .map((b) => (b?.exerciseName ? String(b.exerciseName).toLowerCase() : null))
      .filter(Boolean),
  );
  const moves = [];
  let blockedCount = 0;
  for (const w of workouts) {
    for (const ex of (Array.isArray(w?.exercises) ? w.exercises : [])) {
      if (!ex?.exerciseName) continue;
      if (blockedNames.has(String(ex.exerciseName).toLowerCase())) { blockedCount += 1; continue; }
      moves.push(ex.exerciseName);
    }
  }
  return {
    days: workouts.length,
    split: plan?.splitType ?? null,
    sessionLengthMinutes: sessionLengthMinutes ?? null,
    moves: uniqueSorted(moves),
    // Presentation only. The screen renders the blocked state instead of
    // naming an exercise it is not going to prescribe.
    blockedCount,
  };
}

/**
 * Normalise the current active plan (routines + their resolved exercises) into
 * a summary. `routines` is getRoutinesForPlan() rows, each given an `exercises`
 * array of resolved names by the caller.
 * @param {Array<{ splitType?: string, exercises?: Array<{ name?: string }> }>} routines
 * @param {number|null} sessionLengthMinutes
 */
export function summariseCurrentPlan(routines, sessionLengthMinutes = null) {
  const list = Array.isArray(routines) ? routines : [];
  const moves = [];
  let split = null;
  for (const r of list) {
    if (!split && r?.splitType) split = r.splitType;
    for (const ex of (Array.isArray(r?.exercises) ? r.exercises : [])) {
      if (ex?.name) moves.push(ex.name);
    }
  }
  return {
    days: list.length,
    split,
    sessionLengthMinutes: sessionLengthMinutes ?? null,
    moves: uniqueSorted(moves),
  };
}

/**
 * Diff two plan summaries into a Now/After view-model. `identical` is true when
 * nothing material changed (drives the "Nothing would change" empty state).
 *
 * @returns {{
 *   days: { now, after, changed },
 *   split: { now, after, changed },        // friendly labels
 *   sessionLength: { now, after, changed },
 *   movesAdded: string[], movesDropped: string[],
 *   identical: boolean,
 * }}
 */
export function diffPlans(now, after) {
  const a = now || {};
  const b = after || {};
  const aMoves = a.moves || [];
  const bMoves = b.moves || [];

  const movesAdded = bMoves.filter((m) => !aMoves.includes(m));
  const movesDropped = aMoves.filter((m) => !bMoves.includes(m));

  const days = { now: a.days ?? null, after: b.days ?? null };
  days.changed = days.now !== days.after;

  const split = { now: splitLabel(a.split), after: splitLabel(b.split) };
  split.changed = split.now !== split.after;

  const sessionLength = {
    now: a.sessionLengthMinutes ?? null,
    after: b.sessionLengthMinutes ?? null,
  };
  sessionLength.changed = sessionLength.now !== sessionLength.after;

  const identical = !days.changed && !split.changed && !sessionLength.changed
    && movesAdded.length === 0 && movesDropped.length === 0;

  return { days, split, sessionLength, movesAdded, movesDropped, identical };
}

/**
 * D140 (founder decision 2026-09-03, answering the D139 question): a rebuild
 * that keeps every exercise keeps the running training block.
 *
 * The block is the multi-week shape of the WEEKLY set targets per muscle
 * (mesocycles, mesocycle_weeks, planned_muscle_volume), keyed to the user,
 * never to a programme or to how many days those sets are spread across. So
 * a change to days, session length, split or the other setup fields that
 * leaves the exercise list intact cannot invalidate it, and restarting it
 * from week 1 threw away the athlete's ramp for nothing. When the exercise
 * list itself changes (something added, dropped or replaced) the block still
 * restarts, exactly as before.
 *
 * Pure and deterministic: the same inputs always give the same answer, and
 * the preview sheet and the commit both read it so they cannot disagree.
 *
 * @param {object} args
 * @param {object|null} args.diff        diffPlans view-model
 * @param {object|null} args.receipt     planRationale.buildChangeReceipt output, or null
 * @param {object|null} args.blockStatus planSwitch.readActiveBlockStatus output, or null
 * @returns {boolean} true when the running block is kept across this rebuild
 */
export function keepsBlockOnRebuild({ diff = null, receipt = null, blockStatus = null } = {}) {
  // A block that is over and waiting on its decision is not running: a
  // rebuild from "Change my training setup" IS that decision and must start
  // the next block. No block at all means nothing to keep.
  if (!blockStatus || !blockStatus.currentWeek || !blockStatus.totalWeeks) return false;
  if (blockStatus.status !== 'active' && blockStatus.status !== 'recovery') return false;
  if (!diff) return false;
  const added = Array.isArray(diff.movesAdded) ? diff.movesAdded : [];
  const dropped = Array.isArray(diff.movesDropped) ? diff.movesDropped : [];
  if (added.length > 0 || dropped.length > 0) return false;
  // The reason-coded receipt is the commit's own account of the exercise
  // list; when it is present it has the final say.
  if (receipt) {
    const changes = Array.isArray(receipt.changes) ? receipt.changes : [];
    const newIn = Array.isArray(receipt.added) ? receipt.added : [];
    const gone = Array.isArray(receipt.noLongerIn) ? receipt.noLongerIn : [];
    if (changes.length > 0 || newIn.length > 0 || gone.length > 0) return false;
  }
  return true;
}
