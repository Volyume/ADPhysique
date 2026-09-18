/**
 * scripts/paper-render/paper-render.test.js
 *
 * The paper-render harness. NOT picked up by `npm test` -- package.json's
 * jest.testMatch only matches `**\/__tests__/**` and `**\/tests/**`, and
 * this file lives directly under scripts/paper-render/ (proved by `npx
 * jest --listTests | grep -c paper-render` printing 0, see README.md).
 * Run explicitly via run.sh, or:
 *   npx jest --rootDir /home/user/ADPhysique --testMatch '**\/scripts/paper-render/*.test.js' scripts/paper-render
 *
 * MOUNTING: this is screen-mount.test.js's own mock preamble
 * (mockPreamble.js, copied with paths adjusted for this folder), with the
 * data-layer change the brief asks for -- expo-sqlite is a real node:sqlite
 * shim (expoSqliteShim.js) instead of the in-memory stub, so src/lib/database.js
 * runs its own schema + migrations and every screen reads back real rows,
 * seeded through the app's own write functions (seedPersona.js) -- plus a
 * handful of mount-fidelity fixes mockPreamble.js's own header calls out
 * (useFocusEffect actually firing chief among them; screen-mount's crash
 * sweep never needed it to).
 *
 * Three test() blocks:
 *   1. seeds the persona, mounts all 16 screens (dark), converts each to
 *      HTML (treeToHtml.js) and writes it to disk, screen 02 (ActiveWorkout)
 *      driven by store state per screen-mount's own lifecycle pattern, four
 *      screens (01/04/06/07) additionally rendered with the real
 *      VolyumeTabBar docked beneath them (13 gets one too, standalone, since
 *      it is itself a tab-bar-hosted screen).
 *   1b. the day-zero variants (01/04/06/07, suffix '-day0'): a second,
 *      brand-new user (seedDayZeroPersona()) with no plan, session, food
 *      entry or weight entry at all, same dark theme, same live database --
 *      no resetModules needed since it runs before test 2's reload.
 *   2. the light-theme variants (01/04/06 + their tab bar): these screens'
 *      StyleSheet.create calls read the theme.js legacy singleton at
 *      MODULE-LOAD time, so a correct light render needs jest.resetModules()
 *      + a fresh applyAccessibility({theme:'light'}) BEFORE the screen
 *      module is re-required -- setting the store's accessibility.theme
 *      preference alone (what CP-10-migrated call sites read live via
 *      useTheme()) is not sufficient for the many call sites still on the
 *      static import. The real SQLite file on disk makes the reopen after
 *      resetModules land on the same seeded data with no extra plumbing.
 *
 * Per-screen failures are caught and recorded into report-data.json (which
 * run.sh turns into report.md) rather than failing the whole file -- "if a
 * screen will not mount, record why and move on" is the brief's own rule.
 */
'use strict';

require('./mockPreamble');

const fs = require('node:fs');
const path = require('node:path');

jest.setTimeout(120000);

// ── Paths ──────────────────────────────────────────────────────────────
const SCRATCH = process.env.PAPER_RENDER_SCRATCH
  || '/tmp/claude-0/-home-user-ADPhysique/d71ddd7a-c7b0-5d8f-8ef8-fbac54ce6084/scratchpad';
const WORK_DIR = path.join(SCRATCH, 'paper-render-work');
const HTML_DIR = path.join(WORK_DIR, 'html');
const REPORT_JSON = path.join(WORK_DIR, 'report-data.json');
process.env.PAPER_RENDER_SQLITE_DIR = path.join(WORK_DIR, 'db');

fs.mkdirSync(HTML_DIR, { recursive: true });

const { treeToHtml } = require('./treeToHtml');
const { seedPersona, seedDayZeroPersona, NOW_MS, DAY_MS } = require('./seedPersona');

// ── Mutable "current module set", reloaded once for the light-theme pass.
const ENV = {
  React: require('react'),
  TestRenderer: require('react-test-renderer'),
  useAppStore: require('../../src/store/useAppStore').default,
};

const REPORT = {
  dataLayerNote: null,
  bypassedWrites: [],
  seedNotes: [],
  screens: [],
  converterStats: { unknownTypes: {}, converterFallbacks: {} },
  nowMs: NOW_MS,
};

