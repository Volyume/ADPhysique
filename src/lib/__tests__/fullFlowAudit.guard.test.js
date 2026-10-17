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
    // D140: the call carries the keep-block ruling; the ordering it pins is unchanged.
    const rebuildIdx = PLAN_UPDATE.indexOf('generateAndSavePlan(user.id, updatedProfile, { keepBlock })');
    const saveIdx = PLAN_UPDATE.indexOf('saveLocalProfile(user.id, updatedProfile)');
    expect(rebuildIdx).toBeGreaterThan(-1);
    expect(saveIdx).toBeGreaterThan(-1);
    // Rebuild must run before the profile commit now.
    expect(rebuildIdx).toBeLessThan(saveIdx);
    // A failed rebuild bails (no save, no navigate-away).
    expect(PLAN_UPDATE).toMatch(/if \(!planResult\.ok\) \{[\s\S]*?return;[\s\S]*?\}/);
    expect(PLAN_UPDATE).toMatch(/Your training setup has not changed/);
  });
});

describe('FF-004: plan library distinguishes error from empty', () => {
  test('source guard: tracks a load error and offers a retry', () => {
    expect(LIBRARY).toMatch(/setLoadError\(true\)/);
    expect(LIBRARY).toMatch(/loadError \?/);
    expect(LIBRARY).toMatch(/Could not load plans/);
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
  // RE-POINTED (D230 R15/R18, food level-up 2026-10-16): the same two
  // failures are reported, now as full sentences that say what happened and
  // what to do, and each is logged with its cause first.
  // RE-POINTED (D230 R10, lane 3A): the plate is one transaction
  // (logFoodEntries), so a mid-plate failure can no longer leave some foods
  // written: the failure is all-or-nothing and is reported as such, in full
  // sentences, with its cause logged. The "N of M foods were added" sentence
  // described a half-state that cannot happen now and is retired with it.
  test('source guard: the plate reports a failed write (all or nothing); curated meal warns on failure', () => {
    expect(FOOD).toMatch(/'That food was not added\. Try again in a moment\.'/);
    expect(FOOD).toMatch(/'Those foods were not added\. Try again in a moment\.'/);
    // Lane 3C: the plate and the typed line share the one write (writeItems).
    expect(FOOD).toMatch(/await logFoodEntries\(userId, items\.map\(/);
    expect(FOOD).toMatch(/await writeItems\(plate, /);
    expect(FOOD).not.toMatch(/foods were added to \$\{mealName\}\. The rest were not/);
    expect(FOOD).toMatch(/'That meal was not added\. Try again in a moment\.'/);
    expect(FOOD).toMatch(/logError\('FoodSearchScreen\.logPlate', e/);
    expect(FOOD).toMatch(/logError\('FoodSearchScreen\.logCuratedMeal', e/);
  });
});
