/**
 * Pins the friction, confusion, performance and exposure emitters (growth
 * brief 2026-10-19, lane D): help_opened, error_shown, screen_ready,
 * setup_stage_stalled and the four feature_seen sightings. Each emitter is
 * present where it should be and uses only values the schema allows, so none
 * can drift from the catalogue or carry personal data.
 */
const fs = require('fs');
const path = require('path');
const { SCHEMA_BY_NAME } = require('../schema');
const { screenReadyPayload } = require('../useScreenReady');
const { stalledStage } = require('../setupStalled');
const { topicForTooltip } = require('../helpTopic');

const read = (rel) => fs.readFileSync(path.join(__dirname, '../../../..', rel), 'utf8');

describe('screen_ready', () => {
  test('payload is a route name and an ms bucket the schema accepts', () => {
    const p = screenReadyPayload('Diary', 1000, 1700);
    expect(p).toEqual({ screen: 'Diary', ms: '500ms-1s' });
    const f = SCHEMA_BY_NAME.screen_ready.fields;
    expect(Object.keys(p).sort()).toEqual(Object.keys(f).sort());
    expect(SCHEMA_BY_NAME.screen_ready.preConsent).toBe(true);
  });

  test.each([
    ['Home', 'src/screens/HomeScreen.js'],
    ['Plans', 'src/screens/PlansScreen.js'],
    ['ActiveWorkout', 'src/screens/ActiveWorkoutScreen.js'],
    ['Diary', 'src/screens/DiaryScreen.js'],
    ['FoodSearch', 'src/screens/FoodSearchScreen.js'],
    ['WeeklyCheckIn', 'src/screens/WeeklyCheckInScreen.js'],
    ['Community', 'src/screens/CommunityHubScreen.js'],
  ])('%s calls useScreenReady', (name, file) => {
    expect(read(file)).toMatch(new RegExp(`useScreenReady\\('${name}',`));
  });

  test('the hook fires once, through trackNow', () => {
    const src = read('src/lib/telemetry/useScreenReady.js');
    expect(src).toMatch(/sentRef\.current/);
    expect(src).toMatch(/trackNow\('screen_ready'/);
  });
});

describe('setup_stage_stalled', () => {
  test('every stage maps into the schema enum', () => {
    const allowed = SCHEMA_BY_NAME.setup_stage_stalled.fields.stage.values;
    ['fit', 'fit_full', 'reminder_prefs', 'build', 'notification_permission', 'reminder_lay',
      'splash', 'first_run', 'tier', 'auth', 'consent', 'whatever'].forEach((n) => {
      expect(allowed).toContain(stalledStage(n));
    });
    expect(stalledStage('splash')).toBe('boot_splash');
    expect(stalledStage('whatever')).toBe('other');
  });

  test('both watchdogs emit', () => {
    expect(read('src/screens/ProOnboardingScreen.js')).toMatch(/emitSetupStageStalled\(stage\)/);
    expect(read('src/navigation/RootNavigator.js')).toMatch(/bootWaits\.split\(','\)\.forEach\(emitSetupStageStalled\)/);
    expect(read('src/lib/telemetry/setupStalled.js')).toMatch(/trackNow\('setup_stage_stalled'/);
  });
});

describe('help_opened', () => {
  test('topic is a code, never the text', () => {
    const { GLOSSARY } = require('../../coachGlossary');
    expect(topicForTooltip(GLOSSARY.estMax)).toBe('est_max');
    expect(topicForTooltip('Some inline explanation.')).toBe('unlisted');
    expect(topicForTooltip('x', 'rest_timer')).toBe('rest_timer');
    expect(topicForTooltip('x', 'Not A Code')).toBe('unlisted');
  });

  test('InfoTooltip reports on open', () => {
    expect(read('src/components/InfoTooltip.js')).toMatch(/reportHelpOpened\(text, topic\)/);
    expect(read('src/lib/telemetry/helpTopic.js')).toMatch(/helpOpened\(/);
  });
});

describe('error_shown', () => {
  test('toast, crash screen and screen boundary report with schema kinds', () => {
    const kinds = SCHEMA_BY_NAME.error_shown.fields.kind.values;
    expect(kinds).toEqual(expect.arrayContaining(['toast', 'error_view']));
    expect(read('src/components/Toast.js')).toMatch(/variant === 'error'[\s\S]{0,200}errorShown\('toast'\)/);
    expect(read('App.js')).toMatch(/errorShown\('error_view'\)/);
    expect(read('src/components/ScreenBoundary.js')).toMatch(/errorShown\('error_view'\)/);
  });
});

describe('feature_seen', () => {
  const allowed = SCHEMA_BY_NAME.feature_seen.fields.feature.values;
  test.each([
    ['warmup_chip', 'src/screens/ActiveWorkoutScreen.js'],
    ['shopping_list_days', 'src/screens/MealPlanScreen.js'],
    ['raw_cooked_toggle', 'src/screens/MealPlanScreen.js'],
  ])('%s is in the schema and shown from %s', (feature, file) => {
    expect(allowed).toContain(feature);
    expect(read(file)).toMatch(new RegExp(`<FeatureSeen feature="${feature}" />`));
  });
  // Q4 ruling: the "Cannot do this?" card is shown only because a movement
  // was declined, so seeing it is capability-derived. Nothing may report it.
  test('declined_today_card is not a feature value and is not reported', () => {
    expect(allowed).not.toContain('declined_today_card');
    expect(read('src/screens/WorkoutSummaryScreen.js')).not.toContain('declined_today_card');
    expect(read('src/screens/WorkoutSummaryScreen.js')).not.toMatch(/FeatureSeen/);
  });
  test('FeatureSeen goes through trackFeatureSeen', () => {
    expect(read('src/components/FeatureSeen.js')).toMatch(/trackFeatureSeen\(feature\)/);
  });
});
