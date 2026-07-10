// D36a (item 17 modal tails, lead-ruled under D33, 2026-07-10). The
// superset heads-up and unilateral-suggest modals share supOverlay/supSheet/
// supSheetContent styles; supSheetContent's paddingBottom was a fixed
// spacing.xxl token with no Android edge-to-edge safe-area inset, so the
// primary/secondary buttons under the tip text could sit flush against (or
// behind) the gesture nav bar. This build stays a raw Modal by ruling (an
// education moment with its own scroll behaviour, not a BottomSheet
// candidate) but widens the padding at both call sites to
// Math.max(spacing.xxl, insets.bottom + spacing.lg), the same
// Math.max(token, insets.bottom + token) contract
// bottomBarInset.guard.test.js pins for ActiveWorkout's bottom bar and
// FoodSearchScreen's plateBar. One style fix covers both modals since they
// share the style object.
import fs from 'fs';
import path from 'path';

const ACTIVE_WORKOUT = fs.readFileSync(
  path.join(__dirname, '..', 'ActiveWorkoutScreen.js'),
  'utf8',
);

describe('ActiveWorkoutScreen superset/unilateral sheet bottom inset (D36a)', () => {
  test('both modals widen supSheetContent with the safe-area inset', () => {
    const occurrences = ACTIVE_WORKOUT.match(
      /contentContainerStyle=\{\[styles\.supSheetContent,\s*\{\s*paddingBottom:\s*Math\.max\(spacing\.xxl,\s*insets\.bottom\s*\+\s*spacing\.lg\)\s*\}\]\}/g,
    ) ?? [];
    expect(occurrences.length).toBe(2);
  });

  test('the superset heads-up modal uses the inset-aware contentContainerStyle', () => {
    const supersetWindow = ACTIVE_WORKOUT.match(/visible=\{!!supersetHeadsUp\}[\s\S]{0,600}/)?.[0] ?? '';
    expect(supersetWindow).toContain('contentContainerStyle={[styles.supSheetContent, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}');
  });

  test('the unilateral-suggest modal uses the inset-aware contentContainerStyle', () => {
    const unilateralWindow = ACTIVE_WORKOUT.match(/visible=\{!!unilateralSuggest\}[\s\S]{0,1200}/)?.[0] ?? '';
    expect(unilateralWindow).toContain('contentContainerStyle={[styles.supSheetContent, { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.lg) }]}');
  });

  test('these two modals stay raw Modals, not BottomSheet, by ruling', () => {
    const supersetWindow = ACTIVE_WORKOUT.match(/Superset \/ giant-set heads-up modal[\s\S]{0,400}/)?.[0] ?? '';
    expect(supersetWindow).toContain('<Modal');
  });
});
