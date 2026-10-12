/**
 * authoredCoach.test.js -- register D227 lane B, the coach on the AUTHORED
 * plan "Mens Physique Off Season - Allan", against the REAL definition,
 * corpus, facts builder and pure coach (spec
 * docs/audit/offseason-allan-2026-10-12/01-SPEC.md D, E, F2, H).
 *
 * What this pins, and why each fails loudly on a wrong rule (a wrong rule
 * silently over- or under-loads the founder's off-season):
 *   1. D2 raise: +1 lats and +1 side delts a week in Growth, onto prescribed
 *      exercises in the ruled order, inside 20 / 22 a week and 7 a session,
 *      never onto a stalled exercise or a held muscle; the ramp is the ladder.
 *   2. D3 hold shifts the ramp a week (the reduction week stays at week 8);
 *      a pull-back takes up to 2 a muscle and never goes below Health.
 *   3. D4 legs: +1 Leg Extension and +1 Seated Leg Curl once a block, quads <=
 *      7 and hamstrings <= 5.
 *   4. D5 / H3: the card's words and the rows come from the one result, and
 *      a retried Apply never adds a set twice.
 *   5. E1 progression through the real resolver: load up only when EVERY set
 *      at the top load reaches the top at the right effort, by 5 kg compound
 *      / 2.5 kg isolation with no 5% cap; reps to 20 first on a lateral when
 *      the step is big; held in the ramp; the reduction week holds the load at
 *      the bottom of the range.
 *   6. E2 stall: 3 Growth sessions without a gain, recovery fine, the plain
 *      message naming only the listed substitutions; no message otherwise.
 *   7. E3 triggers: each of the five, a suggestion at two or more, and the
 *      Apply rows (the Reduction column) with the planned week released only
 *      within 2 weeks.
 *   8. H8 optional serving, H9 effort line, F2 spacing line, H5 block copy.
 */
const { OFFSEASON_ALLAN } = require('../offseasonAllan');
const {
  authoredServedWeek, authoredWeeklyTargets, authoredOptionalFor, authoredWeekEffortLine, authoredBlockPhases,
} = require('../authored');
const { buildAuthoredFacts, factsForAuthoredBlock } = require('../authoredFacts');
const {
  authoredCheckin, authoredMuscleTotals, authoredStall, authoredReductionTriggers, authoredReductionApply,
} = require('../authoredCoach');
const { CORPUS, corpusEntryToSeedRow } = require('../../exerciseCorpus');
const { canonicalExerciseId } = require('../../exercise/canonicalId');
const { assembleEvidencePacket, resolveSetPrescription, PROVENANCE } = require('../../livePrescription');
const { explainPlan } = require('../../plan/explain');
const { AUTHORED_BLOCK_START_SENTENCE, blockStartSentenceFor, BLOCK_START_SENTENCE } = require('../../blockExplain');

const LIBRARY = CORPUS.map((e) => ({ id: canonicalExerciseId(e.name), ...corpusEntryToSeedRow(e) }));
const BY_NAME = Object.fromEntries(LIBRARY.map((r) => [r.name, r]));

function buildFacts() {
  const routines = OFFSEASON_ALLAN.sessions.map((s, i) => ({
    routineId: `r${i + 1}`,
    rows: s.exercises.map((e, j) => ({ routineExerciseId: `re${i + 1}_${j + 1}`, exerciseId: BY_NAME[e.name]?.id ?? null })),
  }));
  return factsForAuthoredBlock(buildAuthoredFacts(OFFSEASON_ALLAN, { routines, exerciseByName: BY_NAME }).facts,
    { blockNumber: 1, mesocycleId: 'm1' });
}

