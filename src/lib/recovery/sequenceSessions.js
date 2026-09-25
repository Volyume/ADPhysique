/**
 * src/lib/recovery/sequenceSessions.js
 *
 * Per-muscle recovery sequencing (register D201, spec
 * docs/recovery-programme-2026-09-25/00-SPEC.md section 5). What each
 * session trains is decided by planEngine.js exactly as it is today; this
 * module only decides the ORDER those sessions run in, so a muscle's next
 * session lands as close as possible to its estimated recovery
 * (recovery/constants.js's recoveryHours), without imposing weekdays (D17)
 * and without changing which exercises, sets or muscles any session
 * carries.
 *
 * PURE. No I/O, no clock, no randomness (CLAUDE.md: the engine is
 * deterministic; same inputs, same output, every time). The N sessions are
 * spaced using TYPICAL_WEEK_GAP_HOURS[N] (recovery/constants.js; D201
 * addendum, lead ruling 3): the hours from one array-adjacent slot to the
 * next for a TYPICAL week of that many sessions (e.g. Mon/Tue/Thu/Fri for
 * four), not an even 168 / N slice - the LAST entry is always the wrap
 * (the last session of the week back to the first of the next) and is
 * always the longest gap, because a real week's rest days concentrate
 * there. This is a spacing PRIOR for SCORING only: no weekday is ever
 * assigned to a plan or a session (D17: "user trains on the days they
 * want and have lives"), and both the input and the returned `workouts`
 * are plain arrays in PROGRAMME ORDER (src/lib/programmePosition.js
 * header: "Position beats calendar"). The runtime next-workout logic
 * (spec section 4) is separate and reads the user's own habitual
 * training days, never this table.
 *
 * PER-SESSION DOSE. Each session's sets on a muscle are computed by
 * running its exercises through allocateExerciseVolume (algorithms.js
 * ~237-267: primary muscle at 1.0 sets, each secondary at its own
 * contribution, default 0.5), the SAME allocator the volume tracker uses
 * everywhere else, so "sets on a muscle" never disagrees between this
 * module and the rest of the app. allocateExerciseVolume needs the
 * exercise's primaryMuscle/secondaryMuscles, which the plan generator's
 * own exercise objects do not carry by the time `validWorkouts` exists
 * (planEngine.js's finalise step strips the selection-time `_m`/`_muscle`
 * tags at planEngine.js:3472, before validWorkouts is built at
 * planEngine.js:3486): the generator's exercise shape there is
 * `{ exerciseId, exerciseName, sets, repMin, repMax, restSec, rirTarget,
 * notes }` (built by makeEx, planEngine.js:889-899). So the caller
 * (planEngine.js's own hook) hands this module an `exerciseById` map
 * (exerciseId -> { primaryMuscle, secondaryMuscles }) built from whichever
 * exercise pool/library it holds for the run; resolveExerciseRow below
 * falls back to an exercise's own `_m`/`_muscle` selection-time tag only
 * when the id is not in that map, for a caller that hands this module
 * exercises from an earlier point in the pipeline where those tags still
 * exist.
 *
 * THE LEAD SESSION NEVER MOVES (D201 addendum, lead ruling 1). The first
 * session of the input array - the split's authored lead, e.g. a
 * DIVISION_MATRIX day 0 that opens with the division's priority muscle,
 * "session 0 leads with the priority muscle" is a coaching decision, not
 * a recovery-spacing one - stays at position 0 in every candidate order.
 * Only the remaining N-1 sessions are permuted among positions 1..N-1, so
 * F2 ("the scorer may replace a hand-authored day order when strictly
 * better") means the REST of the week may move, never which session
 * leads it.
 *
 * THE PENALTY, exactly as implemented. Every permutation of the N-1
 * non-lead sessions is scored (position 0 fixed throughout); the
 * strictly-lowest-penalty arrangement wins, and a tie keeps the ORIGINAL
 * order (the identity order's own penalty is computed first and is only
 * replaced by an arrangement that scores STRICTLY lower, so a split that
 * is already well sequenced, or a DIVISION_MATRIX day order that already
 * ties for best, is never perturbed for a same-scoring relabelling).
 *
 * For a muscle m: take the sessions THIS CANDIDATE ORDER loads m in with
 * QUALIFYING_SETS (2) or more sets, in the order the candidate places
 * them, and walk every consecutive pair of that subsequence, CIRCULARLY -
 * a muscle trained in only one qualifying session pairs with itself
 * across the week (distance = all N slots, which always sums to the full
 * 168 hours whatever TYPICAL_WEEK_GAP_HOURS[N] looks like, because every
 * row of that table sums to 168; this is what makes the wrap-around gap
 * always counted, including for a muscle trained once a week). A repeat
 * across the week boundary is exactly as real a repeat as one within the
 * week (D201 addendum, lead ruling 2: the recovery terms stay circular),
 * so the wrap gap is scored the SAME way as any other, using the SAME
 * table. For a pair whose two sessions are `k` array-slots apart,
 * gapBetweenThem = the sum of the `k` TYPICAL_WEEK_GAP_HOURS[N] entries
 * starting at the source slot, wrapping through the table's own last
 * (longest) entry (gapBetweenSlots below) - so a muscle trained every
 * other session of a 4-day week (Mon, Tue, Thu, Fri) gets gapBetweenThem
 * = 24 + 48 = 72 h one way and 24 + 72 = 96 h the other, never a flat
 * 84 h (spec section 5 step 5's worked example predates this ruling; see
 * the "reads 72 and 96" test for the number this module actually uses
 * now). T is recoveryHours(muscle, { sets, recoveryRating, rirTarget })
 * from the EARLIER session of the pair's own sets on the muscle (no
 * firstWeek, no ratings: neither exists yet at plan generation, per this
 * module's brief). Per pair:
 *
 *   underRecovered = max(0, T - gapBetweenThem) ^ 2
 *   overRecovered  = 0.25 x max(0, gapBetweenThem - 2 x T) ^ 2 / 24
 *
 * summed over every muscle and every one of its qualifying pairs.
 *
 * SEPARATELY, the adjacency (systemic-overlap) term is LINEAR and NEVER
 * wraps (D201 addendum, lead ruling 2): only for i, i+1 with i < N-1 -
 * never the pair (N-1, 0). The week boundary nearly always sits over a
 * rest day, so two sessions that are neighbours ACROSS it are rarely
 * neighbours in TIME the way two sessions on consecutive training days
 * are; an unavoidable clash (e.g. three of one session-type among five
 * slots, which cannot be arranged without at least one adjacent repeat
 * somewhere) is expected to be pushed to the wrap rather than penalised
 * there. This generalises C16 quality law 5 ("Generated routine ordering
 * must be sensible... avoid unnecessarily placing highly overlapping
 * muscle/systemic demands in consecutive planned sessions", planEngine.js
 * ~2117-2141, buildWeightedUpperLower's interleave) into a number: each
 * session's PRIMARY-LOADED muscles are the same QUALIFYING_SETS-or-more
 * set used above; overlap = the shared sets (sum of min(setsA[m],
 * setsB[m]) over every muscle both sessions load) over the SMALLER
 * session's total primary-loaded sets. When overlap exceeds half:
 *
 *   adjacency = 100 x (overlap - 0.5)
 *
 * otherwise 0. penalty(order) = the muscle-pair sum + the (linear-only)
 * adjacency sum.
 *
 * Guarded at more than MAX_SEQUENCED_SESSIONS (7) sessions - with the
 * lead fixed, that leaves (N-1)! permutations of the rest, so 7 sessions
 * is 6! = 720, the largest this module will search; beyond that it
 * returns the input unchanged (changed: false) rather than scoring.
 * planEngine.js clamps daysPerWeek to [2, 6] before this module ever sees
 * a plan, so the guard is never reached from the app; it exists for a
 * caller that hands this function a corrupted or synthetic input.
 */
