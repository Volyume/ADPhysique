/**
 * Issue 1a (founder defect pass 2026-07-03): ActiveWorkout's bottom-pinned
 * action bar must respect the system bottom inset. E15's VolyumeTabBar
 * returns null while ActiveWorkout is focused, so nothing else absorbs the
 * inset — a flat spacing token left the Log set button half behind the
 * Android gesture pill. Pins the padding expression and the tab-bar hide it
 * compensates for, so neither side of the contract moves alone.
 */
import fs from 'fs';
import path from 'path';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('ActiveWorkout bottom bar vs the hidden tab band', () => {
  test('the bottom bar padding includes the safe-area inset', () => {
    const screen = read('screens/ActiveWorkoutScreen.js');
    expect(screen).toMatch(
      /styles\.bottomBar,\s*\{\s*paddingBottom:\s*Math\.max\(spacing\.md,\s*insets\.bottom\s*\+\s*spacing\.sm\)/
    );
  });

  test('VolyumeTabBar still hides on ActiveWorkout (the reason the inset is needed)', () => {
    const bar = read('components/VolyumeTabBar.js');
    expect(bar).toMatch(/nested === 'ActiveWorkout'.*return null/);
  });

  // The inverse rule: on screens where the tab band IS visible it absorbs
  // the system inset, so a sticky footer there must use a flat token —
  // adding insets.bottom again doubled the gap under WorkoutSummary's
  // Close (founder screenshot 2026-07-03).
  test('WorkoutSummary sticky footer uses a flat token, never the inset again', () => {
    const summary = read('screens/WorkoutSummaryScreen.js');
    expect(summary).toMatch(/styles\.stickyFooter,\s*\{\s*paddingBottom:\s*spacing\.lg\s*\}/);
    expect(summary).not.toMatch(/stickyFooter,\s*\{\s*paddingBottom:\s*Math\.max/);
  });

  // Bottom-anchored Modals overlay the tab band and touch the physical
  // screen edge, so each absorbs the inset itself. Pins the edge-to-edge
  // sweep (2026-07-03): hand-rolled sheets own the inset expression directly;
  // migrated sheets must use the shared BottomSheet chrome, which owns it.
  test('bottom-anchored modal sheets absorb the system inset', () => {
    for (const rel of [
      'components/BottomSheet.js',
      'components/FeedbackSheet.js',
      'components/PeekMenu.js',
    ]) {
      expect(read(rel)).toMatch(/insets\.bottom \+ spacing\.(lg|sm)/);
    }
    expect(read('screens/FoodSearchScreen.js')).toMatch(/<BottomSheet[\s\S]*visible=\{showPlate\}/);
    expect(read('screens/FoodSearchScreen.js')).not.toMatch(/useSafeAreaInsets/);
    expect(read('components/ProGate.js')).toMatch(/<BottomSheet/);
  });
});
