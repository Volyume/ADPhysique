import {
  deriveEquipmentCategory,
  deriveEquipmentProfiles,
  deriveForce,
  deriveLaterality,
  deriveMachineType,
  deriveMachineOk,
  deriveHomeOk,
  deriveDifficulty,
  deriveExerciseMetadata,
} from '../exerciseMetadata';

describe('deriveEquipmentCategory', () => {
  test('passes through the simple equipment classes', () => {
    expect(deriveEquipmentCategory('Barbell Bench Press', 'barbell')).toBe('barbell');
    expect(deriveEquipmentCategory('Dumbbell Row', 'dumbbell')).toBe('dumbbell');
    expect(deriveEquipmentCategory('Seated Cable Row', 'cable')).toBe('cable');
    expect(deriveEquipmentCategory('Smith Machine Bench Press', 'smith_machine')).toBe('smith');
    expect(deriveEquipmentCategory('Goblet Squat', 'kettlebell')).toBe('kettlebell');
    expect(deriveEquipmentCategory('EZ Bar Curl', 'ez_bar')).toBe('barbell');
    expect(deriveEquipmentCategory('Push-Up', 'bodyweight')).toBe('bodyweight');
  });

  test('splits the machine bucket into selectorised vs plate-loaded', () => {
    expect(deriveEquipmentCategory('Machine Chest Press', 'machine')).toBe('machine_selectorised');
    expect(deriveEquipmentCategory('Hammer Strength Chest Press', 'machine')).toBe('machine_plate_loaded');
    expect(deriveEquipmentCategory('Machine Row (Hammer Strength)', 'machine')).toBe('machine_plate_loaded');
  });

  test('reclassifies landmine moves out of barbell', () => {
    expect(deriveEquipmentCategory('Landmine Press', 'barbell')).toBe('landmine');
    expect(deriveEquipmentCategory('Landmine Row', 'barbell')).toBe('landmine');
  });

  test('reclassifies band moves out of bodyweight', () => {
    expect(deriveEquipmentCategory('Band Lateral Raise', 'bodyweight')).toBe('band');
    expect(deriveEquipmentCategory('Banded Row', 'bodyweight')).toBe('band');
  });

  test('a Hammer Curl is a dumbbell move, not a plate-loaded machine', () => {
    expect(deriveEquipmentCategory('Hammer Curl', 'dumbbell')).toBe('dumbbell');
  });

  test('conditioning implements lumped under machine are not resistance machines', () => {
    expect(deriveEquipmentCategory('Assault Bike', 'machine')).toBe('other');
    expect(deriveEquipmentCategory('Sled Push', 'machine')).toBe('other');
  });
});

