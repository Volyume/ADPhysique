/**
 * loggerHeaderFinishIconOnly.guard.test.js
 *
 * Founder order 2026-07-27 (device note): "Ets get rid of the Finish wording
 * and just have the ticks so it matches the X on the other side".
 *
 * The logger header's Finish control was a labelled pill (a smaller glyph plus
 * the word "Finish" on a padded row) while the cancel control opposite it was
 * a 44dp square icon button. Two shapes doing the same job at the two ends of
 * one bar. Finish is now icon-only on exactly the same chrome.
 *
 * THE POINT OF THIS GUARD IS THE ACCESSIBILITY LABEL. With the visible word
 * removed, `accessibilityLabel` is the ONLY name a screen-reader user gets for
 * this control. Dropping it, or shortening it to "Finish", would leave a
 * blind user with an unnamed button that ends their workout. It must stay
 * "Finish workout" -- it names the action, and matches how the same action is
 * spoken elsewhere (the R4/D64 same-string rule).
 *
 * Source-level guard: the component is presentation-only and its chrome is
 * expressed in a StyleSheet, so the contract is pinned against the source,
 * matching loggerHeaderCohesion.guard.test.js.
 */

import fs from 'fs';
import path from 'path';

const HEADER = fs.readFileSync(
  path.resolve(__dirname, '..', 'WorkoutHeader.js'),
  'utf8',
);

describe('logger header Finish is icon-only (founder 2026-07-27)', () => {
  test('the visible "Finish" label is gone', () => {
    // The rendered label, not the word in comments or the a11y string.
    expect(HEADER).not.toMatch(/>\s*Finish\s*</);
    expect(HEADER).not.toMatch(/styles\.finishText/);
    expect(HEADER).not.toMatch(/finishText:/);
  });

  test('Finish shares the cancel X chrome exactly, not a bespoke pill', () => {
    expect(HEADER).not.toMatch(/finishBtn:/);
    expect(HEADER).not.toMatch(/styles\.finishBtn/);
    // Both controls resolve to the same square icon-button style.
    const iconBtnUses = HEADER.match(/styles\.iconBtn/g) || [];
    expect(iconBtnUses.length).toBe(2);
  });

  test('both glyphs are the same size, so neither end looks lighter', () => {
    expect(HEADER).toMatch(/name="close" size=\{iconSize\.md\}/);
    expect(HEADER).toMatch(/name="checkmark-done" size=\{iconSize\.md\}/);
  });

  test('THE CRITICAL ONE: Finish keeps its full spoken name', () => {
    // Icon-only means this is the entire accessible name of a button that
    // ends the user's workout.
    expect(HEADER).toContain('accessibilityLabel="Finish workout"');
    expect(HEADER).not.toContain('accessibilityLabel="Finish"');
    // And the cancel side keeps its own.
    expect(HEADER).toContain('accessibilityLabel="Cancel workout"');
  });

  test('both controls stay reachable: role and hit slop intact', () => {
    const roles = HEADER.match(/accessibilityRole="button"/g) || [];
    expect(roles.length).toBe(2);
    const slops = HEADER.match(/hitSlop=\{\{ top: 8, bottom: 8, left: 8, right: 8 \}\}/g) || [];
    expect(slops.length).toBe(2);
  });
});
