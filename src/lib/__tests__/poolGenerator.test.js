import {
  deriveParamKey,
  translateSubregion,
  toPoolEntry,
  generatePoolFromLibrary,
  findThinMuscles,
} from '../poolGenerator';
import { deriveExerciseMetadata } from '../exerciseMetadata';

describe('deriveParamKey', () => {
  test('isolation always reads isolation regardless of equipment', () => {
    expect(deriveParamKey('cable', 'isolation')).toBe('isolation');
    expect(deriveParamKey('barbell', 'isolation')).toBe('isolation');
  });
  test('barbell and landmine compounds are heavy', () => {
    expect(deriveParamKey('barbell', 'compound')).toBe('heavy_compound');
    expect(deriveParamKey('landmine', 'compound')).toBe('heavy_compound');
  });
  test('machine compounds read machine', () => {
    expect(deriveParamKey('machine_selectorised', 'compound')).toBe('machine');
    expect(deriveParamKey('machine_plate_loaded', 'compound')).toBe('machine');
  });
  test('dumbbell/cable/smith compounds read mod_compound', () => {
    expect(deriveParamKey('dumbbell', 'compound')).toBe('mod_compound');
    expect(deriveParamKey('smith', 'compound')).toBe('mod_compound');
  });
});

describe('translateSubregion', () => {
  test('maps library chest decline to POOL lower', () => {
    expect(translateSubregion('chest', 'decline')).toBe('lower');
    expect(translateSubregion('chest', 'incline')).toBe('incline');
  });
  test('maps triceps pushdown to POOL lateral, keeps overhead', () => {
    expect(translateSubregion('triceps', 'pushdown')).toBe('lateral');
    expect(translateSubregion('triceps', 'overhead')).toBe('overhead');
  });
  test('maps side_delts lateral_raise to POOL side', () => {
    expect(translateSubregion('side_delts', 'lateral_raise')).toBe('side');
  });
  test('untagged exercise falls back to the per-muscle default', () => {
    expect(translateSubregion('quads', null)).toBe('vasti');
    expect(translateSubregion('biceps', undefined)).toBe('short_head');
    expect(translateSubregion('adductors', null)).toBe('adductor');
  });
});

describe('toPoolEntry', () => {
  test('produces the planEngine entry shape', () => {
    const entry = toPoolEntry({
      name: 'Barbell Bench Press',
      primaryMuscle: 'chest',
      subregion: 'flat',
      compoundIsolation: 'compound',
      equipmentCategory: 'barbell',
      equipmentProfiles: ['full_gym', 'barbell_plates'],
      difficulty: 2,
      stimulusToFatigueRatio: 3,
    });
    expect(entry.n).toBe('Barbell Bench Press');
    expect(entry.sub).toBe('flat');
    expect(entry.p).toBe('heavy_compound');
    expect(entry.eq).toEqual(['full_gym', 'barbell_plates']);
  });
  test('parses equipment_profiles when it arrives as a JSON string', () => {
    const entry = toPoolEntry({
      name: 'Machine Chest Press', primaryMuscle: 'chest', subregion: 'flat',
      compoundIsolation: 'compound', equipmentCategory: 'machine_selectorised',
      equipmentProfiles: '["full_gym","machines_cables"]',
    });
    expect(entry.eq).toEqual(['full_gym', 'machines_cables']);
    expect(entry.p).toBe('machine');
  });
});

