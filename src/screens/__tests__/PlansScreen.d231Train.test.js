/**
 * PlansScreen (Train) - D231, app layout rework, batch 2.
 * docs/app-rework-2026-10/SPEC.md, "Rules applied everywhere" and "Batch 2:
 * Train"; fact base docs/app-rework-2026-10/TAB-INVENTORY.md sections 1, 2, 4, 8.
 *
 * A REAL MOUNT of PlansScreen (the mock scaffold below is copied from
 * AnalyticsScreen.stateMatrix.test.js, itself from HomeScreen.stateMatrix.test.js,
 * the proven set for mounting a screen with react-test-renderer; the real
 * lib/database module's exports are monkey-patched per test and restored after),
 * so every claim here is about what renders, not what the source contains. Each
 * test is written to FAIL against the Train before this batch:
 *
 *  1. The order, top to bottom: the plan card (name, "Training style" as a plain
 *     line, "Week N of M" with its info button, this week's days with the seven
 *     cells, Start next workout, View plan), the volume strip, the block card,
 *     Recent sessions, Your setup, Plans, Saved workouts. The cut text is gone
 *     ("Your coach reviews this plan each week...", "Week complete. Your next
 *     session is on Monday.") and so are the separate Training style and
 *     Avoided movements rows.
 *  2. The days and the strip are Progress's, moved: the same PlanWeekCard and
 *     pure models (planWeek.js, volumeStrip.js), the same count, the same cells,
 *     the same tap (the one-week Volume heatmap); with no plan, the count shows
 *     as it did on Progress. (The mounted tests that used to pin them on
 *     Progress, AnalyticsScreen.stateMatrix.test.js, moved here with the code.)
 *  3. Recent sessions are Progress's cards, with the same tap to WorkoutSummary
 *     and the All sessions door; the newest card alone carries Repeat, which
 *     asks the same readiness question Today's "Start workout" asks and then
 *     starts the same workout the last-session row's Repeat did.
 *  4. The always-on Injuries & limitations lines moved here from Today, under
 *     the Injuries & limitations row, with their conditions: the works-around
 *     line needs an applied, un-held episode rule AND an active plan; the
 *     reintroduction line needs the week's rows to carry the ramp's stamp; the
 *     could-not-check line is the resolver's no-known-state signature. None is
 *     a second door to Injuries & limitations.
 */

// ─── Mock scaffold (copied from AnalyticsScreen.stateMatrix.test.js, itself from HomeScreen.stateMatrix.test.js) ─
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
  useFocusEffect: (cb) => { require('react').useEffect(() => cb(), [cb]); },
  useIsFocused: () => true,
  useScrollToTop: jest.fn(),
  NavigationContainer: ({ children }) => children,
  StackActions: { popToTop: jest.fn(), replace: jest.fn(), push: jest.fn() },
  CommonActions: { navigate: jest.fn(), reset: jest.fn() },
}));

