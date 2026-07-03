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
});
