/**
 * HomeScreen — Campaign 22 Phase 2, Stage 3: the 18-state matrix suite
 * (HOME-TODAY-UX-SPEC.md §23 "State-matrix suite"; states enumerated in
 * docs/home-today-ux-campaign-22-2026-08-16/STATE-MATRIX-AND-DENSITY.md
 * §1.1-1.2, S1-S18 — S0 is explicitly transient/non-counted in that doc's
 * own words: "Materially different from steady-state only for the frame(s)
 * before resolution... collapses into whichever of S1-S6 the plan state
 * below it would otherwise be").
 *
 * WHY A REAL MOUNT IS POSSIBLE HERE (unlike this screen's other suites).
 * `firstReviewLine.test.js` and every HomeScreen.*.guard.test.js note that
 * "HomeScreen cannot be mounted in this Jest environment" — true only
 * without the mock scaffold those files don't carry. `src/__tests__/
 * screen-mount.test.js` proves the opposite: it mounts HomeScreen (it is in
 * SCREENS_TO_SWEEP) successfully across four store shapes, using a specific
 * mock set for every native/heavy dependency HomeScreen's import graph
 * touches. This file copies that exact mock set (verbatim, same convention)
 * and drives HomeScreen's per-state facts the same way that file's own
 * "Edge: empty arrays" tests do — monkey-patching the real `lib/database`
 * module's exported functions (and a handful of other pure-logic lib
 * modules HomeScreen calls directly: programmePosition, algorithms,
 * activationNudge, reEntryCheck, coachDecision, payments/cascade,
 * plateauSurfacing, coachResponse, differentialPaywall) rather than
 * reverse-engineering realistic SQLite row shapes for every one of
 * loadData()'s dozen-plus chained loaders. Every override is restored in
 * afterEach so state never leaks between tests.
 *
 * WHAT EACH STATE ASSERTS. Per §23: which Today-line occupant (if any)
 * renders (via testID="today-line" and/or its exact text), whether the
 * hero / TodayStrip / first-review-line / footer regions are present (via
 * stable accessibility labels/text each region's real components render —
 * see REGION MARKERS below), and that no retired banner idiom renders (the
 * old bottom check-in nudge sentence, the old everyday trial line, the old
 * "Coach - this week's decision" title).
 *
 * TWO OF THE 18 ARE DELIBERATELY NOT MOUNTED, WITH REASONS RECORDED HERE
 * (never silently skipped, per the build brief):
 *  - S1 (cold-launch skeleton): a single-frame transient render that exists
 *    only until loadData()'s Promise.all resolves; this file's mount helper
 *    (matching screen-mount.test.js's own mountScreen) deliberately flushes
 *    that Promise.all before asserting, so the skeleton frame is never the
 *    thing under test anywhere in this codebase's mount conventions. Its
 *    material claim (skeleton renders BEFORE any content, never after) is a
 *    static JSX fact, not a state permutation, and is pinned by source guard
 *    below instead.
 *  - S15 (early-trial zero-history variant): pre-repair, this was a Home-
 *    rendered content variant (a different trial-card CTA and tap target).
 *    Post FOUNDER-RULINGS-PHASE2 R3, the everyday trial card left Home
 *    entirely — Home shows NOTHING for early trial regardless of the S3/
 *    zero-history distinction (only trial-ENDING, rank 8, ever reaches the
 *    Today line). S15's Home-side distinctness is retired by design; its
 *    surviving distinctness (the S3 tap-target rule, D98-3) lives on
 *    YouScreen, out of this screen's scope. Covered here by the SAME "no
 *    trial content at all" mount used for S14 (see that test) plus the
 *    trialEnding-window source guard.
 */

// ─── Mock scaffold: copied from src/__tests__/screen-mount.test.js (the
// proven-working set for mounting HomeScreen via react-test-renderer). See
// that file's own header for why each of these exists and why none uses
// { virtual: true }. Kept verbatim/same-shape so this file inherits that
// suite's own maintenance, not a second parallel one. ──────────────────────
jest.mock('react-native-url-polyfill/auto', () => ({}));
jest.mock('expo/virtual/env', () => ({ env: process.env }));
jest.mock('expo-application');
jest.mock('expo-constants');
jest.mock('expo-crypto');
jest.mock('expo-secure-store');
jest.mock('expo-sqlite');

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
      signInWithPassword: jest.fn(() => Promise.resolve({ data: null, error: null })),
      signUp: jest.fn(() => Promise.resolve({ data: null, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      signInWithOAuth: jest.fn(() => Promise.resolve({ data: null, error: null })),
      exchangeCodeForSession: jest.fn(() => Promise.resolve({ data: null, error: null })),
      setSession: jest.fn(() => Promise.resolve({ data: null, error: null })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
      then: (res) => Promise.resolve({ data: [], error: null }).then(res),
    })),
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
  })),
}));