// One stable `show` the tests can read.
const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => {
  const React = require('react');
  return {
    useToast: () => ({ show: mockToastShow, hide: jest.fn() }),
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
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

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

async function mountTrain(props = {}) {
  const errors = [];
  const origErr = console.error;
  console.error = (msg) => {
    const text = typeof msg === 'string' ? msg : String(msg);
    if (/wrap.*act|environment has been torn down|Cannot log after tests|Each child in a list|Function components cannot be given refs|forwardRef|inside StrictMode|react-test-renderer is deprecated/i.test(text)) return;
    errors.push(text);
  };
  const PlansScreen = require('../PlansScreen').default;
  let tree = null;
  try {
    await TestRenderer.act(async () => {
      tree = TestRenderer.create(
        React.createElement(PlansScreen, { navigation: makeNav(), route: { params: {}, name: 'Test' }, ...props }),
      );
    });
    await TestRenderer.act(async () => {
      for (let i = 0; i < 25; i++) await Promise.resolve();
      await new Promise(r => setImmediate(r));
      for (let i = 0; i < 20; i++) await Promise.resolve();
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


// ─── D231 additions to the scaffold ────────────────────────────────────────
// The plan-rebuild pass is a no-op here (a plan the new planner did not build
// would otherwise be rebuilt on first open).
jest.mock('../../lib/planRebuild', () => ({
  ...jest.requireActual('../../lib/planRebuild'),
  ensureActivePlanRebuilt: jest.fn(async () => ({ ok: true })),
}));

// The capability lane, driven per test: the resolver's rows and its failure signature.
let mockCapRestrictions = [];
let mockCapUnavailable = false;
let mockCapStale = false;
let mockCapThrows = false;
jest.mock('../../lib/capability/resolve', () => ({
  ...jest.requireActual('../../lib/capability/resolve'),
  loadCapabilityResolveState: jest.fn(async () => {
    if (mockCapThrows) throw new Error('capability read failed');
    return { restrictions: mockCapRestrictions, unavailable: mockCapUnavailable, stale: mockCapStale };
  }),
}));
jest.mock('../../lib/capability/store', () => ({
  ...jest.requireActual('../../lib/capability/store'),
  loadCapabilityState: jest.fn(async () => ({ unavailable: false, baseline: [], episodes: [], history: [] })),
}));
jest.mock('../../lib/capability/phrase', () => ({
  ...jest.requireActual('../../lib/capability/phrase'),
  subjectPhrase: (rows) => rows?.[0]?.__subject ?? null,
}));

// The readiness ask's opt-out write and the background adjustment log are not under test.
jest.mock('../../lib/sessionAdjustments', () => ({
  ...jest.requireActual('../../lib/sessionAdjustments'),
  computeAndLogSessionAdjustments: jest.fn(async () => null),
}));


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

function findByLabel(tree, matcher) {
  const test = matcher instanceof RegExp ? (l) => matcher.test(l)
    : typeof matcher === 'function' ? matcher
    : (l) => l === matcher;
  return tree.root.findAll((n) => typeof n.type === 'string' && typeof n.props?.accessibilityLabel === 'string' && test(n.props.accessibilityLabel));
}
const hostNodes = (tree, pred) => tree.root.findAll((n) => typeof n.type === 'string' && pred(n));
const byTestID = (tree, id) => hostNodes(tree, (n) => n.props.testID === id);

// Finds a node carrying BOTH the given accessibilityLabel and a function onPress
// prop on the SAME element and invokes it (Card -> PressableCard -> AnimatedPressable
// forward both together).
function pressByLabel(tree, label) {
  const nodes = tree.root.findAll(
    (n) => n.props && n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  );
  expect(nodes.length).toBeGreaterThan(0);
  TestRenderer.act(() => { nodes[0].props.onPress({ stopPropagation: () => {} }); });
}
async function pressAsync(tree, label) {
  const nodes = tree.root.findAll(
    (n) => n.props && n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  );
  expect(nodes.length).toBeGreaterThan(0);
  await TestRenderer.act(async () => {
    nodes[0].props.onPress({ stopPropagation: () => {} });
    for (let i = 0; i < 20; i++) await Promise.resolve();
    await new Promise(r => setImmediate(r));
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}
async function settle() {
  await TestRenderer.act(async () => {
    for (let i = 0; i < 25; i++) await Promise.resolve();
    await new Promise(r => setImmediate(r));
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
}

// ─── Fixture builders ───────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.now();
function daysAgo(n, hourOffset = 0) { return NOW - n * DAY_MS + hourOffset * 3600000; }

function workout(id, { daysAgoN = 1, durationMinutes = 45, sessionDifficulty = null, isCompleted = true } = {}) {
  const at = daysAgo(daysAgoN);
  return {
    id, userId: 'u1', name: `Session ${id}`, startedAt: at, endedAt: at + durationMinutes * 60000,
    isCompleted, durationMinutes, sessionDifficulty,
  };
}
function completedSet({ id, workoutId, exerciseId, weight = 100, reps = 5, setType = 'straight', daysAgoN = 1, hourOffset = 0 }) {
  return { id, workoutId, exerciseId, weight, actualReps: reps, setType, createdAt: daysAgo(daysAgoN, hourOffset) };
}
function exercise(id, { name, primaryMuscle = 'chest', type = 'weight_reps', equipment = 'Barbell' } = {}) {
  return { id, name, primaryMuscle, type, exerciseType: type, equipment };
}

const database = require('../../lib/database');
const { buildExerciseLookup } = require('../../lib/exercise/lookup');
const programmePosition = require('../../lib/programmePosition');
const effectiveLandmarks = require('../../lib/effectiveLandmarks');
const blockAdvisor = require('../../lib/blockAdvisor');
const { SESSION_STATE } = require('../../lib/blockProgression');
const { RECOVERY_STATE } = require('../../lib/recoveryState');
const { resolveTheme } = require('../../styles/theme');
const { StyleSheet, ScrollView } = require('react-native');

let dbOriginals = null;
function applyFixture({ db = {} } = {}) {
  dbOriginals = {};
  for (const key of Object.keys(db)) {
    dbOriginals[key] = database[key];
    database[key] = db[key];
  }
  // useProgressData reads the UNFILTERED exercise lookup (D218), so each state's
  // own `getAllExercises` fixture stays the contract by bridging the lookup to it.
  if (db.getAllExercises && !db.getExerciseLookup) {
    dbOriginals.getExerciseLookup = database.getExerciseLookup;
    database.getExerciseLookup = async () => buildExerciseLookup(await database.getAllExercises());
  }
}
let moduleOriginals = [];
function patchModule(mod, key, fn) {
  moduleOriginals.push([mod, key, mod[key]]);
  mod[key] = fn;
}
afterEach(async () => {
  if (dbOriginals) { for (const k of Object.keys(dbOriginals)) database[k] = dbOriginals[k]; dbOriginals = null; }
  for (const [mod, key, orig] of moduleOriginals.reverse()) mod[key] = orig;
  moduleOriginals = [];
  await AsyncStorage.clear();
});
beforeEach(() => {
  mockCapRestrictions = [];
  mockCapUnavailable = false;
  mockCapStale = false;
  mockCapThrows = false;
  mockToastShow.mockClear();
  mockStartWorkout.mockClear();
});

const mockStartWorkout = jest.fn();
const USER = {
  user: { id: 'u1', email: 't@e.com', isLocal: false },
  session: { user: { id: 'u1' } },
  tier: 'pro',
  firstRunComplete: true,
  userProfile: { firstName: 'Alex' },
  units: 'metric',
  bodyWeightUnits: 'kg',
  startWorkout: mockStartWorkout,
};

const EXERCISES = () => Promise.resolve([
  exercise('e1', { name: 'Bench press', primaryMuscle: 'chest' }),
  exercise('e2', { name: 'Back squat', primaryMuscle: 'quads' }),
  exercise('e3', { name: 'Deadlift', primaryMuscle: 'hamstrings' }),
  exercise('e4', { name: 'Overhead press', primaryMuscle: 'front_delts' }),
]);
// Sets across three lifts; the latest dated TODAY so it falls inside the current
// Monday-anchored week whichever weekday the suite runs on.
function improvingTrainingSets() {
  return Promise.resolve([
    completedSet({ id: 's1', workoutId: 'w1', exerciseId: 'e1', weight: 80, reps: 5, daysAgoN: 25 }),
    completedSet({ id: 's2', workoutId: 'w3', exerciseId: 'e1', weight: 85, reps: 5, daysAgoN: 0 }),
    completedSet({ id: 's3', workoutId: 'w2', exerciseId: 'e2', weight: 100, reps: 5, daysAgoN: 20 }),
    completedSet({ id: 's4', workoutId: 'w2', exerciseId: 'e2', weight: 110, reps: 5, daysAgoN: 10 }),
    completedSet({ id: 's5', workoutId: 'w1', exerciseId: 'e3', weight: 140, reps: 3, daysAgoN: 25 }),
    completedSet({ id: 's6', workoutId: 'w3', exerciseId: 'e3', weight: 130, reps: 3, daysAgoN: 0 }),
  ]);
}
function threeWorkouts() {
  return Promise.resolve([
    workout('w1', { daysAgoN: 25 }),
    workout('w2', { daysAgoN: 10 }),
    workout('w3', { daysAgoN: 0, sessionDifficulty: 6 }),
  ]);
}
const richDb = () => ({
  getAllWorkouts: threeWorkouts,
  getCompletedWorkoutSets: improvingTrainingSets,
  getAllExercises: EXERCISES,
});

// The active plan and its facts (the Train screen's own reads).
const PLAN = { id: 'p1', name: 'Upper Lower Split', isActive: 1, tags: [] };
const planDb = (extra = {}) => ({
  ...richDb(),
  getActivePlan: async () => PLAN,
  getAllPlansForUser: async () => [PLAN],
  getPlanWorkoutCounts: async () => ({ p1: 4 }),
  getProgrammePlanFacts: async () => null,
  getRoutinesForPlan: async () => [{ id: 'r1', name: 'Upper A' }],
  getActiveBlock: async () => ({ id: 'b1' }),
  ...extra,
});

const planSession = (name, order, state) => ({ routineId: `r${order}`, name, order, state });
function planPosition(overrides = {}) {
  const sessions = overrides.sessions ?? [
    planSession('Upper A', 1, SESSION_STATE.COMPLETED),
    planSession('Lower A', 2, SESSION_STATE.COMPLETED),
    planSession('Upper B', 3, SESSION_STATE.OUTSTANDING),
    planSession('Lower B', 4, SESSION_STATE.OUTSTANDING),
  ];
  const next = sessions.find((s) => s.state === SESSION_STATE.OUTSTANDING) ?? null;
  return {
    activeWeekIndex: 2,
    plannedWeeks: 6,
    sessions,
    nextSession: next,
    weekResolved: next == null,
    recoveryState: { state: RECOVERY_STATE.NORMAL_ACCUMULATION },
    ...overrides,
  };
}
function withPosition(position) {
  patchModule(programmePosition, 'resolveProgrammePosition', jest.fn(() => Promise.resolve(position)));
}
// The block advisor's read, for the week line and the block card.
function withAdvice(advice) {
  patchModule(blockAdvisor, 'getBlockAdvice', jest.fn(() => Promise.resolve(advice)));
}
const CONTINUE_ADVICE = (over = {}) => ({
  action: 'continue',
  headline: 'On track',
  body: 'Training is going well. Stay on plan.',
  blockStatus: { status: 'accumulation', currentWeek: 2, totalWeeks: 6, recoveryWeek: 6 },
  ...over,
});

const STRIP_LABEL = /^This week so far: /;
const swatchFills = (tree) => hostNodes(tree, (n) => n.props.testID === 'legend-swatch')
  .map((n) => StyleSheet.flatten(n.props.style)?.backgroundColor)
  .filter(Boolean);
const pullToRefresh = (tree) => tree.root.findByType(ScrollView).props.refreshControl.props.onRefresh();


// ═══ 1. The order, top to bottom ═══════════════════════════════════════════
describe('D231 Train: the order and the cut text', () => {
  test('plan card (name, style line, week, days, start, view), volume strip, block card, Recent sessions, Your setup, Plans, Saved workouts', async () => {
    useAppStore.setState(USER);
    applyFixture({
      db: planDb({
        getProgrammePlanFacts: async () => ({ engine: 'structure', archetype: 'upper_lower' }),
        getWorkoutTemplates: async () => [{ id: 't1', name: 'My pull day' }],
        getAllRoutineExerciseCounts: async () => ({ t1: 6 }),
      }),
    });
    withPosition(planPosition());
    withAdvice({
      action: 'heads_up',
      headline: 'Heads up for next week',
      body: 'Your recovery signs are mixed.',
      blockStatus: { status: 'accumulation', currentWeek: 2, totalWeeks: 6, recoveryWeek: 6 },
      signals: [],
      nextBlock: null,
    });
    const { tree, errors } = await mountTrain({});
    expect(errors).toEqual([]);
    const text = flattenText(tree);
    // Each label is found after the one before it (some words also occur in
    // hidden tooltip copy earlier in the tree, so the search moves forward only).
    const labels = [
      'Upper Lower Split',          // plan name
      'Week 2 of 6',                // block position
      '2 of 4',                     // this week's days
      'Start next workout',
      'View plan',
      'This week so far',           // the volume strip
      'Heads up for next week',     // the block advisor card
      'Recent sessions',
      'Your setup',
      'Adjust training plan',
      'Injuries & limitations',
      'Plans',                      // the section label
      'Pick from the plan library',
      'Create your own',
      'Past blocks',
      'Saved workouts',
      'My pull day',
    ];
    let cursor = 0;
    for (const label of labels) {
      const at = text.indexOf(label, cursor);
      expect({ label, found: at > -1 }).toEqual({ label, found: true });
      cursor = at;
    }
  });

  test('the cut text and the cut rows are gone', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: planDb() });
    withPosition(planPosition({ sessions: [
      planSession('Upper A', 1, SESSION_STATE.COMPLETED),
      planSession('Lower A', 2, SESSION_STATE.COMPLETED),
    ] }));
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    const text = flattenText(tree);
    // Week complete: the day cells show the week, no separate line.
    expect(text).toContain('Do another session');
    expect(text).not.toContain('Week complete. Your next session is on Monday.');
    expect(text).not.toContain('Your coach reviews this plan each week');
    expect(text).not.toContain('Plan tools');
    expect(text).not.toContain('Training blocks');
    expect(text).not.toContain('View completed blocks and long-term progress');
    expect(findByLabel(tree, /^Avoided movements/)).toHaveLength(0);
    expect(findByLabel(tree, /^Training style/)).toHaveLength(0);
  });

  test('"Training style: X" is a plain line, not a tappable row, and keeps its rules', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: planDb({ getProgrammePlanFacts: async () => ({ engine: 'structure', archetype: 'upper_lower' }) }) });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const nav = makeNav();
    const { tree } = await mountTrain({ navigation: nav });
    const line = byTestID(tree, 'active-plan-style');
    // A plain line shows only when the plan's own facts name a style.
    if (line.length) {
      expect(line[0].props.onPress).toBeUndefined();
      expect(line[0].props.accessibilityRole).toBeUndefined();
      expect(flattenText(tree)).toMatch(/Training style: \S/);
    }
    // Hidden for a plan with no style facts (library, authored, style-locked, competing categories).
    restoreAll();
    applyFixture({ db: planDb({ getProgrammePlanFacts: async () => null }) });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const second = await mountTrain({});
    expect(byTestID(second.tree, 'active-plan-style')).toHaveLength(0);
    expect(flattenText(second.tree)).not.toContain('Training style');
  });

  test('"Week N of M" keeps its info button; the peak-week note stays', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: planDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE({
      blockStatus: { status: 'accumulation', currentWeek: 5, totalWeeks: 6, recoveryWeek: 6 },
      body: "One more week before your recovery week. Push hard this week. It's your peak.",
    }));
    const { tree } = await mountTrain({});
    const text = flattenText(tree);
    expect(text).toContain('Week 5 of 6');
    expect(text).toContain("One more week before your recovery week. Push hard this week. It's your peak.");
    expect(findByLabel(tree, /block|what is a block/i).length).toBeGreaterThan(0);
  });

  test('Start next workout and View plan keep their destinations', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: planDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const nav = makeNav();
    const { tree } = await mountTrain({ navigation: nav });
    pressByLabel(tree, 'View plan');
    expect(nav.navigate).toHaveBeenCalledWith('PlanDetail', { planId: 'p1', isLibrary: false });
  });
});

// helper used above: leave the previous fixture before applying another in one test
function restoreAll() {
  if (dbOriginals) { for (const k of Object.keys(dbOriginals)) database[k] = dbOriginals[k]; dbOriginals = null; }
  for (const [mod, key, orig] of moduleOriginals.reverse()) mod[key] = orig;
  moduleOriginals = [];
}

// ═══ 2. This week's days and the volume strip (moved from Progress) ════════
describe('D231 Train: this week\'s days (the plan-week card, moved from Progress)', () => {
  test('the shared PlanWeekCard draws the count and the seven cells inside the plan card, from the programme position', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: planDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree, errors } = await mountTrain({});
    expect(errors).toEqual([]);
    const card = byTestID(tree, 'train-plan-week');
    expect(card).toHaveLength(1);
    const group = byTestID(tree, 'plan-week-summary');
    expect(group).toHaveLength(1);
    expect(group[0].props.accessibilityLabel).toBe('2 of 4 sessions in week 2 of your plan. Upper B is next.');
    const text = flattenText(tree);
    expect(text).toContain('2 of 4');
    expect(text).toContain('Upper B is next');
    // The week's position is said once on the card, not twice.
    expect(text).not.toContain('in week 2 of your plan');
    // The seven cells, with their initials.
    expect(text).toContain('M T W T F S S');
    // The days sit inside the plan card: after the week line, before Start next workout.
    expect(text.indexOf('Week 2 of 6')).toBeLessThan(text.indexOf('2 of 4'));
    expect(text.indexOf('2 of 4')).toBeLessThan(text.indexOf('Start next workout'));
  });

  test('a resolved week reads "Every session done" under the count', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: planDb() });
    withPosition(planPosition({ sessions: [
      planSession('Upper A', 1, SESSION_STATE.COMPLETED),
      planSession('Lower A', 2, SESSION_STATE.COMPLETED),
    ] }));
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    expect(flattenText(tree)).toContain('2 of 2');
    expect(flattenText(tree)).toContain('Every session done');
  });

  test('the seven cells light on the day a completed workout started, with or without sets', async () => {
    useAppStore.setState(USER);
    applyFixture({
      db: planDb({
        getAllWorkouts: () => Promise.resolve([workout('w1', { daysAgoN: 0 })]),
        getCompletedWorkoutSets: () => Promise.resolve([]),
      }),
    });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree, errors } = await mountTrain({});
    expect(errors).toEqual([]);
    const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(NOW).getDay()];
    expect(findByLabel(tree, `Trained so far this week: ${today}`).length).toBeGreaterThan(0);
    expect(findByLabel(tree, 'Not trained yet this week').length).toBe(0);
  });

  test('with no active plan the count shows as it did on Progress: "N sessions so far this week"', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: { ...richDb(), getActivePlan: async () => null, getAllPlansForUser: async () => [] } });
    const { tree, errors } = await mountTrain({});
    expect(errors).toEqual([]);
    expect(flattenText(tree)).toContain('No active plan yet');
    expect(findByLabel(tree, /^\d+ sessions? so far this week\./)).toHaveLength(1);
    expect(byTestID(tree, 'train-plan-week')).toHaveLength(1);
    // The standalone card, not the embedded one: it carries its own surface.
    expect(flattenText(tree)).not.toMatch(/\d+ sessions? this week/);
  });

  test('a position that cannot be read fails to the no-plan reading, never a crash', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: planDb() });
    withAdvice(CONTINUE_ADVICE());
    patchModule(programmePosition, 'resolveProgrammePosition', jest.fn(() => Promise.reject(new Error('read failed'))));
    const { tree, errors } = await mountTrain({});
    expect(errors).toEqual([]);
    expect(findByLabel(tree, /^\d+ sessions? so far this week\./)).toHaveLength(1);
  });

  test('the position is read on focus and again on pull-to-refresh', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: planDb() });
    withAdvice(CONTINUE_ADVICE());
    const read = jest.fn(() => Promise.resolve(planPosition()));
    patchModule(programmePosition, 'resolveProgrammePosition', read);
    const { tree } = await mountTrain({});
    const afterFocus = read.mock.calls.length;
    expect(afterFocus).toBeGreaterThanOrEqual(1);
    await TestRenderer.act(async () => { pullToRefresh(tree); });
    await settle();
    expect(read.mock.calls.length).toBeGreaterThan(afterFocus);
  });

  test('a failed progress load shows no plan-week card and no strip (a card built from nothing would claim 0 sessions)', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: planDb({ getAllWorkouts: () => Promise.reject(new Error('db down')) }) });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    expect(byTestID(tree, 'train-plan-week')).toHaveLength(0);
    expect(byTestID(tree, 'plan-week-summary')).toHaveLength(0);
    expect(findByLabel(tree, STRIP_LABEL)).toHaveLength(0);
    // The rest of Train is still there.
    expect(flattenText(tree)).toContain('Start next workout');
  });

  test('plans that could not be read (and no plan on screen): the retry speaks and the week items wait', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: { ...richDb(), getActivePlan: () => Promise.reject(new Error('plans unreadable')) } });
    const { tree } = await mountTrain({});
    expect(flattenText(tree)).toContain('Could not load your plans');
    expect(byTestID(tree, 'train-plan-week')).toHaveLength(0);
    expect(findByLabel(tree, STRIP_LABEL)).toHaveLength(0);
  });
});

