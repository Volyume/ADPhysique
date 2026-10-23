/**
 * Five tabs, and the Coach stack carries what the Progress tab carried (D231,
 * app layout rework, batch 4).
 *
 * What this pins, written to fail against the six-tab navigator:
 *   1. The bar has five tabs in this order: Today, Train, Nutrition, Coach,
 *      Community. There is no Progress tab, no Progress stack and no Analytics
 *      screen, and no code anywhere still names the ProgressTab route.
 *   2. Every screen that was only in the Progress stack is registered in the
 *      Coach stack (ProfileStack) with the options it had there (React
 *      Navigation drops a navigate() to a route the caller's own stack does not
 *      register, in silence: the dead-tap class navigationTargets.guard.test.js
 *      and capabilityRoutesReachable.test.js exist for), plus CommunityPrivacy,
 *      which Settings' Community row now opens in place; the Athlete profile is
 *      not registered.
 *   3. Every plain navigate/push/replace a Coach-stack screen makes lands on a
 *      route that stack registers, swept from the screens' own sources (the
 *      vacuity guards at the end fail loudly if the parse stops matching), with
 *      three recorded exceptions that were already unregistered before this
 *      batch.
 *   4. Every cross-tab jump in the app, and every notification route, names a
 *      route its destination tab's stack registers; every former Progress route
 *      (notifications, the `progress` link, the Today strip's `focusWeightTrend`
 *      arrival, the plateau note's Exercise Detail) goes to the Coach tab.
 *   5. CommunityPrivacy opened from Settings reaches the screens it opens
 *      (Community rules, Edit profile, ...) through the Community tab instead of
 *      a silent no-op, while staying a plain push inside the Community stack.
 *
 * Source-level (RootNavigator pulls the whole app), reading the stacks the way
 * capabilityRoutesReachable.test.js does.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..');
const NAV_FILE = path.join(SRC, 'navigation', 'RootNavigator.js');
const source = fs.readFileSync(NAV_FILE, 'utf8');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');

function stackBody(name) {
  const start = source.indexOf(`function ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const open = source.indexOf('{', source.indexOf(')', start) + 1);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') { depth--; if (depth === 0) return source.slice(open, i + 1); }
  }
  throw new Error(`unbalanced ${name}`);
}

/** name -> the full `<Stack.Screen ... />` element text, whitespace collapsed. */
function registrations(body) {
  const out = {};
  const re = /<Stack\.Screen\s+name="(\w+)"[^>]*?\/>/g;
  let m;
  while ((m = re.exec(body)) !== null) out[m[1]] = m[0].replace(/\s+/g, ' ');
  return out;
}

const coach = registrations(stackBody('ProfileStack'));
const community = registrations(stackBody('CommunityStack'));

// Tab route name -> its stack function name, from the Tab.Screen lines.
const tabToStack = {};
for (const m of source.matchAll(/<Tab\.Screen name="(\w+)" component=\{(\w+)\}/g)) tabToStack[m[1]] = m[2];
const stackRegs = (tab) => registrations(stackBody(tabToStack[tab]));

