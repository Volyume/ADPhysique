/**
 * offseasonAllan.test.js -- register D227, "Mens Physique Off Season - Allan".
 *
 * What this suite pins, against the REAL definition, corpus and serve code
 * (no stand-ins), and why each fails loudly:
 *   1. The definition is the founder's document as the lead ruled it in
 *      docs/audit/offseason-allan-2026-10-12/01-SPEC.md: the A5 set table cell
 *      by cell (Health 63, Ramp 1 71, Ramp 2 80, Growth 93, Reduction 47), the
 *      per-muscle figures the spec lists, the sessions in order (A2) and the
 *      A6 effort. A wrong cell silently serves the founder the wrong sets.
 *   2. Every exercise and every listed substitution resolves to a LIVE corpus
 *      row, and building the facts skips none (A3): an unresolved name would
 *      drop a slot or a stand-in on the device.
 *   3. Week by week, the served sets equal A5 exactly for block 1 (Ramp 1,
 *      Ramp 2, Growth x 5, Reduction) and block 2 (Growth x 7, Reduction),
 *      typed counts still win, and a raise lane B applies is carried into
 *      block 2 but never past the slot's cap (C1, B2).
 *   4. The week RIR ladders (A6) and the plain-words effort lines.
 *   5. The closed list (F1): the swap ranker, the substitute scope and the
 *      capability stand-in never offer an exercise outside an exercise's own
 *      listed substitutions, over the WHOLE corpus.
 *   6. A copy's facts are re-keyed and start unstarted (C2), and every plan
 *      that is not authored gets nothing from these functions.
 *   7. House copy rules: no em dash, no citations, none of the personal items
 *      D227 point 4 keeps out of the library copy.
 */
const { OFFSEASON_ALLAN } = require('../offseasonAllan');
const {
  authoredServedWeek, authoredRirLadder, authoredWeeklyTargets, authoredWeeklyByMuscle,
  authoredSwapOptions, authoredClosedIds, authoredSubstituteFilter, authoredEffortText,
  isAuthoredFacts, authoredLibraryEntry, authoredPlanLimits,
} = require('../authored');
const {
  buildAuthoredFacts, rekeyAuthoredFacts, factsForAuthoredBlock, nextAuthoredBlockNumber, authoredDefinitionFor,
} = require('../authoredFacts');
const { CORPUS, CORPUS_BY_NAME, corpusEntryToSeedRow } = require('../../exerciseCorpus');
const { canonicalExerciseId } = require('../../exercise/canonicalId');
const { rankSwaps } = require('../../swapEngine');
const { bestEligibleSubstitute } = require('../../capability/effective');
const { structureServedWeek } = require('../../structure/serve');

// The A5 table, typed in from the spec by hand (never derived from the module
// under test): [key, H, Ramp 1, Ramp 2, Growth, Reduction].
const A5 = [
  ['d1.lat_pulldown', 3, 4, 4, 4, 2],
  ['d1.single_arm_pulldown', 2, 2, 3, 3, 2],
  ['d1.chest_supported_row', 2, 2, 2, 3, 1],
  ['d1.cable_lateral', 3, 4, 5, 5, 3],
  ['d1.reverse_pec_deck', 2, 3, 3, 3, 2],
  ['d1.preacher_curl', 2, 2, 3, 3, 2],
  ['d1.kneeling_crunch', 2, 2, 2, 3, 2],
  ['d2.incline_press', 3, 3, 4, 4, 2],
  ['d2.converging_press', 2, 2, 3, 3, 2],
  ['d2.low_to_high_fly', 2, 2, 2, 3, 1],
  ['d2.machine_lateral', 3, 4, 4, 5, 2],
  ['d2.overhead_extension', 2, 2, 3, 3, 2],
  ['d2.pushdown', 2, 2, 2, 2, 1],
  ['d2.machine_crunch', 2, 2, 2, 3, 1],
  ['d3.seated_leg_curl', 3, 3, 3, 4, 2],
  ['d3.hack_squat', 2, 2, 3, 3, 2],
  ['d3.leg_extension', 2, 2, 2, 3, 1],
  ['d3.standing_calf', 3, 3, 3, 4, 2],
  ['d3.cable_lateral', 3, 4, 5, 5, 3],
  ['d3.straight_arm_pulldown', 2, 2, 2, 3, 1],
  ['d4.v_bar_pulldown', 3, 4, 4, 4, 2],
  ['d4.iso_lateral_pulldown', 2, 2, 3, 3, 2],
  ['d4.wide_row', 2, 3, 3, 3, 2],
  ['d4.machine_lateral', 3, 4, 4, 5, 2],
  ['d4.reverse_crossover', 2, 2, 2, 3, 1],
  ['d4.cable_curl', 2, 2, 2, 3, 1],
  ['d4.cross_body_extension', 2, 2, 2, 3, 1],
];
const COL = { health: 1, ramp1: 2, ramp2: 3, growth: 4, reduction: 5 };
const A5_BY_KEY = new Map(A5.map((r) => [r[0], r]));

