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
// Campaign 3 (review B finding 11): PerDayTargets and SettingsWorkout
// joined the canary list after the campaign's own shortcuts recreated the
// bug class three times before review caught them.
const PROFILE_ONLY_ROUTES = ['CoachOutput', 'NutritionTargets', 'SettingsPrivacy', 'WeeklyCheckIn', 'PerDayTargets', 'SettingsWorkout'];

// Screens that live OUTSIDE ProfileStack but carry cross-tab links to it.
const NON_PROFILE_SCREENS = [
  'src/screens/HomeScreen.js',
  'src/screens/DiaryScreen.js',
  'src/screens/MealPlanScreen.js',
  'src/screens/AnalyticsScreen.js',
  'src/screens/PlansScreen.js',
  'src/screens/BodyMetricsScreen.js',
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

  // D95 (AUDIT-ROUTES §6 rows 1-4, 6): five live, visible controls were inert
  // for exactly this reason. BlockReflection was SOURCELESS because of row 1 --
  // its only navigator was a dropped tap -- while DECISIONS-2026-07-09.md:2344
  // requires the surface to stay one tap away, so the fix is the navigation,
  // never the registration.
  test('the block-reflection cluster and the paywall policy link use the cross-tab form', () => {
    // Row 1: MesocycleBuilder (PlansStack) -> BlockReflection (ProfileStack).
    const meso = read('src/screens/MesocycleBuilderScreen.js');
    expect(meso).toMatch(/navigateCrossTab\(navigation,\s*'ProfileTab',\s*'BlockReflection'/);
    expect(meso).not.toMatch(/navigation\.navigate\(\s*['"]BlockReflection['"]/);

    // Rows 2-4: BlockReflection (ProfileStack) -> RecapStory (ProgressStack)
    // and the Train tab (PlansStack), twice.
    //
    // Re-anchored under FB-18 (D96): both of BlockReflection's outbound
    // block CTAs used to target MesocycleBuilder, which is READ-ONLY -- its
    // only button is "View block summary" and there is no create action
    // anywhere in that file -- so a button named "Start a new block" landed
    // on a screen from which no block can be started. They now target the
    // Train tab's block decision card, the same destination the Home block
    // sheet's "Choose your next block" already uses. The pinned RULE -- both
    // hops use the cross-tab form, never a bare in-stack navigate that
    // resolves against ProfileStack and dies -- is unchanged.
    const reflection = read('src/screens/BlockReflectionScreen.js');
    expect(reflection).toMatch(/navigateCrossTab\(navigation,\s*'ProgressTab',\s*'RecapStory'/);
    expect(reflection).not.toMatch(/navigation\.navigate\(\s*['"]RecapStory['"]/);
    expect(reflection.match(/navigateCrossTab\(navigation,\s*'PlansTab',\s*'Plans'\)/g) ?? [])
      .toHaveLength(2);
    expect(reflection).not.toMatch(/navigation\.navigate\(\s*['"]MesocycleBuilder['"]/);
    expect(reflection).not.toMatch(/navigateCrossTab\(navigation,\s*'PlansTab',\s*'MesocycleBuilder'\)/);

    // Row 6: ProUpgrade is registered in all five tab stacks, SubscriptionPolicy
    // in ProfileStack only, so the policy link died in four of five entries.
    const paywall = read('src/screens/ProUpgradeScreen.js');
    expect(paywall).toMatch(/navigateCrossTab\(navigation,\s*'ProfileTab',\s*'SubscriptionPolicy'\)/);
    expect(paywall).not.toMatch(/navigation\.navigate\(\s*['"]SubscriptionPolicy['"]/);
  });

  // Review A F1/F2 (AUDIT-ROUTES §6 rows 7-9): WorkoutSummary is registered
  // in Home AND Progress, but ProgressPhotos/RecapStory live in ProgressStack
  // only - so the post-workout photo prompt and both "Watch your block story"
  // controls were inert on the Today-tab path, the app's main workout flow.
  test('the post-workout photo prompt and block-story links use the cross-tab form', () => {
    const summary = read('src/screens/WorkoutSummaryScreen.js');
    expect(summary).toMatch(/navigateCrossTab\(navigation,\s*'ProgressTab',\s*'ProgressPhotos'\)/);
    expect(summary.match(/navigateCrossTab\(navigation,\s*'ProgressTab',\s*'RecapStory'/g) ?? [])
      .toHaveLength(2);
    expect(summary).not.toMatch(/navigation\.navigate\(\s*['"](ProgressPhotos|RecapStory)['"]/);
  });

  // Review A F3 (row 11): the Pro-onboarding hand-off screen's "Reminders
  // off" tile targets NotificationSettings, which must stay registered in
  // ProOnboardingStack (the NutritionEducation precedent) or the tap is
  // silently dropped - onboarding stacks cannot cross-tab.
  test('ProOnboardingStack registers NotificationSettings for the hand-off tile', () => {
    const nav = read('src/navigation/RootNavigator.js');
    const start = nav.indexOf('function ProOnboardingStack');
    const end = nav.indexOf('</Stack.Navigator>', start);
    expect(start).toBeGreaterThan(-1);
    const proOnboardingStack = nav.slice(start, end);
    expect(proOnboardingStack).toMatch(/name="NotificationSettings"/);
  });

  test("OB-8: the check-in's 'Log my weight first' CTA deep-links to the Today tab weight logger", () => {
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

  test('ProUpgrade is a dormant billing surface: no tab stack registers it (fully-free product)', () => {
    // Founder decision: Volyume is fully free, no Free/Pro split, no trial,
    // no paywall. ProGate.js (withProGuard / withReadOnlyProGuard) is no
    // longer used anywhere in RootNavigator, so nothing navigates to
    // ProUpgrade any more, and the route itself is unregistered in every
    // stack -- it stays a dormant screen on disk
    // (src/screens/ProUpgradeScreen.js), re-registered only by a deliberate
    // future monetisation decision.
    const nav = read('src/navigation/RootNavigator.js');
    for (const stack of ['DiaryStack', 'HomeStack', 'PlansStack', 'ProgressStack', 'ProfileStack']) {
      const start = nav.indexOf(`function ${stack}(`);
      expect(start).toBeGreaterThan(-1);
      const end = nav.indexOf('\nfunction ', start + 1);
      const body = nav.slice(start, end === -1 ? nav.length : end);
      expect(body).not.toMatch(/name="ProUpgrade"/);
    }
    expect(nav).not.toMatch(/withProGuard\(|withReadOnlyProGuard\(/);
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
