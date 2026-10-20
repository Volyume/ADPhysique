/**
 * Resuming a setup draft through the shorter coaching setup (item 3).
 *
 * What this pins: the draft is keyed per user, not per mode, so a draft the
 * full setup parked on step 5 (Your gym) or 6 (Injuries) can be restored by
 * the coaching setup, which runs only steps 2, 3, 4, 7 and 8. Before the fix
 * the header then printed `Step ${COACHING_STEPS.indexOf(step) + 1} of 5`,
 * which is "Step 0 of 5" for those steps, and Continue walked the person
 * through two screens coaching setup skips. clampResumeStep moves such a draft
 * on to the next step coaching does run.
 *
 * COACHING_STEPS is read from the screen source so the test cannot drift
 * from it.
 */
import fs from 'fs';
import path from 'path';
import { clampResumeStep, buildDraft } from '../proOnboardingDraft';

const SRC = fs.readFileSync(path.join(__dirname, '../../screens/ProOnboardingScreen.js'), 'utf8');
const COACHING_STEPS = JSON.parse(SRC.match(/const COACHING_STEPS = Object\.freeze\((\[[^\]]*\])\)/)[1]);

// The header's own arithmetic (ProOnboardingHeader), reproduced exactly.
const coachingChipNumber = (step) => COACHING_STEPS.indexOf(step) + 1;

describe('clampResumeStep', () => {
  test('the coaching steps are the five the header counts', () => {
    expect(COACHING_STEPS).toEqual([2, 3, 4, 7, 8]);
  });

  test('REPRO (before the fix): a full-setup draft on step 5 or 6 prints "Step 0"', () => {
    expect(coachingChipNumber(5)).toBe(0);
    expect(coachingChipNumber(6)).toBe(0);
  });

  test('every step a draft can hold resumes on a step coaching setup runs', () => {
    for (let draftStep = 2; draftStep <= 7; draftStep += 1) {
      expect(buildDraft(draftStep, {})).not.toBeNull(); // a real, storable draft step
      const resumed = clampResumeStep(draftStep, COACHING_STEPS);
      expect(COACHING_STEPS).toContain(resumed);
      expect(coachingChipNumber(resumed)).toBeGreaterThanOrEqual(1);
    }
  });

  test('steps coaching runs are untouched; 5 and 6 go forward to 7, never back', () => {
    expect(clampResumeStep(2, COACHING_STEPS)).toBe(2);
    expect(clampResumeStep(3, COACHING_STEPS)).toBe(3);
    expect(clampResumeStep(4, COACHING_STEPS)).toBe(4);
    expect(clampResumeStep(5, COACHING_STEPS)).toBe(7);
    expect(clampResumeStep(6, COACHING_STEPS)).toBe(7);
    expect(clampResumeStep(7, COACHING_STEPS)).toBe(7);
  });

  test('beyond the last step it holds the last step; an empty list changes nothing', () => {
    expect(clampResumeStep(9, COACHING_STEPS)).toBe(8);
    expect(clampResumeStep(5, [])).toBe(5);
    expect(clampResumeStep(5, undefined)).toBe(5);
  });
});

describe('the screen applies it only in coaching mode', () => {
  test('restore clamps through COACHING_STEPS when coachingMode, and not otherwise', () => {
    expect(SRC).toMatch(/const draft = coachingMode \? \{ \.\.\.loaded, step: clampResumeStep\(loaded\.step, COACHING_STEPS\) \} : loaded;/);
    // The two lines proOnboarding.sexGate.test.js pins stay verbatim.
    expect(SRC).toMatch(/const resumeStep = isMinorAnswer\(a\.age\) && draft\.step === 5 \? 4 : draft\.step;/);
  });
  test('the sex gate clamp on a restored step is still in place', () => {
    expect(SRC).toMatch(/setStep\(\(s\) => Math\.max\(s, sexValid \? resumeStep : Math\.min\(resumeStep, 2\)\)\);/);
  });
  test('the step 7 chip reads "Training focus"', () => {
    expect(SRC).toMatch(/'Injuries & limitations', 'Training focus', 'Check-in rhythm'\]/);
  });
});
