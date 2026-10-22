/**
 * HomeScreen - D231 (app layout rework, batch 1: Today).
 * docs/app-rework-2026-10/SPEC.md, "Rules applied everywhere" and "Batch 1:
 * Today"; fact base docs/app-rework-2026-10/TAB-INVENTORY.md sections 1 and 8.
 *
 * A REAL MOUNT of HomeScreen (the mock scaffold below is copied verbatim from
 * HomeScreen.stateMatrix.test.js, the proven set for mounting this screen), so
 * every claim here is about what renders, not what the source contains. Each
 * test is written to FAIL against the Today before this batch:
 *
 *  1. The Today line takes over three cards: the plan update choice ("Your plan
 *     can be updated. It needs a choice from you."), the plan-rebuilt note ("Your
 *     plan was updated. See what changed." opening a sheet whose "Got it" retires
 *     it) and a limitation waiting for a decision (the "Still need it?" sentence
 *     when exactly one prompt is pending, else the generic one). The old cards and
 *     rows are not in the scroll any more. Taps and dismissals reuse the old ones.
 *  2. Rank order, through the real screen: block finished, plan update needs a
 *     choice, coaching decision, weekly check-in, limitation decision, recovery
 *     week, re-entry, plan rebuilt note, nutrition phase (the pairwise order of
 *     the pure arbiter is in src/lib/home/__tests__/todayLineArbiter.test.js).
 *  3. Dedupe: while the main card says "Block complete" the line does not say
 *     "Block finished", and the block chip keeps only its new sentence; the
 *     "Week complete" main card shows no chip repeating "Every session done for
 *     this week.".
 *  4. One offer slot directly under the main card, at most one shown, in order:
 *     the full Set up coaching card, the injuries question, See who is training,
 *     the getting-started nudge. The quiet "Coaching isn't set up yet" row is not
 *     an offer. Each keeps its safety gate (the nudge never shows under an open
 *     ED flag). The injuries question waits for the first logged session (or the
 *     old welcome-dismissed flag).
 *  5. Gone from Today: the Welcome card, the Community header button (the header
 *     keeps no right slot: the default brand mark), the challenge row.
 */

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


// ─── D231 additions to the scaffold: the plan-rebuild facts and the capability
// lane are driven per test through these mutable fixtures. ─────────────────────
let mockPlanChoice = false;
let mockPlanNote = null;
const mockDismissChoice = jest.fn(async () => {});
const mockDismissNote = jest.fn(async () => {});
jest.mock('../../lib/planRebuild', () => {
  const actual = jest.requireActual('../../lib/planRebuild');
  return {
    ...actual,
    ensureActivePlanRebuilt: jest.fn(async () => ({ ok: true })),
    getPlanRebuildChoice: jest.fn(async () => mockPlanChoice),
    getPlanRebuildNote: jest.fn(async () => mockPlanNote),
    dismissPlanRebuildChoice: (...args) => mockDismissChoice(...args),
    dismissPlanRebuildNote: (...args) => mockDismissNote(...args),
  };
});

// restrictions: rows the resolver would return; nothingSetUp: the full state the
// injuries question reads. A row carries __awaiting to say its episode group is
// past its planned end and awaiting an answer (the real episodeStatus is
// replaced by that flag so the test needs no date arithmetic).
let mockCapRestrictions = [];
let mockCapNothingSetUp = false;
jest.mock('../../lib/capability/resolve', () => ({
  ...jest.requireActual('../../lib/capability/resolve'),
  loadCapabilityResolveState: jest.fn(async () => ({ restrictions: mockCapRestrictions, unavailable: false, stale: false })),
}));
jest.mock('../../lib/capability/store', () => ({
  ...jest.requireActual('../../lib/capability/store'),
  loadCapabilityState: jest.fn(async () => ({
    unavailable: false,
    baseline: mockCapNothingSetUp ? [] : [{ id: 'b1' }],
    episodes: [],
    history: [],
  })),
}));
jest.mock('../../lib/capability/model', () => ({
  ...jest.requireActual('../../lib/capability/model'),
  episodeStatus: (rows) => (rows.every((r) => r.__awaiting) ? 'awaiting_confirmation' : 'active'),
}));
jest.mock('../../lib/capability/phrase', () => ({
  ...jest.requireActual('../../lib/capability/phrase'),
  subjectPhrase: (rows) => rows?.[0]?.__subject ?? null,
}));