import { allocateExerciseVolume, muscleDisplayName } from '../algorithms';
import { recoveryHours, BASE_RECOVERY_HOURS, TYPICAL_WEEK_GAP_HOURS } from './constants';

/**
 * A session "loads" a muscle, for both the recovery-pair term and the
 * adjacency term's "primary-loaded" set, at this many sets or more. Same
 * threshold sessionReadiness.js uses for its own "at least 2 planned
 * sets" limiting-muscle rule (spec section 3.3), so one plan never reads
 * a muscle as trained by one of these two modules and not trained by the
 * other.
 */
const QUALIFYING_SETS = 2;

/** 7! = 5,040. Beyond this the input is returned unchanged rather than scored. */
const MAX_SEQUENCED_SESSIONS = 7;

/**
 * Resolves an exercise (the generator's { exerciseId, exerciseName, sets,
 * ... } shape, or any object allocateExerciseVolume already accepts) to
 * the { primaryMuscle, secondaryMuscles } row allocateExerciseVolume
 * needs, via exerciseById, falling back to the exercise's own selection-
 * time `_m`/`_muscle` tag (planEngine.js:1818, 1989) when the id is not
 * in the map. Returns null when neither source names a muscle, so the
 * exercise contributes no sets to any muscle rather than a wrong one.
 */
