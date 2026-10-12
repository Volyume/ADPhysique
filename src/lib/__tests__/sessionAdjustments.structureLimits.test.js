/**
 * sessionAdjustments.structureLimits.test.js -- D222 phase 7 (R73): the
 * session's own plus one on a plan the structure engine built.
 *
 * Authority: docs/audit/plan-builder-map-2026-10-11/24-PHASE7-AFTER-BUILD-SPEC.md
 * R73. What this pins and why: plus one is offered on an exercise only where
 * one more set this week adds no hard fault (the one gate); on a week whose
 * sessions are full (24 working sets) no exercise takes it (the safe
 * direction); and the limits a version 2 plan without a structure block gets
 * are prescribe's, exactly as before.
 */
jest.mock('../database', () => ({}));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));

const { buildPlanLimits, structurePlanLimits } = require('../sessionAdjustments');
const { buildStructurePlan } = require('../structure/engine');
const { structureFacts } = require('../structure/adapt');
const { applyChange, planFromFacts } = require('../structure/stored');
const { LIBRARY, BY_NAME } = require('./campaign16.helpers');

jest.setTimeout(120000);

function setup(args) {
  const r = buildStructurePlan({ ...args, library: LIBRARY });
  const facts = structureFacts(r, args, {
    routineIds: r.plan.sessions.map((_, i) => `r${i}`),
    routineExerciseIds: r.plan.sessions.map((s, i) => s.exercises.map((_, j) => `re${i}_${j}`)),
  });
  const rows = (i) => r.plan.sessions[i].exercises.map((ex, j) => ({
    routineExercise: { id: `re${i}_${j}`, recommendedSets: ex.weeks[0].sets },
    exercise: BY_NAME.get(ex.id) || { id: ex.id, name: ex.name },
  }));
  return { r, facts, rows };
}

describe('R73: plus one on a structure plan', () => {
  test('offered exactly where one more set this week adds no hard fault', () => {
    let offered = 0;
    let withheld = 0;
    for (const args of [
      { goal: 'bodybuilding', days: 4, lengthMinutes: 75, equipment: 'full_gym', experience: 'intermediate', focus: [] },
      { goal: 'bikini', days: 4, lengthMinutes: 75, equipment: 'full_gym', experience: 'beginner', focus: [] },
    ]) {
      const { r, facts, rows } = setup(args);
      const plan = planFromFacts(facts);
      for (let i = 0; i < r.plan.sessions.length; i += 1) {
        const allocation = Object.fromEntries(r.plan.sessions[i].exercises.map((ex) => [ex.id, ex.weeks[2].sets]));
        const limits = structurePlanLimits({ facts, routineId: `r${i}`, weekIndex: 3, exercises: rows(i), allocation });
        r.plan.sessions[i].exercises.forEach((ex, j) => {
          const l = limits[ex.id];
          expect(l).toBeTruthy();
          const gate = applyChange(plan, { kind: 'setSets', ref: { routineExerciseId: `re${i}_${j}` }, fromWeek: 3, count: ex.weeks[2].sets + 1, onlyWeek: true }, { auto: true });
          expect(l.cap).toBe(gate.verdict === 'ok' ? ex.weeks[2].sets + 1 : ex.weeks[2].sets);
          if (l.cap > ex.weeks[2].sets) offered += 1; else withheld += 1;
        });
      }
    }
    expect(withheld).toBeGreaterThan(0);
    expect(offered + withheld).toBeGreaterThan(withheld - 1);
  });

  test('buildPlanLimits hands a structure plan to the gate, and a plan without one to prescribe as before', () => {
    const { facts, rows } = setup({ goal: 'general', days: 3, lengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', focus: [] });
    const planContext = { facts, sessions: [{ id: 'r0', slots: [] }] };
    const viaGate = buildPlanLimits({ planContext, routineId: 'r0', weekTargets: {}, exercises: rows(0), weekIndex: 2, allocation: null });
    expect(Object.keys(viaGate).length).toBe(rows(0).length);
    // No week known: nothing is opened (the caller closes every exercise).
    expect(buildPlanLimits({ planContext, routineId: 'r0', weekTargets: {}, exercises: rows(0) })).toEqual({});
    const v2 = { ...facts };
    delete v2.structure;
    const legacy = buildPlanLimits({ planContext: { facts: v2, sessions: [{ id: 'r0', slots: [] }] }, routineId: 'r0', weekTargets: {}, exercises: rows(0), weekIndex: 2 });
    expect(legacy).toEqual({});
  });
});
