/**
 * C18 re-entry amendment (Task 1) — ActiveWorkoutScreen wiring.
 *
 * The session's readiness tweak now composes the intent-sheet reading with
 * an active re-entry-ease decision (resolveSessionEasingTweak), instead of
 * calling getReadinessTweak directly. Re-entry easing is NOT tier-gated,
 * unlike the intent-sheet reading it composes with (which stays Pro-only,
 * unchanged). The bound session's finish (full completion OR ended-early -
 * both land in doFinish) retires the pending decision it consumed.
 *
 * Source guard: a full render test of this ~4000-line screen is
 * prohibitively heavy for this narrow a check (see the HomeScreen sibling
 * guard test for the same convention).
 */
const fs = require('fs');
const path = require('path');

const SCREEN = fs.readFileSync(path.resolve(__dirname, '../ActiveWorkoutScreen.js'), 'utf8');

function fnBody(src, decl) {
  const start = src.indexOf(decl);
  if (start === -1) throw new Error(`not found: ${decl}`);
  const rest = src.slice(start + decl.length);
  const next = rest.search(/\n {2}(async )?function /);
  return next === -1 ? src.slice(start) : src.slice(start, start + decl.length + next);
}

describe('C18 re-entry: the session tweak composes intent + re-entry without stacking', () => {
  test('resolveSessionEasingTweak is imported and used instead of a direct getReadinessTweak call', () => {
    expect(SCREEN).toMatch(/resolveSessionEasingTweak/);
    expect(SCREEN).not.toMatch(/getReadinessTweak\(/);
  });

  test('re-entry easing is NOT wrapped in the tier === \'pro\' gate the intent-sheet reading uses', () => {
    const idx = SCREEN.indexOf('const reEntryEaseActive = ');
    expect(idx).toBeGreaterThan(-1);
    const chunk = SCREEN.slice(idx, idx + 700);
    expect(chunk).toMatch(/reEntryEaseActive = !isDeloadWeek && !!activeWorkout\?\.reEntryEaseApplied/);
    expect(chunk).toMatch(/const readinessTweak = !isDeloadWeek/);
    // The intent-sheet reading passed in is STILL tier-gated (unchanged
    // behaviour); only the outer gate on the whole tweak must NOT be
    // tier==='pro' anymore.
    expect(chunk).toMatch(/intent: tier === 'pro' \? activeWorkout\?\.preWorkoutIntent : null/);
    expect(chunk).not.toMatch(/const readinessTweak = \(tier === 'pro' && !isDeloadWeek\)/);
  });

  test('deload remains senior: re-entry easing is gated off on a deload week same as the intent-sheet reading', () => {
    const idx = SCREEN.indexOf('const reEntryEaseActive = ');
    const chunk = SCREEN.slice(idx, idx + 200);
    expect(chunk).toMatch(/!isDeloadWeek/);
  });
});

describe('C18 re-entry: the bound session retires its decision on finish', () => {
  test('doFinish clears the pending decision only when this workout actually consumed one', () => {
    const body = fnBody(SCREEN, 'async function doFinish()');
    expect(body).toMatch(/if \(activeWorkout\?\.reEntryEaseApplied && user\?\.id\)/);
    expect(body).toMatch(/clearPendingReEntryEase\(user\.id\)/);
  });

  test('clearPendingReEntryEase is imported from the shared state module', () => {
    expect(SCREEN).toMatch(/import \{ clearPendingReEntryEase \} from '\.\.\/lib\/reEntryEaseState';/);
  });
});