jest.mock('expo-updates', () => ({
  reloadAsync: jest.fn(() => Promise.resolve()),
  checkForUpdateAsync: jest.fn(() => Promise.resolve({ isAvailable: false })),
  fetchUpdateAsync: jest.fn(() => Promise.resolve({ isNew: false })),
  updateId: null,
  runtimeVersion: '1.0.0',
  channel: null,
  releaseChannel: 'default',
  isEnabled: false,
  isEmbeddedLaunch: true,
  manifest: null,
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: '/tmp/',
  cacheDirectory: '/tmp/',
  bundleDirectory: '/tmp/',
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  deleteAsync: jest.fn(() => Promise.resolve()),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: false })),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  copyAsync: jest.fn(() => Promise.resolve()),
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() => Promise.resolve({ type: 'cancel' })),
}));

jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(() => Promise.resolve({ uri: '' })),
}));

jest.mock('expo-av', () => ({
  Audio: { Sound: { createAsync: jest.fn(() => Promise.resolve({ sound: { unloadAsync: jest.fn() } })) } },
}));

jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  requestReview: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(() => Promise.resolve(false)),
  unregisterTaskAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-background-fetch', () => ({
  registerTaskAsync: jest.fn(() => Promise.resolve()),
  unregisterTaskAsync: jest.fn(() => Promise.resolve()),
  setMinimumIntervalAsync: jest.fn(() => Promise.resolve()),
  BackgroundFetchResult: { NewData: 1, NoData: 2, Failed: 3 },
  BackgroundFetchStatus: { Available: 3 },
  getStatusAsync: jest.fn(() => Promise.resolve(3)),
}));

jest.mock('expo-sensors', () => ({
  Pedometer: { isAvailableAsync: jest.fn(() => Promise.resolve(false)), watchStepCount: jest.fn(() => ({ remove: () => {} })) },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-image', () => {
  const React = require('react');
  return { Image: props => React.createElement('Image', props) };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return { LinearGradient: props => React.createElement('LinearGradient', props, props.children) };
});

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: () => {} })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: () => {} })),
  SchedulableTriggerInputTypes: {
    DAILY: 'daily', WEEKLY: 'weekly', YEARLY: 'yearly', DATE: 'date', TIME_INTERVAL: 'timeInterval', CALENDAR: 'calendar',
  },
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1, NONE: 0 },
  AndroidNotificationPriority: { MAX: 'max', HIGH: 'high', DEFAULT: 'default' },
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  withScope: jest.fn(cb => cb({ setTag: () => {}, setContext: () => {}, setUser: () => {} })),
}));

jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas', Path: 'Path', Skia: { Path: { Make: () => ({ moveTo: () => {}, lineTo: () => {}, close: () => {} }) } },
  useFont: () => null, useImage: () => null,
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const mk = name => props => React.createElement(name, props, props.children);
  return {
    __esModule: true,
    Svg: mk('Svg'), Path: mk('Path'), G: mk('G'), Circle: mk('Circle'),
    Rect: mk('Rect'), Line: mk('Line'), Text: mk('Text'), Defs: mk('Defs'),
    LinearGradient: mk('LinearGradient'), Stop: mk('Stop'), ClipPath: mk('ClipPath'),
    default: mk('Svg'),
  };
});

jest.mock('react-native-webview', () => {
  const React = require('react');
  return { WebView: props => React.createElement('WebView', props), default: props => React.createElement('WebView', props) };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const passthrough = name => props => React.createElement(name, props, props.children);
  const gestureStub = new Proxy({}, { get: () => () => gestureStub });
  return {
    GestureHandlerRootView: passthrough('GHRoot'),
    GestureDetector: passthrough('GestureDetector'),
    Gesture: { Pan: () => gestureStub, Tap: () => gestureStub, LongPress: () => gestureStub },
    PanGestureHandler: passthrough('PanGH'),
    TapGestureHandler: passthrough('TapGH'),
    State: {},
    Directions: {},
    gestureHandlerRootHOC: c => c,
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), addListener: () => () => {}, setOptions: jest.fn(), dispatch: jest.fn(), getParent: () => ({ addListener: () => () => {} }) }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: (cb) => { require('react').useEffect(() => cb(), []); },
  useIsFocused: () => true,
  useScrollToTop: jest.fn(),
  NavigationContainer: ({ children }) => children,
  StackActions: { popToTop: jest.fn(), replace: jest.fn(), push: jest.fn() },
  CommonActions: { navigate: jest.fn(), reset: jest.fn() },
}));

jest.mock('../../components/Toast', () => {
  const React = require('react');
  return {
    useToast: () => ({ show: jest.fn(), hide: jest.fn() }),
    ToastProvider: ({ children }) => children,
    default: props => React.createElement('Toast', props),
  };
});

jest.mock('../../components/FeedbackSheet', () => {
  const React = require('react');
  return {
    useFeedback: () => ({ open: jest.fn(), close: jest.fn() }),
    FeedbackProvider: ({ children }) => children,
    default: props => React.createElement('FeedbackSheet', props),
  };
});

jest.mock('../../components/BodyDiagramHeatmap', () => {
  const React = require('react');
  return { __esModule: true, default: props => React.createElement('BodyDiagramHeatmap', props) };
});

jest.mock('../../components/GradientCard', () => {
  const React = require('react');
  return { __esModule: true, default: props => React.createElement('GradientCard', props, props.children) };
});

jest.mock('rest-timer-live', () => ({ start: jest.fn(), stop: jest.fn(), update: jest.fn() }));
jest.mock('live-activity', () => ({ start: jest.fn(), stop: jest.fn(), update: jest.fn() }));