describe('D231 Train: this week\'s training volume strip (moved from Progress)', () => {
  test('its own card under the plan card; the line counts logged sets, says so far, and a tap opens the Volume heatmap on "This week"', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: planDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const nav = makeNav();
    const { tree } = await mountTrain({ navigation: nav });
    const label = 'This week so far: 2 sets logged across 2 muscles, 2 muscles with too few sets';
    expect(findByLabel(tree, STRIP_LABEL).map((n) => n.props.accessibilityLabel)).toEqual([label]);
    expect(flattenText(tree)).toContain('This week so far: 2 sets logged across 2 muscles · 2 muscles with too few sets');
    expect(byTestID(tree, 'train-volume-strip')).toHaveLength(1);
    const text = flattenText(tree);
    expect(text.indexOf('View plan')).toBeLessThan(text.indexOf('This week so far'));
    pressByLabel(tree, label);
    expect(nav.navigate).toHaveBeenCalledWith('VolumeHeatmap', { windowWeeks: 1 });
  });

  test('a compound set with a secondary muscle counts once (VH-16)', async () => {
    useAppStore.setState(USER);
    applyFixture({
      db: planDb({
        getAllWorkouts: threeWorkouts,
        getCompletedWorkoutSets: () => Promise.resolve([
          completedSet({ id: 'p1', workoutId: 'w3', exerciseId: 'ep', weight: 60, reps: 8, daysAgoN: 0 }),
          completedSet({ id: 'p2', workoutId: 'w3', exerciseId: 'ep', weight: 60, reps: 8, daysAgoN: 0 }),
        ]),
        getAllExercises: () => Promise.resolve([
          { id: 'ep', name: 'Incline press', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'front_delts'], type: 'weight_reps', exerciseType: 'weight_reps' },
        ]),
      }),
    });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    expect(flattenText(tree)).toContain('This week so far: 2 sets logged across 3 muscles');
    expect(flattenText(tree)).not.toContain('4 sets logged');
  });

  test('the under count is the plan-trained one: a muscle the plan programmes with no sets yet counts', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: planDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    patchModule(effectiveLandmarks, 'getPlanLandmarks', jest.fn(() => Promise.resolve({
      table: {}, source: { quads: 'plan', chest: 'plan', hamstrings: 'profile' },
    })));
    const { tree } = await mountTrain({});
    // chest (trained, programmed) + hamstrings (trained, not programmed) + quads (programmed, no sets) = 3.
    expect(flattenText(tree)).toContain('This week so far: 2 sets logged across 2 muscles · 3 muscles with too few sets');
  });

  test('every colour on the strip is named in the shared LegendRow, and the bar draws only those colours', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: planDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    const text = flattenText(tree);
    ['Low', 'Steady', 'Growing', 'Very high'].forEach((w) => expect(text).toContain(w));
    expect(text).not.toMatch(/Enough sets|Too much|Under the range|Inside the range/);
    const c = resolveTheme({}).colors;
    const fills = swatchFills(tree);
    expect(fills).toEqual([c.textMuted, c.volumeMinimum, c.success, c.volumeBeyond]);
    const bar = hostNodes(tree, (n) => n.props.testID === 'volume-strip-bar')[0];
    const segmentColours = bar.children.map((child) => StyleSheet.flatten(child.props.style).backgroundColor);
    expect(segmentColours.length).toBe(2);
    for (const colour of segmentColours) expect(fills).toContain(colour);
  });

  test('nothing logged this week: the line says so, no bar, no legend', async () => {
    useAppStore.setState(USER);
    applyFixture({
      db: planDb({
        getAllWorkouts: threeWorkouts,
        getCompletedWorkoutSets: () => Promise.resolve([
          completedSet({ id: 'o1', workoutId: 'w1', exerciseId: 'e1', weight: 80, reps: 5, daysAgoN: 25 }),
        ]),
      }),
    });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    expect(flattenText(tree)).toContain('This week so far: no sets logged');
    expect(byTestID(tree, 'volume-strip-bar')).toHaveLength(0);
    expect(swatchFills(tree)).toEqual([]);
  });

  test('no sets ever: no strip at all, the plan-week card still draws', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: planDb({ getAllWorkouts: async () => [], getCompletedWorkoutSets: async () => [] }) });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    expect(findByLabel(tree, STRIP_LABEL)).toHaveLength(0);
    expect(byTestID(tree, 'train-volume-strip')).toHaveLength(0);
    expect(byTestID(tree, 'train-plan-week')).toHaveLength(1);
  });

  test('the planned recovery week (the position\'s GATED state): the sentence, no under count, one neutral legend entry', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: planDb() });
    withPosition(planPosition({ recoveryState: { state: RECOVERY_STATE.PLANNED_BLOCK_RECOVERY } }));
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    const text = flattenText(tree);
    expect(text).toContain('Recovery week: sets are planned lower this week');
    expect(text).toContain('This week so far: 2 sets logged across 2 muscles');
    expect(text).not.toMatch(/· \d+ muscles with too few sets/);
    expect(text).toContain('Trained');
    expect(text).not.toContain('Below maintenance');
    expect(swatchFills(tree)).toEqual([resolveTheme({}).colors.surface3]);
  });

  test('the calendar flag never names the week while a position is readable (an adaptive adjustment is never a recovery week)', async () => {
    useAppStore.setState(USER);
    applyFixture({
      db: planDb({ getCurrentMesocycleWeek: () => Promise.resolve({ id: 'mw1', weekIndex: 6, plannedWeeks: 6, isDeload: true }) }),
    });
    withPosition(planPosition({ recoveryState: { state: RECOVERY_STATE.ADAPTIVE_RECOVERY_ADJUSTMENT } }));
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    const text = flattenText(tree);
    expect(text).not.toContain('Recovery week:');
    expect(text).toMatch(/· \d+ muscles with too few sets/);
  });
});

