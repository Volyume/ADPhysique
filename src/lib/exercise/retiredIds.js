/**
 * Retired exercise ids and the rows that still point at them.
 *
 * The corpus retires an exercise by name (`{ name, retiredInto }`, EL-21):
 * the seed chain's top-up merges the retired row into its survivor once per
 * install and removes it. But every exercise id is derived from its name
 * (canonicalId.js), so a retired id is the same on every device and in the
 * cloud, and it keeps arriving after that one-shot pass: a routine generated
 * on a device that had not retired it yet, a set logged against that routine,
 * a cloud copy pulled later. The pull's name heal cannot see through a
 * rename ("Lateral Raise Machine" is nobody's name once it has become
 * "Machine Lateral Raise"), so the row lands with an id no exercise row
 * carries, and from then on the workout summary drops the exercise, the
 * volume heatmap credits its sets to no muscle, and the per-muscle "trained
 * N days ago" line never sees it (founder's TestFlight report 2026-10-03,
 * register D217: 808 live routine rows across 18 people in that state).
 *
 * This module is the one map from a retired id (or name) to its survivor.
 * database.js applies it wherever an exercise id enters a row (the pull
 * writers, set creation) and repairs every referencing table at each launch
 * (`repairRetiredExerciseReferences`), so a retired id can never be orphaned
 * again. Pure: no I/O.
 */
import { RETIRED_ENTRIES, RETIRED_NAME_TO_SURVIVOR } from '../exerciseCorpus';
import { canonicalExerciseId } from './canonicalId';

const MAX_CHAIN = 8;

function follow(start, map) {
  let current = start;
  for (let i = 0; i < MAX_CHAIN && map.has(current); i += 1) {
    const next = map.get(current);
    if (next === current) break;
    current = next;
  }
  return current;
}

/** retired canonical id -> the survivor's canonical id (one hop; use survivorExerciseId to resolve a chain). */
export const RETIRED_ID_TO_SURVIVOR_ID = Object.freeze(new Map(
  RETIRED_ENTRIES.map((e) => [canonicalExerciseId(e.name), canonicalExerciseId(e.retiredInto)]),
));

/**
 * The id a row should carry: the survivor's id for a retired id (following a
 * chain of retirements), the id itself otherwise. Never throws; a missing or
 * non-string id comes back unchanged.
 */
export function survivorExerciseId(id, map = RETIRED_ID_TO_SURVIVOR_ID) {
  if (typeof id !== 'string' || !id) return id;
  return follow(id, map);
}

/** The survivor's name for a retired name, the name itself otherwise. */
export function survivorExerciseName(name, map = RETIRED_NAME_TO_SURVIVOR) {
  if (typeof name !== 'string' || !name) return name;
  return follow(name, map);
}

/** Every retired id with its final survivor, for the launch repair. */
export function retiredIdPairs(map = RETIRED_ID_TO_SURVIVOR_ID) {
  return Array.from(map.keys()).map((from) => ({ from, to: follow(from, map) })).filter((p) => p.from !== p.to);
}