describe('deriveEquipmentProfiles', () => {
  test('barbell is valid in full gym and barbell+plates', () => {
    expect(deriveEquipmentProfiles('barbell')).toEqual(['full_gym', 'barbell_plates']);
  });
  test('machines are valid in machines_cables', () => {
    expect(deriveEquipmentProfiles('machine_selectorised')).toContain('machines_cables');
    expect(deriveEquipmentProfiles('machine_plate_loaded')).toContain('machines_cables');
  });
  test('bodyweight compounds stay out of loaded plans', () => {
    // A pull-up, dip or push-up asks a lifter to move their bodyweight, which
    // not everyone can, so it belongs only to the no-equipment profile.
    expect(deriveEquipmentProfiles('bodyweight', 'Pull-Up', 'compound')).toEqual(['bodyweight']);
    expect(deriveEquipmentProfiles('bodyweight', 'Push-Up', 'compound')).toEqual(['bodyweight']);
  });
  test('bodyweight isolation staples belong in every plan', () => {
    // Crunches, hanging leg raises and planks are gym staples anyone can do,
    // so they stay available in loaded plans, not just the bodyweight one.
    const hlr = deriveEquipmentProfiles('bodyweight', 'Hanging Leg Raise', 'isolation');
    expect(hlr).toContain('full_gym');
    expect(hlr).toContain('machines_cables');
  });
  test('weighted calisthenics earn no generated-plan slot', () => {
    // A weighted pull-up or dip assumes the unloaded version first, so it is
    // kept out of every generated plan (still hand-pickable in the library).
    expect(deriveEquipmentProfiles('bodyweight', 'Weighted Pull-Up', 'compound')).toEqual([]);
    expect(deriveEquipmentProfiles('bodyweight', 'Weighted Dips (Chest)', 'compound')).toEqual([]);
  });
  test('bands never reach a loaded plan (except the two D10-named exceptions)', () => {
    expect(deriveEquipmentProfiles('band', 'Band Curl', 'isolation')).toEqual(['bodyweight']);
    expect(deriveEquipmentProfiles('band', 'Band Lateral Raise', 'isolation')).toEqual(['bodyweight']);
    expect(deriveEquipmentProfiles('band', 'Banded Row', 'isolation')).toEqual(['bodyweight']);
  });
  // D10 (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md §D10),
  // reaffirmed/generalised by D19 (§D19, 2026-07-09): Band Lat Pulldown and
  // Band Assisted Pull-Up are the ONE named exception to the rule above,
  // because Dumbbells Only / Barbell & Plates / Home Gym otherwise have no
  // vertical pull at all. Every other band exercise (all remaining rows in
  // the seed) must still assert the blanket rule above.
  test('D10/D19 exception: Band Lat Pulldown and Band Assisted Pull-Up reach Dumbbells Only / Barbell & Plates / Home Gym', () => {
    expect(deriveEquipmentProfiles('band', 'Band Lat Pulldown', 'compound')).toEqual(
      ['bodyweight', 'dumbbells_only', 'barbell_plates', 'home_gym'],
    );
    expect(deriveEquipmentProfiles('band', 'Band Assisted Pull-Up', 'compound')).toEqual(
      ['bodyweight', 'dumbbells_only', 'barbell_plates', 'home_gym'],
    );
  });
  // D19 (§D19, 2026-07-09): the exception is scoped to contexts with NO
  // measurable vertical-pull alternative. Full Gym and Machines & Cables
  // already carry cable lat pulldown variants (verified live against the
  // real pool in poolGenerator.test.js), so the same two named exercises
  // must NOT reach those profiles even though they are otherwise "loaded"
  // plans — this is the "context WITH a measurable alternative gets no
  // bands" half of the narrowest-possible-exception ruling.
  test('D19 scoping: the exception excludes Full Gym and Machines & Cables, which already have a measurable vertical pull', () => {
    expect(deriveEquipmentProfiles('band', 'Band Lat Pulldown', 'compound')).not.toContain('full_gym');
    expect(deriveEquipmentProfiles('band', 'Band Lat Pulldown', 'compound')).not.toContain('machines_cables');
    expect(deriveEquipmentProfiles('band', 'Band Assisted Pull-Up', 'compound')).not.toContain('full_gym');
    expect(deriveEquipmentProfiles('band', 'Band Assisted Pull-Up', 'compound')).not.toContain('machines_cables');
  });
  test('returns a fresh array each call (no shared mutation)', () => {
    const a = deriveEquipmentProfiles('barbell');
    a.push('mutated');
    expect(deriveEquipmentProfiles('barbell')).toEqual(['full_gym', 'barbell_plates']);
  });
});

describe('deriveForce', () => {
  test('presses and squats push', () => {
    expect(deriveForce('push', 'chest')).toBe('push');
    expect(deriveForce('squat', 'quads')).toBe('push');
  });
  test('pulls and hinges pull', () => {
    expect(deriveForce('pull', 'back')).toBe('pull');
    expect(deriveForce('hinge', 'hamstrings')).toBe('pull');
  });
  test('isolation resolves by muscle', () => {
    expect(deriveForce('isolation', 'biceps')).toBe('pull');
    expect(deriveForce('isolation', 'triceps')).toBe('push');
    expect(deriveForce('isolation', 'side_delts')).toBe('push');
    expect(deriveForce('isolation', 'abs')).toBe('static');
  });
  test('carries and core are static', () => {
    expect(deriveForce('carry', 'forearms')).toBe('static');
    expect(deriveForce('core', 'abs')).toBe('static');
  });
});

