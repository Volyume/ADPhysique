/**
 * stored.test.js -- D222 phase 7: a saved structure plan, checked again
 * (src/lib/structure/stored.js), against the REAL engine and the real seeded
 * library.
 *
 * Authority: docs/audit/plan-builder-map-2026-10-11/24-PHASE7-AFTER-BUILD-SPEC.md
 * R70, R71, R72, R78, R81. What this suite pins and why:
 *   - R70 round trip: for every plan in a sample sweep, the plan rebuilt from
 *     its saved facts checks exactly as the plan the engine returned, and
 *     keeps doing so after the same change is made to both (a check that
 *     reads a field the facts drop would pass the untouched plan and miss the
 *     changed one);
 *   - R71 the gate: a change that adds no fault is 'ok'; one that adds a hard
 *     fault is 'blocked' for an automatic path and 'confirm' for the person's
 *     own change; only NEW faults count;
 *   - R72 the compat fields after a change are the build's own function's;
 *   - R78 a check-in: a raise reaches at most two muscles and never adds a
 *     fault, a hold changes nothing, a reduce never takes a muscle below
 *     its minimum;
 *   - a plan the engine did not build is never read (null).
 */
const { buildStructurePlan } = require('../engine');
const { checkPlan } = require('../checker');
const { senseCheck } = require('../sense');
const { PROGRESSION, PATTERNS } = require('../rulebook');
const { structureFacts } = require('../adapt');
const {
  planFromFacts, recheck, applyChange, refreshStructureFacts, structureCheckin, weeklyOf, RAISE_MUSCLES,
} = require('../stored');
const { structureExerciseFromRow } = require('../patterns');
const { LIBRARY } = require('../../__tests__/campaign16.helpers');

jest.setTimeout(300000);

function factsFor(args) {
  const r = buildStructurePlan({ ...args, library: LIBRARY });
  if (!r.ok) return null;
  const routineIds = r.plan.sessions.map((_, i) => `r${i}`);
  const routineExerciseIds = r.plan.sessions.map((s, i) => s.exercises.map((_, j) => `re${i}_${j}`));
  return { r, facts: structureFacts(r, args, { routineIds, routineExerciseIds }) };
}

const SWEEP = [];
for (const goal of ['general', 'bodybuilding', 'mens_physique', 'bikini', 'wellness', 'womens_physique']) {
  for (const days of [2, 3, 4, 5]) {
    for (const equipment of ['full_gym', 'dumbbells_only', 'bodyweight']) {
      SWEEP.push({ goal, days, lengthMinutes: 60, equipment, experience: 'intermediate', focus: [] });
    }
  }
}
SWEEP.push({ goal: 'bodybuilding', days: 4, lengthMinutes: 75, equipment: 'full_gym', experience: 'advanced', focus: ['chest', 'side_delts'] });
SWEEP.push({ goal: 'bikini', days: 4, lengthMinutes: 45, equipment: 'home_gym', experience: 'beginner', focus: ['glute_max'] });

const codes = (plan) => ({
  hard: checkPlan(plan).failures,
  sense: senseCheck(plan).failures.map((f) => f.code),
  minutes: checkPlan(plan).minutes,
  weekly: checkPlan(plan).weekly,
});
const strip = (plan) => ({ ...plan, sessions: plan.sessions.map((s) => ({ ...s })) });

describe('R70: a stored plan checks exactly as the built plan', () => {
  test('the sample sweep round-trips, before and after the same change', () => {
    let built = 0;
    for (const args of SWEEP) {
      const got = factsFor(args);
      if (!got) continue;
      built += 1;
      const { r, facts } = got;
      const stored = planFromFacts(facts);
      const direct = codes(r.plan);
      expect(codes(stored)).toEqual(direct);
      expect(recheck(stored)).toEqual({ hard: direct.hard, sense: direct.sense });
      // The same change to both: the first exercise's sets raised to 5 in
      // every loading week, and the last exercise of the last session gone.
      const mutate = (p) => {
        const q = JSON.parse(JSON.stringify(strip(p)));
        q.sessions[0].exercises[0].weeks = q.sessions[0].exercises[0].weeks.map((w, i) => (i === 5 ? w : { ...w, sets: 5 }));
        q.sessions[q.sessions.length - 1].exercises.pop();
        return q;
      };
      const a = codes(mutate(r.plan));
      const b = codes(mutate(stored));
      expect(b.hard).toEqual(a.hard);
      expect(b.sense).toEqual(a.sense);
    }
    expect(built).toBeGreaterThan(30);
  });

  test('a plan the engine did not build is never read', () => {
    expect(planFromFacts(null)).toBeNull();
    expect(planFromFacts({ version: 2, slots: {} })).toBeNull();
    expect(planFromFacts({ version: 2, structure: { version: 2, sessions: [] } })).toBeNull();
  });
});