function mergeConverterStats(stats) {
  for (const [k, v] of Object.entries(stats.unknownTypes || {})) {
    REPORT.converterStats.unknownTypes[k] = (REPORT.converterStats.unknownTypes[k] || 0) + v;
  }
  for (const [k, v] of Object.entries(stats.converterFallbacks || {})) {
    REPORT.converterStats.converterFallbacks[k] = (REPORT.converterStats.converterFallbacks[k] || 0) + v;
  }
}

// ── react-test-renderer tree -> toJSON()-shaped plain object, without
// calling the library's own toJSON(): AnalyticsScreen passes a real
// `<RefreshControl>` element as its ScrollView's `refreshControl` prop, and
// react-test-renderer's toJSON() throws walking that unrendered element
// (the exact issue src/screens/__tests__/*.guard tests in this repo work
// around with the same tree.root/findAll traversal used here, see e.g.
// the "toJSON() chokes on the circular refreshControl element" comment in
// screen-mount.test.js). This walk never touches non-visual props (no
// onPress/onRefresh/refreshControl), so it cannot hit that cycle.
const SAFE_PROPS = new Set([
  'style', 'value', 'placeholder', 'placeholderTextColor', 'testID', 'accessibilityLabel',
  'accessibilityRole', 'numberOfLines', 'trackColor', 'thumbColor', 'source', 'name', 'size', 'color',
  'visible', 'tintColor',
  'd', 'fill', 'stroke', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin', 'strokeDasharray',
  'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'viewBox',
  'points', 'offset', 'stopColor', 'stopOpacity', 'id', 'opacity', 'transform', 'fillOpacity',
  'fillRule', 'clipRule', 'textAnchor',
]);
function manualWalk(instance) {
  if (instance === null || instance === undefined) return null;
  if (typeof instance === 'string' || typeof instance === 'number') return instance;
  if (typeof instance.type !== 'string') {
    // Composite: transparent, flatten straight through to its own rendered
    // children (mirrors toJSON()'s own collapsing of composites).
    const kids = (instance.children || []).map(manualWalk).filter((k) => k !== null);
    if (kids.length === 1) return kids[0];
    if (kids.length === 0) return null;
    return kids;
  }
  const props = {};
  for (const [k, v] of Object.entries(instance.props || {})) {
    if (SAFE_PROPS.has(k)) props[k] = v;
  }
  const rawChildren = instance.children || [];
  const children = [];
  for (const c of rawChildren) {
    if (typeof c === 'string' || typeof c === 'number') { children.push(c); continue; }
    const walked = manualWalk(c);
    if (walked === null) continue;
    if (Array.isArray(walked)) children.push(...walked); else children.push(walked);
  }
  return { type: instance.type, props, children: children.length ? children : null };
}
function safeTreeJSON(tree) {
  try {
    return { json: tree.toJSON(), fallback: false };
  } catch (e) {
    return { json: manualWalk(tree.root), fallback: true, error: e.message };
  }
}

// ── mountScreen: screen-mount.test.js's own helper, verbatim behaviour,
// paths adjusted, flush loop lengthened (real SQLite reads chain through
// more promise turns than the mocked DB screen-mount was written against).
function makeNav() {
  const nav = {
    navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), push: jest.fn(), pop: jest.fn(),
    popToTop: jest.fn(), reset: jest.fn(), setOptions: jest.fn(), setParams: jest.fn(), dispatch: jest.fn(),
    addListener: jest.fn(() => () => {}), removeListener: jest.fn(), canGoBack: jest.fn(() => true),
    isFocused: jest.fn(() => true), getId: jest.fn(() => 'test-route'),
    getState: jest.fn(() => ({ routes: [], index: 0 })),
  };
  nav.getParent = jest.fn(() => nav);
  return nav;
}

async function mountScreen(Screen, props = {}) {
  const errors = [];
  const origErr = console.error;
  console.error = (msg, ..._rest) => {
    const text = typeof msg === 'string' ? msg : String(msg);
    if (/wrap.*act|environment has been torn down|Cannot log after tests|Each child in a list|Function components cannot be given refs|forwardRef|inside StrictMode|react-test-renderer is deprecated/i.test(text)) return;
    errors.push(text);
  };
  let tree = null;
  try {
    await ENV.TestRenderer.act(async () => {
      tree = ENV.TestRenderer.create(
        ENV.React.createElement(props.__rootType || Wrap, {},
          ENV.React.createElement(props.Screen, {
            navigation: makeNav(), route: { params: props.params || {}, name: 'Test' },
          }),
          props.extra || null,
        ),
      );
    });
    await ENV.TestRenderer.act(async () => {
      for (let round = 0; round < 6; round += 1) {
        for (let i = 0; i < 25; i += 1) await Promise.resolve();
        await new Promise((r) => setImmediate(r));
      }
    });
  } finally {
    console.error = origErr;
  }
  return { tree, errors };
}
function Wrap(props) { return ENV.React.createElement(ENV.React.Fragment, null, props.children); }

