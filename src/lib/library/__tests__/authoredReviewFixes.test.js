/**
 * authoredReviewFixes.test.js -- review fixes 1 and 4 on the founder's
 * off-season library plan (docs/audit/offseason-allan-2026-10-12/01-SPEC.md
 * C1 and F1), against the REAL definition and serve code.
 *
 * What this pins, and why:
 *   1. The session +1 limits give a lat slot room only up to the plan's
 *      per-session ceiling for LATS (7), counted apart from the upper back
 *      (both are the app muscle 'back'), so a +1 on a pulldown can never make
 *      8 lat sets in a session. The upper-back row is not bound by the lat
 *      ceiling, and a plan that is not authored gets nothing.
 *   2. A hand-added exercise (in no slot) is offered only the listed options
 *      of slots that train its muscle, and none when no slot does; an
 *      exercise in a slot still gets exactly its own slot's options.
 *   3. authoredPlanState reads a programme row as authored, other, or
 *      unknown (fail closed) without ever treating an unreadable row as
 *      "not authored".
 */
const { OFFSEASON_ALLAN } = require('../offseasonAllan');
const { authoredPlanLimits, authoredSwapOptions, authoredPlanState } = require('../authored');
const { buildAuthoredFacts } = require('../authoredFacts');
const { CORPUS, corpusEntryToSeedRow } = require('../../exerciseCorpus');
const { canonicalExerciseId } = require('../../exercise/canonicalId');

const LIBRARY = CORPUS.map((e) => ({ id: canonicalExerciseId(e.name), ...corpusEntryToSeedRow(e) }));
const BY_NAME = Object.fromEntries(LIBRARY.map((r) => [r.name, r]));

function buildFacts() {
  const routines = OFFSEASON_ALLAN.sessions.map((s, i) => ({
    routineId: `r${i + 1}`,
    rows: s.exercises.map((e, j) => ({ routineExerciseId: `re${i + 1}_${j + 1}`, exerciseId: BY_NAME[e.name]?.id ?? null })),
  }));
  return buildAuthoredFacts(OFFSEASON_ALLAN, { routines, exerciseByName: BY_NAME }).facts;
}

describe('review fix 1: the session +1 keeps lats inside the plan\'s per-session ceiling', () => {
  const facts = buildFacts();
  const session = facts.authored.sessions[0];
  const rows = session.exercises.map((x) => ({ exercise: { id: x.exerciseId }, routineExercise: { id: x.routineExerciseId } }));
  const limitsAt = (weekIndex) => authoredPlanLimits({
    facts, routineId: session.routineId, weekIndex, exercises: rows, houseCaps: { directCap: 8, fractionalCap: 11 },
  });
  const slot = (key) => session.exercises.find((x) => x.key === key);

  test('week 1 (Ramp 1): 6 lat sets and 2 row sets leave ONE set of room for a lat slot, not the back\'s two', () => {
    const limits = limitsAt(1);
    const pulldown = limits[slot('d1.lat_pulldown').exerciseId];
    expect(pulldown.sessionDirect).toBe(8); // 4 + 2 lats + 2 row, the app muscle 'back'
    expect(pulldown.sessionDirectCap - pulldown.sessionDirect).toBe(1);
    expect(pulldown.sessionFractionalCap - pulldown.sessionFractional).toBe(1);
    // The row is upper back: the lat ceiling does not bind it, the back's cap does.
    const row = limits[slot('d1.chest_supported_row').exerciseId];
    expect(row.sessionDirectCap - row.sessionDirect).toBe(2);
  });

  test('Growth: lats already at 7 in the session leave a lat slot no room at all', () => {
    const limits = limitsAt(4);
    for (const key of ['d1.lat_pulldown', 'd1.single_arm_pulldown']) {
      const l = limits[slot(key).exerciseId];
      expect(l.sessionDirectCap - l.sessionDirect).toBeLessThanOrEqual(0);
    }
  });

  test('never above the ceiling whatever a person typed: 5 typed on a pulldown (5 + 3 lats) leaves no room', () => {
    const typed = { ...facts, typed: { [slot('d1.lat_pulldown').routineExerciseId]: 5 } };
    const limits = authoredPlanLimits({
      facts: typed, routineId: session.routineId, weekIndex: 1, exercises: rows, houseCaps: { directCap: 8, fractionalCap: 11 },
    });
    const l = limits[slot('d1.single_arm_pulldown').exerciseId];
    expect(l.sessionDirectCap - l.sessionDirect).toBeLessThanOrEqual(0);
  });

  test('side delts keep their ceiling of 7 (Day 3: 5 lateral raises leave room for 2 at most)', () => {
    const s3 = facts.authored.sessions[2];
    const r3 = s3.exercises.map((x) => ({ exercise: { id: x.exerciseId }, routineExercise: { id: x.routineExerciseId } }));
    const l = authoredPlanLimits({
      facts, routineId: s3.routineId, weekIndex: 3, exercises: r3, houseCaps: { directCap: 8, fractionalCap: 11 },
    })[s3.exercises.find((x) => x.key === 'd3.cable_lateral').exerciseId];
    expect(l.sessionDirectCap).toBeLessThanOrEqual(7);
  });
});

describe('review fix 4: a hand-added exercise is offered only same-muscle listed options', () => {
  const facts = buildFacts();
  const pulldown = facts.authored.sessions[0].exercises[0];

  test('an exercise in a slot still gets its own slot\'s options', () => {
    const options = authoredSwapOptions(facts, pulldown.exerciseId, { routineId: 'r1', muscle: 'back' });
    expect(options.size).toBeGreaterThan(0);
    expect(options.has(pulldown.exerciseId)).toBe(false);
  });

  test('a hand-added back exercise is offered listed options of back slots only', () => {
    const options = authoredSwapOptions(facts, 'hand-added-row', { routineId: 'r1', muscle: 'back' });
    expect(options.size).toBeGreaterThan(0);
    const back = new Set();
    for (const s of facts.authored.sessions) {
      for (const x of s.exercises) {
        if (x.appMuscle === 'back') [x.exerciseId, ...x.subs.map((y) => y.exerciseId)].forEach((id) => back.add(id));
      }
    }
    for (const id of options) expect(back.has(id)).toBe(true);
  });

  test('no slot shares the muscle: nothing is offered', () => {
    expect(authoredSwapOptions(facts, 'hand-added', { routineId: 'r1', muscle: 'forearms' }).size).toBe(0);
    expect(authoredSwapOptions(facts, 'hand-added', { muscle: null }).size).toBe(0);
  });

  test('a plan that is not authored has no restriction', () => {
    expect(authoredSwapOptions({ version: 2 }, 'x', { muscle: 'back' })).toBeNull();
  });
});

describe('review fix 4: authoredPlanState fails closed', () => {
  test('authored, other and unknown', () => {
    expect(authoredPlanState({ planFacts: JSON.stringify({ kind: 'authored' }) })).toBe('authored');
    expect(authoredPlanState({ planFacts: { kind: 'authored' } })).toBe('authored');
    expect(authoredPlanState({ planFacts: JSON.stringify({ version: 2 }) })).toBe('other');
    expect(authoredPlanState({ planFacts: null })).toBe('other');
    expect(authoredPlanState(null)).toBe('other');
    expect(authoredPlanState({ planFacts: '{"kind":"authored", broken' })).toBe('authored');
    expect(authoredPlanState({ planFacts: '{not json' })).toBe('unknown');
    expect(authoredPlanState(null, false)).toBe('unknown');
  });
});
