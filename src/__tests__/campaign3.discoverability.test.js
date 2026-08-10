/**
 * campaign3.discoverability.test.js — Campaign 3 (discoverability,
 * settings, existing-feature UX; D94) pins.
 *
 * Pins the campaign's landed truths per the founder's Phase 23 list:
 * canonical editors stay reachable, contextual shortcuts navigate to
 * the one owner rather than forking state, gesture-only actions keep
 * their visible routes, tier routing stays honest, and the boundary
 * laws hold. Source-level guards by repo convention; each asserts a
 * MEANING (route, owner, gate), not layout trivia.
 */
import fs from 'fs';
import path from 'path';

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('SETTINGS ownership', () => {
  test('both diet surfaces render from the one shared DIETS list', () => {
    expect(read('screens/SettingsProfileScreen.js')).toMatch(/DIETS/);
    expect(read('components/food/DietaryPreferencesEditor.js')).toMatch(/DIETS/);
  });

  test('goal-setup seeds protein from the saved targets row, so it cannot revert an untouched choice', () => {
    const src = read('screens/ProGoalSetupScreen.js');
    expect(src).toMatch(/getNutritionTargets/);
    expect(src).toMatch(/proteinApproach \?\? t\?\.protein_approach/);
  });

  test('cycle tracking is gated to the tier of its only reader', () => {
    expect(stripComments(read('screens/SettingsCoachingScreen.js')))
      .toMatch(/tier === 'pro' && bioSex === 'female'/);
  });

  test('partner cheers has a reachable toggle writing the flag the sender reads', () => {
    const screen = read('screens/CoachingRemindersScreen.js');
    expect(screen).toMatch(/partnerCheerEnabled/);
    expect(screen).toMatch(/handlePartnerCheerToggle/);
    expect(read('lib/notifications/scheduler.js')).toMatch(/partnerCheerEnabled === false/);
  });

  test('onboarding writes a check-in hour the picker can display', () => {
    const src = stripComments(read('screens/ProOnboardingScreen.js'));
    expect(src).not.toMatch(/checkinHour:\s*12\b/);
    expect(src).toMatch(/checkinHour:\s*18\b/);
  });
});

describe('CONTEXTUAL shortcuts navigate to the canonical owner', () => {
  test('the Diary offset row links to PerDayTargets and renders only when an offset applies', () => {
    const src = read('screens/DiaryScreen.js');
    expect(src).toMatch(/perDayOffsetKcal !== 0 \?/);
    expect(src).toMatch(/navigate\('PerDayTargets'\)/);
  });

  test('the Coach tab routes to the volume-target editor', () => {
    expect(read('screens/YouScreen.js')).toMatch(/navigate\('VolumeHeatmap'\)/);
  });

  test('Body metrics links its displayed unit to the Workout and units editor', () => {
    expect(read('screens/BodyMetricsScreen.js')).toMatch(/navigate\('SettingsWorkout'\)/);
  });
});

describe('GESTURES: no important action is gesture-only', () => {
  test('plan-day exercise removal has a visible control sharing the long-press handler', () => {
    const src = read('screens/ManualBuilderScreen.js');
    const visible = src.match(/onPress=\{\(\) => handleLongPressExercise\(/g) ?? [];
    expect(visible.length).toBeGreaterThanOrEqual(1);
  });

  test('diary multi-select has a visible route from the tap-opened sheet', () => {
    expect(read('components/food/FoodDetailSheet.js')).toMatch(/onSelectEntries/);
    expect(read('screens/DiaryScreen.js')).toMatch(/onSelectEntries=\{/);
  });

  test('the saved-meals empty state names its gesture', () => {
    expect(read('screens/MyMealsScreen.js')).toMatch(/Press and hold any entry in your diary/);
  });
});

describe('TIER routing honesty', () => {
  test('a free user building a new plan reaches the free library; only review-with-coach upgrades', () => {
    const src = stripComments(read('screens/PlansScreen.js'));
    expect(src).toMatch(/recommendation === 'consider_rebuild'\s*\?\s*'ProUpgrade'\s*:\s*'PlanLibrary'/);
  });
});

describe('NOTIFICATIONS promise-keeping', () => {
  test('win-back pushes state saved-data truth and never sell Pro', () => {
    const src = stripComments(read('lib/notifications/winbackContent.js'));
    expect(src).not.toMatch(/Pro picks up/);
    expect(src).toMatch(/ready whenever you are/);
  });
});

describe('BOUNDARIES', () => {
  test('no cardio entry point or setting was added by this campaign (the pre-existing toggle is recorded for Campaign 4)', () => {
    for (const p of ['screens/YouScreen.js', 'screens/DiaryScreen.js', 'screens/BodyMetricsScreen.js', 'screens/PlansScreen.js']) {
      expect(stripComments(read(p))).not.toMatch(/[Cc]ardio logging/);
    }
  });

  test('the calculator weight fields disclose kilogram entry without converting (FR-1 territory untouched)', () => {
    const src = read('screens/NutritionTargetsScreen.js');
    expect(src).toMatch(/Entered in kilograms, whatever unit you display elsewhere\./);
  });
});