// A2: the sessions, their app names and the exercises in order.
const A2 = [
  ['Back Width A', ['Plate-Loaded Lat Pulldown', 'Single-Arm Lat Pulldown', 'Machine Row (Chest Supported)', 'Single-Arm Cable Lateral Raise', 'Reverse Pec Deck', 'Preacher Curl Machine', 'Kneeling Cable Crunch']],
  ['Upper Chest & Arms', ['Incline Machine Press', 'Converging Chest Press Machine', 'Cable Fly (Low to High)', 'Machine Lateral Raise', 'Cable Overhead Tricep Extension', 'Tricep Pushdown (Rope)', 'Machine Crunch']],
  ['Legs, Delts & Lats', ['Seated Leg Curl', 'Hack Squat Machine', 'Leg Extension', 'Standing Calf Raise (Machine)', 'Single-Arm Cable Lateral Raise', 'Cable Straight-Arm Pulldown']],
  ['Back Width B & Arms', ['V-Bar Pulldown', 'Iso-Lateral Front Pulldown', 'Wide-Grip Cable Row', 'Machine Lateral Raise', 'Reverse Cable Crossover', 'Cable Curl', 'Cross-Body Cable Tricep Extension']],
];

// The library as the device holds it: every live corpus row under its canonical id.
const LIBRARY = CORPUS.map((e) => ({ id: canonicalExerciseId(e.name), ...corpusEntryToSeedRow(e) }));
const BY_NAME = Object.fromEntries(LIBRARY.map((r) => [r.name, r]));
const BY_ID = new Map(LIBRARY.map((r) => [r.id, r]));

// The facts as the seed builds them, against routines whose rows hold the
// main exercises in order.
function buildFacts() {
  const routines = OFFSEASON_ALLAN.sessions.map((s, i) => ({
    routineId: `r${i + 1}`,
    rows: s.exercises.map((e, j) => ({ routineExerciseId: `re${i + 1}_${j + 1}`, exerciseId: BY_NAME[e.name]?.id ?? null })),
  }));
  return buildAuthoredFacts(OFFSEASON_ALLAN, { routines, exerciseByName: BY_NAME });
}

const allSlots = (facts) => facts.authored.sessions.flatMap((s) => s.exercises.map((x) => ({ session: s, slot: x })));

// Every row of every session served in block `block`, week `week`.
function servedWeek(facts, { block = 1, week, isDeload = false, mesocycleId = null }) {
  const f = block > 1 || mesocycleId ? factsForAuthoredBlock(facts, { blockNumber: block, mesocycleId: mesocycleId ?? `m${block}` }) : facts;
  const out = {};
  let total = 0;
  for (const s of f.authored.sessions) {
    const rows = s.exercises.map((x) => ({ exerciseId: x.exerciseId, slotId: x.routineExerciseId }));
    const served = authoredServedWeek({
      facts: f, routineId: s.routineId, mesocycleId: mesocycleId ?? (block > 1 ? `m${block}` : null), weekIndex: week, isDeload, exercises: rows,
    });
    for (const x of s.exercises) {
      out[x.key] = served.sets[x.exerciseId];
      total += served.sets[x.exerciseId] || 0;
    }
  }
  return { byKey: out, total };
}

