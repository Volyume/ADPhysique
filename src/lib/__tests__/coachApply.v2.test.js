/**
 * coachApply.v2.test.js -- D219 lane A3: computeVolumeApply for a plan the new
 * planner built (design 4.10; register D219, founder answer Q6: only
 * computeVolumeApply and computeWeeklySessionAllocation change in
 * coachApply.js, the calorie floors and every ED path untouched).
 *
 * What this pins, and why:
 *   1. Every other plan is byte-identical: with no plan context, a context
 *      whose facts are not version 2, or a context without sessions, the
 *      function returns exactly what it returned before (the legacy suites,
 *      coachApply.test.js and applyWiring.fq4.test.js, stay unedited and
 *      green; this suite adds the same answer for the new parameter's
 *      absence and for a non-v2 context).
 *   2. For a v2 plan the step is placed, not added to next week's rows for
 *      one week: a hold writes this week's level (today a hold writes
 *      nothing and has no Apply), a +3 raises each muscle that can take it
 *      to this week's level plus 3, a pull-back takes 2 off, and the level
 *      carries into every later week. The function the screen calls and the
 *      pure placement module agree row for row (one number everywhere).
 *   3. The rows written never put an exercise past its cap in any week, and
 *      a held muscle (a capability limit or a soreness answer) is never
 *      raised (CC31, section 20) while a reduction still passes.
 *   4. ED-safety: this file still reaches no part of the recovery model and
 *      only the two named functions changed (the guard lives in
 *      src/lib/recovery/__tests__/edIsolation.guard.test.js, made transitive).
 */
import fs from 'fs';
import path from 'path';
import { computeVolumeApply } from '../coachApply';
import { planCheckin } from '../plan/checkinPlacement';
import { prescribeWeek } from '../plan/prescribe';
import { exerciseCap } from '../plan/science';

const WEEK_IDS = ['w0', 'w1', 'w2', 'w3', 'w4', 'w5'];

function sessions() {
  return [
    {
      id: 's0',
      slots: [
        { id: 'a', name: 'Barbell Bench Press', muscle: 'chest', kind: 'heavy_compound', baseSets: 3, credits: {} },
        { id: 'b', name: 'Incline Dumbbell Press', muscle: 'chest', kind: 'mod_compound', baseSets: 3, credits: {} },
        { id: 'c', name: 'Triceps Pushdown', muscle: 'triceps', kind: 'isolation', baseSets: 3, credits: {} },
      ],
    },
    {
      id: 's1',
      slots: [
        { id: 'd', name: 'Flat Dumbbell Press', muscle: 'chest', kind: 'mod_compound', baseSets: 4, credits: {} },
        { id: 'e', name: 'Pec Deck (Machine Fly)', muscle: 'chest', kind: 'isolation', baseSets: 2, credits: {} },
        { id: 'f', name: 'Overhead Triceps Extension', muscle: 'triceps', kind: 'isolation', baseSets: 3, credits: {} },
      ],
    },
  ];
}
const FACTS = {
  version: 2,
  roles: { chest: 'standard', triceps: 'standard' },
  exposureShares: { chest: { s0: 0.5, s1: 0.5 } },
  sessionCaps: {},
  gapRanks: { s0: 1, s1: 0 },
};
function rowsFor(paths) {
  const rows = [];
  for (const [muscle, list] of Object.entries(paths)) {
    list.forEach((planned, i) => rows.push({
      id: `pmv_${WEEK_IDS[i]}_${muscle}`, mesocycle_week_id: WEEK_IDS[i], week_index: i, muscle, planned_sets: planned, mev: 4, mav: 14, mrv: 24, source: 'template',
    }));
  }
  return rows;
}
const PATHS = { chest: [8, 10, 12, 14, 16, 8], triceps: [4, 6, 6, 6, 6, 3] };
const weeks = (from) => WEEK_IDS.slice(from).map((id, i) => ({ id, index: from + i, deload: id === 'w5' }));
const CATALOGUE = {
  triceps: [
    { name: 'Triceps Pushdown', exerciseId: 'ex-pushdown', role: 'pushdown', kind: 'isolation', credits: {} },
    { name: 'Overhead Triceps Extension', exerciseId: 'ex-overhead', role: 'overhead', kind: 'isolation', credits: {} },
    { name: 'Skull Crusher', exerciseId: 'ex-skull', role: 'skull', kind: 'isolation', credits: {} },
  ],
};
const ctx = (over = {}) => ({ facts: FACTS, sessions: sessions(), weeks: weeks(2), catalogue: CATALOGUE, ...over });

