/**
 * The one exercise lookup for everything that REPORTS, CREDITS or NAMES a
 * logged set (register D218, founder order 2026-10-03: "ensure all exercises
 * are logged and reported correct after the workout ends").
 *
 * Before this module, every reporting surface built its own map from
 * `getAllExercises()`, which FILTERS soft-deleted custom exercises (EL-18),
 * and then dropped or mis-named any set whose id the map could not resolve:
 * the history view of a workout skipped the exercise (`if (!ex) continue`),
 * History printed "Unknown" or nothing, the summary's volume card and the
 * heatmap credited nothing, Lift Progress said "Exercise", the recaps said
 * "Unknown", while the SQL readers (the volume trend, Recovery, the block
 * ledger) read the table unfiltered and counted the same sets. One deleted
 * custom exercise, one id from another device, or one retired id was
 * therefore counted in some places and missing from others (audit
 * `docs/audit/exercise-logging-reporting-audit-2026-10-03/00-FINDINGS.md`,
 * F-1 to F-6).
 *
 * The rule, from here on:
 *  - UNFILTERED: a soft-deleted custom exercise still names and credits the
 *    sets logged on it (deleting a definition never hides training that
 *    happened; the row only leaves the pickers and plan generation, which
 *    keep `getAllExercises()`).
 *  - SURVIVOR-AWARE: a retired id (D217) answers with its survivor's row.
 *  - NAME FALLBACK: a set whose id resolves to nothing is named from its own
 *    `exercise_name` snapshot (written by createWorkoutSet and the pull for
 *    exactly this case), through the survivor name, and only then "Exercise".
 *    It is never skipped.
 *
 * Pure: no I/O. `database.getExerciseLookup()` builds one from the unfiltered
 * table and caches it beside the library cache.
 */
import { survivorExerciseId, survivorExerciseName, RETIRED_ID_TO_SURVIVOR_ID } from './retiredIds';

export const UNRESOLVED_EXERCISE_NAME = 'Exercise';

/** The exercise's type, whichever spelling the row carries; weight_reps when unknown. */
export function exerciseTypeOf(row) {
  return row?.exerciseType ?? row?.exercise_type ?? row?.type ?? 'weight_reps';
}

/** The exercise's load semantics, whichever spelling the row carries; total when unknown. */
export function loadSemanticsOf(row) {
  return row?.loadSemantics ?? row?.load_semantics ?? 'total';
}

function setExerciseId(set) {
  return set?.exerciseId ?? set?.exercise_id ?? null;
}

function setSnapshotName(set) {
  const n = set?.exerciseName ?? set?.exercise_name ?? null;
  return typeof n === 'string' && n.trim() ? n.trim() : null;
}

/**
 * Build the lookup from exercise rows (camelCase or snake_case, any filter).
 *
 * @param {Array<object>} rows - exercise rows; soft-deleted rows included
 * @returns {{
 *   byId: Map<string, object>,
 *   exerciseTypeById: Object<string, string>,
 *   loadSemanticsById: Object<string, string>,
 *   get: (id: string) => object|null,
 *   resolve: (set: object) => object|null,
 *   nameFor: (set: object) => string,
 *   typeFor: (set: object) => string,
 *   semanticsFor: (set: object) => string,
 *   rows: Array<object>,
 * }}
 */
export function buildExerciseLookup(rows) {
  const list = Array.isArray(rows) ? rows.filter((r) => r && r.id) : [];
  const byId = new Map();
  const byName = new Map();
  for (const r of list) {
    byId.set(r.id, r);
    if (typeof r.name === 'string' && r.name.trim()) {
      const key = r.name.trim().toLowerCase();
      // A live row wins over a soft-deleted twin of the same name.
      const prev = byName.get(key);
      if (!prev || (prev.deletedAt ?? prev.deleted_at) != null) byName.set(key, r);
    }
  }
  // D217: every retired id whose survivor is present answers with the
  // survivor's row. An install that has not run the top-up (the retired row
  // still present) keeps its own row.
  for (const retired of RETIRED_ID_TO_SURVIVOR_ID.keys()) {
    if (byId.has(retired)) continue;
    const survivor = byId.get(survivorExerciseId(retired));
    if (survivor) byId.set(retired, survivor);
  }

  const exerciseTypeById = {};
  const loadSemanticsById = {};
  for (const [id, r] of byId) {
    exerciseTypeById[id] = exerciseTypeOf(r);
    loadSemanticsById[id] = loadSemanticsOf(r);
  }

  function get(id) {
    if (typeof id !== 'string' || !id) return null;
    return byId.get(id) ?? byId.get(survivorExerciseId(id)) ?? null;
  }

  function byNameOf(name) {
    if (!name) return null;
    const direct = byName.get(name.toLowerCase());
    if (direct) return direct;
    const survivor = survivorExerciseName(name);
    return survivor && survivor !== name ? (byName.get(survivor.toLowerCase()) ?? null) : null;
  }

  /** The row for a set: by id first, then by the set's own name snapshot. */
  function resolve(set) {
    return get(setExerciseId(set)) ?? byNameOf(setSnapshotName(set));
  }

  /** The name a set is shown under: the row, the snapshot (its survivor), else "Exercise". Never empty. */
  function nameFor(set) {
    const row = resolve(set);
    if (row?.name) return row.name;
    const snap = setSnapshotName(set);
    return snap ? survivorExerciseName(snap) : UNRESOLVED_EXERCISE_NAME;
  }

  function typeFor(set) {
    return exerciseTypeOf(resolve(set));
  }

  function semanticsFor(set) {
    return loadSemanticsOf(resolve(set));
  }

  return Object.freeze({
    byId, exerciseTypeById, loadSemanticsById, rows: list, get, resolve, nameFor, typeFor, semanticsFor,
  });
}

/**
 * Resolve a set's exercise against either a lookup (above) or a plain
 * `{ [exerciseId]: row }` map, so the shared engines accept both shapes.
 */
export function resolveExerciseFor(mapOrLookup, set) {
  if (!mapOrLookup) return null;
  if (typeof mapOrLookup.resolve === 'function') return mapOrLookup.resolve(set) ?? null;
  const id = setExerciseId(set);
  return (id != null && Object.prototype.hasOwnProperty.call(mapOrLookup, id)) ? mapOrLookup[id] : null;
}

/** The display name of a set against either shape: row name, snapshot, "Exercise". */
export function exerciseNameFor(mapOrLookup, set) {
  if (mapOrLookup && typeof mapOrLookup.nameFor === 'function') return mapOrLookup.nameFor(set);
  const row = resolveExerciseFor(mapOrLookup, set);
  if (row?.name) return row.name;
  const snap = setSnapshotName(set);
  return snap ? survivorExerciseName(snap) : UNRESOLVED_EXERCISE_NAME;
}
