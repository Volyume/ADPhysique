/**
 * CC28 - the capability-led routine families (Amendment deliverable 2;
 * Amendment sections 13/15/16/17; CC-F3 gate).
 *
 * Compatibility BY CONSTRUCTION, proven mechanically:
 *  - every exercise name in every family plan resolves against the seed
 *    library (or seedRoutines' own REQUIRED_EXERCISES);
 *  - each family's rows pass ITS OWN capability profile through the real
 *    resolver + derivation (fullyCompatible - zero conflicts AND zero
 *    unknowns, so a family plan can never dead-end its own audience);
 *  - Amendment section 17 programme checks: session sizes, weekly sets,
 *    rep and rest sanity;
 *  - Amendment section 16 coverage: each family trains its claimed scope
 *    (full-body families cover upper AND lower; upper families cover the
 *    pressing and pulling sides);
 *  - CC-F3/CAP-3: function-named only - no population or condition
 *    labels anywhere in names, tags or descriptions.
 */
const { computePlanCompatibility } = require('../capability/planCompat');
const { buildCapabilityResolveState } = require('../capability/resolve');
const { CORPUS, corpusEntryToSeedRow } = require('../exerciseCorpus');

const NOW = 1_750_000_000_000;
const fs = require('fs');
const path = require('path');

// ── The real library, derived the same way the seed derives ─────────────
// Re-anchored EL-14/EL-15 (exercise-library-expansion-2026-09-05):
// corpusEntryToSeedRow is exactly the row seedExercises.js inserts
// (07-CORPUS-FORMAT.md section 4, subregion and demand metadata already
// merged in), so this runs against the same live library the real seed
// produces.
function realLibraryByName() {
  return new Map(CORPUS.map((entry) => [entry.name, { id: entry.name, ...corpusEntryToSeedRow(entry) }]));
}

