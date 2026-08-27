/**
 * P1 coaching apply atomicity (adversarial audit 2026-08-26).
 *
 * The audit reported both directions of the same problem. Reconciled against
 * current main, only one of them was live:
 *
 *   A. some writes fail -> receipt must NOT say applied.
 *      Already correct. Every apply handler performs its authoritative write
 *      with `await` BEFORE markApplied is reached, so a failed write throws
 *      past the receipt entirely and nothing is marked applied. Pinned below
 *      so it stays that way.
 *
 *   B. writes succeed -> receipt fails -> the change can be applied again.
 *      This WAS live on both nutrition rows. saveCoachOutput is a second,
 *      independent write. When it threw, the outer catch logged and the
 *      handler abandoned its remaining state updates, so:
 *        - setCurrentTargets never ran, leaving the consent preview showing a
 *          base the athlete's real target had already moved off;
 *        - setOutput never ran, so the row still offered Apply;
 *        - nothing told the athlete anything had happened.
 *      A calorie target that had already moved could therefore take a second
 *      step from a stale base. On an ED-safety-adjacent number that is the
 *      kind of quiet compounding this suite exists to prevent.
 *
 * scr CoachOutputScreen pulls the whole screen stack in at import time, so this
 * is a source guard, matching the house convention used by the other
 * CoachOutputScreen guard suites.
 *
 * NOTE ON SCOPE: nothing here touches the calorie floor computation. The floors
 * remain enforced in coachApply/nutritionEngine exactly as before; this is
 * ordering and honesty only.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'CoachOutputScreen.js'), 'utf8',
);

function handler(name) {
  const start = SRC.indexOf(`async function ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const rest = SRC.slice(start + 1);
  const next = rest.indexOf('\n  async function ');
  return rest.slice(0, next === -1 ? rest.length : next);
}

describe('direction A: a failed authoritative write never produces a receipt', () => {
  test.each([
    ['handleApplyCalories', 'saveNutritionTargets'],
    ['handleApplyDietBreak', 'saveNutritionTargets'],
  ])('%s awaits %s before markApplied', (fn, write) => {
    const body = handler(fn);
    const writeAt = body.indexOf(`await ${write}(`);
    const receiptAt = body.indexOf('markApplied(');
    expect(writeAt).toBeGreaterThan(-1);
    expect(receiptAt).toBeGreaterThan(-1);
    expect(writeAt).toBeLessThan(receiptAt);
  });
});

describe('direction B: a failed receipt cannot enable a second application', () => {
  test.each(['handleApplyCalories', 'handleApplyDietBreak'])(
    '%s reflects the real target BEFORE writing the receipt', (fn) => {
      // The ordering IS the fix. With setCurrentTargets after saveCoachOutput,
      // a receipt failure left the preview on a stale base.
      const body = handler(fn);
      const targetsAt = body.indexOf('setCurrentTargets(computed.targets)');
      const receiptAt = body.indexOf('await saveCoachOutput(');
      expect(targetsAt).toBeGreaterThan(-1);
      expect(receiptAt).toBeGreaterThan(-1);
      expect(targetsAt).toBeLessThan(receiptAt);
    },
  );

  test.each(['handleApplyCalories', 'handleApplyDietBreak'])(
    '%s isolates the receipt write so its failure cannot abandon the handler', (fn) => {
      const body = handler(fn);
      expect(body).toMatch(/let receiptOk = true;/);
      expect(body).toMatch(/try \{\s*await saveCoachOutput\(/);
      expect(body).toMatch(/receiptOk = false;/);
    },
  );

  test.each(['handleApplyCalories', 'handleApplyDietBreak'])(
    '%s still marks the row applied in memory when the receipt fails', (fn) => {
      // The change DID happen. Leaving the row offering Apply would invite the
      // second, compounding tap.
      const body = handler(fn);
      const receiptAt = body.indexOf('receiptOk = false;');
      const setOutputAt = body.indexOf('setOutput(updated);');
      expect(setOutputAt).toBeGreaterThan(receiptAt);
    },
  );

  test.each(['handleApplyCalories', 'handleApplyDietBreak'])(
    '%s tells the athlete the record failed rather than staying silent', (fn) => {
      const body = handler(fn);
      expect(body).toMatch(/We could not save the record of it/);
    },
  );

  test('the receipt failure is logged under its own scope, not folded into the outer catch', () => {
    expect(SRC).toMatch(/logError\('CoachOutputScreen\.applyCalories\.receipt'/);
    expect(SRC).toMatch(/logError\('CoachOutputScreen\.applyDietBreak\.receipt'/);
  });
});

describe('the ED-safety floor path is untouched by this change', () => {
  test('the floor classification and computation still gate the write', () => {
    const body = handler('handleApplyCalories');
    const classifyAt = body.indexOf('classifyCalorieApply(');
    const computeAt = body.indexOf('computeCalorieTargets(');
    const writeAt = body.indexOf('await saveNutritionTargets(');
    expect(classifyAt).toBeGreaterThan(-1);
    expect(computeAt).toBeGreaterThan(-1);
    expect(classifyAt).toBeLessThan(writeAt);
    expect(computeAt).toBeLessThan(writeAt);
  });

  test('a null computed result still aborts before any write', () => {
    const body = handler('handleApplyCalories');
    expect(body).toMatch(/if \(!computed\) \{[\s\S]*?return;/);
  });
});