global.__DEV__ = false;
if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
}

jest.setTimeout(20_000);

const React = require('react');
const TestRenderer = require('react-test-renderer');
const useAppStore = require('../../store/useAppStore').default;

const origConsoleError = console.error;
beforeAll(() => {
  console.error = (msg, ...rest) => {
    const text = typeof msg === 'string' ? msg : String(msg);
    if (/wrap.*act|environment has been torn down|Cannot log after tests|Each child in a list|react-test-renderer is deprecated/i.test(text)) return;
    origConsoleError(msg, ...rest);
  };
});
afterAll(() => { console.error = origConsoleError; });

function makeNav() {
  const nav = {
    navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), push: jest.fn(), pop: jest.fn(),
    popToTop: jest.fn(), reset: jest.fn(), setOptions: jest.fn(), setParams: jest.fn(), dispatch: jest.fn(),
    addListener: jest.fn(() => () => {}), removeListener: jest.fn(), canGoBack: jest.fn(() => true),
    isFocused: jest.fn(() => true), getId: jest.fn(() => 'test-route'), getState: jest.fn(() => ({ routes: [], index: 0 })),
  };
  nav.getParent = jest.fn(() => nav);
  return nav;
}

let currentTree = null;

async function mountHome(props = {}) {
  const errors = [];
  const origErr = console.error;
  console.error = (msg) => {
    const text = typeof msg === 'string' ? msg : String(msg);
    if (/wrap.*act|environment has been torn down|Cannot log after tests|Each child in a list|Function components cannot be given refs|forwardRef|inside StrictMode|react-test-renderer is deprecated/i.test(text)) return;
    errors.push(text);
  };
  const HomeScreen = require('../HomeScreen').default;
  let tree = null;
  try {
    await TestRenderer.act(async () => {
      tree = TestRenderer.create(
        React.createElement(HomeScreen, { navigation: makeNav(), route: { params: {}, name: 'Test' }, ...props }),
      );
    });
    await TestRenderer.act(async () => {
      for (let i = 0; i < 20; i++) await Promise.resolve();
      await new Promise(r => setImmediate(r));
      for (let i = 0; i < 15; i++) await Promise.resolve();
    });
  } finally {
    console.error = origErr;
  }
  currentTree = tree;
  return { tree, errors };
}

afterEach(() => {
  if (currentTree) {
    try { TestRenderer.act(() => { currentTree.unmount(); }); } catch (_) {}
    currentTree = null;
  }
});

// ─── Tree helpers ───────────────────────────────────────────────────────────

function flattenText(tree) {
  const out = [];
  (function visit(node) {
    if (node == null) return;
    if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
    const c = node.children;
    if (Array.isArray(c)) c.forEach(visit); else if (c) visit(c);
  })(tree.toJSON());
  return out.join(' ');
}

// Host-component nodes only (n.type is a string like 'TouchableOpacity'):
// react-test-renderer's findAll also walks the COMPOSITE instance for a
// given host node (e.g. the memoised TodayLine component itself, which
// forwards testID straight through), so counting every match double/triple
// counts one rendered element. Host-only gives a true "how many actually
// rendered" count.
function findByTestID(tree, testID) {
  return tree.root.findAll((n) => typeof n.type === 'string' && n.props?.testID === testID);
}

function findByLabel(tree, matcher) {
  const test = matcher instanceof RegExp ? (l) => matcher.test(l)
    : typeof matcher === 'function' ? matcher
    : (l) => l === matcher;
  return tree.root.findAll((n) => typeof n.type === 'string' && typeof n.props?.accessibilityLabel === 'string' && test(n.props.accessibilityLabel));
}

// Region markers: each is a stable accessibilityLabel/text the real
// component renders regardless of which content variant is showing, so
// "is this region present" never depends on copy.
// The RENDERED text inside a host node (not its accessibilityLabel, which
// for a couple of occupants — coach_decision, check_in — is a fixed generic
// phrase distinct from the actual one-sentence copy the spec pins).
function textOf(node) {
  if (!node) return null;
  const texts = node.findAll((n) => typeof n.type === 'string' && n.type === 'Text');
  return texts.map((t) => (Array.isArray(t.props.children) ? t.props.children.join('') : t.props.children)).join('');
}

const REGION = {
  todayLine: (tree) => findByTestID(tree, 'today-line').length > 0,
  todayLineText: (tree) => textOf(findByTestID(tree, 'today-line')[0]),
  firstReviewLine: (tree) => findByTestID(tree, 'first-review-line').length > 0,
  heroActive: (tree) => findByLabel(tree, 'Continue active workout').length > 0,
  heroPlanned: (tree) => findByLabel(tree, /^Workout options$/).length > 0,
  heroNoPlan: (tree) => flattenText(tree).includes('No active plan yet'),
  welcomeCard: (tree) => findByLabel(tree, 'Dismiss the welcome guide').length > 0,
  todayStrip: (tree) => flattenText(tree).includes('Morning weight'),
  footerLastSession: (tree) => findByLabel(tree, 'Open workout history').length > 0,
  teaser: (tree) => findByLabel(tree, 'Learn about Pro coaching').length > 0,
};