// ── The family plans, parsed from seedRoutines ───────────────────────────
// EL-15: REQUIRED_EXERCISES is gone - those 18 rows are now ordinary
// CORPUS entries, seeded by seedExercises.js before seedRoutines.js runs,
// so they already resolve through realLibraryByName() above and no
// separate parse/merge pass is needed.
function parseSeedRoutines() {
  const src = fs.readFileSync(path.resolve(__dirname, '../seedRoutines.js'), 'utf8');
  const plansStart = src.indexOf('const LIBRARY_PLANS = [');
  const plansBody = src.slice(plansStart, src.indexOf('\n];', plansStart));
  const plans = [];
  const planRe = /\{\s*\n\s*name: '((?:[^'\\]|\\.)*)',\s*\n\s*description: '((?:[^'\\]|\\.)*)',\s*\n\s*tags: '([^']*)'/g;
  let m;
  const indices = [];
  while ((m = planRe.exec(plansBody)) !== null) {
    indices.push({ name: m[1], description: m[2], tags: m[3], start: m.index });
  }
  for (let i = 0; i < indices.length; i++) {
    const seg = plansBody.slice(indices[i].start, indices[i + 1]?.start ?? plansBody.length);
    const exNames = [...seg.matchAll(/\{ name: '((?:[^'\\]|\\.)*)',\s*sets: (\d+),\s*repsMin: (\d+),\s*repsMax: (\d+),\s*rest: (\d+)/g)]
      .map((x) => ({ name: x[1], sets: +x[2], repsMin: +x[3], repsMax: +x[4], rest: +x[5] }));
    const workoutCount = (seg.match(/name: 'Day /g) ?? []).length;
    plans.push({ ...indices[i], exercises: exNames, workoutCount });
  }
  return { plans };
}

const LIB = realLibraryByName();
const { plans } = parseSeedRoutines();
const LIB_ALL = LIB;

const capRows = (rules) => buildCapabilityResolveState(
  rules.map((r, i) => ({
    id: `c${i}`, userId: 'u', role: 'baseline', source: 'self', ruleKind: r.kind,
    ruleValue: r.value, laterality: null, startsAt: NOW - 1, endsAt: null, state: 'active',
    endedAt: null, endedReason: null, episodeGroupId: null, deletedAt: null,
  })),
  { atMs: NOW },
);
const cap = (rules) => capRows(rules.map(value => ({ kind: 'demand', value })));
// Gap-closure Phase E: some family audiences are FAMILY-rule shaped (a
// no-deep-knee audience excludes movement classes, not a demand axis).
const capFamilies = (families) => capRows(families.map(value => ({ kind: 'family', value })));

// Each family's OWN capability profile - the audience the plan claims.
const FAMILY_PROFILES = {
  'Seated Full Body': cap(['standing']),
  'Seated Upper Strength': cap(['standing']),
  'No-Floor Full Body': cap(['floor_access']),
  'Supported Machine Builder': cap(['balance_high']),
  'Supported Machine Builder II': cap(['balance_high']),
  'One-Arm Upper Builder': cap(['bilateral_upper']),
  'One-Leg Lower Builder': cap(['bilateral_lower']),
  'Steady-Base Full Body': cap(['balance_high']),
  'Dumbbell & Band Foundations': cap([]),
  'No-Overhead Upper Split': cap(['overhead_position']),
  // The grip-light circuit ships in place of the deferred grip-limited
  // PULLING collection (DEF-3): it covers what genuinely needs no firm
  // grip and says the pulling gap out loud in its description.
  'Grip-Light Machine Circuit': cap(['grip_bar']),
  // Gap-closure Phase E (GC-D8): breadth and the experienced tiers.
  'Seated Home Strength': cap(['standing']),
  'Grip-Light Lower Builder': cap(['grip_bar']),
  'Hinge & Hip Lower Builder': capFamilies(['squat_press', 'knee_flexion']),
  'Seated Upper Strength II': cap(['standing']),
  'Steady-Base Strength': cap(['balance_high']),
};

// Seated Home Strength exists for home training from a chair: nothing in
// it may need a gym station (GC-D8). A resistance band is a no-gym-station
// item too (the plan pairs Seated Band Row/Lat Pulldown with dumbbell work
// by design). Pre-EL-14 the seed mislabelled every band row's raw
// `equipment` as 'bodyweight' (deriveEquipmentCategory then name-sniffed it
// back to 'band' for the equipment FILTER); the corpus now tags it 'band'
// at the source (07-CORPUS-FORMAT.md), which is the more honest raw value,
// so the home-equipment allowlist needs it explicitly.
const HOME_EQUIPMENT = new Set(['dumbbell', 'bodyweight', 'band']);

const FAMILY_NAMES = Object.keys(FAMILY_PROFILES);
const familyPlans = plans.filter((p) => FAMILY_NAMES.includes(p.name));

test('all families are present in the seed with real content', () => {
  expect(familyPlans.map((p) => p.name).sort()).toEqual(FAMILY_NAMES.sort());
  for (const p of familyPlans) {
    expect(p.exercises.length).toBeGreaterThanOrEqual(8);
    expect(p.workoutCount).toBeGreaterThanOrEqual(2);
  }
});

test('every referenced exercise name resolves against the library', () => {
  const missing = [];
  for (const p of familyPlans) {
    for (const ex of p.exercises) {
      if (!LIB.has(ex.name)) missing.push({ plan: p.name, name: ex.name });
    }
  }
  expect(missing).toEqual([]);
});

test("each family's rows pass ITS OWN capability profile - compatible by construction", () => {
  const failures = [];
  for (const p of familyPlans) {
    const rows = p.exercises.map((ex) => LIB_ALL.get(ex.name)).filter(Boolean);
    expect(rows.length).toBe(p.exercises.length);
    const verdict = computePlanCompatibility(FAMILY_PROFILES[p.name], rows);
    for (const c of verdict.conflicts) failures.push({ plan: p.name, name: c.row.name, reason: c.reason });
    for (const u of verdict.unknowns) failures.push({ plan: p.name, name: u.row.name, reason: u.reason });
  }
  expect(failures).toEqual([]);
});

test('Amendment section 17: session sizes, weekly sets, rep and rest sanity', () => {
  for (const p of familyPlans) {
    const perDay = p.exercises.length / p.workoutCount;
    expect({ plan: p.name, perDay }).toEqual({ plan: p.name, perDay: expect.any(Number) });
    expect(perDay).toBeGreaterThanOrEqual(4);
    expect(perDay).toBeLessThanOrEqual(6);
    const weeklySets = p.exercises.reduce((s, e) => s + e.sets, 0);
    expect(weeklySets).toBeGreaterThanOrEqual(20);
    for (const ex of p.exercises) {
      expect(ex.repsMin).toBeGreaterThanOrEqual(5);
      expect(ex.repsMax).toBeLessThanOrEqual(25);
      expect(ex.rest).toBeGreaterThanOrEqual(45);
      expect(ex.rest).toBeLessThanOrEqual(180);
    }
  }
});

test('Amendment section 16: each family covers its claimed scope', () => {
  const muscleOf = (name) => LIB_ALL.get(name)?.primaryMuscle ?? null;
  const LOWER = new Set(['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'tibialis']);
  for (const p of familyPlans) {
    const muscles = new Set(p.exercises.map((e) => muscleOf(e.name)).filter(Boolean));
    if (/Full Body|Foundations/.test(p.name)) {
      expect([...muscles].some((mu) => LOWER.has(mu))).toBe(true);
      expect([...muscles].some((mu) => !LOWER.has(mu))).toBe(true);
      expect(muscles.size).toBeGreaterThanOrEqual(5);
    }
    if (/Upper/.test(p.name)) {
      expect(muscles.has('chest') || muscles.has('front_delts')).toBe(true);
      expect(muscles.has('back')).toBe(true);
    }
    if (/Lower/.test(p.name)) {
      expect(muscles.has('quads')).toBe(true);
      expect(muscles.has('hamstrings') || muscles.has('glutes')).toBe(true);
    }
  }
});

test('Seated Home Strength needs no gym station and the experienced tiers train like it (GC-D8)', () => {
  const home = familyPlans.find((p) => p.name === 'Seated Home Strength');
  expect(home).toBeTruthy();
  for (const ex of home.exercises) {
    const row = LIB_ALL.get(ex.name);
    expect(row).toBeDefined();
    expect({ name: ex.name, equipment: row.equipment, ok: HOME_EQUIPMENT.has(row.equipment) }).toEqual({
      name: ex.name, equipment: row.equipment, ok: true,
    });
  }
  // The experienced tiers are not a watered-down shelf (Amendment
  // section 15; order section 24): heavier rep ranges appear.
  for (const name of ['Seated Upper Strength II', 'Steady-Base Strength']) {
    const p = familyPlans.find((x) => x.name === name);
    expect(p).toBeTruthy();
    expect(p.exercises.some((e) => e.repsMin <= 6)).toBe(true);
  }
});

test('CC-F3/CAP-3: function names only - no population or condition labels anywhere', () => {
  const banned = /wheelchair|disabilit|amputee|paraplegi|stroke|parkinson|sclerosis|arthrit|elderly|senior|impair/i;
  for (const p of familyPlans) {
    expect(`${p.name} ${p.description} ${p.tags}`).not.toMatch(banned);
  }
});