// ── Tab bar fixture ───────────────────────────────────────────────────────
const TAB_DEFS = [
  { key: 'HomeTab-1', name: 'HomeTab', title: 'Today', icon: 'today', iconOutline: 'today-outline' },
  { key: 'PlansTab-1', name: 'PlansTab', title: 'Train', icon: 'barbell', iconOutline: 'barbell-outline' },
  { key: 'DiaryTab-1', name: 'DiaryTab', title: 'Nutrition', icon: 'nutrition', iconOutline: 'nutrition-outline' },
  { key: 'ProgressTab-1', name: 'ProgressTab', title: 'Progress', icon: 'stats-chart', iconOutline: 'stats-chart-outline' },
  { key: 'ProfileTab-1', name: 'ProfileTab', title: 'Coach', icon: 'pulse', iconOutline: 'pulse-outline' },
];
function buildTabBarElement(focusedIndex, nestedRouteName) {
  const Ionicons = require('@expo/vector-icons/Ionicons');
  const VolyumeTabBar = require('../../src/components/VolyumeTabBar').default;
  const routes = TAB_DEFS.map((d, i) => (
    i === focusedIndex && nestedRouteName
      ? { key: d.key, name: d.name, state: { index: 0, routes: [{ name: nestedRouteName }] } }
      : { key: d.key, name: d.name }
  ));
  const descriptors = Object.fromEntries(TAB_DEFS.map((d) => [d.key, {
    options: {
      title: d.title,
      tabBarIcon: ({ focused, color }) => ENV.React.createElement(Ionicons, {
        name: focused ? d.icon : d.iconOutline, size: 22, color,
      }),
    },
  }]));
  const navigation = { emit: () => ({ defaultPrevented: false }), navigate: () => {} };
  return ENV.React.createElement(VolyumeTabBar, { state: { index: focusedIndex, routes }, descriptors, navigation });
}

// ── Persona store state ───────────────────────────────────────────────────
function personaStoreState(seed, overrides = {}) {
  return {
    user: { id: seed.userId, email: 'alex@example.com', isLocal: false },
    session: { user: { id: seed.userId } },
    tier: 'pro',
    firstRunComplete: true,
    // Article 9 health-data consent, already given (mirrors gdprConsented:
    // true on the seeded DB rows). Community's own transport layer fails
    // CLOSED on this exact store field (assertCommunityGates,
    // src/lib/community/transport.js) -- unset it reads as unresolved and
    // CommunityHubScreen renders "Could not load Community" for every
    // request, seeded data or not. Not a weakening of the RootNavigator
    // gate itself (untouched, and this harness never mounts it): this is
    // the same "already onboarded" characterisation firstRunComplete above
    // already gives the persona, just for the field Community reads.
    healthConsent: true,
    units: 'kg',
    bodyWeightUnits: 'kg',
    userProfile: {
      firstName: 'Alex', sex: 'male', goal: 'lean_gain', trainingFocus: 'hypertrophy',
      units: 'kg', coachAutonomy: 'collaborative', coachTone: 'automatic',
      // CoachOutputScreen reads userProfile.phaseStartedAt (store field, set
      // by ProOnboardingScreen at real onboarding time) STRAIGHT from the
      // store, not from a DB row, to compute weeksInPhase for the real
      // runWeeklyCoach() engine call: `weeksInPhase >= 2` is one half of the
      // engine's own `hasEnoughData` gate (src/lib/weeklyCoach.js). Left
      // unset, weeksInPhase defaults to 1 and the engine correctly (this is
      // the real ED-safety baseline-building gate, working exactly as
      // designed) reports "Building your baseline" for every week
      // regardless of how much workout/weight history is seeded underneath
      // it. 16 days ago clears the >=2 threshold with room to spare, and
      // narratively fits "started the block/phase, now in week 2 of 6".
      phaseStartedAt: NOW_MS - 16 * DAY_MS,
    },
    accessibility: {
      reduceMotion: true, higherContrast: false, largerText: false, colorBlindSafe: false,
      theme: 'dark', energyUnit: 'kcal',
    },
    accessibilityLoaded: true,
    activeWorkout: null,
    workoutExercises: [],
    currentExerciseIndex: 0,
    restTimerActive: false,
    hasUnseenCoachChange: false,
    ...overrides,
  };
}

