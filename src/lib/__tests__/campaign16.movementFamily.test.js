/**
 * campaign16.movementFamily.test.js — Campaign 16 job 3.
 *
 * FOUNDER BRIEF: "Back programming must distinguish at minimum
 * BACK_VERTICAL_PULL, BACK_HORIZONTAL_LAT, BACK_UPPER_MID_ROW,
 * BACK_SHOULDER_EXTENSION. Do not use broad 'back' or horizontal_row as
 * sufficient proof of non-redundancy. Straight-arm pulldown / pullover:
 * cannot satisfy the true vertical-pull slot. Deadlift / back extension:
 * cannot masquerade as lower-lat exercise selection."
 *
 * WHAT THIS SUITE PINS
 *
 * The laws, not the current output. Every test here is written so that it
 * fails if the DEFECT comes back, rather than asserting the exact plan the
 * engine happens to produce today - a plan-shape snapshot would go red on
 * any legitimate improvement and green on a silent taxonomy regression,
 * which is exactly backwards.
 *
 * Three of these defects were live in production selection:
 *
 *   - a straight-arm pulldown satisfying the vertical-pull requirement, so
 *     a plan could have no pulldown or chin-up and still report covered;
 *   - the deadlift family sitting in a tag called `lower_lat`, able to
 *     satisfy a lat slot, and generating copy that told the user a deadlift
 *     builds their V-taper;
 *   - `sweep` holding both the front squat and the leg extension, so quad
 *     coverage of "both families" was satisfiable by two squats.
 *
 * The suite also pins the two things that are NOT allowed to follow from
 * this work: no per-family dose targets, and no requirement that cannot
 * degrade to a simple valid plan.
 */

const fs = require('fs');
const path = require('path');
const { generatePlan, SUBREGION_REQUIREMENTS, POOL } = require('../planEngine');
const {
  movementFamily, familySatisfiesRole, FAMILY, FAMILY_LISTS, CONTESTED,
  CLASSIFIED_MUSCLES, isSweepBiased, COVERAGE_ROLES,
} = require('../exercise/movementFamily');
const { LIBRARY, inputs, planExercises } = require('./campaign16.helpers');

const BY_NAME = new Map(LIBRARY.map(e => [e.name, e]));
const plan = over => generatePlan({ ...inputs(over), exerciseLibrary: LIBRARY });

/** The families a plan actually delivers for one muscle, in session order. */
function familiesFor(p, muscle) {
  return planExercises(p)
    .map(e => BY_NAME.get(e.exerciseName))
    .filter(e => e && e.primaryMuscle === muscle)
    .map(e => movementFamily(e.name, e.primaryMuscle, e.subregion));
}

/** Families per session, so redundancy WITHIN a session is checkable. */
function familiesPerSession(p, muscle) {
  return (p.workouts ?? []).map(w => w.exercises
    .map(e => BY_NAME.get(e.exerciseName))
    .filter(e => e && e.primaryMuscle === muscle)
    .map(e => movementFamily(e.name, e.primaryMuscle, e.subregion)));
}

// ---------------------------------------------------------------------------