const mockUseCommunityMe = jest.fn(() => ({ me: {}, loading: false, error: null, refresh: async () => {} }));
jest.mock('../../hooks/useCommunityMe', () => ({
  __esModule: true,
  default: (...args) => mockUseCommunityMe(...args),
}));

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
  // F-18 (evidence B-1/B-2/B-3): the three hero states added by the final
  // certification repair. Matched on their own copy, as heroNoPlan already
  // is, because none of them carries the training hero's options button.
  heroWeekComplete: (tree) => flattenText(tree).includes('Every session done this week'),
  heroBlockComplete: (tree) => flattenText(tree).includes('Every week of this block is done'),
  heroPlanNoSessions: (tree) => flattenText(tree).includes('Your plan has no sessions yet'),
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
const plateauSurfacingMod = require('../../lib/plateauSurfacing');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

// FOUNDER DECISION (fully free, no tier split, no trial): HomeScreen no
// longer imports lib/payments/cascade, lib/coachResponse or
// lib/differentialPaywall at all (the trial-ending fact, the free-tier
// weekly line and the differential paywall badge are retired), so their
// module handles and DEFAULT_LIB/LIB_MODULES entries (stageOf,
// canStillTrial, trialEndsAtMs, daysRemaining, buildFreeCoachLine,
// detectDifferentialTrigger) are retired with them.
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
  getAllRoutineExerciseCounts: async () => ({}),
  getRecentWorkoutFeedback: async () => [],
  getPlannedMuscleVolume: async () => [],
  getAllExercises: async () => [],
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
  selectPlateauForBanner: () => null,
};

const LIB_MODULES = {
  resolveProgrammePosition: programmePositionMod,
  shouldDeload: algorithmsMod,
  resolveActivationNudge: activationNudgeMod,
  reEntryCheckDue: reEntryCheckMod,
  isCompletedCoachDecision: coachDecisionMod,
  selectPlateauForBanner: plateauSurfacingMod,
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
    weekResolved: false,
  });
}
// F-18 (B-1): the position with every required session resolved. This is what
// `resolveProgrammePosition` really returns once the week's work is done -
// `nextSession: null` with `weekResolved: true` - and the real isWeekComplete
// (deliberately NOT stubbed by applyFixture) reads it.
function resolvedWeekPosition(recoveryState = null) {
  return async () => ({
    nextSession: null,
    sessions: [{ routineId: 'r1', state: 'completed' }],
    activeWeekId: 'w1',
    blockId: 'b1',
    recoveryState,
    weekResolved: true,
  });
}
function completedWorkout(id, daysAgo = 1) {
  return { id, isCompleted: true, startedAt: Date.now() - daysAgo * 86400000, endedAt: Date.now() - daysAgo * 86400000 };
}

// ─── D231 fixtures and helpers ─────────────────────────────────────────────
const UID = 'u-state-matrix';
const { COACHING_SETUP_COPY } = require('../../lib/coachingSetup');
const { NUDGE_STAGE, activationBannerLine } = require('../../lib/activationNudge');

beforeEach(() => {
  mockPlanChoice = false;
  mockPlanNote = null;
  mockCapRestrictions = [];
  mockCapNothingSetUp = false;
  mockDismissChoice.mockClear();
  mockDismissNote.mockClear();
  mockUseCommunityMe.mockClear();
});

const NOTE = {
  title: 'Your plan has been updated',
  subtitle: 'What changed, and why',
  lines: [
    { id: 'kept', text: 'Your sessions and your exercises are as they were.' },
    { id: 'cap', text: 'No exercise goes above 4 sets.' },
  ],
};
const CHIP_LABEL = 'See the shape of your training block and what the effort target means';
const todayLineNode = (tree) => findByTestID(tree, 'today-line')[0];
const dismissNode = (tree) => findByTestID(tree, 'today-line-dismiss')[0];
const count = (haystack, needle) => haystack.split(needle).length - 1;

