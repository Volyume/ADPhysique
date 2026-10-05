/**
 * explain.test.js -- D219 lane B5: every plan fact shown with its reason
 * (design section 6 and 1.7, docs/audit/plan-builder-science-2026-10-04/
 * 00-AUDIT-AND-PLAN.md; register D219: the founder wants people "to be able
 * to see the great work and intelligence the product has").
 *
 * What this pins, and why:
 *   1. The sentences section 6 lists are COMPUTED from the plan's facts, over
 *      plans the real planner builds (a 4-day plan, a focus plan, an over-time
 *      plan, a promise-limited plan, a plan that crosses the session ceilings):
 *      the structure and why, the spacing in hours, each focus muscle's sets
 *      now and at the peak and where it is trained first, the cap and why, the
 *      session length at the peak against the person's length, the sessions
 *      that run over and what the plan did first, the readiness promise or
 *      exactly where it is limited and why, what the plan did to keep it, and
 *      the effort ladder. Every number in a line is read from the facts, so a
 *      line is true of THIS person's plan, never of a plan like it.
 *   2. Every line carries its source: an EVIDENCE key from science.js that
 *      exists, with the grade science.js records, and a one-line source that
 *      cites nothing science.js does not (author and year are checked against
 *      the EVIDENCE text) and shows no internal reference.
 *   3. D204: the lines describe and never tell anyone to train more or less;
 *      no "too much", "junk", "overtrained" or instruction; no em dash;
 *      British spelling. Checked over a matrix of 30 real plans.
 *   4. Plans without facts are unchanged: anything that is not version 2
 *      returns null, so a surface renders exactly what it rendered before.
 *   5. The facts the device holds (programmes.plan_facts) do not carry the
 *      session minutes, over-time or ceilings (plannerV2PlanFacts drops them),
 *      so those lines are left out rather than invented. Pinned here so the
 *      day the facts are stored the lines light up and this test is the place
 *      that records it.
 *   6. Purity: the same facts give the same lines, nothing is mutated.
 */
import fs from 'fs';
import path from 'path';
import { buildPlan } from '../planner';
import { familiesFor } from '../families';
import { EVIDENCE, GROWTH_FLOOR, BLOCK } from '../science';
import { DIVISION_MATRIX } from '../../planEngine';
import { explainPlan, sessionsFromRoutines } from '../explain';

const CHOICES = require('./fixtures/choices');

function plan(over = {}) {
  return buildPlan({
    daysPerWeek: 4, sessionLengthMinutes: 75, goal: 'general', experience: 'intermediate',
    equipment: 'full_gym', choices: CHOICES, divisionMatrix: DIVISION_MATRIX, ...over,
  });
}

// The sessions in rotation order, as the screens hand them over (routine id,
// name, the muscle of each exercise in session order).
const sessionsOf = (p) => p.workouts.map((w) => ({
  id: w.sessionKey,
  name: w.name,
  muscles: w.exercises.map((e) => e.muscle),
}));

// What programmes.plan_facts holds today (plannerV2PlanFacts, planAutoGen.js):
// no order, no session minutes, no over-time, no ceilings.
const storedShape = (v2) => ({
  version: v2.version,
  family: v2.family,
  roles: v2.roles,
  weeklyTargets: v2.weeklyTargets,
  exposureShares: v2.exposureShares,
  sessionCaps: v2.sessionCaps,
  lightCaps: v2.lightCaps,
  gapRanks: v2.gapRanks,
  thin: {},
  slots: {},
  builtFactor: v2.builtFactor,
  rirLadder: v2.rirLadder,
  readiness: v2.readiness,
  notes: v2.notes,
  limitedBy: v2.limitedBy,
});

