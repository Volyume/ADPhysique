/**
 * volumeAudit.js — Campaign 16 job 6: does the plan deliver the volume it
 * claims?
 *
 * FOUNDER BRIEF: "Run the canonical allocator after final exercise
 * selection. The Abductor Machine bug demonstrated why preview intent is
 * not enough. Pin target, preview delivered, persisted delivered and
 * activated-block planned volume against one another. No
 * generated-but-unpersisted exercise may contribute phantom volume."
 *
 * WHY AN INDEPENDENT RECOUNT
 *
 * The engine's own `weeklyVolumeSummary` is computed from the workouts it
 * built, using the selection pool it built them from. That makes it an
 * excellent description of the engine's INTENT and a poor check on the
 * result, because anything that happens to an exercise after the summary is
 * computed - a name that fails to resolve, a slot the user has excluded, a
 * row that never gets written - is invisible to it.
 *
 * That is not hypothetical. The engine's fallback pool carried `Abductor
 * Machine`, no library row has that name, and the exercise was counted into
 * the weekly summary and then dropped at save. A Bikini three-day plan
 * reported fourteen weekly glute sets and delivered eleven, and every
 * number the app showed agreed with every other number, because they all
 * came from the same source.
 *
 * This module counts from the EXERCISES THEMSELVES, resolving each one
 * against the exercise catalogue rather than the generation pool. Two
 * independent counts that agree are evidence; one count repeated is not.
 *
 * NOT a second opinion on dosage. It reports what is there. Deciding how
 * much volume a muscle should get belongs to the coaching engine and its
 * landmarks, and nothing here may become an input to that.
 */

/**
 * The engine reports volume in EXTERNAL buckets (the three delt heads
 * collapse into `shoulders`); the library stores INTERNAL primary muscles.
 * Mirrors planEngine's own mapping so the two counts are comparable.
 */
export const INTERNAL_TO_EXTERNAL = Object.freeze({
  chest: 'chest',
  back: 'back',
  side_delts: 'shoulders',
  rear_delts: 'shoulders',
  front_delts: 'shoulders',
  biceps: 'biceps',
  triceps: 'triceps',
  quads: 'quads',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  calves: 'calves',
  abs: 'abs',
  traps: 'traps',
  forearms: null,
  adductors: null,
  abductors: null,
});

/**
 * Direct working sets per external muscle bucket, counted from a list of
 * workouts and resolved through the exercise CATALOGUE.
 *
 * @param {Array} workouts  [{ exercises: [{ exerciseId, exerciseName, sets }] }]
 * @param {Map|object} catalogue  id -> exercise row, and/or name -> row
 * @returns {{ sets: object, unresolved: string[] }}
 *   `unresolved` names every exercise that could not be resolved. It is a
 *   deliberate output rather than a silent zero: an exercise nobody can
 *   identify is exactly the failure this module exists to surface.
 */
export function countDeliveredSets(workouts, catalogue) {
  const byId = catalogue instanceof Map ? catalogue : new Map(Object.entries(catalogue ?? {}));
  const sets = {};
  const unresolved = [];

  for (const w of workouts ?? []) {
    for (const ex of w.exercises ?? []) {
      const row = (ex.exerciseId ? byId.get(ex.exerciseId) : null)
        ?? byId.get(ex.exerciseName)
        ?? null;
      if (!row?.primaryMuscle) {
        if (ex.exerciseName) unresolved.push(ex.exerciseName);
        continue;
      }
      const bucket = INTERNAL_TO_EXTERNAL[row.primaryMuscle];
      if (!bucket) continue;
      sets[bucket] = (sets[bucket] ?? 0) + (Number(ex.sets) || 0);
    }
  }
  return { sets, unresolved };
}

/**
 * Compare the plan's own summary against an independent recount.
 *
 * @returns {{ ok: boolean, mismatches: Array, unresolved: string[] }}
 *   A mismatch is a muscle where what the plan CLAIMS and what its
 *   exercises actually deliver disagree. Any mismatch is a defect: the
 *   two numbers describe the same plan.
 */
export function auditPlanVolume(plan, catalogue) {
  const { sets, unresolved } = countDeliveredSets(plan?.workouts, catalogue);
  const summary = plan?.weeklyVolumeSummary ?? {};
  const mismatches = [];

  const buckets = new Set([
    ...Object.keys(summary),
    ...Object.keys(sets),
  ]);
  for (const bucket of buckets) {
    const claimed = summary[bucket]?.plannedSets ?? 0;
    const delivered = sets[bucket] ?? 0;
    if (claimed !== delivered) {
      mismatches.push({ muscle: bucket, claimed, delivered });
    }
  }
  return { ok: mismatches.length === 0 && unresolved.length === 0, mismatches, unresolved };
}

/**
 * Compare two stages of the same plan - preview against persisted, or
 * persisted against the activated block - muscle by muscle.
 *
 * Stages are compared, never reconciled. A difference is reported, never
 * quietly averaged or explained away, because the whole point is that a
 * user should receive what they were shown.
 */
export function compareStages(a, b, catalogue) {
  const left = countDeliveredSets(a, catalogue).sets;
  const right = countDeliveredSets(b, catalogue).sets;
  const buckets = new Set([...Object.keys(left), ...Object.keys(right)]);
  const differences = [];
  for (const bucket of buckets) {
    const l = left[bucket] ?? 0;
    const r = right[bucket] ?? 0;
    if (l !== r) differences.push({ muscle: bucket, before: l, after: r });
  }
  return { equal: differences.length === 0, differences };
}
