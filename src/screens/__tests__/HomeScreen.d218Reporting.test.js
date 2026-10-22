/**
 * HomeScreen.d218Reporting.test.js
 *
 * D218 (founder order 2026-10-03: "I need you to check across the board and
 * ensure all exercises are logged and reported correct after the workout
 * ends"; audit docs/audit/exercise-logging-reporting-audit-2026-10-03/
 * 00-FINDINGS.md: F-2 (Home's repeat), F-3, F-8 part 2, F-24, F-25 caller; rows
 * P7, P19, P20, P21, P40). Pins, against the REAL HomeScreen, how Home reports
 * and reuses a finished workout's logged sets:
 *
 *  - [D231, app layout rework batch 2] The Today last-session row, its "kg lifted"
 *    total (F-8 part 2, F-24) and its Repeat (F-2) left Today for Train's Recent
 *    sessions. The unit and total tests went with the row (Train's cards print no
 *    total), and the Repeat tests moved to src/lib/__tests__/repeatSession.test.js
 *    (the assembly) and PlansScreen.d231Train.test.js (the mounted flow);
 *  - the block rows credit through the unfiltered lookup, so a soft-deleted
 *    custom exercise's sets count (F-3);
 *  - the deload check is handed the exercise type of every set, so a plank
 *    held for 60 seconds is not averaged as 60 reps (F-25), with every other
 *    option exactly as before;
 *  - "Repeat last session" with no routine keeps an exercise whose id this
 *    device cannot find when its own name snapshot matches one, and tells the
 *    person, calmly and exactly, when one is still left out (F-2).
 *
 * WHY A REAL MOUNT: the mock scaffold below is copied verbatim from
 * HomeScreen.stateMatrix.test.js (itself from screen-mount.test.js), the
 * proven set for mounting HomeScreen via react-test-renderer; the real
 * lib/database module's exports are monkey-patched per test and restored in
 * afterEach, as that file does.
 */

// ─── Mock scaffold: copied from HomeScreen.stateMatrix.test.js ─────────────
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

// One stable `show` the tests can read (the matrix file hands every call its own jest.fn()).
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

// ─── Helpers ────────────────────────────────────────────────────────────────

const { buildExerciseLookup } = require('../../lib/exercise/lookup');
const database = require('../../lib/database');
const programmePositionMod = require('../../lib/programmePosition');
const algorithmsMod = require('../../lib/algorithms');
const activationNudgeMod = require('../../lib/activationNudge');
const reEntryCheckMod = require('../../lib/reEntryCheck');
const coachDecisionMod = require('../../lib/coachDecision');
const plateauSurfacingMod = require('../../lib/plateauSurfacing');
const homeCoachBriefMod = require('../../lib/homeCoachBrief');
const blockWeekProgressMod = require('../../lib/blockWeekProgress');
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const DAY = 86400000;

// ─── Exercises ──────────────────────────────────────────────────────────────
const BENCH = {
  id: 'ex-bench', name: 'Bench Press', primaryMuscle: 'chest', secondaryMuscles: [],
  exerciseType: 'weight_reps', loadSemantics: 'total',
};
const HEEL_WALK = {
  id: 'ex-heel-walk', name: 'Heel Walk', primaryMuscle: 'calves', secondaryMuscles: [],
  exerciseType: 'distance', loadSemantics: 'total',
};
const DB_CURL = {
  id: 'ex-db-curl', name: 'Dumbbell Curl', primaryMuscle: 'biceps', secondaryMuscles: [],
  exerciseType: 'weight_reps', loadSemantics: 'per_hand',
};
const PLANK = {
  id: 'ex-plank', name: 'Plank', primaryMuscle: 'abs', secondaryMuscles: [],
  exerciseType: 'duration', loadSemantics: 'total',
};
// Created by the person, then deleted from the library: the row stays, flagged (EL-18).
const DELETED_CUSTOM = {
  id: 'ex-custom-hammer', name: 'Hammer Curl X', primaryMuscle: 'triceps', secondaryMuscles: [],
  isCustom: 1, deletedAt: 1700000000000, exerciseType: 'weight_reps', loadSemantics: 'per_hand',
};
// getAllExercises FILTERS the deleted custom row; the shared lookup keeps it.
const LIVE_LIBRARY = [BENCH, HEEL_WALK, DB_CURL, PLANK];
const LOOKUP = buildExerciseLookup([...LIVE_LIBRARY, DELETED_CUSTOM]);

