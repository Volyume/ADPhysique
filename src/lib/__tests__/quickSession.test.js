/**
 * quickSession.test.js - D156 (docs/quick-session-equipment-2026-09-11/
 * 10-SPEC.md sections 1-3), REVISED after the fresh-eyes review of the
 * first landing (46961f5), 2026-09-11 - see the amendment paragraph on
 * D156 in docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md.
 * Written to FAIL against a wrong implementation: pins determinism,
 * purity, the eight-part ranking order, the shoulders group's whole-pool
 * ranking, duration-row prescriptions, the kettlebell exception (sorts
 * last, lazily loaded), the inventory boundary, and id-based drop
 * classification, all against the REAL corpus (never a hand-written
 * stand-in library) except where a test is explicitly a constructed
 * pair, plus the remembered-kit storage contract.
 *
 * SHOULDERS IS A GROUP SLOT, POOLED ACROSS ALL THREE MUSCLES AT ONCE. The
 * corpus has no row anywhere - bodyweight, kettlebell or suspension - whose
 * primaryMuscle is "side_delts" (verified: `grep -oP
 * 'primaryMuscle: "[a-z_]+"' src/lib/exerciseCorpus/families/{bodyweight,
 * kettlebell,suspension}.js`, none list side_delts), so the shoulders slot
 * pools side_delts, front_delts and rear_delts candidates together and
 * ranks across the whole pool - not "first muscle with any candidate
 * wins". WHICH muscle wins is therefore a function of the full ranking
 * order (tier, compound preference, pattern-reuse, difficulty, name, id)
 * across all three muscles' candidates, not a fixed per-kit fact - so
 * these tests pin PROPERTIES (the winning row's primaryMuscle is one of
 * the three; for bands it is a band row), never a specific exercise name,
 * per the lead's own instruction to avoid a pin that flaps with any future
 * corpus edit.
 *
 * TIER ORDER IS LOCAL TO THIS MODULE AND DELIBERATELY INVERTS PART OF
 * canonicality.js's OWN ORDER (final lead ruling, 2026-09-11): a quick
 * session ranks NICHE before SPECIALIST (SPECIALIST last), the reverse of
 * canonicality.js's STAPLE, COMMON, SPECIALIST, NICHE - see
 * quickSession.js's own header for the rationale. canonicality.js and
 * tierRank() are never edited; a test below imports tierRank() directly
 * to prove its global order is untouched while quickSession's own order
 * differs for the exact same two names.
 */
import { CORPUS, corpusEntryToSeedRow } from '../exerciseCorpus/index.js';
import { isAutoEligible, tierRank } from '../exercise/canonicality.js';
import { KETTLEBELL_NEVER_AUTO_EXCEPTIONS } from '../exercise/stylePools.js';
import {
  buildQuickSession, explainQuickSessionDrops, QUICK_KIT_KINDS, KIT_PRESETS, QUICK_SESSION_SLOTS,
} from '../quickSession.js';
import fs from 'fs';
import path from 'path';

const SHOULDER_MUSCLES = ['side_delts', 'front_delts', 'rear_delts'];

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
// at seed time) - ranking's final tiebreak (rule 7) reads it, and the
// cross-slot exclusion is by NAME (rule irrelevant to id), so the corpus
// name itself is a fine, unique stand-in for id here too.
function toRow(entry) {
  return { id: entry.name, ...corpusEntryToSeedRow(entry) };
}
const LIBRARY = CORPUS.map(toRow);

const ALL_KIND_IDS = QUICK_KIT_KINDS.map((k) => k.id);

// The verified, real-corpus outcome for every kit this screen can produce
// (empty/first-use, each single kind, full gym): the shoulders group's
// whole-pool ranking means all eight slots fill for every one of them.
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