const FOUR_DAY = plan({ daysPerWeek: 4, sessionLengthMinutes: 75 });
const FOCUS = plan({ daysPerWeek: 4, sessionLengthMinutes: 75, focusMuscles: ['glutes'] });
const OVER_TIME = plan({ daysPerWeek: 4, sessionLengthMinutes: 45, focusMuscles: ['glutes'] });
const LIMITED = plan({ daysPerWeek: 3, sessionLengthMinutes: 75, focusMuscles: ['glutes'] });
const THREE_FOCUS = plan({ daysPerWeek: 4, sessionLengthMinutes: 75, focusMuscles: ['glutes', 'side_delts', 'chest'] });
// A full-body week keeps glutes in two sessions from the start (review
// 2026-10-05, finding 6), so no fixture plan needs the readiness fix any more;
// the note is the one the fix records (planner.js, the fix loop's notes).
const EXTRA_SESSION = (() => {
  const p = plan({ daysPerWeek: 3, sessionLengthMinutes: 75 });
  const peak = Math.round(p.weeklyVolumeSummary.glutes.fractional * 10) / 10;
  return { ...p, v2: { ...p.v2, notes: [...p.v2.notes, { muscle: 'glutes', kind: 'extra_session', peak }] } };
})();

function explain(p, { minutes = p.estimatedSessionMinutes, ...over } = {}) {
  return explainPlan({
    facts: p.v2,
    sessions: sessionsOf(p),
    sessionLengthMinutes: minutes,
    ...over,
  });
}

const ids = (res) => res.lines.map((l) => l.id);
const line = (res, id) => res.lines.find((l) => l.id === id);
const textOf = (res, id) => line(res, id)?.text;

// D204 and the voice rules, on every line and every source line.
const NEVER = /\b(too much|near the limit|overtrain(ed|ing)?|overreach(ed|ing)?|junk|cut back|you should|you must|reduce your|train more|train less|risk|danger(ous)?|avoid|must|should|need to|make sure|try to|aim to)\b/i;
const US_SPELLING = /\b(optimi[z]\w*|behavior|color|recogni[z]\w*|center|emphasi[z]\w*|favorite)\b/i;

describe('explainPlan: what a plan without facts shows', () => {
  test('anything that is not a version 2 plan explains nothing (the surface renders as before)', () => {
    expect(explainPlan({ facts: null })).toBeNull();
    expect(explainPlan({ facts: undefined })).toBeNull();
    expect(explainPlan({ facts: {} })).toBeNull();
    expect(explainPlan({ facts: { version: 1, family: 'ppl' } })).toBeNull();
    expect(explainPlan({ facts: [] })).toBeNull();
    expect(explainPlan({})).toBeNull();
    expect(explainPlan()).toBeNull();
  });
});