// The block's weeks and its planned rows as activation writes them.
const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ id: `w${i}`, index: i, deload: i === 8 }));
function rowsFor(facts) {
  const t = authoredWeeklyTargets(facts, 1);
  const out = [];
  for (const [m, ladder] of Object.entries(t)) {
    ladder.forEach((n, k) => out.push({ mesocycle_week_id: `w${k + 1}`, muscle: m, planned_sets: n, mev: 0, mav: 0, mrv: 30 }));
  }
  return out;
}
const fromWeek = (i) => WEEKS.filter((w) => w.index >= i);
function checkin(facts, week, signal, extra = {}) {
  return authoredCheckin({ facts, weeks: fromWeek(week), rows: rowsFor(facts).filter((r) => Number(r.mesocycle_week_id.slice(1)) >= week), signal, ...extra });
}
const slot = (facts, key) => facts.authored.sessions.flatMap((s) => s.exercises).find((x) => x.key === key);
const total = (facts, phase) => Object.values(authoredMuscleTotals(facts, phase)).reduce((a, b) => a + b, 0);
const growthOf = (facts) => {
  const by = {};
  for (const x of facts.authored.sessions.flatMap((s) => s.exercises)) {
    // eslint-disable-next-line global-require
    const n = require('../authored').authoredSlotSets(facts, x, 'growth');
    by[x.muscle] = (by[x.muscle] || 0) + n;
  }
  return by;
};

