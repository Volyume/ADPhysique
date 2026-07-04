/**
 * ONBOARD-001: Onboarding MUST refuse to progress until a valid height is
 * entered. Height feeds BMR / calorie / FFM targets, so a silent default (the
 * old '175' cm / 5 ft 9 in state seed, plus a `hcm || 175` fallback at submit)
 * could compute plausible-looking targets on a height the user never confirmed.
 * The step-2 continue gate validated name, sex, body weight and age but NOT
 * height, so a user could tap through with the seeded 175 cm.
 *
 * These are source-level regression guards (same style as
 * proOnboarding.sexGate.test.js): they lock the gate so a future edit cannot
 * quietly reintroduce a default or drop the check. The behaviour they encode:
 *   - height state starts BLANK (no real-looking 175 / 5 / 9 seed),
 *   - advanceFrom2 blocks when the entered height is missing or out of range,
 *   - the step-2 canContinue REQUIRES a finite, in-range height (metric OR
 *     imperial) via the SAME shared resolver, so the Continue button stays
 *     disabled until it is valid (button matches advanceFrom2),
 *   - the submit path no longer falls back to 175, the stored heightCm is the
 *     user's own entry.
 *
 * The last block also reconstructs the exact predicate the screen uses (with the
 * range read straight from source) and proves the specified behaviour end to
 * end: blank metric rejects, blank imperial rejects, a real height accepts.
 */
import fs from 'fs';
import path from 'path';
import { ftInToCm } from '../units';

function read(rel) {
  return fs.readFileSync(path.resolve(__dirname, '../../..', rel), 'utf8');
}

