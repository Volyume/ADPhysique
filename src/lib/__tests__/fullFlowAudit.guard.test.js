/**
 * Coverage for the full-flow Codex audit (FF-002 … FF-007). FF-003's note
 * builder is pure and tested behaviourally; the rest live in screen handlers
 * that run on device, not under jest, so they are scoped source guards (same
 * convention as database.writeGuards / checkinCoachAudit.guard). Each guard
 * fails if its fix is reverted.
 */
const fs = require('fs');
const path = require('path');
const { planShortfallNote } = require('../planAutoGen');

const read = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');
const PLAN_UPDATE = read('../../screens/PlanUpdateScreen.js');
const ONBOARD = read('../../screens/ProOnboardingScreen.js');
const NUTRITION = read('../../screens/NutritionTargetsScreen.js');
const LIBRARY = read('../../screens/PlanLibraryScreen.js');
const SUMMARY = read('../../screens/WorkoutSummaryScreen.js');
const FOOD = read('../../screens/FoodSearchScreen.js');

describe('FF-003: partial-plan note (behavioural)', () => {
  test('singular / plural / zero phrasing', () => {
    expect(planShortfallNote(1)).toMatch(/1 move couldn't be matched/);
    expect(planShortfallNote(3)).toMatch(/3 moves couldn't be matched/);
    expect(planShortfallNote(0)).toMatch(/Your plan is built\./);
    expect(planShortfallNote(undefined)).toMatch(/Your plan is built\./);
  });
});

describe('FF-002: plan rebuild is a transaction', () => {
  test('source guard: PlanUpdate rebuilds before committing the profile and bails on failure', () => {
    const rebuildIdx = PLAN_UPDATE.indexOf('generateAndSavePlan(user.id, updatedProfile)');
    const saveIdx = PLAN_UPDATE.indexOf('saveLocalProfile(user.id, updatedProfile)');
    expect(rebuildIdx).toBeGreaterThan(-1);
    expect(saveIdx).toBeGreaterThan(-1);
    // Rebuild must run before the profile commit now.
    expect(rebuildIdx).toBeLessThan(saveIdx);
    // A failed rebuild bails (no save, no navigate-away).
    expect(PLAN_UPDATE).toMatch(/if \(!planResult\.ok\) \{[\s\S]*?return;[\s\S]*?\}/);
    expect(PLAN_UPDATE).toMatch(/Your training setup wasn't changed/);
  });
});

describe('FF-004: plan library distinguishes error from empty', () => {
  test('source guard: tracks a load error and offers a retry', () => {
    expect(LIBRARY).toMatch(/setLoadError\(true\)/);
    expect(LIBRARY).toMatch(/loadError \?/);
    expect(LIBRARY).toMatch(/Couldn't load plans/);
    expect(LIBRARY).toMatch(/const handleRetry/);
  });
});

describe('FF-005: nutrition target DB save is awaited and surfaced', () => {
  test('source guard: manual screen awaits and warns on failure', () => {
    expect(NUTRITION).toMatch(/await saveNutritionTargets\(user\.id/);
    expect(NUTRITION).not.toMatch(/saveNutritionTargets\(user\.id, \{ \.\.\.targets, gdprConsented: true \}\)\.catch\(\(\) => \{\}\)/);
    expect(NUTRITION).toMatch(/Recalculate to retry/);
  });
  test('source guard: onboarding awaits the save instead of fire-and-forget', () => {
    expect(ONBOARD).toMatch(/await saveNutritionTargets\(user\.id, nutritionData\)/);
    expect(ONBOARD).not.toMatch(/saveNutritionTargets\(user\.id, nutritionData\)\.catch\(\(\) => \{\}\)/);
  });
});

describe('FF-006: workout summary attributes recovery to the workout week', () => {
  test('source guard: uses localWeekStartMs(workoutDayMs(...)) and drops the now-based helper', () => {
    expect(SUMMARY).toMatch(/weekStart: localWeekStartMs\(workoutDayMs\(\{ startedAt, endedAt \}\)\)/);
    expect(SUMMARY).not.toMatch(/function getWeekStart\(/);
    expect(SUMMARY).not.toMatch(/weekStart: getWeekStart\(\)/);
  });
});

describe('FF-007: food logging surfaces failures', () => {
  test('source guard: plate reports partial progress; curated meal warns on failure', () => {
    expect(FOOD).toMatch(/Logged \$\{logged\} of \$\{total\}/);
    expect(FOOD).toMatch(/Couldn't add that meal, try again/);
  });
});