describe('D2: the raise in Growth', () => {
  test('lats onto the straight-arm pulldown (Days 1 and 4 are at 7), side delts onto Day 3 first', () => {
    const facts = buildFacts();
    const r = checkin(facts, 4, 3, { sessionNames: { r1: 'Back Width A', r2: 'Upper Chest & Arms', r3: 'Legs, Delts & Lats', r4: 'Back Width B & Arms' } });
    expect(r.applies).toBe(true);
    expect(r.nextFacts.authored.raises).toEqual({ 'd3.straight_arm_pulldown': 1, 'd3.cable_lateral': 1 });
    expect(r.card.heading).toBe('Next week: 1 more set for lats and for side delts');
    expect(r.card.lines.join(' ')).toMatch(/Cable Straight-Arm Pulldown 3 to 4/);
    expect(r.card.lines.join(' ')).toMatch(/Single-Arm Cable Lateral Raise in Legs, Delts & Lats 5 to 6/);
    // The rows: weeks 5 to 7 carry back +1 and side delts +1; week 8 stays the Reduction column.
    const byWeek = (id, m) => r.changes.find((c) => c.mesocycleWeekId === id && c.muscle === m)?.plannedSets;
    expect(byWeek('w5', 'back')).toBe(24);
    expect(byWeek('w5', 'side_delts')).toBe(21);
    expect(byWeek('w7', 'side_delts')).toBe(21);
    expect(r.changes.some((c) => c.mesocycleWeekId === 'w8')).toBe(false);
    expect(r.plan.opened).toEqual([]);
  });

  test('raises climb to 20 lats and 22 side delts, never past 7 in a session, then stop', () => {
    let facts = buildFacts();
    const seen = [];
    for (let i = 0; i < 5; i += 1) {
      const r = checkin(facts, 4, 3);
      facts = { ...r.nextFacts, authored: { ...r.nextFacts.authored, lastCheckin: undefined } };
      const g = growthOf(facts);
      seen.push([g.lats, g.side_delts]);
      for (const s of facts.authored.sessions) {
        const per = {};
        // eslint-disable-next-line global-require
        for (const x of s.exercises) per[x.muscle] = (per[x.muscle] || 0) + require('../authored').authoredSlotSets(facts, x, 'growth');
        expect(per.lats ?? 0).toBeLessThanOrEqual(7);
        expect(per.side_delts ?? 0).toBeLessThanOrEqual(7);
      }
      if (i === 4) expect(r.card.unplacedLines.join(' ')).toMatch(/Lats \(already at the plan's weekly ceiling\), Side delts \(already at the plan's weekly ceiling\)/);
    }
    expect(seen).toEqual([[18, 21], [19, 22], [20, 22], [20, 22], [20, 22]]);
    expect(facts.authored.raises).toEqual({ 'd3.straight_arm_pulldown': 3, 'd3.cable_lateral': 1, 'd4.machine_lateral': 1 });
  });

  test('a stalled exercise never takes a raised set; a held muscle is not raised', () => {
    const facts = buildFacts();
    const r = checkin(facts, 4, 3, { stalled: ['d3.straight_arm_pulldown', 'd3.cable_lateral'], held: ['side_delts'] });
    expect(r.nextFacts.authored.raises).toEqual({});
    expect(r.card.unplacedLines.join(' ')).toMatch(/Lats \(its open exercises have not progressed for 3 sessions\)/);
    expect(r.card.unplacedLines.join(' ')).toMatch(/Side delts \(held by/);
    const r2 = checkin(facts, 4, 3, { stalled: ['d3.cable_lateral'] });
    expect(r2.nextFacts.authored.raises).toEqual({ 'd3.straight_arm_pulldown': 1, 'd4.machine_lateral': 1 });
  });

  test('in the ramp a raise is the ladder\'s next week, nothing to apply', () => {
    const facts = buildFacts();
    for (const signal of [3, 2, 1]) {
      const r = checkin(facts, 1, signal);
      expect(r.applies).toBe(false);
      expect(r.changes).toEqual([]);
      expect(r.card.heading).toBe('Your plan\'s ramp carries on next week');
      expect(r.totals.after).toBe(80);
    }
    expect(checkin(facts, 5, 1).applies).toBe(false);
  });

  test('a retried Apply recomputes from the same start and never adds a set twice', () => {
    const facts = buildFacts();
    const first = checkin(facts, 4, 3);
    const retry = checkin(first.nextFacts, 4, 3);
    expect(retry.nextFacts.authored.raises).toEqual(first.nextFacts.authored.raises);
  });
});

describe('D3: hold and pull-back', () => {
  test('a hold in the ramp repeats this week and moves the later weeks back; the reduction stays at week 8', () => {
    const facts = buildFacts();
    const r = checkin(facts, 1, 0);
    expect(r.applies).toBe(true);
    expect(r.nextFacts.authored.run.phases).toEqual(['ramp1', 'ramp1', 'ramp2', 'growth', 'growth', 'growth', 'growth', 'reduction']);
    const t = authoredWeeklyTargets(r.nextFacts, 1);
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((i) => Object.values(t).reduce((a, w) => a + w[i - 1], 0)))
      .toEqual([71, 71, 80, 93, 93, 93, 93, 47]);
    expect(r.card.lines).toContain('Your plan\'s ramp pauses for a week, then carries on from this level.');
    // A withheld increase writes the same.
    const w = checkin(facts, 2, 0, { withheld: true });
    expect(w.card.lines[0]).toMatch(/^Your coach is not adding sets this week/);
    expect(w.nextFacts.authored.run.phases).toEqual(['ramp1', 'ramp2', 'ramp2', 'growth', 'growth', 'growth', 'growth', 'reduction']);
    // In Growth a hold changes nothing.
    expect(checkin(facts, 4, 0).applies).toBe(false);
  });

  test('a pull-back takes up to 2 a muscle off this week\'s level and never goes below Health', () => {
    let facts = buildFacts();
    const health = {};
    for (const x of facts.authored.sessions.flatMap((s) => s.exercises)) health[x.appMuscle] = (health[x.appMuscle] || 0) + x.sets.health;
    const before = authoredMuscleTotals(facts, 'growth');
    const r = checkin(facts, 4, -2);
    const after = authoredMuscleTotals(r.nextFacts, 'growth');
    for (const m of Object.keys(before)) {
      expect(after[m]).toBe(Math.max(health[m], Math.min(before[m], before[m] - 2)));
    }
    // Repeated pull-backs stop at the Health numbers (63 sets).
    for (let i = 0; i < 8; i += 1) {
      facts = { ...checkin(facts, 4, -2).nextFacts };
      delete facts.authored.lastCheckin;
    }
    expect(authoredMuscleTotals(facts, 'growth')).toEqual(health);
    expect(total(facts, 'growth')).toBe(63);
    // The reduction week is never trimmed.
    expect(total(facts, 'reduction')).toBe(47);
    // The next block starts from its raises, without the pull-back.
    expect(total(factsForAuthoredBlock(facts, { blockNumber: 2, mesocycleId: 'm2' }), 'growth')).toBe(93);
  });
});

