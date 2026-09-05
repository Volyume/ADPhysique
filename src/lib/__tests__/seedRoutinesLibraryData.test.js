/**
 * seedRoutines library data: density and required names.
 *
 * What this pins: LIBRARY_PLANS (and REQUIRED_EXERCISES) contain no ARRAY
 * HOLES, and every plan, workout and exercise row carries a name.
 *
 * Why holes get their own test. Sentry VOLYUME-30 ("Cannot read property
 * 'name' of undefined", scope seedRoutines.seedRoutinesIfNeeded) came from two
 * stray double commas in LIBRARY_PLANS: a bare `,` on its own line and a `},,`.
 * A hole is not an element. `for...of` walks the index range and yields the
 * hole as undefined, so `plan.name` threw at index 31, the seed aborted, and 16
 * of the 47 plans were never created. Because SEED_KEY is only written after
 * that loop, every launch retried and failed identically, leaving affected
 * users with a permanently short plan library rather than a one-off error.
 *
 * The check below is written as
 *   arr.every((_, i) => Object.prototype.hasOwnProperty.call(arr, i))
 * deliberately. A first pass at diagnosing this used forEach and reported the
 * data clean: forEach SKIPS holes, for...of does not. That difference is the
 * whole reason the bug was invisible to inspection, so any check here has to be
 * one that holes cannot hide from. hasOwnProperty on the index is such a check;
 * forEach, map, filter and JSON.stringify are not.
 *
 * The data is EVALUATED rather than regex-parsed. capabilityFamilyPlans.test.js
 * reads the same array with a regular expression, which is right for what it
 * asserts but structurally cannot see this defect: a hole contributes no source
 * text to match, so a regex sweep reports the surviving plans and notices
 * nothing missing. Only evaluating the literal makes the gap real.
 */
const fs = require('fs');
const path = require('path');

const SOURCE = path.resolve(__dirname, '../seedRoutines.js');

/**
 * Evaluate the two data literals out of seedRoutines.js without importing the
 * module, which would pull in the database, AsyncStorage and the rest of the
 * seeding machinery. The slice runs from the first literal to the seeding
 * function, so it carries the arrays and nothing that performs I/O.
 */
function loadSeedData() {
  const src = fs.readFileSync(SOURCE, 'utf8');
  const start = src.indexOf('export const LIBRARY_PLANS = [');
  const end = src.indexOf('export async function seedRoutinesIfNeeded');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(`${src.slice(start, end).replace('export const LIBRARY_PLANS', 'const LIBRARY_PLANS')}\nreturn { LIBRARY_PLANS };`)();
}

// REQUIRED_EXERCISES removed (EL-15, exercise-library-expansion-2026-09-05):
// the 18 rows are now ordinary canonical corpus entries; the exercise-list
// literal this suite guards against array holes is now just LIBRARY_PLANS.
const { LIBRARY_PLANS } = loadSeedData();

/** Indices present in the index range but absent as own properties. */
function holeIndices(arr) {
  const holes = [];
  for (let i = 0; i < arr.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(arr, i)) holes.push(i);
  }
  return holes;
}

describe('seedRoutines library data is dense', () => {
  it('LIBRARY_PLANS has no array holes', () => {
    expect(holeIndices(LIBRARY_PLANS)).toEqual([]);
    expect(LIBRARY_PLANS.every((_, i) => Object.prototype.hasOwnProperty.call(LIBRARY_PLANS, i))).toBe(true);
  });

  it('nested workout and exercise arrays have no holes either', () => {
    LIBRARY_PLANS.forEach((plan, p) => {
      expect({ plan: plan.name, holes: holeIndices(plan.workouts) }).toEqual({ plan: plan.name, holes: [] });
      plan.workouts.forEach((workout, w) => {
        expect({ at: `${p}.${w}`, holes: holeIndices(workout.exercises) })
          .toEqual({ at: `${p}.${w}`, holes: [] });
      });
    });
  });

  // The exact failure the holes caused: the seeding loop walks LIBRARY_PLANS
  // with for...of and reads plan.name on every iteration. Reproduce that walk
  // rather than trusting the hole checks above to stand in for it.
  it('a for...of walk reaches every plan without throwing', () => {
    let reached = 0;
    for (const plan of LIBRARY_PLANS) {
      expect(typeof plan.name).toBe('string');
      reached++;
    }
    expect(reached).toBe(LIBRARY_PLANS.length);
  });
});

describe('seedRoutines library rows are named', () => {
  it('every plan, workout and exercise row has a non-empty name', () => {
    const unnamed = [];
    LIBRARY_PLANS.forEach((plan, p) => {
      if (!plan?.name?.trim()) unnamed.push(`plan ${p}`);
      (plan.workouts ?? []).forEach((workout, w) => {
        if (!workout?.name?.trim()) unnamed.push(`plan ${p} (${plan.name}) workout ${w}`);
        (workout.exercises ?? []).forEach((ex, e) => {
          if (!ex?.name?.trim()) unnamed.push(`plan ${p} (${plan.name}) workout ${w} exercise ${e}`);
        });
      });
    });
    expect(unnamed).toEqual([]);
  });

  // Vacuity guard: if the slice above ever stops finding the literals, the
  // sweeps become assertions about empty arrays and pass while checking
  // nothing. A floor, not an exact count, so adding plans never fails this.
  it('actually loaded the library', () => {
    expect(LIBRARY_PLANS.length).toBeGreaterThanOrEqual(40);
  });
});