function resolveExerciseRow(exercise, exerciseById) {
  const id = exercise?.exerciseId;
  const fromMap = id != null && exerciseById ? exerciseById[id] : null;
  if (fromMap) return fromMap;
  if (exercise && (exercise.primaryMuscle || exercise.secondaryMuscles)) return exercise;
  const muscle = exercise?._m ?? exercise?._muscle ?? null;
  return muscle ? { primaryMuscle: muscle, secondaryMuscles: [] } : null;
}

/** One session's sets per muscle: { [muscle]: sets }, via allocateExerciseVolume. */
function computeSessionMuscleSets(workout, exerciseById) {
  const out = {};
  const exercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
  for (const exercise of exercises) {
    const workingSets = Number(exercise?.sets);
    if (!Number.isFinite(workingSets) || workingSets <= 0) continue;
    const row = resolveExerciseRow(exercise, exerciseById);
    if (!row) continue;
    for (const alloc of allocateExerciseVolume(row)) {
      if (!alloc?.muscle) continue;
      out[alloc.muscle] = (out[alloc.muscle] ?? 0) + workingSets * alloc.sets;
    }
  }
  return out;
}

/** Session-array indices (within setsByMuscleList) where `muscle` qualifies. */
function qualifyingPositions(setsByMuscleList, muscle) {
  const positions = [];
  for (let i = 0; i < setsByMuscleList.length; i++) {
    if ((setsByMuscleList[i][muscle] ?? 0) >= QUALIFYING_SETS) positions.push(i);
  }
  return positions;
}

/**
 * Consecutive pairs of a muscle's own qualifying positions, circularly,
 * within a week of `n` slots: [{ from, distance }], `from` the earlier
 * (source) position, `distance` in slots. A single qualifying position
 * pairs with itself across the whole week (distance n), which is what
 * makes the wrap-around gap always counted, including for a muscle
 * trained only once a week.
 */
function circularPairs(positions, n) {
  if (positions.length === 0) return [];
  if (positions.length === 1) return [{ from: positions[0], distance: n }];
  const pairs = [];
  for (let i = 0; i < positions.length - 1; i++) {
    pairs.push({ from: positions[i], distance: positions[i + 1] - positions[i] });
  }
  const last = positions[positions.length - 1];
  const first = positions[0];
  pairs.push({ from: last, distance: n - (last - first) });
  return pairs;
}

/**
 * Hours from slot `from` to `distance` slots later, under a week's own
 * TYPICAL_WEEK_GAP_HOURS layout (D201 addendum, lead ruling 3):
 * gapLayout[i] is the hours from slot i to slot i + 1, the LAST entry
 * being the wrap (the last slot of the week to the first of the next).
 * Summing all n entries starting anywhere always gives 168 (every row of
 * the table sums to a week), so a distance of n (a singleton muscle's
 * self-pair) always returns exactly 168 regardless of `from`.
 */