describe('D4: the legs question', () => {
  test('yes adds 1 Leg Extension and 1 Seated Leg Curl once a block, quads 7 and hamstrings 5 at most', () => {
    const facts = buildFacts();
    const r = checkin(facts, 4, 1, { legsFlat: true });
    expect(r.nextFacts.authored.raises).toEqual({ 'd3.leg_extension': 1, 'd3.seated_leg_curl': 1 });
    expect(r.card.lines.join(' ')).toMatch(/Leg Extension 3 to 4 and Seated Leg Curl 4 to 5/);
    const g = growthOf(r.nextFacts);
    expect(g.quads).toBe(7);
    expect(g.hamstrings).toBe(5);
    const again = { ...r.nextFacts };
    delete again.authored.lastCheckin;
    expect(checkin(again, 5, 1, { legsFlat: true }).nextFacts.authored.raises)
      .toEqual({ 'd3.leg_extension': 1, 'd3.seated_leg_curl': 1 });
    // Not with a hold or a pull-back, and never in the ramp.
    expect(checkin(facts, 4, 0, { legsFlat: true }).nextFacts.authored.raises).toEqual({});
    expect(checkin(facts, 1, 1, { legsFlat: true }).nextFacts.authored.raises).toEqual({});
    // Block 2 carries them and never goes above the ceilings.
    const b2 = factsForAuthoredBlock(again, { blockNumber: 2, mesocycleId: 'm2' });
    const r2 = authoredCheckin({ facts: b2, weeks: fromWeek(4), rows: [], signal: 1, legsFlat: true });
    expect(growthOf(r2.nextFacts).quads).toBe(7);
    expect(growthOf(r2.nextFacts).hamstrings).toBe(5);
  });
});

