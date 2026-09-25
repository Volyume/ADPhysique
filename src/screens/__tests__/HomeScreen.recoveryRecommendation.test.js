/**
 * HomeScreen.recoveryRecommendation.test.js -- per-muscle recovery,
 * next-workout aware (register D201, spec docs/recovery-programme-2026-09-25/
 * 00-SPEC.md sections 4.3, F1 RULED).
 *
 * Mocks the recovery LOADER (src/lib/recovery/load.js's loadMuscleRecovery/
 * loadPlannedSetsByRoutine, and nextWorkoutRecommendation.js's
 * recommendNextWorkout) rather than the database chain underneath it --
 * those modules have their own dedicated test files
 * (src/lib/recovery/__tests__/). This suite pins HomeScreen's OWN
 * composition: the plain line under the next session's name when nothing
 * is recommended; the recommendation card (primary session switched to the
 * recommendation, its reason, and the "Keep <programme next>" control) when
 * one is; that tapping "Keep" restores programme order and its plain line;
 * and that the hero renders exactly as it did before this feature existed
 * when the loader rejects.
 *
 * Mock scaffold copied verbatim from src/__tests__/screen-mount.test.js via
 * HomeScreen.stateMatrix.test.js (that file's own header explains why a real
 * mount is possible here), extended with the three recovery-domain
 * functions in the same monkey-patch convention as resolveProgrammePosition
 * etc.
 */

// ─── Mock scaffold: copied verbatim, same convention as
// HomeScreen.stateMatrix.test.js / src/__tests__/screen-mount.test.js. ─────
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

const REGION = {
  heroPlanned: (tree) => findByLabel(tree, /^Workout options$/).length > 0,
};

// ─── Lib module handles + default (safe/empty) fixtures ───────────────────
const database = require('../../lib/database');
const programmePositionMod = require('../../lib/programmePosition');
const algorithmsMod = require('../../lib/algorithms');
const activationNudgeMod = require('../../lib/activationNudge');
const reEntryCheckMod = require('../../lib/reEntryCheck');
const coachDecisionMod = require('../../lib/coachDecision');
const plateauSurfacingMod = require('../../lib/plateauSurfacing');
// D201: the recovery domain's loader and pure recommendation module -- this
// suite mocks THESE (never the database chain underneath them), matching
// the build brief's "mock the loader" instruction. Their own DB-level
// wiring is covered by src/lib/recovery/__tests__/load.test.js.
const recoveryLoadMod = require('../../lib/recovery/load');
const recommendationMod = require('../../lib/recovery/nextWorkoutRecommendation');
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
  getAllRoutineExerciseCounts: async () => ({}),
  getRecentWorkoutFeedback: async () => [],
  getPlannedMuscleVolume: async () => [],
  getAllExercises: async () => [],
  getPlannedMuscleVolumeForBlock: async () => [],
  getAllMesocyclesForUser: async () => [],
  getRoutineExercisesWithDetails: async () => [],
  getExerciseById: async () => null,
};
const NO_RECOMMENDATION = {
  programmeNext: null, recommended: null, reason: null, programmeNextLine: null, perSession: [],
};
const DEFAULT_LIB = {
  resolveProgrammePosition: async () => null,
  shouldDeload: () => ({ deload: false }),
  resolveActivationNudge: () => null,
  reEntryCheckDue: () => null,
  isCompletedCoachDecision: () => false,
  selectPlateauForBanner: () => null,
  loadMuscleRecovery: async () => ({
    map: {}, nowMs: Date.now(), recoveryRating: 'average', habitualWeekdays: null, typicalStartMinute: 18 * 60,
  }),
  loadPlannedSetsByRoutine: async () => ({}),
  recommendNextWorkout: () => NO_RECOMMENDATION,
};

