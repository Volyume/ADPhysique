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

// C3 (final audit 2026-10-17) SUPERSEDES the two-write design both
// directions below were written for: the target and its receipt are now ONE
// commit (database.js applyCoachCalorieAdjustmentAtomically), so a failed
// write leaves neither and a receipt can no longer fail on its own. The
// suites pin that shape instead.
describe('direction A: a failed write leaves no receipt and no moved target', () => {
  test.each(['handleApplyCalories', 'handleApplyDietBreak'])(
    '%s writes target and receipt through the one atomic call, never separately', (fn) => {
      // Only the handler itself (to its closing brace): the screen's weekly
      // recompute further down saves the coach output on its own, rightly.
      const whole = handler(fn);
      const body = whole.slice(0, whole.indexOf('\n  }\n'));
      expect(body).toMatch(/await applyCoachCalorieAdjustmentAtomically\(\{\s*userId: user\.id,\s*targets: computed\.targets,\s*coachOutput: \{ weekStart, \.\.\.updated \},\s*\}\);/);
      expect(body).not.toMatch(/await saveNutritionTargets\(/);
      expect(body).not.toMatch(/await saveCoachOutput\(/);
    },
  );

  test.each(['handleApplyCalories', 'handleApplyDietBreak'])(
    '%s builds the receipt before the commit and shows it only after', (fn) => {
      const body = handler(fn);
      const markAt = body.indexOf('markApplied(');
      const commitAt = body.indexOf('await applyCoachCalorieAdjustmentAtomically(');
      const targetsAt = body.indexOf('setCurrentTargets(computed.targets)');
      const outputAt = body.indexOf('setOutput(updated);');
      expect(markAt).toBeGreaterThan(-1);
      expect(markAt).toBeLessThan(commitAt);
      expect(targetsAt).toBeGreaterThan(commitAt);
      expect(outputAt).toBeGreaterThan(commitAt);
    },
  );
});

describe('direction B: a failed apply says so and changes nothing', () => {
  test.each([['handleApplyCalories', 'calories'], ['handleApplyDietBreak', 'dietBreak']])(
    '%s tells the athlete plainly when the commit fails', (fn, key) => {
      const body = handler(fn);
      expect(body).toMatch(new RegExp(`${key}: 'That did not apply, so nothing has changed\\. Please try again\\.'`));
    },
  );

  test('the commit is one transaction over both writes', () => {
    const DB = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'database.js'), 'utf8');
    const fnSrc = DB.slice(DB.indexOf('export async function applyCoachCalorieAdjustmentWithDb('));
    const bodySrc = fnSrc.slice(0, fnSrc.indexOf('\n}\n'));
    expect(bodySrc).toMatch(/runInTransaction\(d, async \(\) => \{\s*await saveNutritionTargetsInTx\(d, userId, targets\);\s*return saveCoachOutputInTx\(d, userId, coachOutput\);/);
  });
});

describe('the ED-safety floor path is untouched by this change', () => {
  test('the floor classification and computation still gate the write', () => {
    const body = handler('handleApplyCalories');
    const classifyAt = body.indexOf('classifyCalorieApply(');
    const computeAt = body.indexOf('computeCalorieTargets(');
    const writeAt = body.indexOf('await applyCoachCalorieAdjustmentAtomically(');
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
