/**
 * Coaching-first onboarding (founder brief 2026-10-19).
 * Pins:
 *  1. Only a quick start defers coaching: a profile without the marker (every
 *     existing user, whatever their older profile holds) is set up.
 *  2. The marker clears only with every required field present, never
 *     defaulted: sex, age, height, weight and a training goal.
 *  3. The streamlined wizard (ProOnboardingScreen coaching mode) asks the
 *     baseline, never completes first run or builds a plan unasked, clears
 *     the marker only in the save that validated the baseline, and rebuilds
 *     only through the preview.
 *  4. The card copy is calm, with no price, trial or tier words.
 */
import fs from 'fs';
import path from 'path';
import {
  isCoachingSetUp, canFinishCoachingSetup, missingCoachingFields, COACHING_SETUP_COPY,
} from '../coachingSetup';

const full = { sex: 'female', age: 31, heightCm: 165, weightKg: 62, trainingGoal: 'general' };

describe('who is set up', () => {
  test('only a quick start defers coaching', () => {
    expect(isCoachingSetUp(null)).toBe(true);
    expect(isCoachingSetUp({})).toBe(true);
    expect(isCoachingSetUp({ trainingGoal: 'general' })).toBe(true);
    expect(isCoachingSetUp({ coachingDeferred: false })).toBe(true);
    expect(isCoachingSetUp({ coachingDeferred: true })).toBe(false);
    expect(isCoachingSetUp({ ...full, coachingDeferred: true })).toBe(false);
  });

  test('setup may finish only with every required field, none defaulted', () => {
    expect(canFinishCoachingSetup(full)).toBe(true);
    expect(missingCoachingFields({})).toEqual(['sex', 'age', 'heightCm', 'weightKg', 'trainingGoal']);
    expect(missingCoachingFields({ ...full, sex: 'unspecified' })).toEqual(['sex']);
    expect(missingCoachingFields({ ...full, age: 9 })).toEqual(['age']);
    expect(missingCoachingFields({ ...full, heightCm: '' })).toEqual(['heightCm']);
    expect(missingCoachingFields({ ...full, weightKg: null })).toEqual(['weightKg']);
  });

  test('calm copy, no paywall language', () => {
    for (const text of Object.values(COACHING_SETUP_COPY)) {
      expect(text).not.toMatch(/—|trial|upgrade|premium|price|£|\bPro\b|unlock now/i);
    }
  });
});

describe('the streamlined wizard', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'ProOnboardingScreen.js'), 'utf8');

  test('coaching mode comes from the route, and skips only the gym and injuries steps', () => {
    expect(src).toMatch(/const coachingMode = route\?\.params\?\.mode === 'coaching';/);
    expect(src).toMatch(/if \(coachingMode\) \{ setStep\(7\); return; \}/);
    expect(src).toMatch(/if \(coachingMode && step === 7\) \{ setStep\(4\); return; \}/);
  });

  test('keep or rebuild is an explicit answer', () => {
    expect(src).toMatch(/const \[planChoice, setPlanChoice\] = useState\(null\);/);
    expect(src).toMatch(/if \(coachingMode && !planChoice\) \{ setPlanChoiceAttempted\(true\);/);
  });

  test('it never builds a plan in the save, and never completes first run', () => {
    expect(src).toMatch(/if \(user\?\.id && !coachingMode\) \{/);
    const finish = src.slice(src.indexOf('async function finishCoachingSetup()'), src.indexOf('// ── Step 1, Create account'));
    expect(finish).not.toMatch(/completeFirstRun|generateAndSavePlan/);
    // The rebuild builds only after the preview is confirmed.
    expect(finish.indexOf('setPlanPreview({')).toBeLessThan(finish.indexOf('commitStartWithPlan('));
    expect(finish).toMatch(/if \(confirmed\) \{/);
  });

  test('the marker clears only in the save that validated the baseline', () => {
    const guard = src.indexOf("'Baseline needs checking'");
    const clear = src.indexOf('coachingDeferred: false,');
    expect(guard).toBeGreaterThan(0);
    expect(clear).toBeGreaterThan(guard);
  });
});
