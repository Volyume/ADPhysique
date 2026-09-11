/**
 * quickSession.test.js - D156 (docs/quick-session-equipment-2026-09-11/
 * 10-SPEC.md sections 1-3, plus the lead's shoulders-group ruling and the
 * explainQuickSessionDrops name-membership revision, both 2026-09-11).
 * Written to FAIL against a wrong implementation: pins determinism,
 * purity, the ranking order, the shoulders group's muscle fallback, the
 * inventory boundary, the kettlebell exception, and the drop
 * classification, all against the REAL corpus (never a hand-written
 * stand-in library), plus the remembered-kit storage contract.
 *
 * SHOULDERS IS A GROUP SLOT, NOT A SINGLE MUSCLE. The corpus has no row
 * anywhere - bodyweight, kettlebell or suspension - whose primaryMuscle is
 * "side_delts" (verified: `grep -oP 'primaryMuscle: "[a-z_]+"'
 * src/lib/exerciseCorpus/families/{bodyweight,kettlebell,suspension}.js`,
 * none list side_delts; the bodyweight rows that look like lateral-deltoid
 * work, e.g. "Pike Push-Up" and "Wall Handstand Hold/Push-Up", are tagged
 * primaryMuscle "front_delts" in the corpus, matching real anatomy - a
 * lateral raise needs external resistance). A single fixed side_delts
 * slot left those three kits genuinely unfillable there (flagged as STOP 1
 * in the lane report); the lead's ruling makes the eighth slot an ORDERED
 * group (side_delts, then front_delts, then rear_delts: the first muscle
 * with an eligible candidate for the kit), so every kit now fills all
 * eight - verified below against the real corpus, not asserted.
 */
import { CORPUS, corpusEntryToSeedRow } from '../exerciseCorpus/index.js';
import { isAutoEligible } from '../exercise/canonicality.js';
import { KETTLEBELL_NEVER_AUTO_EXCEPTIONS } from '../exercise/stylePools.js';
import {
  buildQuickSession, explainQuickSessionDrops, QUICK_KIT_KINDS, KIT_PRESETS, QUICK_SESSION_SLOTS,
} from '../quickSession.js';
import fs from 'fs';
import path from 'path';

// Mocked ONLY for the explainQuickSessionDrops unit test below (a
// constructed pair of libraries, per spec section 3) - every other test in
// this file drives buildQuickSession directly and never reaches this lazy
// require at all.
jest.mock('../capability/resolve', () => ({
  capabilityBlockReason: (_state, exercise) => (
    exercise?.name === 'Capability Blocked Exercise' ? 'capability_declared' : null
  ),
}));

// quickSessionKit tests (below, same file per 10-SPEC.md section 3) need
// the real AsyncStorage mock, matching reEntryEaseState.test.js's
// established convention for this exact "AsyncStorage, per-user, never
// throws" shape of module.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));

const AsyncStorage = require('@react-native-async-storage/async-storage').default
  ?? require('@react-native-async-storage/async-storage');
const { readQuickKit, writeQuickKit } = require('../quickSessionKit');

// --- Real-corpus library, mapped the same way the seed maps it -----------
// corpusEntryToSeedRow is the exact function seedExercises.js/the top-up
// call, so this derives equipmentCategory/compoundIsolation/difficulty
// identically to what a device's getAllExercises() rows carry. `id` is not
// produced by corpusEntryToSeedRow (real ids come from canonicalExerciseId
// at seed time) - the generator never reads it for ranking (ranking and
// the cross-slot exclusion are both by NAME, per ruling 4), so the corpus
// name itself is a fine, unique stand-in here.
function toRow(entry) {
  return { id: entry.name, ...corpusEntryToSeedRow(entry) };
}
const LIBRARY = CORPUS.map(toRow);

const ALL_KIND_IDS = QUICK_KIT_KINDS.map((k) => k.id);

