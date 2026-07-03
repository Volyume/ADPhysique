/**
 * F4 (audit NAV-1/2/3): React Navigation silently DROPS a navigate() whose
 * target route is not registered in the caller's own stack — no error, no
 * navigation, a dead control in production. All three audited dead ends were
 * this one bug class: a bare navigate('X') from Train/Diary stacks to a route
 * that lives only in ProfileStack. The correct form is
 * navigation.getParent()?.navigate('ProfileTab', { screen: 'X', params }).
 *
 * These source guards pin the three fixed sites and canary the bug class for
 * the ProfileStack-only routes most likely to be linked from other tabs.
 */
import fs from 'fs';
import path from 'path';

function read(rel) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');
}

// Routes registered ONLY in ProfileStack (see RootNavigator ProfileStack) that
// other tabs are known to want to link to. A bare navigate to any of these
// from a non-Profile screen is the silent-no-op bug.
const PROFILE_ONLY_ROUTES = ['CoachOutput', 'NutritionTargets', 'SettingsPrivacy', 'WeeklyCheckIn'];

// Screens that live OUTSIDE ProfileStack but carry cross-tab links to it.
const NON_PROFILE_SCREENS = [
  'src/screens/HomeScreen.js',
  'src/screens/DiaryScreen.js',
  'src/screens/MealPlanScreen.js',
  'src/screens/AnalyticsScreen.js',
  'src/screens/PlansScreen.js',
];

describe('cross-stack navigation guard (F4 / NAV-1/2/3)', () => {
  test.each(NON_PROFILE_SCREENS)('%s has no bare navigate() to a ProfileStack-only route', (file) => {
    const src = read(file);
    for (const route of PROFILE_ONLY_ROUTES) {
      // Bare form: navigation.navigate('Route'  — silently dropped in prod.
      // Allowed form: getParent()?.navigate('ProfileTab', { screen: 'Route' }).
      const bare = new RegExp(`navigation\\.navigate\\(\\s*['"]${route}['"]`);
      expect(src).not.toMatch(bare);
    }
  });

  test('the three audited dead ends now use the parent-tab form', () => {
    // T3: the parent-tab idiom lives in navigateCrossTab (which hardcodes
    // initial: false); these sites must route through it.
    expect(read('src/screens/HomeScreen.js'))
      .toMatch(/navigateCrossTab\(navigation,\s*'ProfileTab',\s*'CoachOutput'/);
    expect(read('src/screens/MealPlanScreen.js'))
      .toMatch(/navigateCrossTab\(navigation,\s*'ProfileTab',\s*'NutritionTargets'/);
    expect(read('src/screens/DiaryScreen.js'))
      .toMatch(/navigateCrossTab\(navigation,\s*'ProfileTab',\s*'SettingsPrivacy'/);
  });

  test("OB-8: the check-in's 'Log my weight first' CTA deep-links to the Train tab weight logger", () => {
    const src = read('src/screens/WeeklyCheckInScreen.js');
    // WeeklyCheckIn lives in ProfileStack; Home lives in HomeStack, so the
    // deep-link must use the parent-tab form (a bare navigate('Home') is the
    // silent-no-op bug class this file guards). The openWeightLog param is
    // what pops the TodayStrip weight input open on arrival.
    expect(src).toMatch(/navigateCrossTab\(navigation,\s*'HomeTab',\s*'Home',\s*\{\s*openWeightLog/);
    // And no bare cross-stack navigate to Home sneaks back in.
    expect(src).not.toMatch(/navigation\.navigate\(\s*['"]Home['"]/);
    // The receiving end: Home forwards the param into TodayStrip, which opens
    // its weight input on the signal. Without both, the deep-link lands on
    // Home but the promised "log weight" action is still a hunt.
    expect(read('src/screens/HomeScreen.js'))
      .toMatch(/openWeightSignal=\{route\?\.params\?\.openWeightLog/);
    expect(read('src/components/TodayStrip.js'))
      .toMatch(/if\s*\(openWeightSignal\)\s*setEditing\(true\)/);
  });

  test('every tab stack with a Pro-gated surface registers ProUpgrade', () => {
    // Same silent-drop bug class as above, inside a single stack: ProGate /
    // ProLocked surfaces call navigate('ProUpgrade'), which React Navigation
    // silently drops unless the caller's OWN stack registers the route.
    // DiaryStack (every screen gated) shipped without it — a free user tapping
    // Upgrade in the Diary got a dead control. Pin all five tab stacks.
    const nav = read('src/navigation/RootNavigator.js');
    for (const stack of ['DiaryStack', 'HomeStack', 'PlansStack', 'ProgressStack', 'ProfileStack']) {
      const start = nav.indexOf(`function ${stack}(`);
      expect(start).toBeGreaterThan(-1);
      const end = nav.indexOf('\nfunction ', start + 1);
      const body = nav.slice(start, end === -1 ? nav.length : end);
      expect(body).toMatch(/name="ProUpgrade"\s+component=\{ProUpgradeScreen\}\s+options=\{\{\s*headerShown:\s*false,\s*presentation:\s*'modal'\s*\}\}/);
    }
  });

  test('MesocycleBuilder ("Training Blocks") stays FREE (founder 2026-07-02)', () => {
    // Founder tier decision (2026-07-02): the mesocycle / Training Blocks
    // builder is a training surface, and CLAUDE.md's binary puts training on
    // the free side (Plan Library + builder), nutrition/coaching on the Pro
    // side. It must not silently drift behind a Pro gate. Its loader is a plain
    // require with no withProGuard wrapper, and the screen carries no internal
    // tier gate.
    const nav = read('src/navigation/RootNavigator.js');
    expect(nav).toMatch(
      /const MesocycleBuilderScreen = lazyScreen\(\(\) => require\('\.\.\/screens\/MesocycleBuilderScreen'\)\.default\);/,
    );
    // Not wrapped in withProGuard anywhere.
    expect(nav).not.toMatch(/withProGuard\(require\('\.\.\/screens\/MesocycleBuilderScreen'\)/);
    // And no internal Pro gate inside the screen (would lock a free surface).
    const screen = read('src/screens/MesocycleBuilderScreen.js');
    expect(screen).not.toMatch(/withProGuard|ProLocked|proGate/);
  });

  test('the Diary OFF-sharing prompt navigates BEFORE it dismisses itself', () => {
    const src = read('src/screens/DiaryScreen.js');
    const site = src.indexOf("'SettingsPrivacy'");
    expect(site).toBeGreaterThan(-1);
    // Within the same handler, dismissal must come after the navigation call.
    const window = src.slice(Math.max(0, site - 300), site + 300);
    const navIdx = window.indexOf('navigateCrossTab');
    const dismissIdx = window.indexOf('onDismissOffCard()');
    expect(navIdx).toBeGreaterThan(-1);
    expect(dismissIdx).toBeGreaterThan(navIdx);
  });
});