describe('E1: double progression through the real resolver', () => {
  const H = Date.UTC(2026, 10, 1);
  const session = (at, weight, reps, difficulty = 3) => ({
    at, difficulty, sets: reps.map((r, i) => ({ exerciseId: 'x', weight, actualReps: r, setType: 'straight', setNumber: i + 1 })),
  });
  const prescribe = (history, authored, band = { repsMin: 6, repsMax: 10 }, extra = {}) => resolveSetPrescription(assembleEvidencePacket({
    exercise: { id: 'x', category: authored?.kind === 'isolation' ? 'isolation' : 'compound', incrementKg: 2.5 },
    prescription: band,
    rawHistory: history,
    now: H + 1000,
    authored,
    ...extra,
  }), 1);

  test('the load goes up only when EVERY set at the top load reaches the top, by 5 kg with no 5% cap', () => {
    const g = { phase: 'growth', kind: 'compound' };
    expect(prescribe([session(H, 60, [10, 10, 9])], g).weight).toBe(60);
    const up = prescribe([session(H, 60, [10, 10, 10])], g);
    expect(up.weight).toBe(65);
    expect(up.provenance).toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
    expect(up.repsTarget).toBe(6);
    // The house rule on the same history: best set topped is enough, 2.5 kg.
    expect(prescribe([session(H, 60, [10, 10, 9])], null).weight).toBe(62.5);
    // Harder than planned holds.
    expect(prescribe([session(H, 60, [10, 10, 10], 4)], g).weight).toBe(60);
    // Isolation: 2.5 kg.
    expect(prescribe([session(H, 40, [12, 12])], { phase: 'growth', kind: 'isolation' }, { repsMin: 8, repsMax: 12 }).weight).toBe(42.5);
  });

  test('the ramp holds the load; the reduction week holds it at the bottom of the range', () => {
    expect(prescribe([session(H, 60, [10, 10, 10])], { phase: 'ramp1', kind: 'compound' }).weight).toBe(60);
    const red = prescribe([session(H, 60, [10, 10, 10])], { phase: 'reduction', kind: 'compound' });
    expect(red.weight).toBe(60);
    expect(red.repsTarget).toBe(6);
  });

  test('F3: the long-gap re-entry still eases the first session back on this plan', () => {
    const g = { phase: 'growth', kind: 'compound' };
    const back = resolveSetPrescription(assembleEvidencePacket({
      exercise: { id: 'x', category: 'compound' },
      prescription: { repsMin: 6, repsMax: 10 },
      rawHistory: [session(H, 60, [10, 10, 10])],
      senior: { layoffDays: 30 },
      now: H + 1000,
      authored: g,
    }), 1);
    expect(back.provenance).toBe(PROVENANCE.SENIOR_RECOVERY_HOLD);
    expect(back.weight).toBe(54);
  });

  test('a lateral with a big stack step builds reps to 20 before the load goes up', () => {
    const lat = { phase: 'growth', kind: 'isolation', repsFirst: true };
    const band = { repsMin: 10, repsMax: 15 };
    // 2.5 kg on 15 kg is a 17% step: reps first.
    const held = prescribe([session(H, 15, [15, 15, 15])], lat, band);
    expect(held.weight).toBe(15);
    expect(held.repsTarget).toBeGreaterThan(15);
    expect(prescribe([session(H, 15, [20, 20, 20])], lat, band).weight).toBe(17.5);
    // On 40 kg the step is small: the top of the range is enough.
    expect(prescribe([session(H, 40, [15, 15, 15])], lat, band).weight).toBe(42.5);
    // The last raise dropped reps by 6: reps first again.
    const dropped = [session(H, 40, [9, 9, 9]), session(H - 7 * 864e5, 37.5, [15, 15, 15])];
    expect(prescribe(dropped, lat, band).repsTarget).toBeGreaterThanOrEqual(10);
    expect(prescribe([session(H, 40, [15, 15, 15]), session(H - 7 * 864e5, 37.5, [15, 15, 15]), session(H - 14 * 864e5, 35, [15, 15, 15])], lat, band).weight).toBe(42.5);
  });
});

describe('E2: the stall rule', () => {
  const facts = buildFacts();
  const straight = slot(facts, 'd3.straight_arm_pulldown');
  const s = (w, reps, extra = {}) => ({ phase: 'growth', recoveryFine: true, sets: reps.map((r) => ({ weight: w, actualReps: r, setType: 'straight' })), ...extra });

  test('3 Growth sessions without a gain: the plain message with only the listed substitutions', () => {
    const stall = authoredStall({ facts, exerciseId: straight.exerciseId, routineId: 'r3', sessions: [s(30, [15, 14, 13]), s(30, [15, 14, 13]), s(30, [15, 15, 13]), s(30, [15, 15, 13])] });
    expect(stall.message).toBe('No progress on Cable Straight-Arm Pulldown for 3 sessions. Check sleep and food first. If both are fine, swap to Cable Lat Pullover or Machine Pullover for 4 to 6 weeks.');
    expect(stall.slotKey).toBe('d3.straight_arm_pulldown');
    expect(stall.message).not.toMatch(/rep range|15-20/);
  });

  test('no stall with a gain, with poor recovery, on ramp sessions or with too few sessions', () => {
    const flat = [s(30, [15, 14, 13]), s(30, [15, 14, 13]), s(30, [15, 14, 13]), s(30, [15, 14, 13])];
    expect(authoredStall({ facts, exerciseId: straight.exerciseId, sessions: [s(32.5, [12, 12, 12]), ...flat.slice(1)] })).toBeNull();
    expect(authoredStall({ facts, exerciseId: straight.exerciseId, sessions: [{ ...flat[0], recoveryFine: false }, ...flat.slice(1)] })).toBeNull();
    expect(authoredStall({ facts, exerciseId: straight.exerciseId, sessions: flat.map((x, i) => (i === 3 ? { ...x, phase: 'ramp2' } : x)) })).toBeNull();
    expect(authoredStall({ facts, exerciseId: straight.exerciseId, sessions: flat.slice(0, 3) })).toBeNull();
    expect(authoredStall({ facts: { version: 2 }, exerciseId: straight.exerciseId, sessions: flat })).toBeNull();
  });
});

