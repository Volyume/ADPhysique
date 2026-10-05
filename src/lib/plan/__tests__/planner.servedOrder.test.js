/**
 * D219 phase-close review, finding 3: the plan's numbers are the numbers
 * served. The logger serves a plan's sessions through prescribeWeek() in the
 * rotation order the plan is saved in, and prescribe() breaks a tie by that
 * order, so the planner must prescribe and read its readiness in the same
 * order. Before the fix the planner prescribed in its family order: on the
 * real catalogue, 6 of 360 plans saved a week-1 count the logger did not
 * serve, and 30 reported a readiness verdict for sets nobody would be served
 * (3 days, 75 minutes, general, focus biceps: Full Body A squat stored 3,
 * served 2).
 *
 * Pinned, over real catalogue plans (full gym and dumbbells only, 3 to 5
 * days, with and without a focus muscle, and a slow recoverer with a learned
 * factor):
 *   - week 1 served in the saved order is each exercise's saved count;
 *   - the peak week served is each exercise's planned peak;
 *   - the readiness the plan reports (passes and each muscle's lowest
 *     reading) is the readiness of the weeks as served, read at the spacing
 *     and on the clocks the plan was checked with.
 *
 * Design 4.14 step 4 (review finding 5): each muscle's recovery-safe weekly
 * maximum (v2.recoverySafeMax, kept in the plan's facts, which a check-in
 * clamps to) is at least its planned peak; serving every training week with
 * EVERY muscle at its maximum together (a check-in raises them at once, and a
 * squat's sets credit the glutes) keeps every muscle that passed the
 * readiness check recovered, and so does each muscle at its maximum alone. A
 * muscle the check finds short, or a maintenance muscle, stays at its peak.
 */
import { buildPlan } from '../planner';
import { prescribeWeek } from '../prescribe';
import { resolveCatalogue } from '../catalogue';
import { simulateBlock, lowestByMuscle } from '../readiness';
import { spacingLayouts } from '../rotation';
import { BLOCK } from '../science';
import { recoveryHours, TYPICAL_WEEK_GAP_HOURS } from '../../recovery/constants';
import { DIVISION_MATRIX } from '../../planEngine';

const { LIBRARY } = require('../../__tests__/campaign16.helpers');

const CASES = [];
for (const equipment of ['full_gym', 'dumbbells_only']) {
  const choices = resolveCatalogue({ library: LIBRARY, profile: equipment });
  const credits = {};
  for (const list of Object.values(choices)) for (const c of list) credits[c.name] = c.credits || {};
  for (const daysPerWeek of [3, 4, 5]) {
    for (const sessionLengthMinutes of [60, 75]) {
      for (const goal of ['general', 'mens_physique']) {
        for (const focusMuscles of [[], ['biceps']]) {
          CASES.push({ equipment, choices, credits, daysPerWeek, sessionLengthMinutes, goal, focusMuscles, personal: null });
        }
      }
    }
    CASES.push({ equipment, choices, credits, daysPerWeek, sessionLengthMinutes: 75, goal: 'general', focusMuscles: ['biceps'], personal: { recoveryRating: 'slow', learnedFactor: 1.15 } });
  }
}

function served(p, credits, week, raise = null, all = null) {
  const sessions = p.workouts.map((w) => ({
    id: w.sessionKey,
    slots: w.exercises.map((e) => ({
      id: e.slotKey, muscle: e.muscle, kind: e.kind, baseSets: e.sets, credits: credits[e.name] || {},
      thinEquipment: e.thinEquipment, focus: p.v2.roles[e.muscle] === 'focus',
    })),
  }));
  const weekTargets = Object.fromEntries(Object.entries(p.v2.weeklyTargets).map(([m, list]) => [m, list[week - 1]]));
  if (raise && week <= BLOCK.peakWeek) weekTargets[raise.muscle] = Math.max(weekTargets[raise.muscle], raise.sets);
  if (all && week <= BLOCK.peakWeek) for (const [m, n] of Object.entries(all)) weekTargets[m] = Math.max(weekTargets[m] ?? 0, n);
  return prescribeWeek({ sessions, weekTargets, facts: { exposureShares: p.v2.exposureShares, sessionCaps: p.v2.sessionCaps } });
}

function readServed(p, credits, raise = null, all = null) {
  const weekLoads = [];
  let placed = 0;
  for (let week = 1; week <= BLOCK.weeks; week++) {
    const r = served(p, credits, week, raise, all);
    if (raise && week === BLOCK.peakWeek) {
      for (const w of p.workouts) for (const e of w.exercises) if (e.muscle === raise.muscle) placed += r.sets[e.slotKey];
    }
    const loads = [];
    for (const w of p.workouts) {
      loads[Number(w.sessionKey.slice(1))] = { direct: r.perSession[w.sessionKey]?.direct || {}, fractional: r.perSession[w.sessionKey]?.fractional || {} };
    }
    weekLoads.push(loads);
  }
  const layouts = spacingLayouts(p.daysPerWeek, TYPICAL_WEEK_GAP_HOURS[p.daysPerWeek], null);
  const sim = simulateBlock({
    order: p.v2.order.map((k) => Number(k.slice(1))),
    weekLoads,
    rirLadder: BLOCK.rirLadder,
    layout: layouts.own || layouts.typical,
    hoursFor: (m, sets, rir) => recoveryHours(m, { sets, rirTarget: rir, recoveryRating: 'average', personalFactor: null }),
  });
  return { sim, placed };
}