// The legacy rows: one week, next week's, as getPlannedMuscleVolume returns them.
const LEGACY_ROWS = [
  { muscle: 'chest', planned_sets: 12, mev: 8, mav: 16, mrv: 22 },
  { muscle: 'triceps', planned_sets: 6, mev: 4, mav: 10, mrv: 14 },
  { muscle: 'quads', planned_sets: 14, mev: 8, mav: 14, mrv: 18 },
];

describe('every other plan is byte-identical', () => {
  test('no plan context: the legacy clamp to [mev, mrv] and the hold rule are unchanged', () => {
    expect(computeVolumeApply(LEGACY_ROWS, 2)).toEqual([
      { muscle: 'chest', plannedSets: 14, mev: 8, mav: 16, mrv: 22 },
      { muscle: 'triceps', plannedSets: 8, mev: 4, mav: 10, mrv: 14 },
      { muscle: 'quads', plannedSets: 16, mev: 8, mav: 14, mrv: 18 },
    ]);
    expect(computeVolumeApply(LEGACY_ROWS, -2)).toEqual([
      { muscle: 'chest', plannedSets: 10, mev: 8, mav: 16, mrv: 22 },
      { muscle: 'triceps', plannedSets: 4, mev: 4, mav: 10, mrv: 14 },
      { muscle: 'quads', plannedSets: 12, mev: 8, mav: 14, mrv: 18 },
    ]);
    expect(computeVolumeApply(LEGACY_ROWS, 3, ['triceps'])).toEqual([
      { muscle: 'chest', plannedSets: 15, mev: 8, mav: 16, mrv: 22 },
      { muscle: 'quads', plannedSets: 17, mev: 8, mav: 14, mrv: 18 },
    ]);
    // a hold has never written anything on the legacy path
    expect(computeVolumeApply(LEGACY_ROWS, 0)).toEqual([]);
    expect(computeVolumeApply(null, 2)).toEqual([]);
  });

  test('a context that is not version 2, or has no sessions, takes the legacy path unchanged', () => {
    const plain = computeVolumeApply(LEGACY_ROWS, 2, ['triceps']);
    expect(computeVolumeApply(LEGACY_ROWS, 2, ['triceps'], null)).toEqual(plain);
    expect(computeVolumeApply(LEGACY_ROWS, 2, ['triceps'], { facts: { version: 1 }, sessions: sessions(), weeks: weeks(2) })).toEqual(plain);
    expect(computeVolumeApply(LEGACY_ROWS, 2, ['triceps'], { facts: FACTS })).toEqual(plain);
    expect(computeVolumeApply(LEGACY_ROWS, 0, null, { facts: { version: 1 }, sessions: sessions(), weeks: weeks(2) })).toEqual([]);
  });
});

