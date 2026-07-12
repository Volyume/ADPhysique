/**
 * AX-15 (launch accessibility audit, 2026-07-12): the shared compact Stepper
 * (used for Default rest timer in SettingsWorkoutScreen.js, plus per-exercise
 * sets/rest in BuildWorkoutScreen.js, per-day kcal offsets in
 * PerDayTargetsScreen.js, and ManualBuilderScreen.js's targets) renders its
 * +/- buttons at a deliberately compact 30x34dp, below the 44x44dp minimum
 * touch target, with no default hitSlop.
 *
 * Fix: a module-level `COMPACT_HIT_SLOP = { top: 8, bottom: 8, left: 8,
 * right: 8 }` applies whenever size="compact" and the caller hasn't passed
 * its own hitSlop (30+16=46dp wide, 34+16=50dp tall -- both above 44).
 * Critically, React Native hitSlop "never extends past the parent view
 * bounds" (Libraries/Components/View/ViewPropTypes.js) -- the row View
 * wrapping the compact buttons previously had zero padding, so a hitSlop
 * alone (as some call sites already tried ad hoc, e.g. BuildWorkoutScreen.js
 * and ManualBuilderScreen's STEPPER_HIT_SLOP) was silently clipped to
 * nothing. rowCompact now carries `padding: 8` to match, so the hit slop has
 * room to register. Losing that padding while keeping the hitSlop would
 * silently reintroduce the exact defect this fixes, so both are pinned
 * together here; the effective touch-target maths is also proven at the
 * render level in inputs.test.js.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'Stepper.js'), 'utf8');

describe('Stepper compact buttons reach the 44dp touch-target minimum without shrinking the visible affordance (AX-15)', () => {
  test('a default hit slop is defined for the compact size (8dp on every edge)', () => {
    expect(src).toMatch(
      /const COMPACT_HIT_SLOP = \{ top: 8, bottom: 8, left: 8, right: 8 \};/,
    );
  });

  test('the default is applied whenever a caller has not supplied its own hitSlop, and both buttons use it', () => {
    expect(src).toMatch(
      /const effectiveHitSlop = hitSlop \?\? \(isCompact \? COMPACT_HIT_SLOP : undefined\);/,
    );
    const hitSlopUses = src.match(/hitSlop=\{effectiveHitSlop\}/g) || [];
    expect(hitSlopUses.length).toBe(2); // decrease button + increase button
  });

  test('rowCompact carries padding at least matching the hit slop, so RN\'s parent-bounds limit does not clip it to nothing', () => {
    const rowCompactMatch = src.match(/rowCompact:\s*\{[\s\S]*?\n\s*\},/);
    expect(rowCompactMatch).toBeTruthy();
    expect(rowCompactMatch[0]).toMatch(/padding:\s*8,/);
  });

  test('the visible compact button box itself is untouched (30x34, no fill/border) -- the fix is touch area, not shrinking the affordance further', () => {
    expect(src).toMatch(/btnCompact:\s*\{\s*\n\s*width:\s*30,\s*\n\s*height:\s*34,/);
  });
});