// The SAME eligibility rule buildQuickSession applies (isEligibleForKit is
// not exported; replicated here from the same imported helpers so the
// "kit before bodyweight" test below cannot report a false "no kit
// candidate" just because the only kit-category row for a muscle happens
// to be NEVER_AUTO and outside the kettlebell exception).
function eligibleForKit(name, kit) {
  return isAutoEligible(name) || (kit.includes('kettlebells') && KETTLEBELL_NEVER_AUTO_EXCEPTIONS.includes(name));
}

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

  // Property pins (lead ruling 2026-09-11), not exact-name pins: which
  // muscle the whole-pool ranking picks is a function of tier/pattern/
  // compound/difficulty across all three muscles' candidates, not a fixed
  // per-kit fact.
  test.each(KIT_SCENARIOS)('$label: the shoulders slot, when filled, resolves to one of the three shoulder muscles and is labelled honestly', ({ kit }) => {
    const { items } = buildQuickSession({ library: LIBRARY, kit });
    const shoulders = items.find((i) => i.slotKey === 'shoulders');
    expect(shoulders).toBeDefined();
    expect(SHOULDER_MUSCLES).toContain(shoulders.slot);
    expect(shoulders.exercise.primaryMuscle).toBe(shoulders.slot);
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
  test('at least one kettlebell row appears; the shoulders slot fills; all eight slots fill', () => {
    const { items, unfilled } = buildQuickSession({ library: LIBRARY, kit: ['kettlebells'] });
    expect(unfilled).toEqual([]);
    expect(items.length).toBe(8);
    expect(items.some((i) => i.exercise.equipmentCategory === 'kettlebell')).toBe(true);
    const shoulders = items.find((i) => i.slotKey === 'shoulders');
    expect(SHOULDER_MUSCLES).toContain(shoulders.slot);
  });
});