describe('the definition is the founder\'s plan as ruled (A2, A5, A6)', () => {
  test('sessions and exercises in the document\'s order, under the app names', () => {
    expect(OFFSEASON_ALLAN.name).toBe('Mens Physique Off Season - Allan');
    expect(OFFSEASON_ALLAN.sessions.map((s) => [s.name, s.exercises.map((e) => e.name)])).toEqual(A2);
    expect(OFFSEASON_ALLAN.tags.split(' ')).toEqual(expect.arrayContaining(['gender:men', 'goal:mens_physique', 'equipment:machines_cables', 'authored']));
  });

  test('every cell of the A5 set table, exactly', () => {
    const keys = OFFSEASON_ALLAN.sessions.flatMap((s) => s.exercises.map((e) => e.key));
    expect(keys).toEqual(A5.map((r) => r[0]));
    for (const s of OFFSEASON_ALLAN.sessions) {
      for (const e of s.exercises) {
        const row = A5_BY_KEY.get(e.key);
        expect([e.key, e.sets.health, e.sets.ramp1, e.sets.ramp2, e.sets.growth, e.sets.reduction]).toEqual(row);
      }
    }
  });

  test('phase totals: Health 63, Ramp 1 71, Ramp 2 80, Growth 93, Reduction 47', () => {
    const sum = (col) => A5.reduce((a, r) => a + r[COL[col]], 0);
    expect([sum('health'), sum('ramp1'), sum('ramp2'), sum('growth'), sum('reduction')]).toEqual([63, 71, 80, 93, 47]);
    const fromDef = (phase) => OFFSEASON_ALLAN.sessions.flatMap((s) => s.exercises).reduce((a, e) => a + e.sets[phase], 0);
    expect(['health', 'ramp1', 'ramp2', 'growth', 'reduction'].map(fromDef)).toEqual([63, 71, 80, 93, 47]);
  });

  test('the spec\'s per-muscle figures for Ramp 1, Ramp 2, Growth and Reduction', () => {
    const { facts } = buildFacts();
    const block1 = authoredWeeklyByMuscle(facts, 1);
    const week = (i) => Object.fromEntries(Object.entries(block1).map(([m, w]) => [m, w[i]]));
    // Ramp 1: lats 14, side delts 16, rear delts 5, upper back 5.
    expect(week(0)).toMatchObject({ lats: 14, side_delts: 16, rear_delts: 5, upper_back: 5 });
    // Ramp 2: lats 16, side delts 18, chest 9, biceps 5, triceps 7, quads 5.
    expect(week(1)).toMatchObject({ lats: 16, side_delts: 18, chest: 9, biceps: 5, triceps: 7, quads: 5 });
    // Growth: the document's table.
    expect(week(2)).toEqual({
      lats: 17, upper_back: 6, side_delts: 20, rear_delts: 6, chest: 10, biceps: 6, triceps: 8, abs: 6, quads: 6, hamstrings: 4, calves: 4,
    });
    // Reduction: each muscle's Growth halved, rounded half up.
    expect(week(7)).toEqual({
      lats: 9, upper_back: 3, side_delts: 10, rear_delts: 3, chest: 5, biceps: 3, triceps: 4, abs: 3, quads: 3, hamstrings: 2, calves: 2,
    });
  });

  test('effort per phase (A6) and the block week RIR ladders', () => {
    const { facts } = buildFacts();
    expect(authoredRirLadder(facts, 1)).toEqual([2, 2, 1, 1, 1, 1, 1, 3]);
    expect(authoredRirLadder(facts, 2)).toEqual([1, 1, 1, 1, 1, 1, 1, 3]);
    expect(OFFSEASON_ALLAN.phases.ramp1).toMatchObject({ compound: [2, 2], isolation: [1, 2] });
    expect(OFFSEASON_ALLAN.phases.ramp2).toMatchObject({ compound: [2, 2], isolation: [1, 1] });
    expect(OFFSEASON_ALLAN.phases.growth).toMatchObject({ compound: [1, 2], isolation: [0, 1] });
    expect(OFFSEASON_ALLAN.phases.reduction).toMatchObject({ compound: [3, 3], isolation: [2, 3] });
    expect(authoredEffortText(facts, 'compound', 'ramp1')).toBe('Stop 2 reps before you could not do another.');
    expect(authoredEffortText(facts, 'isolation', 'ramp1')).toBe('Stop 1 to 2 reps before you could not do another.');
    expect(authoredEffortText(facts, 'isolation', 'growth')).toBe('Stop 0 to 1 reps short. The last set may go to failure.');
  });

  // Spec H1 (lead ruling after lane A): the seated leg curl's cap is 5, so the
  // legs check-in (D4) can take hamstrings to 5 a week through it; the leg
  // extension's is 4 for the same reason (quads up to 7).
  test('caps (C1, H1): laterals up to 7, leg curl 5, leg extension 4, calves 4, the session caps', () => {
    const def = OFFSEASON_ALLAN.sessions.flatMap((s) => s.exercises);
    for (const e of def.filter((x) => x.muscle === 'side_delts')) expect(e.cap).toBe(7);
    expect(def.find((x) => x.key === 'd3.seated_leg_curl').cap).toBe(5);
    expect(def.find((x) => x.key === 'd3.leg_extension').cap).toBe(4);
    expect(def.find((x) => x.key === 'd3.standing_calf').cap).toBe(4);
    // No cap is ever below the founder's own Growth number.
    for (const e of def) expect(e.cap).toBeGreaterThanOrEqual(e.sets.growth);
    expect(OFFSEASON_ALLAN.sessionCaps).toEqual({ side_delts: { direct: 7 }, back: { direct: 10, fractional: 12 }, chest: { direct: 10 } });
  });
});

