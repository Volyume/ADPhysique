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
    // CP-10 stage 3 (theming FINAL batch, 2026-07-10): ActiveWorkoutScreen
    // now reads a live theme (src/hooks/useTheme.js); styles.bottomBar gained
    // a live.bottomBar override ahead of the inline paddingBottom object.
    // The pinned contract (Math.max(spacing.md, insets.bottom + spacing.sm))
    // is unchanged -- widened only to allow the live.bottomBar insertion.
    expect(screen).toMatch(
      /styles\.bottomBar,\s*live\.bottomBar,\s*\{\s*paddingBottom:\s*Math\.max\(spacing\.md,\s*insets\.bottom\s*\+\s*spacing\.sm\)/
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
    // CP-10 stage 3 (theming FINAL batch, 2026-07-10): WorkoutSummaryScreen
    // now reads a live theme (src/hooks/useTheme.js); stickyFooter gained a
    // live.stickyFooter override ahead of the inline paddingBottom object.
    // The pinned contract (a flat spacing.lg token, never Math.max/inset
    // maths) is unchanged -- widened only to allow the live.stickyFooter
    // insertion.
    expect(summary).toMatch(/styles\.stickyFooter,\s*live\.stickyFooter,\s*\{\s*paddingBottom:\s*spacing\.lg\s*\}/);
    expect(summary).not.toMatch(/stickyFooter,\s*live\.stickyFooter,\s*\{\s*paddingBottom:\s*Math\.max/);
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
    const foodSearch = read('screens/FoodSearchScreen.js');
    expect(foodSearch).toMatch(/<BottomSheet[\s\S]*visible=\{showPlate\}/);
    // The plate sheet itself takes its inset handling from shared BottomSheet
    // chrome (asserted above), never manual math in this file. Batch 1
    // lane-03 (design-usability sweep, 2026-07-09) legitimately added
    // useSafeAreaInsets back to this file for a DIFFERENT element: the
    // sticky plateBar footer, which (like ActiveWorkoutScreen's bottomBar
    // above) sits on a screen outside the tab navigator with nothing else to
    // absorb the bottom inset. It follows the same
    // Math.max(spacing.*, insets.bottom + spacing.*) contract pinned above.
    expect(foodSearch).toMatch(/styles\.plateBar,\s*\{\s*paddingBottom:\s*Math\.max\(spacing\.md,\s*insets\.bottom\s*\+\s*spacing\.sm\)/);
    expect(read('components/ProGate.js')).toMatch(/<BottomSheet/);
  });
});