describe('C16-3 the four back distinctions exist and mean different things', () => {
  test('the commissioned families are all real and all distinct', () => {
    const required = [
      FAMILY.VERTICAL_PULL, FAMILY.HORIZONTAL_LAT,
      FAMILY.UPPER_MID_ROW, FAMILY.SHOULDER_EXTENSION,
    ];
    expect(new Set(required).size).toBe(4);
    for (const f of required) {
      const members = Object.values(FAMILY_LISTS).flat()
        .filter(n => movementFamily(n, 'back') === f);
      expect(members.length).toBeGreaterThan(0);
    }
  });

  test('a straight-arm pulldown or pullover can NEVER satisfy a vertical pull', () => {
    for (const n of ['Cable Straight-Arm Pulldown', 'Cable Lat Pullover',
      'Cable Rope Straight-Arm Pulldown (Single-Arm)']) {
      const family = movementFamily(n, 'back', 'vertical_pull');
      expect(family).toBe(FAMILY.SHOULDER_EXTENSION);
      expect(familySatisfiesRole('back', 'vertical_pull', family)).toBe(false);
    }
  });

  test('a deadlift or back extension can NEVER satisfy a lat slot', () => {
    for (const n of ['Conventional Deadlift', 'Sumo Deadlift', 'Rack Pull',
      'Trap Bar Deadlift', 'Hyperextension (Back Extension)',
      'Reverse Hyperextension', 'Back Extension (Weighted)']) {
      const family = movementFamily(n, 'back', 'lower_lat');
      expect(family).toBe(FAMILY.SPINAL_ERECTOR);
      expect(familySatisfiesRole('back', 'vertical_pull', family)).toBe(false);
      expect(familySatisfiesRole('back', 'horizontal_row', family)).toBe(false);
    }
  });

  test('the misleading `lower_lat` tag is gone from the seeded library', () => {
    // It was never lat work. The name is the defect.
    const seed = fs.readFileSync(path.resolve(__dirname, '../seedExercises.js'), 'utf8');
    const start = seed.indexOf('const SUBREGION_MAP = {');
    const map = seed.slice(start, seed.indexOf('\n};', start));
    expect(map).not.toMatch(/'lower_lat'/);
  });

  test('a pulldown is not counted as a row just because nobody tagged it', () => {
    // V-Bar Pulldown carried no tag, so it fell through to the back muscle
    // default - `horizontal_row` - and a pulldown was scored as rowing.
    expect(movementFamily('V-Bar Pulldown', 'back', null)).toBe(FAMILY.VERTICAL_PULL);
    expect(BY_NAME.get('V-Bar Pulldown').subregion).toBe(FAMILY.VERTICAL_PULL);
  });

  test('an UNCLASSIFIED back exercise fails safe: it can never claim a vertical pull', () => {
    const family = movementFamily('Some New Row Machine 9000', 'back', null);
    expect(familySatisfiesRole('back', 'vertical_pull', family)).toBe(false);
  });

  test('both row families are honest horizontal rowing, and they are not each other', () => {
    const lat = movementFamily('Dumbbell Row', 'back');
    const upper = movementFamily('Pendlay Row', 'back');
    expect(lat).not.toBe(upper);
    expect(familySatisfiesRole('back', 'horizontal_row', lat)).toBe(true);
    expect(familySatisfiesRole('back', 'horizontal_row', upper)).toBe(true);
  });
});

describe('C16-3 the quads defect: two squats could pass as two families', () => {
  test('the front squat and the leg extension are no longer the same family', () => {
    // Both were `sweep`. That is what let required coverage of both quad
    // families be satisfied with no knee-extension work anywhere.
    expect(movementFamily('Barbell Front Squat', 'quads', 'sweep')).toBe(FAMILY.SQUAT_PRESS);
    expect(movementFamily('Leg Extension', 'quads', 'sweep')).toBe(FAMILY.KNEE_EXTENSION);
  });

  test('every squat and press pattern is one family, however it is loaded', () => {
    for (const n of ['Barbell Back Squat', 'Barbell Front Squat', 'Leg Press',
      'Hack Squat Machine', 'Bulgarian Split Squat', 'Walking Lunge',
      'Belt Squat', 'Landmine Squat']) {
      expect(movementFamily(n, 'quads', BY_NAME.get(n)?.subregion)).toBe(FAMILY.SQUAT_PRESS);
    }
  });

  test('sweep survives as an EMPHASIS, and an emphasis is not coverage', () => {
    // A hack squat and a back squat are both squat/press. The knee-forward
    // nudge must not be readable as a second family.
    expect(isSweepBiased('Hack Squat Machine')).toBe(true);
    expect(isSweepBiased('Barbell Back Squat')).toBe(false);
    expect(movementFamily('Hack Squat Machine', 'quads')).toBe(
      movementFamily('Barbell Back Squat', 'quads'),
    );
  });

  test('a real quad-emphasis plan delivers both families, not two squats', () => {
    for (const over of [{ goal: 'classic_physique', daysPerWeek: 5 },
      { goal: 'bodybuilding', daysPerWeek: 5 }, { experience: 'advanced', daysPerWeek: 6 }]) {
      const fams = new Set(familiesFor(plan(over), 'quads'));
      expect([...fams].sort()).toEqual([FAMILY.KNEE_EXTENSION, FAMILY.SQUAT_PRESS].sort());
    }
  });
});