describe('deriveLaterality', () => {
  test('detects unilateral patterns by name', () => {
    expect(deriveLaterality('Single-Arm Dumbbell Press')).toBe('unilateral');
    expect(deriveLaterality('Bulgarian Split Squat')).toBe('unilateral');
    expect(deriveLaterality('Walking Lunge')).toBe('unilateral');
    expect(deriveLaterality('Concentration Curl')).toBe('unilateral');
    expect(deriveLaterality('Step-Up (Dumbbell)')).toBe('unilateral');
    expect(deriveLaterality('B-Stance Romanian Deadlift')).toBe('unilateral');
  });
  test('defaults to bilateral', () => {
    expect(deriveLaterality('Barbell Bench Press')).toBe('bilateral');
    expect(deriveLaterality('Back Squat')).toBe('bilateral');
  });
});

describe('deriveMachineType', () => {
  test('set only for resistance machines', () => {
    expect(deriveMachineType('Leg Press', 'machine_selectorised')).toBe('leg_press');
    expect(deriveMachineType('Hammer Strength Chest Press', 'machine_plate_loaded')).toBe('chest_press');
    expect(deriveMachineType('Barbell Bench Press', 'barbell')).toBeNull();
    expect(deriveMachineType('Unmapped Machine', 'machine_selectorised')).toBeNull();
  });
});

describe('deriveMachineOk / deriveHomeOk', () => {
  test('machine_ok tracks the machines_cables profile', () => {
    expect(deriveMachineOk(['full_gym', 'machines_cables'])).toBe(true);
    expect(deriveMachineOk(['full_gym', 'barbell_plates'])).toBe(false);
  });
  test('home_ok tracks home_gym or bodyweight', () => {
    expect(deriveHomeOk(['full_gym', 'home_gym'])).toBe(true);
    expect(deriveHomeOk(['full_gym', 'bodyweight'])).toBe(true);
    expect(deriveHomeOk(['full_gym', 'machines_cables'])).toBe(false);
  });
});

describe('deriveDifficulty', () => {
  test('high-skill moves are advanced', () => {
    expect(deriveDifficulty('Power Clean', 'barbell', 6)).toBe(3);
    expect(deriveDifficulty('Pistol Squat', 'bodyweight', 3)).toBe(3);
    expect(deriveDifficulty('Nordic Hamstring Curl', 'bodyweight', 3)).toBe(3);
  });
  test('simple machine/cable isolation is beginner', () => {
    expect(deriveDifficulty('Leg Extension', 'machine_selectorised', 2)).toBe(1);
    expect(deriveDifficulty('Cable Lateral Raise', 'cable', 1)).toBe(1);
  });
  test('a heavy barbell compound is at least intermediate', () => {
    expect(deriveDifficulty('Barbell Bench Press', 'barbell', 4)).toBe(2);
  });
});

describe('deriveExerciseMetadata (integration)', () => {
  test('derives a full record for a plate-loaded machine', () => {
    const meta = deriveExerciseMetadata({
      name: 'Hammer Strength Chest Press',
      primaryMuscle: 'chest',
      equipment: 'machine',
      movementPattern: 'push',
      compoundIsolation: 'compound',
      fatigueCost: 3,
    });
    expect(meta).toEqual({
      equipmentCategory: 'machine_plate_loaded',
      machineType: 'chest_press',
      force: 'push',
      laterality: 'bilateral',
      difficulty: 1,
      machineOk: true,
      homeOk: false,
      equipmentProfiles: ['full_gym', 'machines_cables'],
    });
  });

  test('derives a full record for a unilateral dumbbell move', () => {
    const meta = deriveExerciseMetadata({
      name: 'Bulgarian Split Squat',
      primaryMuscle: 'quads',
      equipment: 'dumbbell',
      movementPattern: 'squat',
      compoundIsolation: 'compound',
      fatigueCost: 4,
    });
    expect(meta.equipmentCategory).toBe('dumbbell');
    expect(meta.laterality).toBe('unilateral');
    expect(meta.force).toBe('push');
    expect(meta.homeOk).toBe(true);
    expect(meta.machineType).toBeNull();
  });
});

