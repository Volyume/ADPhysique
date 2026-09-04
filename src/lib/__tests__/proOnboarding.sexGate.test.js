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

  test('the step-2 validator records a missing sex as a gap on the box', () => {
    // D146 (2026-09-04): validateStep2 is the one gate; a null sex writes
    // errs.sex, which marks the control and names it under Continue.
    expect(src).toMatch(/function validateStep2\(\) \{[\s\S]{0,200}?if \(sex !== 'male' && sex !== 'female'\) errs\.sex = /);
    expect(src).toMatch(/const errors2 = attempted2 \? validateStep2\(\) : \{\};/);
    expect(src).toMatch(/error=\{!!errors2\.sex\}/);
  });

  test('the step-2 Continue press never advances past a missing sex', () => {
    // D146: Continue stays enabled so it can point at the gap, and the
    // press returns before setStep(3) on any gap. Still no default, still
    // no tap-through: the invariant moved from a greyed button to the
    // validator, which is stricter (it also covers the late bounce-back).
    expect(src).toMatch(/function advanceFrom2\(\) \{[\s\S]{0,700}?const errs = validateStep2\(\);\s*if \(Object\.keys\(errs\)\.length\) \{[\s\S]{0,600}?return;\s*\}\s*emitStepDone\(2\);\s*setStep\(3\);/);
    expect(src).not.toMatch(/onPress=\{canContinue \? advanceFrom2/);
  });

  test('sex state has no default (starts null, never male)', () => {
    expect(src).toMatch(/const\s*\[\s*sex\s*,\s*setSex\s*\]\s*=\s*useState\(\s*null\s*\)/);
  });

  test('F11: a restored draft with an invalid sex clamps the step to 2 (never past the sex gate)', () => {
    // The restore effect derives validity from the screen's OWN accepted sex
    // options, restores sex only when valid, and clamps the restored step so
    // a draft saved at step 4 with sex null/invalid lands back on step 2
    // (max(1, min(4, 2)) = 2), where canContinue re-blocks progression.
    expect(src).toMatch(/const\s+ACCEPTED_SEX_VALUES\s*=\s*SEX_OPTIONS\.map\(\(o\) => o\.value\)/);
    expect(src).toMatch(/const sexValid = ACCEPTED_SEX_VALUES\.includes\(a\.sex\);/);
    expect(src).toMatch(/if \(sexValid\) setSex\(a\.sex\);/);
    expect(src).toMatch(/setStep\(\(s\) => Math\.max\(s, sexValid \? draft\.step : Math\.min\(draft\.step, 2\)\)\);/);
    // And the picker itself renders from the same set, so the accepted values
    // cannot drift from what the UI offers.
    expect(src).toMatch(/options=\{SEX_OPTIONS\}/);
  });
});