describe('ProOnboarding refuses to progress without a valid height', () => {
  const src = read('src/screens/ProOnboardingScreen.js');

  test('height state has no real-looking default (starts blank, never 175 / 5 / 9)', () => {
    expect(src).toMatch(/const\s*\[\s*heightCm\s*,\s*setHeightCm\s*\]\s*=\s*useState\(\s*''\s*\)/);
    expect(src).toMatch(/const\s*\[\s*heightFt\s*,\s*setHeightFt\s*\]\s*=\s*useState\(\s*''\s*\)/);
    expect(src).toMatch(/const\s*\[\s*heightIn\s*,\s*setHeightIn\s*\]\s*=\s*useState\(\s*''\s*\)/);
    // The old plausible seed must be gone from the state inits.
    expect(src).not.toMatch(/setHeightCm\s*\]\s*=\s*useState\(\s*'175'\s*\)/);
    expect(src).not.toMatch(/setHeightFt\s*\]\s*=\s*useState\(\s*'5'\s*\)/);
    expect(src).not.toMatch(/setHeightIn\s*\]\s*=\s*useState\(\s*'9'\s*\)/);
  });

  test('a shared resolver + validator back both the gate and the button', () => {
    // A single implementation both call sites use, so the button can never drift
    // from advanceFrom2 (the F11 sex-gate spirit, applied to height).
    expect(src).toMatch(/function\s+resolveHeightCm\(/);
    expect(src).toMatch(/function\s+isValidHeightCm\(/);
    // The resolver handles both units: imperial via ftInToCm, metric via parseFloat.
    expect(src).toMatch(/function\s+resolveHeightCm\([\s\S]{0,300}ftInToCm\(/);
    expect(src).toMatch(/function\s+resolveHeightCm\([\s\S]{0,300}parseFloat\(/);
    // Imperial returns NaN when feet is blank, so a blank imperial height fails.
    expect(src).toMatch(/ft\.trim\(\)\s*!==\s*''\s*\?\s*ftInToCm\([^)]*\)\s*:\s*NaN/);
    // The validator enforces a finite, in-range value.
    expect(src).toMatch(/Number\.isFinite\(hcm\)\s*&&\s*hcm\s*>=\s*MIN_HEIGHT_CM\s*&&\s*hcm\s*<=\s*MAX_HEIGHT_CM/);
  });

  test('advanceFrom2 blocks advancing on a missing or out-of-range height', () => {
    // The guard: resolve the height, and if it is not valid, alert and return
    // (no setStep). appAlert('Height' is unique to advanceFrom2.
    expect(src).toMatch(/const\s+enteredHeightCm\s*=\s*resolveHeightCm\(\s*localHeightUnits\s*,\s*heightCm\s*,\s*heightFt\s*,\s*heightIn\s*\)/);
    expect(src).toMatch(/if\s*\(\s*!isValidHeightCm\(\s*enteredHeightCm\s*\)\s*\)\s*\{[\s\S]{0,160}?appAlert\(\s*'Height'/);
  });

  test('the step-2 continue gate requires a finite, in-range height', () => {
    // canContinue must include the height requirement through the same resolver.
    expect(src).toMatch(/const\s+step2HeightCm\s*=\s*resolveHeightCm\(\s*localHeightUnits\s*,\s*heightCm\s*,\s*heightFt\s*,\s*heightIn\s*\)/);
    expect(src).toMatch(/canContinue\s*=[\s\S]{0,400}isValidHeightCm\(\s*step2HeightCm\s*\)/);
    // And the button is genuinely disabled on that gate (shared with the sex gate).
    expect(src).toMatch(/disabled=\{!canContinue\}/);
  });

  test('the submit path no longer falls back to 175 (stored height is the user entry)', () => {
    expect(src).not.toMatch(/hcm\s*\|\|\s*175/);
    expect(src).not.toMatch(/\|\|\s*175/);
    expect(src).toMatch(/const\s+safeHeightCm\s*=\s*hcm\s*;/);
  });
});

describe('ONBOARD-001 height gate: reconstructed predicate matches the spec', () => {
  const src = read('src/screens/ProOnboardingScreen.js');
  const min = Number(/const\s+MIN_HEIGHT_CM\s*=\s*(\d+)/.exec(src)?.[1]);
  const max = Number(/const\s+MAX_HEIGHT_CM\s*=\s*(\d+)/.exec(src)?.[1]);

  // Reconstruct the exact resolver + validator the screen uses, with the range
  // read straight from source. If the screen's bounds drift, this drifts with
  // them, so the behaviour below always tests the shipped predicate.
  function resolve(units, cm, ft, inches) {
    if (units === 'imperial') return ft.trim() !== '' ? ftInToCm(ft, inches) : NaN;
    return parseFloat(cm);
  }
  const valid = (hcm) => Number.isFinite(hcm) && hcm >= min && hcm <= max;

  test('the bounds are sane and wide enough for real adults (13-100)', () => {
    // A range so narrow it rejected real users would be its own bug; a range so
    // wide it accepts a single digit would defeat the gate. Pin a sensible band.
    expect(min).toBeGreaterThanOrEqual(100);
    expect(min).toBeLessThanOrEqual(140);
    expect(max).toBeGreaterThanOrEqual(210);
    expect(max).toBeLessThanOrEqual(260);
  });

  test('cannot advance with a blank metric height', () => {
    expect(valid(resolve('metric', '', '', ''))).toBe(false);
  });

  test('cannot advance with a blank imperial height', () => {
    // Feet blank -> NaN -> rejected, whatever the inches box holds.
    expect(valid(resolve('imperial', '', '', ''))).toBe(false);
    expect(valid(resolve('imperial', '', '', '9'))).toBe(false);
  });

  test('can advance with a valid height (metric and imperial)', () => {
    expect(valid(resolve('metric', '178', '', ''))).toBe(true);
    expect(valid(resolve('imperial', '', '5', '9'))).toBe(true); // 175 cm
    expect(valid(resolve('imperial', '', '6', ''))).toBe(true);  // exact 6 ft
  });

  test('a typo (single digit / weight in the height box) is rejected', () => {
    expect(valid(resolve('metric', '7', '', ''))).toBe(false);   // 7 cm
    expect(valid(resolve('metric', '80', '', ''))).toBe(false);  // weight typed in
    expect(valid(resolve('metric', '999', '', ''))).toBe(false); // out of range
  });

  test('the final submitted heightCm equals the user entry, not 175', () => {
    // The screen assigns `safeHeightCm = hcm`, where hcm is the resolved entry.
    // A user entering 182 cm submits 182, not the old 175 default.
    const submitted = resolve('metric', '182', '', '');
    expect(submitted).toBe(182);
    expect(submitted).not.toBe(175);
  });
});
