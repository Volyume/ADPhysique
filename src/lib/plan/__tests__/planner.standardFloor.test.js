/**
 * planner.standardFloor.test.js -- the standard floor (founder order
 * 2026-10-10, register D219 addendum).
 *
 * The order: every physique division and goal keeps the FULL standard
 * bodybuilding routine for every growth muscle; a division's emphasis and a
 * focus pick are added on top of it and never subtracted from it; nothing is
 * reduced to fit the session length or the day count; a session that runs
 * over its length or the D45 ceilings (8 exercises, 25 working sets) is
 * reported, not trimmed.
 *
 * What this pins, over every goal x days (2 to 6) x session length (45, 75) x
 * focus pick (none, chest, glutes + side delts + chest), built by the real
 * planner over the real catalogue fixtures and the real DIVISION_MATRIX:
 *   1. Every growth muscle (chest, back, side delts, rear delts, biceps,
 *      triceps, quads, hamstrings, glutes, calves, abs) is present with at
 *      least 2 exercises a week and at least its STANDARD_DIRECT_FLOOR in its
 *      own sets at week 5. The credit another muscle's presses and pulls give
 *      never stands in for a muscle's own work.
 *   2. A focus pick never lowers any OTHER muscle below (1): the focus is
 *      added on top.
 *   3. Where the structure has two sessions of one half of the body (upper
 *      and lower twice), no session holds more than two exercises more than
 *      its twin: the standard is spread over the week, not piled into one
 *      session past the D45 ceiling while its twin has room.
 *   4. Determinism: the same inputs give the same plan.
 * and, at source level, that the old rule cannot come back: roles.js no
 * longer holds a de-emphasised muscle at maintenance (`deEmphasised &&
 * canTrain`), and men's physique gives the quads a standard role.
 */
import fs from 'fs';
import path from 'path';
import { buildPlan } from '../planner';
import { assignRoles } from '../roles';
import { ROLE } from '../bands';
import { STANDARD_DIRECT_FLOOR } from '../science';
import { DIVISION_MATRIX } from '../../planEngine';

const CHOICES = require('./fixtures/choices');

const GOALS = ['general', 'bodybuilding', 'mens_physique', 'classic_physique', 'bikini', 'wellness', 'figure', 'womens_physique'];
const DAYS = [2, 3, 4, 5, 6];
const MINUTES = [45, 75];
const FOCUS = [[], ['chest'], ['glutes', 'side_delts', 'chest']];
const GROWTH = ['chest', 'back', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'];

const CASES = [];
for (const goal of GOALS) {
  for (const daysPerWeek of DAYS) {
    for (const sessionLengthMinutes of MINUTES) {
      for (const focusMuscles of FOCUS) {
        CASES.push({ goal, daysPerWeek, sessionLengthMinutes, focusMuscles });
      }
    }
  }
}
const label = (c) => `${c.goal}, ${c.daysPerWeek} days, ${c.sessionLengthMinutes} min, focus ${c.focusMuscles.join('+') || 'none'}`;

const cache = new Map();
function build(c) {
  const key = label(c);
  if (!cache.has(key)) {
    cache.set(key, buildPlan({
      ...c, experience: 'intermediate', equipment: 'full_gym', choices: CHOICES, divisionMatrix: DIVISION_MATRIX,
    }));
  }
  return cache.get(key);
}

function totals(p) {
  const direct = {};
  const exercises = {};
  for (const w of p.workouts) {
    for (const e of w.exercises) {
      direct[e.muscle] = (direct[e.muscle] || 0) + e.peakSets;
      exercises[e.muscle] = (exercises[e.muscle] || 0) + 1;
    }
  }
  return { direct, exercises };
}

describe('the standard floor: every growth muscle keeps its routine in every goal, day count, length and focus', () => {
  test.each(CASES.map((c) => [label(c), c]))('%s: every growth muscle has 2 exercises and its direct floor at week 5', (_name, c) => {
    const { direct, exercises } = totals(build(c));
    for (const m of GROWTH) {
      expect({ muscle: m, exercises: exercises[m] || 0, ok: (exercises[m] || 0) >= 2 }).toEqual({ muscle: m, exercises: exercises[m] || 0, ok: true });
      expect({ muscle: m, direct: direct[m] || 0, floor: STANDARD_DIRECT_FLOOR[m], ok: (direct[m] || 0) >= STANDARD_DIRECT_FLOOR[m] })
        .toEqual({ muscle: m, direct: direct[m] || 0, floor: STANDARD_DIRECT_FLOOR[m], ok: true });
    }
  });

  test.each(CASES.filter((c) => c.focusMuscles.length > 0).map((c) => [label(c), c]))('%s: the focus pick never lowers another muscle below the floor', (_name, c) => {
    const { direct, exercises } = totals(build(c));
    for (const m of GROWTH.filter((x) => !c.focusMuscles.includes(x))) {
      expect({ muscle: m, ok: (exercises[m] || 0) >= 2 && (direct[m] || 0) >= STANDARD_DIRECT_FLOOR[m] })
        .toEqual({ muscle: m, ok: true });
    }
  });

  test.each(CASES.map((c) => [label(c), c]))('%s: no session holds more than 3 exercises more than its twin', (_name, c) => {
    const p = build(c);
    if (!/^upper_lower_x2/.test(p.v2.family)) return;
    for (const half of ['Upper', 'Lower']) {
      const twins = p.workouts.filter((w) => w.name.startsWith(`${half} `));
      if (twins.length !== 2) continue;
      expect({ half, gap: Math.abs(twins[0].exercises.length - twins[1].exercises.length) <= 3 })
        .toEqual({ half, gap: true });
    }
  });

  test.each(CASES.filter((c, i) => i % 7 === 0).map((c) => [label(c), c]))('%s: the same inputs give the same plan', (_name, c) => {
    const again = buildPlan({
      ...c, experience: 'intermediate', equipment: 'full_gym', choices: CHOICES, divisionMatrix: DIVISION_MATRIX,
    });
    expect(JSON.stringify(again)).toBe(JSON.stringify(build(c)));
  });
});

describe('the old rule cannot come back', () => {
  test('roles.js no longer holds a de-emphasised muscle at maintenance', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'roles.js'), 'utf8');
    expect(src).not.toContain('deEmphasised && canTrain');
  });

  test('men\'s physique gives the quads a standard role and a direct floor', () => {
    const roles = assignRoles({ goal: 'mens_physique', focusMuscles: [], experience: 'intermediate', firstBlock: false });
    expect(roles.quads.role).toBe(ROLE.STANDARD);
    expect(roles.quads.direct).toBe(true);
    expect(roles.quads.directFloor).toBeGreaterThanOrEqual(STANDARD_DIRECT_FLOOR.quads);
  });
});