describe('E3: the reduction triggers', () => {
  const ex = (tops) => ({ name: 'V-Bar Pulldown', sessions: tops.map(([w, r, d]) => ({ difficulty: d ?? 3, sets: [{ weight: w, actualReps: r, setType: 'straight' }] })) });

  test('each trigger, read from what the app records; a suggestion at two or more', () => {
    const perf = authoredReductionTriggers({ exercises: [ex([[60, 7], [60, 8], [60, 9]])] });
    expect(perf.triggers.map((t) => t.key)).toEqual(['performance']);
    expect(perf.suggested).toBe(false);
    // Different effort, or only one drop: no trigger.
    expect(authoredReductionTriggers({ exercises: [ex([[60, 7, 4], [60, 8, 3], [60, 9, 3]])] }).count).toBe(0);
    expect(authoredReductionTriggers({ exercises: [ex([[60, 7], [60, 9], [60, 9]])] }).count).toBe(0);
    expect(authoredReductionTriggers({ weekSessions: [{ jointDiscomfort: 2 }, { jointDiscomfort: 3 }] }).triggers[0].key).toBe('joints');
    expect(authoredReductionTriggers({ weekSessions: [{ jointDiscomfort: 2 }, { jointDiscomfort: 1 }] }).count).toBe(0);
    expect(authoredReductionTriggers({ weekSessions: [{ sorenessBefore: 3, missedRepMin: true }] }).triggers[0].key).toBe('soreness');
    expect(authoredReductionTriggers({ weekSessions: [{ sorenessBefore: 3, missedRepMin: false }] }).count).toBe(0);
    expect(authoredReductionTriggers({ checkin: { energyScore: 2 } }).triggers[0].key).toBe('wellbeing');
    expect(authoredReductionTriggers({ checkin: { energyScore: 4, sleepHours: 5.5 } }).triggers[0].key).toBe('wellbeing');
    expect(authoredReductionTriggers({ weeksSinceReduction: 12 }).triggers[0].key).toBe('weeks');
    expect(authoredReductionTriggers({ weeksSinceReduction: 11 }).count).toBe(0);
    const two = authoredReductionTriggers({ weekSessions: [{ jointDiscomfort: 2 }, { jointDiscomfort: 2 }], checkin: { energyScore: 2 } });
    expect(two.suggested).toBe(true);
  });

  test('Apply serves the Reduction column at RIR 3; the planned week is released only within 2 weeks', () => {
    const facts = buildFacts();
    const rows = rowsFor(facts).filter((r) => r.mesocycle_week_id === 'w5');
    const planned = rowsFor(facts).filter((r) => r.mesocycle_week_id === 'w8');
    const far = authoredReductionApply({ facts, rows, weekIndex: 5, plannedWeek: { id: 'w8', index: 8 }, plannedRows: planned });
    expect(far.rirTarget).toBe(3);
    expect(far.release).toBeNull();
    expect(far.changes.reduce((a, c) => a + c.plannedSets, 0)).toBe(47);
    const near = authoredReductionApply({ facts, rows, weekIndex: 6, plannedWeek: { id: 'w8', index: 8 }, plannedRows: planned });
    expect(near.release.weekId).toBe('w8');
    expect(near.release.rirTarget).toBe(1);
    expect(near.release.changes.reduce((a, c) => a + c.plannedSets, 0)).toBe(93);
    // Served: the early week is the Reduction column, the released week Growth.
    const served = (weekIndex, isDeload) => facts.authored.sessions.reduce((a, s) => a + Object.values(authoredServedWeek({
      facts, routineId: s.routineId, weekIndex, isDeload, exercises: s.exercises.map((x) => ({ exerciseId: x.exerciseId, slotId: x.routineExerciseId })),
    }).sets).reduce((p, q) => p + q, 0), 0);
    expect(served(6, true)).toBe(47);
    expect(served(8, false)).toBe(93);
  });
});

