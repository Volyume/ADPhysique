/**
 * addFlow.test.js - the add wizard's pure core (flow audit 2026-09-03, D133).
 *
 * Pins what the wizard promises a person and what it writes:
 *  - the step plan is COMPUTED, includes every question the path needs
 *    and none it does not, assumes the longer path while the role is
 *    unknown (the count only shrinks), and never skips the role for a
 *    preselected draft (GC-D1);
 *  - the check step restates EVERY decision, not just the rule labels
 *    (ARCHITECTURE section 33.16);
 *  - the rows written are the same rows the old inline writeDraft built:
 *    an allowance is baseline and self-sourced, an episode carries its
 *    group and planned end, a side is stored only where it carves;
 *  - the saved sentence and "what happens next" say the same thing the
 *    old toast said, and name the check-in date.
 */
import {
  ADD_STEP, ADD_KIND, emptyDraft, applyPreselect, planSteps, stepPosition, nextStep, prevStep,
  canContinue, draftTouched, sideQuestion, summaryLines, draftRows, savedSentence, whatHappensNext,
  whichLabel, START_CHOICES, END_CHOICES,
} from '../addFlow';
import { CONSTRAINT_ROLE, CONSTRAINT_SOURCE, CONSTRAINT_RULE_KIND } from '../model';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 3, 12, 0, 0); // 2026-09-03 12:00Z

const demandDraft = (over = {}) => ({ ...emptyDraft(), kind: ADD_KIND.DEMAND, axes: ['standing'], ...over });

describe('planSteps - the path is computed and honest', () => {
  test('a fresh draft assumes the longer (temporary) path until the role is answered', () => {
    expect(planSteps(emptyDraft())).toEqual([ADD_STEP.WHAT, ADD_STEP.WHICH, ADD_STEP.WHEN, ADD_STEP.SINCE, ADD_STEP.UNTIL, ADD_STEP.CHECK]);
  });
  test('choosing "generally" removes the date steps; the count shrinks, never grows', () => {
    const before = planSteps(demandDraft()).length;
    const after = planSteps(demandDraft({ role: CONSTRAINT_ROLE.BASELINE })).length;
    expect(after).toBe(before - 2);
    expect(planSteps(demandDraft({ role: CONSTRAINT_ROLE.BASELINE }))).toEqual([ADD_STEP.WHAT, ADD_STEP.WHICH, ADD_STEP.WHEN, ADD_STEP.CHECK]);
  });
  test('an allowance is baseline by construction: no WHEN, no dates', () => {
    const d = { ...emptyDraft(), kind: ADD_KIND.ALLOW, role: CONSTRAINT_ROLE.BASELINE, exercises: [{ id: 'x', name: 'Leg press' }] };
    expect(planSteps(d)).toEqual([ADD_STEP.WHAT, ADD_STEP.WHICH, ADD_STEP.CHECK]);
  });
  test('a side-carveable axis adds the SIDE step; a whole-body axis does not', () => {
    expect(planSteps(demandDraft({ axes: ['overhead_position'] }))).toContain(ADD_STEP.SIDE);
    expect(planSteps(demandDraft({ axes: ['standing'] }))).not.toContain(ADD_STEP.SIDE);
  });
  test('an unconsented user gets the consent step after the check', () => {
    const steps = planSteps(demandDraft(), { consented: false });
    expect(steps.slice(-2)).toEqual([ADD_STEP.CHECK, ADD_STEP.CONSENT]);
  });
  test('a preselected draft skips what it already knows but NEVER the role question (GC-D1)', () => {
    const d = emptyDraft({ kind: 'demand', axes: ['overhead_position'], from: { name: 'AC joint trouble', kind: 'injury' } });
    const steps = planSteps(d);
    expect(steps[0]).toBe(ADD_STEP.SIDE);
    expect(steps).toContain(ADD_STEP.WHEN);
    expect(steps).not.toContain(ADD_STEP.WHAT);
    expect(steps).not.toContain(ADD_STEP.WHICH);
    expect(d.role).toBeNull();
  });
  test('a preselect with a kind but no content still asks WHICH', () => {
    const d = emptyDraft({ kind: 'exercise', exerciseNames: ['Bench press'] }); // unresolved until applyPreselect
    expect(planSteps(d)).toContain(ADD_STEP.WHICH);
    const resolved = applyPreselect(d, { kind: 'exercise', exerciseNames: ['Bench press'] }, [{ id: 'e1', name: 'Bench press' }]);
    expect(planSteps(resolved)).not.toContain(ADD_STEP.WHICH);
    expect(resolved.exercises).toEqual([{ id: 'e1', name: 'Bench press' }]);
  });
});

