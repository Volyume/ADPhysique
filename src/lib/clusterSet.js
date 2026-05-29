/**
 * clusterSet.js
 *
 * Pure helpers for myo-rep and rest-pause "cluster" sets. Both are one
 * working set made of an activation effort plus a run of short mini-sets:
 *   - Myo-reps: a heavy activation set near failure, then mini-sets of a
 *     few reps with a few breaths between, until the target rep drops off.
 *   - Rest-pause: hit failure, rest 10 to 20 seconds, squeeze out more,
 *     repeat.
 *
 * The whole cluster is logged as ONE workout_sets row: actual_reps is the
 * sum of every effort, and the per-effort breakdown rides in notes. This
 * keeps it counting as a single working set (weekly volume + progress)
 * without a schema change. The live screen owns the input; this module
 * owns the maths and the copy so both can be unit-tested.
 */

export const CLUSTER_SET_TYPES = Object.freeze(['myo_reps', 'rest_pause']);

const LABELS = Object.freeze({
  myo_reps: 'Myo-reps',
  rest_pause: 'Rest-pause',
});

/**
 * Is this set type a cluster (activation + mini-sets) rather than a
 * single straight effort?
 */
export function isClusterType(setType) {
  return CLUSTER_SET_TYPES.includes(setType);
}

/**
 * Display label for a cluster type, or null for non-cluster types.
 */
export function clusterLabel(setType) {
  return LABELS[setType] ?? null;
}

/**
 * Coerce a rep list to clean positive integers, dropping anything that
 * isn't a usable count. Tolerant of strings ('5') and junk (null, 0, -1).
 */
function cleanReps(reps) {
  if (!Array.isArray(reps)) return [];
  return reps
    .map((r) => parseInt(r, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/**
 * Summarise a cluster into the fields a workout_sets row needs.
 *
 * @param {string} setType  'myo_reps' | 'rest_pause'
 * @param {Array<number|string>} reps  [activation, mini1, mini2, ...]
 * @returns {{ totalReps: number, effortCount: number, notes: string } | null}
 *   null when there are no valid reps (nothing to log).
 *
 * notes shape: "Myo-reps: 15, 5, 4, 3" so the breakdown survives in the
 * diary and the workout summary even though only the total is a column.
 */
export function summariseCluster(setType, reps) {
  const clean = cleanReps(reps);
  if (clean.length === 0) return null;
  const totalReps = clean.reduce((a, n) => a + n, 0);
  const label = clusterLabel(setType) ?? 'Cluster';
  return {
    totalReps,
    effortCount: clean.length,
    notes: `${label}: ${clean.join(', ')}`,
  };
}

/**
 * Merge the cluster breakdown with any note the user already typed, so
 * neither clobbers the other. User note first, then the breakdown.
 */
export function mergeClusterNote(userNote, clusterNotes) {
  const u = (userNote ?? '').trim();
  if (!u) return clusterNotes;
  if (!clusterNotes) return u || null;
  return `${u} (${clusterNotes})`;
}