// The lazy screen declarations, to resolve a registered component to its file.
function componentFiles() {
  const map = {};
  const declaration = /(?:const|let)\s+(\w+)\s*=\s*([^\n]*require\(\s*'(\.\.\/screens\/[\w/]+)'[^\n]*)/g;
  let m;
  while ((m = declaration.exec(source)) !== null) map[m[1]] = m[3];
  return map;
}

describe('1. Five tabs, no Progress tab', () => {
  test('the tab bar is Today, Train, Nutrition, Coach, Community, in that order', () => {
    const tabs = [...source.matchAll(/<Tab\.Screen name="(\w+)"[^\n]*?title: '([^']+)'/g)].map((m) => [m[1], m[2]]);
    expect(tabs).toEqual([
      ['HomeTab', 'Today'],
      ['PlansTab', 'Train'],
      ['DiaryTab', 'Nutrition'],
      ['ProfileTab', 'Coach'],
      ['CommunityTab', 'Community'],
    ]);
  });

  test('the Progress tab, its stack and its landing screen are gone', () => {
    // Comments may name the retired tab in a note; code may not.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toContain('ProgressTab');
    expect(code).not.toMatch(/function ProgressStack\b/);
    expect(code).not.toMatch(/AnalyticsScreen|name="Analytics"/);
    expect(code).not.toMatch(/stats-chart/);
    expect(fs.existsSync(path.join(SRC, 'screens', 'AnalyticsScreen.js'))).toBe(false);
    // Five stacks, five tab icons, five tabPress listeners.
    expect(Object.keys(tabToStack)).toHaveLength(5);
    const icons = source.match(/const icons = \{([\s\S]*?)\};/)[1];
    expect([...icons.matchAll(/^\s*(\w+):/gm)].map((m) => m[1])).toEqual(['HomeTab', 'PlansTab', 'DiaryTab', 'ProfileTab', 'CommunityTab']);
  });

  test('no code names the ProgressTab route any more (comments aside)', () => {
    const offenders = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== '__tests__' && e.name !== 'node_modules') walk(p); continue; }
        if (!e.name.endsWith('.js')) continue;
        const code = fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
        if (/ProgressTab/.test(code)) offenders.push(path.relative(SRC, p));
      }
    };
    walk(SRC);
    expect(offenders).toEqual([]);
  });

  test('the Athlete profile is not registered anywhere', () => {
    expect(source).not.toContain('AthleteProfile');
    expect(coach.AthleteProfile).toBeUndefined();
  });
});

describe('2. The Coach stack registers what the Progress stack had, with the same options', () => {
  // The options each screen had in the retired Progress stack (and, for the
  // screens that were already Coach's, the options they keep).
  const FORMER_PROGRESS = {
    WorkoutHistory: '<Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} options={{ headerShown: false }} />',
    WorkoutSummary: '<Stack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} options={{ headerShown: false, ...heroZoomTransition }} />',
    VolumeHeatmap: '<Stack.Screen name="VolumeHeatmap" component={VolumeHeatmapScreen} options={{ headerShown: false }} />',
    BodyMetrics: '<Stack.Screen name="BodyMetrics" component={BodyMetricsScreen} options={{ headerShown: false }} />',
    ProgressPhotos: '<Stack.Screen name="ProgressPhotos" component={ProgressPhotosScreen} options={{ headerShown: false }} />',
    LiftProgress: '<Stack.Screen name="LiftProgress" component={LiftProgressScreen} options={{ headerShown: false }} />',
    Consistency: '<Stack.Screen name="Consistency" component={ConsistencyScreen} options={{ headerShown: false }} />',
    Recovery: '<Stack.Screen name="Recovery" component={RecoveryScreen} options={{ headerShown: false }} />',
    CoachReview: '<Stack.Screen name="CoachReview" component={CoachReviewScreen} options={{ headerShown: false }} />',
    ExerciseDetail: '<Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={heroZoomOptions({ headerShown: false })} />',
    YearOfLifts: '<Stack.Screen name="YearOfLifts" component={YearOfLiftsScreen} options={{ headerShown: false }} />',
    RecapStory: '<Stack.Screen name="RecapStory" component={YearOfLiftsScreen} options={{ headerShown: false }} />',
    ShareCard: '<Stack.Screen name="ShareCard" component={ShareCardScreen} options={{ headerShown: false }} />',
    ClipCamera: '<Stack.Screen name="ClipCamera" component={ClipCameraScreen} options={{ headerShown: false, gestureEnabled: false }} />',
    HowYouTrain: '<Stack.Screen name="HowYouTrain" component={HowYouTrainScreen} options={{ headerShown: false }} />',
    HowYouTrainAdd: '<Stack.Screen name="HowYouTrainAdd" component={HowYouTrainAddScreen} options={{ headerShown: false }} />',
    TrainingConsiderations: '<Stack.Screen name="TrainingConsiderations" component={TrainingConsiderationsScreen} options={{ headerShown: false }} />',
    AvoidedMovements: '<Stack.Screen name="AvoidedMovements" component={AvoidedMovementsScreen} options={{ headerShown: false }} />',
    SettingsWorkout: '<Stack.Screen name="SettingsWorkout" component={SettingsWorkoutScreen} options={{ headerShown: false }} />',
  };

  test.each(Object.keys(FORMER_PROGRESS))('%s is registered in the Coach stack with the options it had on Progress', (name) => {
    expect(coach[name]).toBe(FORMER_PROGRESS[name]);
  });

  test('every Coach-stack screen the Coach tab\'s own rows open is registered', () => {
    // YouScreen's rows, the Settings gear and the This week card.
    for (const name of [
      'You', 'Settings', 'CoachingSetup', 'WeeklyCheckIn', 'CoachOutput', 'WeeklyStory', 'ProGoalSetup',
      'NutritionTargets', 'GoalLockConsent', 'WellbeingCheck', 'LiftProgress', 'BodyMetrics', 'ProgressPhotos',
      'Recovery', 'Consistency', 'RecapStory', 'YearOfLifts',
    ]) {
      expect(coach[name]).toBeDefined();
    }
  });

  test('CommunityPrivacy is registered in the Coach stack with the options it has in the Community stack', () => {
    expect(community.CommunityPrivacy).toBeDefined();
    expect(coach.CommunityPrivacy).toBe(community.CommunityPrivacy);
  });

  test('the Coach screen is the stack\'s first screen, and no tab is the Progress one', () => {
    const body = stackBody('ProfileStack');
    expect(body.indexOf('name="You"')).toBeGreaterThan(-1);
    expect(body.indexOf('name="You"')).toBeLessThan(body.indexOf('name="Settings"'));
  });
});