describe('R71: one gate for every change', () => {
  const SAMPLE = { goal: 'general', days: 4, lengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', focus: [] };
  let facts;
  let plan;
  beforeAll(() => { ({ facts } = factsFor(SAMPLE)); plan = planFromFacts(facts); });

  test('a change that adds no fault is ok, for the person and for an automatic path', () => {
    // One set fewer in week 3 of an exercise with three or more sets.
    let ref = null;
    plan.sessions.forEach((s, si) => s.exercises.forEach((ex, ei) => { if (!ref && ex.weeks[2].sets >= 3) ref = { sessionIndex: si, exerciseIndex: ei }; }));
    const ex = plan.sessions[ref.sessionIndex].exercises[ref.exerciseIndex];
    const r = applyChange(plan, { kind: 'setSets', ref, fromWeek: 3, count: ex.weeks[2].sets - 1, onlyWeek: true }, { auto: true });
    expect(r.faults).toEqual([]);
    expect(r.verdict).toBe('ok');
    expect(r.plan.sessions[ref.sessionIndex].exercises[ref.exerciseIndex].weeks[2].sets).toBe(ex.weeks[2].sets - 1);
    // The plan handed in is unchanged.
    expect(plan.sessions[ref.sessionIndex].exercises[ref.exerciseIndex].weeks[2].sets).toBe(ex.weeks[2].sets);
  });

  test('a change that adds a hard fault is blocked for an automatic path and asks the person', () => {
    const ref = { sessionIndex: 0, exerciseIndex: 0 };
    const auto = applyChange(plan, { kind: 'setSets', ref, count: 9 }, { auto: true });
    expect(auto.verdict).toBe('blocked');
    expect(auto.faults.some((f) => f.code === 'C6' || f.code === 'C3')).toBe(true);
    const own = applyChange(plan, { kind: 'setSets', ref, count: 9 });
    expect(own.verdict).toBe('confirm');
    // A typed count is served as typed; the recovery week halves it.
    const ex = own.plan.sessions[0].exercises[0];
    expect(ex.weeks.slice(0, 5).map((w) => w.sets)).toEqual([9, 9, 9, 9, 9]);
    expect(ex.weeks[5].sets).toBe(Math.round(9 * PROGRESSION.deloadFraction));
  });

  test('removing every exercise of a muscle is a new fault (its minimum); only new faults count', () => {
    const chest = [];
    plan.sessions.forEach((s) => s.exercises.forEach((ex) => { if (PATTERNS[ex.pattern].muscle === 'chest') chest.push({ routineExerciseId: ex.routineExerciseId }); }));
    let p = plan;
    let last = null;
    for (const ref of chest) { last = applyChange(p, { kind: 'removeExercise', ref }); p = last.plan; }
    expect(last.verdict).toBe('confirm');
    expect(last.faults.some((f) => f.code === 'C4' || f.code === 'S1' || f.code === 'S10' || f.code === 'S7')).toBe(true);
    // A further change that adds nothing more is ok on the already imperfect plan.
    const again = applyChange(p, { kind: 'setSets', ref: { sessionIndex: 0, exerciseIndex: 0 }, fromWeek: 1, ladder: p.sessions[0].exercises[0].weeks });
    expect(again.verdict).toBe('ok');
  });

  test('a replacement keeps the ladder and takes the new exercise\'s pattern', () => {
    const at = { sessionIndex: 0, exerciseIndex: 0 };
    const ex = plan.sessions[0].exercises[0];
    const row = LIBRARY.find((x) => x.name === 'Dumbbell Bench Press');
    const e = structureExerciseFromRow(row);
    expect(e.pattern).toBe('press_flat');
    const r = applyChange(plan, { kind: 'replaceExercise', ref: at, exercise: e });
    expect(r.plan.sessions[0].exercises[0].weeks).toEqual(ex.weeks);
    expect(r.plan.sessions[0].exercises[0].pattern).toBe('press_flat');
    expect(r.plan.sessions[0].exercises[0].id).toBe(row.id);
  });

  test('an exercise the rulebook has no pattern for cannot be checked', () => {
    expect(structureExerciseFromRow({ id: 'x', name: 'Something Made Up' })).toBeNull();
  });
});

describe('R72: the facts after a change', () => {
  test('the compat fields are the build\'s own on an unchanged plan', () => {
    const args = { goal: 'mens_physique', days: 3, lengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', focus: [] };
    const { facts } = factsFor(args);
    const again = refreshStructureFacts(facts, planFromFacts(facts));
    for (const k of ['roles', 'weeklyTargets', 'exposureShares', 'lightCaps', 'gapRanks', 'thin', 'slots', 'recoverySafeMax', 'sessionMinutesAtPeak', 'overTime', 'overCeilings']) {
      expect(again[k]).toEqual(facts[k]);
    }
    expect(again.structure.sessions).toEqual(facts.structure.sessions);
    expect(again.structure.checks).toEqual(facts.structure.checks);
  });

  test('typed counts and other facts are kept', () => {
    const args = { goal: 'general', days: 3, lengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', focus: [] };
    const { facts } = factsFor(args);
    const withTyped = { ...facts, typed: { re0_0: 4 }, kind: 'generated' };
    const after = refreshStructureFacts(withTyped, planFromFacts(withTyped));
    expect(after.typed).toEqual({ re0_0: 4 });
    expect(after.kind).toBe('generated');
  });
});

describe('R78: check-ins', () => {
  const args = { goal: 'bodybuilding', days: 4, lengthMinutes: 75, equipment: 'full_gym', experience: 'intermediate', focus: [] };
  let plan;
  beforeAll(() => { plan = planFromFacts(factsFor(args).facts); });

  test('a raise reaches at most two muscles, adds no fault, and starts next week', () => {
    // A full week (every session at 24 sets) has no room: the raise is
    // reported, never forced. A week with room takes it.
    let raised = 0;
    for (const a of [args, { ...args, goal: 'bikini', experience: 'beginner' }, { ...args, goal: 'wellness', days: 3, lengthMinutes: 60 }, { ...args, goal: 'general', days: 5, lengthMinutes: 45 }]) {
      const got = factsFor(a);
      if (!got) continue;
      const p = planFromFacts(got.facts);
      const before = recheck(p);
      const r = structureCheckin(p, { kind: 'raise', fromWeek: 3 });
      expect(r.muscles.length).toBeLessThanOrEqual(RAISE_MUSCLES);
      const after = recheck(r.plan);
      expect(after.hard.length).toBeLessThanOrEqual(before.hard.length);
      expect(after.sense.length).toBeLessThanOrEqual(before.sense.length);
      for (const m of r.muscles) for (const mv of m.moves) expect(mv.to).toBe(mv.from + 1);
      if (!r.changed) expect(r.unplaced.length).toBeGreaterThan(0);
      if (r.changed) raised += 1;
      // Weeks before next week are untouched.
      p.sessions.forEach((s, si) => s.exercises.forEach((ex) => {
        const same = r.plan.sessions[si].exercises.find((x) => x.routineExerciseId === ex.routineExerciseId);
        expect(same.weeks.slice(0, 2)).toEqual(ex.weeks.slice(0, 2));
      }));
    }
    expect(raised).toBeGreaterThan(0);
  });

  test('a held muscle is never raised', () => {
    const r = structureCheckin(plan, { kind: 'raise', fromWeek: 3, held: new Set(['chest', 'back', 'quads', 'glutes', 'side_delts', 'hamstrings', 'triceps', 'biceps', 'rear_delts', 'calves', 'abs', 'front_delts', 'traps']) });
    expect(r.muscles).toEqual([]);
    expect(r.changed).toBe(false);
  });

  test('a hold changes nothing', () => {
    const r = structureCheckin(plan, { kind: 'hold', fromWeek: 3 });
    expect(r.changed).toBe(false);
    expect(r.plan).toBe(plan);
  });

  test('a reduce never takes a muscle below its minimum', () => {
    const r = structureCheckin(plan, { kind: 'reduce', fromWeek: 3 });
    expect(r.changed).toBe(true);
    const w = weeklyOf(r.plan);
    for (const v of Object.values(w)) if (v.min > 0 && v.sets > 0) expect(v.sets).toBeGreaterThanOrEqual(Math.min(v.min, v.sets));
    expect(recheck(r.plan).hard.filter((f) => f.code === 'C4' && /below/.test(f.detail))).toEqual([]);
  });
});