describe('explainPlan: a 4-day plan', () => {
  const res = explain(FOUR_DAY, { minutes: 75 });

  test('the lines, in reading order, for a plan with no focus muscle and nothing limited', () => {
    expect(ids(res)).toEqual(['structure', 'spacing', 'cap', 'length', 'readiness', 'ladder']);
  });

  test('the structure: how many sessions, which split, and why it was chosen', () => {
    const t = textOf(res, 'structure');
    expect(t).toMatch(/^4 sessions a week, alternating upper and lower\./);
    expect(t).toMatch(/does not change growth/);
  });

  test('the spacing: the shortest gap between a muscle\'s own sessions, on consecutive days and in a usual week', () => {
    const t = textOf(res, 'spacing');
    // Upper A, Lower A, Upper B, Lower B: a muscle trained twice sits two
    // sessions apart, 2 x 24 - 1 = 47 hours back to back.
    expect(t).toMatch(/at least 47 hours apart even on consecutive training days/);
    expect(t).toMatch(/at least \d+ hours apart in a usual week/);
  });

  test('a muscle in sessions that sit next to each other is described as it is, not as "kept" apart', () => {
    // Full Body, Upper, Lower: the full-body session trains every muscle the
    // next session trains again, so the closest gap is one slot, 24 - 1 hours.
    const t = textOf(explain(LIMITED, { minutes: 75 }), 'spacing');
    expect(t).toMatch(/^Some muscles are trained in sessions that sit next to each other, so their closest sessions are 23 hours apart on consecutive training days and 47 hours apart in a usual week\./);
    expect(t).not.toMatch(/keeps each muscle/);
  });

  test('the cap, and why', () => {
    const t = textOf(res, 'cap');
    expect(t).toMatch(/^No exercise goes above 4 sets\./);
    expect(t).toMatch(/fewer reps for more fatigue/);
    expect(t).toMatch(/second exercise trains parts of the muscle the first reaches less/);
  });

  test('the session length at the peak against the person\'s length', () => {
    const t = textOf(res, 'length');
    expect(t).toMatch(/^At the peak of the block, sessions run about \d+ to \d+ minutes/);
    expect(t).toMatch(/the 75 you set/);
    expect(t).toMatch(/No session goes past 8 exercises or 25 working sets\./);
  });

  test('the readiness promise, and the closest reading', () => {
    const t = textOf(res, 'readiness');
    expect(t).toMatch(/every muscle is estimated at least 90% recovered when its next session starts/);
    expect(t).toMatch(/The closest is [A-Z][a-z ]+ at about \d+% before (Upper|Lower) [AB] in week \d/);
  });

  test('the effort ladder: 3, 2, 2, 1, 1 reps short of failure, then the easier recovery week at 4', () => {
    const t = textOf(res, 'ladder');
    expect(t).toMatch(/Weeks 1 to 5 stop about 3, 2, 2, 1 and 1 reps short of failure/);
    expect(t).toMatch(/week 6 eases to about 4/);
  });
});

describe('explainPlan: a focus plan', () => {
  const t = FOCUS.v2.weeklyTargets.glutes;

  test('a focus line, after the structure and spacing, before the cap', () => {
    const res = explain(FOCUS, { minutes: 75 });
    const order = ids(res);
    expect(order.indexOf('focus:glutes')).toBeGreaterThan(order.indexOf('spacing'));
    expect(order.indexOf('focus:glutes')).toBeLessThan(order.indexOf('cap'));
  });

  test('sets now, at the peak, and where the muscle is trained first', () => {
    const facts = { ...FOCUS.v2, limitedBy: {} };
    const res = explainPlan({ facts, sessions: sessionsOf(FOCUS), sessionLengthMinutes: 75, week: 1 });
    expect(textOf(res, 'focus:glutes')).toBe(
      `Glutes are your focus: ${t[0]} direct sets a week now, climbing to ${t[4]} by week 5, trained first in Lower A and Lower B.`,
    );
  });

  test('"now" follows the block week; week 5 is the peak, week 6 the recovery week', () => {
    expect(textOf(explain(FOCUS, { minutes: 75, week: 3 }), 'focus:glutes')).toContain(`${t[2]} direct sets a week now, climbing to ${t[4]} by week 5`);
    expect(textOf(explain(FOCUS, { minutes: 75, week: 5 }), 'focus:glutes')).toContain(`${t[4]} direct sets a week, the peak of this block`);
    const recovery = textOf(explain(FOCUS, { minutes: 75, week: 6 }), 'focus:glutes');
    expect(recovery).toContain('recovery week');
    expect(recovery).toContain(`${t[5]} direct sets`);
    expect(recovery).toContain(`peak of ${t[4]} in week 5`);
  });

  test('the sets the plan holds today (planned_muscle_volume, after check-ins) win over the plan-time targets', () => {
    const res = explain(FOCUS, { minutes: 75, week: 2, targetsByWeek: { 2: { glutes: 17 }, 5: { glutes: 25 } } });
    expect(textOf(res, 'focus:glutes')).toContain('17 direct sets a week now, climbing to 25 by week 5');
  });

  test('a muscle that is not first in its sessions is not claimed to be', () => {
    const sessions = sessionsOf(FOCUS).map((s) => ({ ...s, muscles: ['chest', ...s.muscles.filter((m) => m !== 'chest')] }));
    const res = explainPlan({ facts: FOCUS.v2, sessions, sessionLengthMinutes: 75 });
    expect(textOf(res, 'focus:glutes')).not.toMatch(/trained first/);
  });

  test('without the sessions, nothing is said about where it is trained', () => {
    const res = explainPlan({ facts: FOCUS.v2, sessionLengthMinutes: 75 });
    expect(textOf(res, 'focus:glutes')).toMatch(/^Glutes are your focus: \d+ direct sets/);
    expect(textOf(res, 'focus:glutes')).not.toMatch(/trained first/);
  });

  test('three focus muscles each get a line, in the plan\'s muscle order', () => {
    const res = explain(THREE_FOCUS, { minutes: 75 });
    expect(ids(res).filter((i) => i.startsWith('focus:'))).toEqual(['focus:chest', 'focus:side_delts', 'focus:glutes']);
    expect(textOf(res, 'focus:side_delts')).toMatch(/^Side delts are your focus: /);
  });

  test('a focus muscle the set caps stopped short of says so', () => {
    const facts = { ...FOCUS.v2, limitedBy: { ...FOCUS.v2.limitedBy, glutes: 'limits' } };
    const res = explainPlan({ facts, sessions: sessionsOf(FOCUS), sessionLengthMinutes: 75 });
    expect(textOf(res, 'focus:glutes')).toMatch(/The set caps and session limits are what hold it there\.$/);
  });
});