describe('3. Every plain navigate from a Coach-stack screen lands on a registered route', () => {
  const files = componentFiles();
  const bodyOfCoach = stackBody('ProfileStack');
  const regRe = /<Stack\.Screen\s+name="(\w+)"\s+component=\{(\w+)\}/g;
  const registered = {};
  for (let m = regRe.exec(bodyOfCoach); m; m = regRe.exec(bodyOfCoach)) registered[m[1]] = m[2];

  // Already unregistered in the Coach stack before this batch, none reachable
  // from a moved row: WorkoutSummary's compose button (a read-only re-open is not
  // a posting moment; Home's stack registers it), and the quick-start setup
  // wizard's hand-off screens. Tab names bubble up to the tab navigator.
  const RECORDED = {
    WorkoutSummary: ['CommunityCompose'],
    CoachingSetup: ['ProSetupComplete', 'CommunityRules'],
  };

  const gaps = [];
  let resolved = 0;
  for (const [route, component] of Object.entries(registered)) {
    const rel = files[component];
    if (!rel) continue;
    const file = path.join(SRC, 'navigation', `${rel}.js`);
    if (!fs.existsSync(file)) continue;
    resolved += 1;
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/navigation\.(?:navigate|push|replace)\(\s*['"](\w+)['"]/g)) {
      const target = m[1];
      if (registered[target] || /Tab$/.test(target)) continue;
      if ((RECORDED[route] || []).includes(target)) continue;
      gaps.push(`${route} -> ${target}`);
    }
  }

  test('no screen in the Coach stack opens a route that stack does not register', () => {
    expect([...new Set(gaps)]).toEqual([]);
  });

  test('vacuity guard: the sweep found the stack, its screens and their files', () => {
    expect(Object.keys(registered).length).toBeGreaterThan(40);
    expect(resolved).toBeGreaterThan(40);
    for (const name of ['WorkoutSummary', 'Recovery', 'LiftProgress', 'ExerciseDetail', 'YearOfLifts']) {
      expect(registered[name]).toBeDefined();
    }
  });
});

describe('4. Every jump into a tab names a route that tab registers', () => {
  // navigateCrossTab(navigation, 'XTab', 'Screen') anywhere in screens/components.
  const sites = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== '__tests__') walk(p); continue; }
      if (!e.name.endsWith('.js')) continue;
      const code = fs.readFileSync(p, 'utf8');
      for (const m of code.matchAll(/navigateCrossTab\(\s*\w+\s*,\s*'(\w+Tab)'\s*,\s*'(\w+)'/g)) {
        sites.push({ file: path.relative(SRC, p), tab: m[1], screen: m[2] });
      }
    }
  };
  walk(path.join(SRC, 'screens'));
  walk(path.join(SRC, 'components'));
  walk(path.join(SRC, 'hooks'));
  // The dormant billing surface (unregistered while FULL_ACCESS_FOR_ALL is on,
  // docs/rules/billing.md) names SubscriptionPolicy, which is unregistered too.
  const DORMANT = ['screens/ProUpgradeScreen.js'];

  test('vacuity guard: the scan found the jumps', () => {
    expect(sites.length).toBeGreaterThan(40);
    expect(sites.some((s) => s.tab === 'ProfileTab')).toBe(true);
  });

  test('every cross-tab jump targets a tab that exists and a screen that tab\'s stack registers', () => {
    const bad = [];
    for (const { file, tab, screen } of sites) {
      if (DORMANT.includes(file)) continue;
      if (!tabToStack[tab]) { bad.push(`${file}: no tab ${tab}`); continue; }
      if (!stackRegs(tab)[screen]) bad.push(`${file}: ${tab} does not register ${screen}`);
    }
    expect(bad).toEqual([]);
  });

  test('the former Progress jumps now go to the Coach tab: Exercise Detail, Lift Progress, Progress photos, Recap story, the trend arrival', () => {
    const at = (file) => read(file);
    expect(at('screens/WorkoutHistoryScreen.js')).toContain("navigateCrossTab(navigation, 'ProfileTab', 'ExerciseDetail'");
    const summary = at('screens/WorkoutSummaryScreen.js');
    for (const screen of ['ExerciseDetail', 'LiftProgress', 'ProgressPhotos', 'RecapStory']) {
      expect(summary).toContain(`navigateCrossTab(navigation, 'ProfileTab', '${screen}'`);
    }
    // The Today strip's logged-weight door scrolls the Coach screen to the Body row.
    expect(at('screens/HomeScreen.js')).toContain("onOpenTrend={() => navigateCrossTab(navigation, 'ProfileTab', 'You', { focusWeightTrend: true })}");
    // The plateau note opens Exercise Detail in the Coach stack.
    expect(at('screens/HomeScreen.js')).toMatch(/navigateCrossTab\(navigation, 'ProfileTab', 'ExerciseDetail', \{ exerciseId: plateauBanner\.exerciseId \}\)/);
    expect(coach.ExerciseDetail).toBeDefined();
    expect(coach.You).toBeDefined();
  });

  test('the block summary opens the recap in place (RecapStory is in its own stack now)', () => {
    expect(read('screens/BlockReflectionScreen.js')).toMatch(/navigation\.navigate\('RecapStory', \{ variant: 'block'/);
  });
});

