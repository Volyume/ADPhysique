/**
 * CP-6 (2026-07-09 UX audit) — "Workout & units" sub-page.
 *
 * SCORECARD.md: "'Workout & units' still renders inline on the Settings
 * root, breaking the screen's own stated 'tap for a sub-page' contract."
 * The fix moves the block wholesale into its own SettingsWorkoutScreen,
 * registered like every sibling Settings sub-page, with a plain row on the
 * Settings root taking its place.
 *
 * Source-guard style (fs.readFileSync + regex), matching the house
 * convention for navigation/registration pins (src/__tests__/
 * iaNavigation.guard.test.js, src/__tests__/navigationTargets.guard.test.js):
 * these screens pull in the live zustand store, Reanimated-adjacent
 * primitives and native modules with no existing full-render mock scaffold,
 * so the registration and JSX contract are pinned at the source level.
 */
import fs from 'fs';
import path from 'path';

function read(rel) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');
}

const NAV = read('navigation/RootNavigator.js');
const SETTINGS_ROOT = read('screens/SettingsScreen.js');
const SETTINGS_WORKOUT = read('screens/SettingsWorkoutScreen.js');

describe('SettingsWorkoutScreen is registered like every other Settings sub-page', () => {
  test('RootNavigator lazy-loads it and registers the "SettingsWorkout" route alongside "Settings"', () => {
    expect(NAV).toMatch(
      /const SettingsWorkoutScreen = lazyScreen\(\(\) => require\('\.\.\/screens\/SettingsWorkoutScreen'\)\.default\);/,
    );
    expect(NAV).toMatch(
      /<Stack\.Screen name="SettingsWorkout" component=\{SettingsWorkoutScreen\} options=\{\{ headerShown: false \}\} \/>/,
    );
    // Registered inside ProfileStack (same stack Settings itself lives in),
    // so the Settings-root row below can use a bare navigate() safely
    // (F4/NAV guard: a bare navigate to a route outside the caller's own
    // stack silently no-ops).
    const start = NAV.indexOf('function ProfileStack(');
    const end = NAV.indexOf('\nfunction ', start + 1);
    const profileStackBody = NAV.slice(start, end === -1 ? NAV.length : end);
    expect(profileStackBody).toMatch(/name="SettingsWorkout"/);
  });
});

describe('Settings root: "Workout & units" is a row, not an inline block (CP-6)', () => {
  test('renders a SettingRow that navigates to SettingsWorkout, matching sibling rows (icon + label + sub)', () => {
    // Haptics completion pass (2026-07-10): every Settings-root row now
    // fires haptics.selection() alongside its navigate() call; the regex
    // tolerates that one extra leading statement without loosening the
    // real pin (still a plain row, still navigating to SettingsWorkout).
    expect(SETTINGS_ROOT).toMatch(
      /<SettingRow\s+icon="body-outline"\s+label="Workout & units"\s+sub="[^"]+"\s+onPress=\{\(\) => \{ (?:haptics\.selection\(\); )?navigation\.navigate\('SettingsWorkout'\); \}\}\s*\/>/,
    );
  });

  test('no longer renders the inline block: no body-weight segmented control, no NumericStepper, no rest-timer switches', () => {
    expect(SETTINGS_ROOT).not.toMatch(/BODY_WEIGHT_UNIT_OPTIONS/);
    expect(SETTINGS_ROOT).not.toMatch(/NumericStepper/);
    expect(SETTINGS_ROOT).not.toMatch(/Auto-start rest timer/);
    expect(SETTINGS_ROOT).not.toMatch(/Rest finished alert/);
    expect(SETTINGS_ROOT).not.toMatch(/setBodyWeightUnits|setDefaultRestSeconds|setAutoStartRestTimer|setRestEndAlertEnabled/);
  });
});

describe('SettingsWorkoutScreen carries the moved block wholesale: same state, same persistence keys', () => {
  test('body-weight unit segmented control (Stone/Kg/Lbs), wired to the same store setter', () => {
    expect(SETTINGS_WORKOUT).toMatch(/BODY_WEIGHT_UNIT_OPTIONS/);
    expect(SETTINGS_WORKOUT).toMatch(/setBodyWeightUnits/);
    expect(SETTINGS_WORKOUT).toMatch(/accessibilityRole="radiogroup"/);
    expect(SETTINGS_WORKOUT).toMatch(/accessibilityRole="radio"/);
    expect(SETTINGS_WORKOUT).toMatch(/accessibilityState=\{\{ selected: active \}\}/);
  });

  test('default rest timer stepper, auto-start switch and rest-finished-alert switch all wired to the same store setters', () => {
    expect(SETTINGS_WORKOUT).toMatch(/setDefaultRestSeconds/);
    expect(SETTINGS_WORKOUT).toMatch(/setAutoStartRestTimer/);
    expect(SETTINGS_WORKOUT).toMatch(/setRestEndAlertEnabled/);
  });

  test('Android exact-alarm row is preserved, gated the same way (rest alert on, not yet granted)', () => {
    expect(SETTINGS_WORKOUT).toMatch(
      /Platform\.OS === 'android' && !!restEndAlertEnabled && !exactAlarmsGranted/,
    );
    expect(SETTINGS_WORKOUT).toMatch(/requestExactAlarmAccess/);
  });

  test('renders through the shared SettingsPage/BackHeader chrome with the "Workout & units" title', () => {
    expect(SETTINGS_WORKOUT).toMatch(/<SettingsPage title="Workout & units">/);
  });
});