describe('explainPlan: an over-time plan', () => {
  const res = explain(OVER_TIME, { minutes: 45 });

  test('names the session that runs over, by how much, and what the plan did first', () => {
    const over = Math.round(OVER_TIME.v2.overTime.s1);
    const t = textOf(res, 'over');
    expect(t).toContain(`At the peak, Lower A runs about ${over} minutes past the 45 you set.`);
    expect(t).toMatch(/shortens the rest between sets on the smaller muscles' isolation exercises to 60 seconds/);
    expect(t).toMatch(/Your focus muscles keep every set, because bringing them up is what you picked\./);
  });

  test('the length line states the minutes against the person\'s length without calling it inside', () => {
    const t = textOf(res, 'length');
    expect(t).toMatch(/minutes, against the 45 you set\./);
    expect(t).not.toMatch(/inside/);
  });

  test('two sessions over are listed together', () => {
    const facts = { ...OVER_TIME.v2, overTime: { s0: 11, s1: 22 } };
    const t = textOf(explainPlan({ facts, sessions: sessionsOf(OVER_TIME), sessionLengthMinutes: 45 }), 'over');
    expect(t).toContain('Upper A (about 11 minutes) and Lower A (about 22 minutes) run past the 45 you set.');
  });

  test('without the person\'s length the line still says what it can', () => {
    const t = textOf(explainPlan({ facts: OVER_TIME.v2, sessions: sessionsOf(OVER_TIME) }), 'over');
    expect(t).toMatch(/runs about \d+ minutes over the session length you set\./);
  });
});

describe('explainPlan: sessions past the ceilings, and a promise that is limited', () => {
  const res = explain(THREE_FOCUS, { minutes: 75 });

  test('a session past 8 exercises or 25 working sets says why', () => {
    expect(THREE_FOCUS.v2.overCeilings.length).toBeGreaterThan(0);
    const t = textOf(res, 'ceilings');
    expect(t).toMatch(/holds more than 8 exercises or 25 working sets/);
    expect(t).toMatch(/focus sets are programmed in full/);
    expect(textOf(res, 'length')).not.toMatch(/No session goes past/);
  });

  test('the readiness line names exactly where it is limited, in estimates, and why', () => {
    const worst = THREE_FOCUS.v2.notes.find((n) => n.kind === 'promise_limited');
    const reading = THREE_FOCUS.v2.readiness.lowest[worst.muscle];
    const pct = Math.round(worst.lowest * 100);
    const t = textOf(res, 'readiness');
    expect(t).toMatch(/the plan aims for every muscle to be estimated at least 90% recovered when its next session starts/);
    expect(t).toContain(`about ${pct}%`);
    expect(t).toMatch(new RegExp(`before ${THREE_FOCUS.workouts[reading.position].name} in week ${reading.week}`));
    expect(t).toContain('The exception: ');
    expect(t).toContain(`never below a muscle's growth floor (${GROWTH_FLOOR.standard} sets a week, or ${GROWTH_FLOOR.focus} for a focus muscle), and shows the closest it found`);
    expect(t).not.toMatch(/every muscle is estimated at least 90% recovered when its next session starts, in every week/);
  });

  test('a single limited muscle (3 days, glutes in focus)', () => {
    const r = explain(LIMITED, { minutes: 75 });
    const note = LIMITED.v2.notes.find((n) => n.kind === 'promise_limited' && n.muscle === 'glutes');
    expect(note).toBeDefined();
    expect(textOf(r, 'readiness')).toContain(`Glutes about ${Math.round(note.lowest * 100)}%`);
  });

  test('more than three limited muscles: the worst three are named and the rest counted', () => {
    const notes = ['a', 'b', 'c', 'd', 'e'].map((m, i) => ({ muscle: ['chest', 'back', 'quads', 'biceps', 'abs'][i], kind: 'promise_limited', lowest: 0.5 + i / 10 }));
    const facts = { ...FOUR_DAY.v2, notes, readiness: { passes: false, lowest: {} } };
    const t = textOf(explainPlan({ facts, sessions: sessionsOf(FOUR_DAY), sessionLengthMinutes: 75 }), 'readiness');
    expect(t).toMatch(/Chest about 50%/);
    expect(t).toMatch(/Back about 60%/);
    expect(t).toMatch(/Quads about 70%/);
    expect(t).toMatch(/and 2 more/);
    expect(t).toContain('The exceptions: ');
    expect(t).not.toMatch(/Biceps/);
  });
});

describe('explainPlan: what the plan did to keep its promise, and the ramp', () => {
  test('an extra session for a muscle is reported', () => {
    expect(EXTRA_SESSION.v2.notes.some((n) => n.kind === 'extra_session' && n.muscle === 'glutes')).toBe(true);
    const t = textOf(explain(EXTRA_SESSION, { minutes: 75 }), 'fixes');
    expect(t).toBe('To keep each session starting recovered, the plan gave glutes an extra session.');
  });

  test('each kind of change reads as a plain fact, once per muscle', () => {
    const notes = [
      { muscle: 'triceps', kind: 'split', peak: 12 },
      { muscle: 'calves', kind: 'fewer_sessions', peak: 8 },
      { muscle: 'hamstrings', kind: 'peak_lowered', peak: 14.5 },
      { muscle: 'hamstrings', kind: 'peak_lowered', peak: 13.5 },
    ];
    const facts = { ...FOUR_DAY.v2, notes };
    const t = textOf(explainPlan({ facts, sessions: sessionsOf(FOUR_DAY), sessionLengthMinutes: 75 }), 'fixes');
    expect(t).toContain('gave triceps a lighter and a heavier session with the heavier one before the longer gap');
    expect(t).toContain('trained calves in one session fewer');
    expect(t).toContain('held hamstrings at about 13.5 counted sets a week, not below the growth floor');
    expect(t.match(/hamstrings/g)).toHaveLength(1);
  });

  test('a ramp is reported against what was logged, with the tested step', () => {
    const facts = { ...FOUR_DAY.v2, notes: [{ muscle: 'chest', kind: 'ramped' }, { muscle: 'back', kind: 'ramped' }, { muscle: 'chest', kind: 'ramped' }] };
    const t = textOf(explainPlan({ facts, sessions: sessionsOf(FOUR_DAY), sessionLengthMinutes: 75 }), 'ramp');
    expect(t).toBe('The plan opens the block with fewer chest and back exercises than at the peak, because it starts within 3 sets of what you logged over the last 4 weeks and climbs from there.');
  });

  test('no changes, no lines', () => {
    const res = explain(FOUR_DAY, { minutes: 75 });
    expect(line(res, 'fixes')).toBeUndefined();
    expect(line(res, 'ramp')).toBeUndefined();
  });
});

describe('explainPlan: the cap line is true of this plan', () => {
  test('a plan with thin equipment slots and typed set counts says so', () => {
    const facts = { ...FOUR_DAY.v2, thin: { s0: ['ex1'] }, typed: { re1: 6 } };
    const t = textOf(explainPlan({ facts, sessions: sessionsOf(FOUR_DAY), sessionLengthMinutes: 75 }), 'cap');
    expect(t).toMatch(/Where your equipment gives a muscle a single exercise, it can take up to 2 more sets\./);
    expect(t).toMatch(/Set counts you typed yourself are kept as typed\./);
  });

  test('without them the line carries neither exception', () => {
    const t = textOf(explain(FOUR_DAY, { minutes: 75 }), 'cap');
    expect(t).not.toMatch(/equipment/);
    expect(t).not.toMatch(/typed/);
  });
});

describe('explainPlan: every structure the planner can build', () => {
  test('every family key has its own phrase, and a division reads from its own session names', () => {
    for (const n of [2, 3, 4, 5, 6]) {
      for (const f of familiesFor(n, { focusMuscles: ['glutes'] })) {
        const facts = { ...FOUR_DAY.v2, family: f.key };
        const sessions = f.sessions.map((s, i) => ({ id: `s${i}`, name: s.name, muscles: [] }));
        const t = textOf(explainPlan({ facts, sessions }), 'structure');
        expect(t).toMatch(new RegExp(`^${n} sessions a week, [a-z]`));
        expect(t).not.toMatch(/undefined|null/);
      }
    }
    const facts = { ...FOUR_DAY.v2, family: 'division_mens_physique_5' };
    const sessions = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms'].map((name, i) => ({ id: `s${i}`, name, muscles: [] }));
    const t = textOf(explainPlan({ facts, sessions }), 'structure');
    expect(t).toMatch(/^5 sessions a week, following the split your goal keeps: Chest, Back, Legs, Shoulders and Arms\./);
    expect(t).not.toMatch(/is chosen for/);
  });

  test('a real division plan explains itself', () => {
    const p = plan({ daysPerWeek: 5, goal: 'mens_physique' });
    const res = explain(p, { minutes: 75 });
    expect(textOf(res, 'structure')).toMatch(/^5 sessions a week, following the split your goal keeps: /);
  });
});

describe('explainPlan: sources', () => {
  const PLANS = [FOUR_DAY, FOCUS, OVER_TIME, LIMITED, THREE_FOCUS, EXTRA_SESSION];
  const all = PLANS.flatMap((p) => explain(p).lines);

  test('every line has an id, text and a source', () => {
    for (const l of all) {
      expect(typeof l.id).toBe('string');
      expect(l.text.length).toBeGreaterThan(20);
      expect(l.source).toBeTruthy();
    }
  });

  test('every source is an EVIDENCE key science.js has, with the grade it records', () => {
    for (const l of all) {
      const ev = EVIDENCE[l.source.key];
      expect(ev).toBeDefined();
      expect(l.source.grade).toBe(ev.grade);
      expect(typeof l.source.gradeLabel).toBe('string');
      expect(l.source.gradeLabel.length).toBeGreaterThan(3);
      expect(l.source.line.length).toBeGreaterThan(20);
    }
  });

  test('a source line cites nothing science.js does not (author and year are in the EVIDENCE text)', () => {
    for (const l of all) {
      const cites = [...l.source.line.matchAll(/\b([A-Z][a-z]+(?:-[A-Z][a-z]+)?) (\d{4})\b/g)];
      for (const [whole] of cites) expect(EVIDENCE[l.source.key].source).toContain(whole);
    }
  });

  test('a source line shows no internal reference', () => {
    for (const l of all) {
      expect(l.source.line).not.toMatch(/\[S |\bdesign \d|\bD\d+\b|Founder|Lead ruling|STOP|section \d/);
    }
  });

  test('the grades a person sees are labelled honestly (a convention is called one)', () => {
    const byKey = Object.fromEntries(all.map((l) => [l.source.key, l.source]));
    expect(byKey['SETS_PER_EXERCISE.capCompound'].gradeLabel).toMatch(/convention/i);
    expect(byKey['BLOCK.rirLadder'].gradeLabel).toMatch(/evidence/i);
  });

  test('line ids are unique within a plan', () => {
    for (const p of PLANS) {
      const list = ids(explain(p));
      expect(new Set(list).size).toBe(list.length);
    }
  });
});

describe('explainPlan: D204 and the voice rules, over a matrix of real plans', () => {
  const MATRIX = [];
  for (const daysPerWeek of [2, 3, 4, 5, 6]) {
    for (const sessionLengthMinutes of [45, 75]) {
      for (const focusMuscles of [[], ['glutes'], ['glutes', 'side_delts', 'chest']]) {
        MATRIX.push({ daysPerWeek, sessionLengthMinutes, focusMuscles });
      }
    }
  }
  const results = MATRIX.map((inputs) => {
    const p = plan(inputs);
    return { inputs, res: explain(p, { minutes: inputs.sessionLengthMinutes }) };
  });

  test('30 plans, every one explained', () => {
    expect(results).toHaveLength(30);
    for (const { res } of results) expect(res.lines.length).toBeGreaterThanOrEqual(6);
  });

  test('no line tells anyone to train more or less, or calls anything too much, junk or overtraining', () => {
    for (const { res } of results) {
      for (const l of res.lines) {
        expect(l.text).not.toMatch(NEVER);
        expect(l.source.line).not.toMatch(NEVER);
      }
    }
  });

  test('no em dash, no machine-tell word, British spelling', () => {
    for (const { res } of results) {
      for (const l of res.lines) {
        for (const s of [l.text, l.source.line, l.source.gradeLabel]) {
          expect(s).not.toMatch(/—/);
          expect(s).not.toMatch(/\b(delve|leverage|utili[sz]e|facilitate|seamless|streamline|robust|comprehensive)\b/i);
          expect(s).not.toMatch(US_SPELLING);
          expect(s).not.toMatch(/undefined|NaN|null|\[object/);
        }
      }
    }
  });

  test('no line makes a claim about weight, food or the body (the ED-safety lane is out of bounds)', () => {
    for (const { res } of results) {
      for (const l of res.lines) {
        expect(l.text).not.toMatch(/\b(weight|calorie|kcal|diet|fat loss|body ?fat|physique|appearance|food|eat|eating|macro)\b/i);
      }
    }
  });
});

describe('explainPlan: the facts the device holds', () => {
  test('stored facts give the structure, spacing, focus, cap, readiness and ladder, and leave out what they do not hold', () => {
    const facts = storedShape(OVER_TIME.v2);
    const res = explainPlan({ facts, sessions: sessionsOf(OVER_TIME), sessionLengthMinutes: 45 });
    expect(ids(res)).toEqual(['structure', 'spacing', 'focus:glutes', 'cap', 'readiness', 'ladder']);
    expect(line(res, 'length')).toBeUndefined();
    expect(line(res, 'over')).toBeUndefined();
    expect(line(res, 'ceilings')).toBeUndefined();
  });

  test('facts that carry the session minutes, over-time and ceilings (the planner\'s own block) add those lines', () => {
    const res = explain(OVER_TIME, { minutes: 45 });
    expect(ids(res)).toEqual(expect.arrayContaining(['length', 'over']));
  });
});

describe('explainPlan: purity', () => {
  const deepFreeze = (o) => {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) {
      Object.freeze(o);
      Object.values(o).forEach(deepFreeze);
    }
    return o;
  };

  test('the same facts give the same lines, and nothing is mutated', () => {
    const facts = deepFreeze(JSON.parse(JSON.stringify(THREE_FOCUS.v2)));
    const sessions = deepFreeze(JSON.parse(JSON.stringify(sessionsOf(THREE_FOCUS))));
    const targetsByWeek = deepFreeze({ 2: { glutes: 18 } });
    const a = explainPlan({ facts, sessions, sessionLengthMinutes: 75, week: 2, targetsByWeek });
    const b = explainPlan({ facts, sessions, sessionLengthMinutes: 75, week: 2, targetsByWeek });
    expect(b).toEqual(a);
  });

  test('a week outside the block reads as the nearest week of it', () => {
    const t = FOCUS.v2.weeklyTargets.glutes;
    expect(textOf(explain(FOCUS, { minutes: 75, week: 0 }), 'focus:glutes')).toContain(`${t[0]} direct sets a week now`);
    expect(textOf(explain(FOCUS, { minutes: 75, week: 99 }), 'focus:glutes')).toContain('recovery week');
    expect(BLOCK.weeks).toBe(6);
  });
});

describe('explain.js stays a pure module (design 6: computed from the plan, no I/O, no clock, no randomness)', () => {
  const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'explain.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  test('no clock, randomness, storage, network or database in the module', () => {
    expect(SOURCE).not.toMatch(/Date\.now|new Date|Math\.random|performance\.now/);
    expect(SOURCE).not.toMatch(/AsyncStorage|SecureStore|fetch\(|XMLHttpRequest|supabase|expo-|react-native/i);
    expect(SOURCE).not.toMatch(/\brequire\(/);
    expect(SOURCE).not.toMatch(/\bdatabase\b|sqlite/i);
  });

  test("it imports only the plan's pure modules, the recovery constants and the muscle names", () => {
    const imports = [...SOURCE.matchAll(/from '([^']+)'/g)].map((m) => m[1]).sort();
    expect(imports).toEqual(['../algorithms', '../recovery/constants', './allocate', './bands', './science']);
  });

  test('it never reads the recovery model, the ED-safety modules or the check-in path', () => {
    expect(SOURCE).not.toMatch(/muscleRecoveryModel|edPatternDetector|wellbeing|nutritionEngine|weeklyCoach|coachApply|checkinPlacement/);
  });
});

describe('sessionsFromRoutines: the screens\' view of the plan, from the routines and the plan facts', () => {
  const facts = {
    version: 2,
    slots: {
      r1: { e1: { muscle: 'glutes', kind: 'heavy_compound', credits: {} }, e2: { muscle: 'quads' } },
      r2: { e3: { muscle: 'chest' } },
    },
  };
  const routinesWithRows = [
    { routine: { id: 'r1', name: 'Lower A' }, rows: [{ exercise: { id: 'e1' } }, { exercise: { id: 'e2' } }, { exercise: { id: 'unknown' } }] },
    { routine: { id: 'r2', name: 'Upper A' }, rows: [{ exercise: { id: 'e3' } }] },
    { routine: { id: 'r3', name: 'Empty' }, rows: [] },
  ];

  test('each routine becomes a session: its id, name and the planner\'s muscle of each exercise in order', () => {
    expect(sessionsFromRoutines(facts, routinesWithRows)).toEqual([
      { id: 'r1', name: 'Lower A', muscles: ['glutes', 'quads', null] },
      { id: 'r2', name: 'Upper A', muscles: ['chest'] },
      { id: 'r3', name: 'Empty', muscles: [] },
    ]);
  });

  test('nothing to read gives an empty list, never a throw', () => {
    expect(sessionsFromRoutines(null, null)).toEqual([]);
    expect(sessionsFromRoutines({}, [{ routine: { id: 'r1' }, rows: null }])).toEqual([{ id: 'r1', name: null, muscles: [] }]);
  });
});