describe('seeding resolves every name (A3)', () => {
  test('every main exercise, substitution and the optional trial is a LIVE corpus row', () => {
    const names = [
      ...OFFSEASON_ALLAN.sessions.flatMap((s) => s.exercises.flatMap((e) => [e.name, ...e.subs])),
      ...OFFSEASON_ALLAN.optional.map((o) => o.name),
    ];
    const bad = names.filter((n) => { const e = CORPUS_BY_NAME.get(n); return !e || e.retiredInto; });
    expect(bad).toEqual([]);
  });

  test('the four rows the library lacked are present, with full metadata', () => {
    for (const name of ['Cable Preacher Curl', 'Seated Cable Chest Press', 'Neutral-Grip Machine Pulldown', 'Single-Arm High-Pulley Seated Cable Row']) {
      const row = BY_NAME[name];
      expect(row).toBeDefined();
      expect(row.primaryMuscle).toBeTruthy();
      expect(row.equipment).toMatch(/^(cable|machine)$/);
      expect(row.compoundIsolation).toMatch(/^(compound|isolation)$/);
      expect(row.movementPattern).toBeTruthy();
      expect(row.subregion).toBeTruthy();
      expect(row.equipmentProfiles).toEqual(expect.arrayContaining(['machines_cables']));
    }
    expect(BY_NAME['Single-Arm Cable Lateral Raise'].subregion).toBe('lateral_raise');
  });

  test('building the facts skips nothing: every slot, routine row and substitution has its id', () => {
    const { facts, unresolved } = buildFacts();
    expect(unresolved).toEqual([]);
    expect(isAuthoredFacts(facts)).toBe(true);
    expect(facts.version).toBe(2);
    for (const { session, slot } of allSlots(facts)) {
      expect(session.routineId).toBeTruthy();
      expect(slot.exerciseId).toBe(BY_NAME[slot.name].id);
      expect(slot.routineExerciseId).toBeTruthy();
      for (const sub of slot.subs) expect(sub.exerciseId).toBe(BY_NAME[sub.name].id);
    }
    expect(facts.authored.optional[0].exerciseId).toBe(BY_NAME['Machine Shoulder Press'].id);
  });

  test('a name the library has not got yet is reported, never silently dropped', () => {
    const byName = { ...BY_NAME };
    delete byName['Cable Preacher Curl'];
    const routines = OFFSEASON_ALLAN.sessions.map((s, i) => ({ routineId: `r${i}`, rows: [] }));
    const { unresolved } = buildAuthoredFacts(OFFSEASON_ALLAN, { routines, exerciseByName: byName });
    expect(unresolved).toEqual(['Cable Preacher Curl']);
  });

  test('the library entry stores Ramp 1 sets, the ranges, rest and notes', () => {
    const entry = authoredLibraryEntry(OFFSEASON_ALLAN);
    expect(entry.workouts.map((w) => w.name)).toEqual(A2.map((s) => s[0]));
    const flat = entry.workouts.flatMap((w) => w.exercises);
    expect(flat.map((e) => e.sets)).toEqual(A5.map((r) => r[COL.ramp1]));
    expect(flat.reduce((a, e) => a + e.sets, 0)).toBe(71);
    for (const e of flat) {
      expect(e.repsMin).toBeLessThanOrEqual(e.repsMax);
      expect(e.rest % 15).toBe(0);
      expect(typeof e.notes).toBe('string');
    }
    expect(authoredDefinitionFor('Mens Physique Off Season - Allan')).toBe(OFFSEASON_ALLAN);
    expect(authoredDefinitionFor('Aesthetic Upper Rotation')).toBeNull();
  });
});

