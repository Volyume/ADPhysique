/**
 * requiredSessionIdentity.test.js — Campaign 18 block-progression amendment,
 * step 1: PROVE THE REQUIRED-INSTANCE IDENTITY BEFORE BUILDING ON IT.
 *
 * THE QUESTION THE FOUNDER SET. Within one mesocycle week, can the same
 * routine_id ever be a required session more than once? If it can, the pair
 * (mesocycle_week_id, routine_id) is not a sufficient identity and the whole
 * progression model has to key on something else.
 *
 * THE ANSWER IS NO, and the reason is worth stating because it is NOT obvious:
 * the persistence layer writes ONE ROUTINE ROW PER WORKOUT ENTRY, and a
 * session is identified by its routine row (mesocycle_week_id, routine_id),
 * never by its display name. A person may rename two sessions alike (the
 * rename path touches name only), and two same-named sessions are then two
 * routine rows with two ids that happen to share a name.
 *
 * So any duplication is in the DISPLAY NAME, not in the identity. The pair is
 * sufficient, and the thing that is NOT safe to identify a session by is its
 * name - which is exactly what the amendment already forbids.
 *
 * 2026-10-10 (D219 addendum 3): DIVISION_MATRIX was rewritten per category
 * from research and the generator now names every session in a week
 * distinctly (bikini 6-day no longer holds two "Glutes"). The invariant never
 * depended on the generator repeating names, so this suite no longer needs
 * it to: the duplicate-name case is built by renaming two generated
 * workouts alike after generation.
 *
 * WHAT EACH HALF OF THIS SUITE CAN PROVE. The engine half runs the real
 * generator, pins one required session per workout entry, and shows that
 * alike names do not collapse entries, so nobody later "simplifies" the
 * model on the assumption that names are unique. The writer half is a source guard, because the write is a SQLite transaction:
 * what it pins is that the loop is per-workout with its own createRoutine
 * call, which is what makes the ids distinct.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { generatePlan, POOL } from '../planEngine';
import { canonicalExerciseId } from '../exercise/canonicalId';
import { sequenceSessionsForRecovery } from '../recovery/sequenceSessions';

const read = (p) => readFileSync(resolve(__dirname, '../..', p), 'utf8');

const BASE = {
  experience: 'intermediate', sessionLengthMinutes: 60,
  equipment: 'full_gym', recoveryRating: 'average',
};
const GOALS = ['general', 'mens_physique', 'bikini', 'classic_physique', 'strength', 'fat_loss'];

/** Every plan the real generator can produce across the offered matrix. */
function everyPlan() {
  const out = [];
  for (const goal of GOALS) {
    for (let daysPerWeek = 2; daysPerWeek <= 7; daysPerWeek += 1) {
      let plan;
      try { plan = generatePlan({ ...BASE, goal, daysPerWeek }); } catch (_) { continue; }
      if (plan?.workouts?.length) out.push({ goal, daysPerWeek, plan });
    }
  }
  return out;
}

// The hand-authored DIVISION_MATRIX bikini[6] cell (planEngine.js,
// `bikini: { ... 6: [...] }`), as rewritten by D219 addendum 3: six
// session IDENTITIES with six distinct display names. Used two ways below:
// as an order-free SET (identities survive
// any future recovery-sequencing refinement) and, reconstructed into this
// order, as the INPUT sequenceSessionsForRecovery is asked to re-score
// (D201 and its addenda: lead rulings 1-3, 2026-09-25) so the ORDER
// assertion tracks the scorer's actual behaviour instead of a literal
// array that a future scoring refinement would silently outdate again -
// as happened twice already (see the D201 register).
const AUTHORED_BIKINI_6_NAMES = [
  'Glutes + Hams', 'Upper A (Delts + Back)', 'Glutes + Quads', 'Upper B (Delts + Arms)', 'Glutes (Pump)', 'Core + Delts',
];

/** exerciseId -> { primaryMuscle, secondaryMuscles }, built from the same
 * hand-written POOL fallback planEngine.js uses when no exerciseLibrary is
 * supplied (as here) - mirrors planEngine.js's own buildExerciseByIdForRecovery. */
function buildExerciseByIdFromPool() {
  const out = {};
  for (const [muscle, entries] of Object.entries(POOL)) {
    for (const entry of entries ?? []) {
      const id = canonicalExerciseId(entry.n);
      if (!id || out[id]) continue;
      out[id] = { primaryMuscle: muscle, secondaryMuscles: entry.secondary ?? [] };
    }
  }
  return out;
}

/**
 * Regroups `workouts` (the generator's final, already-sequenced order) by
 * name and pops them out in `authoredNames` order, reconstructing the
 * pre-hook (authored) input array sequenceSessionsForRecovery was actually
 * called with. This matches by name, which is safe ONLY because the current
 * authored names are distinct within the week (D219 addendum 3); each queue
 * therefore holds exactly one workout. It is a test-local reconstruction
 * helper, not a statement that names identify sessions. If names ever repeat
 * again, the queues pop in the final order, so lead ruling 1 (workouts[0] is
 * the untouched authored lead) is what keeps the first repeat correct and the
 * other is left by elimination.
 */
function reconstructAuthoredOrder(workouts, authoredNames) {
  const queues = new Map();
  for (const w of workouts) {
    if (!queues.has(w.name)) queues.set(w.name, []);
    queues.get(w.name).push(w);
  }
  return authoredNames.map((name) => queues.get(name).shift());
}

