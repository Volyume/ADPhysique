/**
 * campaign16.rationale.test.js — Campaign 16 jobs 10 and 11.
 *
 * FOUNDER BRIEF: "Do not reverse-engineer explanations from names after
 * generation. Keep/change decisions must emit machine-readable reasons.
 * Copy consumes these." And: the user should understand why this split,
 * why these exercises, why these movement families, why this volume, why
 * something stayed and why something changed, without implementation
 * jargon.
 *
 * THE RULE THIS SUITE ENFORCES
 *
 * An explanation composed AFTER generation, by reading the finished plan,
 * is a plausible story rather than the actual reason, and nobody reading it
 * could tell the difference. So every reason is a code emitted at the
 * moment the decision was made, and the copy layer only translates.
 */

const fs = require('fs');
const path = require('path');
const { generatePlan, SELECTION_REASON } = require('../planEngine');
const {
  explainSelection, explainReason, buildChangeReceipt, receiptHeadline,
  buildPlanExplanation,
} = require('../planRationale');
const { SLOT_REASON } = require('../programmeEpoch');
const { SLOT_OUTCOME } = require('../exercise/continuity');
const { LIBRARY, inputs, planExercises } = require('./campaign16.helpers');

const plan = over => generatePlan({ ...inputs(over), exerciseLibrary: LIBRARY });

// ---------------------------------------------------------------------------

describe('C16-10 every generated exercise carries the reason it was chosen', () => {
  test('the reason is emitted by the engine, on every exercise, on every profile', () => {
    const missing = [];
    for (const over of [{}, { daysPerWeek: 3 }, { daysPerWeek: 6 }, { equipment: 'bodyweight' },
      { goal: 'bikini', daysPerWeek: 4 }, { experience: 'beginner', daysPerWeek: 3 }]) {
      for (const e of planExercises(plan(over))) {
        if (!e.selectionReason) missing.push(`${JSON.stringify(over)} ${e.exerciseName}`);
      }
    }
    expect(missing).toEqual([]);
  });

  test('every emitted reason is one of the closed set', () => {
    const valid = new Set(Object.values(SELECTION_REASON));
    for (const e of planExercises(plan({ daysPerWeek: 5 }))) {
      expect(valid.has(e.selectionReason)).toBe(true);
    }
  });

  test('a plan really does use more than one reason', () => {
    // If everything came back the same the field would be decoration.
    const reasons = new Set(planExercises(plan({ daysPerWeek: 4 })).map(e => e.selectionReason));
    expect(reasons.size).toBeGreaterThan(1);
  });

  test('the required-role reason lands on the exercises that cover a role', () => {
    // Back must contain a vertical pull, and the exercise covering it
    // should say that is why it is there.
    const p = plan({ daysPerWeek: 4 });
    const BY = new Map(LIBRARY.map(e => [e.name, e]));
    const backs = planExercises(p).filter(
      e => BY.get(e.exerciseName)?.primaryMuscle === 'back');
    expect(backs.some(e => e.selectionReason === SELECTION_REASON.REQUIRED_ROLE)).toBe(true);
  });

  test('the reason is decided at selection, not derived afterwards', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../planEngine.js'), 'utf8');
    // Stamped inside the selector, on the entry, before the plan exists.
    expect(src).toMatch(/candidate\._why = /);
    expect(src).toMatch(/e\._why = allowSameSub/);
    // The copy layer never inspects a name.
    const rationale = fs.readFileSync(path.resolve(__dirname, '../planRationale.js'), 'utf8');
    expect(rationale).not.toMatch(/exerciseName\.(includes|match|indexOf|toLowerCase)/);
    expect(rationale).not.toMatch(/primaryMuscle|movementFamily/);
  });
});

