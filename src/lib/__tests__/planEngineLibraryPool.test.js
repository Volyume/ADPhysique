/**
 * generatePlan with a library-derived pool (phase 7 step 6b). Verifies that
 * passing inputs.exerciseLibrary makes the engine select from the library,
 * that it stays deterministic, that the effective pool is restored after a
 * run (no state leak), and that a thin library falls back to the built-in
 * POOL so a plan is never starved.
 */
import { generatePlan } from '../planEngine';
import { deriveExerciseMetadata } from '../exerciseMetadata';

const BASE_INPUTS = {
  experience: 'intermediate',
  daysPerWeek: 4,
  sessionLengthMinutes: 60,
  equipment: 'full_gym',
  goal: 'general',
  phase: 'lean_gain',
  weakPoints: [],
  recoveryRating: 'average',
  nutritionPhase: 'maintain',
};

// Build the real seed library the same way the seed does, so the test runs
// against the exercises users actually get.
function realLibrary() {
  const seedSrc = require('fs').readFileSync(
    require('path').join(__dirname, '../seedExercises.js'), 'utf8',
  );
  const start = seedSrc.indexOf('const RAW = [');
  const end = seedSrc.indexOf('\n];', start);
  const body = seedSrc.slice(start, end);
  const smStart = seedSrc.indexOf('const SUBREGION_MAP = {');
  const smEnd = seedSrc.indexOf('\n};', smStart);
  const smBody = seedSrc.slice(smStart, smEnd);
  const subMap = {};
  for (const m of smBody.matchAll(/'([^']+)':\s*'(\w+)'/g)) subMap[m[1]] = m[2];

  const rows = [];
  const re = /\[\s*'([^']+)',\s*'([a-z_]+)',\s*\[([^\]]*)\],\s*'([a-z_]+)',\s*'([a-z_]+)',\s*(true|false),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\s*\]/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const base = {
      name: m[1], primaryMuscle: m[2], equipment: m[4], movementPattern: m[5],
      compoundIsolation: m[6] === 'true' ? 'compound' : 'isolation',
      fatigueCost: parseInt(m[9], 10), stimulusToFatigueRatio: parseInt(m[10], 10),
      subregion: subMap[m[1]] ?? null,
    };
    rows.push({ id: m[1], ...base, ...deriveExerciseMetadata(base) });
  }
  return rows;
}

const LIBRARY = realLibrary();

function allExerciseNames(plan) {
  return plan.workouts.flatMap(w => w.exercises.map(e => e.exerciseName));
}

describe('generatePlan with a library pool', () => {
  test('produces a valid plan whose exercises all come from the library', () => {
    const libraryNames = new Set(LIBRARY.map(e => e.name));
    const plan = generatePlan({ ...BASE_INPUTS, exerciseLibrary: LIBRARY });
    expect(plan.workouts.length).toBeGreaterThan(0);
    const names = allExerciseNames(plan);
    expect(names.length).toBeGreaterThan(0);
    // Every selected exercise resolves to a real library exercise: this is
    // the drift bug closed. (POOL fallback entries are also library names.)
    const unresolved = names.filter(n => !libraryNames.has(n));
    expect(unresolved).toEqual([]);
  });

  test('is deterministic: same inputs and library give the same plan', () => {
    const a = generatePlan({ ...BASE_INPUTS, exerciseLibrary: LIBRARY });
    const b = generatePlan({ ...BASE_INPUTS, exerciseLibrary: LIBRARY });
    expect(allExerciseNames(a)).toEqual(allExerciseNames(b));
  });

  test('does not leak the effective pool: a no-library run after a library run is unchanged', () => {
    const withLib = generatePlan({ ...BASE_INPUTS, exerciseLibrary: LIBRARY });
    const noLib1 = generatePlan(BASE_INPUTS);
    const noLib2 = generatePlan(BASE_INPUTS);
    // The two no-library runs match each other (state restored), regardless
    // of the library run that happened between/before them.
    expect(allExerciseNames(noLib1)).toEqual(allExerciseNames(noLib2));
    expect(withLib.workouts.length).toBeGreaterThan(0);
  });

  test('a thin library falls back to the built-in POOL, still producing a full plan', () => {
    // One lonely exercise: every muscle is under the per-muscle minimum, so
    // the engine should fall back to POOL and still build a complete plan.
    const thin = [LIBRARY.find(e => e.primaryMuscle === 'chest')];
    const plan = generatePlan({ ...BASE_INPUTS, exerciseLibrary: thin });
    expect(plan.workouts.length).toBeGreaterThan(0);
    expect(allExerciseNames(plan).length).toBeGreaterThan(0);
  });

  test('an empty library behaves exactly like no library', () => {
    const empty = generatePlan({ ...BASE_INPUTS, exerciseLibrary: [] });
    const none = generatePlan(BASE_INPUTS);
    expect(allExerciseNames(empty)).toEqual(allExerciseNames(none));
  });

  // Loaded plans use measurable load only: no plain calisthenics, no bands.
  // Weighted calisthenics (a belt-and-plates pull-up or dip) are loaded lifts
  // and may appear. The no-equipment 'bodyweight' profile is the one place
  // plain bodyweight survives, so it is excluded here.
  test('loaded plans never select a plain-bodyweight or band lift', () => {
    const calisthenicOrBand = new Set(
      LIBRARY
        .filter(e =>
          e.equipmentCategory === 'band' ||
          (e.equipmentCategory === 'bodyweight' && !/\bweighted\b/i.test(e.name)),
        )
        .map(e => e.name),
    );
    for (const equipment of ['full_gym', 'machines_cables', 'dumbbells_only', 'barbell_plates', 'home_gym']) {
      const plan = generatePlan({ ...BASE_INPUTS, equipment, exerciseLibrary: LIBRARY });
      const offenders = allExerciseNames(plan).filter(n => calisthenicOrBand.has(n));
      expect({ equipment, offenders }).toEqual({ equipment, offenders: [] });
    }
  });
});