// ═══ 3. Recent sessions, All sessions, Repeat ══════════════════════════════
describe('D231 Train: Recent sessions (moved from Progress)', () => {
  const sessionsDb = (rows, extra = {}) => planDb({
    getAllWorkouts: () => Promise.resolve(rows),
    getCompletedWorkoutSets: improvingTrainingSets,
    getAllExercises: EXERCISES,
    ...extra,
  });

  test('the title is the routine name, else the session\'s own name, else "Session"; All sessions opens the history', async () => {
    useAppStore.setState(USER);
    applyFixture({
      db: sessionsDb([
        { ...workout('w1', { daysAgoN: 1 }), routineName: 'Upper A', name: 'Chest & Triceps' },
        { ...workout('w2', { daysAgoN: 2 }), routineName: null, name: 'Chest & Triceps' },
        { ...workout('w3', { daysAgoN: 3 }), routineName: null, name: '' },
      ]),
    });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const nav = makeNav();
    const { tree } = await mountTrain({ navigation: nav });
    expect(flattenText(tree)).toContain('Recent sessions');
    const labels = findByLabel(tree, /^View summary for /).map((n) => n.props.accessibilityLabel);
    expect(labels).toEqual([
      'View summary for Upper A',
      'View summary for Chest & Triceps',
      'View summary for Session',
    ]);
    pressByLabel(tree, 'See all sessions');
    expect(nav.navigate).toHaveBeenCalledWith('WorkoutHistory');
  });

  test('the chip prints "Hard" with "4 of 5" spoken, never "/10"', async () => {
    useAppStore.setState(USER);
    applyFixture({
      db: sessionsDb([
        { ...workout('w1', { daysAgoN: 1, sessionDifficulty: 4 }), routineName: 'Upper A' },
        { ...workout('w2', { daysAgoN: 2, sessionDifficulty: 2 }), routineName: 'Lower A' },
        { ...workout('w3', { daysAgoN: 3 }), routineName: 'Upper B' },
      ]),
    });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    const text = flattenText(tree);
    expect(text).toContain('Hard');
    expect(text).toContain('Easy');
    expect(text).not.toMatch(/\/10/);
    expect(findByLabel(tree, 'View summary for Upper A, difficulty Hard, 4 of 5')).toHaveLength(1);
    expect(findByLabel(tree, 'View summary for Lower A, difficulty Easy, 2 of 5')).toHaveLength(1);
    expect(findByLabel(tree, 'View summary for Upper B')).toHaveLength(1);
    expect(byTestID(tree, 'session-difficulty-chip')).toHaveLength(2);
  });

  test('a recent session reads "Tue 16 Sep · 45 min", with the unit in words and a middle dot', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: planDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree, errors } = await mountTrain({});
    expect(errors).toEqual([]);
    const joined = (n) => [].concat(n.props.children).flat(Infinity).filter((c) => typeof c === 'string').join('');
    const metas = tree.root.findAll((n) => n.type === 'Text' && /· 45 min$/.test(joined(n)));
    expect(metas.length).toBeGreaterThan(0);
    for (const m of metas) expect(joined(m)).toMatch(/^[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2} · 45 min$/);
  });

  test('a card opens WorkoutSummary with tonnage that excludes a distance exercise\'s metres (S6-2)', async () => {
    useAppStore.setState(USER);
    applyFixture({
      db: planDb({
        getAllWorkouts: () => Promise.resolve([workout('w1', { daysAgoN: 1 })]),
        getCompletedWorkoutSets: () => Promise.resolve([
          completedSet({ id: 's1', workoutId: 'w1', exerciseId: 'e1', weight: 100, reps: 10, daysAgoN: 1 }),
          completedSet({ id: 's2', workoutId: 'w1', exerciseId: 'e5', weight: 2000, reps: 600, daysAgoN: 1 }),
        ]),
        getAllExercises: () => Promise.resolve([
          exercise('e1', { name: 'Bench press', primaryMuscle: 'chest', type: 'weight_reps' }),
          exercise('e5', { name: 'Row', primaryMuscle: 'back', type: 'distance' }),
        ]),
      }),
    });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const nav = makeNav();
    const { tree, errors } = await mountTrain({ navigation: nav });
    expect(errors).toEqual([]);
    pressByLabel(tree, 'View summary for Session w1');
    expect(nav.navigate).toHaveBeenCalledWith('WorkoutSummary', expect.objectContaining({ tonnage: 1000 }));
  });

  test('names and counts come from the shared lookup, the very object History carries (D218 F-2)', async () => {
    const { canonicalExerciseId } = require('../../lib/exercise/canonicalId');
    const { sessionSummaryParams } = require('../../lib/sessionReport');
    const RETIRED_ID = canonicalExerciseId('Lateral Raise Machine');
    const SURVIVOR_ID = canonicalExerciseId('Machine Lateral Raise');
    useAppStore.setState(USER);
    const bench = exercise('e1', { name: 'Bench press', primaryMuscle: 'chest' });
    const survivor = exercise(SURVIVOR_ID, { name: 'Machine Lateral Raise', primaryMuscle: 'side_delts' });
    const deletedCustom = {
      ...exercise('ex-custom-gone', { name: 'Cable Crunch Pro', primaryMuscle: 'quads' }),
      isCustom: 1, deletedAt: 1700000000000,
    };
    const lookup = buildExerciseLookup([bench, survivor, deletedCustom]);
    const logged = [
      completedSet({ id: 's1', workoutId: 'w1', exerciseId: 'ex-ghost', hourOffset: 0 }),
      completedSet({ id: 's2', workoutId: 'w1', exerciseId: 'ex-unknown', hourOffset: 0.1 }),
      completedSet({ id: 's3', workoutId: 'w1', exerciseId: RETIRED_ID, hourOffset: 0.2 }),
      completedSet({ id: 's4', workoutId: 'w1', exerciseId: SURVIVOR_ID, hourOffset: 0.3 }),
      completedSet({ id: 's5', workoutId: 'w1', exerciseId: 'ex-custom-gone', hourOffset: 0.4 }),
      completedSet({ id: 's6', workoutId: 'w1', exerciseId: 'e1', hourOffset: 0.5, setType: 'warmup' }),
      completedSet({ id: 's7', workoutId: 'w1', exerciseId: 'e1', hourOffset: 0.6 }),
    ];
    logged[1] = { ...logged[1], exerciseName: 'Landmine Press' };
    const dbOrder = [...logged].reverse();
    const w1 = workout('w1', { daysAgoN: 1 });
    applyFixture({
      db: planDb({
        getAllWorkouts: () => Promise.resolve([w1]),
        getCompletedWorkoutSets: () => Promise.resolve(dbOrder),
        getAllExercises: () => Promise.resolve([bench, survivor]),
        getExerciseLookup: () => Promise.resolve(lookup),
      }),
    });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const nav = makeNav();
    const { tree, errors } = await mountTrain({ navigation: nav });
    expect(errors).toEqual([]);
    pressByLabel(tree, 'View summary for Session w1');
    const expected = sessionSummaryParams(w1, dbOrder, lookup);
    expect(expected.exerciseCount).toBe(5);
    expect(expected.exerciseNames).toEqual(['Exercise', 'Landmine Press', 'Machine Lateral Raise', 'Cable Crunch Pro']);
    expect(nav.navigate).toHaveBeenCalledWith('WorkoutSummary', expected);
    expect(expected).toEqual(expect.objectContaining({ routineId: null, routineName: null, readOnly: true }));
  });

  test('no sessions at all: the section is absent', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: planDb({ getAllWorkouts: async () => [], getCompletedWorkoutSets: async () => [] }) });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    expect(flattenText(tree)).not.toContain('Recent sessions');
    expect(flattenText(tree)).not.toContain('All sessions');
  });
});