// The verified, real-corpus outcome for every kit this screen can produce
// (empty/first-use, each single kind, full gym): the shoulders group's
// fallback means all eight slots fill for every one of them.
const KIT_SCENARIOS = [
  { label: 'empty (bodyweight only)', kit: [], expectedUnfilled: [] },
  { label: 'dumbbells only', kit: ['dumbbells'], expectedUnfilled: [] },
  { label: 'kettlebells only', kit: ['kettlebells'], expectedUnfilled: [] },
  { label: 'bands only', kit: ['bands'], expectedUnfilled: [] },
  { label: 'barbell and plates only', kit: ['barbell'], expectedUnfilled: [] },
  { label: 'cables and machines only', kit: ['cables_machines'], expectedUnfilled: [] },
  { label: 'suspension trainer only', kit: ['suspension'], expectedUnfilled: [] },
  { label: 'full gym', kit: ALL_KIND_IDS, expectedUnfilled: [] },
];

// Which muscle the shoulders group is verified to resolve to for each kit
// (see the diagnostic dump in the lane report) - side_delts wherever it has
// a candidate, front_delts otherwise. Used by the shoulders-specific tests
// below so each one states its expectation rather than re-deriving it.
const EXPECTED_SHOULDER_MUSCLE = {
  'empty (bodyweight only)': 'front_delts',
  'dumbbells only': 'side_delts',
  'kettlebells only': 'front_delts',
  'bands only': 'side_delts',
  'barbell and plates only': 'side_delts',
  'cables and machines only': 'side_delts',
  'suspension trainer only': 'front_delts',
  'full gym': 'side_delts',
};

describe('buildQuickSession: determinism and purity', () => {
  test('two runs over the same input deep-equal, and the output serialises stably', () => {
    const libraryCopy = JSON.parse(JSON.stringify(LIBRARY));
    const r1 = buildQuickSession({ library: LIBRARY, kit: ['dumbbells', 'kettlebells'] });
    const r2 = buildQuickSession({ library: libraryCopy, kit: ['dumbbells', 'kettlebells'] });
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
    // And running it a third time changes nothing about the SOURCE library
    // (no in-place mutation leaking between calls).
    expect(LIBRARY).toEqual(libraryCopy);
  });

  test('source carries no Math.random or Date.now (pure, no I/O)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'quickSession.js'), 'utf8');
    expect(src).not.toMatch(/Math\.random/);
    expect(src).not.toMatch(/Date\.now/);
  });
});

describe('buildQuickSession: slot coverage across every kit (real corpus)', () => {
  test.each(KIT_SCENARIOS)('$label: unfilled matches the verified real-corpus outcome (all eight fill)', ({ kit, expectedUnfilled }) => {
    const { items, unfilled } = buildQuickSession({ library: LIBRARY, kit });
    expect(unfilled).toEqual(expectedUnfilled);
    expect(items.length).toBe(QUICK_SESSION_SLOTS.length - expectedUnfilled.length);
  });

  test.each(Object.entries(EXPECTED_SHOULDER_MUSCLE))('%s: the shoulders slot resolves to the verified muscle, slotKey stays "shoulders"', (label, expectedMuscle) => {
    const scenario = KIT_SCENARIOS.find((s) => s.label === label);
    const { items } = buildQuickSession({ library: LIBRARY, kit: scenario.kit });
    const shoulders = items.find((i) => i.slotKey === 'shoulders');
    expect(shoulders).toBeDefined();
    expect(shoulders.slot).toBe(expectedMuscle);
    expect(shoulders.exercise.primaryMuscle).toBe(expectedMuscle);
  });

  test('every non-group slot keeps slotKey identical to slot', () => {
    for (const { kit } of KIT_SCENARIOS) {
      const { items } = buildQuickSession({ library: LIBRARY, kit });
      for (const item of items) {
        if (item.slotKey === 'shoulders') continue;
        expect(item.slotKey).toBe(item.slot);
      }
    }
  });
});

describe('buildQuickSession: Kettlebells only (F-16 shoulder case)', () => {
  test('at least one kettlebell row appears', () => {
    const { items } = buildQuickSession({ library: LIBRARY, kit: ['kettlebells'] });
    expect(items.some((i) => i.exercise.equipmentCategory === 'kettlebell')).toBe(true);
  });

  // Lead ruling 2026-09-11: shoulders is now a group (side_delts, then
  // front_delts, then rear_delts). side_delts has zero kettlebell or
  // bodyweight candidates (see the header comment), so the group falls
  // through to front_delts, where the corpus DOES have kettlebell rows -
  // the shoulders slot fills, and every other slot fills too.
  test('the shoulders slot is filled (via front_delts); all eight slots fill', () => {
    const { items, unfilled } = buildQuickSession({ library: LIBRARY, kit: ['kettlebells'] });
    expect(unfilled).toEqual([]);
    expect(items.length).toBe(8);
    const shoulders = items.find((i) => i.slotKey === 'shoulders');
    expect(shoulders.slot).toBe('front_delts');
  });
});