function gapBetweenSlots(gapLayout, from, distance) {
  const n = gapLayout.length;
  let total = 0;
  for (let j = 0; j < distance; j++) {
    total += gapLayout[(from + j) % n];
  }
  return total;
}

/** Sum of the values of a plain numeric object. */
function sumValues(obj) {
  let total = 0;
  for (const v of Object.values(obj)) total += v;
  return total;
}

/**
 * The adjacency term for two LITERALLY adjacent sessions (LINEAR only -
 * never called for the wrap pair; see the module header, lead ruling 2):
 * overlap = the shared qualifying (>= QUALIFYING_SETS) sets over the
 * smaller session's total qualifying sets; term = 100 x (overlap - 0.5)
 * once overlap exceeds half, else 0.
 */
function adjacencyTerm(setsByMuscleA, setsByMuscleB) {
  const qualifyingA = {};
  for (const [m, s] of Object.entries(setsByMuscleA)) if (s >= QUALIFYING_SETS) qualifyingA[m] = s;
  const qualifyingB = {};
  for (const [m, s] of Object.entries(setsByMuscleB)) if (s >= QUALIFYING_SETS) qualifyingB[m] = s;

  const totalA = sumValues(qualifyingA);
  const totalB = sumValues(qualifyingB);
  const smaller = Math.min(totalA, totalB);
  if (smaller <= 0) return 0;

  let shared = 0;
  for (const [m, s] of Object.entries(qualifyingA)) {
    const other = qualifyingB[m];
    if (other != null) shared += Math.min(s, other);
  }

  const overlap = shared / smaller;
  return overlap > 0.5 ? 100 * (overlap - 0.5) : 0;
}

/**
 * The full penalty for one order. `sessionsInOrder` is an array (length n)
 * of { [muscle]: sets } maps, already in the candidate order. `gapLayout`
 * is that week's TYPICAL_WEEK_GAP_HOURS[n] (or the caller's fallback).
 */
function penaltyForOrder(sessionsInOrder, gapLayout, recoveryRating, rirTarget) {
  const n = sessionsInOrder.length;
  let total = 0;

  const musclesTrained = new Set();
  for (const setsByMuscle of sessionsInOrder) {
    for (const [muscle, sets] of Object.entries(setsByMuscle)) {
      if (sets >= QUALIFYING_SETS) musclesTrained.add(muscle);
    }
  }

  for (const muscle of musclesTrained) {
    const positions = qualifyingPositions(sessionsInOrder, muscle);
    for (const { from, distance } of circularPairs(positions, n)) {
      const sourceSets = sessionsInOrder[from][muscle];
      const T = recoveryHours(muscle, { sets: sourceSets, recoveryRating, rirTarget });
      const gapBetweenThem = gapBetweenSlots(gapLayout, from, distance);
      const underRecovered = Math.max(0, T - gapBetweenThem) ** 2;
      const overRecovered = (0.25 * Math.max(0, gapBetweenThem - 2 * T) ** 2) / 24;
      total += underRecovered + overRecovered;
    }
  }

  // LINEAR only (lead ruling 2): i, i+1 for i < n - 1. Never the wrap
  // pair (n - 1, 0) - the week boundary nearly always holds a rest day,
  // so sessions either side of it are rarely neighbours in time.
  for (let i = 0; i < n - 1; i++) {
    total += adjacencyTerm(sessionsInOrder[i], sessionsInOrder[i + 1]);
  }

  return total;
}

/**
 * Heap's algorithm: every permutation of [0..n-1], as index arrays. The
 * first value yielded is always the identity order.
 */
