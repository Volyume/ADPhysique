/**
 * HomeScreen - kit trial 2 (LOC-412; parent LOC-409), design rule 1 on the
 * WHOLE Today screen: "Amber means act here and nothing else: exactly one solid
 * amber button per screen; every other action is outlined or plain text; the
 * only other amber is the focus ring on the input being edited. No amber
 * decoration." Rule 8 is the one stated exception, the coach check-in notice's
 * amber outline.
 *
 * A REAL MOUNT of HomeScreen (the mock scaffold below is copied verbatim from
 * HomeScreen.d231Today.test.js, the proven set for mounting this screen), with
 * the kit's real styling pipeline (kitTestEnv.js), then a walk of every rendered
 * host node for any colour that is one of the theme's ambers (primary,
 * primaryFill and the primaryBg tint, in every palette, compared by RGB so a
 * tinted alpha counts too). This is the screen-level check the first
 * hand-over lacked: it rendered the session card alone, so it could not see a
 * Today-line tint, a banner icon or an offer card's amber tile.
 *
 * Not covered here, said plainly: the weigh-in strip (TodayStrip) is a
 * weight-adjacent surface and is deliberately NOT touched by this trial; its
 * "Log" is the house `primary` Button (a raised charcoal surface, not amber)
 * and it draws no amber, which this test also reads wherever the strip shows.
 * The pull-to-refresh spinner's tint is the system progress indicator and is
 * excluded by name.
 */
