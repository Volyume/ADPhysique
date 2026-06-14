// Plan diff/preview (ULTIMATE-PLANDIFF-01). Pure, deterministic helpers that
// turn the current active plan and a prospective (dry-run) plan into a plain
// before/after view-model, so a Pro user sees what "Rebuild my plan" would
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
 * @param {{ splitType?: string, workouts?: Array }} plan
 * @param {number|null} sessionLengthMinutes
 */
export function summariseProspectivePlan(plan, sessionLengthMinutes = null) {
  const workouts = Array.isArray(plan?.workouts) ? plan.workouts : [];
  const moves = [];
  for (const w of workouts) {
    for (const ex of (Array.isArray(w?.exercises) ? w.exercises : [])) {
      if (ex?.exerciseName) moves.push(ex.exerciseName);
    }
  }
  return {
    days: workouts.length,
    split: plan?.splitType ?? null,
    sessionLengthMinutes: sessionLengthMinutes ?? null,
    moves: uniqueSorted(moves),
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