describe('serving exactly what is written (C1, B1, B2)', () => {
  const { facts } = buildFacts();
  const column = (phase) => Object.fromEntries(A5.map((r) => [r[0], r[COL[phase]]]));

  test('block 1, weeks 1 to 8: Ramp 1, Ramp 2, Growth x 5, Reduction', () => {
    const expected = ['ramp1', 'ramp2', 'growth', 'growth', 'growth', 'growth', 'growth', 'reduction'];
    const totals = [];
    expected.forEach((phase, i) => {
      const { byKey, total } = servedWeek(facts, { block: 1, week: i + 1, isDeload: i === 7 });
      expect(byKey).toEqual(column(phase));
      totals.push(total);
    });
    expect(totals).toEqual([71, 80, 93, 93, 93, 93, 93, 47]);
  });

  test('block 2, weeks 1 to 8: Growth x 7, Reduction', () => {
    const totals = [];
    for (let w = 1; w <= 8; w += 1) {
      const { byKey, total } = servedWeek(facts, { block: 2, week: w, isDeload: w === 8 });
      expect(byKey).toEqual(column(w === 8 ? 'reduction' : 'growth'));
      totals.push(total);
    }
    expect(totals).toEqual([93, 93, 93, 93, 93, 93, 93, 47]);
  });

  test('an early reduction the coach applied (is_deload on a working week) serves the Reduction column', () => {
    expect(servedWeek(facts, { block: 1, week: 4, isDeload: true }).total).toBe(47);
  });

  test('a typed count wins; a listed substitution in the slot is served the slot\'s sets', () => {
    const s = facts.authored.sessions[0];
    const lateral = s.exercises.find((x) => x.key === 'd1.cable_lateral');
    const typed = { ...facts, typed: { [lateral.routineExerciseId]: 6 } };
    const rows = s.exercises.map((x) => ({ exerciseId: x.exerciseId, slotId: x.routineExerciseId }));
    expect(authoredServedWeek({ facts: typed, routineId: s.routineId, weekIndex: 1, exercises: rows }).sets[lateral.exerciseId]).toBe(6);
    // The machine lateral raise (the cable raise's listed substitution) swapped
    // in for today, in the slot's own row.
    const swapped = rows.map((r) => (r.slotId === lateral.routineExerciseId ? { ...r, exerciseId: BY_NAME['Machine Lateral Raise'].id } : r));
    const out = authoredServedWeek({ facts, routineId: s.routineId, weekIndex: 2, exercises: swapped });
    expect(out.sets[BY_NAME['Machine Lateral Raise'].id]).toBe(5);
  });

  test('a raise carries into block 2 (B2) and never passes the slot cap', () => {
    const raised = { ...facts, authored: { ...facts.authored, raises: { 'd3.cable_lateral': 1, 'd2.machine_lateral': 9 } } };
    const b1 = factsForAuthoredBlock(raised, { blockNumber: 1, mesocycleId: 'mA' });
    expect(b1.authored.raises).toEqual({}); // a restart at block 1 starts at the ramp again
    const b2 = factsForAuthoredBlock(raised, { blockNumber: 2, mesocycleId: 'mB' });
    const { byKey } = servedWeek(b2, { block: 2, week: 1, mesocycleId: 'mB' });
    expect(byKey['d3.cable_lateral']).toBe(6);
    expect(byKey['d2.machine_lateral']).toBe(7); // the cap, never 14
    expect(servedWeek(b2, { block: 2, week: 8, isDeload: true, mesocycleId: 'mB' }).total).toBe(47);
  });

  test('the next block follows only this plan\'s own latest block', () => {
    const started = factsForAuthoredBlock(facts, { blockNumber: 1, mesocycleId: 'm1' });
    expect(nextAuthoredBlockNumber(facts, 'm1')).toBe(1); // never started
    expect(nextAuthoredBlockNumber(started, 'm1')).toBe(2);
    expect(nextAuthoredBlockNumber(started, 'other')).toBe(1);
    expect(nextAuthoredBlockNumber(factsForAuthoredBlock(started, { blockNumber: 2, mesocycleId: 'm2' }), 'm2')).toBe(3);
  });

  test('weekly targets (the planned volume) follow the authored ladder in app muscle keys', () => {
    const t = authoredWeeklyTargets(facts, 1);
    expect(t.back).toEqual([19, 21, 23, 23, 23, 23, 23, 12]);
    expect(t.side_delts).toEqual([16, 18, 20, 20, 20, 20, 20, 10]);
    expect(Object.values(t).reduce((a, w) => a + w[2], 0)).toBe(93);
  });

  test('the session +1 limits use this plan\'s caps, not the house caps', () => {
    const s = facts.authored.sessions[2];
    const rows = s.exercises.map((x) => ({ exercise: { id: x.exerciseId }, routineExercise: { id: x.routineExerciseId } }));
    const limits = authoredPlanLimits({
      facts, routineId: s.routineId, weekIndex: 3, exercises: rows, houseCaps: { directCap: 8, fractionalCap: 11 },
    });
    const lateral = s.exercises.find((x) => x.key === 'd3.cable_lateral');
    expect(limits[lateral.exerciseId]).toMatchObject({ cap: 7, sessionDirect: 5, sessionDirectCap: 7, weekFractional: 20, weekTop: 22 });
  });
});