// Coverage: every canonical seed exercise must derive clean, non-null core
// values. This is the guard that catches a new exercise (or an equipment
// typo) that the derivers don't understand.
describe('coverage over the whole seed library', () => {
  // Re-parse RAW the same way the seed does, without touching the DB.
  const seedSrc = require('fs').readFileSync(
    require('path').join(__dirname, '../seedExercises.js'),
    'utf8',
  );

  function parseRaw() {
    const start = seedSrc.indexOf('const RAW = [');
    const end = seedSrc.indexOf('\n];', start);
    const body = seedSrc.slice(start, end);
    const rows = [];
    const re = /\[\s*'([^']+)',\s*'([a-z_]+)',\s*\[([^\]]*)\],\s*'([a-z_]+)',\s*'([a-z_]+)',\s*(true|false),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\s*\]/g;
    let m;
    while ((m = re.exec(body)) !== null) {
      rows.push({
        name: m[1],
        primaryMuscle: m[2],
        equipment: m[4],
        movementPattern: m[5],
        compoundIsolation: m[6] === 'true' ? 'compound' : 'isolation',
        fatigueCost: parseInt(m[9], 10),
      });
    }
    return rows;
  }

  const VALID_CATEGORIES = new Set([
    'barbell', 'dumbbell', 'cable', 'machine_selectorised', 'machine_plate_loaded',
    'smith', 'bodyweight', 'band', 'kettlebell', 'landmine', 'other',
  ]);
  const VALID_PROFILES = new Set([
    'full_gym', 'machines_cables', 'dumbbells_only', 'barbell_plates', 'home_gym', 'bodyweight',
  ]);

  const rows = parseRaw();

  test('the regex actually parsed a realistic number of exercises', () => {
    expect(rows.length).toBeGreaterThan(400);
  });

  test('every exercise derives a valid category, force, laterality, difficulty and profiles', () => {
    const problems = [];
    for (const ex of rows) {
      const meta = deriveExerciseMetadata(ex);
      if (!VALID_CATEGORIES.has(meta.equipmentCategory)) {
        problems.push(`${ex.name}: bad category ${meta.equipmentCategory}`);
      }
      if (!['push', 'pull', 'static'].includes(meta.force)) {
        problems.push(`${ex.name}: bad force ${meta.force}`);
      }
      if (!['bilateral', 'unilateral'].includes(meta.laterality)) {
        problems.push(`${ex.name}: bad laterality ${meta.laterality}`);
      }
      if (![1, 2, 3].includes(meta.difficulty)) {
        problems.push(`${ex.name}: bad difficulty ${meta.difficulty}`);
      }
      // Weighted calisthenics are deliberately profile-less: kept in the
      // library but never auto-selected into a plan. Every other exercise must
      // belong to at least one valid profile.
      const mayBeEmpty = meta.equipmentCategory === 'bodyweight' && /\bweighted\b/i.test(ex.name);
      if (meta.equipmentProfiles.some(p => !VALID_PROFILES.has(p))
          || (!meta.equipmentProfiles.length && !mayBeEmpty)) {
        problems.push(`${ex.name}: bad profiles ${meta.equipmentProfiles.join(',')}`);
      }
    }
    expect(problems).toEqual([]);
  });

  test('every machine-category exercise is machine_ok', () => {
    for (const ex of rows) {
      const meta = deriveExerciseMetadata(ex);
      if (meta.equipmentCategory === 'machine_selectorised' || meta.equipmentCategory === 'machine_plate_loaded') {
        expect(meta.machineOk).toBe(true);
      }
    }
  });
});