// ─── Fixtures ───────────────────────────────────────────────────────────────
const DEFAULT_DB = {
  getActivePlan: async () => null,
  getRoutinesForPlan: async () => [],
  getCurrentMesocycleWeek: async () => null,
  getLatestCoachOutput: async () => null,
  getLatestCheckin: async () => null,
  getAllWorkouts: async () => [],
  getWorkoutSetsSince: async () => [],
  getWorkoutSetsForWorkout: async () => [],
  getMorningWeightToday: async () => ({ weightKg: 82 }),
  getMorningWeights: async () => [],
  getMorningWeightsLast14Days: async () => [],
  getOpenEdPatternFlag: async () => false,
  getAllRoutineExerciseCounts: async () => ({}),
  getRecentWorkoutFeedback: async () => [],
  getPlannedMuscleVolume: async () => [],
  getAllExercises: async () => LIVE_LIBRARY,
  getExerciseLookup: async () => LOOKUP,
  getPlannedMuscleVolumeForBlock: async () => [],
  getAllMesocyclesForUser: async () => [],
  getRoutineExercisesWithDetails: async () => [],
  getExerciseById: async () => null,
  createWorkout: async () => ({ id: 'new-workout', startedAt: Date.now() }),
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
const spies = [];

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

function spyOn(mod, name) {
  const spy = jest.spyOn(mod, name);
  spies.push(spy);
  return spy;
}

afterEach(async () => {
  while (spies.length) spies.pop().mockRestore();
  restoreFixture();
  mockToastShow.mockClear();
  await AsyncStorage.clear();
});

const mockStartWorkout = jest.fn();

function userState(extra = {}) {
  return {
    user: { id: 'u-d218', email: 't@e.com', isLocal: false },
    session: { user: { id: 'u-d218', created_at: '2020-01-01T00:00:00.000Z' } },
    tier: 'pro',
    firstRunComplete: true,
    userProfile: { firstName: 'Alex', goal: 'lean_gain', trainingFocus: 'hypertrophy', units: 'metric' },
    activeWorkout: null,
    bodyWeightUnits: 'kg',
    units: 'kg',
    startWorkout: mockStartWorkout,
    ...extra,
  };
}

let seq = 0;
function setRow(workoutId, exerciseId, weight, reps, extra = {}) {
  seq += 1;
  return {
    id: `s-${seq}`, workoutId, exerciseId, weight, actualReps: reps, setType: 'straight', createdAt: Date.now() - 3600000, ...extra,
  };
}
const repeated = (n, make) => Array.from({ length: n }, make);

/** The sets of one finished workout: bench, a per-hand curl, a deleted per-hand custom exercise, a heel walk and a plank. */
function sessionSets(workoutId, { heelWalk = true } = {}) {
  return [
    ...repeated(3, () => setRow(workoutId, 'ex-bench', 100, 10)), // 3,000
    ...repeated(3, () => setRow(workoutId, 'ex-db-curl', 30, 10)), // 900 x 2 = 1,800
    ...repeated(2, () => setRow(workoutId, 'ex-custom-hammer', 20, 10)), // 400 x 2 = 800
    ...(heelWalk ? [setRow(workoutId, 'ex-heel-walk', 400, 90)] : []), // metres x seconds: NOT kilograms
    setRow(workoutId, 'ex-plank', 0, 60), // seconds in the reps column
  ];
}

function lastWorkout(extra = {}) {
  return {
    id: 'w-last', isCompleted: true, startedAt: Date.now() - DAY, endedAt: Date.now() - DAY + 3600000,
    routineId: null, routineName: 'Upper', durationMinutes: 50, ...extra,
  };
}

beforeEach(() => {
  seq = 0;
  mockStartWorkout.mockReset();
  mockToastShow.mockClear();
});

// ─── F-8: the computed week stats ───────────────────────────────────────────
// RE-ANCHORED D224 (founder order 2026-10-11, on Today: "Remove the recovery
// data from today. I don't want it there full stop."): the week's volume was
// computed only for the coach brief's fatigue rules, which are gone, so Home
// computes no week stats and the brief is handed none.
describe('D218 (F-8, P21) and D224: Home computes no week stats for the brief', () => {
  test('the brief is handed no weekly volume, fatigue or deload reading', async () => {
    useAppStore.setState(userState());
    const brief = spyOn(homeCoachBriefMod, 'buildCoachBrief');
    applyFixture({ db: { getAllWorkouts: async () => [lastWorkout({})], getWorkoutSetsSince: async () => sessionSets('w-last') } });
    await mountHome({});
    for (const [args] of brief.mock.calls) {
      expect(args).not.toHaveProperty('weeklyVolume');
      expect(args).not.toHaveProperty('fatigueHistory');
      expect(args).not.toHaveProperty('deloadSuggestion');
    }
  });
});

// ─── F-3: the block rows ────────────────────────────────────────────────────
describe('D218 (F-3, P19): the block rows credit through the unfiltered lookup', () => {
  test('sets on a soft-deleted custom exercise count towards the block week', async () => {
    useAppStore.setState(userState());
    const build = spyOn(blockWeekProgressMod, 'buildBlockProgressRows');
    applyFixture({
      db: {
        getCurrentMesocycleWeek: async () => ({
          id: 'wk1', mesocycleId: 'm1', weekIndex: 1, plannedWeeks: 6, blockStartMs: Date.now() - 2 * DAY,
          isDeload: false, recoveryState: null,
        }),
        getPlannedMuscleVolume: async () => [{ muscle: 'triceps', planned_sets: 8 }, { muscle: 'chest', planned_sets: 10 }],
        getWorkoutSetsSince: async () => [
          ...repeated(2, () => setRow('w-x', 'ex-custom-hammer', 20, 10)),
          ...repeated(3, () => setRow('w-x', 'ex-bench', 100, 10)),
        ],
      },
    });
    await mountHome({});
    expect(build).toHaveBeenCalled();
    const [planned, actual] = build.mock.calls[build.mock.calls.length - 1];
    expect(planned).toHaveLength(2);
    expect(actual.triceps?.workingSets).toBe(2);
    expect(actual.chest?.workingSets).toBe(3);
  });
});

// ─── F-25 caller: the deload check ──────────────────────────────────────────
// RE-ANCHORED D224: Today runs no deload check (a recovery reading); Progress
// runs its own (useProgressData), pinned there.
describe('D218 (F-25, P40) and D224: Today runs no deload check', () => {
  test('the bucket builder is never called on Today', async () => {
    useAppStore.setState(userState());
    const build = spyOn(algorithmsMod, 'buildLast4WeekDeloadBuckets');
    applyFixture({ db: { getAllWorkouts: async () => [lastWorkout({ totalVolume: null })], getWorkoutSetsSince: async () => sessionSets('w-last') } });
    await mountHome({});
    expect(build).not.toHaveBeenCalled();
  });
});

// ─── Source guards ──────────────────────────────────────────────────────────
describe('D218: HomeScreen source guards', () => {
  const SOURCE = require('fs').readFileSync(require('path').join(__dirname, '..', 'HomeScreen.js'), 'utf8');

  test('Home reads the shared lookup and no longer reads the filtered library for reporting', () => {
    expect(SOURCE).toMatch(/getExerciseLookup/);
    expect(SOURCE).not.toMatch(/getAllExercises/);
    expect(SOURCE).not.toMatch(/buildLoadSemanticsById/);
    // RE-POINTED (D231, batch 2): the units label belonged to the last-session
    // row, which moved to Train; Today no longer reads the person's weight unit
    // for it and no longer builds a session total.
    expect(SOURCE).not.toMatch(/units: s\.units/);
    expect(SOURCE).not.toMatch(/buildSessionReport/);
  });

  // RE-POINTED (D231, batch 2): the Repeat toast copy lives in the lib module
  // Train's Repeat uses now; the ruled sentences are unchanged.
  test('the repeat toast copy is exactly the ruled sentences, British English, no em dash', () => {
    const REPEAT = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'lib', 'repeatSession.js'), 'utf8');
    expect(REPEAT).toContain('One exercise from that session is not on this device, so it was left out.');
    expect(REPEAT).toContain('exercises from that session are not on this device, so they were left out.');
    expect(REPEAT).toContain('One exercise from that session could not be loaded, so it was left out.');
    expect(REPEAT).toContain('exercises from that session could not be loaded, so they were left out.');
    expect(REPEAT).not.toMatch(/—/);
  });
});
