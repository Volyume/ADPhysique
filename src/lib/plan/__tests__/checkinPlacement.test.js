/**
 * checkinPlacement.test.js -- D219 lane A3: the weekly check-in's step for
 * next week, placed set by set (design 4.10 and 4.11, docs/audit/
 * plan-builder-science-2026-10-04/00-AUDIT-AND-PLAN.md; register D219).
 *
 * What this pins, and why:
 *   1. Caps hold in every week after any check-in. The founder: "I've seen
 *      instances where I have 6 sets in an exercise as we progress" and "in
 *      check ins if the detail is to add 3 sets per muscle group for example
 *      those 3 sets should be spread out on exercises and if needed a new
 *      exercise and sets redistributed". Today's coach adds the signal to
 *      every muscle's row for one week and the FQ-4 multiplier rounds each
 *      exercise up, so a +3 served a 4-set bench press as a 7-set one. Over
 *      real planner output (several shapes), every signal and every check-in
 *      week, no exercise passes its cap, no muscle passes its session cap, no
 *      session passes D45's 25 working sets because of a check-in, and no
 *      target passes its role's ceiling.
 *   2. A +3 spreads: it lands on three exercises, never on one, when three
 *      have room.
 *   3. A new exercise opens only when every existing slot of the muscle is
 *      capped, comes from the catalogue (never one already in the session,
 *      never a role the session covers), and goes in the session with the
 *      longest gap after it.
 *   4. What does not fit is reported, never forced: the target stops at what
 *      can be placed and the unplaced sets are counted.
 *   5. The steps: +3 or +2 adds 3, +1 is the plan's own climb (nothing to
 *      apply), a hold and a withheld increase keep this week's level, a
 *      pull-back removes 2 and never goes below maintenance. The new level
 *      carries forward: later weeks climb the plan's own steps from it, and
 *      the recovery week never passes the week before it.
 *   6. One number everywhere: the sets the card names are exactly what
 *      prescribe() serves next week from the rows the check-in writes.
 *   7. Copy: every card line describes (D204), has no em dash, no banned
 *      word, and every kind says what happens if it is left (design 4.10).
 *   8. Purity: the same input gives the same answer whatever the key order,
 *      and the module never reads src/lib/recovery.
 */
import fs from 'fs';
import path from 'path';
import {
  planCheckin, describeCheckin, checkinKind, checkinStep, roleCeiling,
  CHECKIN_KIND, PULL_BACK_FLOOR,
} from '../checkinPlacement';
import { prescribeWeek } from '../prescribe';
import {
  exerciseCap, PER_SESSION, SESSION_CEILINGS, ROLE_TARGETS, CHECKIN_STEPS,
} from '../science';
import { buildPlan } from '../planner';
import { DIVISION_MATRIX } from '../../planEngine';

const CHOICES = require('./fixtures/choices');

const NEVER = /\b(too much|near the limit|overtrain(ed|ing)?|junk|cut back|you should|reduce your|train more|train less|risk|danger(ous)?|must|should|avoid|never|always|recommend(ed)?|need to|try to)\b/i;
const EM_DASH = /\u2014/;

// ── a small hand-made plan: chest in two sessions, triceps in two ─────────
// Chest: s0 bench (cap 4) and incline (cap 4), s1 bench and fly (cap 3).
// Triceps: one isolation exercise in each session (cap 3 each).
function smallSessions() {
  return [
    {
      id: 's0',
      slots: [
        { id: 'a', name: 'Barbell Bench Press', exerciseId: 'ex-bench', muscle: 'chest', kind: 'heavy_compound', baseSets: 3, credits: { triceps: 0.5 } },
        { id: 'b', name: 'Incline Dumbbell Press', exerciseId: 'ex-incline', muscle: 'chest', kind: 'mod_compound', baseSets: 3, credits: { triceps: 0.5 } },
        { id: 'c', name: 'Triceps Pushdown', exerciseId: 'ex-pushdown', muscle: 'triceps', kind: 'isolation', baseSets: 3, credits: {} },
      ],
    },
    {
      id: 's1',
      slots: [
        { id: 'd', name: 'Barbell Bench Press', exerciseId: 'ex-bench', muscle: 'chest', kind: 'heavy_compound', baseSets: 4, credits: { triceps: 0.5 } },
        { id: 'e', name: 'Pec Deck (Machine Fly)', exerciseId: 'ex-fly', muscle: 'chest', kind: 'isolation', baseSets: 2, credits: {} },
        { id: 'f', name: 'Overhead Triceps Extension', exerciseId: 'ex-overhead', muscle: 'triceps', kind: 'isolation', baseSets: 3, credits: {} },
      ],
    },
  ];
}

const SMALL_FACTS = {
  version: 2,
  roles: { chest: 'standard', triceps: 'standard' },
  exposureShares: { chest: { s0: 0.5, s1: 0.5 } },
  sessionCaps: {},
  gapRanks: { s0: 1, s1: 0 },
};

