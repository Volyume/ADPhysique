/**
 * Onboarding MUST refuse to progress until a valid biological sex is chosen
 * (founder 2026-07-01). Sex drives the SACRED ED calorie floor + BMR, so a null
 * must never advance past the profile step and must never be silently defaulted
 * (e.g. to male) downstream.
 *
 * These are source-level regression guards (same style as
 * identityGate.proOnboarding.test.js): they lock the gate in place so a future
 * edit cannot quietly drop it. The behaviour they encode:
 *   - advanceFrom2 blocks on an invalid sex,
 *   - the step-2 Continue button is gated on a canContinue that REQUIRES an
 *     explicit male/female,
 *   - the button is actually disabled when canContinue is false.
 */
import fs from 'fs';
import path from 'path';

function read(rel) {
  return fs.readFileSync(path.resolve(__dirname, '../../..', rel), 'utf8');
}

describe('ProOnboarding refuses to progress without a valid sex', () => {
  const src = read('src/screens/ProOnboardingScreen.js');

  test('advanceFrom2 blocks advancing on an invalid sex', () => {
    // The guard: if sex is not exactly male/female, alert and return (no setStep).
    expect(src).toMatch(/if\s*\(\s*sex\s*!==\s*['"]male['"]\s*&&\s*sex\s*!==\s*['"]female['"]\s*\)/);
  });

  test('the step-2 continue gate requires an explicit male/female choice', () => {
    // canContinue for step 2 must include the sex requirement.
    expect(src).toMatch(/canContinue\s*=[\s\S]{0,200}\(\s*sex\s*===\s*['"]male['"]\s*\|\|\s*sex\s*===\s*['"]female['"]\s*\)/);
  });

  test('the step-2 Continue button is disabled until the gate passes', () => {
    // The button must be genuinely disabled (not merely alert-on-tap).
    expect(src).toMatch(/disabled=\{!canContinue\}/);
  });

  test('sex state has no default (starts null, never male)', () => {
    expect(src).toMatch(/const\s*\[\s*sex\s*,\s*setSex\s*\]\s*=\s*useState\(\s*null\s*\)/);
  });
});
