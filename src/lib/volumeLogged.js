/**
 * volumeLogged.js -- the ONE definition of a logged set, and of the window
 * readings built on it (register D214, lane 5 review S5; plan
 * docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md sections 7.1 item 2 and 7.4 items 2 to 5).
 *
 * A LOGGED WORKING-SET ROW is a row whose exercise exists and credits at least
 * one of the 17 listed muscles, warm-ups and explosive rows excluded; a
 * compound row counts once.
 *
 * "N sets logged" means that count wherever it is printed: the Volume
 * heatmap's summary line and its trend takeaway, and the Progress strip, which
 * imports these functions so the two screens cannot disagree. It is never the
 * per-muscle credits summed (a press credits chest, triceps and front delts,
 * and is still one logged set, VH-16).
 *
 * THE GROUP RULE (plan 7.1 item 2 and 7.4 item 5, B17). The heatmap lists its
 * muscles under the five verdict words plus "No sets", and the Progress strip
 * counts "N under their range" over the same population, so the strip's count
 * is the list's first group. The population is every muscle with logged sets
 * in the window plus, with a plan, the muscles the plan programmes with
 * planned sets above zero: a trained muscle is judged whether or not the plan
 * programmes it, and a plan-programmed muscle is judged before its first set.
 * A muscle outside that population (no sets, not programmed) is in no verdict
 * group at all (`bandGroupFor` returns 'none', "No sets"); every other muscle
 * sits in its own `getVolumeStatus` band. `planTrainedMuscles` reads the plan's set from the
 * plan layer (effectiveLandmarks.getPlanLandmarks), never from the merged
 * source map, so a muscle the person edited by hand is still plan-trained.
 *
 * Pure. No I/O, no store, no clock: the caller passes the loaded history and
 * "now".
 */
import {
  calculateWeeklyVolume, calculateExcludedWeeklyVolume, VOLUME_LANDMARKS,
  allocateExerciseVolume, isBallisticEvidenceRow, exerciseForSet,
} from './algorithms';
import { weeksCounted, perWeekVolume, volumeWindowBounds } from './volumeWindow';

/** The 17 muscles the heatmap lists, in its order. */
export const LISTED_MUSCLES = Object.freeze(Object.keys(VOLUME_LANDMARKS));
const LISTED_SET = new Set(LISTED_MUSCLES);
const NO_MUSCLES = Object.freeze([]);

/** The group key of a muscle that sits outside the verdict population with no sets. */
export const NO_SETS_GROUP = 'none';

function setAt(set) {
  const at = Number(set?.createdAt ?? set?.created_at);
  return Number.isFinite(at) ? at : null;
}

/**
 * The listed muscles one logged row credits, or none when the row does not
 * count: a warm-up never counts and an explosive set never counts (the same
 * two exclusions calculateWeeklyVolume makes), and a row whose exercise is
 * unknown credits nothing. `cache` holds the per-exercise allocation so a long
 * history is not re-allocated for every row. A row is a logged working-set row
 * exactly when this returns at least one muscle. D218: `exerciseMap` may be
 * the shared exercise lookup (src/lib/exercise/lookup.js), which also
 * resolves a soft-deleted custom exercise, a retired id and an unknown id by
 * the set's own name snapshot; the cache is keyed by the exercise resolved.
 *
 * @param {object} set - a workout_sets row (camelCase or snake_case)
 * @param {object} exerciseMap - { [exerciseId]: exercise }, or the lookup
 * @param {Map} cache - per-exercise allocation cache, owned by the caller
 * @returns {ReadonlyArray<string>} the listed muscles credited
 */
export function creditedMuscles(set, exerciseMap, cache) {
  if ((set.setType || set.set_type || 'straight') === 'warmup') return NO_MUSCLES;
  if (isBallisticEvidenceRow(set)) return NO_MUSCLES;
  const exercise = exerciseForSet(exerciseMap, set);
  if (!exercise) return NO_MUSCLES;
  const key = exercise.id ?? (set.exerciseId || set.exercise_id);
  let list = cache.get(key);
  if (!list) {
    list = allocateExerciseVolume(exercise).map(a => a.muscle).filter(m => LISTED_SET.has(m));
    cache.set(key, list);
  }
  return list;
}

/**
 * One pass over the whole history: the account's earliest set (the divisor's
 * anchor, D200-1) and, per muscle, the latest row that credits it. The recency
 * read counts secondary credit and untyped sets, so "Trained 3 days ago"
 * agrees with the row's own sets (VH-18). The returned dataset is what
 * `loggedRowsBetween` and `buildWindowView` read.
 *
 * @param {Array} sets - every completed working-set row the account has
 * @param {object} exerciseMap - { [exerciseId]: exercise }
 * @param {number} nowMs - the caller's "now" (the window's end)
 * @returns {{ sets, exerciseMap, cache, earliestSetMs, lastTrained, loadedAtMs }}
 */