// Weeks w0..w5 (the last is the recovery week).
const WEEK_IDS = ['w0', 'w1', 'w2', 'w3', 'w4', 'w5'];
function weeksFrom(currentIndex, lastIsDeload = true) {
  return WEEK_IDS.slice(currentIndex).map((id, i) => ({
    id, index: currentIndex + i, deload: lastIsDeload && id === 'w5',
  }));
}
function rowsFor(paths) {
  const rows = [];
  for (const [muscle, list] of Object.entries(paths)) {
    list.forEach((planned, i) => rows.push({
      mesocycle_week_id: WEEK_IDS[i], week_index: i, muscle, planned_sets: planned, mev: 4, mav: 14, mrv: 24, source: 'template',
    }));
  }
  return rows;
}
const CHEST_TRICEPS = { chest: [8, 10, 12, 14, 16, 8], triceps: [4, 6, 6, 6, 6, 3] };

const CATALOGUE = {
  chest: [
    { name: 'Barbell Bench Press', exerciseId: 'ex-bench', role: 'flat_press', rank: 1, kind: 'heavy_compound', credits: { triceps: 0.5 } },
    { name: 'Incline Dumbbell Press', exerciseId: 'ex-incline', role: 'incline_press', rank: 2, kind: 'mod_compound', credits: { triceps: 0.5 } },
    { name: 'Pec Deck (Machine Fly)', exerciseId: 'ex-fly', role: 'fly', rank: 3, kind: 'isolation', credits: {} },
  ],
  triceps: [
    { name: 'Triceps Pushdown', exerciseId: 'ex-pushdown', role: 'pushdown', rank: 1, kind: 'isolation', credits: {} },
    { name: 'Overhead Triceps Extension', exerciseId: 'ex-overhead', role: 'overhead', rank: 2, kind: 'isolation', credits: {} },
    { name: 'Skull Crusher', exerciseId: 'ex-skull', role: 'skull', rank: 3, kind: 'isolation', credits: {} },
  ],
};

function run(over = {}) {
  return planCheckin({
    sessions: smallSessions(),
    facts: SMALL_FACTS,
    weeks: weeksFrom(2),
    rows: rowsFor(CHEST_TRICEPS),
    signal: 3,
    catalogue: CATALOGUE,
    ...over,
  });
}

const serveWith = (sessions, targets, facts) => prescribeWeek({
  sessions, weekTargets: targets, facts: { exposureShares: facts.exposureShares, sessionCaps: facts.sessionCaps },
});