describe('the closed exercise list (F1)', () => {
  const { facts } = buildFacts();
  const closed = authoredClosedIds(facts);

  test('the closed list is the main exercises, their listed substitutions and the optional trial, nothing else', () => {
    const expected = new Set([
      ...OFFSEASON_ALLAN.sessions.flatMap((s) => s.exercises.flatMap((e) => [e.name, ...e.subs])),
      'Machine Shoulder Press',
    ].map((n) => BY_NAME[n].id));
    expect([...closed].sort()).toEqual([...expected].sort());
  });

  test('swap picker: over the whole corpus, every slot offers only its own listed options', () => {
    for (const { session, slot } of allSlots(facts)) {
      const options = authoredSwapOptions(facts, slot.exerciseId, { routineId: session.routineId });
      const listed = new Set(slot.subs.map((x) => x.exerciseId));
      for (const id of options) expect(listed.has(id) || closed.has(id)).toBe(true);
      const ranked = rankSwaps(BY_ID.get(slot.exerciseId), LIBRARY, { numResults: 50, closedPool: options });
      expect(ranked.length).toBeGreaterThan(0);
      for (const r of ranked) expect(options.has(r.exercise.id)).toBe(true);
      // A sub swaps back to the main exercise or its siblings, never elsewhere.
      for (const sub of slot.subs) {
        const back = authoredSwapOptions(facts, sub.exerciseId, { routineId: session.routineId });
        expect(back.has(slot.exerciseId)).toBe(true);
        for (const id of back) expect(closed.has(id)).toBe(true);
      }
    }
  });

  test('serve-time and kit stand-ins: the substitute scope admits only listed options', () => {
    const scope = authoredSubstituteFilter(facts);
    for (const { slot } of allSlots(facts)) {
      const original = BY_ID.get(slot.exerciseId);
      const admitted = LIBRARY.filter((c) => c.id !== original.id && scope(c, original)).map((c) => c.id);
      const options = authoredSwapOptions(facts, original.id);
      expect(new Set(admitted)).toEqual(options);
      // The capability stand-in, run with every exercise eligible: whatever it
      // picks is one of the slot's listed options.
      const picked = bestEligibleSubstitute(original, LIBRARY, () => true, null, scope);
      if (picked) expect(options.has(picked.id)).toBe(true);
    }
    // An exercise in no slot (added by hand) is replaced from the closed list only.
    const stray = BY_NAME['Barbell Bench Press'];
    const admitted = LIBRARY.filter((c) => scope(c, stray));
    for (const c of admitted) expect(closed.has(c.id)).toBe(true);
  });

  test('stall swap source list for lane B: the options never leave the list', () => {
    for (const { slot } of allSlots(facts)) {
      for (const id of authoredSwapOptions(facts, slot.exerciseId)) expect(closed.has(id)).toBe(true);
    }
  });

  test('every plan that is not authored is unrestricted, exactly as before', () => {
    expect(authoredSwapOptions({ version: 2, slots: {} }, 'x')).toBeNull();
    expect(authoredSubstituteFilter(null)).toBeNull();
    const original = BY_NAME['Machine Lateral Raise'];
    const open = rankSwaps(original, LIBRARY, { numResults: 50 });
    expect(open.some((r) => !closed.has(r.exercise.id))).toBe(true);
  });
});

