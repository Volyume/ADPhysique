/**
 * D228 item 6 (2026-10-15, founder "Go as recommended"): three orphans from the
 * coherence survey, each ruled and each pinned here so none can quietly return.
 *
 *   1. CoachReview (the per-muscle weekly volume review) is RE-WIRED: one row on
 *      the Recovery screen, directly after Recovery by muscle, and the route is
 *      registered in the Progress stack (where Recovery lives) so Back returns
 *      to Recovery. The Home registration is untouched.
 *   2. MealNames is DELETED (the 2026-07-13 removal of the Settings row
 *      stands): no screen file, no lazy import, no route, no Settings row. The
 *      meal-slot label layer in lib/food/mealSlots.js stays: the Diary and the
 *      food surfaces still read labels through it.
 *   3. The health stub screen and its Settings row are DELETED. The platform
 *      integrations were removed 2026-06-30, so isHealthAvailable() is false on
 *      every platform and the row could never render. Manual weight logging
 *      (morning_weights) is a separate path and is not touched here.
 *
 * Source-level guards (fs + regex), the repo's convention for removals and
 * wiring, written to fail if a route comes back or a link is cut.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(SRC, rel));

// Comments may keep history (the removal is explained in prose); only code is pinned.
function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

const NAV = read('navigation/RootNavigator.js');
const RECOVERY = read('screens/RecoveryScreen.js');
const CARDS = read('components/ReadinessCards.js');
const SETTINGS = read('screens/SettingsScreen.js');

function stackBody(name) {
  const start = NAV.indexOf(`function ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const end = NAV.indexOf('\nfunction ', start + 1);
  return NAV.slice(start, end === -1 ? NAV.length : end);
}

describe('CoachReview: the weekly volume review row on the Recovery screen', () => {
  test('the Recovery screen carries the row, titled and described as ruled, opening CoachReview', () => {
    const code = stripComments(RECOVERY);
    expect(code).toContain("import { NavRow, NavGroup } from '../components/NavRow';");
    expect(code).toContain('label="Weekly volume review"');
    expect(code).toContain('sub="Sets per muscle this week against your plan"');
    expect(code).toContain("navigation.navigate('CoachReview')");
    // Handed down through the cards' slot, not a cross-tab jump: Back must land on Recovery.
    expect(code).toMatch(/afterByMuscle=\{/);
    expect(code).not.toContain('navigateCrossTab');
  });

  test('ReadinessCards draws the slot directly after the Recovery by muscle block and before the recovery speed card', () => {
    const code = stripComments(CARDS);
    const list = code.indexOf('<MuscleRecoveryList');
    const slot = code.indexOf("{sections === 'recovery' ? afterByMuscle : null}");
    const speed = code.indexOf('<RecoveryLearningCard personal=');
    expect(list).toBeGreaterThan(-1);
    expect(slot).toBeGreaterThan(list);
    expect(speed).toBeGreaterThan(slot);
    // The cards stay navigation-agnostic: the slot is a node, never a navigate call.
    expect(code).not.toMatch(/navigation\.navigate|useNavigation|navigateCrossTab/);
  });

  // RE-POINTED (D231, batch 4): Recovery and CoachReview are in the Coach stack
  // (ProfileStack) now that the Progress stack is retired.
  test('CoachReview is registered in the Coach stack (so Back returns to Recovery) and still lazy-imported', () => {
    expect(NAV).toContain("const CoachReviewScreen = lazyScreen(() => require('../screens/CoachReviewScreen').default);");
    expect(stackBody('ProfileStack')).toContain('<Stack.Screen name="CoachReview" component={CoachReviewScreen}');
    // Recovery and CoachReview share the stack the row navigates within.
    expect(stackBody('ProfileStack')).toContain('<Stack.Screen name="Recovery" component={RecoveryScreen}');
  });

  test('the row carries no tier gate, price or upsell (the product is fully free)', () => {
    const code = stripComments(RECOVERY);
    expect(code).not.toMatch(/ProGate|withProGuard|proGate|ProUpgrade|Paywall|trial/i);
  });
});

describe('MealNames: deleted, with the meal-slot label layer left intact', () => {
  test('no screen file, lazy import, route or Settings navigation remains', () => {
    expect(exists('screens/MealNamesScreen.js')).toBe(false);
    expect(stripComments(NAV)).not.toMatch(/MealNames/);
    expect(stripComments(SETTINGS)).not.toMatch(/MealNames|Meal names/);
  });

  test('lib/food/mealSlots.js still exports the label layer the food surfaces read', () => {
    const slots = read('lib/food/mealSlots.js');
    for (const name of ['mealSlotLabel', 'getMealLabelOverrides', 'loadMealLabelOverrides', 'setMealLabel', 'defaultMealSlotLabel']) {
      expect(slots).toMatch(new RegExp(`export (async )?function ${name}\\b`));
    }
    // The boot loader still runs, so any name saved before the row was removed still applies.
    expect(fs.readFileSync(path.resolve(SRC, '..', 'App.js'), 'utf8')).toContain('loadMealLabelOverrides');
  });
});

describe('The health stub: screen, route and Settings row are gone', () => {
  test('no SettingsHealth screen file, lazy import or route', () => {
    expect(exists('screens/SettingsHealthScreen.js')).toBe(false);
    expect(stripComments(NAV)).not.toMatch(/SettingsHealth/);
  });

  test('Settings no longer reads the health module or renders a health row', () => {
    const code = stripComments(SETTINGS);
    expect(code).not.toMatch(/lib\/health|isHealthAvailable|getHealthProviderLabel|healthOn|SettingsHealth|heart-outline/);
  });

  test('the health module went with the stub, and so did its only readers', () => {
    // Lead ruling at landing (D228 item 6, 2026-10-15): isHealthAvailable()
    // had been false since 2026-06-30, so writeWorkoutToHealth was a no-op
    // and activitySteps.js (which only ever read the stub) had no production
    // caller. The module, the summary's write call and that reader all go.
    expect(exists('lib/health.js')).toBe(false);
    expect(exists('lib/activitySteps.js')).toBe(false);
    expect(stripComments(read('screens/WorkoutSummaryScreen.js'))).not.toMatch(/lib\/health|writeWorkoutToHealth/);
  });
});
