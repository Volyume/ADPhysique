/**
 * swapCarry.js -- D219 lane A4 (design 4.12, founder R10): what an exercise
 * swap carries over, in one pure place (docs/audit/plan-builder-science-
 * 2026-10-04/00-AUDIT-AND-PLAN.md section 4.12; register D219 "Addition"
 * 2026-10-04: "When people swap in a workout can they get an option to swap as
 * a one off or permanent. Also when doing swaps the new exercise should have
 * the same sets and reps ideally so we don't misplace load").
 *
 * The slot, not the exercise, owns the prescription:
 *   - SETS and REPS carry (the slot's stored sets and rep range stay; the new
 *     exercise's own default band is never read). Effort is not a slot field:
 *     it is the block week's rir_target, so every exercise of a week has it.
 *   - REST follows the new exercise (a pushdown does not need a squat's rest),
 *     but only where the rest is still the outgoing tier's default; a rest the
 *     person set stays (Campaign 16 job 7). A row with no rest keeps none.
 *   - LOAD is cleared: never an old exercise's number (Campaign 16 job 7).
 *   - The new exercise is checked against the per-exercise caps like any other
 *     (plan/science.exerciseCap), for the plan the new planner built.
 *   - A permanent swap writes the planner's own model of the slot into the
 *     plan's facts (facts.slots[routineId][exerciseId] = { muscle, kind,
 *     credits }), so every week is served on the planner's model.
 *
 * Pure: no I/O, no clock, no randomness. Imports only pure modules (the plan
 * modules are read, never changed). database.js reaches it lazily, so there is
 * no import cycle.
 */
import { allocateExerciseVolume, muscleDisplayName } from '../algorithms';
import { deriveParamKey } from '../poolGenerator';
import { catalogueCredits } from '../plan/catalogue';
import { exerciseCap } from '../plan/science';
import { isDefaultPrescription, restFor } from './prescription';
import { SWAP_SCOPE } from './swapScope';

const isObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

const categoryOf = (ex) => ex?.equipmentCategory ?? ex?.equipment_category ?? null;
const isolationOf = (ex) => ex?.compoundIsolation ?? ex?.compound_isolation ?? null;
const kindOf = (ex) => deriveParamKey(categoryOf(ex), isolationOf(ex));

/**
 * The muscle a slot of this exercise trains, in the planner's vocabulary: the
 * volume counter's primary muscle (allocateExerciseVolume: lower case, the
 * legacy 'shoulders' as side delts), for a camelCase or a snake_case row. Null
 * when the exercise has none.
 */
export function slotMuscleOf(exercise) {
  const primary = allocateExerciseVolume(exercise).find((a) => a.role === 'primary');
  return primary?.muscle ?? null;
}

/**
 * The planner's model of a slot holding `exercise`, as the plan facts carry it
 * ({ muscle, kind, credits }): the muscle above, the generator's own prescription
 * key (poolGenerator.deriveParamKey) and the curated credits of the exercise's
 * name in that muscle's catalogue, or {} for a name the catalogue does not list
 * (the answer for a person's own exercise). Null when the exercise has no
 * muscle.
 */
export function slotFactsFor(exercise) {
  const muscle = slotMuscleOf(exercise);
  if (!muscle) return null;
  return { muscle, kind: kindOf(exercise), credits: catalogueCredits(muscle, exercise?.name) };
}

/**
 * The rest a swapped slot carries (Campaign 16 job 7; design 4.12: "Rest
 * follows the new exercise"). The new tier's default replaces the old rest only
 * when the exercise changes tier AND the old rest was the outgoing tier's
 * default (hypertrophy or strength table); any other rest is the person's own
 * and stays, a null rest stays null, and an outgoing exercise whose tier cannot
 * be read leaves the rest alone.
 */
export function restAfterSwap({ oldExercise, newExercise, restSeconds }) {
  if (restSeconds == null) return restSeconds ?? null;
  const rest = Number(restSeconds);
  if (!Number.isFinite(rest) || !categoryOf(oldExercise)) return restSeconds;
  const oldKey = kindOf(oldExercise);
  const newKey = kindOf(newExercise);
  if (oldKey === newKey) return restSeconds;
  // Campaign 16's own definition of "still the default", on the rest alone: the
  // reps always carry, so they have no say in whether the rest follows.
  return isDefaultPrescription(oldKey, { restSec: rest }) ? restFor(newKey, false) : restSeconds;
}

/**
 * The routine exercise of a slot after its exercise is swapped: the slot's own
 * row (sets, rep range, notes, group, id) with the new exercise in it, the load
 * cleared and rest per restAfterSwap. A new object; null when there is no row.
 *
 * @param {object} prevRoutineEx  the slot's routineExercise (camelCase)
 * @param {object} newExercise
 * @param {object} oldExercise    the exercise it held, for the rest rule
 */