describe('a v2 plan: the step is placed and carried forward', () => {
  test('a hold writes this week\'s level (today it writes nothing)', () => {
    const changes = computeVolumeApply(rowsFor(PATHS), 0, null, ctx());
    expect(changes.length).toBeGreaterThan(0);
    const w3 = Object.fromEntries(changes.filter((c) => c.mesocycleWeekId === 'w3').map((c) => [c.muscle, c.plannedSets]));
    expect(w3.chest).toBe(12);
  });

  test('+3 raises each muscle that can take it to this week\'s level plus 3', () => {
    const changes = computeVolumeApply(rowsFor(PATHS), 3, null, ctx());
    const w3 = Object.fromEntries(changes.filter((c) => c.mesocycleWeekId === 'w3').map((c) => [c.muscle, c.plannedSets]));
    expect(w3.chest).toBe(15);
    expect(w3.triceps).toBe(9);
  });

  test('a pull-back takes 2 off this week\'s level', () => {
    const changes = computeVolumeApply(rowsFor(PATHS), -2, null, ctx());
    const w3 = Object.fromEntries(changes.filter((c) => c.mesocycleWeekId === 'w3').map((c) => [c.muscle, c.plannedSets]));
    expect(w3.chest).toBe(10);
  });

  test('the level carries into later weeks: each change names its week', () => {
    const changes = computeVolumeApply(rowsFor(PATHS), 0, null, ctx());
    const weeksWritten = new Set(changes.map((c) => c.mesocycleWeekId));
    expect(weeksWritten.has('w3')).toBe(true);
    expect(weeksWritten.has('w4')).toBe(true);
    for (const c of changes) {
      expect(Number.isInteger(c.plannedSets)).toBe(true);
      expect(Number.isInteger(c.weekIndex)).toBe(true);
    }
  });

  test('the same rows as the placement module, row for row', () => {
    for (const signal of [3, 2, 0, -2]) {
      for (const withheld of [false, true]) {
        const context = ctx({ withheld });
        const direct = planCheckin({
          sessions: context.sessions, facts: context.facts, weeks: context.weeks, rows: rowsFor(PATHS), signal, withheld, held: [], catalogue: context.catalogue,
        }).changes;
        expect(computeVolumeApply(rowsFor(PATHS), signal, null, context)).toEqual(direct);
      }
    }
  });

  test('a held muscle is never raised, and a reduction still passes for it (CC31)', () => {
    const raised = computeVolumeApply(rowsFor(PATHS), 3, ['triceps'], ctx());
    expect(raised.some((c) => c.muscle === 'triceps')).toBe(false);
    expect(raised.some((c) => c.muscle === 'chest')).toBe(true);
    const asSet = computeVolumeApply(rowsFor(PATHS), 3, new Set(['triceps']), ctx());
    expect(asSet).toEqual(raised);
    const reduced = computeVolumeApply(rowsFor(PATHS), -2, ['triceps'], ctx());
    expect(reduced.some((c) => c.muscle === 'triceps')).toBe(true);
  });

  test('a recovery week as next week writes nothing', () => {
    expect(computeVolumeApply(rowsFor(PATHS), 3, null, ctx({ weeks: weeks(4) }))).toEqual([]);
  });

  test('no exercise is past its cap in any week after the check-in', () => {
    for (const signal of [3, 0, -2]) {
      const changes = computeVolumeApply(rowsFor(PATHS), signal, null, ctx());
      const merged = rowsFor(PATHS).map((r) => ({ ...r }));
      for (const c of changes) {
        const row = merged.find((r) => r.mesocycle_week_id === c.mesocycleWeekId && r.muscle === c.muscle);
        row.planned_sets = c.plannedSets;
      }
      const plan = planCheckin({ sessions: sessions(), facts: FACTS, weeks: weeks(2), rows: rowsFor(PATHS), signal, catalogue: CATALOGUE });
      for (const w of weeks(3)) {
        const targets = {};
        for (const r of merged.filter((x) => x.mesocycle_week_id === w.id)) targets[r.muscle] = r.planned_sets;
        const final = plan.sessions;
        const served = prescribeWeek({ sessions: final, weekTargets: targets, facts: { exposureShares: FACTS.exposureShares, sessionCaps: FACTS.sessionCaps } });
        for (const s of final) {
          for (const slot of s.slots) {
            const n = served.sets[slot.id];
            expect({ signal, week: w.id, slot: slot.id, ok: n <= exerciseCap(slot.kind, false, { focus: false }) }).toEqual({ signal, week: w.id, slot: slot.id, ok: true });
          }
        }
      }
    }
  });
});

describe('ED-safety: only the volume function changed, and nothing reaches the recovery model', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'coachApply.js'), 'utf8');

  test('coachApply.js imports only the two plan modules and the nutrition engine', () => {
    const imports = [...src.matchAll(/^import[^;]*from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]).sort();
    expect(imports).toEqual(['./nutritionEngine', './plan/checkinPlacement', './plan/prescribe']);
    expect(src).not.toMatch(/recovery\//);
  });

  test('the calorie floors and the floor helpers are as they were', () => {
    expect(src).toMatch(/export const KCAL_FLOOR = 1200;/);
    expect(src).toMatch(/export const KCAL_FLOOR_MALE = 1500;/);
    expect(src).toMatch(/const newKcal = Math\.max\(kcalFloorForSex\(sex\), current \+ change\);/);
    expect(src).toMatch(/export const ABSOLUTE_WEEKLY_SET_CEILING = 30;/);
  });

  test('computeVolumeApply\'s legacy clamp to [mev, mrv] is still there, after the v2 branch', () => {
    const body = src.slice(src.indexOf('export function computeVolumeApply('), src.indexOf('export function computeWeeklySessionAllocation('));
    expect(body).toMatch(/if \(next < mev\) next = mev;/);
    expect(body).toMatch(/if \(next > mrv\) next = mrv;/);
    expect(body.indexOf('planContext?.facts?.version === 2')).toBeLessThan(body.indexOf('if (next < mev) next = mev;'));
  });
});