const LIB_MODULES = {
  resolveProgrammePosition: programmePositionMod,
  shouldDeload: algorithmsMod,
  resolveActivationNudge: activationNudgeMod,
  reEntryCheckDue: reEntryCheckMod,
  isCompletedCoachDecision: coachDecisionMod,
  selectPlateauForBanner: plateauSurfacingMod,
  loadMuscleRecovery: recoveryLoadMod,
  loadPlannedSetsByRoutine: recoveryLoadMod,
  recommendNextWorkout: recommendationMod,
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
  user: { id: 'u-recovery', email: 't@e.com', isLocal: false },
  session: { user: { id: 'u-recovery', created_at: '2020-01-01T00:00:00.000Z' } },
  tier: 'pro',
  firstRunComplete: true,
  userProfile: { firstName: 'Alex', goal: 'lean_gain', trainingFocus: 'hypertrophy', units: 'metric' },
  activeWorkout: null,
  bodyWeightUnits: 'kg',
};

const ROUTINE_LEGS = { id: 'legs', name: 'Legs' };
const ROUTINE_PUSH = { id: 'push', name: 'Push' };
function withTwoRoutinePlan() {
  return {
    getActivePlan: async () => ({ id: 'p1', name: 'My Plan' }),
    getRoutinesForPlan: async () => [ROUTINE_LEGS, ROUTINE_PUSH],
  };
}
function positionWithTwoOutstandingSessions() {
  return async () => ({
    nextSession: { routineId: 'legs', name: 'Legs' },
    sessions: [
      { routineId: 'legs', name: 'Legs', order: 1, state: 'outstanding' },
      { routineId: 'push', name: 'Push', order: 2, state: 'outstanding' },
    ],
    activeWeekId: 'w1',
    blockId: 'b1',
    recoveryState: null,
    weekResolved: false,
  });
}
function completedWorkout(id, daysAgo = 1) {
  return { id, isCompleted: true, startedAt: Date.now() - daysAgo * 86400000, endedAt: Date.now() - daysAgo * 86400000 };
}

const PLAIN_RESULT = {
  programmeNext: { routineId: 'legs' },
  recommended: null,
  reason: null,
  programmeNextLine: 'Quads are estimated 64% recovered, ready by Thursday.',
  perSession: [
    { routineId: 'legs', line: 'Quads are estimated 64% recovered, ready by Thursday.' },
    { routineId: 'push', line: 'Ready now.' },
  ],
};
const RECOMMEND_RESULT = {
  programmeNext: { routineId: 'legs' },
  recommended: { routineId: 'push' },
  reason: 'Legs is next in your plan. Quads are estimated 64% recovered, ready by Thursday. Push is ready now.',
  programmeNextLine: 'Quads are estimated 64% recovered, ready by Thursday.',
  perSession: [
    { routineId: 'legs', line: 'Quads are estimated 64% recovered, ready by Thursday.' },
    { routineId: 'push', line: 'Ready now.' },
  ],
};