export function carryPrescription(prevRoutineEx, newExercise, oldExercise) {
  if (!prevRoutineEx || !newExercise) return null;
  return {
    ...prevRoutineEx,
    exerciseId: newExercise.id,
    exerciseName: newExercise.name,
    startingWeight: null,
    ...(prevRoutineEx.restSeconds !== undefined
      ? { restSeconds: restAfterSwap({ oldExercise, newExercise, restSeconds: prevRoutineEx.restSeconds }) }
      : {}),
  };
}

/**
 * The week's sets a swapped-in exercise is given: the slot's served number, held
 * to the new exercise's per-exercise cap when `capped` (a plan the new planner
 * built; every other plan keeps the number exactly, as it served it). `focus`
 * is true when the slot's muscle is a focus muscle of the plan, whose isolation
 * exercise may take 4. Null when there is no number to carry.
 */
export function carriedSetCount({ served, newExercise, capped = false, focus = false } = {}) {
  const n = Number(served);
  if (served == null || !Number.isFinite(n) || n < 1) return null;
  const sets = Math.round(n);
  if (!capped) return sets;
  return Math.min(sets, exerciseCap(kindOf(newExercise), false, { focus }));
}

// The plan's own entry for an exercise of a routine, when it holds a usable one.
function entryOf(facts, routineId, exercise) {
  if (facts?.version !== 2 || !exercise?.id) return null;
  const entry = facts?.slots?.[routineId]?.[exercise.id];
  return isObject(entry) && typeof entry.muscle === 'string' && entry.muscle ? entry : null;
}

/**
 * The plan facts after a PERMANENT swap into `routineId` (lane brief 3): the new
 * exercise's { muscle, kind, credits } is written under facts.slots[routineId],
 * so every week is served on the planner's model. The old exercise's entry stays
 * (a swap back is then an exact inverse, and nothing reads an entry for an
 * exercise the routine no longer holds), and an entry the plan already holds for
 * the new exercise is kept. Facts that are not the new planner's (version 2) are
 * never edited. Never mutates its input.
 *
 * @returns {{facts: object, slot: ?object, changed: boolean}}
 */
export function planFactsAfterSwap(facts, { routineId, newExercise } = {}) {
  if (facts?.version !== 2 || !routineId || !newExercise?.id) return { facts, slot: null, changed: false };
  const existing = entryOf(facts, routineId, newExercise);
  if (existing) return { facts, slot: existing, changed: false };
  const slot = slotFactsFor(newExercise);
  if (!slot) return { facts, slot: null, changed: false };
  const slots = isObject(facts.slots) ? facts.slots : {};
  const here = isObject(slots[routineId]) ? slots[routineId] : {};
  return {
    facts: { ...facts, slots: { ...slots, [routineId]: { ...here, [newExercise.id]: slot } } },
    slot,
    changed: true,
  };
}

/**
 * The muscle a swap moves the slot's sets between, or null when it moves none
 * (same muscle, or either unknown). The plan's own entry for an exercise wins
 * over the corpus (a lunge the planner placed under glutes is a glutes slot).
 */