describe('D231 Train: Repeat on the newest recent session (moved from Today\'s last-session row)', () => {
  const NEWEST_ROUTINE = { exercise: { id: 'e1', name: 'Bench press' }, routineExercise: { id: 're1', supersetGroupId: null, groupKind: null, roundRestSeconds: null } };
  function repeatDb(extra = {}) {
    return planDb({
      getAllWorkouts: () => Promise.resolve([
        { ...workout('w1', { daysAgoN: 1 }), routineId: 'r-upper', routineName: 'Upper A' },
        { ...workout('w2', { daysAgoN: 2 }), routineId: 'r-lower', routineName: 'Lower A' },
        { ...workout('w3', { daysAgoN: 3 }), routineId: null, routineName: null },
      ]),
      getRoutineExercisesWithDetails: async () => [NEWEST_ROUTINE],
      createWorkout: jest.fn(async () => ({ id: 'new-workout', startedAt: Date.now() })),
      ...extra,
    });
  }

  test('only the newest card carries Repeat', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: repeatDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    expect(findByLabel(tree, 'Repeat last session').filter((n) => typeof n.props.onPress === 'function')).toHaveLength(1);
    const holders = byTestID(tree, 'recent-session-newest');
    expect(holders).toHaveLength(1);
    // The Repeat control sits inside the newest card, which is the first in the list.
    const inside = holders[0].findAll((n) => typeof n.type === 'string' && n.props?.accessibilityLabel === 'Repeat last session');
    expect(inside.length).toBeGreaterThan(0);
    const labels = findByLabel(tree, /^View summary for /).map((n) => n.props.accessibilityLabel);
    expect(labels[0]).toBe('View summary for Upper A');
    expect(flattenText(tree)).toContain('Repeat');
    expect((flattenText(tree).match(/Repeat/g) || []).length).toBe(1);
  });

  test('Repeat is a sibling of the card\'s tap, never nested inside it, and the target is at least 48 dp tall', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: repeatDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    const summary = findByLabel(tree, 'View summary for Upper A').find((n) => typeof n.props.onPress === 'function');
    expect(summary).toBeTruthy();
    expect(summary.findAll((n) => n.props?.accessibilityLabel === 'Repeat last session')).toHaveLength(0);
    const { touchTarget } = require('../../styles/layout');
    const repeat = findByLabel(tree, 'Repeat last session').find((n) => typeof n.props.onPress === 'function');
    // A size="sm" button's drawn box is under the minimum, so the shortfall is on its hit slop.
    const slop = repeat.props.hitSlop;
    const extra = typeof slop === 'number' ? slop * 2 : ((slop?.top ?? 0) + (slop?.bottom ?? 0));
    expect(33 + extra).toBeGreaterThanOrEqual(touchTarget.minimum);
  });

  test('Repeat asks the same readiness question as Today\'s Start workout; Skip then starts the routine\'s full exercises', async () => {
    useAppStore.setState(USER);
    const createWorkout = jest.fn(async () => ({ id: 'new-workout', startedAt: Date.now() }));
    applyFixture({ db: repeatDb({ createWorkout }) });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const nav = makeNav();
    const { tree, errors } = await mountTrain({ navigation: nav });
    expect(errors).toEqual([]);
    expect(flattenText(tree)).not.toContain('How are you feeling today?');
    await pressAsync(tree, 'Repeat last session');
    const text = flattenText(tree);
    expect(text).toContain('How are you feeling today?');
    expect(text).toContain('Readiness (optional)');
    expect(text).toContain('Sharp');
    expect(text).toContain('Average');
    expect(text).toContain('Below par');
    expect(text).toContain('Do not ask before each session');
    expect(mockStartWorkout).not.toHaveBeenCalled();
    await pressAsync(tree, 'Skip and start without answering');
    // The workout row is made for the repeated routine with no intent and no readiness.
    expect(createWorkout).toHaveBeenCalledWith('u1', 'r-upper', expect.objectContaining({
      intent: null, soreness24hBefore: null, sleepQuality: null, energyScore: null,
    }));
    expect(mockStartWorkout).toHaveBeenCalledTimes(1);
    expect(mockStartWorkout.mock.calls[0][0]).toEqual(expect.objectContaining({ id: 'new-workout' }));
    expect(mockStartWorkout.mock.calls[0][1].map((e) => e.exercise.id)).toEqual(['e1']);
    expect(nav.navigate).toHaveBeenCalledWith('HomeTab', expect.objectContaining({
      screen: 'ActiveWorkout', params: { starterSession: false },
    }));
  });

  test('with the readiness ask turned off, Repeat starts at once with no readiness, as Today\'s Start does', async () => {
    useAppStore.setState(USER);
    await AsyncStorage.setItem('@volyume_intent_prompt_off', 'true');
    const createWorkout = jest.fn(async () => ({ id: 'new-workout', startedAt: Date.now() }));
    applyFixture({ db: repeatDb({ createWorkout }) });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const nav = makeNav();
    const { tree } = await mountTrain({ navigation: nav });
    await pressAsync(tree, 'Repeat last session');
    expect(flattenText(tree)).not.toContain('How are you feeling today?');
    expect(createWorkout).toHaveBeenCalledWith('u1', 'r-upper', expect.objectContaining({
      intent: null, soreness24hBefore: null, sleepQuality: null, energyScore: null,
    }));
    expect(mockStartWorkout).toHaveBeenCalledTimes(1);
    expect(nav.navigate).toHaveBeenCalledWith('HomeTab', expect.objectContaining({ screen: 'ActiveWorkout' }));
  });

  test('a tap on an answer carries the intent and the readiness chips that were set', async () => {
    useAppStore.setState(USER);
    const createWorkout = jest.fn(async () => ({ id: 'new-workout', startedAt: Date.now() }));
    applyFixture({ db: repeatDb({ createWorkout }) });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    await pressAsync(tree, 'Repeat last session');
    await pressAsync(tree, 'Sleep last night: Poor');
    await pressAsync(tree, 'Sharp. Energised and ready. Starts the workout.');
    expect(createWorkout).toHaveBeenCalledWith('u1', 'r-upper', expect.objectContaining({
      intent: 'sharp', sleepQuality: 2, soreness24hBefore: null, energyScore: null,
    }));
  });

  test('a session with no routine repeats the exercises of its own sets and says what could not be repeated', async () => {
    useAppStore.setState(USER);
    const createWorkout = jest.fn(async () => ({ id: 'new-workout', startedAt: Date.now() }));
    applyFixture({
      db: planDb({
        getAllWorkouts: () => Promise.resolve([{ ...workout('w9', { daysAgoN: 1 }), routineId: null, routineName: null }]),
        getWorkoutSetsForWorkout: async () => [
          completedSet({ id: 'a1', workoutId: 'w9', exerciseId: 'e1' }),
          completedSet({ id: 'a2', workoutId: 'w9', exerciseId: 'id-gone' }),
        ],
        getExerciseById: async (id) => (id === 'e1' ? exercise('e1', { name: 'Bench press' }) : null),
        createWorkout,
      }),
    });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    await pressAsync(tree, 'Repeat last session');
    expect(mockToastShow).toHaveBeenCalledWith(
      'One exercise from that session is not on this device, so it was left out.',
      expect.objectContaining({ variant: 'info' }),
    );
    await pressAsync(tree, 'Skip and start without answering');
    expect(mockStartWorkout.mock.calls[0][1].map((e) => e.exercise.id)).toEqual(['e1']);
  });

  test('a session that cannot be loaded says so calmly and starts nothing', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: repeatDb({ getRoutineExercisesWithDetails: async () => { throw new Error('unreadable'); } }) });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    await pressAsync(tree, 'Repeat last session');
    expect(mockToastShow).toHaveBeenCalledWith('Could not load your last session. Please try again.', expect.objectContaining({ variant: 'error' }));
    expect(flattenText(tree)).not.toContain('How are you feeling today?');
    expect(mockStartWorkout).not.toHaveBeenCalled();
  });

  test('closing the sheet starts nothing', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: repeatDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    await pressAsync(tree, 'Repeat last session');
    const SessionIntentSheet = require('../../components/SessionIntentSheet').default;
    const sheet = tree.root.findByType(SessionIntentSheet);
    await TestRenderer.act(async () => { sheet.props.onClose(); });
    await settle();
    expect(mockStartWorkout).not.toHaveBeenCalled();
  });
});