describe('buildQuickSession: Bands only ("band equals bodyweight")', () => {
  test('at least one band row appears', () => {
    const { items } = buildQuickSession({ library: LIBRARY, kit: ['bands'] });
    expect(items.some((i) => i.exercise.equipmentCategory === 'band')).toBe(true);
  });

  // Lead ruling 2026-09-11: bands DO have a side_delts row (Band Lateral
  // Raise), so the shoulders group must resolve via side_delts - the
  // group's fallback must never pre-empt a muscle that already has a
  // candidate.
  test('Band Lateral Raise still wins the shoulders slot (side_delts exists for bands)', () => {
    const { items } = buildQuickSession({ library: LIBRARY, kit: ['bands'] });
    const shoulders = items.find((i) => i.slotKey === 'shoulders');
    expect(shoulders.slot).toBe('side_delts');
    expect(shoulders.exercise.name).toBe('Band Lateral Raise');
  });
});

describe('buildQuickSession: Barbell and plates only', () => {
  test('at least one barbell row appears', () => {
    const { items } = buildQuickSession({ library: LIBRARY, kit: ['barbell'] });
    expect(items.some((i) => i.exercise.equipmentCategory === 'barbell')).toBe(true);
  });
});

describe('buildQuickSession: inventory is respected', () => {
  test.each(KIT_SCENARIOS)('$label: no chosen category outside kit-categories plus bodyweight', ({ kit }) => {
    const allowed = new Set(['bodyweight']);
    for (const id of kit) {
      const kind = QUICK_KIT_KINDS.find((k) => k.id === id);
      for (const c of kind.categories) allowed.add(c);
    }
    const { items } = buildQuickSession({ library: LIBRARY, kit });
    for (const item of items) {
      expect(allowed.has(item.exercise.equipmentCategory)).toBe(true);
    }
  });
});

describe('buildQuickSession: kit before bodyweight', () => {
  test('quads picks the dumbbell row over the bodyweight row that wins when the kit is empty', () => {
    const withDumbbells = buildQuickSession({ library: LIBRARY, kit: ['dumbbells'] });
    const withNoKit = buildQuickSession({ library: LIBRARY, kit: [] });
    const quadsWithDumbbells = withDumbbells.items.find((i) => i.slot === 'quads');
    const quadsWithNoKit = withNoKit.items.find((i) => i.slot === 'quads');
    expect(quadsWithDumbbells.exercise.equipmentCategory).toBe('dumbbell');
    expect(quadsWithNoKit.exercise.equipmentCategory).toBe('bodyweight');
    expect(quadsWithDumbbells.exercise.name).not.toBe(quadsWithNoKit.exercise.name);
  });

  test('every filled slot across every kit prefers a kit-category row over bodyweight when the kit is non-empty', () => {
    for (const { kit } of KIT_SCENARIOS) {
      if (kit.length === 0) continue;
      const { items } = buildQuickSession({ library: LIBRARY, kit });
      for (const item of items) {
        if (item.exercise.equipmentCategory !== 'bodyweight') continue;
        // A bodyweight winner while the kit is non-empty is only correct
        // when NO kit-category candidate existed for this slot at all.
        const kindCategories = new Set();
        for (const id of kit) {
          QUICK_KIT_KINDS.find((k) => k.id === id).categories.forEach((c) => kindCategories.add(c));
        }
        const hadKitCandidate = LIBRARY.some((row) => (
          row.primaryMuscle === item.slot && kindCategories.has(row.equipmentCategory) && !row.retiredInto
        ));
        expect(hadKitCandidate).toBe(false);
      }
    }
  });
});

describe('buildQuickSession: never a NEVER_AUTO name unless the kettlebell exception applies', () => {
  test.each(KIT_SCENARIOS)('$label', ({ kit }) => {
    const { items } = buildQuickSession({ library: LIBRARY, kit });
    const kitHasKettlebells = kit.includes('kettlebells');
    for (const item of items) {
      const eligible = isAutoEligible(item.exercise.name)
        || (kitHasKettlebells && KETTLEBELL_NEVER_AUTO_EXCEPTIONS.includes(item.exercise.name));
      expect(eligible).toBe(true);
    }
  });
});