describe('4b. Notifications and links that used to open Progress open Coach', () => {
  const { routeForNotificationType } = require('../../lib/notifications/notificationRoute');

  test.each([
    ['year_of_lifts_unlock', {}, { tab: 'ProfileTab', screen: 'YearOfLifts' }],
    ['monthly_recap', {}, { tab: 'ProfileTab', screen: 'You' }],
    ['checkin_missed', { slot: 'followup' }, { tab: 'ProfileTab', screen: 'You' }],
  ])('%s opens %j in the Coach tab, on a screen its stack registers', (type, data, expected) => {
    const target = routeForNotificationType(type, data);
    expect(target).toEqual(expected);
    expect(stackRegs(target.tab)[target.screen]).toBeDefined();
  });

  test('every notification route the app can resolve lands on a registered screen of a tab that exists', () => {
    const types = [...read('lib/notifications/notificationRoute.js').matchAll(/case '([a-z0-9_]+)':/g)].map((m) => m[1]);
    expect(types.length).toBeGreaterThan(20);
    for (const type of types) {
      const target = routeForNotificationType(type, { slot: 'followup', weekStart: 1, group_id: 'g', post_id: 'p', conversation_id: 'c', date: '2026-10-22' });
      if (!target) continue;
      expect({ type, tabExists: !!tabToStack[target.tab] }).toEqual({ type, tabExists: true });
      expect({ type, registered: !!stackRegs(target.tab)[target.screen] }).toEqual({ type, registered: true });
    }
  });

  test('the progress link opens the Coach tab root', () => {
    const linking = source.slice(source.indexOf('const linking = {'));
    const profile = linking.slice(linking.indexOf('ProfileTab: {'));
    expect(profile).toMatch(/You: 'progress'/);
    expect(linking).not.toMatch(/Analytics: 'progress'/);
  });
});