describe('copies and other plans (C2)', () => {
  const { facts } = buildFacts();

  test('a copy re-keys every routine and routine exercise id and starts unstarted', () => {
    const started = factsForAuthoredBlock({ ...facts, typed: { re1_1: 5 } }, { blockNumber: 1, mesocycleId: 'm1' });
    const routineIdMap = { r1: 'c1', r2: 'c2', r3: 'c3', r4: 'c4' };
    const routineExerciseIdMap = {};
    for (const { slot } of allSlots(facts)) routineExerciseIdMap[slot.routineExerciseId] = `copy_${slot.routineExerciseId}`;
    const copy = rekeyAuthoredFacts(started, { routineIdMap, routineExerciseIdMap });
    expect(copy.authored.sessions.map((s) => s.routineId)).toEqual(['c1', 'c2', 'c3', 'c4']);
    for (const { slot } of allSlots(copy)) expect(slot.routineExerciseId).toMatch(/^copy_re/);
    expect(Object.keys(copy.slots).sort()).toEqual(['c1', 'c2', 'c3', 'c4']);
    expect(Object.keys(copy.gapRanks).sort()).toEqual(['c1', 'c2', 'c3', 'c4']);
    for (const by of Object.values(copy.exposureShares)) for (const r of Object.keys(by)) expect(r).toMatch(/^c\d$/);
    expect(copy.authored.run).toBeNull();
    expect(copy.typed).toBeUndefined();
    expect(started.authored.sessions[0].routineId).toBe('r1'); // never mutated
  });

  test('facts that are not authored get nothing from the authored serve, and authored facts nothing from the structure serve', () => {
    const rows = [{ exerciseId: 'a', slotId: 'b' }];
    expect(authoredServedWeek({ facts: { version: 2 }, routineId: 'r', weekIndex: 1, exercises: rows }).sets).toEqual({});
    expect(authoredServedWeek({ facts: null, routineId: 'r', weekIndex: 1, exercises: rows }).sets).toEqual({});
    expect(structureServedWeek({ facts, routineId: 'r1', weekIndex: 1, exercises: rows }).sets).toEqual({});
  });
});