describe('generatePoolFromLibrary', () => {
  const lib = [
    { name: 'Barbell Bench Press', primaryMuscle: 'chest', subregion: 'flat', compoundIsolation: 'compound', equipmentCategory: 'barbell', equipmentProfiles: ['full_gym', 'barbell_plates'] },
    { name: 'Hip Adduction Machine', primaryMuscle: 'adductors', subregion: null, compoundIsolation: 'isolation', equipmentCategory: 'machine_selectorised', equipmentProfiles: ['full_gym', 'machines_cables'] },
    { name: 'My Custom', primaryMuscle: 'chest', isCustom: 1, equipmentCategory: 'barbell', equipmentProfiles: ['full_gym'] },
    { name: 'Assault Bike', primaryMuscle: 'quads', equipmentCategory: 'other', equipmentProfiles: ['full_gym'] },
    { name: 'No Profile', primaryMuscle: 'chest', equipmentCategory: 'barbell', equipmentProfiles: [] },
  ];

  test('groups canonical, profiled exercises by primary muscle', () => {
    const pool = generatePoolFromLibrary(lib);
    expect(pool.chest).toHaveLength(1);
    expect(pool.chest[0].n).toBe('Barbell Bench Press');
    expect(pool.adductors).toHaveLength(1);
  });
  test('skips custom, other-category and profile-less exercises', () => {
    const pool = generatePoolFromLibrary(lib);
    const allNames = Object.values(pool).flat().map(e => e.n);
    expect(allNames).not.toContain('My Custom');
    expect(allNames).not.toContain('Assault Bike');
    expect(allNames).not.toContain('No Profile');
  });
  test('empty / null input yields an empty pool', () => {
    expect(generatePoolFromLibrary([])).toEqual({});
    expect(generatePoolFromLibrary(null)).toEqual({});
  });
});

describe('findThinMuscles', () => {
  test('flags muscles below the per-muscle minimum', () => {
    const pool = { chest: [1, 2, 3], back: [1] };
    expect(findThinMuscles(pool, ['chest', 'back', 'quads'], 3)).toEqual(['back', 'quads']);
  });
});

// Integration: build the pool from the REAL seed library (derived the same
// way the seed does) and assert it covers every muscle planEngine programs,
// with the subregions SUBREGION_REQUIREMENTS needs actually present. This is
// the guard that the generated pool is a viable replacement, not just a
// shape match.
describe('generated pool over the real seed library', () => {
  const seedSrc = require('fs').readFileSync(
    require('path').join(__dirname, '../seedExercises.js'), 'utf8',
  );
  function parseLibrary() {
    const start = seedSrc.indexOf('const RAW = [');
    const end = seedSrc.indexOf('\n];', start);
    const body = seedSrc.slice(start, end);
    // Pull the SUBREGION_MAP too so subregions match what the seed writes.
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
        name: m[1],
        primaryMuscle: m[2],
        equipment: m[4],
        movementPattern: m[5],
        compoundIsolation: m[6] === 'true' ? 'compound' : 'isolation',
        fatigueCost: parseInt(m[9], 10),
        stimulusToFatigueRatio: parseInt(m[10], 10),
        subregion: subMap[m[1]] ?? null,
      };
      rows.push({ ...base, ...deriveExerciseMetadata(base) });
    }
    return rows;
  }

  const pool = generatePoolFromLibrary(parseLibrary());

  // The muscles planEngine builds plans around.
  const PROGRAMMED_MUSCLES = [
    'chest', 'back', 'side_delts', 'rear_delts', 'front_delts', 'biceps',
    'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'traps',
  ];

  test('every programmed muscle has a healthy number of options', () => {
    expect(findThinMuscles(pool, PROGRAMMED_MUSCLES, 3)).toEqual([]);
  });

  test('adductors now has exercises (added in step 5)', () => {
    expect((pool.adductors?.length ?? 0)).toBeGreaterThanOrEqual(3);
  });

  test('the subregions SUBREGION_REQUIREMENTS needs are present in the pool', () => {
    const REQUIRED = {
      back: ['vertical_pull', 'horizontal_row'],
      hamstrings: ['hip_extension', 'knee_flexion'],
      chest: ['incline', 'flat'],
      rear_delts: ['face_pull', 'horiz_abduction'],
      triceps: ['overhead'],
      calves: ['gastro', 'soleus'],
      abs: ['flexion', 'anti_extension'],
    };
    const missing = [];
    for (const [muscle, subs] of Object.entries(REQUIRED)) {
      const present = new Set((pool[muscle] ?? []).map(e => e.sub));
      for (const s of subs) if (!present.has(s)) missing.push(`${muscle}/${s}`);
    }
    expect(missing).toEqual([]);
  });

  test('every generated entry has a valid paramKey and at least one equipment profile', () => {
    const VALID_P = new Set(['heavy_compound', 'mod_compound', 'machine', 'isolation']);
    for (const entries of Object.values(pool)) {
      for (const e of entries) {
        expect(VALID_P.has(e.p)).toBe(true);
        expect(e.eq.length).toBeGreaterThan(0);
      }
    }
  });
});
