/**
 * Guard: the weekly-streak resolver's ED-safety suppression must FAIL CLOSED.
 *
 * Every streak / consistency / celebration surface (the Home consistency echo,
 * the forgiveness explainer, the weeks glyph strip + legend, and the milestone /
 * perfect-month / longest-run-PB cards and their telemetry) hangs off
 * `edSuppressed` in useWeeklyStreak. A transient read failure of the open-ED
 * pattern flag or the wellbeing mode must SUPPRESS, never render as if the user
 * were unflagged and non-calm.
 *
 * This pins the fix for the S2 review BLOCKER: the gate previously failed OPEN
 * because the flag read mapped a genuine error to null (reads as "no flag") and
 * the wellbeing read went through getWellbeingMode, which swallows genuine
 * failures to 'unspecified' (reads as normal UX). Source-regex guard, matching
 * the convention of src/__tests__/differentialBanner.guard.test.js.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'useWeeklyStreak.js'),
  'utf8',
);

describe('useWeeklyStreak ED-safety suppression fails closed', () => {
  test('an open-ED-flag read error does NOT map to null (which reads as no flag)', () => {
    expect(src).not.toMatch(
      /getOpenEdPatternFlag\([^)]*\)\.catch\(\(\)\s*=>\s*null\)/,
    );
  });

  test('an open-ED-flag read error maps to a suppressing sentinel', () => {
    expect(src).toMatch(
      /getOpenEdPatternFlag\([^)]*\)\.catch\(\(\)\s*=>\s*'read_failed'\)/,
    );
  });

  test('wellbeing is read fail-closed, not via the failure-swallowing getWellbeingMode', () => {
    expect(src).not.toMatch(/getWellbeingMode\(/);
    expect(src).toMatch(
      /WELLBEING_KEY[\s\S]*?\.catch\(\(\)\s*=>\s*'read_failed'\)/,
    );
  });

  test('edSuppressed treats a read failure and calm mode as suppressing', () => {
    expect(src).toMatch(/wellbeing === 'read_failed'/);
    expect(src).toMatch(/isCalm\(wellbeing\)/);
  });
});