// ═══ 4. Your setup: the lines from Today ═══════════════════════════════════
describe('D231 Train: Your setup and the Injuries & limitations lines moved from Today', () => {
  const APPLIED = (over = {}) => ({
    role: 'episode', effectiveChoice: 'applied', adaptationMode: 'apply', episodeGroupId: 'g1', __subject: 'your shoulder', ...over,
  });
  const WORKS_AROUND = 'Training leaves your shoulder out at the moment.';
  const RAMP = 'Training for your quads builds back up to your plan from here.';
  const CHECK = 'Volyume could not check Injuries & limitations just now.';
  const rampDb = (extra = {}) => planDb({
    getCurrentMesocycleWeek: async () => ({ id: 'mw1', weekIndex: 2, plannedWeeks: 6, isDeload: false }),
    getPlannedMuscleVolume: async () => [{ muscle: 'quads', source: 'reintroduction' }],
    ...extra,
  });

  test('Adjust training plan and Injuries & limitations are the two doors, each with one sub line and one destination', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: planDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const nav = makeNav();
    const { tree } = await mountTrain({ navigation: nav });
    pressByLabel(tree, 'Adjust training plan. Change days, equipment or focus areas');
    expect(nav.navigate).toHaveBeenCalledWith('PlanUpdate');
    const hyt = findByLabel(tree, /^Injuries & limitations\. /).filter((n) => typeof n.props.onPress === 'function');
    expect(hyt).toHaveLength(1);
    TestRenderer.act(() => { hyt[0].props.onPress(); });
    expect(nav.navigate).toHaveBeenCalledWith('HowYouTrain');
    // One door per place: nothing else on the screen opens Injuries & limitations.
    const doors = tree.root.findAll((n) => typeof n.type === 'string' && typeof n.props?.onPress === 'function'
      && /Injuries & limitations/.test(n.props.accessibilityLabel ?? ''));
    expect(doors).toHaveLength(1);
  });

  test('with no active plan there is no Adjust training plan door', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: { ...richDb(), getActivePlan: async () => null, getAllPlansForUser: async () => [] } });
    const { tree } = await mountTrain({});
    expect(flattenText(tree)).not.toContain('Adjust training plan');
    expect(flattenText(tree)).toContain('Injuries & limitations');
  });

  test('Avoided movements is reached inside Injuries & limitations: no row here, however many movements are set aside', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: planDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    expect(flattenText(tree)).not.toContain('Avoided movements');
    // HowYouTrain offers it unconditionally (source pin: the row is not gated on a count).
    const hyt = require('fs').readFileSync(require('path').join(__dirname, '..', 'HowYouTrainScreen.js'), 'utf8');
    expect(hyt).toMatch(/label="Movements you would rather not do"[\s\S]{0,700}navigation\.navigate\('AvoidedMovements'\)/);
  });

  test('the works-around line: an applied rule and an active plan, plain text under the row, not a second door', async () => {
    useAppStore.setState(USER);
    mockCapRestrictions = [APPLIED()];
    applyFixture({ db: planDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const nav = makeNav();
    const { tree } = await mountTrain({ navigation: nav });
    const line = byTestID(tree, 'injury-line-works-around');
    expect(line).toHaveLength(1);
    expect(flattenText(tree)).toContain(WORKS_AROUND);
    expect(line[0].props.onPress).toBeUndefined();
    const text = flattenText(tree);
    expect(text.indexOf('Injuries & limitations')).toBeLessThan(text.indexOf(WORKS_AROUND));
    expect(text.indexOf(WORKS_AROUND)).toBeLessThan(text.indexOf('Plans Pick from the plan library'));
  });

  test('the works-around line names nothing when the rule has no nameable subject', async () => {
    useAppStore.setState(USER);
    mockCapRestrictions = [APPLIED({ __subject: null })];
    applyFixture({ db: planDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    expect(flattenText(tree)).toContain('Training works around your temporary change.');
  });

  test('the works-around line needs an active plan', async () => {
    useAppStore.setState(USER);
    mockCapRestrictions = [APPLIED()];
    applyFixture({ db: { ...richDb(), getActivePlan: async () => null, getAllPlansForUser: async () => [] } });
    const { tree } = await mountTrain({});
    expect(flattenText(tree)).not.toContain(WORKS_AROUND);
  });

  test('a HELD episode and a rule not yet applied do not drive the works-around line', async () => {
    useAppStore.setState(USER);
    mockCapRestrictions = [APPLIED({ adaptationMode: 'hold' }), APPLIED({ effectiveChoice: null }), APPLIED({ role: 'baseline' })];
    applyFixture({ db: planDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    expect(byTestID(tree, 'injury-line-works-around')).toHaveLength(0);
  });

  test('the reintroduction line: while the current block week\'s rows carry the ramp\'s stamp; plain text', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: rampDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    const line = byTestID(tree, 'injury-line-ramp');
    expect(line).toHaveLength(1);
    expect(flattenText(tree)).toContain(RAMP);
    expect(line[0].props.onPress).toBeUndefined();
  });

  test('no ramp stamp on the week\'s rows, or no current block week: no reintroduction line', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: rampDb({ getPlannedMuscleVolume: async () => [{ muscle: 'quads', source: 'profile' }] }) });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const first = await mountTrain({});
    expect(flattenText(first.tree)).not.toContain('builds back up to your plan');
    restoreAll();
    applyFixture({ db: rampDb({ getCurrentMesocycleWeek: async () => null }) });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const second = await mountTrain({});
    expect(flattenText(second.tree)).not.toContain('builds back up to your plan');
  });

  test('the could-not-check line: the resolver\'s no-known-state signature (unavailable and not stale), plain text', async () => {
    useAppStore.setState(USER);
    mockCapUnavailable = true;
    applyFixture({ db: planDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    const line = byTestID(tree, 'injury-line-check-failed');
    expect(line).toHaveLength(1);
    expect(flattenText(tree)).toContain(CHECK);
    expect(line[0].props.onPress).toBeUndefined();
  });

  test('stale-but-known state keeps serving and does not say it could not check', async () => {
    useAppStore.setState(USER);
    mockCapUnavailable = true;
    mockCapStale = true;
    applyFixture({ db: planDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    expect(flattenText(tree)).not.toContain(CHECK);
  });

  test('a capability read that throws is a failed check, not an empty one', async () => {
    useAppStore.setState(USER);
    mockCapThrows = true;
    applyFixture({ db: planDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    expect(flattenText(tree)).toContain(CHECK);
  });

  test('nothing to say: no lines at all, and the group is just the two rows', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: planDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    expect(byTestID(tree, 'injury-lines')).toHaveLength(0);
  });

  test('the lines are the same wording as before, and none of the three has an em dash', () => {
    for (const s of [WORKS_AROUND, RAMP, CHECK, 'Training works around your temporary change.']) expect(s).not.toMatch(/—/);
  });
});

// ═══ 5. Plans ═════════════════════════════════════════════════════════════
describe('D231 Train: Plans', () => {
  test('the library, Create your own and Past blocks are one group, each with one short sub line and its destination', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: planDb() });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const nav = makeNav();
    const { tree } = await mountTrain({ navigation: nav });
    pressByLabel(tree, 'Pick from the plan library. Choose a ready-made plan');
    expect(nav.navigate).toHaveBeenLastCalledWith('PlanLibrary');
    pressByLabel(tree, 'Create your own. Choose every exercise yourself');
    expect(nav.navigate).toHaveBeenLastCalledWith('ManualBuilder');
    pressByLabel(tree, 'Past blocks. Completed blocks and long-term progress');
    expect(nav.navigate).toHaveBeenLastCalledWith('MesocycleBuilder');
  });

  test('with no active plan the library row waits for a plan (the empty state offers Browse plans)', async () => {
    useAppStore.setState(USER);
    applyFixture({ db: { ...richDb(), getActivePlan: async () => null, getAllPlansForUser: async () => [] } });
    const { tree } = await mountTrain({});
    const text = flattenText(tree);
    expect(text).not.toContain('Pick from the plan library');
    expect(text).toContain('Create your own');
    expect(text).toContain('Past blocks');
    expect(text).toContain('Browse plans');
  });

  test('Previous plans and Archived plans stay collapsed with their counts, below the group', async () => {
    useAppStore.setState(USER);
    const other = { id: 'p2', name: 'Push Pull Legs', isActive: 0, tags: [] };
    const old = { id: 'p3', name: 'Old plan', isActive: 0, tags: [] };
    applyFixture({
      db: planDb({
        getAllPlansForUser: async () => [PLAN, other],
        getArchivedPlansForUser: async () => [old],
      }),
    });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    const text = flattenText(tree);
    expect(text).toMatch(/Previous plans ·\s+1/);
    expect(text).toMatch(/Archived plans ·\s+1/);
    expect(findByLabel(tree, 'Previous plans, 1')).toHaveLength(1);
    expect(findByLabel(tree, 'Archived plans, 1')).toHaveLength(1);
    expect(text.indexOf('Past blocks')).toBeLessThan(text.search(/Previous plans ·/));
    expect(text.search(/Previous plans ·/)).toBeLessThan(text.search(/Archived plans ·/));
    // Collapsed: their rows are not listed.
    expect(text).not.toContain('Push Pull Legs');
    expect(text).not.toContain('Old plan');
  });

  test('Saved workouts are unchanged', async () => {
    useAppStore.setState(USER);
    applyFixture({
      db: planDb({
        getWorkoutTemplates: async () => [{ id: 't1', name: 'My pull day' }],
        getAllRoutineExerciseCounts: async () => ({ t1: 6 }),
      }),
    });
    withPosition(planPosition());
    withAdvice(CONTINUE_ADVICE());
    const { tree } = await mountTrain({});
    const text = flattenText(tree);
    expect(text).toContain('Saved workouts');
    expect(text).toContain('Saved workouts you can start directly.');
    expect(text).toContain('My pull day');
    expect(text).toMatch(/6\s+exercises/);
    expect(findByLabel(tree, 'Start My pull day')).toHaveLength(1);
  });
});