async function press(node) {
  expect(node).toBeTruthy();
  await TestRenderer.act(async () => {
    node.props.onPress();
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

// An established person on a normal day with a plan: nothing else is eligible,
// so whatever the line or the offer slot shows is what the test put there.
function established(extraDb = {}, extraLib = {}) {
  applyFixture({
    db: {
      ...withPlan(),
      getAllWorkouts: async () => [completedWorkout('w1', 1)],
      getMorningWeightToday: async () => ({ weightKg: 82 }),
      ...extraDb,
    },
    lib: { resolveProgrammePosition: programmePosition(null), ...extraLib },
  });
}
const LIMITATION_ROW = (over = {}) => ({
  role: 'episode', effectiveChoice: 'applied', adaptationMode: 'x', episodeGroupId: 'g1', __awaiting: true, __subject: 'your shoulder', ...over,
});

// ─── 1. The Today line takes over three cards ─────────────────────────────
describe('D231: the plan update choice is a Today line occupant, not a card', () => {
  test('shows the spec sentence; the old card is not in the scroll', async () => {
    useAppStore.setState(PRO_USER);
    mockPlanChoice = true;
    established();
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(REGION.todayLineText(tree)).toBe('Your plan can be updated. It needs a choice from you.');
    // The old card's body and its two buttons are gone.
    expect(flattenText(tree)).not.toContain('Updating it needs a choice from you');
    expect(findByLabel(tree, 'Update your plan')).toHaveLength(0);
    expect(findByLabel(tree, /^Not now\. Hides this card/)).toHaveLength(0);
  });

  test('tap opens the Plan update flow exactly as the card\'s "Update your plan" did', async () => {
    useAppStore.setState(PRO_USER);
    mockPlanChoice = true;
    established();
    const nav = makeNav();
    const { tree } = await mountHome({ navigation: nav });
    await press(todayLineNode(tree));
    expect(nav.navigate).toHaveBeenCalledWith('PlansTab', { screen: 'PlanUpdate', initial: false });
  });

  test('dismiss is the card\'s "Not now": the same stored dismissal for this plan, and the line goes', async () => {
    useAppStore.setState(PRO_USER);
    mockPlanChoice = true;
    established();
    const { tree } = await mountHome({});
    expect(dismissNode(tree)).toBeTruthy();
    await press(dismissNode(tree));
    expect(mockDismissChoice).toHaveBeenCalledTimes(1);
    expect(mockDismissChoice).toHaveBeenCalledWith(UID, 'p1');
    expect(REGION.todayLine(tree)).toBe(false);
  });

  test('with no choice due there is no occupant (the card\'s own condition is kept)', async () => {
    useAppStore.setState(PRO_USER);
    mockPlanChoice = false;
    established();
    const { tree } = await mountHome({});
    expect(REGION.todayLine(tree)).toBe(false);
  });
});

describe('D231: the plan-rebuilt note is a Today line occupant that opens a sheet', () => {
  test('shows the spec sentence; the note\'s lines are not standing on Today', async () => {
    useAppStore.setState(PRO_USER);
    mockPlanNote = NOTE;
    established();
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(REGION.todayLineText(tree)).toBe('Your plan was updated. See what changed.');
    expect(flattenText(tree)).not.toContain('Your sessions and your exercises are as they were.');
    expect(findByLabel(tree, 'Got it. Hides this note for good.')).toHaveLength(0);
    expect(dismissNode(tree)).toBeUndefined();
  });

  test('tap opens the note\'s own title and lines with "Got it"; opening alone retires nothing', async () => {
    useAppStore.setState(PRO_USER);
    mockPlanNote = NOTE;
    established();
    const { tree } = await mountHome({});
    await press(todayLineNode(tree));
    const text = flattenText(tree);
    expect(text).toContain('Your plan has been updated');
    expect(text).toContain('Your sessions and your exercises are as they were.');
    expect(text).toContain('No exercise goes above 4 sets.');
    expect(findByLabel(tree, 'Got it. Hides this note for good.').length).toBeGreaterThan(0);
    expect(mockDismissNote).not.toHaveBeenCalled();
    // The line is still there until it is retired.
    expect(REGION.todayLineText(tree)).toBe('Your plan was updated. See what changed.');
  });

  test('"Got it" retires it exactly as the card\'s "Got it" did: the lib dismissal, the sheet closes, the line goes', async () => {
    useAppStore.setState(PRO_USER);
    mockPlanNote = NOTE;
    established();
    const { tree } = await mountHome({});
    await press(todayLineNode(tree));
    await press(findByLabel(tree, 'Got it. Hides this note for good.').find((n) => typeof n.props.onPress === 'function'));
    expect(mockDismissNote).toHaveBeenCalledTimes(1);
    expect(mockDismissNote).toHaveBeenCalledWith(UID);
    expect(REGION.todayLine(tree)).toBe(false);
    expect(flattenText(tree)).not.toContain('Your sessions and your exercises are as they were.');
  });
});

describe('D231: a limitation waiting for a decision is a Today line occupant', () => {
  test('exactly one "Still need it?" prompt pending: its own sentence, tap opens Injuries & limitations', async () => {
    useAppStore.setState(PRO_USER);
    mockCapRestrictions = [LIMITATION_ROW()];
    established();
    const nav = makeNav();
    const { tree, errors } = await mountHome({ navigation: nav });
    expect(errors).toEqual([]);
    const sentence = 'You thought you would be back to your shoulder by about now. Still need it?';
    expect(REGION.todayLineText(tree)).toBe(sentence);
    // One place only: the old row in the Injuries & limitations group is gone.
    expect(count(flattenText(tree), sentence)).toBe(1);
    await press(todayLineNode(tree));
    expect(nav.navigate).toHaveBeenCalledWith('HowYouTrain');
  });

  test('one prompt pending with no nameable subject: the unnamed sentence', async () => {
    useAppStore.setState(PRO_USER);
    mockCapRestrictions = [LIMITATION_ROW({ __subject: null })];
    established();
    const { tree } = await mountHome({});
    expect(REGION.todayLineText(tree)).toBe('You thought this would be done by about now. Still need it?');
  });

  test('more than one pending: the generic sentence, never one prompt\'s subject', async () => {
    useAppStore.setState(PRO_USER);
    mockCapRestrictions = [
      LIMITATION_ROW({ episodeGroupId: 'g1', __subject: 'your shoulder' }),
      LIMITATION_ROW({ episodeGroupId: 'g2', __subject: 'your knee' }),
    ];
    established();
    const { tree } = await mountHome({});
    expect(REGION.todayLineText(tree)).toBe('A change to your limitations is waiting for your decision.');
    expect(flattenText(tree)).not.toContain('Still need it?');
    expect(flattenText(tree)).not.toContain('back to your shoulder');
  });

  test('a rule that arrived undecided: the generic sentence, once', async () => {
    useAppStore.setState(PRO_USER);
    mockCapRestrictions = [LIMITATION_ROW({ effectiveChoice: null, __awaiting: false })];
    established();
    const { tree } = await mountHome({});
    expect(REGION.todayLineText(tree)).toBe('A change to your limitations is waiting for your decision.');
    expect(count(flattenText(tree), 'A change to your limitations is waiting for your decision.')).toBe(1);
  });

  test('an applied rule with nothing to decide: no occupant, but the quiet works-around row stays in its group until batch 2', async () => {
    useAppStore.setState(PRO_USER);
    mockCapRestrictions = [LIMITATION_ROW({ __awaiting: false })];
    established();
    const { tree } = await mountHome({});
    expect(REGION.todayLine(tree)).toBe(false);
    expect(findByLabel(tree, /Open Injuries & limitations$/).length).toBe(1);
  });
});

// ─── 2. Rank order through the real screen ────────────────────────────────
describe('D231: rank order, through the real screen', () => {
  const COACH_OUTPUT = async () => ({ weekStart: Date.now(), adjustments: { calories: { applied: true, newKcal: 2100 } }, hasEnoughData: true });

  test('block finished (main card is the training hero) > plan update choice; the choice takes the line while the "Block complete" card is up', async () => {
    useAppStore.setState(PRO_USER);
    mockPlanChoice = true;
    established({
      getCurrentMesocycleWeek: async () => ({ awaitingDecision: true, mesocycleId: 'm1', weekIndex: 6, plannedWeeks: 6 }),
    }, { resolveProgrammePosition: resolvedWeekPosition(null) });
    const { tree } = await mountHome({});
    expect(REGION.heroBlockComplete(tree)).toBe(true);
    // The "Block complete" main card says it, so the line moves on to the next rank.
    expect(REGION.todayLineText(tree)).toBe('Your plan can be updated. It needs a choice from you.');
    // Pick another session: the main card is the training hero, which does not say the block is finished.
    await press(findByLabel(tree, 'Do another session from your plan')[0]);
    await press(findByLabel(tree, 'Day 1, Push Day')[0]);
    expect(REGION.heroPlanned(tree)).toBe(true);
    expect(REGION.todayLineText(tree)).toBe('Block finished. Choose what comes next.');
  });

  test('plan update choice > coaching decision; dismissing the choice hands the line to the decision', async () => {
    useAppStore.setState(PRO_USER);
    mockPlanChoice = true;
    established({ getLatestCoachOutput: COACH_OUTPUT }, { isCompletedCoachDecision: () => true });
    const { tree } = await mountHome({});
    expect(REGION.todayLineText(tree)).toBe('Your plan can be updated. It needs a choice from you.');
    await press(dismissNode(tree));
    expect(REGION.todayLineText(tree)).toBe('Calories adjusted to 2100 kcal. See why.');
  });

  test('coaching decision > limitation decision > recovery week', async () => {
    useAppStore.setState(PRO_USER);
    mockCapRestrictions = [LIMITATION_ROW()];
    const RECOVERY = { state: 'planned_block_recovery', weekIndex: 6, plannedWeeks: 6, recoveryWeek: 6, weeksToRecovery: 0 };
    established({
      getLatestCoachOutput: COACH_OUTPUT,
      getCurrentMesocycleWeek: async () => ({ weekIndex: 6, plannedWeeks: 6, mesocycleId: 'm1', isDeload: true, recoveryState: RECOVERY }),
    }, { isCompletedCoachDecision: () => true, resolveProgrammePosition: programmePosition(RECOVERY) });
    const first = await mountHome({});
    expect(REGION.todayLineText(first.tree)).toBe('Calories adjusted to 2100 kcal. See why.');
    await press(dismissNode(first.tree));
    expect(REGION.todayLineText(first.tree)).toBe('You thought you would be back to your shoulder by about now. Still need it?');
    // Without the limitation, the recovery week is next.
    TestRenderer.act(() => { first.tree.unmount(); });
    currentTree = null;
    mockCapRestrictions = [];
    restoreFixture();
    await AsyncStorage.clear();
    established({
      getCurrentMesocycleWeek: async () => ({ weekIndex: 6, plannedWeeks: 6, mesocycleId: 'm1', isDeload: true, recoveryState: RECOVERY }),
    }, { resolveProgrammePosition: programmePosition(RECOVERY) });
    const second = await mountHome({});
    expect(REGION.todayLineText(second.tree)).toBe('Recovery week. Training is deliberately lighter. What that means.');
  });

  test('re-entry > plan-rebuilt note; without re-entry the note takes the line', async () => {
    useAppStore.setState(PRO_USER);
    mockPlanNote = NOTE;
    established({}, { reEntryCheckDue: () => ({ key: 'reentry-1', daysAway: 21 }) });
    const first = await mountHome({});
    expect(REGION.todayLineText(first.tree)).toBe('Welcome back. A quick question before your next session.');
    TestRenderer.act(() => { first.tree.unmount(); });
    currentTree = null;
    restoreFixture();
    await AsyncStorage.clear();
    established();
    const second = await mountHome({});
    expect(REGION.todayLineText(second.tree)).toBe('Your plan was updated. See what changed.');
  });
});

// ─── 3. Dedupe ─────────────────────────────────────────────────────────────
describe('D231 dedupe: "Block complete" main card', () => {
  const BLOCK_DONE = { awaitingDecision: true, mesocycleId: 'm1', weekIndex: 6, plannedWeeks: 6 };

  test('the line does not say "Block finished" while the main card says "Block complete"; nothing else on Today says it either', async () => {
    useAppStore.setState(PRO_USER);
    established({ getCurrentMesocycleWeek: async () => BLOCK_DONE });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(REGION.heroBlockComplete(tree)).toBe(true);
    expect(REGION.todayLine(tree)).toBe(false);
    expect(flattenText(tree)).not.toContain('Block finished');
  });

  test('the block chip keeps only its new part', async () => {
    useAppStore.setState(PRO_USER);
    established({ getCurrentMesocycleWeek: async () => BLOCK_DONE });
    const { tree } = await mountHome({});
    const chip = findByLabel(tree, CHIP_LABEL);
    expect(chip).toHaveLength(1);
    expect(textOf(chip[0])).toBe('Sets stay as light as a recovery week until you choose what comes next.');
  });
});

describe('D231 dedupe: "Week complete" main card', () => {
  const resolved = () => ({ resolveProgrammePosition: resolvedWeekPosition(null) });

  test('shows no chip repeating "Every session done for this week."', async () => {
    useAppStore.setState(PRO_USER);
    established({}, resolved());
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(REGION.heroWeekComplete(tree)).toBe(true);
    expect(findByLabel(tree, CHIP_LABEL)).toHaveLength(0);
    expect(flattenText(tree)).not.toContain('Every session done for this week.');
    // The card itself still says it, once.
    expect(count(flattenText(tree), 'Every session done this week')).toBe(1);
  });

  test('the training hero keeps its chip (only the Week complete card drops it)', async () => {
    useAppStore.setState(PRO_USER);
    established({ getCurrentMesocycleWeek: async () => ({ weekIndex: 2, plannedWeeks: 6, mesocycleId: 'm1', recoveryState: null }) });
    const { tree } = await mountHome({});
    expect(REGION.heroPlanned(tree)).toBe(true);
    expect(findByLabel(tree, CHIP_LABEL)).toHaveLength(1);
  });
});

// ─── 4. One offer slot ─────────────────────────────────────────────────────
describe('D231: one offer at a time, directly under the main card', () => {
  const NO_COACHING = { ...PRO_USER, userProfile: { ...PRO_USER.userProfile, coachingDeferred: true } };
  const NEW_ACCOUNT = { session: { user: { id: UID, created_at: new Date().toISOString() } } };
  const stalled = () => ({ resolveActivationNudge: () => ({ stage: NUDGE_STAGE.STALLED_1 }) });
  const OFFER = {
    coaching: (tree) => flattenText(tree).includes(COACHING_SETUP_COPY.body),
    coachingRow: (tree) => findByLabel(tree, "Coaching isn't set up yet. Set up coaching").length > 0,
    injuries: (tree) => flattenText(tree).includes('Anything Volyume should build your training around?'),
    community: (tree) => flattenText(tree).includes('See who is training'),
    nudge: (tree) => flattenText(tree).includes(activationBannerLine(NUDGE_STAGE.STALLED_1).title),
  };
  const shown = (tree) => Object.entries({
    coaching: OFFER.coaching(tree), injuries: OFFER.injuries(tree), community: OFFER.community(tree), nudge: OFFER.nudge(tree),
  }).filter(([, on]) => on).map(([k]) => k);

  test('all four eligible: only the full Set up coaching card shows', async () => {
    useAppStore.setState({ ...NO_COACHING, ...NEW_ACCOUNT });
    mockCapNothingSetUp = true;
    established({}, stalled());
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(shown(tree)).toEqual(['coaching']);
  });

  test('coaching set up, the other three eligible: only the injuries question shows', async () => {
    useAppStore.setState({ ...PRO_USER, ...NEW_ACCOUNT });
    mockCapNothingSetUp = true;
    established({}, stalled());
    const { tree } = await mountHome({});
    expect(shown(tree)).toEqual(['injuries']);
  });

  test('injuries question dismissed: only "See who is training" shows', async () => {
    useAppStore.setState({ ...PRO_USER, ...NEW_ACCOUNT });
    mockCapNothingSetUp = true;
    await AsyncStorage.setItem(`@volyume_hyt_offer_${UID}`, 'true');
    established({}, stalled());
    const { tree } = await mountHome({});
    expect(shown(tree)).toEqual(['community']);
  });

  test('both dismissed: only the getting-started nudge shows', async () => {
    useAppStore.setState({ ...PRO_USER, ...NEW_ACCOUNT });
    mockCapNothingSetUp = true;
    await AsyncStorage.setItem(`@volyume_hyt_offer_${UID}`, 'true');
    await AsyncStorage.setItem(`@volyume_community_intro_${UID}`, JSON.stringify({ count: 2, sessionsAtDismiss: 1 }));
    established({}, stalled());
    const { tree } = await mountHome({});
    expect(shown(tree)).toEqual(['nudge']);
  });

  test('nothing eligible: no offer at all', async () => {
    useAppStore.setState({ ...PRO_USER, ...NEW_ACCOUNT });
    // Something is already set up under Injuries & limitations (mockCapNothingSetUp is false), and the
    // Community introduction was dismissed for good.
    await AsyncStorage.setItem(`@volyume_community_intro_${UID}`, JSON.stringify({ count: 2, sessionsAtDismiss: 1 }));
    established();
    const { tree } = await mountHome({});
    expect(shown(tree)).toEqual([]);
  });

  test('the nudge keeps its safety gate: never shown under an open ED flag', async () => {
    useAppStore.setState({ ...PRO_USER, ...NEW_ACCOUNT });
    await AsyncStorage.setItem(`@volyume_hyt_offer_${UID}`, 'true');
    await AsyncStorage.setItem(`@volyume_community_intro_${UID}`, JSON.stringify({ count: 2, sessionsAtDismiss: 1 }));
    established({ getOpenEdPatternFlag: async () => ({ id: 'flag-1' }) }, stalled());
    const { tree } = await mountHome({});
    expect(OFFER.nudge(tree)).toBe(false);
    expect(shown(tree)).toEqual([]);
  });

  test('the offer sits directly under the main card: after the hero, before the last-session row', async () => {
    useAppStore.setState({ ...PRO_USER, ...NEW_ACCOUNT });
    mockCapNothingSetUp = true;
    established();
    const { tree } = await mountHome({});
    const txt = flattenText(tree);
    const hero = txt.indexOf('Push Day');
    const offer = txt.indexOf('Anything Volyume should build your training around?');
    const lastSession = txt.indexOf('Repeat');
    expect(hero).toBeGreaterThan(-1);
    expect(offer).toBeGreaterThan(hero);
    expect(lastSession).toBeGreaterThan(offer);
  });

  test('the quiet "Coaching isn\'t set up yet" row is not an offer: it shows alongside the next offer', async () => {
    useAppStore.setState({ ...NO_COACHING, ...NEW_ACCOUNT });
    mockCapNothingSetUp = true;
    // The full card already showed today, so Today carries the quiet row (the card's own once-a-day rule).
    await AsyncStorage.setItem(`@volyume_coaching_card_${UID}`, JSON.stringify({ fullDay: require('../../lib/dayKey').localDayKey(Date.now()) }));
    established();
    const { tree } = await mountHome({});
    expect(OFFER.coaching(tree)).toBe(false);
    expect(OFFER.coachingRow(tree)).toBe(true);
    expect(OFFER.injuries(tree)).toBe(true);
  });

  test('the injuries question keeps its timing: it waits for the first logged session', async () => {
    useAppStore.setState({ ...PRO_USER, ...NEW_ACCOUNT });
    mockCapNothingSetUp = true;
    established({ getAllWorkouts: async () => [] });
    const { tree } = await mountHome({});
    expect(OFFER.injuries(tree)).toBe(false);
    expect(flattenText(tree)).not.toContain('Welcome to Volyume');
  });

  test('...or for the old welcome-dismissed flag, for an existing user who retired the card', async () => {
    useAppStore.setState({ ...PRO_USER, ...NEW_ACCOUNT });
    mockCapNothingSetUp = true;
    await AsyncStorage.setItem(`@volyume_home_welcome_${UID}`, 'true');
    established({ getAllWorkouts: async () => [] });
    const { tree } = await mountHome({});
    expect(OFFER.injuries(tree)).toBe(true);
  });

  test('the plateau note is not an offer: it still shows at the bottom while an offer holds the slot', async () => {
    useAppStore.setState({ ...PRO_USER, ...NEW_ACCOUNT });
    mockCapNothingSetUp = true;
    established({}, {
      selectPlateauForBanner: () => ({ exerciseId: 'ex1', weeks: 4, sessions: 4, selectedFrom: 1 }),
    });
    const db = require('../../lib/database');
    const prevEx = db.getExerciseById;
    db.getExerciseById = async () => ({ id: 'ex1', name: 'Bench Press' });
    try {
      const { tree } = await mountHome({});
      expect(OFFER.injuries(tree)).toBe(true);
      expect(findByLabel(tree, /Bench Press/).length).toBeGreaterThan(0);
      expect(flattenText(tree).indexOf('Bench Press')).toBeGreaterThan(flattenText(tree).indexOf('Anything Volyume should build your training around?'));
    } finally {
      db.getExerciseById = prevEx;
    }
  });
});

// ─── 5. Gone from Today ────────────────────────────────────────────────────
describe('D231: what left Today', () => {
  test('no Welcome card for a brand-new person: the main card starts the first workout', async () => {
    useAppStore.setState(PRO_USER);
    applyFixture({
      db: { ...withPlan(), getAllWorkouts: async () => [] },
      lib: { resolveProgrammePosition: programmePosition(null) },
    });
    const { tree } = await mountHome({});
    expect(REGION.welcomeCard(tree)).toBe(false);
    expect(flattenText(tree)).not.toContain('Welcome to Volyume');
    expect(flattenText(tree)).not.toContain('Start a session below');
    expect(flattenText(tree)).toContain('Start workout');
  });

  test('the header carries no Community button: no right slot, so the default brand mark shows', async () => {
    useAppStore.setState(PRO_USER);
    established();
    const { tree } = await mountHome({});
    const ScreenHeader = require('../../components/ScreenHeader').default;
    const headers = tree.root.findAllByType(ScreenHeader);
    expect(headers).toHaveLength(1);
    expect(headers[0].props.title).toBe('Today');
    expect(headers[0].props.right).toBeUndefined();
    expect(findByLabel(tree, /^Community(,|$)/)).toHaveLength(0);
  });

  test('no challenge row, even for an entrant, and Today never reads challenges', async () => {
    useAppStore.setState(PRO_USER);
    const challenges = require('../../lib/challenges/api');
    const spy = jest.spyOn(challenges, 'myChallenges').mockResolvedValue([{ id: 'c1', status: 'active', title: 'Gym challenge', score: 42, days_left: 5 }]);
    try {
      established();
      const { tree } = await mountHome({});
      expect(flattenText(tree)).not.toContain('Gym challenge');
      expect(findByLabel(tree, /challenge/i)).toHaveLength(0);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  test('the Community tab dot stays published: Today mounts the hook the removed button used to mount', async () => {
    useAppStore.setState(PRO_USER);
    established();
    await mountHome({});
    expect(mockUseCommunityMe).toHaveBeenCalled();
  });

  test('the old standalone cards are gone from the scroll and the rows left the Injuries & limitations group', async () => {
    useAppStore.setState(PRO_USER);
    mockPlanChoice = true;
    mockPlanNote = NOTE;
    mockCapRestrictions = [LIMITATION_ROW()];
    established();
    const { tree } = await mountHome({});
    const txt = flattenText(tree);
    // One line shows (the choice); the note and the decision wait their turn, and none stands as a card or a row.
    expect(findByTestID(tree, 'today-line')).toHaveLength(1);
    expect(txt).not.toContain('Updating it needs a choice from you');
    expect(txt).not.toContain('Your sessions and your exercises are as they were.');
    expect(txt).not.toContain('Still need it?');
  });
});