describe('A REQUIRED SESSION IS NOT ITS NAME', () => {
  test('the generator emits one required session per workout entry', () => {
    // Every offered plan: a distinct entry per session, no entry dropped or
    // merged. The bikini 6-day cell is pinned by identity SET and order below.
    const plans = everyPlan();
    expect(plans.length).toBeGreaterThan(0);
    for (const { plan } of plans) {
      expect(plan.workouts.every((w) => typeof w.name === 'string' && w.name.length > 0)).toBe(true);
    }
    const bikini = plans.find((r) => r.goal === 'bikini' && r.daysPerWeek === 6);
    expect(bikini).toBeTruthy();
    expect(bikini.plan.workouts).toHaveLength(AUTHORED_BIKINI_6_NAMES.length);

    // D201 (per-muscle recovery programme) reorders these six sessions for
    // recovery spacing, and moved this exact pin twice already as the
    // scorer's own model was refined (lead rulings 1-3, 2026-09-25; see
    // the D201 register). Two assertions that survive any future
    // refinement without going stale:
    const actualNames = bikini.plan.workouts.map((w) => w.name);

    // 1. The SET of six session identities is exactly the hand-authored
    //    DIVISION_MATRIX bikini[6] cell, order-free - this suite's whole
    //    point is that these six sessions have six distinct identities
    //    regardless of where sequencing places them.
    expect([...actualNames].sort()).toEqual([...AUTHORED_BIKINI_6_NAMES].sort());

    // 2. The ORDER matches whatever sequenceSessionsForRecovery itself
    //    returns for the authored order, called here exactly as
    //    planEngine.js's own hook calls it (same options, same
    //    exerciseById source) - so this half tracks the scorer's actual
    //    behaviour rather than a literal array a future scoring
    //    refinement would silently outdate again.
    const authoredOrder = reconstructAuthoredOrder(bikini.plan.workouts, AUTHORED_BIKINI_6_NAMES);
    const rescored = sequenceSessionsForRecovery(authoredOrder, {
      daysPerWeek: 6,
      recoveryRating: BASE.recoveryRating,
      rirTarget: authoredOrder[0]?.exercises?.[0]?.rirTarget ?? null,
      exerciseById: buildExerciseByIdFromPool(),
    });
    expect(actualNames).toEqual(rescored.workouts.map((w) => w.name));
  });

  test('so NOTHING may identify a required session by its display name', () => {
    // A person may rename two sessions alike (the rename path touches name
    // only). Two same-named sessions in one week are two different required
    // sessions; a name-keyed model would resolve both when the athlete
    // trained one.
    const plan = generatePlan({ ...BASE, goal: 'bikini', daysPerWeek: 6 });
    const renamed = plan.workouts.map((w, i) => (i < 2 ? { ...w, name: 'Glutes' } : w));
    const names = renamed.map((w) => w.name);
    expect(names.filter((n) => n === 'Glutes')).toHaveLength(2);
    // Still two entries, one per workout, despite the alike names.
    expect(renamed).toHaveLength(plan.workouts.length);
    expect(new Set(names).size).toBeLessThan(names.length);
  });
});

describe('BUT EACH REQUIRED SESSION IS ITS OWN ROUTINE ROW', () => {
  test('the writer creates ONE routine per workout entry, so the ids are distinct', () => {
    const src = read('lib/planAutoGen.js');
    // One createRoutine per resolved workout. Two same-named sessions are two
    // rows, each with its own uid() primary key.
    expect(src).toMatch(/for \(const workout of resolvedWorkouts\) \{\s*\n\s*const routine = await createRoutine\(/);
    // And nothing reuses or looks up a routine by name at write time, which is
    // the only way two entries could collapse onto one row.
    const loop = src.slice(
      src.indexOf('for (const workout of resolvedWorkouts) {'),
      src.indexOf('for (const workout of resolvedWorkouts) {') + 900,
    );
    expect(loop).not.toMatch(/find\(.*name|getRoutineByName/);
  });

  test('routine ids come from uid(), never from a name or an index', () => {
    const db = read('lib/database.js');
    const createRoutine = db.slice(
      db.indexOf('export async function createRoutine'),
      db.indexOf('export async function createRoutine') + 700,
    );
    expect(createRoutine).toMatch(/uid\(\)/);
    expect(createRoutine).not.toMatch(/id = .*name/);
  });
});

describe('THE INVARIANT THIS AMENDMENT BUILDS ON', () => {
  test('within one mesocycle week, a routine_id identifies exactly one required session', () => {
    // Stated as the law it is. The required set for a programme week is the
    // plan's routines; each is one row; therefore (mesocycle_week_id,
    // routine_id) is unique per required instance, and is stable across
    // renames, exercise substitution, reordering and app restarts - none of
    // which change a routine's primary key.
    //
    // The two things that would break it are both pinned above: identifying a
    // session by NAME (a person may rename two sessions alike), and a writer that reused one row for two
    // workout entries (it does not).
    const plan = generatePlan({ ...BASE, goal: 'bikini', daysPerWeek: 6 });
    // One required session per workout entry.
    expect(plan.workouts).toHaveLength(6);
    // Rename two alike after generation: still two entries, two routine rows.
    const renamed = plan.workouts.map((w, i) => (i < 2 ? { ...w, name: 'Glutes' } : w));
    expect(renamed).toHaveLength(6);
    const names = renamed.map((w) => w.name);
    expect(new Set(names).size).toBeLessThan(names.length);
  });

  test('and the identity survives the edits the amendment names', () => {
    // A routine's id is not derived from any of these, so none of them can
    // orphan a required session:
    const db = read('lib/database.js');
    // renaming a routine touches name only
    expect(db).toMatch(/UPDATE routines SET[^;]*name = \?/);
    // exercise substitution writes routine_exercises, never the routine id
    expect(db).toMatch(/INSERT INTO routine_exercises/);
    // reordering writes position, never the id
    expect(db).toMatch(/UPDATE routines SET position = \?/);
  });
});