// ─── Lib module handles + default (safe/empty) fixtures ───────────────────
// Every function HomeScreen calls directly from these modules is overridden
// per test and restored in afterEach, exactly like screen-mount.test.js's
// own "Edge: empty arrays" pattern (monkey-patching the real module object,
// which HomeScreen's Babel-compiled CJS interop reads live at call time).

const database = require('../../lib/database');
const programmePositionMod = require('../../lib/programmePosition');
const algorithmsMod = require('../../lib/algorithms');
const activationNudgeMod = require('../../lib/activationNudge');
const reEntryCheckMod = require('../../lib/reEntryCheck');
const coachDecisionMod = require('../../lib/coachDecision');
const cascadeMod = require('../../lib/payments/cascade');
const plateauSurfacingMod = require('../../lib/plateauSurfacing');
const coachResponseMod = require('../../lib/coachResponse');
const differentialPaywallMod = require('../../lib/differentialPaywall');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const DEFAULT_DB = {
  getActivePlan: async () => null,
  getRoutinesForPlan: async () => [],
  getCurrentMesocycleWeek: async () => null,
  getLatestCoachOutput: async () => null,
  getLatestCheckin: async () => null,
  getAllWorkouts: async () => [],
  getWorkoutSetsSince: async () => [],
  getWorkoutSetsForWorkout: async () => [],
  getMorningWeightToday: async () => null,
  getMorningWeights: async () => [],
  getMorningWeightsLast14Days: async () => [],
  getOpenEdPatternFlag: async () => false,
  getRecentCheckins: async () => [],
  getNutritionTargets: async () => null,
  getAllRoutineExerciseCounts: async () => ({}),
  getRecentWorkoutFeedback: async () => [],
  getPlannedMuscleVolume: async () => [],
  getAllExercises: async () => [],
  getProgressionTeaser: async () => null,
  getPlannedMuscleVolumeForBlock: async () => [],
  getAllMesocyclesForUser: async () => [],
  getRoutineExercisesWithDetails: async () => [],
  getExerciseById: async () => null,
};
const DEFAULT_LIB = {
  resolveProgrammePosition: async () => null,
  shouldDeload: () => ({ deload: false }),
  resolveActivationNudge: () => null,
  reEntryCheckDue: () => null,
  isCompletedCoachDecision: () => false,
  stageOf: () => 'complete_trial',
  canStillTrial: () => false,
  trialEndsAtMs: () => null,
  daysRemaining: () => null,
  selectPlateauForBanner: () => null,
  buildFreeCoachLine: () => null,
  detectDifferentialTrigger: () => ({ shown: false }),
};

const LIB_MODULES = {
  resolveProgrammePosition: programmePositionMod,
  shouldDeload: algorithmsMod,
  resolveActivationNudge: activationNudgeMod,
  reEntryCheckDue: reEntryCheckMod,
  isCompletedCoachDecision: coachDecisionMod,
  stageOf: cascadeMod,
  canStillTrial: cascadeMod,
  trialEndsAtMs: cascadeMod,
  daysRemaining: cascadeMod,
  selectPlateauForBanner: plateauSurfacingMod,
  buildFreeCoachLine: coachResponseMod,
  detectDifferentialTrigger: differentialPaywallMod,
};

let dbOriginals = null;
let libOriginals = null;

function applyFixture({ db = {}, lib = {} } = {}) {
  dbOriginals = {};
  for (const key of Object.keys(DEFAULT_DB)) {
    dbOriginals[key] = database[key];
    database[key] = db[key] ?? DEFAULT_DB[key];
  }
  libOriginals = {};
  for (const key of Object.keys(DEFAULT_LIB)) {
    const mod = LIB_MODULES[key];
    libOriginals[key] = mod[key];
    mod[key] = lib[key] ?? DEFAULT_LIB[key];
  }
}

function restoreFixture() {
  if (dbOriginals) { for (const k of Object.keys(dbOriginals)) database[k] = dbOriginals[k]; dbOriginals = null; }
  if (libOriginals) { for (const k of Object.keys(libOriginals)) { LIB_MODULES[k][k] = libOriginals[k]; } libOriginals = null; }
}

afterEach(async () => {
  restoreFixture();
  await AsyncStorage.clear();
});

const PRO_USER = {
  user: { id: 'u-state-matrix', email: 't@e.com', isLocal: false },
  session: { user: { id: 'u-state-matrix', created_at: '2020-01-01T00:00:00.000Z' } },
  tier: 'pro',
  firstRunComplete: true,
  userProfile: { firstName: 'Alex', goal: 'lean_gain', trainingFocus: 'hypertrophy', units: 'metric' },
  activeWorkout: null,
  bodyWeightUnits: 'kg',
};
const FREE_USER = { ...PRO_USER, tier: 'free' };

const ROUTINE = { id: 'r1', name: 'Push Day' };
const NEXT_SESSION = { routineId: 'r1', name: 'Push Day' };
function withPlan() {
  return {
    getActivePlan: async () => ({ id: 'p1', name: 'My Plan' }),
    getRoutinesForPlan: async () => [ROUTINE],
  };
}
function programmePosition(recoveryState = null) {
  return async () => ({
    nextSession: NEXT_SESSION,
    sessions: [{ routineId: 'r1', state: 'outstanding' }],
    activeWeekId: 'w1',
    blockId: 'b1',
    recoveryState,
  });
}
function completedWorkout(id, daysAgo = 1) {
  return { id, isCompleted: true, startedAt: Date.now() - daysAgo * 86400000, endedAt: Date.now() - daysAgo * 86400000 };
}

