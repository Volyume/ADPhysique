/**
 * WorkoutSummaryScreen.tonnageUnits.guard.test.js
 *
 * Campaign 24 Wave A, WAVE-A-FINDINGS.md UNIT_DEFECT (:1220-1226): the
 * "Total lifted" hero stat hard-coded the string literal 'kg' regardless of
 * the store's `units` ('kg' | 'lbs'), the identical defect already found and
 * fixed for the ShareCard sibling of the same number (R8/M5, share-card
 * audit 2026-07-27, `units: units === 'lbs' ? 'lbs' : 'kg'` at :936). An lbs
 * user's tonnage total was mislabelled 'kg'.
 *
 * Source guard, not a full render: this screen's real data loads (SQLite,
 * wellbeing reads, mesocycle week) make a full render harness fragile, the
 * same reasoning WorkoutSummaryScreen.cohesionLinks.guard.test.js and
 * WorkoutSummaryScreen.feedback.guard.test.js already use for this file.
 */
const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'WorkoutSummaryScreen.js'), 'utf8');

describe('WorkoutSummaryScreen "Total lifted" hero respects the store unit (Wave A UNIT_DEFECT)', () => {
  test('the hero StatBox derives its unit from `units`, not a hard-coded kg literal', () => {
    expect(SOURCE).toContain(
      "value={formatWithUnit(formatNumber(Math.round(tonnage || 0)), units === 'lbs' ? 'lbs' : 'kg')}"
    );
    // The old defect: the exact hard-coded call, single-quoted literal unit.
    expect(SOURCE).not.toContain(
      "value={formatWithUnit(formatNumber(Math.round(tonnage || 0)), 'kg')}"
    );
  });

  test('matches the already-fixed ShareCard sibling pattern (R8/M5, :936)', () => {
    expect(SOURCE).toContain("units: units === 'lbs' ? 'lbs' : 'kg',");
  });

  test('the "next time" note placeholder example branches on units, not a hard-coded 85kg', () => {
    expect(SOURCE).toContain(
      "placeholder={`Anything to remember for next session? e.g. try ${units === 'lbs' ? '185lbs' : '85kg'}, wider grip, reduce volume`}"
    );
  });
});
