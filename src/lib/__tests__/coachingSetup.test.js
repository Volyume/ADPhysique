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
  coachingCardMode, snoozeCoachingCard, isCoachingCardSnoozed,
  markFullCardShown, fullCardShownThisSession, __resetCoachingCardSession,
} from '../coachingSetup';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  const api = {
    __store: store,
    __failRead: false,
    __failWrite: false,
    getItem: jest.fn(async (k) => { if (api.__failRead) throw new Error('read'); return store.has(k) ? store.get(k) : null; }),
    setItem: jest.fn(async (k, v) => { if (api.__failWrite) throw new Error('write'); store.set(k, v); }),
  };
  return { __esModule: true, default: api };
});
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));

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
    expect(src).toMatch(/if \(coachingMode && !planChoice\) \{ (?:trackNow\([^)]*\); )?setPlanChoiceAttempted\(true\);/);
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


describe('the setup card repeat control', () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const DAY = 24 * 60 * 60 * 1000;
  beforeEach(() => {
    AsyncStorage.__store.clear();
    AsyncStorage.__failRead = false;
    AsyncStorage.__failWrite = false;
    __resetCoachingCardSession();
  });

  test('existing copy keys keep their values, and the new ones are calm', () => {
    expect(COACHING_SETUP_COPY.title).toBe('Set up coaching');
    expect(COACHING_SETUP_COPY.action).toBe('Set up coaching');
    expect(COACHING_SETUP_COPY.compact).toBe("Coaching isn't set up yet.");
    expect(COACHING_SETUP_COPY.compactAction).toBe('Set up');
    expect(COACHING_SETUP_COPY.notNow).toBe('Not now');
  });

  test('mode truth table', () => {
    const m = (snoozed, shownThisSession, sessionScoped) => coachingCardMode({ snoozed, shownThisSession, sessionScoped });
    expect(m(true, false, false)).toBe('compact');
    expect(m(true, true, true)).toBe('compact');
    expect(m(false, true, true)).toBe('compact');
    expect(m(false, true, false)).toBe('full');
    expect(m(false, false, true)).toBe('full');
    expect(m(false, false, false)).toBe('full');
  });

  test('snooze lasts seven days then expires', async () => {
    const now = 1_000_000;
    expect(await isCoachingCardSnoozed('u1', now)).toBe(false);
    await snoozeCoachingCard('u1', now);
    expect(AsyncStorage.__store.get('@volyume_coaching_card_snoozed_until_u1')).toBe(String(now + 7 * DAY));
    expect(await isCoachingCardSnoozed('u1', now + 7 * DAY - 1)).toBe(true);
    expect(await isCoachingCardSnoozed('u1', now + 7 * DAY)).toBe(false);
    expect(await isCoachingCardSnoozed('u2', now)).toBe(false);
  });

  test('a read failure shows the full card; a write failure is logged, not thrown', async () => {
    AsyncStorage.__failRead = true;
    expect(await isCoachingCardSnoozed('u1')).toBe(false);
    AsyncStorage.__failWrite = true;
    await expect(snoozeCoachingCard('u1')).resolves.toBeUndefined();
    expect(require('../errorLog').logError).toHaveBeenCalled();
  });

  test('session memory is per surface and resets', () => {
    expect(fullCardShownThisSession('home')).toBe(false);
    markFullCardShown('home');
    expect(fullCardShownThisSession('home')).toBe(true);
    expect(fullCardShownThisSession('coach_home')).toBe(false);
    __resetCoachingCardSession();
    expect(fullCardShownThisSession('home')).toBe(false);
  });
});