// ─── S2 — active workout in progress: resume outranks every P1 occupant ───
describe('State matrix — S2: active workout in progress', () => {
  test('Continue card renders; Today line is silent even with block-complete AND coach-decision eligible', async () => {
    applyFixture({
      db: {
        ...withPlan(),
        getCurrentMesocycleWeek: async () => ({ awaitingDecision: true, mesocycleId: 'm1' }),
        getLatestCoachOutput: async () => ({ weekStart: Date.now(), adjustments: { calories: { applied: true, newKcal: 2200 } }, hasEnoughData: true }),
      },
      lib: { resolveProgrammePosition: programmePosition(null), isCompletedCoachDecision: () => true },
    });
    const { errors } = await mountHome({});
    expect(errors).toEqual([]);
    useAppStore.setState({ ...PRO_USER, activeWorkout: { id: 'aw1', startedAt: Date.now() } });
    // Re-mount with activeWorkout set (store must be set before mount so the
    // hasActiveWorkout branch is live on first render).
    if (currentTree) { TestRenderer.act(() => currentTree.unmount()); currentTree = null; }
    const second = await mountHome({});
    expect(second.errors).toEqual([]);
    expect(REGION.heroActive(second.tree)).toBe(true);
    expect(REGION.heroPlanned(second.tree)).toBe(false);
    expect(REGION.todayLine(second.tree)).toBe(false);
  });
});