describe('the steps (design 4.10)', () => {
  test('the signal maps to the five cards the design names', () => {
    expect(checkinKind(3)).toBe(CHECKIN_KIND.INCREASE);
    expect(checkinKind(2)).toBe(CHECKIN_KIND.INCREASE);
    expect(checkinKind(1)).toBe(CHECKIN_KIND.PLANNED_CLIMB);
    expect(checkinKind(0)).toBe(CHECKIN_KIND.HOLD);
    expect(checkinKind(0, { withheld: true })).toBe(CHECKIN_KIND.WITHHELD);
    expect(checkinKind(-2)).toBe(CHECKIN_KIND.PULL_BACK);
    expect(checkinStep(CHECKIN_KIND.INCREASE)).toBe(CHECKIN_STEPS.strong);
    expect(checkinStep(CHECKIN_KIND.PLANNED_CLIMB)).toBe(CHECKIN_STEPS.plannedClimb);
    expect(checkinStep(CHECKIN_KIND.HOLD)).toBe(CHECKIN_STEPS.hold);
    expect(checkinStep(CHECKIN_KIND.WITHHELD)).toBe(CHECKIN_STEPS.hold);
    expect(checkinStep(CHECKIN_KIND.PULL_BACK)).toBe(CHECKIN_STEPS.pullBack);
  });

  test('+1 is the plan\'s own climb: nothing to apply and nothing written', () => {
    const plan = run({ signal: 1 });
    expect(plan.kind).toBe(CHECKIN_KIND.PLANNED_CLIMB);
    expect(plan.applies).toBe(false);
    expect(plan.changes).toEqual([]);
    expect(plan.plannedClimb).toBe(2);
  });

  test('+3 adds 3 to this week\'s level for each muscle that can take it', () => {
    const plan = run();
    const next = Object.fromEntries(plan.changes.filter((c) => c.mesocycleWeekId === 'w3').map((c) => [c.muscle, c.plannedSets]));
    // chest: this week 12 + 3 = 15 (the plan had 14); triceps: 6 + 3 = 9 (the plan had 6)
    expect(next.chest).toBe(15);
    expect(next.triceps).toBe(9);
  });

  test('+2 proposes the same +3 step as +3 (design 4.10: "+3 or +2")', () => {
    const a = run({ signal: 3 });
    const b = run({ signal: 2 });
    expect(b.changes).toEqual(a.changes);
  });

  test('a hold keeps this week\'s level for next week, then the plan\'s climb resumes from it', () => {
    const plan = run({ signal: 0 });
    expect(plan.kind).toBe(CHECKIN_KIND.HOLD);
    expect(plan.applies).toBe(true);
    const byWeek = (id) => Object.fromEntries(plan.changes.filter((c) => c.mesocycleWeekId === id).map((c) => [c.muscle, c.plannedSets]));
    expect(byWeek('w3').chest).toBe(12); // the plan had 14
    expect(byWeek('w4').chest).toBe(14); // 12 + the plan's own climb of 2 (was 16)
    // the recovery week never passes the week before it, and is otherwise the plan's own
    expect(byWeek('w5').chest).toBeUndefined();
  });

  test('a hold never adds a set to any muscle: where the plan\'s own next week is already lower, it stands', () => {
    // Triceps: this week 6, the plan has 5 next week (a dip). A hold must not lift it to 6.
    const rows = rowsFor({ chest: CHEST_TRICEPS.chest, triceps: [4, 6, 6, 5, 6, 3] });
    for (const held of [[], ['triceps']]) {
      const plan = run({ rows, signal: 0, held });
      const next = Object.fromEntries(plan.changes.filter((c) => c.mesocycleWeekId === 'w3').map((c) => [c.muscle, c.plannedSets]));
      expect(next.triceps).toBeUndefined();
      expect(plan.changes.every((c) => c.plannedSets <= (rows.find((r) => r.mesocycle_week_id === c.mesocycleWeekId && r.muscle === c.muscle).planned_sets))).toBe(true);
    }
  });

  test('a withheld increase is a hold: the same writes', () => {
    const hold = run({ signal: 0 });
    const withheld = run({ signal: 0, withheld: true });
    expect(withheld.kind).toBe(CHECKIN_KIND.WITHHELD);
    expect(withheld.changes).toEqual(hold.changes);
  });

  test('a pull-back takes 2 off this week\'s level and carries it forward', () => {
    const plan = run({ signal: -2 });
    expect(plan.kind).toBe(CHECKIN_KIND.PULL_BACK);
    const byWeek = (id) => Object.fromEntries(plan.changes.filter((c) => c.mesocycleWeekId === id).map((c) => [c.muscle, c.plannedSets]));
    expect(byWeek('w3').chest).toBe(10); // 12 - 2 (the plan had 14)
    expect(byWeek('w4').chest).toBe(12); // 10 + 2
  });

  test('a pull-back never goes below maintenance, and never raises a muscle', () => {
    // Triceps this week 5, direct; its credit from chest sets keeps it near maintenance.
    const low = { chest: [8, 10, 12, 14, 16, 8], triceps: [4, 5, 5, 6, 6, 3] };
    const plan = run({ rows: rowsFor(low), signal: -2 });
    const next = Object.fromEntries(plan.changes.filter((c) => c.mesocycleWeekId === 'w3').map((c) => [c.muscle, c.plannedSets]));
    const sessions = smallSessions();
    const after = serveWith(sessions, { chest: next.chest ?? 14, triceps: next.triceps ?? 6 }, SMALL_FACTS);
    const frac = Object.values(after.perSession).reduce((a, s) => a + (s.fractional.triceps || 0), 0);
    expect(frac).toBeGreaterThanOrEqual(PULL_BACK_FLOOR);
    expect(next.triceps === undefined || next.triceps <= 6).toBe(true);
  });

  test('a muscle held by a capability limit or a soreness answer is not raised', () => {
    const plan = run({ held: ['triceps'] });
    const next = Object.fromEntries(plan.changes.filter((c) => c.mesocycleWeekId === 'w3').map((c) => [c.muscle, c.plannedSets]));
    expect(next.triceps).toBeUndefined(); // untouched: the plan's own climb stands
    expect(next.chest).toBe(15);
    expect(plan.notRaised).toEqual(expect.arrayContaining([{ muscle: 'triceps', why: 'held' }]));
  });

  test('a maintenance muscle and a muscle with no exercise in the plan are not raised', () => {
    const facts = { ...SMALL_FACTS, roles: { chest: 'standard', triceps: 'maintenance' } };
    const rows = rowsFor({ ...CHEST_TRICEPS, calves: [4, 4, 4, 4, 4, 2] });
    const plan = run({ facts, rows });
    const touched = new Set(plan.changes.map((c) => c.muscle));
    expect(touched.has('triceps')).toBe(false);
    expect(touched.has('calves')).toBe(false);
    expect(touched.has('chest')).toBe(true);
  });

  test('nothing is raised past the role ceiling: standard and raised 24, focus 30', () => {
    expect(roleCeiling('standard')).toBe(ROLE_TARGETS.raised.high);
    expect(roleCeiling('raised')).toBe(ROLE_TARGETS.raised.high);
    expect(roleCeiling('focus')).toBe(ROLE_TARGETS.focus.plannedCeiling);
  });

  test('the recovery week is never the week a check-in writes next', () => {
    const plan = run({ weeks: weeksFrom(4) }); // next week (w5) is the recovery week
    expect(plan.changes).toEqual([]);
    expect(plan.applies).toBe(false);
    expect(plan.reason).toBe('recoveryWeek');
  });
});