function* permutations(n) {
  const indices = Array.from({ length: n }, (_, i) => i);
  yield indices.slice();
  const c = new Array(n).fill(0);
  let i = 1;
  while (i < n) {
    if (c[i] < i) {
      const k = i % 2 === 0 ? 0 : c[i];
      const tmp = indices[i];
      indices[i] = indices[k];
      indices[k] = tmp;
      yield indices.slice();
      c[i] += 1;
      i = 1;
    } else {
      c[i] = 0;
      i += 1;
    }
  }
}

/**
 * The achieved spacing for the longest-recovery muscles trained (the
 * muscles sharing the highest BASE_RECOVERY_HOURS baseline among muscles
 * this plan trains 2 or more times a week; a muscle trained once a week
 * has no sequencing-sensitive "next session" gap to report, since
 * reordering never changes it). Per muscle: the WORST (smallest) gap it
 * experiences anywhere in the chosen order, and the recoveryHours (T)
 * that gap was judged against.
 */
function buildSpacing(sessionsInOrder, gapLayout, recoveryRating, rirTarget) {
  const n = sessionsInOrder.length;
  const muscles = new Set();
  for (const setsByMuscle of sessionsInOrder) {
    for (const [muscle, sets] of Object.entries(setsByMuscle)) {
      if (sets >= QUALIFYING_SETS) muscles.add(muscle);
    }
  }

  const candidates = [];
  for (const muscle of muscles) {
    const positions = qualifyingPositions(sessionsInOrder, muscle);
    if (positions.length < 2) continue; // once a week: gap is always the full week, not sequencing-sensitive

    let worst = null;
    for (const { from, distance } of circularPairs(positions, n)) {
      const hoursBetween = gapBetweenSlots(gapLayout, from, distance);
      if (!worst || hoursBetween < worst.hoursBetween) {
        worst = {
          hoursBetween,
          recoveryHours: recoveryHours(muscle, {
            sets: sessionsInOrder[from][muscle], recoveryRating, rirTarget,
          }),
        };
      }
    }
    candidates.push({ muscle, ...worst });
  }

  if (!candidates.length) return [];
  const maxBase = Math.max(...candidates.map((c) => BASE_RECOVERY_HOURS[c.muscle] ?? 0));
  return candidates.filter((c) => (BASE_RECOVERY_HOURS[c.muscle] ?? 0) === maxBase);
}

/**
 * Reorders one week's sessions so each muscle's next session lands as
 * close as possible to its estimated recovery. See the module header for
 * the exact penalty; ties keep the ORIGINAL order, and `workouts[0]`
 * NEVER moves (lead ruling 1). Never mutates `workouts` or any
 * session/exercise within it; the returned `workouts` holds the SAME
 * session objects, only reordered.
 *
 * @param {Array<{name: string, exercises: Array}>} workouts - the week's
 *   sessions, in the generator's own build order. workouts[0] is treated
 *   as the authored lead session and always stays first.
 * @param {object} [options]
 * @param {number} [options.daysPerWeek] - accepted for interface parity
 *   with the plan's own inputs; N is taken from workouts.length (the
 *   array actually being sequenced), so this is never read.
 * @param {string} [options.recoveryRating] - poor | average | good.
 * @param {number|null} [options.rirTarget] - the plan's opening RIR target,
 *   or null when the caller has none.
 * @param {object|null} [options.exerciseById] - exerciseId -> { primaryMuscle,
 *   secondaryMuscles }, built by the caller from whichever exercise pool or
 *   library it holds for this run. See resolveExerciseRow for the fallback
 *   when an id is missing.
 * @returns {{ workouts: Array, changed: boolean, penaltyBefore: number,
 *   penaltyAfter: number, spacing: Array<{muscle: string, hoursBetween:
 *   number, recoveryHours: number}> }}
 */