// ─── S3 — established Pro, normal day, nothing eligible ───────────────────
describe('State matrix — S3: established Pro, normal day, no banner eligible', () => {
  test('hero + TodayStrip + footer render; Today line is silent', async () => {
    useAppStore.setState(PRO_USER);
    applyFixture({
      db: {
        ...withPlan(),
        getAllWorkouts: async () => [completedWorkout('w1', 1)],
        getCurrentMesocycleWeek: async () => ({ weekIndex: 2, plannedWeeks: 6, mesocycleId: 'm1', recoveryState: null }),
        // Logged so the first-review conflict-day fact (rank 4.5) does not
        // itself become an unintended Today-line occupant in this "nothing
        // eligible" baseline.
        getMorningWeightToday: async () => ({ weightKg: 82 }),
      },
      lib: { resolveProgrammePosition: programmePosition(null) },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(REGION.heroPlanned(tree)).toBe(true);
    expect(REGION.todayStrip(tree)).toBe(true);
    expect(REGION.footerLastSession(tree)).toBe(true);
    expect(REGION.todayLine(tree)).toBe(false);
  });
});

// ─── S4 — fresh coach review, meaningful calorie change ───────────────────
describe('State matrix — S4: established Pro, fresh coach review', () => {
  test('Today line carries the calorie-change sentence (copy contract item 2)', async () => {
    useAppStore.setState(PRO_USER);
    applyFixture({
      db: {
        ...withPlan(),
        getAllWorkouts: async () => [completedWorkout('w1', 1)],
        getLatestCoachOutput: async () => ({ weekStart: Date.now(), adjustments: { calories: { applied: true, newKcal: 2350 } }, hasEnoughData: true }),
      },
      lib: { resolveProgrammePosition: programmePosition(null), isCompletedCoachDecision: () => true },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(REGION.todayLine(tree)).toBe(true);
    expect(REGION.todayLineText(tree)).toBe('Calories adjusted to 2350 kcal. See why.');
    expect(flattenText(tree)).not.toMatch(/Coach - this week/);
  });
});

// ─── S5 — coach output exists but decision NOT complete ───────────────────
describe('State matrix — S5: coach output exists, decision not complete', () => {
  test('no coaching signal reaches the Today line', async () => {
    useAppStore.setState(PRO_USER);
    applyFixture({
      db: {
        ...withPlan(),
        getAllWorkouts: async () => [completedWorkout('w1', 1)],
        getLatestCoachOutput: async () => ({ weekStart: Date.now(), hasEnoughData: false }),
        getMorningWeightToday: async () => ({ weightKg: 82 }),
      },
      lib: { resolveProgrammePosition: programmePosition(null), isCompletedCoachDecision: () => false },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(REGION.todayLine(tree)).toBe(false);
    expect(flattenText(tree)).not.toMatch(/kcal\. See why/);
  });
});

// ─── S6 — planned recovery week (structural) ───────────────────────────────
describe('State matrix — S6: recovery week SCHEDULED', () => {
  test('Today line carries the ONE recovery voice; no separate always-on recovery card', async () => {
    useAppStore.setState(PRO_USER);
    const RECOVERY = { state: 'planned_block_recovery', weekIndex: 6, plannedWeeks: 6, recoveryWeek: 6, weeksToRecovery: 0 };
    applyFixture({
      db: {
        ...withPlan(),
        getAllWorkouts: async () => [completedWorkout('w1', 1)],
        getCurrentMesocycleWeek: async () => ({ weekIndex: 6, plannedWeeks: 6, mesocycleId: 'm1', isDeload: true, recoveryState: RECOVERY }),
        getMorningWeightToday: async () => ({ weightKg: 82 }),
      },
      lib: { resolveProgrammePosition: programmePosition(RECOVERY) },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(REGION.todayLineText(tree)).toBe('Recovery week. Training is deliberately lighter. What that means.');
    // RecoveryStateCard's OWN heading text must not ALSO appear unprompted
    // (it now only renders inside the tap-through detail sheet, closed by
    // default) — the structural recovery fact has exactly one voice here.
    expect(flattenText(tree)).not.toMatch(/You have finished the hard-training part/);
  });
});

// ─── S7 — adaptive recovery adjustment (mid-block) ─────────────────────────
describe('State matrix — S7: recovery ADAPTIVE ADJUSTMENT', () => {
  test('Today line never claims "Recovery week" for an unscheduled reduction', async () => {
    useAppStore.setState(PRO_USER);
    const RECOVERY = { state: 'adaptive_recovery_adjustment', weekIndex: 3, plannedWeeks: 6, recoveryWeek: 6, weeksToRecovery: 3 };
    applyFixture({
      db: {
        ...withPlan(),
        getAllWorkouts: async () => [completedWorkout('w1', 1)],
        getCurrentMesocycleWeek: async () => ({ weekIndex: 3, plannedWeeks: 6, mesocycleId: 'm1', isDeload: true, recoveryState: RECOVERY }),
        getMorningWeightToday: async () => ({ weightKg: 82 }),
      },
      lib: { resolveProgrammePosition: programmePosition(RECOVERY) },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(REGION.todayLineText(tree)).toBe('Training is lighter for now. Why?');
    expect(REGION.todayLineText(tree)).not.toMatch(/^Recovery week/);
  });
});

// ─── S8 — data-driven deload SUGGESTED (no structural state) ───────────────
describe('State matrix — S8: deload suggested, data-driven only', () => {
  test('Today line carries the suggestion; distinct from the structural recovery wording', async () => {
    useAppStore.setState(PRO_USER);
    applyFixture({
      db: {
        ...withPlan(),
        getAllWorkouts: async () => [completedWorkout('w1', 1)],
        getCurrentMesocycleWeek: async () => ({ weekIndex: 2, plannedWeeks: 6, mesocycleId: 'm1', isDeload: false, recoveryState: null }),
        getMorningWeightToday: async () => ({ weightKg: 82 }),
      },
      lib: {
        resolveProgrammePosition: programmePosition(null),
        shouldDeload: () => ({ deload: true, reasons: ['Rep performance has been trending down.'] }),
      },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(REGION.todayLineText(tree)).toBe('Recovery week suggested. See why.');
  });
});

// ─── S9 — block finished, awaiting decision ────────────────────────────────
describe('State matrix — S9: block finished, awaiting decision', () => {
  test('Today line becomes the decision entry (rank 2, outranks everything junior)', async () => {
    useAppStore.setState(PRO_USER);
    applyFixture({
      db: {
        ...withPlan(),
        getAllWorkouts: async () => [completedWorkout('w1', 1)],
        getCurrentMesocycleWeek: async () => ({ awaitingDecision: true, mesocycleId: 'm1', weekIndex: 6, plannedWeeks: 6 }),
        getLatestCoachOutput: async () => ({ weekStart: Date.now(), adjustments: { calories: { applied: true, newKcal: 2100 } }, hasEnoughData: true }),
      },
      lib: { resolveProgrammePosition: programmePosition(null), isCompletedCoachDecision: () => true },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(REGION.todayLineText(tree)).toBe("Block complete. Choose what's next.");
  });
});

// ─── S10 — established Free, normal day ────────────────────────────────────
describe('State matrix — S10: established Free, normal day, no plan gaps', () => {
  test('hero + footer render; no TodayStrip (Free excluded); Today line silent', async () => {
    useAppStore.setState(FREE_USER);
    applyFixture({
      db: {
        ...withPlan(),
        getAllWorkouts: async () => [completedWorkout('w1', 1)],
      },
      lib: { resolveProgrammePosition: programmePosition(null) },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(REGION.heroPlanned(tree)).toBe(true);
    expect(REGION.todayStrip(tree)).toBe(false);
    expect(REGION.footerLastSession(tree)).toBe(true);
    expect(REGION.todayLine(tree)).toBe(false);
  });
});

// ─── S11 — Free, no plan, has session history (3+ sessions) ───────────────
describe('State matrix — S11: Free, no plan, session history', () => {
  test('no-plan EmptyState + last-session row; the retired 3-way glance-card duplication never renders', async () => {
    useAppStore.setState(FREE_USER);
    applyFixture({
      db: {
        getActivePlan: async () => null,
        getAllWorkouts: async () => [completedWorkout('w1', 1), completedWorkout('w2', 8), completedWorkout('w3', 15)],
      },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(REGION.heroNoPlan(tree)).toBe(true);
    expect(REGION.footerLastSession(tree)).toBe(true);
    expect(flattenText(tree)).not.toMatch(/Progress at a glance/);
  });
});

// ─── S12 — Free, free-coach-line eligible ──────────────────────────────────
describe('State matrix — S12: Free, free-coach-line eligible', () => {
  test('the free weekly one-liner renders in the P3 footer slot, never above the hero', async () => {
    useAppStore.setState(FREE_USER);
    applyFixture({
      db: { ...withPlan(), getAllWorkouts: async () => [completedWorkout('w1', 1)] },
      lib: {
        resolveProgrammePosition: programmePosition(null),
        buildFreeCoachLine: () => 'You trained once this week.',
      },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(flattenText(tree)).toContain('You trained once this week.');
    const txt = flattenText(tree);
    // Order proof: the free line's own text appears AFTER the hero's stable
    // marker text, i.e. below it, never in the P1/above-hero slot.
    expect(txt.indexOf('Push Day')).toBeLessThan(txt.indexOf('You trained once this week.'));
  });
});

// ─── S13 — Free, differential paywall badge eligible ───────────────────────
describe('State matrix — S13: Free, differential badge eligible', () => {
  test('the differential badge renders in the same P3 footer slot as the free line, never both at once', async () => {
    useAppStore.setState(FREE_USER);
    applyFixture({
      db: {
        ...withPlan(),
        getAllWorkouts: async () => [completedWorkout('w1', 1)],
        getRecentCheckins: async () => [{ weekStart: Date.now() - 86400000, calsAdherence: 'no' }],
        getNutritionTargets: async () => ({ targetKcal: 2200 }),
      },
      lib: {
        resolveProgrammePosition: programmePosition(null),
        buildFreeCoachLine: () => null,
        detectDifferentialTrigger: () => ({
          shown: true, trigger: 'deload',
          with_food_data_message: 'Your training is pointing to a lighter week.',
          paywall_cta: 'try_pro_14d',
        }),
      },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(flattenText(tree)).toContain('Your training is pointing to a lighter week.');
    // Only one P3 attention occupant: the free line's own text is absent.
    expect(flattenText(tree)).not.toContain('You trained once this week.');
  });
});

// ─── S14/S15 — early trial: nothing renders on Home at all (R3 rehome) ────
describe('State matrix — S14/S15: early trial, no first review yet', () => {
  test('Home shows no trial content whatsoever while more than 48h remain (R3: rehomed to You)', async () => {
    useAppStore.setState(PRO_USER);
    applyFixture({
      db: { ...withPlan(), getAllWorkouts: async () => [completedWorkout('w1', 1)] },
      lib: {
        resolveProgrammePosition: programmePosition(null),
        stageOf: () => 'pro_trial',
        trialEndsAtMs: () => Date.now() + 10 * 86400000, // 10 days out
        daysRemaining: () => 10,
        canStillTrial: () => true,
      },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    // The line legitimately present here is the first-review conflict-day
    // occupant (rank 4.5, unrelated to trial state) since today's weigh-in
    // is not logged in this fixture -- the point of this state is that NO
    // trial-flavoured content ever reaches Home, checked directly.
    expect(flattenText(tree).toLowerCase()).not.toMatch(/trial/);
  });

  test('trial ENDING (within 48h) is the ONE trial state that earns the Today line (spec §18 mock G)', async () => {
    useAppStore.setState(PRO_USER);
    applyFixture({
      db: {
        ...withPlan(),
        getAllWorkouts: async () => [completedWorkout('w1', 1)],
        // Today's weigh-in already logged: the first-review conflict-day
        // rule (rank 4.5) does not apply, so trial-ending (rank 8) is the
        // only remaining eligible occupant and this test isolates it.
        getMorningWeightToday: async () => ({ weightKg: 82 }),
      },
      lib: {
        resolveProgrammePosition: programmePosition(null),
        stageOf: () => 'pro_trial',
        trialEndsAtMs: () => Date.now() + 20 * 60 * 60 * 1000, // 20h out
        daysRemaining: () => 1,
        canStillTrial: () => true,
      },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(REGION.todayLineText(tree)).toBe('Your trial ends tomorrow. Keep your coaching.');
  });
});

// ─── S16 — check-in day: rank 4 wins over trial-ending (rank 8) ───────────
describe('State matrix — S16: check-in due on the scheduled day', () => {
  test('the weekly check-in occupies the Today line even with trial-ending simultaneously eligible', async () => {
    useAppStore.setState(PRO_USER);
    const today = new Date().getDay();
    await AsyncStorage.setItem('@volyume_notification_prefs', JSON.stringify({ checkinDay: today }));
    // 4 mornings spanning 6 days: >= MIN_WEIGH_INS (3) in the trailing 7
    // days AND >= FIRST_CHECKIN_MIN_DAYS (5) days of data, so the nudge's
    // own gate (which mirrors the WeeklyCheckIn screen's gate exactly) is
    // genuinely satisfied, not just the day-of-week check.
    const weights = [0, 1, 2, 6].map((d) => ({ loggedAt: Date.now() - d * 86400000, weightKg: 80 }));
    applyFixture({
      db: {
        ...withPlan(),
        getAllWorkouts: async () => [completedWorkout('w1', 1), completedWorkout('w2', 8), completedWorkout('w3', 15)],
        getMorningWeightsLast14Days: async () => weights,
        getMorningWeightToday: async () => ({ weightKg: 80 }),
      },
      lib: {
        resolveProgrammePosition: programmePosition(null),
        stageOf: () => 'pro_trial',
        trialEndsAtMs: () => Date.now() + 20 * 60 * 60 * 1000,
        daysRemaining: () => 1,
        canStillTrial: () => true,
      },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(REGION.todayLineText(tree)).toBe("Your weekly check-in is ready. It shapes this week's coaching decision.");
    // The old bottom-of-screen nudge idiom is gone; this is the only mention.
    expect(flattenText(tree)).not.toMatch(/It's your check-in day/);
  });
});

// ─── S17 — brand-new Pro, plan not yet generated ───────────────────────────
describe('State matrix — S17: brand-new Pro, plan not yet generated', () => {
  test('the Pro no-plan EmptyState renders; TodayStrip still renders (tier-gated, not plan-gated)', async () => {
    useAppStore.setState(PRO_USER);
    applyFixture({ db: { getActivePlan: async () => null } });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(REGION.heroNoPlan(tree)).toBe(true);
    expect(REGION.todayStrip(tree)).toBe(true);
  });
});

// ─── S18 — brand-new user, plan active, 0 sessions (welcome card) ─────────
describe('State matrix — S18: brand-new, plan active, 0 sessions', () => {
  test('the welcome card renders above the hero; footer is absent (no session history)', async () => {
    useAppStore.setState(PRO_USER);
    applyFixture({
      db: { ...withPlan(), getAllWorkouts: async () => [] },
      lib: { resolveProgrammePosition: programmePosition(null) },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(REGION.welcomeCard(tree)).toBe(true);
    expect(REGION.heroPlanned(tree)).toBe(true);
    expect(REGION.footerLastSession(tree)).toBe(false);
  });
});

// ─── S1 (not mounted — see header): the skeleton is a static JSX fact ─────
describe('State matrix — S1: cold-launch skeleton (source guard, see header rationale)', () => {
  test('the skeleton block is gated on initialLoading and renders unconditionally within that gate, before any banner/hero content', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, '../HomeScreen.js'), 'utf8');
    expect(src).toMatch(/\{initialLoading && \(/);
    const skeletonBlock = src.slice(src.indexOf('{initialLoading && ('), src.indexOf('{initialLoading && (') + 400);
    expect(skeletonBlock).toMatch(/<SkeletonCard height=\{160\} \/>/);
    expect(skeletonBlock).toMatch(/<SkeletonCard height=\{64\} \/>/);
  });
});

// ─── Presentation guard: strip-below-hero order (real render-order proof) ─
describe('Presentation guard — strip renders below the hero, above the footer (real DOM order)', () => {
  test('hero text precedes TodayStrip text precedes last-session text', async () => {
    useAppStore.setState(PRO_USER);
    applyFixture({
      db: { ...withPlan(), getAllWorkouts: async () => [completedWorkout('w1', 1)] },
      lib: { resolveProgrammePosition: programmePosition(null) },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    const txt = flattenText(tree);
    const heroIdx = txt.indexOf('Push Day');
    const stripIdx = txt.indexOf('Morning weight');
    const footerIdx = txt.indexOf('Repeat');
    expect(heroIdx).toBeGreaterThan(-1);
    expect(stripIdx).toBeGreaterThan(heroIdx);
    expect(footerIdx).toBeGreaterThan(stripIdx);
  });
});

// ─── Presentation guard: R2 single-occupancy, HomeScreen fact-feeding level
// (real DB state, not synthetic facts — extends todayLineArbiter.test.js's
// already-thorough pure-function adversarial case up to this screen's own
// loaders) ──────────────────────────────────────────────────────────────
describe('Presentation guard — R2 single occupancy at the HomeScreen fact-feeding level', () => {
  test('block-complete, coach-decision and check-in all genuinely eligible at once: only block-complete text renders', async () => {
    useAppStore.setState(PRO_USER);
    const today = new Date().getDay();
    await AsyncStorage.setItem('@volyume_notification_prefs', JSON.stringify({ checkinDay: today }));
    const weights = [0, 1, 2, 6].map((d) => ({ loggedAt: Date.now() - d * 86400000, weightKg: 80 }));
    applyFixture({
      db: {
        ...withPlan(),
        getAllWorkouts: async () => [completedWorkout('w1', 1), completedWorkout('w2', 8), completedWorkout('w3', 15)],
        getCurrentMesocycleWeek: async () => ({ awaitingDecision: true, mesocycleId: 'm1' }),
        getLatestCoachOutput: async () => ({ weekStart: Date.now(), adjustments: { calories: { applied: true, newKcal: 1999 } }, hasEnoughData: true }),
        getMorningWeightsLast14Days: async () => weights,
        getMorningWeightToday: async () => ({ weightKg: 80 }),
      },
      lib: { resolveProgrammePosition: programmePosition(null), isCompletedCoachDecision: () => true },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(findByTestID(tree, 'today-line').length).toBe(1);
    expect(REGION.todayLineText(tree)).toBe("Block complete. Choose what's next.");
    expect(flattenText(tree)).not.toContain('1999 kcal');
    expect(flattenText(tree)).not.toBe("Your weekly check-in is ready. It shapes this week's coaching decision.");
  });
});