describe('placement set by set (design 4.10 steps 1 to 3)', () => {
  test('a +3 lands on three exercises, never on one', () => {
    const plan = run();
    const chest = plan.muscles.find((m) => m.muscle === 'chest');
    expect(chest.to - chest.from).toBe(3);
    expect(chest.moves.length).toBe(3);
    expect(chest.moves.reduce((a, m) => a + (m.to - m.from), 0)).toBe(3);
    // every exercise that moved went up by one set
    for (const m of chest.moves) expect(m.to - m.from).toBe(1);
    expect(chest.unplaced).toBe(0);
  });

  test('the preview is exactly what prescribe() serves next week from the rows written', () => {
    const plan = run();
    const written = {};
    for (const c of plan.changes.filter((x) => x.mesocycleWeekId === 'w3')) written[c.muscle] = c.plannedSets;
    const before = serveWith(smallSessions(), { chest: 12, triceps: 6 }, SMALL_FACTS);
    const after = serveWith(smallSessions(), { chest: written.chest, triceps: written.triceps }, SMALL_FACTS);
    for (const m of plan.muscles) {
      for (const move of m.moves) {
        expect(move.from).toBe(before.sets[move.slotId]);
        expect(move.to).toBe(after.sets[move.slotId]);
      }
    }
  });

  test('an exercise opens only when every existing slot of the muscle is capped, and comes from the catalogue', () => {
    // Chest is full (4+4 and 4+3 at the peak); triceps: 3 + 3 isolation sets, both capped.
    const paths = { chest: [8, 10, 12, 14, 16, 8], triceps: [4, 6, 6, 6, 6, 3] };
    const plan = run({ rows: rowsFor(paths), weeks: weeksFrom(2) });
    const tri = plan.muscles.find((m) => m.muscle === 'triceps');
    expect(tri.to).toBe(9);
    expect(plan.opened.length).toBe(1);
    const opened = plan.opened[0];
    expect(opened.muscle).toBe('triceps');
    // the catalogue's next role the session does not cover, and not an exercise already in it
    expect(opened.name).toBe('Skull Crusher');
    expect(opened.exerciseId).toBe('ex-skull');
    expect(opened.sets).toBeGreaterThanOrEqual(2);
    // longest gap after the session first: s1 has rank 0
    expect(opened.sessionId).toBe('s1');
    expect(tri.opened.map((o) => o.name)).toEqual(['Skull Crusher']);
  });

  test('nothing opens while an existing slot of the muscle still has room', () => {
    // Chest alone: its exercises have room for +3, so no exercise is added.
    const plan = run({ rows: rowsFor({ chest: CHEST_TRICEPS.chest }) });
    expect(plan.opened).toEqual([]);
    expect(plan.unplaced).toEqual({});
  });

  test('without a catalogue nothing opens: the sets that do not fit are reported, never forced', () => {
    const plan = run({ catalogue: {} });
    const tri = plan.muscles.find((m) => m.muscle === 'triceps');
    expect(plan.opened).toEqual([]);
    expect(tri.unplaced).toBeGreaterThan(0);
    expect(plan.unplaced.triceps).toBe(tri.unplaced);
    // the row stops at what can be placed: both exercises full at 3
    const after = serveWith(smallSessions(), { chest: 15, triceps: tri.to }, SMALL_FACTS);
    expect(after.shortfall.triceps || 0).toBe(0);
  });

  test('the structure is full: the raise is reported and no row passes what can be placed', () => {
    // Two press sessions that each hold 8 direct chest sets (two compounds at 4).
    const sessions = [
      { id: 's0', slots: [
        { id: 'a', name: 'Barbell Bench Press', muscle: 'chest', kind: 'heavy_compound', baseSets: 4, credits: {} },
        { id: 'b', name: 'Incline Dumbbell Press', muscle: 'chest', kind: 'mod_compound', baseSets: 4, credits: {} },
      ] },
      { id: 's1', slots: [
        { id: 'c', name: 'Flat Dumbbell Press', muscle: 'chest', kind: 'mod_compound', baseSets: 4, credits: {} },
        { id: 'd', name: 'Machine Chest Press', muscle: 'chest', kind: 'machine', baseSets: 4, credits: {} },
      ] },
    ];
    const facts = { ...SMALL_FACTS, roles: { chest: 'standard' }, exposureShares: { chest: { s0: 0.5, s1: 0.5 } } };
    const rows = rowsFor({ chest: [8, 10, 12, 14, 16, 8] });
    const full = planCheckin({ sessions, facts, weeks: weeksFrom(3), rows, signal: 3, catalogue: {} });
    const chest = full.muscles.find((m) => m.muscle === 'chest');
    // 14 + 3 = 17, but the two sessions hold 16: the row stops at the plan's own 16, and 1 set is reported
    expect(chest.to).toBe(16);
    expect(chest.added).toBe(2);
    expect(chest.unplaced).toBe(1);
    expect(full.unplaced.chest).toBe(1);
    expect(full.changes.filter((c) => c.muscle === 'chest')).toEqual([]);
    // and what the card says is what prescribe() serves
    const served = serveWith(sessions, { chest: 16 }, facts);
    expect(chest.moves.reduce((a, m) => a + (m.to - m.from), 0)).toBe(2);
    expect(Object.values(served.sets).reduce((a, b) => a + b, 0)).toBe(16);
  });

  test('a plan whose own week already holds more than its sessions can serve is not charged to the raise', () => {
    // s1 holds 7 (a 4 and a 3), so the plan's own 16 serves 15: the check-in adds no sets and says so.
    const full = run({ rows: rowsFor({ chest: [8, 10, 12, 14, 16, 8], triceps: [4, 6, 6, 6, 6, 3] }), weeks: weeksFrom(3), catalogue: {} });
    const chest = full.muscles.find((m) => m.muscle === 'chest');
    expect(chest.added).toBeLessThanOrEqual(chest.to - chest.from);
    expect(chest.added + chest.unplaced).toBe(3);
  });
});