describe('the plain line: programme next is ready or not, no recommendation', () => {
  test('the calm line renders under the session name; no "Keep" control', async () => {
    useAppStore.setState(PRO_USER);
    applyFixture({
      db: { ...withTwoRoutinePlan(), getAllWorkouts: async () => [completedWorkout('w1', 1)] },
      lib: {
        resolveProgrammePosition: positionWithTwoOutstandingSessions(),
        recommendNextWorkout: () => PLAIN_RESULT,
      },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    const text = flattenText(tree);
    expect(REGION.heroPlanned(tree)).toBe(true);
    expect(text).toContain('Quads are estimated 64% recovered, ready by Thursday.');
    expect(text).not.toMatch(/is next in your plan/);
    expect(text).not.toMatch(/Keep Legs/);
    expect(text).not.toMatch(/Push is ready now/);
    // Programme order is untouched: Legs is still the primary session.
    expect(findByLabel(tree, 'Start Legs').length).toBeGreaterThan(0);
  });
});

describe('the recommendation card: primary switches, with the reason and a "Keep" control', () => {
  test('Push becomes primary, the reason renders, "Keep Legs" is one tap away', async () => {
    useAppStore.setState(PRO_USER);
    applyFixture({
      db: { ...withTwoRoutinePlan(), getAllWorkouts: async () => [completedWorkout('w1', 1)] },
      lib: {
        resolveProgrammePosition: positionWithTwoOutstandingSessions(),
        recommendNextWorkout: () => RECOMMEND_RESULT,
      },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    const text = flattenText(tree);
    // The primary session is now Push, with no tap required (F1: the
    // recovered session is the easy path).
    expect(findByLabel(tree, 'Start Push').length).toBeGreaterThan(0);
    expect(findByLabel(tree, 'Start Legs').length).toBe(0);
    expect(text).toContain('Legs is next in your plan. Quads are estimated 64% recovered, ready by Thursday. Push is ready now.');
    expect(findByLabel(tree, 'Keep Legs').length).toBeGreaterThan(0);
  });

  test('tapping "Keep Legs" restores programme order immediately; the line under Legs becomes its own, the "Keep" control drops', async () => {
    useAppStore.setState(PRO_USER);
    applyFixture({
      db: { ...withTwoRoutinePlan(), getAllWorkouts: async () => [completedWorkout('w1', 1)] },
      lib: {
        resolveProgrammePosition: positionWithTwoOutstandingSessions(),
        recommendNextWorkout: () => RECOMMEND_RESULT,
      },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(findByLabel(tree, 'Start Push').length).toBeGreaterThan(0);

    const keepNode = tree.root.findAll(
      (n) => n.props.accessibilityLabel === 'Keep Legs' && typeof n.props.onPress === 'function',
    )[0];
    expect(keepNode).toBeTruthy();
    await TestRenderer.act(async () => { keepNode.props.onPress(); });

    const text = flattenText(tree);
    // Lead review: Keep restores programme order as the primary...
    expect(findByLabel(tree, 'Start Legs').length).toBeGreaterThan(0);
    expect(findByLabel(tree, 'Start Push').length).toBe(0);
    // ...the line under "Legs" is Legs's own (D201 addendum 4 ruling 6: the
    // line never repeats the card's title; Opus review finding 8), so the
    // reason, which names Legs, is gone with the control...
    expect(text).toContain('Quads are estimated 64% recovered, ready by Thursday.');
    expect(text).not.toMatch(/is next in your plan/);
    // ...and the "Keep" control itself drops -- there is nothing further to keep.
    expect(findByLabel(tree, 'Keep Legs').length).toBe(0);
  });

  test('Keep is remembered across a refocus: no re-switch, same day, same programme next', async () => {
    useAppStore.setState(PRO_USER);
    applyFixture({
      db: { ...withTwoRoutinePlan(), getAllWorkouts: async () => [completedWorkout('w1', 1)] },
      lib: {
        resolveProgrammePosition: positionWithTwoOutstandingSessions(),
        recommendNextWorkout: () => RECOMMEND_RESULT,
      },
    });
    const first = await mountHome({});
    expect(first.errors).toEqual([]);
    expect(findByLabel(first.tree, 'Start Push').length).toBeGreaterThan(0);

    const keepNode = first.tree.root.findAll(
      (n) => n.props.accessibilityLabel === 'Keep Legs' && typeof n.props.onPress === 'function',
    )[0];
    await TestRenderer.act(async () => { keepNode.props.onPress(); });
    // Let the best-effort AsyncStorage.setItem settle before the refocus.
    await TestRenderer.act(async () => { await Promise.resolve(); await Promise.resolve(); });

    await TestRenderer.act(async () => { first.tree.unmount(); });
    currentTree = null;

    // Refocus: a fresh mount of the same screen, same day, same programme
    // next -- exactly the scenario "the next Home focus recomputes the
    // recommendation" described. The kept decision must survive it.
    const second = await mountHome({});
    expect(second.errors).toEqual([]);
    expect(findByLabel(second.tree, 'Start Legs').length).toBeGreaterThan(0);
    expect(findByLabel(second.tree, 'Start Push').length).toBe(0);
    expect(flattenText(second.tree)).toContain('Quads are estimated 64% recovered, ready by Thursday.');
    expect(flattenText(second.tree)).not.toMatch(/is next in your plan/);
    expect(findByLabel(second.tree, 'Keep Legs').length).toBe(0);
  });

  test('a new day clears the kept decision: the recommendation switches again', async () => {
    useAppStore.setState(PRO_USER);
    const day1 = new Date(2026, 2, 16, 9, 0, 0).getTime(); // Monday
    const day2 = new Date(2026, 2, 17, 9, 0, 0).getTime(); // Tuesday
    const dateNowSpy = jest.spyOn(Date, 'now');
    try {
      dateNowSpy.mockReturnValue(day1);
      applyFixture({
        db: { ...withTwoRoutinePlan(), getAllWorkouts: async () => [completedWorkout('w1', 1)] },
        lib: {
          resolveProgrammePosition: positionWithTwoOutstandingSessions(),
          loadMuscleRecovery: async () => ({
            map: {}, nowMs: day1, recoveryRating: 'average', habitualWeekdays: null, typicalStartMinute: 18 * 60,
          }),
          recommendNextWorkout: () => RECOMMEND_RESULT,
        },
      });
      const first = await mountHome({});
      expect(first.errors).toEqual([]);
      const keepNode = first.tree.root.findAll(
        (n) => n.props.accessibilityLabel === 'Keep Legs' && typeof n.props.onPress === 'function',
      )[0];
      await TestRenderer.act(async () => { keepNode.props.onPress(); });
      await TestRenderer.act(async () => { await Promise.resolve(); await Promise.resolve(); });
      expect(findByLabel(first.tree, 'Start Legs').length).toBeGreaterThan(0);
      await TestRenderer.act(async () => { first.tree.unmount(); });
      currentTree = null;

      // A new day: the stored day key no longer matches, so the SAME
      // recommendation is free to switch again, exactly as on first sight.
      dateNowSpy.mockReturnValue(day2);
      applyFixture({
        db: { ...withTwoRoutinePlan(), getAllWorkouts: async () => [completedWorkout('w1', 1)] },
        lib: {
          resolveProgrammePosition: positionWithTwoOutstandingSessions(),
          loadMuscleRecovery: async () => ({
            map: {}, nowMs: day2, recoveryRating: 'average', habitualWeekdays: null, typicalStartMinute: 18 * 60,
          }),
          recommendNextWorkout: () => RECOMMEND_RESULT,
        },
      });
      const second = await mountHome({});
      expect(second.errors).toEqual([]);
      expect(findByLabel(second.tree, 'Start Push').length).toBeGreaterThan(0);
      expect(findByLabel(second.tree, 'Start Legs').length).toBe(0);
      expect(findByLabel(second.tree, 'Keep Legs').length).toBeGreaterThan(0);
    } finally {
      dateNowSpy.mockRestore();
    }
  });
});

describe('the recommendation never outranks the block decision, and the line follows the displayed session (Opus review findings 1 and 7)', () => {
  test('a finished block awaiting the decision shows the block-complete hero, not the recommended session', async () => {
    useAppStore.setState(PRO_USER);
    applyFixture({
      db: {
        ...withTwoRoutinePlan(),
        getAllWorkouts: async () => [completedWorkout('w1', 1)],
        getCurrentMesocycleWeek: async () => ({ awaitingDecision: true, mesocycleId: 'm1', weekIndex: 6, plannedWeeks: 6 }),
      },
      lib: {
        resolveProgrammePosition: positionWithTwoOutstandingSessions(),
        recommendNextWorkout: () => RECOMMEND_RESULT,
      },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    // The recovery override is derived at render from the LIVE block state,
    // so it can never hide the finished-block hero (it used to: the focus
    // callback read a stale currentMesoWeek and wrote the override).
    expect(findByLabel(tree, 'Choose what comes after this block').length).toBeGreaterThan(0);
    expect(findByLabel(tree, 'Start Push').length).toBe(0);
    expect(findByLabel(tree, 'Keep Legs').length).toBe(0);
  });

  test('a session the athlete picks from the sheet shows ITS OWN line, never programme-next\'s', async () => {
    useAppStore.setState(PRO_USER);
    applyFixture({
      db: { ...withTwoRoutinePlan(), getAllWorkouts: async () => [completedWorkout('w1', 1)] },
      lib: {
        resolveProgrammePosition: positionWithTwoOutstandingSessions(),
        recommendNextWorkout: () => PLAIN_RESULT,
      },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(flattenText(tree)).toContain('Quads are estimated 64% recovered, ready by Thursday.');

    // Pick Push from the options sheet (its onSelectOverride prop is the
    // sheet's one way of choosing a different session).
    const sheet = tree.root.findAll(
      (n) => typeof n.props.onSelectOverride === 'function' && Array.isArray(n.props.planAllWorkouts),
    )[0];
    expect(sheet).toBeTruthy();
    await TestRenderer.act(async () => {
      sheet.props.onSelectOverride({ routine: ROUTINE_PUSH, total: 2, idx: 1 });
    });
    const text = flattenText(tree);
    expect(findByLabel(tree, 'Start Push').length).toBeGreaterThan(0);
    expect(text).toContain('Ready now.');
    expect(text).not.toContain('Quads are estimated 64% recovered');
  });
});

describe('the loader rejects: the card renders exactly as it did before this feature existed', () => {
  test('no recovery copy anywhere; the ordinary hero renders', async () => {
    useAppStore.setState(PRO_USER);
    applyFixture({
      db: { ...withTwoRoutinePlan(), getAllWorkouts: async () => [completedWorkout('w1', 1)] },
      lib: {
        resolveProgrammePosition: positionWithTwoOutstandingSessions(),
        loadMuscleRecovery: async () => { throw new Error('boom'); },
      },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    const text = flattenText(tree);
    expect(REGION.heroPlanned(tree)).toBe(true);
    expect(findByLabel(tree, 'Start Legs').length).toBeGreaterThan(0);
    expect(text).not.toMatch(/estimated|recovered|Ready now|Keep Legs|is next in your plan/);
  });

  test('a recommendNextWorkout that throws also degrades calmly', async () => {
    useAppStore.setState(PRO_USER);
    applyFixture({
      db: { ...withTwoRoutinePlan(), getAllWorkouts: async () => [completedWorkout('w1', 1)] },
      lib: {
        resolveProgrammePosition: positionWithTwoOutstandingSessions(),
        recommendNextWorkout: () => { throw new Error('boom'); },
      },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(REGION.heroPlanned(tree)).toBe(true);
    expect(findByLabel(tree, 'Start Legs').length).toBeGreaterThan(0);
  });
});

describe('no habit yet: the projection still produces a calm, present-tense line', () => {
  test('with habitualWeekdays null, recommendNextWorkout still receives a projectedAtMs and the plain line renders', async () => {
    useAppStore.setState(PRO_USER);
    applyFixture({
      db: { ...withTwoRoutinePlan(), getAllWorkouts: async () => [completedWorkout('w1', 1)] },
      lib: {
        resolveProgrammePosition: positionWithTwoOutstandingSessions(),
        loadMuscleRecovery: async () => ({
          map: {}, nowMs: Date.now(), recoveryRating: 'average', habitualWeekdays: null, typicalStartMinute: 18 * 60,
        }),
        recommendNextWorkout: (args) => {
          // The projection collapses to "now" with no habit -- proven here
          // by the fact recommendNextWorkout is actually called with a
          // finite projectedAtMs rather than something undefined/NaN.
          expect(Number.isFinite(args.projectedAtMs)).toBe(true);
          return PLAIN_RESULT;
        },
      },
    });
    const { tree, errors } = await mountHome({});
    expect(errors).toEqual([]);
    expect(flattenText(tree)).toContain('Quads are estimated 64% recovered, ready by Thursday.');
  });
});