function activeWorkoutOverride(seed) {
  const [ex0, ex1, ex2, ex3, ex4, ex5] = seed.upperExercises;
  const asExercise = (e) => ({ id: e.id, name: e.name, equipment: e.equipment || 'Barbell', primaryMuscle: e.primaryMuscle });
  const upcoming = (e, sets) => ({
    exercise: asExercise(e),
    routineExercise: { id: `re-${e.id}`, recommendedSets: 3, recommendedRepsMin: 6, recommendedRepsMax: 10 },
    sets,
  });
  return {
    activeWorkout: { id: 'paper-render-active', userId: seed.userId, routineId: seed.routines.upperA, startedAt: NOW_MS - 12 * 60 * 1000, isCompleted: false },
    workoutStartTime: NOW_MS - 12 * 60 * 1000,
    currentExerciseIndex: 1,
    restTimerActive: false,
    restTimerRemaining: 0,
    workoutExercises: [
      upcoming(ex0, [
        { id: 's-0-1', exerciseId: ex0.id, workoutId: 'paper-render-active', setNumber: 1, setType: 'straight', actualReps: 8, weight: 75 },
      ]),
      upcoming(ex1, [
        { id: 's-1-1', exerciseId: ex1.id, workoutId: 'paper-render-active', setNumber: 1, setType: 'warmup', actualReps: 10, weight: 40 },
        { id: 's-1-2', exerciseId: ex1.id, workoutId: 'paper-render-active', setNumber: 2, setType: 'straight', actualReps: 8, weight: 70 },
      ]),
      upcoming(ex2, []),
      upcoming(ex3, []),
      upcoming(ex4, []),
      upcoming(ex5, []),
    ],
  };
}

function workoutSummaryParams(seed) {
  const { bench, row, ohp, curl, squat } = seed.exercises;
  return {
    workoutId: 'paper-render-summary', routineId: seed.routines.upperB,
    durationMinutes: 58, exerciseCount: 5, setCount: 15, workingSetCount: 13, tonnage: 6120,
    exerciseNames: [bench.name, row.name, ohp.name, curl.name, squat.name],
    detectedPRs: [{ exerciseName: bench.name, kind: 'weight', value: 82.5 }],
    exerciseData: [
      { exerciseId: bench.id, name: bench.name, recommendedSets: 3, repsMin: 6, repsMax: 10, loggedSets: [
        { weight: 75, reps: 8, setType: 'straight' }, { weight: 80, reps: 8, setType: 'straight' }, { weight: 82.5, reps: 6, setType: 'straight' },
      ] },
      { exerciseId: row.id, name: row.name, recommendedSets: 3, repsMin: 6, repsMax: 10, loggedSets: [
        { weight: 70, reps: 8, setType: 'straight' }, { weight: 72.5, reps: 8, setType: 'straight' }, { weight: 72.5, reps: 8, setType: 'straight' },
      ] },
      { exerciseId: ohp.id, name: ohp.name, recommendedSets: 3, repsMin: 6, repsMax: 10, loggedSets: [
        { weight: 45, reps: 8, setType: 'straight' }, { weight: 47.5, reps: 8, setType: 'straight' }, { weight: 47.5, reps: 8, setType: 'straight' },
      ] },
      { exerciseId: curl.id, name: curl.name, recommendedSets: 3, repsMin: 8, repsMax: 12, loggedSets: [
        { weight: 20, reps: 10, setType: 'straight' }, { weight: 22.5, reps: 10, setType: 'straight' }, { weight: 22.5, reps: 10, setType: 'straight' },
      ] },
      { exerciseId: squat.id, name: squat.name, recommendedSets: 3, repsMin: 5, repsMax: 8, loggedSets: [
        { weight: 100, reps: 5, setType: 'straight' }, { weight: 105, reps: 5, setType: 'straight' }, { weight: 110, reps: 5, setType: 'straight' },
      ] },
    ],
  };
}