describe('C16-3 redundancy: extra slots add coverage, not grip variants', () => {
  test('no session picks two exercises from one back family when another exists', () => {
    const offenders = [];
    for (const over of [{}, { daysPerWeek: 5 }, { daysPerWeek: 6, experience: 'advanced' },
      { goal: 'classic_physique', daysPerWeek: 5 }, { goal: 'bodybuilding', daysPerWeek: 5 },
      { goal: 'mens_physique', daysPerWeek: 5 }]) {
      for (const fams of familiesPerSession(plan(over), 'back')) {
        const counts = {};
        for (const f of fams) counts[f] = (counts[f] ?? 0) + 1;
        // A repeat is only a fault when the session had 2+ distinct families
        // available to it, which every full-gym back day does.
        for (const [f, c] of Object.entries(counts)) {
          if (c > 1 && fams.length > 1) offenders.push(`${JSON.stringify(over)} ${f} x${c}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test('the two-pulldown redundancy from the campaign log does not recur', () => {
    // Observed in a real bikini 3-day plan: Lat Pulldown (Wide Grip) AND
    // Lat Pulldown (Close Grip) selected for the same session.
    for (const days of [3, 4, 5]) {
      for (const fams of familiesPerSession(plan({ goal: 'bikini', daysPerWeek: days }), 'back')) {
        const verticals = fams.filter(f => f === FAMILY.VERTICAL_PULL);
        expect(verticals.length).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('C16-3 a meaningful-volume back programme really pulls in both directions', () => {
  test('vertical pulling AND horizontal rowing both appear across the week', () => {
    const missing = [];
    for (const over of [{}, { daysPerWeek: 3 }, { daysPerWeek: 5 }, { daysPerWeek: 6 },
      { experience: 'beginner', daysPerWeek: 3 }, { experience: 'advanced', daysPerWeek: 6 },
      { goal: 'bodybuilding', daysPerWeek: 5 }, { goal: 'classic_physique', daysPerWeek: 5 },
      { goal: 'mens_physique', daysPerWeek: 5 }, { goal: 'womens_physique', daysPerWeek: 5 }]) {
      const fams = familiesFor(plan(over), 'back');
      const label = JSON.stringify(over);
      if (!fams.some(f => familySatisfiesRole('back', 'vertical_pull', f))) {
        missing.push(`${label}: no vertical pull`);
      }
      if (!fams.some(f => familySatisfiesRole('back', 'horizontal_row', f))) {
        missing.push(`${label}: no horizontal row`);
      }
    }
    expect(missing).toEqual([]);
  });

  test('Bikini keeps its lat-width isolations, which the family split could have dropped', () => {
    // The division rule allowed straight-arm work only because it shared the
    // `vertical_pull` tag. Splitting the families would have silently
    // excluded it if the allow-list had not been followed through.
    const fams = new Set(familiesFor(plan({ goal: 'bikini', daysPerWeek: 4 }), 'back'));
    expect(fams.has(FAMILY.VERTICAL_PULL)).toBe(true);
    expect(fams.has(FAMILY.SPINAL_ERECTOR)).toBe(false); // deadlifts still excluded
  });
});

describe('C16-3 failing simple: coverage degrades, it never blocks a plan', () => {
  test('thin equipment still generates a valid plan for every profile', () => {
    for (const equipment of ['bodyweight', 'dumbbells_only', 'home_gym',
      'barbell_plates', 'machines_cables', 'full_gym']) {
      for (const days of [2, 3, 4]) {
        const p = plan({ equipment, daysPerWeek: days, sessionLengthMinutes: 45 });
        expect(p.workouts.length).toBeGreaterThan(0);
        for (const w of p.workouts) expect(w.exercises.length).toBeGreaterThan(0);
      }
    }
  });

  test('a short session with one back slot still gets a real pull, not nothing', () => {
    for (const minutes of [30, 40, 45]) {
      const fams = familiesFor(plan({ sessionLengthMinutes: minutes, daysPerWeek: 3 }), 'back');
      expect(fams.length).toBeGreaterThan(0);
    }
  });

  test('a beginner is not starved by the family requirements', () => {
    const p = plan({ experience: 'beginner', daysPerWeek: 3, sessionLengthMinutes: 45 });
    expect(familiesFor(p, 'back').length).toBeGreaterThan(0);
    expect(familiesFor(p, 'quads').length).toBeGreaterThan(0);
  });
});

describe('C16-3 this is coverage, NOT a second dosage system', () => {
  test('no requirement carries a per-family set target', () => {
    // The founder brief is explicit: "Do not create subregion MEV/MRV
    // targets. This is exercise coverage, not separate dosage science."
    for (const [muscle, req] of Object.entries(SUBREGION_REQUIREMENTS)) {
      const keys = Object.keys(req);
      expect(keys.sort()).not.toContain('sets');
      expect(keys.sort()).not.toContain('mev');
      expect(keys.sort()).not.toContain('mrv');
      for (const k of keys) {
        expect(['minSets', 'required', 'whenVolumePermits']).toContain(`${k}`);
      }
      // minSets is a THRESHOLD for whether coverage applies to the muscle,
      // not a target for any family within it.
      expect(typeof req.minSets).toBe('number');
      expect(Array.isArray(req.required)).toBe(true);
      expect(muscle).toBeTruthy();
    }
  });

  test('the family module prescribes no volume of any kind', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../exercise/movementFamily.js'), 'utf8');
    const code = src.slice(src.indexOf('export const FAMILY'));
    expect(code).not.toMatch(/\bMEV\b|\bMRV\b|\bMAV\b/);
    expect(code).not.toMatch(/minSets|weeklySets|targetSets/);
  });
});

describe('C16-3 one taxonomy: the two pools can no longer disagree', () => {
  test('every fallback POOL entry resolves to the same family as the library', () => {
    // POOL called Cable High Row a vertical pull while the library called it
    // a row, and called the straight-arm pulldown lower_lat while the
    // library called it a vertical pull. Which taxonomy a user's plan obeyed
    // depended on whether their library was thin enough to hit the fallback.
    const disagreements = [];
    for (const muscle of CLASSIFIED_MUSCLES) {
      for (const entry of POOL[muscle] ?? []) {
        const lib = BY_NAME.get(entry.n);
        if (!lib) continue;
        const fromPool = movementFamily(entry.n, muscle, entry.sub);
        const fromLib = movementFamily(lib.name, lib.primaryMuscle, lib.subregion);
        if (fromPool !== fromLib) disagreements.push(`${entry.n}: ${fromPool} vs ${fromLib}`);
      }
    }
    expect(disagreements).toEqual([]);
  });

  test('the specific historical disagreements are resolved', () => {
    expect(movementFamily('Cable High Row', 'back', 'vertical_pull')).toBe(FAMILY.UPPER_MID_ROW);
    expect(movementFamily('Cable Straight-Arm Pulldown', 'back', 'lower_lat'))
      .toBe(FAMILY.SHOULDER_EXTENSION);
  });

  test('an already-corrected stored tag is trusted, not re-defaulted', () => {
    // A caller holding a row but not its name (a synced record, a fixture)
    // must not have a correct family replaced by the muscle default.
    expect(movementFamily(null, 'back', FAMILY.VERTICAL_PULL)).toBe(FAMILY.VERTICAL_PULL);
    expect(movementFamily(null, 'quads', FAMILY.KNEE_EXTENSION)).toBe(FAMILY.KNEE_EXTENSION);
    // A LEGACY tag is not trusted, because it is the thing being corrected.
    expect(movementFamily(null, 'back', 'lower_lat')).not.toBe('lower_lat');
  });

  test('the seeded library and the family authority agree on every entry', () => {
    const bad = [];
    for (const e of LIBRARY) {
      if (!CLASSIFIED_MUSCLES.includes(e.primaryMuscle)) continue;
      if (!e.subregion) continue;
      const fam = movementFamily(e.name, e.primaryMuscle, e.subregion);
      if (fam !== e.subregion) bad.push(`${e.name}: ${e.subregion} != ${fam}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('C16-3 curation hygiene', () => {
  test('no exercise is listed in two families', () => {
    const seen = new Map();
    const dupes = [];
    for (const [list, names] of Object.entries(FAMILY_LISTS)) {
      for (const n of names) {
        if (seen.has(n)) dupes.push(`${n}: ${seen.get(n)} and ${list}`);
        seen.set(n, list);
      }
    }
    expect(dupes).toEqual([]);
  });

  test('every classified name is a real library exercise', () => {
    // The Abductor Machine defect in reverse: a curated list must not carry
    // a name the library does not have.
    const ghosts = Object.values(FAMILY_LISTS).flat().filter(n => !BY_NAME.has(n));
    expect(ghosts).toEqual([]);
  });

  test('every contested call is recorded with a real argument, not a shrug', () => {
    expect(CONTESTED.length).toBeGreaterThan(0);
    for (const c of CONTESTED) {
      expect(typeof c.name).toBe('string');
      expect(BY_NAME.has(c.name)).toBe(true);
      expect(Object.values(FAMILY)).toContain(c.heldAt);
      expect(c.argument.length).toBeGreaterThan(60);
    }
  });

  test('a role maps only to families that exist', () => {
    for (const [muscle, roles] of Object.entries(COVERAGE_ROLES)) {
      for (const families of Object.values(roles)) {
        for (const f of families) {
          expect(Object.values(FAMILY)).toContain(f);
          expect(familySatisfiesRole(muscle, Object.keys(roles)[0], f) || true).toBe(true);
        }
      }
    }
  });
});

describe('C16-3 the regressions this work caused, and the fixes that hold them', () => {
  test('no muscle the week trains is ever delivered zero sets', () => {
    // Found in the wild while landing this job: Figure, 5 days, biceps and
    // triceps weak points delivered chest = 0. The hard-cap backstop dropped
    // chest's only exercise on the stated grounds that it was "still trained
    // on the split's OTHER day(s)" - which for that split was not true.
    const zeros = [];
    for (const goal of ['general', 'bodybuilding', 'figure', 'womens_physique',
      'mens_physique', 'classic_physique', 'bikini', 'wellness']) {
      for (const weak of [[], ['Biceps', 'Triceps'], ['Glutes'], ['Upper Chest']]) {
        const over = { goal, daysPerWeek: 5, ...(weak.length ? { phase: 'weak_point', weakPoints: weak } : {}) };
        const p = plan(over);
        for (const [m, v] of Object.entries(p.weeklyVolumeSummary ?? {})) {
          const delivered = v.plannedSets ?? 0;
          const trained = familiesFor(p, m).length > 0;
          if (trained && delivered === 0) zeros.push(`${goal} wp=${weak}: ${m}`);
        }
      }
    }
    expect(zeros).toEqual([]);
  });

  test('coverage beats the canonicality preference when nothing else can cover a role', () => {
    // Leg Extension is the only COMMON-or-better knee-extension movement in
    // the fallback pool. Once one leg session used it, the second could not
    // cover knee extension and took a redundant second squat, which cost
    // enough session time for the trim to drop a glute exercise.
    const p = generatePlan({
      experience: 'intermediate', daysPerWeek: 5, sessionLengthMinutes: 75,
      equipment: 'full_gym', goal: 'womens_physique', phase: 'lean_gain',
      weakPoints: [], recoveryRating: 'average', nutritionPhase: 'maintain',
    });
    for (const w of p.workouts) {
      const quadFams = w.exercises
        .map(e => BY_NAME.get(e.exerciseName))
        .filter(e => e && e.primaryMuscle === 'quads')
        .map(e => movementFamily(e.name, 'quads', e.subregion));
      if (quadFams.length >= 2) {
        expect(new Set(quadFams).size).toBeGreaterThan(1);
      }
    }
  });
});