const label = (c) => `${c.daysPerWeek} days, ${c.sessionLengthMinutes} min, ${c.goal}, ${c.equipment}, focus ${c.focusMuscles.join('+') || 'none'}${c.personal ? ', slow with a learned factor' : ''}`;

describe('the plan the planner checked is the plan the logger serves', () => {
  test.each(CASES.map((c) => [label(c), c]))('%s', (_name, c) => {
    const p = buildPlan({
      daysPerWeek: c.daysPerWeek, sessionLengthMinutes: c.sessionLengthMinutes, goal: c.goal, experience: 'intermediate',
      equipment: c.equipment, choices: c.choices, divisionMatrix: DIVISION_MATRIX, focusMuscles: c.focusMuscles, ...(c.personal || {}),
    });
    const weekLoads = [];
    for (let week = 1; week <= BLOCK.weeks; week++) {
      const r = served(p, c.credits, week);
      for (const w of p.workouts) {
        for (const e of w.exercises) {
          if (week === 1) expect({ e: e.name, week1: r.sets[e.slotKey] }).toEqual({ e: e.name, week1: e.sets });
          if (week === BLOCK.peakWeek) expect({ e: e.name, peak: r.sets[e.slotKey] }).toEqual({ e: e.name, peak: e.peakSets });
        }
      }
      const loads = [];
      for (const w of p.workouts) {
        loads[Number(w.sessionKey.slice(1))] = { direct: r.perSession[w.sessionKey]?.direct || {}, fractional: r.perSession[w.sessionKey]?.fractional || {} };
      }
      weekLoads.push(loads);
    }
    const layouts = spacingLayouts(c.daysPerWeek, TYPICAL_WEEK_GAP_HOURS[c.daysPerWeek], null);
    const rating = c.personal ? c.personal.recoveryRating : 'average';
    const factor = c.personal ? c.personal.learnedFactor : null;
    const sim = simulateBlock({
      order: p.v2.order.map((k) => Number(k.slice(1))),
      weekLoads,
      rirLadder: BLOCK.rirLadder,
      layout: layouts.own || layouts.typical,
      hoursFor: (m, sets, rir) => recoveryHours(m, { sets, rirTarget: rir, recoveryRating: rating, personalFactor: factor }),
    });
    expect({ passes: sim.passes, lowest: lowestByMuscle(sim.readings) }).toEqual(p.v2.readiness);
  });
});

describe('the recovery-safe weekly maximum a check-in is clamped to (design 4.14 step 4)', () => {
  const cases = CASES.filter((c) => !c.personal && c.equipment === 'full_gym' && c.goal === 'general' && c.focusMuscles.length === 0);
  test.each(cases.map((c) => [label(c), c]))('%s', (_name, c) => {
    const p = buildPlan({
      daysPerWeek: c.daysPerWeek, sessionLengthMinutes: c.sessionLengthMinutes, goal: c.goal, experience: 'intermediate',
      equipment: c.equipment, choices: c.choices, divisionMatrix: DIVISION_MATRIX, focusMuscles: c.focusMuscles,
    });
    const failing = new Set(readServed(p, c.credits).sim.failures.map((f) => f.muscle));
    for (const [m, max] of Object.entries(p.v2.recoverySafeMax)) {
      const peak = Math.max(...p.v2.weeklyTargets[m].slice(0, BLOCK.peakWeek));
      expect({ m, atLeastPeak: max >= peak }).toEqual({ m, atLeastPeak: true });
      if (failing.has(m) || p.v2.roles[m] === 'maintenance') {
        expect({ m, max }).toEqual({ m, max: peak });
        continue;
      }
      const at = readServed(p, c.credits, { muscle: m, sets: max });
      expect({ m, max, newFailures: at.sim.failures.filter((f) => !failing.has(f.muscle)).map((f) => f.muscle) }).toEqual({ m, max, newFailures: [] });
    }
    const together = readServed(p, c.credits, null, p.v2.recoverySafeMax);
    expect(Array.from(new Set(together.sim.failures.filter((f) => !failing.has(f.muscle)).map((f) => f.muscle)))).toEqual([]);
  });

  test('the maximum is not trivially the peak: some muscle of a 4-day 75-minute plan can take more', () => {
    const c = CASES.find((x) => !x.personal && x.equipment === 'full_gym' && x.daysPerWeek === 4 && x.sessionLengthMinutes === 75 && x.goal === 'general' && x.focusMuscles.length === 0);
    const p = buildPlan({
      daysPerWeek: 4, sessionLengthMinutes: 75, goal: 'general', experience: 'intermediate',
      equipment: c.equipment, choices: c.choices, divisionMatrix: DIVISION_MATRIX, focusMuscles: [],
    });
    const above = Object.entries(p.v2.recoverySafeMax).filter(([m, max]) => max > Math.max(...p.v2.weeklyTargets[m].slice(0, BLOCK.peakWeek)));
    expect(above.length).toBeGreaterThan(0);
  });
});
