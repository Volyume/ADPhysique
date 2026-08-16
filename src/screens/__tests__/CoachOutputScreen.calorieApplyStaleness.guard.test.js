/**
 * Release gate finding (final reliability audit, baseline 0480e6e4):
 * handleApplyCalories persisted a freshly-recomputed target unconditionally,
 * with no comparison against what the row's pre-tap preview (caloriePreview,
 * built from the currentTargets state at the last render) actually showed
 * the athlete. Because CoachOutputScreen can stay mounted across a tab
 * switch (not unmounted), if the athlete's nutrition target changed
 * elsewhere - a recalculation on NutritionTargetsScreen, or a cross-device
 * sync landing in the background - while this screen sat on a stale
 * preview, tapping Apply here would persist and receipt a DIFFERENT number
 * than the one the athlete consented to seeing: a consequential nutrition
 * write applied differently from the copy shown at the moment of consent.
 *
 * handleApplyDietBreak (same file, same screen) already implements exactly
 * this guard for its own row - recompute at tap time, compare against the
 * previewed value, block + ask for re-confirmation on divergence - which is
 * why this was a fixable oversight rather than a design gap: the pattern
 * already existed one function away.
 *
 * This screen cannot be safely require'd in Jest (expo-notifications,
 * Reanimated, the live zustand store - see
 * CoachOutputScreen.d16Autonomy.guard.test.js's header for the established
 * house convention this suite follows: fs.readFileSync + regex).
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(
  path.resolve(__dirname, '..', 'CoachOutputScreen.js'), 'utf8',
);

function fnBody(src, decl) {
  const start = src.indexOf(decl);
  if (start === -1) throw new Error(`not found: ${decl}`);
  const rest = src.slice(start + decl.length);
  const next = rest.search(/\n  (async )?function /);
  return next === -1 ? src.slice(start) : src.slice(start, start + decl.length + next);
}

describe('handleApplyCalories refuses to persist a value it never showed the athlete', () => {
  const body = fnBody(SRC, 'async function handleApplyCalories()');

  test('compares the freshly computed value against the rendered preview before persisting', () => {
    expect(body).toMatch(/if \(Number\(caloriePreview\?\.newKcal\) !== Number\(computed\.newKcal\)\) \{/);
  });

  test('on divergence it refreshes the preview basis and returns WITHOUT calling saveNutritionTargets', () => {
    const guardIdx = body.indexOf('if (Number(caloriePreview?.newKcal)');
    const guardBlockEnd = body.indexOf('}', body.indexOf('return;', guardIdx));
    const guardBlock = body.slice(guardIdx, guardBlockEnd);
    expect(guardBlock).toMatch(/setCurrentTargets\(current\)/);
    expect(guardBlock).toMatch(/return;/);
    expect(guardBlock).not.toMatch(/saveNutritionTargets/);
  });

  test('the guard runs BEFORE the persist call, not after', () => {
    const guardIdx = body.indexOf('if (Number(caloriePreview?.newKcal)');
    const persistIdx = body.indexOf('await saveNutritionTargets(user.id, computed.targets);');
    expect(guardIdx).toBeGreaterThan(-1);
    expect(persistIdx).toBeGreaterThan(guardIdx);
  });

  test('matches the sibling handleApplyDietBreak contract already established in this file', () => {
    const dietBreakBody = fnBody(SRC, 'async function handleApplyDietBreak()');
    expect(dietBreakBody).toMatch(/if \(Number\(dietBreakPreviewKcal\) !== Number\(computed\.newKcal\)\) \{/);
    expect(dietBreakBody).toMatch(/setCurrentTargets\(current\)/);
  });
});
