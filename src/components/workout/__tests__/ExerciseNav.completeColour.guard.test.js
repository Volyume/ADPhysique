// A completed exercise's progress underline in the top switcher goes
// full-width GREEN (colors.success) to signify done at a glance (founder
// request 2026-07-19), overriding the selected-amber / rest-grey so a
// finished exercise reads green whether or not it is the current tab.
// Skipped-for-time exercises are NOT complete (they stay dimmed).
//
// Source-level guard, matching the workout-UI convention (the screen and its
// extracted rows are pinned by fs reads rather than full mounts).
import fs from 'fs';
import path from 'path';

const NAV = fs.readFileSync(
  path.join(__dirname, '..', 'ExerciseNav.js'),
  'utf8',
);

describe('ExerciseNav completion colour', () => {
  test('completion is every planned set logged and not skipped', () => {
    expect(NAV).toMatch(/const complete = !item\.skipped && item\.total > 0 && item\.done >= item\.total;/);
  });

  test('a complete exercise underline is success-green, overriding selected/rest colours', () => {
    expect(NAV).toMatch(/const fillColor = complete\s*\?\s*t\.colors\.success/);
    // and the fill actually consumes fillColor (not the old inline ternary)
    expect(NAV).toContain('backgroundColor: fillColor,');
    expect(NAV).not.toMatch(/backgroundColor: selected \? t\.colors\.primary : t\.colors\.textMuted/);
  });

  test('complete state is announced to screen readers', () => {
    expect(NAV).toContain("${complete ? ', complete' : ''}");
  });
});