// ── Screen configs ─────────────────────────────────────────────────────
function screenConfigs(seed) {
  return [
    { n: '01', name: 'HomeScreen', tabBarIndex: 0 },
    { n: '02', name: 'ActiveWorkoutScreen', storeOverride: activeWorkoutOverride(seed) },
    { n: '03', name: 'WorkoutSummaryScreen', params: workoutSummaryParams(seed) },
    { n: '04', name: 'AnalyticsScreen', tabBarIndex: 3 },
    { n: '05', name: 'CoachOutputScreen', params: { weekStart: seed.lastWeekMonday } },
    { n: '06', name: 'DiaryScreen', tabBarIndex: 2 },
    { n: '07', name: 'PlansScreen', tabBarIndex: 1 },
    { n: '08', name: 'PlanDetailScreen', params: { planId: seed.programmeId, isLibrary: false } },
    { n: '09', name: 'ExerciseDetailScreen', params: { exerciseId: seed.exercises.bench.id } },
    { n: '10', name: 'LiftProgressScreen' },
    { n: '11', name: 'BodyMetricsScreen' },
    { n: '12', name: 'WeeklyCheckInScreen' },
    { n: '13', name: 'CommunityHubScreen', tabBarIndex: 0, tabBarNested: 'Community' },
    { n: '14', name: 'YouScreen' },
    { n: '15', name: 'SettingsScreen' },
    { n: '16', name: 'WorkoutHistoryScreen' },
  ];
}
const LIGHT_SCREENS = new Set(['01', '04', '06']);
const DAY_ZERO_SCREENS = new Set(['01', '04', '06', '07']);

// ── Per-screen processing ────────────────────────────────────────────────
// `variant` (optional) lets a caller other than the two main passes pick its
// own filename suffix and layer an extra store override on top of the
// config's own -- used by the day-zero pass below (suffix '-day0', a
// swapped-in fresh userId + userProfile, still the dark theme).
async function processScreen(config, seed, theme, variant = {}) {
  const suffix = variant.suffix !== undefined ? variant.suffix : (theme === 'light' ? '-light' : '');
  const label = `${config.n}-${config.name}${suffix}`;
  const entry = { n: config.n, name: config.name, theme, htmlPath: null, pngHint: `${label}.png`, mounted: false, error: null, pageHeightPx: null, treeFallback: false };
  try {
    const storeOverride = { ...(config.storeOverride || {}), ...(variant.storeOverride || {}) };
    ENV.useAppStore.setState(personaStoreState(seed, storeOverride));
    if (theme === 'light') ENV.useAppStore.setState({ accessibility: { ...ENV.useAppStore.getState().accessibility, theme: 'light' } });

    // eslint-disable-next-line global-require
    const Screen = require(`../../src/screens/${config.name}`).default;
    const tabBarEl = config.tabBarIndex !== undefined ? buildTabBarElement(config.tabBarIndex, config.tabBarNested) : null;

    const { tree, errors } = await mountScreen(Screen, { Screen, params: config.params || {}, extra: tabBarEl });
    if (!tree) { entry.error = `mount produced no tree${errors.length ? `: ${errors.join(' | ')}` : ''}`; return entry; }
    entry.mounted = true;
    if (errors.length) entry.renderErrors = errors.slice(0, 10);

    const { json, fallback, error } = safeTreeJSON(tree);
    entry.treeFallback = fallback;
    if (fallback) entry.treeFallbackError = error;

    // eslint-disable-next-line global-require
    const themeMod = require('../../src/styles/theme');
    const bg = theme === 'light' ? themeMod.resolveTheme({ theme: 'light' }).colors.background : themeMod.colors.background;
    const { html, stats } = treeToHtml(json, { theme, title: label, backgroundColor: bg });
    mergeConverterStats(stats);
    entry.pageHeightPx = stats.estimatedHeightPx;

    const htmlPath = path.join(HTML_DIR, `${label}.html`);
    fs.writeFileSync(htmlPath, html, 'utf8');
    entry.htmlPath = htmlPath;

    try { await ENV.TestRenderer.act(() => { tree.unmount(); }); } catch (_) { /* best-effort teardown */ }
  } catch (e) {
    entry.error = `${e && e.message}\n${(e && e.stack || '').split('\n').slice(1, 6).join('\n')}`;
  }
  console.log(`[paper-render] ${entry.mounted ? 'OK  ' : 'FAIL'} ${label}${entry.error ? ` -- ${entry.error.split('\n')[0]}` : ''}`);
  return entry;
}