describe('5. Community privacy and sharing, opened from Settings in the Coach stack', () => {
  const { navigateInStackOrCrossTab } = require('../navigateCrossTab');

  test('Settings opens it in place with a plain navigate', () => {
    expect(read('screens/SettingsScreen.js')).toContain("navigation.navigate('CommunityPrivacy')");
  });

  test('the screen sends every outbound tap through the in-stack-or-cross-tab helper, never a bare navigate', () => {
    const src = read('screens/CommunityPrivacyScreen.js');
    expect(src).not.toMatch(/navigation\.navigate\(/);
    expect(src).toContain("navigateInStackOrCrossTab(navigation, 'CommunityTab', screen, params)");
    // Every destination it names is a Community-stack screen.
    const names = new Set([...src.matchAll(/goCommunity\(navigation, '(\w+)'/g)].map((m) => m[1]));
    expect(names.size).toBeGreaterThan(5);
    for (const name of names) expect({ name, inCommunityStack: !!community[name] || name === 'Community' }).toEqual({ name, inCommunityStack: true });
  });

  test('in the Community stack the target opens in place; in the Coach stack it goes through the Community tab', () => {
    const parent = { navigate: jest.fn(), getState: jest.fn(() => ({ routes: [] })) };
    const make = (routeNames) => ({ navigate: jest.fn(), getState: () => ({ routeNames }), getParent: () => parent });
    // The Community stack registers CommunityRules: a plain push, Back returns to Privacy.
    const inCommunity = make(['Community', 'CommunityPrivacy', 'CommunityRules']);
    navigateInStackOrCrossTab(inCommunity, 'CommunityTab', 'CommunityRules', { mustAccept: true });
    expect(inCommunity.navigate).toHaveBeenCalledWith('CommunityRules', { mustAccept: true });
    expect(parent.navigate).not.toHaveBeenCalled();
    // The Coach stack does not: through the tab (a bare navigate would be dropped).
    const inCoach = make(['You', 'Settings', 'CommunityPrivacy']);
    navigateInStackOrCrossTab(inCoach, 'CommunityTab', 'CommunityRules', { mustAccept: true });
    expect(inCoach.navigate).not.toHaveBeenCalled();
    expect(parent.navigate).toHaveBeenCalledWith('CommunityTab', { screen: 'CommunityRules', params: { mustAccept: true }, initial: false });
  });

  test('a navigation without readable state is treated as in-stack, and no params means no second argument', () => {
    const nav = { navigate: jest.fn() };
    navigateInStackOrCrossTab(nav, 'CommunityTab', 'CommunityFollowers');
    expect(nav.navigate).toHaveBeenCalledWith('CommunityFollowers');
    expect(nav.navigate.mock.calls[0]).toHaveLength(1);
  });

  test('every screen CommunityPrivacy can open is registered in the Community stack (so the Coach copy has somewhere to land)', () => {
    for (const name of ['CommunityRules', 'CommunityTrainingProfile', 'CommunityEditProfile', 'CommunityFollowers', 'CommunityConnections', 'CommunityModeration']) {
      expect(community[name]).toBeDefined();
    }
  });
});