describe('every week after the check-in (design 4.10, test 1 of design 11)', () => {
  test('later weeks climb the plan\'s own steps from the new level, inside the ceilings', () => {
    const plan = run();
    const byWeek = (id) => Object.fromEntries(plan.changes.filter((c) => c.mesocycleWeekId === id).map((c) => [c.muscle, c.plannedSets]));
    expect(byWeek('w3').chest).toBe(15);
    // 15 + the plan's own climb of 2 would be 17, but the two sessions hold 16: the plan's row stands
    expect(byWeek('w4').chest ?? 16).toBeLessThanOrEqual(16);
    expect(byWeek('w4').chest ?? 16).toBeGreaterThanOrEqual(15);
    // the recovery week is the plan's own unless the level before it is lower
    expect(byWeek('w5').chest).toBeUndefined();
  });

  test('the recovery week never passes the week before it', () => {
    const plan = run({ signal: -2, rows: rowsFor({ chest: [8, 10, 12, 14, 16, 12], triceps: [4, 6, 6, 6, 6, 3] }) });
    const byWeek = (id) => Object.fromEntries(plan.changes.filter((c) => c.mesocycleWeekId === id).map((c) => [c.muscle, c.plannedSets]));
    const w4 = byWeek('w4').chest ?? 16;
    const w5 = byWeek('w5').chest ?? 12;
    expect(w5).toBeLessThanOrEqual(w4);
  });

  test('every written row is a whole number and carries its week', () => {
    for (const signal of [3, 2, 0, -2]) {
      const plan = run({ signal });
      for (const c of plan.changes) {
        expect(Number.isInteger(c.plannedSets)).toBe(true);
        expect(c.plannedSets).toBeGreaterThanOrEqual(0);
        expect(typeof c.mesocycleWeekId).toBe('string');
        expect(Number.isInteger(c.weekIndex)).toBe(true);
        expect(typeof c.muscle).toBe('string');
      }
    }
  });
});

// ── real planner output: caps hold after any check-in, in every week ───────

const CREDITS = {};
for (const list of Object.values(CHOICES)) for (const c of list) CREDITS[c.name] = c.credits || {};

function plannerPlan(over = {}) {
  return buildPlan({
    daysPerWeek: 4, sessionLengthMinutes: 75, goal: 'general', experience: 'intermediate',
    equipment: 'full_gym', choices: CHOICES, divisionMatrix: DIVISION_MATRIX, ...over,
  });
}

function planParts(p) {
  const sessions = p.workouts.map((w) => ({
    id: w.sessionKey,
    slots: w.exercises.map((e) => ({
      id: e.slotKey, name: e.name, muscle: e.muscle, kind: e.kind, baseSets: e.sets, credits: CREDITS[e.name] || {},
      thinEquipment: e.thinEquipment, focus: p.v2.roles[e.muscle] === 'focus',
    })),
  }));
  const facts = {
    version: 2, roles: p.v2.roles, exposureShares: p.v2.exposureShares, sessionCaps: p.v2.sessionCaps, gapRanks: p.v2.gapRanks,
    recoverySafeMax: p.v2.recoverySafeMax,
  };
  const rows = [];
  for (const [muscle, list] of Object.entries(p.v2.weeklyTargets)) {
    list.forEach((planned, i) => rows.push({
      mesocycle_week_id: `w${i}`, week_index: i, muscle, planned_sets: planned, mev: 0, mav: null, mrv: 30, source: 'template',
    }));
  }
  const catalogue = {};
  for (const [muscle, list] of Object.entries(CHOICES)) {
    catalogue[muscle] = list.map((c, i) => ({ ...c, exerciseId: `id-${c.name}`, role: `role${i}`, rank: i + 1 }));
  }
  return { sessions, facts, rows, catalogue };
}

