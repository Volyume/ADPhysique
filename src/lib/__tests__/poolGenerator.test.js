import {
  deriveParamKey,
  translateSubregion,
  toPoolEntry,
  generatePoolFromLibrary,
  findThinMuscles,
} from '../poolGenerator';
import { deriveExerciseMetadata } from '../exerciseMetadata';
import { generatePlan } from '../planEngine';

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

  // D8 residue fix (2026-07-09): biceps had no SUBREGION_TRANSLATION entry
  // at all, so every biceps exercise fell through to the untagged default
  // above regardless of what seedExercises.js's SUBREGION_MAP said. Now that
  // both exist, the pass-through must actually carry the real tag through,
  // not just fall back to the default.
  test('passes real biceps tags through unchanged (long_head/short_head/brachialis)', () => {
    expect(translateSubregion('biceps', 'long_head')).toBe('long_head');
    expect(translateSubregion('biceps', 'short_head')).toBe('short_head');
    expect(translateSubregion('biceps', 'brachialis')).toBe('brachialis');
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

// Shared by the two "real seed library" describe blocks below (pool
// coverage, and the biceps weak-point generator test), so the library is
// parsed from source once and both blocks reason about the exact same
// derivation the seed itself uses.
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

// Integration: build the pool from the REAL seed library (derived the same
// way the seed does) and assert it covers every muscle planEngine programs,
// with the subregions SUBREGION_REQUIREMENTS needs actually present. This is
// the guard that the generated pool is a viable replacement, not just a
// shape match.
describe('generated pool over the real seed library', () => {
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
      // D8 residue fix (2026-07-09): biceps now carries real tags in
      // seedExercises.js and a live SUBREGION_TRANSLATION.biceps entry, so
      // this is finally provable the same way as every other muscle above.
      biceps: ['long_head', 'short_head'],
    };
    const missing = [];
    for (const [muscle, subs] of Object.entries(REQUIRED)) {
      const present = new Set((pool[muscle] ?? []).map(e => e.sub));
      for (const s of subs) if (!present.has(s)) missing.push(`${muscle}/${s}`);
    }
    expect(missing).toEqual([]);
  });

  // ── D8 residue fix (2026-07-09): biceps subregion tag completeness ────────
  test('every seeded biceps exercise carries an explicit subregion tag (no untagged fall-through)', () => {
    const bicepsRows = parseLibrary().filter(ex => ex.primaryMuscle === 'biceps');
    expect(bicepsRows.length).toBeGreaterThan(30); // sanity: we actually found the real library
    const untagged = bicepsRows.filter(ex => !ex.subregion).map(ex => ex.name);
    expect(untagged).toEqual([]);
  });

  test('the tagged biceps subregions are only the three real POOL angles (long_head/short_head/brachialis)', () => {
    const bicepsRows = parseLibrary().filter(ex => ex.primaryMuscle === 'biceps');
    const VALID = new Set(['long_head', 'short_head', 'brachialis']);
    const invalid = bicepsRows.filter(ex => !VALID.has(ex.subregion)).map(ex => `${ex.name}:${ex.subregion}`);
    expect(invalid).toEqual([]);
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

  // ── D8 / plan-A Option B library expansion (2026-07-09) ──────────────────
  // Verifies the named gaps in docs/exercise-planning-2026-07-09/plan-A-
  // library-expansion.md section 2 are actually closed in the real,
  // generated pool, the same way the plan's own research verified they were
  // holes in the first place (running generatePoolFromLibrary against the
  // live library, not asserting against the raw exercise count).
  describe('library expansion closes the named plan-A section 2 gaps', () => {
    const rawStart = seedSrc.indexOf('const RAW = [');
    const rawEnd = seedSrc.indexOf('\n];', rawStart);
    const rawBody = seedSrc.slice(rawStart, rawEnd);
    const rawExerciseNames = new Set(
      [...rawBody.matchAll(/^\s*\[\s*'([^']+)',/gm)].map(m => m[1]),
    );

    function coverage(muscle, sub) {
      const entries = (pool[muscle] ?? []).filter(e => e.sub === sub);
      const profiles = new Set();
      entries.forEach(e => e.eq.forEach(p => profiles.add(p)));
      return { count: entries.length, profiles };
    }

    test('the library grew to comprehensive scope with no duplicate names', () => {
      expect(rawExerciseNames.size).toBeGreaterThan(540);
    });

    test('section 2.1: the "Bands" filter chip is no longer dead (equipmentCategory band is non-empty)', () => {
      const bandEntries = Object.values(pool).flat().filter(e => e.equipmentCategory === 'band');
      expect(bandEntries.length).toBeGreaterThan(10);
    });

    test('section 2.3: hamstrings hip_extension now has machines_cables and bodyweight options (was 0/0)', () => {
      const cov = coverage('hamstrings', 'hip_extension');
      expect(cov.profiles.has('machines_cables')).toBe(true);
      expect(cov.profiles.has('bodyweight')).toBe(true);
    });

    test('section 2.4: rear_delts face_pull now has a bodyweight option (was 0)', () => {
      const cov = coverage('rear_delts', 'face_pull');
      expect(cov.profiles.has('bodyweight')).toBe(true);
    });

    test('section 2.5: chest incline now has a bodyweight option (was 0)', () => {
      const cov = coverage('chest', 'incline');
      expect(cov.profiles.has('bodyweight')).toBe(true);
    });

    test('section 2.6 related: calves soleus now has barbell_plates and bodyweight options (was 0/0)', () => {
      const cov = coverage('calves', 'soleus');
      expect(cov.profiles.has('barbell_plates')).toBe(true);
      expect(cov.profiles.has('bodyweight')).toBe(true);
    });

    test('section 2.6: front_delts now has a machine-based press (was 0)', () => {
      const machineFrontDelts = (pool.front_delts ?? []).filter(e => e.equipmentCategory === 'machine_selectorised');
      expect(machineFrontDelts.length).toBeGreaterThan(0);
    });

    test('section 2.8: side_delts and rear_delts now have unilateral options (were 0)', () => {
      expect(rawExerciseNames.has('Single-Arm Cable Lateral Raise')).toBe(true);
      expect(rawExerciseNames.has('Single-Arm Cable Rear Delt Fly')).toBe(true);
    });

    // Section 2.2 (back vertical_pull for Dumbbells Only / Barbell & Plates /
    // Home Gym): CLOSED by the founder's D10 ruling
    // (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md §D10),
    // reaffirmed and generalised by D19 (§D19, 2026-07-09, "amend the rule
    // for this case: band exercises may enter a loaded plan ONLY when the
    // user's equipment context has no measurable vertical-pull alternative
    // -- the narrowest possible exception, test-pinned"). Band Lat Pulldown
    // and Band Assisted Pull-Up are the named exception to the "bands never
    // reach a loaded plan" rule, carved out specifically because these three
    // profiles otherwise have no vertical pull at all. The blanket rule
    // stands for every other band exercise (see exerciseMetadata.test.js and
    // planEngineLibraryPool.test.js's "loaded plans drop bodyweight
    // compounds, weighted calisthenics and bands (except the D10 exception)"
    // and its dedicated D19 sweep test).
    test('section 2.2 / D19: back vertical_pull now reaches Dumbbells Only / Barbell & Plates / Home Gym via the named band exception', () => {
      const cov = coverage('back', 'vertical_pull');
      expect(cov.profiles.has('bodyweight')).toBe(true); // Band Lat Pulldown, Band Assisted Pull-Up, Wide-Grip Pull-Up
      expect(cov.profiles.has('dumbbells_only')).toBe(true);
      expect(cov.profiles.has('barbell_plates')).toBe(true);
      expect(cov.profiles.has('home_gym')).toBe(true);
    });

    // D19 requirement (a): a context WITH a measurable vertical-pull
    // alternative must get NO bands. Full Gym and Machines & Cables already
    // carry real cable lat pulldown variants in the generated pool, so the
    // exception must not fire there -- proving the fork is genuinely
    // conditioned on absence of an alternative, not just "band exercises are
    // now generally allowed into loaded plans".
    test('D19 (a): back vertical_pull for Full Gym / Machines & Cables has a measurable (non-band) alternative and draws no band exception', () => {
      const cov = coverage('back', 'vertical_pull');
      const nonBandFullGym = (pool.back ?? []).filter(
        e => e.sub === 'vertical_pull' && e.eq.includes('full_gym') && e.equipmentCategory !== 'band',
      );
      const nonBandMachinesCables = (pool.back ?? []).filter(
        e => e.sub === 'vertical_pull' && e.eq.includes('machines_cables') && e.equipmentCategory !== 'band',
      );
      expect(nonBandFullGym.length).toBeGreaterThan(0);
      expect(nonBandMachinesCables.length).toBeGreaterThan(0);
      const bandFullGym = (pool.back ?? []).filter(
        e => e.sub === 'vertical_pull' && e.eq.includes('full_gym') && e.equipmentCategory === 'band',
      );
      const bandMachinesCables = (pool.back ?? []).filter(
        e => e.sub === 'vertical_pull' && e.eq.includes('machines_cables') && e.equipmentCategory === 'band',
      );
      expect(bandFullGym).toEqual([]);
      expect(bandMachinesCables).toEqual([]);
      // Sanity: the other three profiles have zero non-band alternative,
      // which is exactly why they draw the exception (section 2.2 above).
      expect(cov.profiles.has('dumbbells_only')).toBe(true);
    });

    // D19 requirement (c), sweep assertion: across the WHOLE generated pool
    // (every muscle, every subregion), no band-category exercise ever
    // carries a loaded-plan profile except the two named vertical_pull
    // exceptions on `back`. This proves the rule stayed narrow -- it did not
    // quietly widen into other movement patterns (rows, presses, curls,
    // squats, hinges, etc. all stay bodyweight-only for bands).
    test('D19 (c) sweep: no muscle/subregion other than back vertical_pull ever gets a band exercise in a loaded profile', () => {
      const LOADED_PROFILES = ['full_gym', 'machines_cables', 'dumbbells_only', 'barbell_plates', 'home_gym'];
      const NAMED_EXCEPTIONS = new Set(['Band Lat Pulldown', 'Band Assisted Pull-Up']);
      const leaks = [];
      for (const muscle of Object.keys(pool)) {
        for (const e of pool[muscle]) {
          if (e.equipmentCategory !== 'band') continue;
          const loadedHits = e.eq.filter(p => LOADED_PROFILES.includes(p));
          if (loadedHits.length === 0) continue;
          const isAllowed = NAMED_EXCEPTIONS.has(e.n) && muscle === 'back' && e.sub === 'vertical_pull';
          if (!isAllowed) leaks.push({ muscle, name: e.n, sub: e.sub, loadedHits });
        }
      }
      expect(leaks).toEqual([]);
    });
  });
});

// ── D8 residue fix (2026-07-09): end-to-end proof over generatePlan ────────
// The unit-level tests above prove the tag exists and the translation
// carries it through to the generated pool. This proves the whole chain
// actually binds where it matters: generatePlan(), given the REAL seed
// library and a biceps weak-point request, produces a session whose biceps
// exercises span both required heads (long_head AND short_head) — the exact
// behaviour SUBREGION_REQUIREMENTS.biceps was added in D8 to enforce, which
// could never fire before this fix because the library carried no tags.
describe('generatePlan: biceps weak-point coverage over the real seed library', () => {
  test('a biceps weak-point plan covers both long_head and short_head, not just one angle', () => {
    const library = parseLibrary();
    const pool = generatePoolFromLibrary(library);
    const bicepsSubOf = new Map(pool.biceps.map(e => [e.n, e.sub]));

    // Same shape as the founder's back weak-point reproduction in
    // engine-invariants.test.js, just weak-pointed on Biceps and given the
    // real, derived library instead of the hand-written fallback POOL (so
    // this exercises seedExercises.js's SUBREGION_MAP and poolGenerator's
    // SUBREGION_TRANSLATION.biceps, not the pre-tagged hardcoded POOL that
    // already covered biceps before this fix).
    const plan = generatePlan({
      experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 75,
      equipment: 'full_gym', goal: 'general', phase: 'weak_point',
      weakPoints: ['Biceps'], recoveryRating: 'average',
      nutritionPhase: 'maintain', age: 35, exerciseLibrary: library,
    });

    const subsSeen = new Set();
    for (const workout of plan.workouts) {
      for (const ex of workout.exercises) {
        const sub = bicepsSubOf.get(ex.exerciseName);
        if (sub) subsSeen.add(sub);
      }
    }
    expect(subsSeen.has('long_head')).toBe(true);
    expect(subsSeen.has('short_head')).toBe(true);
  });

  test('deterministic: the same weak-point inputs over the real library always produce the same biceps exercise selection', () => {
    const library = parseLibrary();
    const inputs = {
      experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 75,
      equipment: 'full_gym', goal: 'general', phase: 'weak_point',
      weakPoints: ['Biceps'], recoveryRating: 'average',
      nutritionPhase: 'maintain', age: 35, exerciseLibrary: library,
    };
    const bicepsNames = (plan) => plan.workouts
      .flatMap(w => w.exercises)
      .filter(ex => (generatePoolFromLibrary(library).biceps ?? []).some(e => e.n === ex.exerciseName))
      .map(ex => ex.exerciseName)
      .sort();

    const a = generatePlan({ ...inputs });
    const b = generatePlan({ ...inputs });
    expect(bicepsNames(a)).toEqual(bicepsNames(b));
  });
});
