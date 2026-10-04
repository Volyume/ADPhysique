/**
 * nextSession.surfacesAgree.test.js -- D219 lane A6 (register D219, founder
 * 2026-10-04: "Next workout should be planned as the plan builds it ... Built
 * optimally from The start").
 *
 * WHAT THIS PINS AND WHY. Three surfaces name or start "the next session":
 * Home's Start button, Plans' "Start next workout" and the home-screen
 * widget. Before D219 they could each name a different session: Home
 * switched its Start target to a recovered session (the recovery override)
 * while Plans started the programme's next, and the widget always named the
 * plan's FIRST routine (`routines[0]`), whatever the position was. They now
 * all answer from one authority, `resolveProgrammePosition(...).nextSession`
 * (the programme order, an explicit skip or a completion resolves a session,
 * a different order trained does not renumber it), and fall back to the
 * plan's first routine only where that authority names no next session:
 * a week with every session resolved (the first session of the next plan
 * week), or an unreadable position.
 *
 * Each plan state below is mounted three ways over the SAME patched database
 * and the SAME programme position: Home (the hero's Start button and the
 * routine its action loads), Plans (the routine "Start next workout" creates
 * a workout for) and the widget writer (the name it publishes). The states
 * that fail on the pre-D219 code are the ones where the next session is not
 * the first routine, and the one where a recovered session is on offer.
 *
 * Mock scaffold copied from HomeScreen.recoveryRecommendation.test.js (itself
 * copied verbatim from src/__tests__/screen-mount.test.js; that file's own
 * header explains why a real mount is possible here), extended with the
 * Plans screen's loaders.
 */

// --- Mock scaffold: same convention as HomeScreen.stateMatrix.test.js ------
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

jest.setTimeout(30_000);

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

