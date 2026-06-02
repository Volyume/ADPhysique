/**
 * Goal-aware selection, difficulty gating and adductors-as-weak-point
 * (phase 7 step 6c). Drives generatePlan with the real seed library and
 * asserts the new behaviours hold, while coverage is never sacrificed.
 */
import { generatePlan } from '../planEngine';
import { deriveExerciseMetadata } from '../exerciseMetadata';

function realLibrary() {
  const seedSrc = require('fs').readFileSync(
    require('path').join(__dirname, '../seedExercises.js'), 'utf8',
  );
  const start = seedSrc.indexOf('const RAW = [');
  const end = seedSrc.indexOf('\n];', start);
  const body = seedSrc.slice(start, end);
  const smStart = seedSrc.indexOf('const SUBREGION_MAP = {');
  const smEnd = seedSrc.indexOf('\n};', smStart);
  const subMap = {};
  for (const m of seedSrc.slice(smStart, smEnd).matchAll(/'([^']+)':\s*'(\w+)'/g)) subMap[m[1]] = m[2];
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
const BASE = {
  daysPerWeek: 4, sessionLengthMinutes: 60, equipment: 'full_gym',
  goal: 'general', phase: 'lean_gain', weakPoints: [], recoveryRating: 'average',
  nutritionPhase: 'maintain', exerciseLibrary: LIBRARY,
};

function names(plan) {
  return plan.workouts.flatMap(w => w.exercises.map(e => e.exerciseName));
}
function difficultyOf(name) {
  return LIBRARY.find(e => e.name === name)?.difficulty ?? null;
}

describe('difficulty gating for beginners', () => {
  test('a beginner plan contains no advanced (difficulty 3) lifts', () => {
    const plan = generatePlan({ ...BASE, experience: 'beginner' });
    const advanced = names(plan).filter(n => difficultyOf(n) === 3);
    expect(advanced).toEqual([]);
  });

  test('an intermediate plan is allowed advanced lifts (gate is beginner-only)', () => {
    // Not asserting it HAS advanced lifts (selection may not pick any), only
    // that the gate does not apply: the plan still generates fully.
    const plan = generatePlan({ ...BASE, experience: 'intermediate' });
    expect(plan.workouts.length).toBeGreaterThan(0);
    expect(names(plan).length).toBeGreaterThan(0);
  });

  test('gating never starves coverage: a beginner still gets a full plan', () => {
    const plan = generatePlan({ ...BASE, experience: 'beginner' });
    // Every workout has at least one exercise.
    for (const w of plan.workouts) {
      expect(w.exercises.length).toBeGreaterThan(0);
    }
  });
});

describe('assistance/regression gating for non-beginners (athlete suitability)', () => {
  // The library's assisted crutch lifts. A Men's Physique or any intermediate+
  // athlete should never be programmed these.
  const ASSISTED = LIBRARY.filter(e => /\bassisted\b/i.test(e.name)).map(e => e.name);

  test('the library actually contains assisted lifts (guards the test itself)', () => {
    // If this ever empties, the gating tests below would pass vacuously.
    expect(ASSISTED).toEqual(expect.arrayContaining(['Assisted Pull-Up']));
  });

  test('a Men\'s Physique intermediate plan contains no assisted lifts', () => {
    // Invariant guard. With the full library the selector already prefers loaded
    // lifts over the assist, so this also held before the gate; the gate makes
    // it a guarantee under thinner libraries or higher back frequency where the
    // real vertical pulls could otherwise be exhausted across the week.
    const plan = generatePlan({ ...BASE, experience: 'intermediate', goal: 'mens_physique' });
    const found = names(plan).filter(n => ASSISTED.includes(n));
    expect(found).toEqual([]);
  });

  test('an advanced plan contains no assisted lifts, across divisions', () => {
    for (const goal of ['general', 'mens_physique', 'classic_physique', 'bodybuilding', 'bikini']) {
      const plan = generatePlan({ ...BASE, experience: 'advanced', goal });
      const found = names(plan).filter(n => ASSISTED.includes(n));
      expect(found).toEqual([]);
    }
  });

  test('a beginner is not gated from assisted lifts and still gets a full plan', () => {
    // The gate is non-beginner only: a true novice who needs the assist keeps
    // it. We assert the beginner path still generates fully (no over-gating).
    const plan = generatePlan({ ...BASE, experience: 'beginner' });
    for (const w of plan.workouts) expect(w.exercises.length).toBeGreaterThan(0);
  });
});

describe('adductors as a weak point', () => {
  test('selecting Adductors as a weak point programs adductor exercises', () => {
    const adductorNames = new Set(
      LIBRARY.filter(e => e.primaryMuscle === 'adductors').map(e => e.name),
    );
    const plan = generatePlan({
      ...BASE,
      experience: 'intermediate',
      phase: 'weak_point',
      weakPoints: ['Adductors'],
    });
    const picked = names(plan).filter(n => adductorNames.has(n));
    expect(picked.length).toBeGreaterThan(0);
  });

  test('without selecting them, adductors are not force-programmed by default', () => {
    const adductorNames = new Set(
      LIBRARY.filter(e => e.primaryMuscle === 'adductors').map(e => e.name),
    );
    const plan = generatePlan({ ...BASE, experience: 'intermediate' });
    const picked = names(plan).filter(n => adductorNames.has(n));
    // mev 0 means the default weekly target is 0, so none are programmed.
    expect(picked.length).toBe(0);
  });
});

describe('goal bias does not break generation', () => {
  test('strength goal still produces a valid, resolvable plan', () => {
    const plan = generatePlan({ ...BASE, experience: 'intermediate', goal: 'strength_hypertrophy' });
    const libraryNames = new Set(LIBRARY.map(e => e.name));
    expect(plan.workouts.length).toBeGreaterThan(0);
    expect(names(plan).filter(n => !libraryNames.has(n))).toEqual([]);
  });
});