describe('stepPosition / nextStep / prevStep', () => {
  test('positions are 1-based against the current plan', () => {
    const d = demandDraft();
    expect(stepPosition(d, ADD_STEP.WHAT)).toEqual({ index: 1, total: 6 });
    expect(stepPosition(d, ADD_STEP.CHECK)).toEqual({ index: 6, total: 6 });
    expect(stepPosition(d, ADD_STEP.PLAN).index).toBeNull();
  });
  test('next and previous walk the plan and stop at its ends', () => {
    const d = demandDraft();
    expect(nextStep(d, ADD_STEP.WHAT)).toBe(ADD_STEP.WHICH);
    expect(prevStep(d, ADD_STEP.WHAT)).toBeNull();
    expect(nextStep(d, ADD_STEP.CHECK)).toBeNull();
    expect(prevStep(d, ADD_STEP.CHECK)).toBe(ADD_STEP.UNTIL);
  });
});

describe('canContinue - each step is gated on its own answer', () => {
  test('WHAT needs a kind, WHICH needs content, SIDE needs a side, WHEN needs a role', () => {
    expect(canContinue(emptyDraft(), ADD_STEP.WHAT)).toBe(false);
    expect(canContinue({ ...emptyDraft(), kind: ADD_KIND.DEMAND }, ADD_STEP.WHICH)).toBe(false);
    expect(canContinue(demandDraft(), ADD_STEP.WHICH)).toBe(true);
    expect(canContinue(demandDraft(), ADD_STEP.SIDE)).toBe(false);
    expect(canContinue(demandDraft({ side: 'both' }), ADD_STEP.SIDE)).toBe(true);
    expect(canContinue(demandDraft(), ADD_STEP.WHEN)).toBe(false);
    expect(canContinue(demandDraft({ role: CONSTRAINT_ROLE.EPISODE }), ADD_STEP.WHEN)).toBe(true);
  });
  test('the date steps accept their defaults (today; until I end it)', () => {
    expect(canContinue(demandDraft(), ADD_STEP.SINCE)).toBe(true);
    expect(canContinue(demandDraft(), ADD_STEP.UNTIL)).toBe(true);
  });
  test('draftTouched is false for an empty draft and true after any answer', () => {
    expect(draftTouched(emptyDraft())).toBe(false);
    expect(draftTouched({ ...emptyDraft(), kind: ADD_KIND.DEMAND })).toBe(true);
  });
});

describe('summaryLines - the check step restates every decision', () => {
  test('a temporary sided demand rule lists what, how long (with the date), since, side and clinician', () => {
    const d = demandDraft({ axes: ['overhead_position'], side: 'left', role: CONSTRAINT_ROLE.EPISODE, startDays: 0, endDays: 14, clinician: true });
    const keys = summaryLines(d, { nowMs: NOW }).map((l) => l.key);
    expect(keys).toEqual(['what', 'when', 'since', 'side', 'clinician']);
    const when = summaryLines(d, { nowMs: NOW }).find((l) => l.key === 'when');
    expect(when.value).toMatch(/^Temporary, about two weeks \(around 17 Sep\)$/);
    expect(when.step).toBe(ADD_STEP.UNTIL);
    const side = summaryLines(d, { nowMs: NOW }).find((l) => l.key === 'side');
    expect(side.value).toBe('Left shoulder');
    expect(summaryLines(d, { nowMs: NOW }).find((l) => l.key === 'clinician').value).toBe('Yes');
  });
  test('an open-ended temporary rule says so; a permanent rule has no date rows', () => {
    const open = demandDraft({ role: CONSTRAINT_ROLE.EPISODE, endDays: null });
    expect(summaryLines(open, { nowMs: NOW }).find((l) => l.key === 'when').value).toBe('Temporary, until you end it');
    const perm = demandDraft({ role: CONSTRAINT_ROLE.BASELINE });
    const keys = summaryLines(perm, { nowMs: NOW }).map((l) => l.key);
    expect(keys).toEqual(['what', 'when', 'clinician']);
    expect(summaryLines(perm, { nowMs: NOW }).find((l) => l.key === 'when').value).toBe('Part of how you train generally');
  });
  test('no side row when no chosen axis carves by side', () => {
    expect(summaryLines(demandDraft({ role: CONSTRAINT_ROLE.BASELINE }), { nowMs: NOW }).some((l) => l.key === 'side')).toBe(false);
    expect(sideQuestion(demandDraft())).toBeNull();
    expect(sideQuestion(demandDraft({ axes: ['grip_bar'] }))).toEqual({ question: 'Which hand?', left: 'Left hand', right: 'Right hand', both: 'Both hands' });
  });
  test('an allowance shows what and that it always applies, with no clinician row', () => {
    const d = { ...emptyDraft(), kind: ADD_KIND.ALLOW, role: CONSTRAINT_ROLE.BASELINE, exercises: [{ id: 'x', name: 'Leg press' }] };
    const lines = summaryLines(d, { nowMs: NOW });
    expect(lines.map((l) => l.key)).toEqual(['what', 'when']);
    expect(lines[1].value).toMatch(/^Always\./);
  });
  test('a preselected what-row has no Change link (its content came from the directory)', () => {
    const d = emptyDraft({ kind: 'demand', axes: ['standing'] });
    expect(summaryLines(d, { nowMs: NOW })[0].step).toBeNull();
    expect(summaryLines(demandDraft(), { nowMs: NOW })[0].step).toBe(ADD_STEP.WHICH);
  });
});