jest.mock('react-native', () => require('../../components/ui/__tests__/kitTestEnv').reactNativeMock());

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
let mockCapUnavailable = false;
jest.mock('../../lib/capability/resolve', () => ({
  ...jest.requireActual('../../lib/capability/resolve'),
  loadCapabilityResolveState: jest.fn(async () => ({ restrictions: mockCapRestrictions, unavailable: mockCapUnavailable, stale: false })),
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
  mockCapUnavailable = false;
  mockDismissChoice.mockClear();
  mockDismissNote.mockClear();
  mockUseCommunityMe.mockClear();
});



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


// ─── Kit trial 2: rule 1 across the whole Today screen ─────────────────────
const kitEnv = require('../../components/ui/__tests__/kitTestEnv');
const { resolveTheme } = require('../../styles/theme');

kitEnv.loadNativeInteropRuntime();
const { PALETTES, hostNodes, normaliseColour, flatStyle } = kitEnv;

const colorsFor = (prefs) => resolveTheme({ theme: 'dark', ...prefs, largerText: false }).colors;
const hexOf = (c) => normaliseColour(c).hex;

// The ambers of every palette (RGB only: a tint of amber is still amber).
const AMBER_HEX = new Set();
const NEUTRAL_HEX = new Set();
for (const { prefs } of PALETTES) {
  const c = colorsFor(prefs);
  for (const k of ['primary', 'primaryFill', 'primaryBg']) AMBER_HEX.add(hexOf(c[k]));
  for (const k of ['background', 'surface', 'surface2', 'surfaceElevated', 'border', 'borderSubtle', 'textPrimary', 'textSecondary', 'textMuted', 'onPrimary', 'success', 'error']) {
    if (c[k]) NEUTRAL_HEX.add(hexOf(c[k]));
  }
}

const COLOUR_KEYS = ['backgroundColor', 'borderColor', 'color', 'tintColor'];
const REFRESH_SPINNER = /^RefreshControl$/;

// Every amber use under the tree: { type, key, hex, solid }.
function amberUses(tree) {
  const uses = [];
  for (const node of hostNodes(tree)) {
    if (REFRESH_SPINNER.test(String(node.type))) continue;
    const style = flatStyle(node.props.style);
    const candidates = [];
    for (const key of COLOUR_KEYS) {
      if (style[key] !== undefined) candidates.push([key, style[key]]);
    }
    // Ionicons and Lucide icons carry their colour as a prop.
    if (typeof node.props.color === 'string') candidates.push(['color', node.props.color]);
    for (const [key, value] of candidates) {
      if (typeof value !== 'string') continue;
      const { hex, alpha } = normaliseColour(value);
      // A border colour with no border width draws nothing (the kit's Alert hands
      // its class to its text context, so the sentence carries the colour too).
      if (key === 'borderColor' && !(Number(style.borderWidth) > 0)) continue;
      if (AMBER_HEX.has(hex) && alpha > 0) {
        uses.push({ type: String(node.type), key, hex, alpha, solid: key === 'backgroundColor' && alpha >= 0.99 });
      }
    }
  }
  return uses;
}
const solidAmber = (tree) => amberUses(tree).filter((u) => u.solid);
const otherAmber = (tree) => amberUses(tree).filter((u) => !u.solid);
const describeUses = (uses) => uses.map((u) => `${u.type}.${u.key}=${u.hex}@${u.alpha.toFixed(2)}`);

const COACH_OUTPUT = async () => ({ weekStart: Date.now(), adjustments: { calories: { applied: true, newKcal: 2100 } }, hasEnoughData: true });
const NO_COACHING = { ...PRO_USER, userProfile: { ...PRO_USER.userProfile, coachingDeferred: true } };
const NEW_ACCOUNT = { session: { user: { id: UID, created_at: new Date().toISOString() } } };

jest.setTimeout(120000);
// Compile the kit styles and load the screen's whole import graph once, up front,
// so no test pays for a cold load (the first mount alone took about 40 s).
beforeAll(() => { kitEnv.setUpKitStyles(); require('../HomeScreen'); }, 240000);

test('sanity: no amber hex is also a neutral token in any palette, so the scan cannot misread ink or a surface as amber', () => {
  const clash = [...AMBER_HEX].filter((h) => NEUTRAL_HEX.has(h));
  expect(clash).toEqual([]);
});

// Each state is a function that arranges the fixtures. `solid` is the number of
// solid amber fills the state must show; `outline` is how many amber
// non-fill uses it may show (the check-in notice's outline, rule 8) and no more.
const STATES = [
  {
    name: 'a planned session',
    solid: 1,
    outline: 0,
    arrange: () => { useAppStore.setState(PRO_USER); established(); },
  },
  {
    name: 'a planned session with the coach check-in notice',
    solid: 1,
    outline: 1,
    arrange: () => {
      useAppStore.setState(PRO_USER);
      established({ getLatestCoachOutput: COACH_OUTPUT }, { isCompletedCoachDecision: () => true });
    },
    expectText: 'Calories adjusted to 2100 kcal. See why.',
  },
  {
    name: 'a planned session with a plan-update notice (a non-coach Today-line occupant)',
    solid: 1,
    outline: 0,
    arrange: () => { useAppStore.setState(PRO_USER); mockPlanChoice = true; established(); },
    expectText: 'Your plan can be updated. It needs a choice from you.',
  },
  {
    name: 'a limitation waiting for a decision (another non-coach occupant)',
    solid: 1,
    outline: 0,
    arrange: () => { useAppStore.setState(PRO_USER); mockCapRestrictions = [LIMITATION_ROW()]; established(); },
    expectText: 'Still need it?',
  },
  {
    name: 'the injuries offer under the session card',
    solid: 1,
    outline: 0,
    arrange: () => { useAppStore.setState({ ...PRO_USER, ...NEW_ACCOUNT }); mockCapNothingSetUp = true; established(); },
    expectText: 'Anything Volyume should build your training around?',
  },
  {
    name: 'the "See who is training" offer',
    solid: 1,
    outline: 0,
    arrange: async () => {
      useAppStore.setState({ ...PRO_USER, ...NEW_ACCOUNT });
      mockCapNothingSetUp = true;
      await AsyncStorage.setItem(`@volyume_hyt_offer_${UID}`, 'true');
      established();
    },
    expectText: 'See who is training',
  },
  {
    name: 'the getting-started nudge',
    solid: 1,
    outline: 0,
    arrange: async () => {
      useAppStore.setState({ ...PRO_USER, ...NEW_ACCOUNT });
      mockCapNothingSetUp = true;
      await AsyncStorage.setItem(`@volyume_hyt_offer_${UID}`, 'true');
      await AsyncStorage.setItem(`@volyume_community_intro_${UID}`, JSON.stringify({ count: 2, sessionsAtDismiss: 1 }));
      established({}, { resolveActivationNudge: () => ({ stage: NUDGE_STAGE.STALLED_1 }) });
    },
    expectText: activationBannerLine(NUDGE_STAGE.STALLED_1).title,
  },
  {
    name: 'the "Coaching isn\'t set up yet" row and the full coaching card',
    solid: 1,
    outline: 0,
    arrange: () => { useAppStore.setState({ ...NO_COACHING, ...NEW_ACCOUNT }); mockCapNothingSetUp = true; established(); },
    expectText: COACHING_SETUP_COPY.body,
  },
  {
    name: 'the lift plateau note',
    solid: 1,
    outline: 0,
    arrange: () => {
      useAppStore.setState({ ...PRO_USER, ...NEW_ACCOUNT });
      mockCapNothingSetUp = true;
      established({}, { selectPlateauForBanner: () => ({ exerciseId: 'ex1', weeks: 4, sessions: 4, selectedFrom: 1 }) });
    },
    db: { getExerciseById: async () => ({ id: 'ex1', name: 'Bench Press' }) },
    expectText: 'Bench Press',
  },
  {
    name: 'week complete (no session to start)',
    solid: 0,
    outline: 0,
    arrange: () => { useAppStore.setState(PRO_USER); established({}, { resolveProgrammePosition: resolvedWeekPosition(null) }); },
    expectText: 'Every session done this week',
  },
  {
    name: 'block complete',
    solid: 1,
    outline: 0,
    arrange: () => {
      useAppStore.setState(PRO_USER);
      established(
        { getCurrentMesocycleWeek: async () => ({ awaitingDecision: true, mesocycleId: 'm1', weekIndex: 6, plannedWeeks: 6 }) },
        { resolveProgrammePosition: resolvedWeekPosition(null) },
      );
    },
    expectText: 'Every week of this block is done',
  },
  {
    name: 'no plan yet (the first-workout card)',
    solid: 1,
    outline: 0,
    arrange: () => {
      useAppStore.setState(PRO_USER);
      applyFixture({ db: { getActivePlan: async () => null, getAllWorkouts: async () => [] }, lib: {} });
    },
    expectText: 'Start your first workout',
  },
];

describe.each(PALETTES)('Today, palette: $name', ({ prefs }) => {
  beforeAll(() => { kitEnv.setPalette(prefs); });

  test.each(STATES)('rule 1: $name', async (state) => {
    const db = require('../../lib/database');
    const prev = {};
    try {
      await state.arrange();
      // After the fixture: applyFixture would otherwise overwrite these.
      for (const k of Object.keys(state.db || {})) { prev[k] = db[k]; db[k] = state.db[k]; }
      const { tree, errors } = await mountHome({});
      expect(errors).toEqual([]);
      if (state.expectText) expect(flattenText(tree)).toContain(state.expectText);
      // Exactly the solid amber fills the state is allowed (the one primary action).
      expect(describeUses(solidAmber(tree))).toHaveLength(state.solid);
      // No other amber: no tint, no amber icon, no amber ink, no amber edge,
      // except the coach check-in notice's outline (rule 8).
      const others = otherAmber(tree);
      expect(describeUses(others)).toHaveLength(state.outline);
      if (state.outline) {
        expect(others.every((u) => u.key === 'borderColor')).toBe(true);
      }
    } finally {
      for (const k of Object.keys(prev)) db[k] = prev[k];
    }
  });
});