const SHAPES = [
  { daysPerWeek: 3, sessionLengthMinutes: 60, goal: 'general', focusMuscles: [] },
  { daysPerWeek: 4, sessionLengthMinutes: 75, goal: 'general', focusMuscles: [] },
  { daysPerWeek: 4, sessionLengthMinutes: 75, goal: 'general', focusMuscles: ['glutes', 'side_delts', 'chest'] },
  { daysPerWeek: 5, sessionLengthMinutes: 60, goal: 'mens_physique', focusMuscles: [] },
  { daysPerWeek: 6, sessionLengthMinutes: 75, goal: 'general', focusMuscles: ['biceps'] },
];
const BUILT = SHAPES.map((s) => ({ shape: s, plan: plannerPlan(s) }));
const label = ({ shape }) => `${shape.daysPerWeek} days, ${shape.sessionLengthMinutes} min, ${shape.goal}, focus ${shape.focusMuscles.join('+') || 'none'}`;

function applyChanges(rows, changes) {
  const out = rows.map((r) => ({ ...r }));
  for (const c of changes) {
    const row = out.find((r) => r.mesocycle_week_id === c.mesocycleWeekId && r.muscle === c.muscle);
    if (row) row.planned_sets = c.plannedSets;
  }
  return out;
}

describe('caps hold in every week after any check-in (planner output)', () => {
  test.each(BUILT.map((b) => [label(b), b]))('%s', (_name, { plan: built }) => {
    const { sessions, facts, rows, catalogue } = planParts(built);
    let checked = 0;
    for (const signal of [3, 2, 1, 0, -2]) {
      for (const withheld of [false, true]) {
        if (withheld && signal !== 0) continue;
        for (let current = 0; current <= 3; current++) {
          const weeks = weeksFrom(current);
          const plan = planCheckin({ sessions, facts, weeks, rows, signal, withheld, catalogue });
          // Serve every week from the check-in's next week on, from the rows written.
          const merged = applyChanges(rows, plan.changes);
          const finalSessions = [...sessions.map((s) => ({ ...s, slots: [...s.slots] }))];
          for (const o of plan.opened) {
            const s = finalSessions.find((x) => x.id === o.sessionId);
            s.slots.push({ id: o.slotId, name: o.name, muscle: o.muscle, kind: o.kind, baseSets: 2, credits: o.credits || {}, focus: facts.roles[o.muscle] === 'focus' });
          }
          for (const w of weeks.slice(1)) {
            const targets = {};
            for (const r of merged.filter((x) => x.mesocycle_week_id === w.id)) targets[r.muscle] = r.planned_sets;
            const served = serveWith(finalSessions, targets, facts);
            const wasBase = serveWith(sessions, Object.fromEntries(rows.filter((x) => x.mesocycle_week_id === w.id).map((x) => [x.muscle, x.planned_sets])), facts);
            for (const s of finalSessions) {
              for (const slot of s.slots) {
                const n = served.sets[slot.id];
                if (!Number.isFinite(n)) continue;
                const cap = exerciseCap(slot.kind, slot.thinEquipment === true, { focus: slot.focus === true });
                expect({ week: w.id, signal, slot: slot.id, n, ok: n <= cap }).toEqual({ week: w.id, signal, slot: slot.id, n, ok: true });
              }
              const per = served.perSession[s.id];
              for (const [m, d] of Object.entries(per.direct)) {
                const cap = facts.sessionCaps?.[m]?.direct ?? PER_SESSION.directCap;
                expect({ week: w.id, session: s.id, m, d, ok: d <= cap }).toEqual({ week: w.id, session: s.id, m, d, ok: true });
              }
              // a check-in never pushes a session past D45's 25 sets it was not already past
              const was = wasBase.perSession[s.id]?.workingSets || 0;
              expect({ week: w.id, session: s.id, ws: per.workingSets, ok: per.workingSets <= Math.max(SESSION_CEILINGS.workingSets, was) })
                .toEqual({ week: w.id, session: s.id, ws: per.workingSets, ok: true });
            }
            // no muscle the check-in raised passes its role ceiling (fractional)
            const raisedHere = new Set(plan.changes
              .filter((c) => c.mesocycleWeekId === w.id)
              .filter((c) => c.plannedSets > (rows.find((r) => r.mesocycle_week_id === w.id && r.muscle === c.muscle)?.planned_sets ?? Infinity))
              .map((c) => c.muscle));
            for (const m of raisedHere) {
              const frac = Object.values(served.perSession).reduce((a, s) => a + (s.fractional[m] || 0), 0);
              const baseFrac = Object.values(wasBase.perSession).reduce((a, s) => a + (s.fractional[m] || 0), 0);
              expect({ week: w.id, signal, m, ok: frac <= Math.max(roleCeiling(facts.roles[m]), baseFrac) + 1e-9 })
                .toEqual({ week: w.id, signal, m, ok: true });
            }
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
  });
});

describe('the recovery-safe weekly maximum (design 4.14 step 4; review finding 5)', () => {
  test.each(BUILT.map((b) => [label(b), b]))('%s: four +3 check-ins never take a muscle past it', (_name, { plan: built }) => {
    const { sessions, facts, catalogue } = planParts(built);
    let { rows } = planParts(built);
    const stored = Object.fromEntries(rows.map((r) => [`${r.mesocycle_week_id}:${r.muscle}`, r.planned_sets]));
    for (let current = 0; current <= 3; current++) {
      const plan = planCheckin({ sessions, facts, weeks: weeksFrom(current), rows, signal: 3, catalogue });
      rows = applyChanges(rows, plan.changes);
    }
    for (const r of rows) {
      const safe = facts.recoverySafeMax[r.muscle];
      if (!Number.isFinite(safe)) continue;
      const before = stored[`${r.mesocycle_week_id}:${r.muscle}`];
      // A row the plan already held above it stands; no row is raised past it.
      expect({ week: r.mesocycle_week_id, m: r.muscle, ok: r.planned_sets <= Math.max(safe, before) })
        .toEqual({ week: r.mesocycle_week_id, m: r.muscle, ok: true });
    }
  });

  test('a muscle at its recovery-safe maximum is not raised; with no maximum the band top still holds', () => {
    const built = BUILT[0].plan;
    const { sessions, facts, rows, catalogue } = planParts(built);
    const m = Object.keys(facts.recoverySafeMax).find((x) => facts.roles[x] !== 'maintenance' && facts.roles[x] !== undefined);
    const at = rows.find((r) => r.mesocycle_week_id === 'w1' && r.muscle === m).planned_sets;
    const capped = planCheckin({ sessions, facts: { ...facts, recoverySafeMax: { ...facts.recoverySafeMax, [m]: at } }, weeks: weeksFrom(0), rows, signal: 3, catalogue });
    expect(capped.changes.filter((c) => c.muscle === m && c.mesocycleWeekId === 'w1' && c.plannedSets > at)).toEqual([]);
    const open = planCheckin({ sessions, facts: { ...facts, recoverySafeMax: {} }, weeks: weeksFrom(0), rows, signal: 3, catalogue });
    expect(open.changes.some((c) => c.muscle === m && c.mesocycleWeekId === 'w1' && c.plannedSets > at)).toBe(true);
  });
});

describe('purity', () => {
  test('the same input gives the same answer, whatever the key order', () => {
    const a = run();
    const b = planCheckin({
      catalogue: CATALOGUE,
      signal: 3,
      rows: rowsFor(CHEST_TRICEPS).reverse(),
      weeks: weeksFrom(2),
      facts: { gapRanks: SMALL_FACTS.gapRanks, sessionCaps: {}, exposureShares: SMALL_FACTS.exposureShares, roles: { triceps: 'standard', chest: 'standard' }, version: 2 },
      sessions: smallSessions(),
    });
    const norm = (p) => JSON.stringify({ ...p, changes: [...p.changes].sort((x, y) => (x.mesocycleWeekId + x.muscle).localeCompare(y.mesocycleWeekId + y.muscle)) });
    expect(norm(b)).toBe(norm(a));
  });

  test('inputs are not mutated', () => {
    const sessions = smallSessions();
    const snapshot = JSON.stringify(sessions);
    const rows = rowsFor(CHEST_TRICEPS);
    const rowsSnap = JSON.stringify(rows);
    planCheckin({ sessions, facts: SMALL_FACTS, weeks: weeksFrom(2), rows, signal: 3, catalogue: CATALOGUE });
    expect(JSON.stringify(sessions)).toBe(snapshot);
    expect(JSON.stringify(rows)).toBe(rowsSnap);
  });

  test('the module imports only science and prescribe, and never reaches src/lib/recovery', () => {
    const raw = fs.readFileSync(path.join(__dirname, '..', 'checkinPlacement.js'), 'utf8');
    const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const imports = [...src.matchAll(/^import[^;]*from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]).sort();
    expect(imports).toEqual(['./prescribe', './science']);
    expect(src).not.toMatch(/from\s+['"][^'"]*recovery/);
    expect(src).not.toMatch(/\brequire\s*\(/);
    expect(src).not.toMatch(/Math\.random|Date\.now|new Date/);
  });
});

describe('the card copy (design 4.10, D204)', () => {
  const labelOf = (m) => m.replace(/_/g, ' ');
  const sessionNames = { s0: 'Upper A', s1: 'Upper B' };
  const kinds = [
    ['increase', run()],
    ['increase that opens an exercise', run({ rows: rowsFor({ chest: [8, 10, 12, 14, 16, 8], triceps: [4, 6, 6, 6, 6, 3] }) })],
    ['increase with sets that do not fit', run({ catalogue: {} })],
    ['increase with a held muscle', run({ held: ['triceps'] })],
    ['plannedClimb', run({ signal: 1 })],
    ['hold', run({ signal: 0 })],
    ['withheld', run({ signal: 0, withheld: true })],
    ['pullBack', run({ signal: -2 })],
  ];

  test.each(kinds)('%s: every line describes, with no em dash and no banned word', (_name, plan) => {
    const card = describeCheckin(plan, { labelOf, sessionNames });
    const all = [card.heading, ...card.lines, ...card.unplacedLines, card.notRaisedLine, card.ifLeft].filter(Boolean);
    expect(all.length).toBeGreaterThanOrEqual(1);
    for (const line of all) {
      expect(line).not.toMatch(NEVER);
      expect(line).not.toMatch(EM_DASH);
      expect(line).not.toMatch(/[A-Za-z]{3,}-{2}/);
      expect(line).not.toMatch(/\b(color|behavior|optimize|center)\b/i);
    }
  });

  test('+1 shows no Apply and says the planned climb goes ahead', () => {
    const card = describeCheckin(run({ signal: 1 }), { labelOf, sessionNames });
    expect(card.showApply).toBe(false);
    expect(card.heading).toBe('Your plan\'s planned climb goes ahead.');
    expect(card.ifLeft).toBeNull();
  });

  test('a hold and a withheld increase show Apply and say what happens if they are left', () => {
    for (const plan of [run({ signal: 0 }), run({ signal: 0, withheld: true })]) {
      const card = describeCheckin(plan, { labelOf, sessionNames });
      expect(card.showApply).toBe(true);
      expect(card.heading).toBe('Next week stays at this week\'s level');
      expect(card.ifLeft).toBe('If you leave this, your plan\'s planned climb of 2 sets goes ahead.');
    }
  });

  test('an increase and a pull-back show Apply and say what happens if they are left', () => {
    for (const plan of [run(), run({ signal: -2 })]) {
      const card = describeCheckin(plan, { labelOf, sessionNames });
      expect(card.showApply).toBe(true);
      expect(card.ifLeft).toBe('If you leave this, your plan\'s planned climb of 2 sets goes ahead.');
    }
  });

  test('the increase names each exercise set by set, as the design\'s example does', () => {
    const card = describeCheckin(run(), { labelOf, sessionNames });
    const chest = card.lines.find((l) => /^Chest, 3 more sets next week:/.test(l));
    expect(chest).toBe('Chest, 3 more sets next week: Barbell Bench Press 3 to 4, Incline Dumbbell Press 3 to 4 and Pec Deck (Machine Fly) 2 to 3.');
  });

  test('a session is named only where the same exercise moves in two of them', () => {
    // Bench press in both sessions, both below their cap, so both move.
    const sessions = smallSessions();
    const plan = run({ sessions, rows: rowsFor({ chest: [6, 8, 8, 10, 12, 6], triceps: [4, 6, 6, 6, 6, 3] }), weeks: weeksFrom(2) });
    const card = describeCheckin(plan, { labelOf, sessionNames });
    const chest = card.lines.find((l) => /^Chest, /.test(l));
    expect(chest).toMatch(/Barbell Bench Press in Upper A \d to \d/);
    expect(chest).toMatch(/Barbell Bench Press in Upper B \d to \d/);
  });

  test('an opened exercise is named as joining, with its sets', () => {
    const plan = run({ rows: rowsFor({ chest: [8, 10, 12, 14, 16, 8], triceps: [4, 6, 6, 6, 6, 3] }) });
    const card = describeCheckin(plan, { labelOf, sessionNames });
    const tri = card.lines.find((l) => /^Triceps, /.test(l));
    expect(tri).toMatch(/Skull Crusher joins with \d sets?/);
  });

  test('what could not be placed is said plainly', () => {
    const card = describeCheckin(run({ catalogue: {} }), { labelOf, sessionNames });
    expect(card.unplacedLines.length).toBeGreaterThan(0);
    expect(card.unplacedLines[0]).toMatch(/^\d+ sets? for triceps could not be placed without going over a limit\.$/);
  });

  test('a pull-back with nothing to take off shows no Apply and says so', () => {
    // Chest already at maintenance (4) and flat: two fewer would go below it.
    const rows = rowsFor({ chest: [4, 4, 4, 4, 4, 2] });
    const plan = run({ rows, signal: -2, catalogue: {} });
    expect(plan.applies).toBe(false);
    const card = describeCheckin(plan, { labelOf, sessionNames });
    expect(card.showApply).toBe(false);
    expect(card.heading).toBe('There is nothing to take off next week');
    expect(card.ifLeft).toBeNull();
    for (const line of [card.heading, ...card.lines]) expect(line).not.toMatch(NEVER);
  });

  test('a recovery week as the next week gives no card: the screen\'s own recovery-week copy stands', () => {
    expect(describeCheckin(run({ weeks: weeksFrom(4) }), { labelOf })).toBeNull();
  });
});