describe('H8, H9, F2, H5', () => {
  const facts = buildFacts();
  const press = BY_NAME['Machine Shoulder Press'].id;

  test('H8: the optional shoulder press is offered on Day 2 in Growth only and served 2 sets at RIR 2 when added', () => {
    expect(authoredOptionalFor(facts, { routineId: 'r2', phase: 'growth' }).map((o) => o.exerciseId)).toEqual([press]);
    expect(authoredOptionalFor(facts, { routineId: 'r2', phase: 'ramp2' })).toEqual([]);
    expect(authoredOptionalFor(facts, { routineId: 'r1', phase: 'growth' })).toEqual([]);
    const rows = facts.authored.sessions[1].exercises.map((x) => ({ exerciseId: x.exerciseId, slotId: x.routineExerciseId }));
    const notAdded = authoredServedWeek({ facts, routineId: 'r2', weekIndex: 3, exercises: rows });
    expect(notAdded.sets[press]).toBeUndefined();
    const added = authoredServedWeek({ facts, routineId: 'r2', weekIndex: 3, exercises: [...rows, { exerciseId: press, slotId: 'x' }] });
    expect(added.sets[press]).toBe(2);
    expect(added.rir[press]).toBe(2);
    expect(authoredServedWeek({ facts, routineId: 'r2', weekIndex: 1, exercises: [...rows, { exerciseId: press, slotId: 'x' }] }).sets[press]).toBeUndefined();
    // The add picker shows it first under its own optional heading; other plans unchanged.
    // eslint-disable-next-line global-require
    const { buildEmptyQuerySections, prependPlanOptionalSection } = require('../../exercisePickerSections');
    const base = [BY_NAME['Machine Shoulder Press'], BY_NAME['Leg Extension']];
    const plain = buildEmptyQuerySections({ base });
    const withOptional = prependPlanOptionalSection(plain, base, [press]);
    expect(withOptional[0]).toMatchObject({ key: 'optional', label: 'Optional in your plan this week' });
    expect(withOptional[0].items.map((e) => e.id)).toEqual([press]);
    expect(withOptional.slice(1).flatMap((x) => x.items).some((e) => e.id === press)).toBe(false);
    expect(prependPlanOptionalSection(plain, base, [])).toBe(plain);
  });

  test('H9: the plan screen\'s weekly effort line', () => {
    expect(authoredWeekEffortLine(facts, { routineId: 'r1', phase: 'ramp1' }))
      .toBe('This week: stop 2 reps short on pulldowns and rows; 1 to 2 on raises, flies, curls and crunches.');
    expect(authoredWeekEffortLine(facts, { routineId: 'r2', phase: 'growth' }))
      .toBe('This week: stop 1 to 2 reps short on presses; 0 to 1 on flies, raises, extensions and crunches. The last set of an isolation exercise may go to failure.');
    expect(authoredWeekEffortLine(facts, { routineId: 'r3', phase: 'reduction' }))
      .toBe('This week: stop 3 reps short on squats; 2 to 3 on curls, extensions, calf raises, raises and pulldowns.');
    expect(authoredWeekEffortLine({ version: 2 }, { routineId: 'r1', phase: 'growth' })).toBeNull();
    for (const s of facts.authored.sessions) {
      for (const p of ['ramp1', 'ramp2', 'growth', 'reduction']) expect(authoredWeekEffortLine(facts, { routineId: s.routineId, phase: p })).not.toMatch(/—/);
    }
  });

  test('F2: the spacing line states the side delts exception; the planner never shapes the schedule', () => {
    const sessions = facts.authored.sessions.map((s) => ({ id: s.routineId, name: s.name, muscles: s.exercises.map((x) => x.appMuscle) }));
    const spacing = explainPlan({ facts, sessions, week: 1 }).lines.find((l) => l.id === 'spacing');
    expect(spacing.text).toBe('Side delts are trained on back-to-back days by design: lateral raises are low in fatigue.');
    expect(facts.readiness).toBeNull();
    expect(facts.recoverySafeMax.side_delts).toBe(22);
    expect(authoredBlockPhases(facts, 1)).toEqual(['ramp1', 'ramp2', 'growth', 'growth', 'growth', 'growth', 'growth', 'reduction']);
  });

  test('H5: the activation copy says the true block length for this plan only', () => {
    expect(AUTHORED_BLOCK_START_SENTENCE).toBe('This starts an eight-week training block: two ramp weeks that build, five Growth weeks, then a lighter reduction week.');
    expect(blockStartSentenceFor({ tags: OFFSEASON_ALLAN.tags })).toBe(AUTHORED_BLOCK_START_SENTENCE);
    expect(blockStartSentenceFor({ tags: 'gender:men goal:mens_physique' })).toBe(BLOCK_START_SENTENCE);
    expect(blockStartSentenceFor(null)).toBe(BLOCK_START_SENTENCE);
  });
});