describe('buildQuickSession: Bands only ("band equals bodyweight")', () => {
  test('at least one band row appears', () => {
    const { items } = buildQuickSession({ library: LIBRARY, kit: ['bands'] });
    expect(items.some((i) => i.exercise.equipmentCategory === 'band')).toBe(true);
  });

  // Lead ruling 2026-09-11 (property pin, not an exact name): bands have
  // real candidates across all three shoulder muscles, so the shoulders
  // slot must resolve to a genuine BAND row, not a bodyweight one.
  test('the shoulders slot resolves to a band row', () => {
    const { items } = buildQuickSession({ library: LIBRARY, kit: ['bands'] });
    const shoulders = items.find((i) => i.slotKey === 'shoulders');
    expect(shoulders.exercise.equipmentCategory).toBe('band');
    expect(SHOULDER_MUSCLES).toContain(shoulders.slot);
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

  // Fixed (lead ruling 2026-09-11): hadKitCandidate now applies the SAME
  // eligibility rule the implementation does (isAutoEligible, plus the
  // kettlebell exception) - the old version only checked muscle,
  // category and retired-status, so it could not tell a genuine
  // kit-category candidate from a NEVER_AUTO row nothing actually admits,
  // and would have failed to catch a real regression that let an
  // ineligible row "count" as a candidate.
  test('every filled slot across every kit prefers a kit-category row over bodyweight when the kit is non-empty', () => {
    for (const { kit } of KIT_SCENARIOS) {
      if (kit.length === 0) continue;
      const { items } = buildQuickSession({ library: LIBRARY, kit });
      for (const item of items) {
        if (item.exercise.equipmentCategory !== 'bodyweight') continue;
        // A bodyweight winner while the kit is non-empty is only correct
        // when NO eligible kit-category candidate existed for this slot.
        const kindCategories = new Set();
        for (const id of kit) {
          QUICK_KIT_KINDS.find((k) => k.id === id).categories.forEach((c) => kindCategories.add(c));
        }
        const hadKitCandidate = LIBRARY.some((row) => (
          row.primaryMuscle === item.slot
          && kindCategories.has(row.equipmentCategory)
          && !row.retiredInto
          && eligibleForKit(row.name, kit)
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

describe('buildQuickSession: the kettlebell NEVER_AUTO exception sorts last (lead ruling 2026-09-11)', () => {
  // Positive case: the exception is still reachable when it is the only
  // candidate at all for a slot.
  test('a NEVER_AUTO kettlebell exception row is chosen when it is the only eligible hamstrings candidate', () => {
    const row = {
      id: 'kb-swing', name: 'Kettlebell Swing', primaryMuscle: 'hamstrings',
      equipmentCategory: 'kettlebell', compoundIsolation: 'compound', difficulty: 2, movementPattern: 'hinge',
    };
    const { items } = buildQuickSession({ library: [row], kit: ['kettlebells'] });
    const hamstrings = items.find((i) => i.slot === 'hamstrings');
    expect(hamstrings).toBeDefined();
    expect(hamstrings.exercise.name).toBe('Kettlebell Swing');
  });

  // Negative case: ranking order item 0 - an exception-admitted row sorts
  // LAST, after every ordinarily-eligible row, regardless of the
  // ordinary row's own tier/difficulty.
  test('the same exception row is NOT chosen when an ordinary candidate also exists (it sorts last)', () => {
    const exceptionRow = {
      id: 'kb-swing', name: 'Kettlebell Swing', primaryMuscle: 'hamstrings',
      equipmentCategory: 'kettlebell', compoundIsolation: 'compound', difficulty: 2, movementPattern: 'hinge',
    };
    const ordinaryRow = {
      id: 'bw-rdl', name: 'Bodyweight Single-Leg RDL', primaryMuscle: 'hamstrings',
      equipmentCategory: 'bodyweight', compoundIsolation: 'compound', difficulty: 3, movementPattern: 'hinge',
    };
    const { items } = buildQuickSession({ library: [exceptionRow, ordinaryRow], kit: ['kettlebells'] });
    const hamstrings = items.find((i) => i.slot === 'hamstrings');
    expect(hamstrings.exercise.name).toBe('Bodyweight Single-Leg RDL');
  });
});

describe('buildQuickSession: quick-session-local tier order (final lead ruling, 2026-09-11)', () => {
  // The exact real-corpus pair the ruling names: "a quick full-body
  // session for someone with nothing but their bodyweight should get a
  // single-leg RDL, not a Nordic curl". Real names, but every OTHER
  // ranking term forced equal (muscle, category, compound/isolation,
  // pattern, difficulty) so tier is provably the only thing deciding it.
  test('a SPECIALIST row and a NICHE row for the same slot, equal on every other term: the NICHE row wins', () => {
    const specialistRow = {
      id: 'a', name: 'Nordic Curl', primaryMuscle: 'hamstrings',
      equipmentCategory: 'bodyweight', compoundIsolation: 'compound', difficulty: 2, movementPattern: 'hinge',
    };
    const nicheRow = {
      id: 'b', name: 'Bodyweight Single-Leg RDL', primaryMuscle: 'hamstrings',
      equipmentCategory: 'bodyweight', compoundIsolation: 'compound', difficulty: 2, movementPattern: 'hinge',
    };
    const { items } = buildQuickSession({ library: [specialistRow, nicheRow], kit: [] });
    const hamstrings = items.find((i) => i.slot === 'hamstrings');
    expect(hamstrings.exercise.name).toBe('Bodyweight Single-Leg RDL');
  });

  // canonicality.js itself is untouched: its OWN tierRank() ranks these
  // two names the OPPOSITE way (SPECIALIST before NICHE) - the inversion
  // above is provably local to quickSession.js's own ranking, not a
  // change to the shared module every other consumer relies on.
  test('canonicality.js\'s own tierRank keeps the global order (SPECIALIST before NICHE) - the inversion is local to quickSession.js', () => {
    expect(tierRank('Nordic Curl')).toBeLessThan(tierRank('Bodyweight Single-Leg RDL'));
  });

  test('source never imports tierRank from canonicality.js (the local mapping is the only tier order used)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'quickSession.js'), 'utf8');
    const importLine = src.match(/import \{[^}]*\} from '\.\/exercise\/canonicality';/)?.[0] ?? '';
    expect(importLine).toContain('isAutoEligible');
    expect(importLine).toContain('autoTier');
    expect(importLine).not.toMatch(/\btierRank\b/);
    expect(src).toMatch(/quickSessionTierRank/);
  });

  test('the real-corpus empty-kit hamstrings slot picks the single-leg RDL, not the Nordic curl', () => {
    const { items } = buildQuickSession({ library: LIBRARY, kit: [] });
    const hamstrings = items.find((i) => i.slot === 'hamstrings');
    expect(hamstrings.exercise.name).toBe('Bodyweight Single-Leg RDL');
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
  test.each(KIT_SCENARIOS)('$label: compound gets 3x8-12/90s, isolation gets 3x12-15/60s, a duration row keeps its own seconds, always restSuggested', ({ kit }) => {
    const { items } = buildQuickSession({ library: LIBRARY, kit });
    for (const item of items) {
      expect(item.sets).toBe(3);
      expect(item.restSuggested).toBe(true);
      if (item.exercise.exerciseType === 'duration') {
        expect(item.restSeconds).toBe(60);
        expect(Number.isFinite(item.repsMin)).toBe(true);
        expect(Number.isFinite(item.repsMax)).toBe(true);
      } else if (item.exercise.compoundIsolation === 'compound') {
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

describe('buildQuickSession: duration rows (lead ruling 2026-09-11)', () => {
  test('a duration row uses its own defaultRepMin/Max as seconds, never the isolation 12-15 rep scheme', () => {
    const row = {
      id: 'plank-1', name: 'Test Plank', primaryMuscle: 'abs', equipmentCategory: 'bodyweight',
      compoundIsolation: 'isolation', difficulty: 1, exerciseType: 'duration', defaultRepMin: 30, defaultRepMax: 90,
    };
    const { items } = buildQuickSession({ library: [row], kit: [] });
    const abs = items.find((i) => i.slot === 'abs');
    expect(abs.repsMin).toBe(30);
    expect(abs.repsMax).toBe(90);
    expect(abs.restSeconds).toBe(60);
    expect(abs.sets).toBe(3);
  });

  test('a duration row with a non-finite default falls back to the 20-60 pair TOGETHER, not per field', () => {
    const row = {
      id: 'plank-2', name: 'Test Plank Two', primaryMuscle: 'abs', equipmentCategory: 'bodyweight',
      compoundIsolation: 'isolation', difficulty: 1, exerciseType: 'duration', defaultRepMin: 45, defaultRepMax: null,
    };
    const { items } = buildQuickSession({ library: [row], kit: [] });
    const abs = items.find((i) => i.slot === 'abs');
    // The valid defaultRepMin (45) is NOT kept in isolation - either
    // both defaults are used together or neither is.
    expect(abs.repsMin).toBe(20);
    expect(abs.repsMax).toBe(60);
  });
});

describe('explainQuickSessionDrops', () => {
  test('counts one capability drop and one preference drop on a constructed pair of libraries', () => {
    // Explicit single muscles (not QUICK_SESSION_SLOTS itself, which now
    // has the shoulders GROUP at index 4): 'side_delts' is a candidate
    // muscle in that group, so a lone side_delts row resolves the
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

  // Lead ruling 2026-09-11 (id-based matching): a custom, free-text
  // exercise can share a canonical row's display NAME while being a
  // genuinely different row (a different id, possibly a different
  // muscle). Matching by name alone would let the surviving custom row
  // mask the canonical row's real removal. Matching by id does not: the
  // canonical row's specific id is checked, regardless of what else
  // shares its name.
  test('a custom row sharing a canonical row\'s name does not swallow the canonical row\'s drop (matched by id, not name)', () => {
    const canonical = {
      id: 'canonical-1', name: 'Shared Display Name', primaryMuscle: 'quads',
      equipmentCategory: 'bodyweight', compoundIsolation: 'compound', difficulty: 1,
    };
    const custom = {
      id: 'custom-1', name: 'Shared Display Name', primaryMuscle: 'hamstrings',
      equipmentCategory: 'bodyweight', compoundIsolation: 'compound', difficulty: 1,
    };
    const allLib = [canonical, custom];
    // The canonical row is filtered out (its id is gone); the custom row -
    // a different row that happens to share its display NAME - remains.
    const filteredLib = [custom];

    const { capabilityDrops, preferenceDrops } = explainQuickSessionDrops({
      all: allLib, filtered: filteredLib, kit: [], capabilityState: {},
    });
    expect(capabilityDrops + preferenceDrops).toBe(1);
  });

  // Lead ruling 2026-09-11: the chosen-name exclusion still cascades
  // (unrelated to the id-vs-name fix above - this is about WHICH row
  // wins WHICH slot, not about matching). Constructs exactly that: quads'
  // unfiltered winner ("Removed Exercise") shares its NAME with hamstrings'
  // own candidate (h1), so quads' win blocks h1 in the unfiltered run (h2
  // wins hamstrings instead); once quads' winner is removed BY ID from the
  // library, h1 is never blocked in the filtered run - but that filtered
  // run is never even computed any more (explainQuickSessionDrops runs the
  // generator once, over `all`, per the module's header comment). Matching
  // by id means BOTH q1 and c1 (the two rows genuinely absent from
  // `filtered`, by id) are counted, and h2 (present throughout, never
  // removed) is correctly NOT counted just because a different row (h1)
  // that happens to share q1's name ends up available - the total is
  // exactly 2, not 3 (which a per-slot winner comparison would have
  // given) and not 1 (which the superseded name-based check gave, since
  // it let h1's presence mask q1's own, distinct removal).
  test('a chosen-name cascade does not inflate the count beyond the rows genuinely absent, by id', () => {
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

    const { capabilityDrops, preferenceDrops } = explainQuickSessionDrops({
      all: allLib, filtered: filteredLib, kit: [], capabilityState: {},
    });
    // q1 and c1 are the two rows genuinely absent (by id) from filtered;
    // h2 (hamstrings' actual unfiltered winner) is present throughout.
    expect(capabilityDrops + preferenceDrops).toBe(2);
  });

  test('no drops when the filtered library is identical to the full one', () => {
    const { capabilityDrops, preferenceDrops } = explainQuickSessionDrops({
      all: LIBRARY, filtered: LIBRARY, kit: ['dumbbells'], capabilityState: null,
    });
    expect(capabilityDrops).toBe(0);
    expect(preferenceDrops).toBe(0);
  });

  // Lead ruling 2026-09-11: a throw from the classifier (a malformed
  // capability state, an unavailable module) counts as a preference drop,
  // matching the screen's own try/catch fail-safe before this landing.
  test('a throwing classifier counts as a preference drop, not a crash', () => {
    jest.isolateModules(() => {
      jest.doMock('../capability/resolve', () => ({
        capabilityBlockReason: () => { throw new Error('boom'); },
      }));
      const { explainQuickSessionDrops: explainWithThrowingClassifier } = require('../quickSession.js');
      const row = {
        id: 'q1', name: 'Solo Row', primaryMuscle: 'quads',
        equipmentCategory: 'bodyweight', compoundIsolation: 'compound', difficulty: 1,
      };
      const result = explainWithThrowingClassifier({ all: [row], filtered: [], kit: [], capabilityState: {} });
      expect(result).toEqual({ capabilityDrops: 0, preferenceDrops: 1 });
    });
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

// Lead ruling 2026-09-11 (after the review's final report): a rep-based
// row before a timed hold, placed before tier. Written to FAIL against the
// order as it stood, where a niche-tier overhead carry beat a specialist
// press for a kettlebell shoulders slot.
describe('a rep-based row beats a timed hold for the same slot, whatever its tier', () => {
  test('a niche carry loses to a specialist press', () => {
    const carry = {
      id: 'kb-carry', name: 'Kettlebell Overhead Carry', primaryMuscle: 'front_delts',
      equipmentCategory: 'kettlebell', compoundIsolation: 'compound', difficulty: 2,
      exerciseType: 'duration', defaultRepMin: 20, defaultRepMax: 40, movementPattern: 'carry',
    };
    const press = {
      id: 'kb-press', name: 'Kettlebell Press (Single-Arm)', primaryMuscle: 'front_delts',
      equipmentCategory: 'kettlebell', compoundIsolation: 'compound', difficulty: 2,
      exerciseType: 'weight_reps', movementPattern: 'push',
    };
    const { items } = buildQuickSession({ library: [carry, press], kit: ['kettlebells'] });
    const shoulders = items.find((item) => item.slotKey === 'shoulders');
    expect(shoulders).toBeTruthy();
    expect(shoulders.exercise.id).toBe('kb-press');
  });

  test('a timed hold is still chosen when nothing rep-based exists for the slot', () => {
    const plank = {
      id: 'plank', name: 'Weighted Plank (Plate on Back)', primaryMuscle: 'abs',
      equipmentCategory: 'barbell', compoundIsolation: 'isolation', difficulty: 2,
      exerciseType: 'duration', defaultRepMin: 20, defaultRepMax: 60, movementPattern: 'core',
    };
    const { items } = buildQuickSession({ library: [plank], kit: ['barbell'] });
    const abs = items.find((item) => item.slot === 'abs');
    expect(abs?.exercise.id).toBe('plank');
    expect(abs.repsMin).toBe(20);
    expect(abs.repsMax).toBe(60);
  });

  test('real corpus: no kit resolves its shoulders slot to a timed hold', () => {
    for (const kit of [[], ['kettlebells'], ['dumbbells'], ['bands'], ['barbell'], ['cables_machines'], ['suspension']]) {
      const { items } = buildQuickSession({ library: LIBRARY, kit });
      const shoulders = items.find((item) => item.slotKey === 'shoulders');
      expect(shoulders).toBeTruthy();
      expect(shoulders.exercise.exerciseType).not.toBe('duration');
    }
  });
});
