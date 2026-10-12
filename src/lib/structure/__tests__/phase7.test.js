/**
 * phase7.test.js -- D222 phase 7: the pure parts of every path after the
 * build, against the REAL engine and the real seeded library.
 *
 * Authority: docs/audit/plan-builder-map-2026-10-11/24-PHASE7-AFTER-BUILD-SPEC.md
 * R73 to R83 (R81: for each path, the change that passes, the change that
 * adds a hard fault, and a plan the engine did not build left alone). What
 * this suite pins and why:
 *   - R83: the engine's questions are machine-readable choices (more days, a
 *     longer session, without a focus pick, the plan as it is), a refusal's
 *     choices never include keeping it, the same change is offered once, and
 *     a choice changes exactly the profile fields it names (a dropped focus
 *     takes every label that maps to it); every "Choose ..." the engine says
 *     has a choice to go with it;
 *   - R83: a structure plan's spacing line makes no recovery claim;
 *   - R74 and R76: the injury ramp lowers the ladder and never raises it; a
 *     typed count is halved in the recovery week;
 *   - R75: a swap is offered only where the replacement adds no fault, and
 *     never for an exercise the rulebook cannot check;
 *   - R79: the next block's fresh ladder keeps each exercise's peak; a fixed
 *     programme is checked only with the checks for any plan;
 *   - R80: every new line is plain (no em dash) and the check-in card
 *     describes rather than instructs.
 */
const { buildStructurePlan } = require('../engine');
const { PROGRESSION, PATTERNS } = require('../rulebook');
const {
  structureFacts, structureOptions, profileWithOption, structurePreview, structureFit, structureRefusal,
} = require('../adapt');
const {
  planFromFacts, swapAllowed, freshLadder, checkFixedPlan, structureCheckin, faultsOf,
} = require('../stored');
const { structureServedWeek } = require('../serve');
const {
  optionLabel, changeReason, structureCheckinCard, fixedPlanNote, structureSpacingText, planMessages,
} = require('../messages');
const { explainPlan } = require('../../plan/explain');
const { LIBRARY, BY_NAME } = require('../../__tests__/campaign16.helpers');

jest.setTimeout(300000);

const build = (args) => buildStructurePlan({ ...args, library: LIBRARY });
const factsFor = (args) => {
  const r = build(args);
  return {
    r,
    facts: structureFacts(r, args, {
      routineIds: r.plan.sessions.map((_, i) => `r${i}`),
      routineExerciseIds: r.plan.sessions.map((s, i) => s.exercises.map((_, j) => `re${i}_${j}`)),
    }),
  };
};
const EM_DASH = /—/;