describe('C16-10 the explanation reads like English, not like the code', () => {
  test('every selection reason maps to copy', () => {
    for (const r of Object.values(SELECTION_REASON)) {
      expect(typeof explainSelection(r)).toBe('string');
      expect(explainSelection(r).length).toBeGreaterThan(10);
    }
  });

  test('an unknown code returns null rather than inventing a sentence', () => {
    // The failure mode the rule exists to prevent: a generic fallback that
    // reads like a reason and is not one.
    expect(explainSelection('something_new')).toBeNull();
    expect(explainReason('something_new')).toBeNull();
  });

  test('no implementation word reaches the user', () => {
    const strings = [
      ...Object.values(SELECTION_REASON).map(explainSelection),
      ...Object.values(SLOT_REASON).map(explainReason),
    ].filter(Boolean);
    expect(strings.length).toBeGreaterThan(10);
    for (const s of strings) {
      expect(s.toLowerCase()).not.toMatch(/\bslot\b|\bfamily\b|\bverdict\b|canonical|subregion|\brole\b|epoch|paramkey/);
      expect(s).not.toMatch(/—/);
      expect(s).not.toMatch(/\bcolor\b|\bbehavior\b|\boptimize\b/);
    }
  });

  test('the plan explanation carries both halves', () => {
    // The split/days/volume narrative and the per-exercise reasons answer
    // different questions and neither is derived from the other.
    const e = buildPlanExplanation(plan({ daysPerWeek: 4 }));
    expect(e.narrative).toBeTruthy();
    expect(typeof e.narrative.schedule).toBe('string');
    expect(e.exercises.length).toBeGreaterThan(10);
    for (const row of e.exercises) {
      expect(row.exerciseName).toBeTruthy();
      expect(row.why).toBeTruthy();
    }
  });
});