export function buildDataset(sets, exerciseMap, nowMs) {
  const cache = new Map();
  const lastTrained = {};
  let earliestSetMs = null;
  for (const s of sets) {
    const at = setAt(s);
    if (at === null) continue;
    if (earliestSetMs === null || at < earliestSetMs) earliestSetMs = at;
    for (const m of creditedMuscles(s, exerciseMap, cache)) {
      if (!(lastTrained[m] >= at)) lastTrained[m] = at;
    }
  }
  return { sets, exerciseMap, cache, earliestSetMs, lastTrained, loadedAtMs: nowMs };
}

/**
 * Logged working-set ROWS inside [startMs, endMs): what "N sets logged" means
 * everywhere (never the credits summed, VH-16). A row with no readable
 * timestamp is outside every window.
 *
 * @param {object} ds - from buildDataset
 * @param {number} startMs - inclusive
 * @param {number} endMs - exclusive (Infinity for "from startMs on")
 * @returns {number}
 */
export function loggedRowsBetween(ds, startMs, endMs) {
  let n = 0;
  for (const s of ds.sets) {
    const at = setAt(s);
    if (at === null || at < startMs || at >= endMs) continue;
    if (creditedMuscles(s, ds.exerciseMap, ds.cache).length > 0) n += 1;
  }
  return n;
}

/**
 * Everything one window chip reads, from the loaded history alone (no I/O), so
 * switching the window never re-reads the database. "This week" (1) is the
 * Monday-anchored week so far; 2 and 4 are the rolling weekly averages with the
 * partial-history divisor (volumeWindow.js). Null when the window cannot be
 * bounded (a non-finite "now"), which a caller reads as no data.
 *
 * @param {object} ds - from buildDataset
 * @param {*} windowWeeks - 1, 2 or 4 (anything else reads as 1)
 * @returns {null | { weeks, divisor, raw, perWeek, loggedRows, musclesWorked,
 *   hasExcludedWork }} `raw` is the window's per-muscle credit, `perWeek` the
 *   same divided by `divisor`, `loggedRows` the logged working-set rows in the
 *   window, `musclesWorked` the listed muscles with any credit.
 */
export function buildWindowView(ds, windowWeeks) {
  const bounds = volumeWindowBounds({ windowWeeks, nowMs: ds?.loadedAtMs });
  if (!bounds) return null;
  const { weeks, startMs, endMs } = bounds;
  const windowSets = ds.sets.filter((s) => {
    const at = setAt(s);
    return at !== null && at >= startMs;
  });
  // D200-1: the divisor is the weeks of the window the account has data for.
  // "This week" is one Monday-anchored week, so it always divides by 1.
  const divisor = weeks === 1
    ? 1
    : weeksCounted({ windowStartMs: startMs, windowEndMs: endMs, earliestSetMs: ds.earliestSetMs });
  const raw = calculateWeeklyVolume(windowSets, ds.exerciseMap);
  const excluded = calculateExcludedWeeklyVolume(windowSets, ds.exerciseMap);
  return {
    weeks,
    divisor,
    raw,
    perWeek: perWeekVolume(raw, divisor),
    loggedRows: loggedRowsBetween(ds, startMs, Infinity),
    musclesWorked: LISTED_MUSCLES.filter(m => (raw[m]?.workingSets || 0) > 0).length,
    hasExcludedWork: Object.keys(excluded).length > 0,
  };
}

/**
 * The muscles the active plan programmes with planned sets above zero.
 *
 * Reads the PLAN LAYER (effectiveLandmarks.getPlanLandmarks, the plan's
 * weekly sets per muscle through buildPlanLandmarks): its own source map says
 * 'plan' for a muscle exactly when the plan programmes it. It is deliberately
 * not the merged source (effectiveLandmarks.mergeLandmarkPrecedence), where a
 * manual or adapted band replaces 'plan', so a muscle the person edited by
 * hand is still plan-trained. An empty set means no plan (or one that
 * programmes nothing), and `bandGroupFor` then falls back to the muscles with
 * logged sets.
 *
 * @param {?{ source?: object }} planLayer - the plan layer's { table, source }
 * @returns {Set<string>} listed muscles the plan programmes
 */
export function planTrainedMuscles(planLayer) {
  const out = new Set();
  const source = planLayer && planLayer.source;
  if (!source || typeof source !== 'object') return out;
  for (const muscle of LISTED_MUSCLES) {
    if (source[muscle] === 'plan') out.add(muscle);
  }
  return out;
}

/**
 * The group a muscle's row sits in: its `getVolumeStatus` band, or
 * NO_SETS_GROUP ('none') for a muscle outside the verdict population with no
 * sets in the window (see the header). A plan-programmed muscle with no sets
 * is still judged ('below', "Under the range"); without a plan a muscle with no
 * sets is in no verdict group. The Progress strip counts "under their range" as
 * the muscles whose group is 'below', so its number is the heatmap's first
 * group by construction.
 *
 * @param {object} p
 * @param {string} p.muscle - a listed muscle key
 * @param {string} p.status - the muscle's getVolumeStatus status
 * @param {boolean} p.hasCredit - the muscle has any credit in the window
 * @param {?Set<string>} p.planTrained - from planTrainedMuscles
 * @returns {string} the status, or 'none'
 */
export function bandGroupFor({ muscle, status, hasCredit, planTrained }) {
  if (hasCredit) return status;
  return planTrained && planTrained.has(muscle) ? status : NO_SETS_GROUP;
}
