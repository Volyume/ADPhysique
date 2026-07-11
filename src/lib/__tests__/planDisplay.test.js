/**
 * Issue 4 (founder defect pass 2026-07-03): one canonical plan-name + day
 * convention, derived once in planDisplay.js. Pins the formatter's shape and
 * (source-level) that the Home hero actually routes through it instead of
 * hand-writing its own "Day X of Y" template again.
 *
 * Remediation R1 (founder, 2026-07-11): the first fix of the heading strip
 * FAILED on real data - generated plan names read
 * "Men's Physique · Cut · V-Taper 4×/week, 9 Jul" (engine frequency suffix
 * + planAutoGen's stored date-dedup suffix), and the old trailing-frequency
 * regex matched none of them. planHeadingName now strips BOTH suffixes in
 * any combination. These cases pin the real stored shapes, including the
 * exact name the founder reported from his device.
 */
import fs from 'fs';
import path from 'path';
import { dayDescriptor, activePlanLine, planHeadingName } from '../planDisplay';

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

describe('planHeadingName strips frequency AND stored date suffixes (R1)', () => {
  test('the exact generated shape the founder reported: frequency then date', () => {
    expect(planHeadingName("Men's Physique · Cut · V-Taper 4×/week, 9 Jul"))
      .toBe("Men's Physique · Cut · V-Taper");
  });

  test('same-day collision adds a time - still strips clean', () => {
    expect(planHeadingName("Men's Physique · Cut · V-Taper 4×/week, 9 Jul 14:32"))
      .toBe("Men's Physique · Cut · V-Taper");
  });

  test('engine name with no collision suffix', () => {
    expect(planHeadingName("Men's Physique · Cut · V-Taper 4×/week"))
      .toBe("Men's Physique · Cut · V-Taper");
  });

  test('seed-library names strip their frequency', () => {
    expect(planHeadingName('Beginner Full Body 3×/Week')).toBe('Beginner Full Body');
    expect(planHeadingName('Push Pull Legs 6×/Week')).toBe('Push Pull Legs');
  });

  test('seed name that later gained a date suffix', () => {
    expect(planHeadingName('Upper / Lower 4×/Week, 12 Jul')).toBe('Upper / Lower');
  });

  test('custom names pass through untouched, including month-like words', () => {
    expect(planHeadingName('My Custom Plan')).toBe('My Custom Plan');
    expect(planHeadingName("Julie's Plan")).toBe("Julie's Plan");
    expect(planHeadingName('Plan, 9 Julips')).toBe('Plan, 9 Julips');
  });

  test('a name that IS only a frequency falls back to the stored name', () => {
    expect(planHeadingName('4x/week')).toBe('4x/week');
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