describe('C16-11 the change receipt', () => {
  const decisions = [
    { outcome: SLOT_OUTCOME.RETAINED, exerciseName: 'Barbell Bench Press', workout: 'Upper', reason: SLOT_REASON.STILL_PRODUCTIVE, insteadOfName: 'Dumbbell Bench Press' },
    { outcome: SLOT_OUTCOME.RETAINED, exerciseName: 'Lat Pulldown (Wide Grip)', workout: 'Upper', reason: SLOT_REASON.PERSONAL_FIT_KEEP },
    { outcome: SLOT_OUTCOME.REPLACED, exerciseName: 'Seated Cable Row', workout: 'Upper', reason: SLOT_REASON.USER_EXCLUDED, previousExerciseName: 'Barbell Row (Bent Over)' },
    { outcome: SLOT_OUTCOME.NEW, exerciseName: 'Leg Extension', workout: 'Lower', reason: null },
  ];

  test('WHAT STAYS is a section of its own, not the leftovers', () => {
    const r = buildChangeReceipt(decisions);
    expect(r.stays).toHaveLength(2);
    expect(r.changes).toHaveLength(1);
    expect(r.added).toHaveLength(1);
    // Quality law 6: each retained exercise says WHY it was kept.
    for (const s of r.stays) expect(s.why).toBeTruthy();
  });

  test('a retained exercise records what it was kept instead of', () => {
    const r = buildChangeReceipt(decisions);
    expect(r.stays[0].insteadOfName).toBe('Dumbbell Bench Press');
  });

  test('a change names the exercise it replaces and why', () => {
    const r = buildChangeReceipt(decisions);
    expect(r.changes[0].previousExerciseName).toBe('Barbell Row (Bent Over)');
    expect(r.changes[0].why).toMatch(/asked not to be suggested/i);
  });

  test('the headline never says the programme has already changed', () => {
    const lines = [
      receiptHeadline(6, 0), receiptHeadline(6, 1), receiptHeadline(6, 3), receiptHeadline(0, 4),
    ];
    for (const l of lines) {
      expect(l).not.toMatch(/has changed|have changed|has been updated/i);
      expect(l).not.toMatch(/—/);
    }
  });

  test('an unchanged plan says staying put is the finding', () => {
    expect(receiptHeadline(6, 0)).toMatch(/nothing is changing/i);
    expect(receiptHeadline(6, 0)).toMatch(/still producing good evidence/i);
  });

  test('one change is singular, several are plural', () => {
    expect(receiptHeadline(5, 1)).toMatch(/1 exercise would change/);
    expect(receiptHeadline(5, 2)).toMatch(/2 exercises would change/);
  });

  test('every keep and change reason the engine can emit has copy', () => {
    // A reason with no copy would render an empty row on the receipt.
    const unmapped = Object.values(SLOT_REASON).filter(r => !explainReason(r));
    expect(unmapped).toEqual([]);
  });

  test('R5-2: the headline speaks a drop-only rebuild - it never denies the section beneath it', () => {
    // The reviewer's executed probe: retain every matched incumbent, drop
    // one unmatched one. The old headline read "Nothing is changing"
    // directly above "No longer in your plan - My Weird Chest Thing".
    const r = buildChangeReceipt([
      { outcome: SLOT_OUTCOME.RETAINED, exerciseName: 'Barbell Bench Press', workout: 'Upper', reason: SLOT_REASON.STILL_PRODUCTIVE },
      { outcome: SLOT_OUTCOME.NO_LONGER_IN, previousExerciseName: 'My Weird Chest Thing', previousExerciseId: 'ex-custom-1', workout: null, reason: SLOT_REASON.NO_MATCHING_SLOT },
    ]);
    expect(r.noLongerIn).toHaveLength(1);
    expect(r.headline).not.toMatch(/nothing is changing/i);
    expect(r.headline).toMatch(/1 exercise would no longer be in your plan/);
    // And the four-count arity directly:
    expect(receiptHeadline(1, 0, 0, 1)).toMatch(/no longer be in your plan/);
    expect(receiptHeadline(1, 0, 0, 0)).toMatch(/nothing is changing/i);
  });

  test('R5-2/R6-5: changes AND drops are both spoken, in one line that contradicts neither section', () => {
    const both = receiptHeadline(4, 2, 0, 1);
    expect(both).toMatch(/2 exercises would change/);
    expect(both).toMatch(/1 would no longer be in your plan/);
    const noStays = receiptHeadline(0, 1, 0, 2);
    expect(noStays).toMatch(/1 exercise would change and 2 would no longer be in your plan/);
    // The headline still never announces a done deal (shown pre-confirm).
    for (const l of [both, noStays, receiptHeadline(1, 0, 0, 1)]) {
      expect(l).not.toMatch(/has changed|have changed|has been updated/i);
      expect(l).not.toMatch(/—/);
    }
  });

  test('R6-5: the headline speaks ADDITIONS - it never denies the "New in your plan" section beneath it', () => {
    // The reviewer's executed probe, through buildChangeReceipt: retain
    // everything matched, add one genuinely new slot. The old headline
    // had no added parameter at all and read "Nothing is changing"
    // directly above "New in your plan - Bulgarian Split Squat".
    const r = buildChangeReceipt([
      { outcome: SLOT_OUTCOME.RETAINED, exerciseId: 'ex-b', exerciseName: 'Barbell Bench Press', workout: 'Upper', reason: SLOT_REASON.STILL_PRODUCTIVE },
      { outcome: SLOT_OUTCOME.NEW, exerciseId: 'ex-s', exerciseName: 'Bulgarian Split Squat', workout: 'Lower', reason: null },
    ]);
    expect(r.added).toHaveLength(1);
    expect(r.headline).not.toMatch(/nothing is changing/i);
    expect(r.headline).toMatch(/1 exercise would be new/);
  });

  test('R6-5: the rep-target statement SURVIVES drops and changes - additive, never suppressed', () => {
    // Probe B: a prescription change beside one drop. The old drop
    // branch returned first, so the only statement of the rep-target
    // change was replaced by "The rest stays as it is" - an affirmative
    // denial over moving rep targets.
    const withDrop = receiptHeadline(2, 0, 1, 1);
    expect(withDrop).toMatch(/1 exercise would no longer be in your plan/);
    expect(withDrop).toMatch(/1 rep target would change too\./);
    expect(withDrop).not.toMatch(/the rest stays as it is/i);
    const withChanges = receiptHeadline(3, 2, 2, 0);
    expect(withChanges).toMatch(/2 exercises would change/);
    expect(withChanges).toMatch(/2 rep targets would change too\./);
  });

  test('R6-5: every receipt line carries the exercise id, so renders key on identity', () => {
    const r = buildChangeReceipt([
      { outcome: SLOT_OUTCOME.RETAINED, exerciseId: 'ex-a', exerciseName: 'Bench', workout: 'U', reason: SLOT_REASON.STILL_PRODUCTIVE },
      { outcome: SLOT_OUTCOME.REPLACED, exerciseId: 'ex-b', exerciseName: 'Row', workout: 'U', reason: SLOT_REASON.PLATEAU, previousExerciseId: 'ex-c', previousExerciseName: 'Old Row' },
      { outcome: SLOT_OUTCOME.NEW, exerciseId: 'ex-d', exerciseName: 'Curl', workout: 'U', reason: null },
    ]);
    expect(r.stays[0].exerciseId).toBe('ex-a');
    expect(r.changes[0].exerciseId).toBe('ex-b');
    expect(r.changes[0].previousExerciseId).toBe('ex-c');
    expect(r.added[0].exerciseId).toBe('ex-d');
  });

  test('R5-3: a no-longer-in line carries the exercise ID, so renders key on identity, never a display name', () => {
    const r = buildChangeReceipt([
      { outcome: SLOT_OUTCOME.NO_LONGER_IN, previousExerciseName: 'Bench Press', previousExerciseId: 'ex-a', workout: null, reason: SLOT_REASON.NO_MATCHING_SLOT },
    ]);
    expect(r.noLongerIn[0].previousExerciseId).toBe('ex-a');
    expect(r.noLongerIn[0].exerciseName).toBe('Bench Press');
  });
});
