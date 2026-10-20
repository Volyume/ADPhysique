/**
 * Pins the onboarding, coaching-setup and plan telemetry emitters (growth
 * brief 2026-10-19): each is present in the right function with only the
 * payload keys its schema declares, so an emitter cannot drift from the
 * catalogue or start carrying personal data.
 */
const fs = require('fs');
const path = require('path');
const { SCHEMA_BY_NAME } = require('../schema');

const read = (rel) => fs.readFileSync(path.join(__dirname, '../../../..', rel), 'utf8');

function bodyOf(src, startMarker) {
  const i = src.indexOf(startMarker);
  expect(i).toBeGreaterThan(-1);
  return src.slice(i, i + 3500);
}

const EMITTERS = [
  ['src/screens/StartChoiceScreen.js', 'async function quickStart', 'onboarding_path_chosen', ['path', 'plan_source']],
  ['src/screens/StartChoiceScreen.js', "if (choice === 'coaching')", 'onboarding_path_chosen', ['path', 'plan_source']],
  ['src/screens/ProOnboardingScreen.js', 'useEffect(() => {\n    if (viewedStepsRef', 'onboarding_step_viewed', ['step', 'mode']],
  ['src/screens/ProOnboardingScreen.js', 'function surfaceGaps', 'onboarding_validation_blocked', ['step', 'field', 'mode']],
  ['src/screens/ProOnboardingScreen.js', 'async function advanceFrom8', 'onboarding_validation_blocked', ['step', 'field', 'mode']],
  ['src/screens/ProOnboardingScreen.js', 'function emitOnboardingCompleted', 'onboarding_completed', ['path', 'mode', 'duration']],
  ['src/screens/ProOnboardingScreen.js', 'async function finishCoachingSetup', 'coaching_setup_finished', ['plan_choice', 'rebuild_outcome']],
  ['src/screens/ProOnboardingScreen.js', '<ArchetypePicker', 'archetype_chosen', ['archetype', 'surface']],
  ['src/screens/PlanUpdateScreen.js', '<ArchetypePicker', 'archetype_chosen', ['archetype', 'surface']],
  ['src/screens/ProGoalSetupScreen.js', '<ArchetypePicker', 'archetype_chosen', ['archetype', 'surface']],
  ['src/components/CoachingSetupCard.js', 'useEffect', 'coaching_setup_card_shown', ['surface']],
  ['src/components/CoachingSetupCard.js', 'onPress={() =>', 'coaching_setup_started', ['entry']],
  ['src/lib/planAutoGen.js', 'function emitPlanGenerationFinished', 'plan_generation_finished', ['outcome', 'ms', 'trigger']],
];

describe('lane onboarding emitters', () => {
  test.each(EMITTERS)('%s emits %s near %s', (file, marker, event, keys) => {
    const body = bodyOf(read(file), marker);
    expect(body).toContain(`'${event}'`);
    for (const k of keys) expect(body).toMatch(new RegExp(`\\b${k}\\b`));
  });

  test.each(EMITTERS)('%s payload keys exist in the schema for %s', (file, marker, event, keys) => {
    const schema = SCHEMA_BY_NAME[event];
    expect(schema).toBeTruthy();
    for (const k of keys) expect(Object.keys(schema.fields)).toContain(k);
  });

  test('feature_seen emitters and the card surfaces', () => {
    expect(read('src/screens/StartChoiceScreen.js')).toContain("trackFeatureSeen('start_choice')");
    for (const f of ['ProOnboardingScreen', 'PlanUpdateScreen', 'ProGoalSetupScreen']) {
      expect(read(`src/screens/${f}.js`)).toContain("trackFeatureSeen('archetype_cards')");
    }
    expect(read('src/components/CoachingSetupCard.js')).toContain("trackFeatureSeen('coaching_setup_card')");
    const surfaces = {
      DiaryScreen: 'nutrition', MealPlanScreen: 'meal_plan', NutritionTargetsScreen: 'targets',
      WeeklyCheckInScreen: 'checkin', CoachOutputScreen: 'coach_output', YouScreen: 'coach_home',
      HomeScreen: 'home', ProGoalSetupScreen: 'goal_setup',
    };
    const allowed = SCHEMA_BY_NAME.coaching_setup_card_shown.fields.surface.values;
    for (const [f, s] of Object.entries(surfaces)) {
      expect(read(`src/screens/${f}.js`)).toContain(`<CoachingSetupCard surface="${s}"`);
      expect(allowed).toContain(s);
    }
  });

  // Adversarial review (minor): "See my plan" tapped twice must send
  // onboarding_completed once.
  test('seePlan has a double-tap guard ahead of its onboarding_completed emit', () => {
    const src = read('src/screens/ProOnboardingScreen.js');
    const i = src.indexOf('async function seePlan()');
    expect(i).toBeGreaterThan(-1);
    const body = src.slice(i, i + 700);
    expect(body).toContain('if (seePlanTappedRef.current) return;');
    expect(body.indexOf('seePlanTappedRef.current = true;')).toBeGreaterThan(-1);
    expect(body.indexOf('seePlanTappedRef.current = true;')).toBeLessThan(body.indexOf("emitOnboardingCompleted('coaching')"));
    expect(src).toContain('const seePlanTappedRef = useRef(false);');
  });

  test('every wizard gap field maps into the schema enum', () => {
    const values = SCHEMA_BY_NAME.onboarding_validation_blocked.fields.field.values;
    const m = read('src/screens/ProOnboardingScreen.js').match(/const GAP_FIELD = \{([\s\S]*?)\};/);
    const mapped = [...m[1].matchAll(/:\s*'(\w+)'/g)].map((x) => x[1]);
    expect(mapped.length).toBe(10);
    for (const v of mapped) expect(values).toContain(v);
  });
});
