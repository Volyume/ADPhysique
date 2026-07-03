/**
 * Issue 4 (founder defect pass 2026-07-03): one canonical plan-name + day
 * convention, derived once in planDisplay.js. Pins the formatter's shape and
 * (source-level) that the Home hero actually routes through it instead of
 * hand-writing its own "Day X of Y" template again.
 */
import fs from 'fs';
import path from 'path';
import { dayDescriptor, activePlanLine } from '../planDisplay';

describe('planDisplay formatters', () => {
  test('dayDescriptor is 1-based and clamps a missing total to 1', () => {
    expect(dayDescriptor(0, 2)).toBe('Day 1 of 2');
    expect(dayDescriptor(1, 2)).toBe('Day 2 of 2');
    expect(dayDescriptor(undefined, undefined)).toBe('Day 1 of 1');
  });

  test('activePlanLine leads with the plan name verbatim', () => {
    expect(activePlanLine('Beginner Full Body 3×/Week', 0, 2))
      .toBe('Beginner Full Body 3×/Week · Day 1 of 2');
  });

  test('a missing plan name degrades to the day alone, never "undefined"', () => {
    expect(activePlanLine(null, 0, 2)).toBe('Day 1 of 2');
    expect(activePlanLine('   ', 1, 3)).toBe('Day 2 of 3');
  });
});

describe('Home hero uses the canonical formatter (source guard)', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'screens', 'HomeScreen.js'), 'utf8'
  );

  test('planProgress is built by activePlanLine, not a hand-written template', () => {
    expect(src).toMatch(/planProgress = displayWorkout\s*\?\s*activePlanLine\(/);
    // The old inline template must not come back on the hero.
    expect(src).not.toMatch(/`Day \$\{\(displayWorkout/);
  });
});