describe('R83: answerable choices', () => {
  test('a focus pick that adds too little offers more days, the days without it, and the plan as it is', () => {
    const args = { goal: 'bodybuilding', days: 4, lengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', focus: ['chest'] };
    const r = build(args);
    expect(r.ok).toBe(true);
    expect(r.report.needsFocusChoice).toBe(true);
    const options = structureOptions(r, args);
    const kinds = options.map((o) => o.kind);
    expect(kinds).toContain('drop_focus');
    expect(kinds).toContain('keep');
    expect(kinds[kinds.length - 1]).toBe('keep');
    const drop = options.find((o) => o.kind === 'drop_focus');
    expect(drop.change).toEqual({ dropFocus: ['chest'] });
    expect(drop.label).toBe('4 days without the chest focus');
    const days = options.find((o) => o.kind === 'days');
    if (days) expect(days.change.daysPerWeek).toBeGreaterThan(4);
    // Each "Choose ..." the engine says has its control.
    const choose = planMessages(r, args).filter((l) => /Choose /.test(l));
    expect(choose.length).toBeGreaterThan(0);
    for (const o of options) expect(o.label).not.toMatch(EM_DASH);
    // The preview and the fit carry the same choices.
    expect(structurePreview(r, args).options).toEqual(options);
    const fit = structureFit(r, args, []);
    expect(fit.options).toEqual(options);
    expect(fit.focusQuestions.map((f) => f.muscle)).toContain('chest');
  });

  test('the length question offers a longer session and, where some fit, more days', () => {
    let seen = false;
    for (const lengthMinutes of [30, 45]) {
      for (const goal of ['bodybuilding', 'general', 'womens_physique']) {
        const args = { goal, days: 3, lengthMinutes, equipment: 'full_gym', experience: 'intermediate', focus: [] };
        const r = build(args);
        if (!r.ok || !r.report.needsLengthChoice) continue;
        seen = true;
        const options = structureOptions(r, args);
        expect(options.find((o) => o.kind === 'length').change).toEqual({ sessionLengthMinutes: r.report.suggestedLength });
        if (r.report.daysThatFit) expect(options.find((o) => o.kind === 'days').change).toEqual({ daysPerWeek: r.report.daysThatFit });
        expect(options[options.length - 1].kind).toBe('keep');
      }
    }
    expect(seen).toBe(true);
  });

  test('a week with no question has no choices; a refusal never offers to keep it', () => {
    const args = { goal: 'general', days: 4, lengthMinutes: 75, equipment: 'full_gym', experience: 'intermediate', focus: [] };
    const r = build(args);
    expect(r.ok).toBe(true);
    if (!r.report.needsLengthChoice && !r.report.needsFocusChoice) expect(structureOptions(r, args)).toEqual([]);
    const refusal = { reason: 'minimum_unreachable', suggestedDays: 4, suggestedLength: 75 };
    const options = structureOptions({ ok: false, refusal }, { days: 2, lengthMinutes: 60 });
    expect(structureRefusal(refusal, { days: 2, lengthMinutes: 60 }).options).toBeUndefined();
    expect(options).toEqual([{ kind: 'days', change: { daysPerWeek: 4, sessionLengthMinutes: 75 }, key: 'days-0', label: '4 days a week of 75 minutes' }]);
  });

  test('a choice changes only the profile fields it names', () => {
    const profile = { trainingGoal: 'bodybuilding', daysPerWeek: 4, sessionLengthMinutes: 60, planWeakPoints: ['Upper Chest', 'Chest', 'Biceps'], equipment: 'full_gym' };
    expect(profileWithOption(profile, { kind: 'keep', change: null })).toBe(profile);
    expect(profileWithOption(profile, { kind: 'days', change: { daysPerWeek: 5 } })).toEqual({ ...profile, daysPerWeek: 5 });
    expect(profileWithOption(profile, { kind: 'length', change: { sessionLengthMinutes: 75 } })).toEqual({ ...profile, sessionLengthMinutes: 75 });
    expect(profileWithOption(profile, { kind: 'drop_focus', change: { dropFocus: ['chest'] } })).toEqual({ ...profile, planWeakPoints: ['Biceps'] });
    // The profile handed in is never changed.
    expect(profile.planWeakPoints).toEqual(['Upper Chest', 'Chest', 'Biceps']);
  });

  test('the labels say what each choice is', () => {
    const args = { days: 3, lengthMinutes: 45 };
    expect(optionLabel({ kind: 'length', change: { sessionLengthMinutes: 75 } }, args)).toBe('Sessions of 75 minutes, 3 days a week');
    expect(optionLabel({ kind: 'days', change: { daysPerWeek: 4 } }, args)).toBe('4 days a week of 45 minutes');
    expect(optionLabel({ kind: 'keep', change: null }, args)).toBe('Keep this plan: 3 days a week of 45 minutes');
  });

  test('a structure plan\'s spacing line makes no recovery claim', () => {
    const args = { goal: 'mens_physique', days: 3, lengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', focus: [] };
    const { r, facts } = factsFor(args);
    const sessions = r.plan.sessions.map((s, i) => ({ id: `r${i}`, name: s.name }));
    const lines = explainPlan({ facts, sessions, week: 1, sessionLengthMinutes: 60 })?.lines ?? [];
    const spacing = lines.find((l) => l.id === 'spacing');
    expect(spacing).toBeTruthy();
    expect(spacing.text).not.toMatch(/recover/i);
    // The explanation says the words messages.js holds (R80).
    expect([structureSpacingText(70, 100, true), structureSpacingText(20, 50, false)].map((t) => t.replace(/[0-9]+/g, '#')))
      .toContain(spacing.text.replace(/[0-9]+/g, '#'));
    expect(structureSpacingText(70, 100, true)).not.toMatch(/recover/i);
    expect(structureSpacingText(20, 50, false)).not.toMatch(/recover/i);
  });
});

describe('R74 and R76: serving', () => {
  const args = { goal: 'mens_physique', days: 3, lengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', focus: [] };
  let facts;
  let rows;
  beforeAll(() => {
    ({ facts } = factsFor(args));
    rows = facts.structure.sessions[0].exercises.map((ex) => ({ exerciseId: ex.exerciseId, slotId: ex.routineExerciseId }));
  });

  test('the injury ramp lowers an exercise\'s ladder and never raises it', () => {
    const plain = structureServedWeek({ facts, routineId: 'r0', weekIndex: 3, exercises: rows });
    const s0 = facts.structure.sessions[0].exercises[0];
    const app = { lats: 'back', upper_back: 'back', glute_max: 'glutes', glute_med: 'glutes' }[s0.muscle] ?? s0.muscle;
    const planned = facts.weeklyTargets[app][2];
    const low = structureServedWeek({ facts, routineId: 'r0', weekIndex: 3, exercises: rows, ramp: { [app]: Math.floor(planned / 2) } });
    expect(low.sets[s0.exerciseId]).toBeLessThan(plain.sets[s0.exerciseId]);
    expect(low.sets[s0.exerciseId]).toBeGreaterThanOrEqual(1);
    // A ramp figure at or above the plan's never raises.
    const high = structureServedWeek({ facts, routineId: 'r0', weekIndex: 3, exercises: rows, ramp: { [app]: planned + 10 } });
    expect(high.sets).toEqual(plain.sets);
    // No ramp: as phase 6 served it.
    expect(structureServedWeek({ facts, routineId: 'r0', weekIndex: 3, exercises: rows, ramp: {} }).sets).toEqual(plain.sets);
  });

  test('a typed count is served as typed, and halved in the recovery week', () => {
    const typed = { ...facts, typed: { [rows[0].slotId]: 5 } };
    expect(structureServedWeek({ facts: typed, routineId: 'r0', weekIndex: 2, exercises: rows }).sets[rows[0].exerciseId]).toBe(5);
    expect(structureServedWeek({ facts: typed, routineId: 'r0', weekIndex: 6, isDeload: true, exercises: rows }).sets[rows[0].exerciseId]).toBe(Math.round(5 * PROGRESSION.deloadFraction));
  });
});

describe('R75: swaps', () => {
  const args = { goal: 'general', days: 4, lengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', focus: [] };
  let plan;
  beforeAll(() => { plan = planFromFacts(factsFor(args).facts); });

  test('an exercise of the same movement is offered; one the rulebook cannot check is not', () => {
    const at = { sessionIndex: 0, exerciseIndex: 0 };
    const ex = plan.sessions[0].exercises[0];
    const before = faultsOf(plan);
    // Its own exercise is always allowed.
    expect(swapAllowed(plan, at, BY_NAME.get(ex.id) || { id: ex.id, name: ex.name }, before)).toBe(true);
    expect(swapAllowed(plan, at, { id: 'custom-1', name: 'My Own Move' }, before)).toBe(false);
    // An exercise already in the neighbouring session is a new fault (C16).
    const next = plan.sessions[1].exercises.find((x) => PATTERNS[x.pattern].muscle === PATTERNS[ex.pattern].muscle)
      || plan.sessions[plan.sessions.length - 1].exercises.find((x) => PATTERNS[x.pattern].muscle === PATTERNS[ex.pattern].muscle);
    if (next && next.id !== ex.id) {
      const row = LIBRARY.find((x) => x.id === next.id);
      expect(swapAllowed(plan, at, row, before)).toBe(false);
    }
  });

  test('a row the engine did not build is not filtered', () => {
    expect(swapAllowed(plan, { routineExerciseId: 'by-hand' }, { id: 'x', name: 'x' })).toBe(true);
  });
});

describe('R78 and R80: the check-in card', () => {
  test('describes the change, says what could not be placed, never instructs', () => {
    const args = { goal: 'bikini', days: 4, lengthMinutes: 75, equipment: 'full_gym', experience: 'beginner', focus: [] };
    const plan = planFromFacts(factsFor(args).facts);
    for (const kind of ['raise', 'hold', 'reduce']) {
      const card = structureCheckinCard(structureCheckin(plan, { kind, fromWeek: 3 }));
      const text = [card.heading, ...card.lines, ...card.unplacedLines, card.notRaisedLine, card.ifLeft].filter(Boolean).join(' ');
      expect(text).not.toMatch(EM_DASH);
      expect(text).not.toMatch(/\byou should\b|\bmust\b|\bdo more\b/i);
      if (kind === 'hold') expect(card.showApply).toBe(false);
    }
    const full = structureCheckinCard({ kind: 'raise', muscles: [], opened: [], unplaced: ['chest'], notRaised: [], changed: false });
    expect(full.unplacedLines).toEqual(['No room for more chest this block.']);
    expect(full.showApply).toBe(false);
  });

  test('the reason for a change is plain and said once', () => {
    const reason = changeReason([
      { code: 'C4', muscle: 'chest', detail: 'chest 8 sets a week, below the minimum 10' },
      { code: 'C4', muscle: 'chest', detail: 'chest 8 sets a week, below the minimum 10' },
      { code: 'C16', detail: 'x in neighbouring sessions' },
    ]);
    expect(reason).toBe('With this change chest would get fewer sets a week than its minimum, and the same exercise would be in two sessions in a row.');
    expect(changeReason([])).toBeNull();
  });
});

describe('R79: the next block, and fixed programmes', () => {
  test('a fresh ladder keeps each exercise\'s peak and starts from week 1', () => {
    const plan = planFromFacts(factsFor({ goal: 'general', days: 3, lengthMinutes: 60, equipment: 'full_gym', experience: 'intermediate', focus: [] }).facts);
    // A check-in raised the first exercise from week 3.
    const raised = JSON.parse(JSON.stringify(plan));
    const ex = raised.sessions[0].exercises.find((x) => x.weeks[4].sets <= 3);
    ex.weeks = ex.weeks.map((w, i) => (i >= 2 && i < 5 ? { ...w, sets: w.sets + 1 } : w));
    const r = freshLadder(raised);
    const after = r.plan.sessions[0].exercises.find((x) => x.routineExerciseId === ex.routineExerciseId);
    expect(after.weeks[4].sets).toBe(ex.weeks[4].sets);
    expect(after.weeks[0].sets).toBeLessThanOrEqual(after.weeks[4].sets);
    expect(after.weeks[5].sets).toBe(Math.max(1, Math.round(PROGRESSION.deloadFraction * ex.weeks[4].sets)));
  });

  test('a fixed programme is checked with the checks for any plan only, and never changed', () => {
    const row = (name, sets = 3) => ({ exercise: LIBRARY.find((x) => x.name === name), routineExercise: { recommendedSets: sets } });
    // The same exercise in two neighbouring sessions (C16); no category checks.
    const sessions = [
      { key: 'a', rows: [row('Barbell Back Squat'), row('Leg Extension')] },
      { key: 'b', rows: [row('Barbell Back Squat'), row('Seated Leg Curl')] },
    ];
    const faults = checkFixedPlan(sessions);
    expect(faults.some((f) => f.code === 'C16')).toBe(true);
    expect(faults.some((f) => ['C1', 'C4', 'C17', 'C18'].includes(f.code))).toBe(false);
    expect(fixedPlanNote(faults)).toMatch(/^This plan is kept as it was written\. As written, /);
    // A plan that passes says nothing.
    const fine = [{ key: 'a', rows: [row('Leg Extension')] }, { key: 'b', rows: [row('Barbell Bench Press')] }, { key: 'c', rows: [row('Seated Leg Curl')] }];
    expect(fixedPlanNote(checkFixedPlan(fine))).toBeNull();
    // An exercise the rulebook cannot check, or a circuit station, is left out.
    expect(checkFixedPlan([{ key: 'a', rows: [{ exercise: { id: 'c', name: 'Mine' }, routineExercise: { recommendedSets: 9 } }] }])).toEqual([]);
  });
});