export function slotMuscleChange({ facts, routineId, oldExercise, newExercise } = {}) {
  const from = entryOf(facts, routineId, oldExercise)?.muscle || slotMuscleOf(oldExercise);
  const to = entryOf(facts, routineId, newExercise)?.muscle || slotMuscleOf(newExercise);
  if (!from || !to || from === to) return null;
  return { from, to };
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const sumOf = (map) => Object.values(map).reduce((a, b) => a + b, 0);
// A muscle's session shares as sets (share x the muscle's weekly target), the positive ones only.
const asSets = (shares, target) => Object.fromEntries(
  Object.entries(shares).filter(([, v]) => isNum(v) && v > 0).map(([k, v]) => [k, v * target]),
);
const asShares = (sets) => {
  const total = sumOf(sets);
  return Object.fromEntries(Object.entries(sets).filter(([, v]) => v > 0).map(([k, v]) => [k, v / total]));
};

/**
 * The plan's per-muscle session shares (facts.exposureShares: for each muscle the
 * fraction of its weekly sets each session takes, the weights prescribe splits a
 * week's target by) after `sets` sets of a slot in session `sessionId` move from
 * muscle `from` to muscle `to` (a permanent swap into another primary muscle;
 * D219 review finding 2). Worked in sets so the other sessions keep exactly the
 * sets they had: the slot's session gives up `sets` of `from` and takes `sets`
 * more of `to`, against the targets the muscles had, and each muscle's shares
 * are then re-normalised to sum to 1. A muscle with no stored shares is left as
 * it is (prescribe then weights its sessions by their slots' stored sets), and
 * a muscle left with nothing loses its entry. Returns the input untouched when
 * nothing moves. Never mutates.
 *
 * @param {?Object<string, Object<string, number>>} shares
 * @param {object} args
 * @param {string} args.sessionId   the routine the swapped slot is in
 * @param {string} args.from        the muscle the slot's sets leave
 * @param {string} args.to          the muscle they join
 * @param {number} args.sets        the slot's served sets in the week the fractions are read from
 * @param {number} args.targetFrom  `from`'s weekly target in that week, before the move
 * @param {number} args.targetTo    `to`'s weekly target in that week, before the move
 */
export function moveSlotShares(shares, { sessionId, from, to, sets, targetFrom, targetTo } = {}) {
  if (!isObject(shares) || !sessionId || !from || !to || from === to || !(sets > 0) || !(targetFrom > 0)) return shares;
  const out = { ...shares };
  if (isObject(out[from])) {
    const left = asSets(out[from], targetFrom);
    left[sessionId] = Math.max(0, (left[sessionId] ?? 0) - sets);
    if (sumOf(left) > 0) out[from] = asShares(left);
    else delete out[from];
  }
  if (isObject(out[to]) && targetTo > 0) {
    const gained = asSets(out[to], targetTo);
    gained[sessionId] = (gained[sessionId] ?? 0) + sets;
    out[to] = asShares(gained);
  }
  return out;
}

/**
 * The plan's own record of every week's per-muscle targets (facts.weeklyTargets,
 * { muscle: [week 1 .. recovery week] }) after a slot's sets move from `from` to
 * `to`: each move is { weekIndex (1 to 6), sets }, the sets that week served the
 * slot, taken from `from`'s week and given to `to`'s. A target never goes below
 * zero; a muscle with no series, or a week outside it, is skipped. Returns the
 * input untouched when nothing changes. Never mutates.
 */
export function moveWeeklyTargets(weeklyTargets, { from, to, moves } = {}) {
  if (!isObject(weeklyTargets) || !from || !to || from === to || !Array.isArray(moves) || moves.length === 0) return weeklyTargets;
  const out = { ...weeklyTargets };
  let changed = false;
  for (const [muscle, sign] of [[from, -1], [to, 1]]) {
    if (!Array.isArray(out[muscle])) continue;
    const series = [...out[muscle]];
    for (const move of moves) {
      const i = Number(move?.weekIndex) - 1;
      if (!Number.isInteger(i) || i < 0 || i >= series.length || !isNum(series[i]) || !(move?.sets > 0)) continue;
      series[i] = Math.max(0, series[i] + sign * move.sets);
      changed = true;
    }
    out[muscle] = series;
  }
  return changed ? out : weeklyTargets;
}

const spoken = (muscle) => muscleDisplayName(muscle).toLowerCase();

/** The note before a permanent swap into another muscle is confirmed (design 4.12). */
export function swapMuscleNote({ from, to }) {
  return `This moves this slot's sets from ${spoken(from)} to ${spoken(to)} for the rest of the plan.`;
}

/** The same fact once it is done: what the slot's sets count for now. */
export function swapMuscleDoneNote({ from, to }) {
  return `This slot's sets now count for ${spoken(to)}, not ${spoken(from)}.`;
}

/**
 * A "just this session" swap made on the routine screen, applied to the rows of
 * the workout started from there: each swapped row holds the new exercise with
 * the slot's prescription carried. `sessionSwaps` is { [routineExerciseId]:
 * { exercise } }. Returns new rows (the plan's own are never mutated); a choice
 * for a row that is no longer there changes nothing.
 */
export function applySessionSwaps(rows, sessionSwaps) {
  const list = Array.isArray(rows) ? rows : [];
  if (!isObject(sessionSwaps)) return list;
  return list.map((row) => {
    const swap = sessionSwaps[row?.routineExercise?.id];
    if (!swap?.exercise?.id || row?.exercise?.id === swap.exercise.id) return row;
    return {
      ...row,
      exercise: swap.exercise,
      routineExercise: carryPrescription(row.routineExercise, swap.exercise, row.exercise),
    };
  });
}

/** The two choices every swap surface offers (design 4.12). */
export const SWAP_SCOPE_OPTIONS = Object.freeze([
  Object.freeze({ label: 'Just this session', value: SWAP_SCOPE.SESSION }),
  Object.freeze({ label: 'From now on', value: SWAP_SCOPE.PROGRAMME }),
]);

/**
 * One calm line under the choice, naming the exercise it is about and what
 * happens to the plan. `surface` is 'workout' (the logger) or 'routine' (the
 * plan screen, where a one-off applies to the workout started from there).
 */
export function swapScopeHint(scope, { fromName, surface = 'workout' } = {}) {
  const from = fromName || 'this exercise';
  if (scope === SWAP_SCOPE.PROGRAMME) {
    return surface === 'routine'
      ? `${from} is replaced in your plan from now on. Sets and reps stay the same.`
      : `${from} is replaced in your plan. Sets and reps stay the same.`;
  }
  return surface === 'routine'
    ? `Used when you start this workout from here. Your plan keeps ${from}.`
    : `Your plan keeps ${from}. Sets and reps stay the same.`;
}