export function sequenceSessionsForRecovery(workouts, options = {}) {
  const { recoveryRating = 'average', rirTarget = null, exerciseById = null } = options ?? {};
  const list = Array.isArray(workouts) ? workouts : [];
  const n = list.length;

  if (n === 0) {
    return { workouts: list, changed: false, penaltyBefore: 0, penaltyAfter: 0, spacing: [] };
  }

  const perSessionMuscleSets = list.map((w) => computeSessionMuscleSets(w, exerciseById));
  // D201 addendum, lead ruling 3: the typical-week layout, not an even
  // 168 / N slice. TYPICAL_WEEK_GAP_HOURS only tabulates up to 7 entries;
  // beyond that (the N > MAX_SEQUENCED_SESSIONS guard below, never
  // reached from the app) falls back to an even split so the guard branch
  // still has a well-defined, if untypical, layout to report against.
  const gapLayout = TYPICAL_WEEK_GAP_HOURS[n] ?? Array.from({ length: n }, () => 168 / n);

  if (n > MAX_SEQUENCED_SESSIONS) {
    const penalty = penaltyForOrder(perSessionMuscleSets, gapLayout, recoveryRating, rirTarget);
    return {
      workouts: list,
      changed: false,
      penaltyBefore: penalty,
      penaltyAfter: penalty,
      spacing: buildSpacing(perSessionMuscleSets, gapLayout, recoveryRating, rirTarget),
    };
  }

  const identity = Array.from({ length: n }, (_, i) => i);
  const scoreOrder = (order) => penaltyForOrder(
    order.map((idx) => perSessionMuscleSets[idx]), gapLayout, recoveryRating, rirTarget,
  );

  const penaltyBefore = scoreOrder(identity);
  let bestOrder = identity;
  let bestPenalty = penaltyBefore;
  // Lead ruling 1: position 0 is always the ORIGINAL index 0 (the
  // authored lead session); only the remaining n - 1 sessions (original
  // indices 1..n-1) are permuted, among themselves, into positions
  // 1..n-1. permutations(n - 1) yields indices [0..n-2], each offset by 1
  // below to land on the real positions the lead does not occupy.
  for (const tailPerm of permutations(n - 1)) {
    const candidate = [0, ...tailPerm.map((idx) => idx + 1)];
    const p = scoreOrder(candidate);
    if (p < bestPenalty) {
      bestPenalty = p;
      bestOrder = candidate;
    }
  }

  const changed = bestOrder.some((idx, i) => idx !== i);
  const orderedWorkouts = changed ? bestOrder.map((idx) => list[idx]) : list;
  const orderedMuscleSets = changed
    ? bestOrder.map((idx) => perSessionMuscleSets[idx])
    : perSessionMuscleSets;

  return {
    workouts: orderedWorkouts,
    changed,
    penaltyBefore,
    penaltyAfter: bestPenalty,
    spacing: buildSpacing(orderedMuscleSets, gapLayout, recoveryRating, rirTarget),
  };
}

/** Oxford-comma-free join: "a", "a and b", "a, b and c". */
function joinWithAnd(names) {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * One calm sentence naming the achieved gap for the longest-recovery
 * muscles trained (result.spacing), and the typical-week assumption it is
 * judged against (D201 addendum, lead ruling 3: TYPICAL_WEEK_GAP_HOURS,
 * not an even slice of 168 hours, and never a real weekday). Returns null
 * when there is nothing to say (no muscle trained 2 or more times this
 * week), so a caller only adds it to whyThis when it is genuinely
 * informative. British English, no em dash, no "you must".
 *
 * @param {{ workouts: Array, spacing: Array<{muscle: string, hoursBetween: number}> }} result
 */
export function describeSpacing(result) {
  // Named `rows`, not `spacing`: src/__tests__/themeTokens.guard.test.js
  // reads any `spacing.<word>` in src/ as a theme token reference.
  const rows = Array.isArray(result?.spacing) ? result.spacing : [];
  if (!rows.length) return null;
  const days = Array.isArray(result?.workouts) ? result.workouts.length : rows.length;
  const hours = Math.round(Math.min(...rows.map((s) => s.hoursBetween)));
  const names = rows.map((s) => muscleDisplayName(s.muscle).toLowerCase());
  return `Assuming a usual ${days}-day week, sessions are ordered to leave about ${hours} hours before the next session that trains the ${joinWithAnd(names)}.`;
}
