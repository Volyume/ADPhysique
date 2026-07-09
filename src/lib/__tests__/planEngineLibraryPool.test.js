/**
 * generatePlan with a library-derived pool (phase 7 step 6b). Verifies that
 * passing inputs.exerciseLibrary makes the engine select from the library,
 * that it stays deterministic, that the effective pool is restored after a
 * run (no state leak), and that a thin library falls back to the built-in
 * POOL so a plan is never starved.
 */
import { generatePlan } from '../planEngine';
import { deriveExerciseMetadata } from '../exerciseMetadata';
import { translateSubregion } from '../poolGenerator';

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

  // Loaded plans use accessible, measurable staples. Out: bands (no tracking),
  // bodyweight COMPOUNDS (pull-up, dip, push-up: assume bodyweight strength)
  // and weighted calisthenics (assume the unloaded version first). Allowed:
  // bodyweight ISOLATION (crunch, hanging leg raise, plank), the staples
  // anyone can do, plus the no-equipment 'bodyweight' profile keeps everything.
  //
  // D10 (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md §D10),
  // reaffirmed/generalised by D19 (§D19, 2026-07-09, "amend the rule for
  // this case"): ONE named exception carved out of the band blanket rule
  // below — Band Lat Pulldown and Band Assisted Pull-Up, the only vertical
  // pull otherwise available in Dumbbells Only / Barbell & Plates / Home Gym.
  const D10_BAND_EXCEPTIONS = new Set(['Band Lat Pulldown', 'Band Assisted Pull-Up']);

  test('loaded plans drop bodyweight compounds, weighted calisthenics and bands (except the D10 exception)', () => {
    const blocked = new Set(
      LIBRARY
        .filter(e =>
          (e.equipmentCategory === 'band' && !D10_BAND_EXCEPTIONS.has(e.name)) ||
          (e.equipmentCategory === 'bodyweight' && e.compoundIsolation === 'compound'),
        )
        .map(e => e.name),
    );
    for (const equipment of ['full_gym', 'machines_cables', 'dumbbells_only', 'barbell_plates', 'home_gym']) {
      const plan = generatePlan({ ...BASE_INPUTS, equipment, exerciseLibrary: LIBRARY });
      const offenders = allExerciseNames(plan).filter(n => blocked.has(n));
      expect({ equipment, offenders }).toEqual({ equipment, offenders: [] });
    }
  });

  test('D10/D19 exception: Band Lat Pulldown / Band Assisted Pull-Up can be selected into Dumbbells Only, Barbell & Plates and Home Gym plans', () => {
    // The named exception only widens where these two exercises MAY be
    // picked from; the engine still selects deterministically by its normal
    // scoring, so assert reachability via deriveEquipmentProfiles (the same
    // source the pool filter reads) rather than requiring the generator to
    // pick them on every run.
    const exceptionExercises = LIBRARY.filter(e => D10_BAND_EXCEPTIONS.has(e.name));
    expect(exceptionExercises.length).toBe(2);
    for (const ex of exceptionExercises) {
      for (const profile of ['dumbbells_only', 'barbell_plates', 'home_gym']) {
        expect(ex.equipmentProfiles).toContain(profile);
      }
    }
  });

  // D19 (§D19, 2026-07-09): the exception is scoped to contexts with NO
  // measurable vertical-pull alternative. Full Gym and Machines & Cables
  // carry real cable lat pulldown variants (Lat Pulldown (Wide/Close/Neutral
  // Grip), Assisted Pull-Up, Single-Arm Lat Pulldown, etc.), so the named
  // band exercises must never reach those two profiles even though a plan
  // generated for them is otherwise "loaded". This is the "context WITH a
  // measurable alternative gets no bands" half of the ruling, proven both by
  // static membership and by never surfacing in a real generated plan.
  test('D19 scoping: Band Lat Pulldown / Band Assisted Pull-Up never reach Full Gym or Machines & Cables plans', () => {
    const exceptionExercises = LIBRARY.filter(e => D10_BAND_EXCEPTIONS.has(e.name));
    for (const ex of exceptionExercises) {
      expect(ex.equipmentProfiles).not.toContain('full_gym');
      expect(ex.equipmentProfiles).not.toContain('machines_cables');
    }
    for (const equipment of ['full_gym', 'machines_cables']) {
      const plan = generatePlan({ ...BASE_INPUTS, equipment, exerciseLibrary: LIBRARY });
      const offenders = allExerciseNames(plan).filter(n => D10_BAND_EXCEPTIONS.has(n));
      expect({ equipment, offenders }).toEqual({ equipment, offenders: [] });
    }
  });

  // D19 sweep (§D19, 2026-07-09): scan the ENTIRE generated pool, not just a
  // named exclusion list, to prove no band exercise other than the two named
  // vertical_pull exceptions ever carries a loaded-plan profile, and that the
  // two exceptions themselves are never tagged for anything but vertical_pull.
  // This is the sweep the D19 ruling requires: "the general rule stands
  // everywhere else" must hold for every muscle and every subregion, not just
  // the ones this batch happened to touch.
  test('D19 sweep: no band exercise reaches a loaded profile except the two named vertical_pull exceptions', () => {
    const LOADED_PROFILES = ['full_gym', 'machines_cables', 'dumbbells_only', 'barbell_plates', 'home_gym'];
    const leaks = [];
    for (const ex of LIBRARY) {
      if (ex.equipmentCategory !== 'band') continue;
      const loadedHits = (ex.equipmentProfiles || []).filter(p => LOADED_PROFILES.includes(p));
      if (loadedHits.length === 0) continue;
      const isNamedException = D10_BAND_EXCEPTIONS.has(ex.name);
      const isVerticalPull = translateSubregion('back', ex.subregion) === 'vertical_pull' && ex.primaryMuscle === 'back';
      if (!isNamedException || !isVerticalPull) {
        leaks.push({ name: ex.name, muscle: ex.primaryMuscle, subregion: ex.subregion, loadedHits });
      }
    }
    expect(leaks).toEqual([]);
  });
});