async function mountScreen(screenFile, props = {}) {
  const errors = [];
  const origErr = console.error;
  console.error = (msg) => {
    const text = typeof msg === 'string' ? msg : String(msg);
    if (/wrap.*act|environment has been torn down|Cannot log after tests|Each child in a list|Function components cannot be given refs|forwardRef|inside StrictMode|react-test-renderer is deprecated/i.test(text)) return;
    errors.push(text);
  };
  const Screen = require(`../${screenFile}`).default;
  let tree = null;
  try {
    await TestRenderer.act(async () => {
      tree = TestRenderer.create(
        React.createElement(Screen, { navigation: makeNav(), route: { params: {}, name: 'Test' }, ...props }),
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

function findByLabel(tree, matcher) {
  const test = matcher instanceof RegExp ? (l) => matcher.test(l)
    : typeof matcher === 'function' ? matcher
    : (l) => l === matcher;
  return tree.root.findAll((n) => typeof n.type === 'string' && typeof n.props?.accessibilityLabel === 'string' && test(n.props.accessibilityLabel));
}

// --- Lib module handles + fixtures ------------------------------------------
const database = require('../../lib/database');
const programmePositionMod = require('../../lib/programmePosition');
const algorithmsMod = require('../../lib/algorithms');
const activationNudgeMod = require('../../lib/activationNudge');
const reEntryCheckMod = require('../../lib/reEntryCheck');
const coachDecisionMod = require('../../lib/coachDecision');
const plateauSurfacingMod = require('../../lib/plateauSurfacing');
const recoveryLoadMod = require('../../lib/recovery/load');
const recommendationMod = require('../../lib/recovery/nextWorkoutRecommendation');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const USER_ID = 'u-agree';
const ROUTINES = [
  { id: 'legs', name: 'Legs' },
  { id: 'push', name: 'Push' },
  { id: 'pull', name: 'Pull' },
];
const NAME_OF = Object.fromEntries(ROUTINES.map((r) => [r.id, r.name]));

/** A programme position over the three routines, each session in the given state. */
function positionWith(states) {
  const sessions = ROUTINES.map((r, i) => ({
    routineId: r.id, name: r.name, order: i + 1, state: states[r.id] ?? 'outstanding',
  }));
  const nextSession = sessions.find((s) => s.state === 'outstanding') ?? null;
  return {
    blockId: 'b1',
    planId: 'p1',
    activeWeekId: 'w1',
    activeWeekIndex: 2,
    calendarWeekIndex: 2,
    plannedWeeks: 6,
    recoveryWeek: 6,
    sessions,
    nextSession,
    weekResolved: sessions.every((s) => s.state !== 'outstanding'),
    recoveryState: null,
    source: 'outstanding_required_session',
    diagnostics: [],
  };
}

/** The old module's answer when a different session looked recovered. */
const LEGACY_SWAP_RESULT = {
  programmeNext: { routineId: 'push' },
  recommended: { routineId: 'pull' },
  reason: 'Push is next in your plan. Chest is estimated 40% recovered, ready by Thursday. Pull is estimated ready now.',
  programmeNextLine: 'Chest is estimated 40% recovered, ready by Thursday.',
  perSession: [
    { routineId: 'push', line: 'Chest is estimated 40% recovered, ready by Thursday.' },
    { routineId: 'pull', line: 'Estimated ready now.' },
  ],
};
const NO_RECOMMENDATION = { programmeNext: null, programmeNextLine: null, perSession: [] };

const DEFAULT_DB = {
  getActivePlan: async () => ({ id: 'p1', name: 'My Plan' }),
  getRoutinesForPlan: async () => ROUTINES,
  getCurrentMesocycleWeek: async () => ({ weekIndex: 2, plannedWeeks: 6 }),
  getLatestCoachOutput: async () => null,
  getLatestCheckin: async () => null,
  getAllWorkouts: async () => [{ id: 'w0', isCompleted: true, startedAt: Date.now() - 86400000, endedAt: Date.now() - 86400000 }],
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
  // Plans' own loaders.
  getAllPlansForUser: async () => [{ id: 'p1', name: 'My Plan' }],
  getArchivedPlansForUser: async () => [],
  getWorkoutTemplates: async () => [],
  getPlanWorkoutCounts: async () => ({ p1: 3 }),
  getActiveBlock: async () => null,
  getPlanFolders: async () => [],
  createWorkout: async (_uid, routineId) => ({ id: `workout-${routineId}`, routineId }),
  // The widget writer's own reads.
  getWeeklySessionStats: async () => ({ completed: 1, planned: 3, plannedIsEstimate: false }),
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
let spies = null;

function applyFixture({ db = {}, lib = {} } = {}) {
  spies = {
    getRoutineExercisesWithDetails: jest.fn(async () => []),
    createWorkout: jest.fn(DEFAULT_DB.createWorkout),
  };
  dbOriginals = {};
  for (const key of Object.keys(DEFAULT_DB)) {
    dbOriginals[key] = database[key];
    database[key] = db[key] ?? spies[key] ?? DEFAULT_DB[key];
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

function signedIn() {
  useAppStore.setState({
    user: { id: USER_ID, email: 't@e.com', isLocal: false },
    session: { user: { id: USER_ID, created_at: '2020-01-01T00:00:00.000Z' } },
    tier: 'pro',
    firstRunComplete: true,
    userProfile: { firstName: 'Alex', goal: 'lean_gain', trainingFocus: 'hypertrophy', units: 'metric' },
    activeWorkout: null,
    bodyWeightUnits: 'kg',
    startWorkout: jest.fn(),
  });
}

// --- The three surfaces, each reduced to "which session does it name" -------

/** Home: the routine the hero's Start button is for, and the routine its action loads. */
async function homeStarts() {
  const { tree, errors } = await mountScreen('HomeScreen');
  expect(errors).toEqual([]);
  const named = ROUTINES.filter((r) => findByLabel(tree, `Start ${r.name}`).length > 0).map((r) => r.id);
  expect(named.length).toBeLessThanOrEqual(1);
  const weekComplete = findByLabel(tree, 'Do another session from your plan').length > 0;
  let loaded = null;
  if (named.length === 1) {
    const button = findByLabel(tree, `Start ${NAME_OF[named[0]]}`)
      .find((n) => typeof n.props.onPress === 'function');
    expect(button).toBeTruthy();
    spies.getRoutineExercisesWithDetails.mockClear();
    await TestRenderer.act(async () => { button.props.onPress(); });
    loaded = spies.getRoutineExercisesWithDetails.mock.calls.map((c) => c[0])[0] ?? null;
  }
  return { routineId: named[0] ?? null, loaded, weekComplete, tree };
}

/** Plans: the routine "Start next workout" creates a workout for. */
async function plansStarts() {
  const { tree, errors } = await mountScreen('PlansScreen');
  expect(errors).toEqual([]);
  const weekComplete = findByLabel(tree, 'Do another session from your plan').length > 0;
  const button = findByLabel(tree, 'Start next workout').find((n) => typeof n.props.onPress === 'function');
  let routineId = null;
  if (button) {
    spies.createWorkout.mockClear();
    await TestRenderer.act(async () => { button.props.onPress(); });
    routineId = spies.createWorkout.mock.calls.map((c) => c[1])[0] ?? null;
  }
  return { routineId, weekComplete, hasStartButton: !!button, tree };
}

/** The widget: the session name the snapshot publishes. */
async function widgetNames() {
  // eslint-disable-next-line global-require
  const { gatherWidgetInputs } = require('../../lib/widgets/writer');
  const inputs = await gatherWidgetInputs(USER_ID);
  return inputs?.nextSession?.name ?? null;
}

// --- The plan states ----------------------------------------------------------
describe('Home, Plans and the widget name the same next session (D219 A6)', () => {
  test('the first session is done: all three name the second, not the first routine', async () => {
    signedIn();
    const position = positionWith({ legs: 'completed' });
    applyFixture({ lib: { resolveProgrammePosition: async () => position } });

    const home = await homeStarts();
    expect(home.routineId).toBe('push');
    expect(home.loaded).toBe('push');
    await TestRenderer.act(async () => { currentTree.unmount(); }); currentTree = null;

    const plans = await plansStarts();
    expect(plans.routineId).toBe('push');
    await TestRenderer.act(async () => { currentTree.unmount(); }); currentTree = null;

    expect(await widgetNames()).toBe('Push');
  });

  test('training out of order: the next session is the first one still outstanding, on every surface', async () => {
    signedIn();
    // Legs then Pull were trained, so Push (the middle one) is what is left:
    // "A then C leaves B next" (blockProgression.js), never the first routine.
    const position = positionWith({ legs: 'completed', pull: 'completed' });
    applyFixture({ lib: { resolveProgrammePosition: async () => position } });

    const home = await homeStarts();
    expect(home.routineId).toBe('push');
    await TestRenderer.act(async () => { currentTree.unmount(); }); currentTree = null;
    const plans = await plansStarts();
    expect(plans.routineId).toBe('push');
    await TestRenderer.act(async () => { currentTree.unmount(); }); currentTree = null;
    expect(await widgetNames()).toBe('Push');
  });

  test('a skipped session resolves it: the surfaces move on together', async () => {
    signedIn();
    const position = positionWith({ legs: 'skipped_by_user', push: 'skipped_by_user' });
    applyFixture({ lib: { resolveProgrammePosition: async () => position } });

    const home = await homeStarts();
    expect(home.routineId).toBe('pull');
    await TestRenderer.act(async () => { currentTree.unmount(); }); currentTree = null;
    const plans = await plansStarts();
    expect(plans.routineId).toBe('pull');
    await TestRenderer.act(async () => { currentTree.unmount(); }); currentTree = null;
    expect(await widgetNames()).toBe('Pull');
  });

  test('a recovered session on offer never moves Start: Home starts the plan\'s next, as Plans and the widget do', async () => {
    signedIn();
    const position = positionWith({ legs: 'completed' });
    // The pre-D219 module answered with a swap here (Pull looked recovered
    // and Push did not). Whatever the recommendation module returns, Home's
    // Start is the plan's own next session.
    applyFixture({
      lib: {
        resolveProgrammePosition: async () => position,
        recommendNextWorkout: () => LEGACY_SWAP_RESULT,
      },
    });

    const home = await homeStarts();
    expect(home.routineId).toBe('push');
    expect(home.loaded).toBe('push');
    await TestRenderer.act(async () => { currentTree.unmount(); }); currentTree = null;
    const plans = await plansStarts();
    expect(plans.routineId).toBe('push');
    await TestRenderer.act(async () => { currentTree.unmount(); }); currentTree = null;
    expect(await widgetNames()).toBe('Push');
  });

  test('the plan week is complete: neither Home nor Plans offers a Start, and the widget names the plan\'s first session only because there is no next one', async () => {
    signedIn();
    const position = positionWith({ legs: 'completed', push: 'completed', pull: 'completed' });
    expect(position.nextSession).toBeNull();
    applyFixture({ lib: { resolveProgrammePosition: async () => position } });

    const home = await homeStarts();
    expect(home.weekComplete).toBe(true);
    expect(home.routineId).toBeNull();
    await TestRenderer.act(async () => { currentTree.unmount(); }); currentTree = null;
    const plans = await plansStarts();
    expect(plans.weekComplete).toBe(true);
    expect(plans.hasStartButton).toBe(false);
    await TestRenderer.act(async () => { currentTree.unmount(); }); currentTree = null;
    // The plan has no next session this week: its first session is what the
    // week turns on, which is the one place the first routine may be named.
    expect(await widgetNames()).toBe('Legs');
  });

  test('no readable position: Home, Plans and the widget all fall back to the plan\'s first routine', async () => {
    signedIn();
    applyFixture({ lib: { resolveProgrammePosition: async () => null } });

    const home = await homeStarts();
    expect(home.routineId).toBe('legs');
    expect(home.loaded).toBe('legs');
    await TestRenderer.act(async () => { currentTree.unmount(); }); currentTree = null;
    const plans = await plansStarts();
    expect(plans.routineId).toBe('legs');
    await TestRenderer.act(async () => { currentTree.unmount(); }); currentTree = null;
    expect(await widgetNames()).toBe('Legs');
  });

  test('no plan: no surface names a session', async () => {
    signedIn();
    applyFixture({
      db: {
        getActivePlan: async () => null,
        getRoutinesForPlan: async () => [],
        getAllPlansForUser: async () => [],
        getPlanWorkoutCounts: async () => ({}),
      },
    });

    const home = await homeStarts();
    expect(home.routineId).toBeNull();
    expect(home.weekComplete).toBe(false);
    await TestRenderer.act(async () => { currentTree.unmount(); }); currentTree = null;
    const plans = await plansStarts();
    expect(plans.routineId).toBeNull();
    expect(plans.hasStartButton).toBe(false);
    await TestRenderer.act(async () => { currentTree.unmount(); }); currentTree = null;
    expect(await widgetNames()).toBeNull();
  });

  test('a repeated session name is qualified the same way Home qualifies it', async () => {
    signedIn();
    // The bikini Glute Focus split lists "Glutes" twice: Home's hero and the
    // summary say which one ("Glutes · Workout 4 of 4"); the widget names it
    // the same way instead of a bare name that could be either.
    const twice = [
      { id: 'a', name: 'Glutes' }, { id: 'b', name: 'Upper' }, { id: 'c', name: 'Legs' }, { id: 'd', name: 'Glutes' },
    ];
    const sessions = twice.map((r, i) => ({
      routineId: r.id, name: r.name, order: i + 1, state: i < 3 ? 'completed' : 'outstanding',
    }));
    const position = { ...positionWith({}), sessions, nextSession: sessions[3], weekResolved: false };
    applyFixture({
      db: { getRoutinesForPlan: async () => twice },
      lib: { resolveProgrammePosition: async () => position },
    });
    expect(await widgetNames()).toBe('Glutes · Workout 4 of 4');
  });
});