// ── Test 1: seed + dark-theme pass (all 16 screens) ──────────────────────
test('seed the persona and paper-render every screen in dark theme', async () => {
  jest.useFakeTimers({
    now: NOW_MS,
    doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'queueMicrotask', 'nextTick', 'hrtime', 'performance'],
  });

  const seed = await seedPersona();
  REPORT.dataLayerNote = seed.dataLayer;
  REPORT.bypassedWrites = seed.bypassedWrites;
  REPORT.seedNotes = seed.notes;
  REPORT.userId = seed.userId;
  REPORT.lastWeekMonday = seed.lastWeekMonday;
  REPORT.diaryTotalKcal = seed.diaryTotalKcal;
  console.log('[paper-render] seed complete, userId =', seed.userId);

  for (const config of screenConfigs(seed)) {
    // eslint-disable-next-line no-await-in-loop
    const entry = await processScreen(config, seed, 'dark');
    REPORT.screens.push(entry);
  }

  global.__PAPER_RENDER_SEED__ = seed;
  jest.useRealTimers();
  expect(REPORT.screens.length).toBe(16);
});

// ── Test 1b: day-zero pass (01/04/06/07, fresh account, dark theme) ──────
// Same live database, same module instances as test 1 (no jest.resetModules
// -- that only happens before the light pass below), a second user with a
// saved body profile + nutrition targets (seedDayZeroPersona's own header
// explains why those two writes and nothing else) and no plan, session,
// food entry or weight entry at all -- "the founder judges the app on a
// fresh account" (brief).
test('paper-render the day-zero variant for Home, Analytics, Diary and Plans', async () => {
  const seed = global.__PAPER_RENDER_SEED__;
  expect(seed).toBeTruthy();

  jest.useFakeTimers({
    now: NOW_MS,
    doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'queueMicrotask', 'nextTick', 'hrtime', 'performance'],
  });

  const dayZero = await seedDayZeroPersona();
  console.log('[paper-render] day-zero seed complete, userId =', dayZero.userId);
  const daySeed = { ...seed, userId: dayZero.userId };
  const dayZeroStoreOverride = {
    userProfile: {
      firstName: dayZero.firstName, sex: dayZero.sex, goal: 'lean_gain', trainingFocus: 'hypertrophy',
      units: 'kg', coachAutonomy: 'collaborative', coachTone: 'automatic',
    },
  };

  const configs = screenConfigs(seed).filter((c) => DAY_ZERO_SCREENS.has(c.n));
  for (const config of configs) {
    // eslint-disable-next-line no-await-in-loop
    const entry = await processScreen(config, daySeed, 'dark', { suffix: '-day0', storeOverride: dayZeroStoreOverride });
    REPORT.screens.push(entry);
  }

  jest.useRealTimers();
  expect(REPORT.screens.length).toBe(16 + configs.length);
});

// ── Test 2: light theme (01/04/06), with the resetModules reload ─────────
test('paper-render the light theme variant for Home, Analytics and Diary', async () => {
  const seed = global.__PAPER_RENDER_SEED__;
  expect(seed).toBeTruthy();

  jest.useFakeTimers({
    now: NOW_MS,
    doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'queueMicrotask', 'nextTick', 'hrtime', 'performance'],
  });

  // Close the dark pass's handle before the module registry that owns it
  // is discarded -- a stale open connection must never outlive its module.
  try { await require('../../src/lib/database').closeDatabase(); } catch (_) { /* best-effort */ }

  jest.resetModules();
  ENV.React = require('react');
  ENV.TestRenderer = require('react-test-renderer');
  ENV.useAppStore = require('../../src/store/useAppStore').default;

  // Re-open + re-verify the real (already-migrated, already-seeded) SQLite
  // file, then flip the legacy theme singleton BEFORE any screen module
  // that reads it statically is required for the first time this pass.
  await require('../../src/lib/database').initDatabase();
  require('../../src/styles/theme').applyAccessibility({ theme: 'light', higherContrast: false, colorBlindSafe: false, largerText: false });

  const configs = screenConfigs(seed).filter((c) => LIGHT_SCREENS.has(c.n));
  for (const config of configs) {
    // eslint-disable-next-line no-await-in-loop
    const entry = await processScreen(config, seed, 'light');
    REPORT.screens.push(entry);
  }

  jest.useRealTimers();
  // 16 dark + DAY_ZERO_SCREENS.size day-zero (test 1b, already pushed) + this
  // pass's own light screens.
  expect(REPORT.screens.length).toBe(16 + DAY_ZERO_SCREENS.size + configs.length);
});

afterAll(async () => {
  try { await require('../../src/lib/database').closeDatabase(); } catch (_) { /* best-effort */ }
  try { await require('./expoSqliteShim').__closeAllForTests(); } catch (_) { /* best-effort */ }
  fs.mkdirSync(WORK_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(REPORT, null, 2), 'utf8');
  console.log('[paper-render] report data written to', REPORT_JSON);
});
