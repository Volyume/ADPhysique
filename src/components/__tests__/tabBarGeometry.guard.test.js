/**
 * Founder defect (2026-07-12, TestFlight): the tab bar rendered a dead
 * band under the buttons on iPhone. Root cause: the E15 custom bar
 * hard-coded a 60pt content box with TOP-ALIGNED items, so the leftover
 * height pooled below the labels and stacked on the home-indicator inset.
 * The fix reproduces the stock BottomTabBar geometry that sat correctly on
 * both devices: a 49pt content zone via minHeight (grows with system text,
 * never clips), items CENTRED, the system inset as padding below.
 *
 * Pins that geometry so it cannot silently drift back:
 *   - minHeight (not height) of 49 + insets.bottom;
 *   - paddingBottom is exactly the inset (no extra slack under labels);
 *   - the item cell is centred, never flex-start;
 *   - no fixed `height:` sizing on the bar.
 */
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.resolve(__dirname, '..', 'VolyumeTabBar.js'),
  'utf8',
);

describe('VolyumeTabBar stock geometry (founder defect 2026-07-12)', () => {
  test('bar sizes by minHeight 49 + inset with the inset as bottom padding', () => {
    expect(src).toMatch(/minHeight: 49 \+ insets\.bottom, paddingBottom: insets\.bottom/);
  });

  test('bar has no fixed height sizing', () => {
    expect(src).not.toMatch(/[^\w]height: \d+ \+ insets\.bottom/);
  });

  test('tab items are centred in the content zone, not top-aligned', () => {
    expect(src).toMatch(/item: \{ flex: 1, alignItems: 'center', justifyContent: 'center'/);
    expect(src).not.toMatch(/justifyContent: 'flex-start'/);
  });
});
