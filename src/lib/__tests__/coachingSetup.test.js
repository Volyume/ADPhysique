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

  test('the marker clears only after the targets are written, and only with every required field', () => {
    const guard = src.indexOf("'Baseline needs checking'");
    const targets = src.indexOf('await saveNutritionTargets(user.id, nutritionData);');
    const clear = src.indexOf('const setUp = { ...merged, coachingDeferred: false };');
    expect(guard).toBeGreaterThan(0);
    expect(targets).toBeGreaterThan(guard);
    expect(clear).toBeGreaterThan(targets);
    expect(src).toMatch(/if \(!canFinishCoachingSetup\(setUp\)\) throw new Error/);
    // The first profile save in coaching mode keeps the marker.
    expect(src).toMatch(/coachingDeferred: coachingMode,/);
  });
});

describe('nothing coaching reaches a quick-start person (adversarial review, round 1)', () => {
  const read = (...p) => fs.readFileSync(path.join(__dirname, '..', '..', ...p), 'utf8');

  test('weigh-in, check-in and coach-ready reminders stay off until setup', () => {
    const sched = read('lib', 'notifications', 'scheduler.js');
    expect(sched).toMatch(/function coachingRemindersAllowed\(state\) \{\s*if \(state\?\.tier !== 'pro'\) return false;[\s\S]{0,160}return isCoachingSetUp\(state\?\.userProfile\);/);
    expect(sched.match(/isPro = coachingRemindersAllowed\(/g)).toHaveLength(2);
    expect(sched).not.toMatch(/isPro = require\('..\/..\/store\/useAppStore'\)\.default\.getState\(\)\?\.tier === 'pro'/);
  });

  test('Home asks for no weigh-in and counts down to no check-in', () => {
    const home = read('screens', 'HomeScreen.js');
    expect(home).toMatch(/user\?\.id && coachingSetUp && todayWeight == null/);
    expect(home).toMatch(/user\?\.id && coachingSetUp && evidencePanelItem/);
  });

  test('goal setup is gated, and the Coach tab hides its coaching rows', () => {
    expect(read('screens', 'ProGoalSetupScreen.js')).toMatch(/if \(!coachingSetUp\) \{\s*return \(/);
    expect(read('screens', 'YouScreen.js')).toMatch(/\{coachingSetUp \? \(\s*<View style=\{styles\.section\}>/);
  });
});