describe('buildQuickSession: no duplicate names in one session', () => {
  test.each(KIT_SCENARIOS)('$label', ({ kit }) => {
    const { items } = buildQuickSession({ library: LIBRARY, kit });
    const names = items.map((i) => i.exercise.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('buildQuickSession: prescriptions per class', () => {
  test.each(KIT_SCENARIOS)('$label: compound gets 3x8-12/90s, isolation gets 3x12-15/60s, always restSuggested', ({ kit }) => {
    const { items } = buildQuickSession({ library: LIBRARY, kit });
    for (const item of items) {
      expect(item.sets).toBe(3);
      expect(item.restSuggested).toBe(true);
      if (item.exercise.compoundIsolation === 'compound') {
        expect(item.repsMin).toBe(8);
        expect(item.repsMax).toBe(12);
        expect(item.restSeconds).toBe(90);
      } else {
        expect(item.repsMin).toBe(12);
        expect(item.repsMax).toBe(15);
        expect(item.restSeconds).toBe(60);
      }
    }
  });
});

describe('explainQuickSessionDrops', () => {
  test('counts one capability drop and one preference drop on a constructed pair of libraries', () => {
    // Explicit single muscles (not QUICK_SESSION_SLOTS itself, which now
    // has the shoulders GROUP at index 4): 'side_delts' is the shoulders
    // group's first-choice muscle, so a lone side_delts row resolves the
    // shoulders slot exactly as a plain single-muscle slot would.
    const muscles = ['quads', 'hamstrings', 'chest', 'back', 'side_delts', 'biceps', 'triceps', 'abs'];
    const allLib = muscles.map((muscle, i) => ({
      id: `id-${muscle}`,
      name: i === 0 ? 'Capability Blocked Exercise' : i === 2 ? 'Preference Blocked Exercise' : `Stand-in ${muscle} exercise`,
      primaryMuscle: muscle,
      equipmentCategory: 'bodyweight',
      compoundIsolation: 'compound',
      difficulty: 1,
    }));
    const filteredLib = allLib.filter((row) => (
      row.name !== 'Capability Blocked Exercise' && row.name !== 'Preference Blocked Exercise'
    ));

    const { capabilityDrops, preferenceDrops } = explainQuickSessionDrops({
      all: allLib, filtered: filteredLib, kit: [], capabilityState: {},
    });
    expect(capabilityDrops).toBe(1);
    expect(preferenceDrops).toBe(1);
  });

  // Lead ruling 2026-09-11: the chosen-name exclusion cascades, so a
  // per-slot winner comparison over-counts. Constructs exactly that:
  // quads' unfiltered winner ("Removed Exercise") shares its name with a
  // row that is hamstrings' own candidate (h1) - the chosen-name
  // collision means quads' win BLOCKS h1 in the unfiltered run (h2 wins
  // hamstrings instead), but once quads' winner is removed from the
  // library, h1 is never blocked in the filtered run and wins hamstrings
  // there. So hamstrings' winner changes between the two runs (h2 -> h1)
  // even though NEITHER h1 NOR h2 was ever removed from the library - a
  // per-slot comparison would wrongly count that as a second drop. A
  // third, uniquely-named row (chest's "Solo Drop") is the only row
  // genuinely absent from the filtered library, so exactly one drop is
  // the correct count.
  test('a chosen-name cascade does not inflate the count: exactly one drop for the row genuinely absent from the filtered library', () => {
    const row = (id, name, primaryMuscle, difficulty) => (
      { id, name, primaryMuscle, equipmentCategory: 'bodyweight', compoundIsolation: 'compound', difficulty }
    );
    const allLib = [
      row('q1', 'Removed Exercise', 'quads', 1),
      row('q2', 'Quads Fallback', 'quads', 2),
      row('h1', 'Removed Exercise', 'hamstrings', 1),
      row('h2', 'Hamstrings Fallback', 'hamstrings', 2),
      row('c1', 'Solo Drop', 'chest', 1),
      row('c2', 'Chest Fallback', 'chest', 2),
    ];
    const filteredLib = allLib.filter((r) => r.id !== 'q1' && r.id !== 'c1');

    // Confirm the cascade genuinely fires before trusting the count below
    // - otherwise this test would not be exercising what it claims to.
    const unfilteredRun = buildQuickSession({ library: allLib, kit: [] });
    const filteredRun = buildQuickSession({ library: filteredLib, kit: [] });
    const unfilteredHamstrings = unfilteredRun.items.find((i) => i.slot === 'hamstrings');
    const filteredHamstrings = filteredRun.items.find((i) => i.slot === 'hamstrings');
    expect(unfilteredHamstrings.exercise.id).toBe('h2');
    expect(filteredHamstrings.exercise.id).toBe('h1');
    expect(unfilteredHamstrings.exercise.name).not.toBe(filteredHamstrings.exercise.name);

    const { capabilityDrops, preferenceDrops } = explainQuickSessionDrops({
      all: allLib, filtered: filteredLib, kit: [], capabilityState: {},
    });
    expect(capabilityDrops + preferenceDrops).toBe(1);
  });

  test('no drops when the filtered library is identical to the full one', () => {
    const { capabilityDrops, preferenceDrops } = explainQuickSessionDrops({
      all: LIBRARY, filtered: LIBRARY, kit: ['dumbbells'], capabilityState: null,
    });
    expect(capabilityDrops).toBe(0);
    expect(preferenceDrops).toBe(0);
  });
});

describe('KIT_PRESETS', () => {
  test('Full gym selects every kind; Nothing, bodyweight only clears every kind', () => {
    const fullGym = KIT_PRESETS.find((p) => p.label === 'Full gym');
    const bodyweightOnly = KIT_PRESETS.find((p) => p.label === 'Nothing, bodyweight only');
    expect(fullGym.kit).toEqual(ALL_KIND_IDS);
    expect(bodyweightOnly.kit).toEqual([]);
  });
});

describe('quickSessionKit (ruling 8: remembered kit, per account, on device)', () => {
  const KEY = '@volyume_quick_kit_v1:u1';

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  test('first use (nothing stored) reads as the empty kit', async () => {
    expect(await readQuickKit('u1')).toEqual([]);
  });

  test('write then read round-trips through the real AsyncStorage mock', async () => {
    await writeQuickKit('u1', ['kettlebells', 'bands']);
    const raw = await AsyncStorage.getItem(KEY);
    expect(JSON.parse(raw)).toEqual(['kettlebells', 'bands']);
    expect(await readQuickKit('u1')).toEqual(['kettlebells', 'bands']);
  });

  test('read shape-checks: a non-array or non-string-entry payload reads as the empty kit, never throws', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ not: 'an array' }));
    await expect(readQuickKit('u1')).resolves.toEqual([]);

    await AsyncStorage.setItem(KEY, JSON.stringify(['dumbbells', 42, null, 'bands']));
    await expect(readQuickKit('u1')).resolves.toEqual(['dumbbells', 'bands']);

    await AsyncStorage.setItem(KEY, 'not json at all {{{');
    await expect(readQuickKit('u1')).resolves.toEqual([]);
  });

  test('read never throws when AsyncStorage itself rejects', async () => {
    const orig = AsyncStorage.getItem;
    AsyncStorage.getItem = jest.fn(() => Promise.reject(new Error('storage unavailable')));
    try {
      await expect(readQuickKit('u1')).resolves.toEqual([]);
    } finally {
      AsyncStorage.getItem = orig;
    }
  });

  test('write never throws when AsyncStorage itself rejects', async () => {
    const orig = AsyncStorage.setItem;
    AsyncStorage.setItem = jest.fn(() => Promise.reject(new Error('storage unavailable')));
    try {
      await expect(writeQuickKit('u1', ['bands'])).resolves.toBeUndefined();
    } finally {
      AsyncStorage.setItem = orig;
    }
  });

  test('no-ops without throwing when uid is missing', async () => {
    expect(await readQuickKit(null)).toEqual([]);
    await expect(writeQuickKit(null, ['bands'])).resolves.toBeUndefined();
  });

  test('kits for different accounts do not collide', async () => {
    await writeQuickKit('u1', ['dumbbells']);
    await writeQuickKit('u2', ['barbell']);
    expect(await readQuickKit('u1')).toEqual(['dumbbells']);
    expect(await readQuickKit('u2')).toEqual(['barbell']);
  });
});