describe('the capability lane on this plan (lead ruling): the reintroduction ramp caps the served sets', () => {
  const facts = buildFacts();
  const week = (weekIndex, caps) => {
    const by = {};
    for (const sess of facts.authored.sessions) {
      const out = authoredServedWeek({
        facts, routineId: sess.routineId, weekIndex, caps,
        exercises: sess.exercises.map((x) => ({ exerciseId: x.exerciseId, slotId: x.routineExerciseId })),
      });
      for (const x of sess.exercises) by[x.key] = out.sets[x.exerciseId];
    }
    return by;
  };
  const sideDelts = (by) => ['d1.cable_lateral', 'd2.machine_lateral', 'd3.cable_lateral', 'd4.machine_lateral'].reduce((a, k) => a + by[k], 0);

  test('min(ladder, ramp level): side delts capped, every other muscle on the ladder', () => {
    const free = week(4, null);
    for (const [cap, want] of [[12, 12], [14, 14], [18, 18], [20, 20], [30, 20]]) {
      const by = week(4, { side_delts: cap });
      expect(sideDelts(by)).toBe(want);
      for (const [k, n] of Object.entries(by)) if (!/lateral/.test(k)) expect(n).toBe(free[k]);
    }
    // In a ramp week the ladder is already below the ramp's level.
    expect(sideDelts(week(1, { side_delts: 18 }))).toBe(16);
  });

  test('a typed count is capped too; another plan gets nothing', () => {
    const lateral = slot(facts, 'd3.cable_lateral');
    const typed = { ...facts, typed: { [lateral.routineExerciseId]: 7 } };
    const out = authoredServedWeek({
      facts: typed, routineId: 'r3', weekIndex: 4, caps: { side_delts: 12 },
      exercises: [{ exerciseId: lateral.exerciseId, slotId: lateral.routineExerciseId }],
    });
    expect(out.sets[lateral.exerciseId]).toBe(3);
    expect(authoredServedWeek({ facts: { version: 2 }, routineId: 'r3', weekIndex: 4, caps: { side_delts: 1 }, exercises: [] }).sets).toEqual({});
  });
});