describe('the plan screen says only what is true of an authored plan', () => {
  test('no "the planner chose this split", no 4-set cap line, no 6-week focus lines', () => {
    // eslint-disable-next-line global-require
    const { explainPlan } = require('../../plan/explain');
    // eslint-disable-next-line global-require
    const { explainLinesForKind } = require('../../planRebuildNote');
    const { facts } = buildFacts();
    const sessions = facts.authored.sessions.map((s) => ({ id: s.routineId, name: s.name, muscles: s.exercises.map((x) => x.appMuscle) }));
    const raw = explainPlan({ facts, sessions, week: 1 }).lines.map((l) => l.id);
    expect(raw).toEqual(expect.arrayContaining(['structure', 'cap']));
    const kept = explainLinesForKind(explainPlan({ facts, sessions, week: 1 }).lines, facts.kind).map((l) => l.id);
    expect(kept.some((id) => id === 'structure' || id === 'cap' || id.startsWith('focus:'))).toBe(false);
    expect(kept).toContain('ladder');
  });
});

describe('house copy rules (A4)', () => {
  const texts = [
    OFFSEASON_ALLAN.description,
    ...OFFSEASON_ALLAN.sessions.flatMap((s) => [s.name, ...s.exercises.map((e) => e.notes)]),
    ...OFFSEASON_ALLAN.optional.map((o) => o.notes),
  ];

  test('no em dash, no citations, no personal items', () => {
    for (const t of texts) {
      expect(t).not.toMatch(/—/);
      expect(t).not.toMatch(/et al|\b(19|20)\d\d\b|Schoenfeld|Pelland|Maeo|Olympia/);
      expect(t).not.toMatch(/physio|doctor|blood|surgery|diagnos|enhanced|Finals|October|show day|\bAl\b/i);
    }
  });

  test('the warm-up line is on the first exercise of Days 1, 2 and 4, and the partials line only on calves, laterals and leg curls', () => {
    const warm = 'Warm up with 2 light sets of cable external rotation and 1 to 2 very light sets of this exercise.';
    const firsts = OFFSEASON_ALLAN.sessions.map((s) => s.exercises[0].notes.startsWith(warm));
    expect(firsts).toEqual([true, true, false, true]);
    const partials = OFFSEASON_ALLAN.sessions.flatMap((s) => s.exercises)
      .filter((e) => /partial reps/.test(e.notes)).map((e) => e.key);
    expect(partials.sort()).toEqual(['d1.cable_lateral', 'd2.machine_lateral', 'd3.cable_lateral', 'd3.seated_leg_curl', 'd3.standing_calf', 'd4.machine_lateral']);
  });

  test('the general shoulder rules stay in the description', () => {
    expect(OFFSEASON_ALLAN.description).toMatch(/no flat pressing, dips, upright rows, behind-the-neck work, deep fly stretches or heavy overhead pressing/);
    expect(OFFSEASON_ALLAN.description).toMatch(/scapular plane to about shoulder height/);
    expect(OFFSEASON_ALLAN.description).toMatch(/Monday, Tuesday, Thursday and Saturday/);
  });
});
