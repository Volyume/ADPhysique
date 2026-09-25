/**
 * ProgressPhotosScreen.suppressionCard.guard.test.js
 *
 * S7-1 (progress-tab audit second pass, 2026-09-25): the check-in timeline
 * card withheld its score, change and confidence cells under suppression
 * (calm mode or an open ED flag) but rendered the leanness band ("Lean",
 * "Very Lean", a body-composition judgement) and the card's bodyweight
 * caption regardless, on every dated card. Source guard, matching this
 * screen's convention (wellbeingFailClosed.guard.test): both are now gated
 * on the same `suppressed` the sibling cells use.
 */
import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'ProgressPhotosScreen.js'), 'utf8');

describe('S7-1: the timeline card withholds the leanness band and the weight under suppression', () => {
  test('the Leanness cell reads "Hidden" under suppression, like Score, Change and Confidence', () => {
    expect(SOURCE).toMatch(/const bandValue = suppressed\s*\?\s*'Hidden'\s*:\s*\(assessment\?\.leannessBandLabel/);
    expect(SOURCE).not.toMatch(/const bandValue = assessment\?\.leannessBandLabel/);
  });

  test('the card weight caption is null under suppression', () => {
    expect(SOURCE).toMatch(/const weightText = \(!suppressed && Number\.isFinite\(item\.weightKg\)\)/);
    expect(SOURCE).not.toMatch(/const weightText = Number\.isFinite\(item\.weightKg\) \? formatBodyWeight/);
  });

  test('suppressed is the screen\'s calm-or-ED verdict, fail-closed', () => {
    expect(SOURCE).toMatch(/const suppressed = photoSuppressed \|\| calm;/);
  });
});