describe('draftRows - the same rows the inline flow wrote', () => {
  test('a temporary sided demand rule: episode role, group, planned end, laterality only where it carves', () => {
    const d = demandDraft({ axes: ['overhead_position', 'standing'], side: 'left', role: CONSTRAINT_ROLE.EPISODE, startDays: 7, endDays: 14 });
    const rows = draftRows(d, { nowMs: NOW, groupId: 'g1' });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      role: CONSTRAINT_ROLE.EPISODE, source: CONSTRAINT_SOURCE.SELF, episodeGroupId: 'g1',
      startsAt: NOW - 7 * DAY, endsAt: NOW + 14 * DAY,
      ruleKind: CONSTRAINT_RULE_KIND.DEMAND, ruleValue: 'overhead_position', laterality: 'left',
    });
    expect(rows[1]).toMatchObject({ ruleValue: 'standing', laterality: null });
  });
  test('"both sides" stores no side', () => {
    const d = demandDraft({ axes: ['overhead_position'], side: 'both', role: CONSTRAINT_ROLE.BASELINE });
    expect(draftRows(d, { nowMs: NOW, groupId: 'g' })[0].laterality).toBeNull();
  });
  test('a permanent rule carries no group and no end; a clinician-reported one carries its source', () => {
    const d = demandDraft({ role: CONSTRAINT_ROLE.BASELINE, clinician: true });
    const [row] = draftRows(d, { nowMs: NOW, groupId: 'ignored' });
    expect(row).toMatchObject({ role: CONSTRAINT_ROLE.BASELINE, episodeGroupId: null, endsAt: null, source: CONSTRAINT_SOURCE.CLINICIAN_REPORTED });
  });
  test('an allowance is always baseline and always the user\'s own call, whatever the clinician switch says', () => {
    const d = { ...emptyDraft(), kind: ADD_KIND.ALLOW, role: CONSTRAINT_ROLE.BASELINE, clinician: true, exercises: [{ id: 'e1', name: 'Leg press' }] };
    const [row] = draftRows(d, { nowMs: NOW, groupId: 'g' });
    expect(row).toMatchObject({ role: CONSTRAINT_ROLE.BASELINE, source: CONSTRAINT_SOURCE.SELF, ruleKind: CONSTRAINT_RULE_KIND.EXERCISE_ALLOW, ruleValue: 'e1', episodeGroupId: null });
  });
  test('families and exercises write their own kinds in one batch', () => {
    const d = { ...emptyDraft(), kind: ADD_KIND.FAMILY, families: ['squat'], role: CONSTRAINT_ROLE.EPISODE };
    expect(draftRows(d, { nowMs: NOW, groupId: 'g' })[0]).toMatchObject({ ruleKind: CONSTRAINT_RULE_KIND.FAMILY, ruleValue: 'squat', episodeGroupId: 'g' });
    const e = { ...emptyDraft(), kind: ADD_KIND.EXERCISE, exercises: [{ id: 'e1', name: 'Bench' }], role: CONSTRAINT_ROLE.BASELINE };
    expect(draftRows(e, { nowMs: NOW, groupId: 'g' })[0]).toMatchObject({ ruleKind: CONSTRAINT_RULE_KIND.EXERCISE, ruleValue: 'e1', episodeGroupId: null });
  });
});

describe('savedSentence / whatHappensNext - the flow ends by saying what it did', () => {
  test('the sentence names the subject and matches the old toast words', () => {
    expect(savedSentence(demandDraft({ role: CONSTRAINT_ROLE.EPISODE }))).toBe('Volyume will keep standing work out of your training for now.');
    expect(savedSentence(demandDraft({ role: CONSTRAINT_ROLE.BASELINE }))).toBe('Volyume will build your training around standing work from now on.');
    const allow = { ...emptyDraft(), kind: ADD_KIND.ALLOW, role: CONSTRAINT_ROLE.BASELINE, exercises: [{ id: 'e1', name: 'Leg press' }] };
    expect(savedSentence(allow)).toBe('Volyume will keep offering Leg press, even where your other answers would normally leave it out.');
  });
  test('a dated temporary rule says when Volyume will ask and that nothing ends by itself', () => {
    const next = whatHappensNext(demandDraft({ role: CONSTRAINT_ROLE.EPISODE, endDays: 14 }), { nowMs: NOW });
    expect(next[0]).toBe('Around 17 Sep, Volyume asks whether you still need this. Nothing ends until you say so.');
    expect(next[1]).toMatch(/end it under How you train/);
  });
  test('an applied plan decision is reported first', () => {
    const next = whatHappensNext(demandDraft({ role: CONSTRAINT_ROLE.EPISODE }), { nowMs: NOW, planDecision: 'applied' });
    expect(next[0]).toBe('Your current plan is updated for this from your next session.');
  });
  test('labels read in the person\'s words', () => {
    expect(whichLabel(demandDraft({ axes: ['overhead_position'], side: 'right' }))).toBe('Overhead work with your right shoulder');
    expect(START_CHOICES.map((c) => c.days)).toEqual([0, 7, 14]);
    expect(END_CHOICES.map((c) => c.days)).toEqual([null, 7, 14, 30]);
  });
});
