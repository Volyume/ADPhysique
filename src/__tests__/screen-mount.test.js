/**
 * Screen mount harness — for every Pro screen the user can reach from
 * the Hub, this test mounts the component via react-test-renderer with
 * realistic prop and store state, then flushes microtasks so useEffects
 * (data loads, prefills) run. Any synchronous render throw or unhandled
 * effect rejection that React surfaces shows up as a failed assertion
 * with the screen name in the message.
 *
 * What this catches:
 * - Import-time errors (typos in named exports, missing files)
 * - Synchronous render throws (undefined property access in JSX)
 * - State-update race that leaves a screen in an unreachable render shape
 *
 * What it does NOT catch:
 * - Native layout crashes (NaN dimensions, ViewManager bugs)
 * - Crashes during user interaction (button taps) — separate harness
 * - Real DB / network paths (everything is stubbed)
 */

jest.mock('react-native-url-polyfill/auto', () => ({}), { virtual: true });

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
}), { virtual: true });

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
}), { virtual: true });

jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => ([{ granted: true, canAskAgain: true }, jest.fn()]),
}), { virtual: true });

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
}), { virtual: true });

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}), { virtual: true });

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() => Promise.resolve({ type: 'cancel' })),
}), { virtual: true });

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  MediaTypeOptions: { Images: 'Images' },
}), { virtual: true });

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(() => Promise.resolve({ uri: '' })),
}), { virtual: true });

jest.mock('expo-av', () => ({
  Audio: { Sound: { createAsync: jest.fn(() => Promise.resolve({ sound: { unloadAsync: jest.fn() } })) } },
}), { virtual: true });

jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  requestReview: jest.fn(() => Promise.resolve()),
}), { virtual: true });

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(() => Promise.resolve(false)),
  unregisterTaskAsync: jest.fn(() => Promise.resolve()),
}), { virtual: true });

jest.mock('expo-background-fetch', () => ({
  registerTaskAsync: jest.fn(() => Promise.resolve()),
  unregisterTaskAsync: jest.fn(() => Promise.resolve()),
  setMinimumIntervalAsync: jest.fn(() => Promise.resolve()),
  BackgroundFetchResult: { NewData: 1, NoData: 2, Failed: 3 },
  BackgroundFetchStatus: { Available: 3 },
  getStatusAsync: jest.fn(() => Promise.resolve(3)),
}), { virtual: true });

jest.mock('expo-sensors', () => ({
  Pedometer: { isAvailableAsync: jest.fn(() => Promise.resolve(false)), watchStepCount: jest.fn(() => ({ remove: () => {} })) },
}), { virtual: true });

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
    DAILY: 'daily',
    WEEKLY: 'weekly',
    YEARLY: 'yearly',
    DATE: 'date',
    TIME_INTERVAL: 'timeInterval',
    CALENDAR: 'calendar',
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
}), { virtual: true });

jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas', Path: 'Path', Skia: { Path: { Make: () => ({ moveTo: () => {}, lineTo: () => {}, close: () => {} }) } },
  useFont: () => null, useImage: () => null,
}), { virtual: true });

jest.mock('react-native-gifted-charts', () => {
  const React = require('react');
  return {
    LineChart: props => React.createElement('LineChart', props),
    BarChart: props => React.createElement('BarChart', props),
    PieChart: props => React.createElement('PieChart', props),
  };
}, { virtual: true });

jest.mock('react-native-calendar-heatmap', () => {
  const React = require('react');
  return { default: props => React.createElement('CalendarHeatmap', props) };
}, { virtual: true });

jest.mock('victory-native', () => ({
  CartesianChart: 'CartesianChart', Line: 'Line', Bar: 'Bar',
}), { virtual: true });

jest.mock('react-native-svg', () => {
  const React = require('react');
  const mk = name => props => React.createElement(name, props, props.children);
  return {
    Svg: mk('Svg'), Path: mk('Path'), G: mk('G'), Circle: mk('Circle'),
    Rect: mk('Rect'), Line: mk('Line'), Text: mk('Text'), Defs: mk('Defs'),
    LinearGradient: mk('LinearGradient'), Stop: mk('Stop'), ClipPath: mk('ClipPath'),
    default: mk('Svg'),
  };
}, { virtual: true });

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const passthrough = name => props => React.createElement(name, props, props.children);
  return {
    default: { View: passthrough('Animated.View'), Text: passthrough('Animated.Text'), createAnimatedComponent: c => c, call: () => {}, Value: function (v) { return { value: v }; } },
    useSharedValue: v => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: v => v, withSpring: v => v, withDelay: (_, v) => v, withRepeat: v => v, withSequence: v => v,
    runOnJS: fn => fn, runOnUI: fn => fn,
    Easing: new Proxy({}, { get: () => () => 0 }),
    interpolate: () => 0, Extrapolate: { CLAMP: 'clamp' },
    FadeIn: { duration: () => ({}) }, FadeOut: { duration: () => ({}) },
  };
}, { virtual: true });

jest.mock('react-native-webview', () => {
  const React = require('react');
  return { WebView: props => React.createElement('WebView', props), default: props => React.createElement('WebView', props) };
}, { virtual: true });

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const passthrough = name => props => React.createElement(name, props, props.children);
  return {
    GestureHandlerRootView: passthrough('GHRoot'),
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
  useFocusEffect: jest.fn(),
  useIsFocused: () => true,
  useScrollToTop: jest.fn(),
  NavigationContainer: ({ children }) => children,
  StackActions: { popToTop: jest.fn(), replace: jest.fn(), push: jest.fn() },
  CommonActions: { navigate: jest.fn(), reset: jest.fn() },
}));

// Toast hook used by some screens. Returns a no-op show fn.
jest.mock('../components/Toast', () => {
  const React = require('react');
  return {
    useToast: () => ({ show: jest.fn(), hide: jest.fn() }),
    ToastProvider: ({ children }) => children,
    default: props => React.createElement('Toast', props),
  };
});

// Feedback hook surfaces a feedback sheet. Stubbed so screens that
// open it on render don't crash.
jest.mock('../components/FeedbackSheet', () => {
  const React = require('react');
  return {
    useFeedback: () => ({ open: jest.fn(), close: jest.fn() }),
    FeedbackProvider: ({ children }) => children,
    default: props => React.createElement('FeedbackSheet', props),
  };
}, { virtual: true });

// Components that wrap react-native-svg or Skia: stubbed so we don't
// need every drawing primitive to be mocked deeply. __esModule:true is
// required so babel's default-export interop returns the function, not
// the whole module wrapper.
jest.mock('../components/BodyDiagramHeatmap', () => {
  const React = require('react');
  return { __esModule: true, default: props => React.createElement('BodyDiagramHeatmap', props) };
});

jest.mock('../components/GradientCard', () => {
  const React = require('react');
  return { __esModule: true, default: props => React.createElement('GradientCard', props, props.children) };
});

// Local native modules — referenced by package.json file: deps.
jest.mock('rest-timer-live', () => ({ start: jest.fn(), stop: jest.fn(), update: jest.fn() }), { virtual: true });
jest.mock('live-activity', () => ({ start: jest.fn(), stop: jest.fn(), update: jest.fn() }), { virtual: true });

// __DEV__ is a Metro-injected global in real RN bundles; jest's node
// env doesn't have it. Set it before screens load so any code that
// reads __DEV__ in module scope doesn't blow up.
global.__DEV__ = false;

// rAF is browser-native but Node doesn't have it. RN provides it via
// the runtime polyfill. Match RN's behavior: fire on next macrotask.
if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
}

const React = require('react');
const TestRenderer = require('react-test-renderer');

// Hydrate the store with a realistic logged-in Pro user shape so screens
// that read user/tier/userProfile don't bail early. Using getState/setState
// because hooks aren't available outside React's render cycle.
const useAppStore = require('../store/useAppStore').default;

// Silence console.error globally so act warnings don't dominate the
// jest output. We still capture errors per-mount via mountScreen.
const origConsoleError = console.error;
beforeAll(() => {
  console.error = (msg, ...rest) => {
    const text = typeof msg === 'string' ? msg : String(msg);
    if (/wrap.*act|environment has been torn down|Cannot log after tests|Each child in a list/i.test(text)) return;
    origConsoleError(msg, ...rest);
  };
});
afterAll(() => { console.error = origConsoleError; });

beforeEach(() => {
  // We call setState outside React; the act warning gets emitted by
  // any subscribers. We suppress those warnings via the global
  // console.error filter above.
  useAppStore.setState({
    user: { id: '901aeb17-b8f5-43b7-b0e7-b5375aaa68c4', email: 'test@example.com', isLocal: false },
    session: { user: { id: '901aeb17-b8f5-43b7-b0e7-b5375aaa68c4' } },
    tier: 'pro',
    firstRunComplete: true,
    userProfile: { firstName: 'Test', goal: 'lean_gain', trainingFocus: 'hypertrophy', units: 'metric' },
    activeWorkout: null,
    workoutExercises: [],
    accessibility: { reduceMotion: false, higherContrast: false, largerText: false },
    accessibilityLoaded: true,
  });
});

// Build a complete navigation prop. Some screens call methods we'd
// otherwise miss (getParent, addListener returning a cleanup, etc.)
// so we provide the whole surface.
function makeNav() {
  const nav = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    push: jest.fn(),
    pop: jest.fn(),
    popToTop: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
    setParams: jest.fn(),
    dispatch: jest.fn(),
    addListener: jest.fn(() => () => {}),
    removeListener: jest.fn(),
    canGoBack: jest.fn(() => true),
    isFocused: jest.fn(() => true),
    getId: jest.fn(() => 'test-route'),
    getState: jest.fn(() => ({ routes: [], index: 0 })),
  };
  nav.getParent = jest.fn(() => nav);
  return nav;
}

async function mountScreen(Screen, props = {}) {
  const errors = [];
  const origErr = console.error;
  console.error = (msg, ...rest) => {
    const text = typeof msg === 'string' ? msg : String(msg);
    // Filter out React's act() advisory — it's noise during mount
    // tests, not a real failure signal. Likewise filter out the
    // "test environment torn down" warnings that fire when an
    // unawaited useEffect lands after a test completes.
    if (/wrap.*act|environment has been torn down|Cannot log after tests|Each child in a list|Function components cannot be given refs|forwardRef|inside StrictMode/i.test(text)) return;
    errors.push(text);
  };
  let tree = null;
  try {
    await TestRenderer.act(async () => {
      tree = TestRenderer.create(
        React.createElement(Screen, {
          navigation: makeNav(),
          route: { params: {}, name: 'Test' },
          ...props,
        }),
      );
    });
    // Flush microtasks so async useEffects run. Multiple ticks because
    // some effects chain (load -> setState -> rerender -> more effects).
    await TestRenderer.act(async () => {
      for (let i = 0; i < 6; i++) await Promise.resolve();
    });
  } finally {
    console.error = origErr;
  }
  return { tree, errors };
}

// Tear down the rendered tree so dangling effects don't bleed into the
// next test's assertions. Call this in afterEach when you've stashed
// the tree at the test scope.
function unmountTree(tree) {
  if (!tree) return;
  try { TestRenderer.act(() => { tree.unmount(); }); } catch (_) {}
}

// ─── Button-bashing helpers ──────────────────────────────────────────────

// Walk the test-renderer tree and collect every node that looks
// tappable. We rely on the type names from the RN mock (TouchableOpacity,
// Pressable, etc.), not on instanceof, so this works against the mocked
// renderer output.
function collectTappables(tree) {
  const out = [];
  function visit(node) {
    if (!node) return;
    if (typeof node === 'string' || typeof node === 'number') return;
    const t = node.type;
    if (typeof t === 'string' && /Touchable|Pressable|Switch/i.test(t) && node.props?.onPress) {
      out.push(node);
    }
    const children = node.children;
    if (Array.isArray(children)) children.forEach(visit);
    else if (children && typeof children === 'object') visit(children);
  }
  const root = tree.toJSON();
  if (Array.isArray(root)) root.forEach(visit); else visit(root);
  return out;
}

// Bash every tappable on the screen and report any callback that throws.
// We swallow per-tap errors so one bad button doesn't stop the sweep.
async function bashTappables(tree) {
  const failures = [];
  const tappables = collectTappables(tree);
  for (let i = 0; i < tappables.length; i++) {
    const node = tappables[i];
    try {
      await TestRenderer.act(async () => {
        node.props.onPress?.();
        await Promise.resolve();
      });
    } catch (e) {
      failures.push({
        index: i,
        label: node.props.accessibilityLabel ?? node.props.testID ?? node.props.children?.toString?.()?.slice(0, 40) ?? '(no label)',
        error: e.message,
        stack: (e.stack || '').split('\n').slice(1, 4).join(' | '),
      });
    }
  }
  return { count: tappables.length, failures };
}

// Collect every TextInput node so we can pump text into it.
function collectTextInputs(tree) {
  const out = [];
  function visit(node) {
    if (!node || typeof node === 'string' || typeof node === 'number') return;
    if (typeof node.type === 'string' && /TextInput/i.test(node.type) && node.props?.onChangeText) {
      out.push(node);
    }
    const c = node.children;
    if (Array.isArray(c)) c.forEach(visit); else if (c && typeof c === 'object') visit(c);
  }
  const root = tree.toJSON();
  if (Array.isArray(root)) root.forEach(visit); else visit(root);
  return out;
}

// Pump a sequence of values through each TextInput. The values are
// designed to hit common input edge cases: empty, zero, very large,
// negative, decimal, non-numeric.
async function bashTextInputs(tree) {
  const failures = [];
  const inputs = collectTextInputs(tree);
  const stress = ['', '0', '999999', '-5', '1.5', 'abc', '   ', '0.000001'];
  for (const node of inputs) {
    for (const v of stress) {
      try {
        await TestRenderer.act(async () => {
          node.props.onChangeText?.(v);
          await Promise.resolve();
        });
      } catch (e) {
        failures.push({
          input: node.props.placeholder ?? node.props.accessibilityLabel ?? '(no label)',
          value: v,
          error: e.message,
        });
      }
    }
  }
  return { count: inputs.length, failures };
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('Pro screens mount without error', () => {
  test('NutritionTargetsScreen mounts on a fresh account', async () => {
    const Screen = require('../screens/NutritionTargetsScreen').default;
    const { tree, errors } = await mountScreen(Screen);
    expect(tree).not.toBeNull();
    expect(errors).toEqual([]);
  });

  test('NutritionTargetsScreen — every tappable fires without throwing', async () => {
    const Screen = require('../screens/NutritionTargetsScreen').default;
    const { tree } = await mountScreen(Screen);
    const { count, failures } = await bashTappables(tree);
    expect(count).toBeGreaterThan(0);
    expect(failures).toEqual([]);
  });

  test('NutritionTargetsScreen mounts with previously-saved targets in the DB', async () => {
    // Simulate getNutritionTargets returning a partial row (the typical
    // shape after cloud restore: many derived fields are absent). We
    // monkey-patch the loaded module rather than jest.doMock+resetModules
    // because resetModules invalidates the React instance held by
    // react-test-renderer and breaks hooks.
    const database = require('../lib/database');
    const origGet = database.getNutritionTargets;
    const origGetBody = database.getUserBodyProfile;
    database.getNutritionTargets = () => Promise.resolve({
      id: 'nt1',
      userId: '901aeb17-b8f5-43b7-b0e7-b5375aaa68c4',
      bmr: 1700, tdee: 2600, targetKcal: 2900,
      proteinG: 200, carbsG: 350, fatG: 80,
      phase: 'lean gain', bmrMethod: 'mifflin', activityLevel: 'moderate',
      confidence: 'medium', warnings: [], gdprConsented: true,
      // Notably absent: proteinGPerKg, proteinGPerKgLbm, proteinBasis,
      // proteinApproach, goal, kcalMin, kcalMax, maintenanceKcal,
      // targetRateKgPerWeek. This is what really lands in the DB.
      createdAt: Date.now(), updatedAt: Date.now(),
    });
    database.getUserBodyProfile = () => Promise.resolve({
      sex: 'male', heightCm: 178, dateOfBirth: '1990-01-01',
    });
    try {
      const Screen = require('../screens/NutritionTargetsScreen').default;
      const { tree, errors } = await mountScreen(Screen);
      expect(tree).not.toBeNull();
      expect(errors).toEqual([]);
    } finally {
      database.getNutritionTargets = origGet;
      database.getUserBodyProfile = origGetBody;
    }
  });
});

// ─── Mass screen sweep ─────────────────────────────────────────────────────
//
// Mount every Pro-reachable screen and click every touchable. Catches
// crashes that would only surface when a user actually drives the app.
// Skipped screens are ones that need props we can't easily mock (e.g.
// WorkoutSummaryScreen reads route.params populated by the finish flow).

const SCREENS_TO_SWEEP = [
  'AthleteHubScreen',
  'AnalyticsScreen',
  'BlockReflectionScreen',
  'BodyMetricsScreen',
  'BuildWorkoutScreen',
  'CoachHeldHistoryScreen',
  'CoachOutputScreen',
  'CoachReviewScreen',
  'CoachingRemindersScreen',
  'DebugLogScreen',
  'ExerciseLibraryScreen',
  'FirstRunScreen',
  'GoalChangeSummaryScreen',
  'HomeScreen',
  'ImportScreen',
  'LoginScreen',
  'ManualBuilderScreen',
  'MesocycleBuilderScreen',
  'NotificationSettingsScreen',
  'NutritionEducationScreen',
  'NutritionTargetsScreen',
  'OnboardingScreen',
  'PRWallScreen',
  'PlanLibraryScreen',
  'PlansScreen',
  'PrivacyPolicyScreen',
  'ProGoalSetupScreen',
  'ProOnboardingScreen',
  'ProSetupCompleteScreen',
  'ProUpgradeScreen',
  'SettingsScreen',
  'SubscriptionPolicyScreen',
  'VolumeHeatmapScreen',
  'WeeklyCheckInScreen',
  'WelcomeScreen',
  'WellbeingCheckScreen',
  'WorkoutHistoryScreen',
  'YearOfLiftsScreen',
];

// Four state shapes worth running each screen against. Real users
// arrive in one of these and the screen has to render something sane
// in each one rather than crash.
const STATE_VARIANTS = [
  {
    name: 'pro+loaded',
    state: {
      user: { id: 'u-pro', email: 't@e.com', isLocal: false },
      session: { user: { id: 'u-pro' } },
      tier: 'pro',
      firstRunComplete: true,
      userProfile: { firstName: 'Test', goal: 'lean_gain', trainingFocus: 'hypertrophy', units: 'metric' },
    },
  },
  {
    name: 'pro+empty-profile',
    state: {
      user: { id: 'u-pro', email: 't@e.com', isLocal: false },
      session: { user: { id: 'u-pro' } },
      tier: 'pro',
      firstRunComplete: true,
      userProfile: {},
    },
  },
  {
    name: 'free+no-profile',
    state: {
      user: { id: 'u-free', email: 't@e.com', isLocal: false },
      session: { user: { id: 'u-free' } },
      tier: 'free',
      firstRunComplete: true,
      userProfile: null,
    },
  },
  {
    name: 'local-only',
    state: {
      user: { id: 'u-local', isLocal: true },
      session: null,
      tier: 'free',
      firstRunComplete: true,
      userProfile: { firstName: 'Local' },
    },
  },
];

// ─── Fuzz: random tap chains ─────────────────────────────────────────────
//
// Pick N random touchables on a screen and fire them in sequence. Repeats
// across multiple seeds to surface ordering-sensitive bugs (e.g. tapping
// A then B leaves state where B's onPress crashes).

function seedRand(seed) {
  // Mulberry32 — deterministic, good enough for jest.
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function fuzzTapChain(tree, depth, rand) {
  const failures = [];
  for (let i = 0; i < depth; i++) {
    const tappables = collectTappables(tree);
    if (!tappables.length) return failures;
    const node = tappables[Math.floor(rand() * tappables.length)];
    try {
      await TestRenderer.act(async () => {
        node.props.onPress?.();
        await Promise.resolve();
      });
    } catch (e) {
      failures.push({
        step: i,
        label: node.props.accessibilityLabel ?? '(no label)',
        error: e.message,
      });
    }
  }
  return failures;
}

describe('All reachable screens — mount + bash every touchable + every text input', () => {
  for (const screenName of SCREENS_TO_SWEEP) {
    for (const variant of STATE_VARIANTS) {
      test(`${screenName} [${variant.name}]`, async () => {
        useAppStore.setState(variant.state);
        let Screen;
        try {
          Screen = require(`../screens/${screenName}`).default;
        } catch (e) {
          throw new Error(`Import failed for ${screenName}: ${e.message}`);
        }
        if (!Screen) throw new Error(`No default export from ${screenName}`);
        let tree = null;
        try {
          const result = await mountScreen(Screen);
          tree = result.tree;
          if (!tree) return;
          const tapResult = await bashTappables(tree);
          const inputResult = await bashTextInputs(tree);
          // Filter out failures that are clearly the test harness's
          // mock boundary (navigator prop, missing context value).
          const realTapFailures = tapResult.failures.filter(f =>
            !/getState\b|dispatch\b|navigation\.navigate\b|getParent\b/i.test(f.error),
          );
          const realInputFailures = inputResult.failures.filter(f =>
            !/getState\b|dispatch\b|navigation\.navigate\b|getParent\b/i.test(f.error),
          );
          if (realTapFailures.length || realInputFailures.length) {
            console.log(
              `[${screenName} / ${variant.name}] taps=${tapResult.count} inputs=${inputResult.count}\n` +
              `  tap failures: ${JSON.stringify(realTapFailures, null, 2)}\n` +
              `  input failures: ${JSON.stringify(realInputFailures, null, 2)}`,
            );
          }
          expect(realTapFailures).toEqual([]);
          expect(realInputFailures).toEqual([]);
        } finally {
          unmountTree(tree);
        }
      });
    }
  }
});

// ─── Fuzz pass: 10 random tap chains per screen, each 20 taps deep ──────
//
// This is the "thousands of clicks" requested. 38 screens × 10 seeds × 20
// taps = ~7,600 simulated taps. Filters the same mock-boundary errors as
// the deterministic sweep above.

// ─── Param-driven screens ────────────────────────────────────────────────
//
// These don't appear in the sweep because they need route.params to
// render anything useful. Test each with a realistic param shape.

describe('Screens with route.params', () => {
  test('WorkoutSummaryScreen renders with finish-flow params', async () => {
    useAppStore.setState(STATE_VARIANTS[0].state);
    const Screen = require('../screens/WorkoutSummaryScreen').default;
    let tree = null;
    try {
      const { tree: t, errors } = await mountScreen(Screen, {
        route: {
          params: {
            workoutId: 'w1',
            routineId: 'r1',
            durationMinutes: 45,
            exerciseCount: 5,
            setCount: 15,
            workingSetCount: 12,
            tonnage: 5400,
            exerciseNames: ['Bench Press', 'Row', 'Squat'],
            detectedPRs: [],
            exerciseData: [],
          },
          name: 'WorkoutSummary',
        },
      });
      tree = t;
      expect(tree).not.toBeNull();
      expect(errors).toEqual([]);
      const { failures } = await bashTappables(tree);
      const real = failures.filter(f => !/getState|dispatch|navigation\.navigate|getParent/i.test(f.error));
      expect(real).toEqual([]);
    } finally { unmountTree(tree); }
  });

  test('RoutineDetailScreen renders with routineId param', async () => {
    useAppStore.setState(STATE_VARIANTS[0].state);
    const Screen = require('../screens/RoutineDetailScreen').default;
    let tree = null;
    try {
      const { tree: t, errors } = await mountScreen(Screen, {
        route: { params: { routineId: 'r1' }, name: 'RoutineDetail' },
      });
      tree = t;
      expect(tree).not.toBeNull();
      expect(errors).toEqual([]);
    } finally { unmountTree(tree); }
  });

  test('PlanDetailScreen renders with planId param', async () => {
    useAppStore.setState(STATE_VARIANTS[0].state);
    const Screen = require('../screens/PlanDetailScreen').default;
    let tree = null;
    try {
      const { tree: t, errors } = await mountScreen(Screen, {
        route: { params: { planId: 'p1', isLibrary: false }, name: 'PlanDetail' },
      });
      tree = t;
      expect(tree).not.toBeNull();
      expect(errors).toEqual([]);
    } finally { unmountTree(tree); }
  });

  test('PlanDetailScreen with isLibrary=true (library mode)', async () => {
    useAppStore.setState(STATE_VARIANTS[0].state);
    const Screen = require('../screens/PlanDetailScreen').default;
    let tree = null;
    try {
      const { tree: t, errors } = await mountScreen(Screen, {
        route: { params: { planId: 'lib1', isLibrary: true }, name: 'PlanDetail' },
      });
      tree = t;
      expect(tree).not.toBeNull();
      expect(errors).toEqual([]);
    } finally { unmountTree(tree); }
  });

  test('BlockReflectionScreen with valid mesocycleId param', async () => {
    useAppStore.setState(STATE_VARIANTS[0].state);
    const Screen = require('../screens/BlockReflectionScreen').default;
    let tree = null;
    try {
      const { tree: t, errors } = await mountScreen(Screen, {
        route: { params: { mesocycleId: 'm1' }, name: 'BlockReflection' },
      });
      tree = t;
      expect(tree).not.toBeNull();
      expect(errors).toEqual([]);
    } finally { unmountTree(tree); }
  });

  test('CoachOutputScreen with weekStart param', async () => {
    useAppStore.setState(STATE_VARIANTS[0].state);
    const Screen = require('../screens/CoachOutputScreen').default;
    let tree = null;
    try {
      const { tree: t, errors } = await mountScreen(Screen, {
        route: { params: { weekStart: '2026-05-19' }, name: 'CoachOutput' },
      });
      tree = t;
      expect(tree).not.toBeNull();
      expect(errors).toEqual([]);
    } finally { unmountTree(tree); }
  });

  test('GoalChangeSummaryScreen with previous and next params', async () => {
    useAppStore.setState(STATE_VARIANTS[0].state);
    const Screen = require('../screens/GoalChangeSummaryScreen').default;
    let tree = null;
    try {
      const { tree: t, errors } = await mountScreen(Screen, {
        route: {
          params: {
            previous: { goal: 'lean_gain', phase: 'maintenance', kcal: 2500 },
            next: { goal: 'mild_cut', phase: 'cut', kcal: 2200 },
          },
          name: 'GoalChangeSummary',
        },
      });
      tree = t;
      expect(tree).not.toBeNull();
      expect(errors).toEqual([]);
      const { failures } = await bashTappables(tree);
      const real = failures.filter(f => !/getState|dispatch|navigation\.navigate|getParent/i.test(f.error));
      expect(real).toEqual([]);
    } finally { unmountTree(tree); }
  });

  test('YearOfLiftsScreen with yearMs param', async () => {
    useAppStore.setState(STATE_VARIANTS[0].state);
    const Screen = require('../screens/YearOfLiftsScreen').default;
    let tree = null;
    try {
      const { tree: t, errors } = await mountScreen(Screen, {
        route: { params: { yearMs: new Date('2026-01-01').getTime() }, name: 'YearOfLifts' },
      });
      tree = t;
      expect(tree).not.toBeNull();
      expect(errors).toEqual([]);
    } finally { unmountTree(tree); }
  });

  test('ExerciseDetailScreen renders with exerciseId param', async () => {
    useAppStore.setState(STATE_VARIANTS[0].state);
    const Screen = require('../screens/ExerciseDetailScreen').default;
    let tree = null;
    try {
      const { tree: t, errors } = await mountScreen(Screen, {
        route: { params: { exerciseId: 'e1' }, name: 'ExerciseDetail' },
      });
      tree = t;
      expect(tree).not.toBeNull();
      expect(errors).toEqual([]);
    } finally { unmountTree(tree); }
  });

  test('ShareCardScreen renders with session data params', async () => {
    useAppStore.setState(STATE_VARIANTS[0].state);
    const Screen = require('../screens/ShareCardScreen').default;
    let tree = null;
    try {
      const { tree: t, errors } = await mountScreen(Screen, {
        route: {
          params: {
            sessionData: {
              sessionName: 'Push Day',
              duration: 60,
              workingSets: 12,
              exerciseCount: 5,
              tonnage: 5400,
              exercises: ['Bench', 'Row'],
              prCount: 2,
              topSet: { exercise: 'Bench', weight: 100, reps: 5 },
            },
          },
          name: 'ShareCard',
        },
      });
      tree = t;
      expect(tree).not.toBeNull();
      expect(errors).toEqual([]);
    } finally { unmountTree(tree); }
  });
});

// ─── NutritionTargets: realistic userProfile.goal values ────────────────
//
// Every goal the app can produce, including legacy / weird values. The
// screen has a `VALID_GOALS` list — anything outside should not crash.

describe('NutritionTargets: every userProfile.goal value', () => {
  const goalValues = [
    'lean_gain', 'build', 'maintain', 'recomp', 'mild_cut', 'aggressive_cut',
    'contest_prep', // valid but only set via ProGoalSetup
    null, undefined, '', 'unknown_value', 'cut', 'bulk',
    123, true, { wrong: 'shape' }, ['array'],
  ];
  for (const goal of goalValues) {
    test(`renders with goal=${JSON.stringify(goal)}`, async () => {
      useAppStore.setState({
        ...STATE_VARIANTS[0].state,
        userProfile: { firstName: 'T', goal, units: 'metric' },
      });
      const Screen = require('../screens/NutritionTargetsScreen').default;
      let tree = null;
      try {
        const { tree: t, errors } = await mountScreen(Screen);
        tree = t;
        expect(tree).not.toBeNull();
        expect(errors).toEqual([]);
      } finally { unmountTree(tree); }
    });
  }
});

// ─── Form workflow: fill inputs, tap calculate ──────────────────────────

describe('NutritionTargets: fill form then tap Calculate', () => {
  test('happy path fill + calculate does not crash', async () => {
    useAppStore.setState(STATE_VARIANTS[0].state);
    const Screen = require('../screens/NutritionTargetsScreen').default;
    let tree = null;
    try {
      const { tree: t } = await mountScreen(Screen);
      tree = t;
      const inputs = collectTextInputs(tree);
      // Fill any input that asks for a number with realistic values.
      // The screen has age, height ft, height in, weight, body fat.
      const fillValues = ['28', '5', '10', '82', '15'];
      for (let i = 0; i < inputs.length && i < fillValues.length; i++) {
        await TestRenderer.act(async () => {
          inputs[i].props.onChangeText?.(fillValues[i]);
          await Promise.resolve();
        });
      }
      // Now tap every button — the Calculate button is among them.
      const { failures } = await bashTappables(tree);
      const real = failures.filter(f => !/getState|dispatch|navigation\.navigate|getParent/i.test(f.error));
      expect(real).toEqual([]);
    } finally { unmountTree(tree); }
  });

  test('bogus form input + tap Calculate does not crash', async () => {
    useAppStore.setState(STATE_VARIANTS[0].state);
    const Screen = require('../screens/NutritionTargetsScreen').default;
    let tree = null;
    try {
      const { tree: t } = await mountScreen(Screen);
      tree = t;
      const inputs = collectTextInputs(tree);
      // Pump nonsense into every input.
      for (const inp of inputs) {
        for (const v of ['', '0', '-1', '99999', 'NaN', 'undefined', '.5']) {
          await TestRenderer.act(async () => {
            inp.props.onChangeText?.(v);
            await Promise.resolve();
          });
        }
      }
      const { failures } = await bashTappables(tree);
      const real = failures.filter(f => !/getState|dispatch|navigation\.navigate|getParent/i.test(f.error));
      expect(real).toEqual([]);
    } finally { unmountTree(tree); }
  });
});

// ─── Form-driven screens: interleaved text input + tap ─────────────────
//
// Many bugs only surface when a user fills inputs then taps a button.
// This is more aggressive than the original input-stress: for each
// screen that has inputs, pump values into every input then tap every
// button, then re-pump, re-tap, repeat 3 cycles.

async function interleavedFormBash(tree, cycles = 3) {
  const failures = [];
  const inputValues = ['10', '50', '25', '100', ''];
  for (let cycle = 0; cycle < cycles; cycle++) {
    const inputs = collectTextInputs(tree);
    for (let i = 0; i < inputs.length; i++) {
      try {
        await TestRenderer.act(async () => {
          inputs[i].props.onChangeText?.(inputValues[(i + cycle) % inputValues.length]);
          await Promise.resolve();
        });
      } catch (e) {
        failures.push({ cycle, kind: 'input', index: i, error: e.message });
      }
    }
    const taps = collectTappables(tree);
    for (let i = 0; i < taps.length; i++) {
      try {
        await TestRenderer.act(async () => {
          taps[i].props.onPress?.();
          await Promise.resolve();
        });
      } catch (e) {
        failures.push({ cycle, kind: 'tap', index: i, label: taps[i].props.accessibilityLabel ?? '(no label)', error: e.message });
      }
    }
  }
  return failures;
}

describe('Form-driven screens: interleaved input + tap × 3 cycles', () => {
  const FORM_SCREENS = [
    'NutritionTargetsScreen',
    'WeeklyCheckInScreen',
    'BodyMetricsScreen',
    'ImportScreen',
    'NotificationSettingsScreen',
    'CoachingRemindersScreen',
    'ManualBuilderScreen',
  ];
  for (const screenName of FORM_SCREENS) {
    test(`${screenName}: 3 cycles of fill-and-tap`, async () => {
      useAppStore.setState(STATE_VARIANTS[0].state);
      let Screen;
      try { Screen = require(`../screens/${screenName}`).default; } catch (_) { return; }
      if (!Screen) return;
      let tree = null;
      try {
        const result = await mountScreen(Screen);
        tree = result.tree;
        if (!tree) return;
        const failures = await interleavedFormBash(tree, 3);
        const real = failures.filter(f => !/getState|dispatch|navigation\.navigate|getParent/i.test(f.error));
        if (real.length) console.log(`[${screenName} form] failures:`, JSON.stringify(real.slice(0, 5), null, 2));
        expect(real).toEqual([]);
      } finally { unmountTree(tree); }
    });
  }
});

// ─── Edge: empty arrays where rendering might assume non-empty ─────────

describe('Edge: empty arrays in expected-populated state', () => {
  test('PRWallScreen with one exercise but empty history array', async () => {
    const database = require('../lib/database');
    const orig = {
      getAllCompletedSetsForExercise: database.getAllCompletedSetsForExercise,
      getAllExercises: database.getAllExercises,
    };
    database.getAllExercises = () => Promise.resolve([
      { id: 'e1', name: 'Bench Press', primaryMuscle: 'chest', equipment: 'Barbell' },
    ]);
    database.getAllCompletedSetsForExercise = () => Promise.resolve([]);
    try {
      useAppStore.setState(STATE_VARIANTS[0].state);
      const Screen = require('../screens/PRWallScreen').default;
      let tree = null;
      try {
        const { tree: t, errors } = await mountScreen(Screen);
        tree = t;
        expect(tree).not.toBeNull();
        expect(errors).toEqual([]);
        const { failures } = await bashTappables(tree);
        const real = failures.filter(f => !/getState|dispatch|navigation\.navigate|getParent/i.test(f.error));
        expect(real).toEqual([]);
      } finally { unmountTree(tree); }
    } finally {
      Object.assign(database, orig);
    }
  });

  test('AnalyticsScreen with workouts but empty sets', async () => {
    const database = require('../lib/database');
    const orig = {
      getAllWorkouts: database.getAllWorkouts,
      getCompletedWorkoutSets: database.getCompletedWorkoutSets,
    };
    database.getAllWorkouts = () => Promise.resolve([{
      id: 'w1', userId: 'u1', startedAt: Date.now() - 86400000,
      isCompleted: 1, setCount: 0, totalVolume: 0,
    }]);
    database.getCompletedWorkoutSets = () => Promise.resolve([]);
    try {
      useAppStore.setState(STATE_VARIANTS[0].state);
      const Screen = require('../screens/AnalyticsScreen').default;
      let tree = null;
      try {
        const { tree: t, errors } = await mountScreen(Screen);
        tree = t;
        expect(tree).not.toBeNull();
        expect(errors).toEqual([]);
      } finally { unmountTree(tree); }
    } finally {
      Object.assign(database, orig);
    }
  });
});

// ─── Complete workout lifecycle simulation ──────────────────────────────
//
// Walks through start → log sets → finish, mounting each intermediate
// state and bashing every interaction. Mirrors what a user does in one
// session.

describe('Workout lifecycle: start → log → finish', () => {
  test('1. Start: HomeScreen with an active plan mounts and tap-bash clean', async () => {
    const database = require('../lib/database');
    const orig = {
      getActivePlan: database.getActivePlan,
      getRoutinesForPlan: database.getRoutinesForPlan,
    };
    database.getActivePlan = () => Promise.resolve({
      id: 'p1', userId: 'u1', name: 'Push Pull Legs',
      isActive: 1, nextWorkoutIndex: 0,
    });
    database.getRoutinesForPlan = () => Promise.resolve([
      { id: 'r1', planId: 'p1', name: 'Push', orderIndex: 0 },
      { id: 'r2', planId: 'p1', name: 'Pull', orderIndex: 1 },
      { id: 'r3', planId: 'p1', name: 'Legs', orderIndex: 2 },
    ]);
    try {
      useAppStore.setState(STATE_VARIANTS[0].state);
      const Screen = require('../screens/HomeScreen').default;
      let tree = null;
      try {
        const { tree: t, errors } = await mountScreen(Screen);
        tree = t;
        expect(tree).not.toBeNull();
        expect(errors).toEqual([]);
        const { failures } = await bashTappables(tree);
        const real = failures.filter(f => !/getState|dispatch|navigation\.navigate|getParent/i.test(f.error));
        expect(real).toEqual([]);
      } finally { unmountTree(tree); }
    } finally {
      Object.assign(database, orig);
    }
  });

  test('2. Mid-workout: ActiveWorkoutScreen with 3 exercises, sets logged in some', async () => {
    useAppStore.setState({
      user: { id: 'u-lifecycle', isLocal: false },
      session: { user: { id: 'u-lifecycle' } },
      tier: 'pro',
      firstRunComplete: true,
      userProfile: { firstName: 'L', goal: 'lean_gain', units: 'metric' },
      activeWorkout: { id: 'wlc', userId: 'u-lifecycle', routineId: 'r1', startedAt: Date.now() - 600000, isCompleted: false },
      workoutStartTime: Date.now() - 600000,
      workoutExercises: [
        {
          exercise: { id: 'ex1', name: 'Bench Press', equipment: 'Barbell', primaryMuscle: 'chest' },
          routineExercise: { id: 're1', recommendedSets: 3, recommendedRepsMin: 8, recommendedRepsMax: 12 },
          sets: [
            { id: 's1', exerciseId: 'ex1', workoutId: 'wlc', setNumber: 1, setType: 'straight', actualReps: 10, weight: 80 },
            { id: 's2', exerciseId: 'ex1', workoutId: 'wlc', setNumber: 2, setType: 'straight', actualReps: 9, weight: 80 },
          ],
        },
        {
          exercise: { id: 'ex2', name: 'Pull Up', equipment: 'Bodyweight', primaryMuscle: 'back' },
          routineExercise: { id: 're2', recommendedSets: 3, recommendedRepsMin: 5, recommendedRepsMax: 10 },
          sets: [
            { id: 's3', exerciseId: 'ex2', workoutId: 'wlc', setNumber: 1, setType: 'warmup', actualReps: 5, weight: 0 },
          ],
        },
        {
          exercise: { id: 'ex3', name: 'Squat', equipment: 'Barbell', primaryMuscle: 'quads' },
          routineExercise: { id: 're3', recommendedSets: 3, recommendedRepsMin: 5, recommendedRepsMax: 8 },
          sets: [],
        },
      ],
      currentExerciseIndex: 0,
      restTimerActive: false,
      accessibility: { reduceMotion: false },
    });
    const Screen = require('../screens/ActiveWorkoutScreen').default;
    let tree = null;
    try {
      const { tree: t, errors } = await mountScreen(Screen);
      tree = t;
      expect(tree).not.toBeNull();
      expect(errors).toEqual([]);
      // Bash every touchable across this mid-workout state.
      const { failures } = await bashTappables(tree);
      const real = failures.filter(f => !/getState|dispatch|navigation\.navigate|getParent/i.test(f.error));
      if (real.length) console.log('[lifecycle/mid] failures:', JSON.stringify(real.slice(0, 5), null, 2));
      expect(real).toEqual([]);
    } finally { unmountTree(tree); }
  });

  test('3. Finish: WorkoutSummaryScreen with realistic finished-workout params', async () => {
    useAppStore.setState(STATE_VARIANTS[0].state);
    const Screen = require('../screens/WorkoutSummaryScreen').default;
    let tree = null;
    try {
      const { tree: t, errors } = await mountScreen(Screen, {
        route: {
          params: {
            workoutId: 'wlc',
            routineId: 'r1',
            durationMinutes: 52,
            exerciseCount: 3,
            setCount: 8,
            workingSetCount: 6,
            tonnage: 4320,
            exerciseNames: ['Bench Press', 'Pull Up', 'Squat'],
            detectedPRs: [
              { exerciseName: 'Bench Press', kind: 'volume', value: 800 },
            ],
            exerciseData: [
              {
                exerciseId: 'ex1', name: 'Bench Press',
                recommendedSets: 3, repsMin: 8, repsMax: 12,
                loggedSets: [
                  { weight: 80, reps: 10, setType: 'straight' },
                  { weight: 80, reps: 9, setType: 'straight' },
                  { weight: 80, reps: 8, setType: 'straight' },
                ],
              },
            ],
          },
          name: 'WorkoutSummary',
        },
      });
      tree = t;
      expect(tree).not.toBeNull();
      expect(errors).toEqual([]);
      const { failures } = await bashTappables(tree);
      const real = failures.filter(f => !/getState|dispatch|navigation\.navigate|getParent/i.test(f.error));
      expect(real).toEqual([]);
    } finally { unmountTree(tree); }
  });
});

// ─── Hub → NutritionTargets navigation simulation ──────────────────────
//
// The reported crash was tapping "Nutrition Targets" on AthleteHub. We
// can't drive real navigation in the harness, but we can verify that
// when AthleteHub IS mounted with realistic Pro state and the user
// taps every card on it, no onPress throws. Combined with the
// NutritionTargets mount tests above, this covers the same surface as
// the actual navigation.

describe('Hub → NutritionTargets simulated flow', () => {
  test('AthleteHub mounts and every card onPress fires without throwing', async () => {
    useAppStore.setState({
      ...STATE_VARIANTS[0].state,
      userProfile: { firstName: 'Test', goal: 'lean_gain', units: 'metric' },
    });
    const Hub = require('../screens/AthleteHubScreen').default;
    let tree = null;
    try {
      const { tree: t, errors } = await mountScreen(Hub);
      tree = t;
      expect(tree).not.toBeNull();
      expect(errors).toEqual([]);
      const { failures } = await bashTappables(tree);
      const real = failures.filter(f => !/getState|dispatch|navigation\.navigate|getParent/i.test(f.error));
      expect(real).toEqual([]);
    } finally { unmountTree(tree); }

    // Now mount NutritionTargets — the target of the Hub tap.
    const NT = require('../screens/NutritionTargetsScreen').default;
    let ntTree = null;
    try {
      const { tree: t, errors } = await mountScreen(NT);
      ntTree = t;
      expect(ntTree).not.toBeNull();
      expect(errors).toEqual([]);
    } finally { unmountTree(ntTree); }
  });

  test('AthleteHub renders with the exact data shape the user has (lots of programmes, 1 mesocycle, nutrition set)', async () => {
    const database = require('../lib/database');
    const origGet = {
      getAllWorkouts: database.getAllWorkouts,
      getNutritionTargets: database.getNutritionTargets,
    };
    database.getAllWorkouts = () => Promise.resolve([{
      id: 'w-real', userId: 'u-real', startedAt: Date.now() - 86400000,
      endedAt: Date.now() - 86400000 + 3600000, durationMinutes: 60,
      isCompleted: 1, setCount: 7, totalVolume: 50,
    }]);
    database.getNutritionTargets = () => Promise.resolve({
      id: 'nt-real', userId: 'u-real',
      bmr: 1700, tdee: 2600, targetKcal: 2900,
      proteinG: 200, carbsG: 350, fatG: 80,
      phase: 'lean gain', activityLevel: 'moderate',
      confidence: 'medium', warnings: null, gdprConsented: true,
      createdAt: Date.now() - 3600000, updatedAt: Date.now() - 3600000,
    });
    try {
      useAppStore.setState({
        user: { id: 'u-real', email: 'real@e.com', isLocal: false },
        session: { user: { id: 'u-real' } },
        tier: 'pro',
        firstRunComplete: true,
        userProfile: { firstName: 'R', goal: 'lean_gain', trainingFocus: 'hypertrophy', units: 'metric' },
        accessibility: { reduceMotion: false },
      });
      const Hub = require('../screens/AthleteHubScreen').default;
      let tree = null;
      try {
        const { tree: t, errors } = await mountScreen(Hub);
        tree = t;
        expect(tree).not.toBeNull();
        expect(errors).toEqual([]);
        const { failures } = await bashTappables(tree);
        const real = failures.filter(f => !/getState|dispatch|navigation\.navigate|getParent/i.test(f.error));
        expect(real).toEqual([]);
      } finally { unmountTree(tree); }
    } finally {
      Object.assign(database, origGet);
    }
  });
});

// ─── Scale stress: large data shapes ─────────────────────────────────────

describe('Scale stress: large data does not break render or interaction', () => {
  test('Analytics with 200 workouts, 1500 sets', async () => {
    const database = require('../lib/database');
    const orig = {
      getAllWorkouts: database.getAllWorkouts,
      getCompletedWorkoutSets: database.getCompletedWorkoutSets,
    };
    database.getAllWorkouts = () => Promise.resolve(
      Array.from({ length: 200 }, (_, i) => ({
        id: `w${i}`, userId: 'u1',
        startedAt: Date.now() - i * 86400000,
        endedAt: Date.now() - i * 86400000 + 3600000,
        durationMinutes: 45 + (i % 30),
        isCompleted: 1,
        setCount: 7 + (i % 5),
        totalVolume: 3000 + (i * 50),
      })),
    );
    database.getCompletedWorkoutSets = () => Promise.resolve(
      Array.from({ length: 1500 }, (_, i) => ({
        id: `s${i}`, userId: 'u1',
        workoutId: `w${i % 200}`,
        exerciseId: `e${i % 30}`,
        setNumber: (i % 5) + 1,
        setType: i % 4 === 0 ? 'warmup' : 'straight',
        actualReps: 8 + (i % 8),
        weight: 30 + (i % 80),
      })),
    );
    try {
      useAppStore.setState(STATE_VARIANTS[0].state);
      const Screen = require('../screens/AnalyticsScreen').default;
      let tree = null;
      try {
        const { tree: t, errors } = await mountScreen(Screen);
        tree = t;
        expect(tree).not.toBeNull();
        expect(errors).toEqual([]);
        const { failures } = await bashTappables(tree);
        const real = failures.filter(f => !/getState|dispatch|navigation\.navigate|getParent/i.test(f.error));
        expect(real).toEqual([]);
      } finally { unmountTree(tree); }
    } finally {
      Object.assign(database, orig);
    }
  });

  test('WorkoutHistory with 500 workouts renders without crashing', async () => {
    const database = require('../lib/database');
    const orig = database.getAllWorkouts;
    database.getAllWorkouts = () => Promise.resolve(
      Array.from({ length: 500 }, (_, i) => ({
        id: `w${i}`, userId: 'u1',
        startedAt: Date.now() - i * 86400000,
        endedAt: Date.now() - i * 86400000 + 3600000,
        durationMinutes: 60,
        isCompleted: 1,
        setCount: 8,
        totalVolume: 4000,
        name: `Session ${i}`,
      })),
    );
    try {
      useAppStore.setState(STATE_VARIANTS[0].state);
      const Screen = require('../screens/WorkoutHistoryScreen').default;
      let tree = null;
      try {
        const { tree: t, errors } = await mountScreen(Screen);
        tree = t;
        expect(tree).not.toBeNull();
        expect(errors).toEqual([]);
      } finally { unmountTree(tree); }
    } finally {
      database.getAllWorkouts = orig;
    }
  });

  test('ExerciseLibrary with all canonical exercises mounted', async () => {
    const database = require('../lib/database');
    const orig = database.getAllExercises;
    database.getAllExercises = () => Promise.resolve(
      Array.from({ length: 500 }, (_, i) => ({
        id: `e${i}`,
        name: `Exercise ${i}`,
        primaryMuscle: ['chest', 'back', 'quads', 'shoulders', 'hamstrings', 'biceps', 'triceps', 'glutes'][i % 8],
        equipment: ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight'][i % 5],
        movementPattern: ['push', 'pull', 'squat', 'hinge'][i % 4],
        compoundIsolation: i % 2 ? 'compound' : 'isolation',
      })),
    );
    try {
      useAppStore.setState(STATE_VARIANTS[0].state);
      const Screen = require('../screens/ExerciseLibraryScreen').default;
      let tree = null;
      try {
        const { tree: t, errors } = await mountScreen(Screen);
        tree = t;
        expect(tree).not.toBeNull();
        expect(errors).toEqual([]);
      } finally { unmountTree(tree); }
    } finally {
      database.getAllExercises = orig;
    }
  });
});

// ─── Tap-then-re-render: catches crashes that surface on re-mount ────────
//
// Many bugs only fire on the SECOND render after a tap mutated state.
// This pass: tap every touchable, then re-collect the tree's tappables
// (catches new buttons that appeared after the tap) and bash those too.

async function bashTwoLevels(tree) {
  const failures = [];
  const firstPass = collectTappables(tree);
  for (let i = 0; i < firstPass.length; i++) {
    const node = firstPass[i];
    try {
      await TestRenderer.act(async () => {
        node.props.onPress?.();
        await Promise.resolve();
        await Promise.resolve();
      });
    } catch (e) {
      failures.push({
        depth: 1, index: i,
        label: node.props.accessibilityLabel ?? '(no label)',
        error: e.message,
      });
    }
    // After the tap, re-collect and bash any newly-visible touchables.
    const secondPass = collectTappables(tree);
    for (let j = 0; j < secondPass.length; j++) {
      try {
        await TestRenderer.act(async () => {
          secondPass[j].props.onPress?.();
          await Promise.resolve();
        });
      } catch (e) {
        failures.push({
          depth: 2, primary: i, follow: j,
          label: secondPass[j].props.accessibilityLabel ?? '(no label)',
          error: e.message,
        });
      }
    }
  }
  return { firstCount: firstPass.length, failures };
}

describe('Two-level tap: bash, then bash again after each tap re-renders', () => {
  const PRO_LOADED = STATE_VARIANTS[0].state;
  // 38 screens × 2 levels would be slow. Sample the 12 highest-stakes
  // screens — anything the user touches multiple times in one session.
  // ProGoalSetupScreen is excluded because its Save button kicks off a
  // full plan-engine generation in the test env; the two-level depth
  // ends up regenerating the plan dozens of times and blows the jest
  // default timeout. That path is covered by the deterministic sweep.
  const HOT_SCREENS = [
    'AthleteHubScreen',
    'BodyMetricsScreen',
    'CoachOutputScreen',
    'CoachingRemindersScreen',
    'HomeScreen',
    'NotificationSettingsScreen',
    'NutritionTargetsScreen',
    'PlansScreen',
    'SettingsScreen',
    'WeeklyCheckInScreen',
    'WorkoutHistoryScreen',
  ];
  for (const screenName of HOT_SCREENS) {
    test(`${screenName}: two-level tap stress`, async () => {
      useAppStore.setState(PRO_LOADED);
      let Screen;
      try { Screen = require(`../screens/${screenName}`).default; } catch (_) { return; }
      if (!Screen) return;
      let tree = null;
      try {
        const result = await mountScreen(Screen);
        tree = result.tree;
        if (!tree) return;
        const { failures } = await bashTwoLevels(tree);
        const real = failures.filter(f => !/getState|dispatch|navigation\.navigate|getParent/i.test(f.error));
        if (real.length) console.log(`[${screenName} two-level] failures:`, JSON.stringify(real.slice(0, 5), null, 2));
        expect(real).toEqual([]);
      } finally { unmountTree(tree); }
    });
  }
});

// ─── Accessibility mode variants ────────────────────────────────────────
//
// Reduce Motion + Higher Contrast + Larger Text are all user-toggleable.
// Each rebakes StyleSheets and changes some component branches. Mount
// every screen against each combination to catch crashes that only fire
// under accessibility overrides.

const A11Y_VARIANTS = [
  { name: 'rm-on', accessibility: { reduceMotion: true, higherContrast: false, largerText: false } },
  { name: 'hc-on', accessibility: { reduceMotion: false, higherContrast: true, largerText: false } },
  { name: 'lt-on', accessibility: { reduceMotion: false, higherContrast: false, largerText: true } },
  { name: 'all-on', accessibility: { reduceMotion: true, higherContrast: true, largerText: true } },
];

describe('A11y: mount every screen under each accessibility override', () => {
  for (const screenName of SCREENS_TO_SWEEP) {
    for (const a11y of A11Y_VARIANTS) {
      test(`${screenName} [a11y: ${a11y.name}]`, async () => {
        useAppStore.setState({
          ...STATE_VARIANTS[0].state,
          accessibility: a11y.accessibility,
          accessibilityLoaded: true,
        });
        let Screen;
        try { Screen = require(`../screens/${screenName}`).default; } catch (_) { return; }
        if (!Screen) return;
        let tree = null;
        try {
          const result = await mountScreen(Screen);
          tree = result.tree;
          if (!tree) return;
          const { failures } = await bashTappables(tree);
          const real = failures.filter(f => !/getState|dispatch|navigation\.navigate|getParent/i.test(f.error));
          if (real.length) console.log(`[${screenName} a11y ${a11y.name}] failures:`, JSON.stringify(real.slice(0, 3), null, 2));
          expect(real).toEqual([]);
        } finally { unmountTree(tree); }
      });
    }
  }
});

// ─── Stress: corrupted / unusual data shapes from the DB ────────────────
//
// What happens when getWorkouts() returns one workout with missing
// fields, when an exercise has no name, when set_count is NaN, when
// the cloud restore inserted a row with target_kcal=null but
// gdpr_consented=true? These are realistic post-restore shapes.

describe('Stress: screens render against corrupted DB shapes', () => {
  test('NutritionTargets: row with null targetKcal does not crash render', async () => {
    const database = require('../lib/database');
    const orig = database.getNutritionTargets;
    database.getNutritionTargets = () => Promise.resolve({
      id: 'nt1', userId: 'u1',
      bmr: null, tdee: null, targetKcal: null,
      proteinG: null, carbsG: null, fatG: null,
      phase: null, bmrMethod: null, activityLevel: null,
      confidence: null, warnings: null, gdprConsented: true,
      createdAt: 0, updatedAt: 0,
    });
    try {
      const Screen = require('../screens/NutritionTargetsScreen').default;
      const { tree, errors } = await mountScreen(Screen);
      expect(tree).not.toBeNull();
      expect(errors).toEqual([]);
    } finally {
      database.getNutritionTargets = orig;
    }
  });

  test('HomeScreen: getAllExercises returns rows with null names', async () => {
    const database = require('../lib/database');
    const orig = database.getAllExercises;
    database.getAllExercises = () => Promise.resolve([
      { id: 'e1', name: null, primaryMuscle: 'chest' },
      { id: 'e2', name: 'Squat', primaryMuscle: null },
      { id: 'e3', name: '', primaryMuscle: 'quads' },
    ]);
    try {
      const Screen = require('../screens/HomeScreen').default;
      const { tree, errors } = await mountScreen(Screen);
      expect(tree).not.toBeNull();
      expect(errors).toEqual([]);
    } finally {
      database.getAllExercises = orig;
    }
  });

  test('AnalyticsScreen: empty data set renders without crashing', async () => {
    const database = require('../lib/database');
    const orig = {
      getAllWorkouts: database.getAllWorkouts,
      getCompletedWorkoutSets: database.getCompletedWorkoutSets,
    };
    database.getAllWorkouts = () => Promise.resolve([]);
    database.getCompletedWorkoutSets = () => Promise.resolve([]);
    try {
      const Screen = require('../screens/AnalyticsScreen').default;
      const { tree, errors } = await mountScreen(Screen);
      expect(tree).not.toBeNull();
      expect(errors).toEqual([]);
    } finally {
      Object.assign(database, orig);
    }
  });

  test('AnalyticsScreen: dataset with one workout and one set', async () => {
    const database = require('../lib/database');
    const orig = {
      getAllWorkouts: database.getAllWorkouts,
      getCompletedWorkoutSets: database.getCompletedWorkoutSets,
    };
    database.getAllWorkouts = () => Promise.resolve([{
      id: 'w1', userId: 'u1', startedAt: Date.now() - 86400000,
      endedAt: Date.now() - 86400000 + 3600000, durationMinutes: 60,
      isCompleted: 1, setCount: 1, totalVolume: 600,
    }]);
    database.getCompletedWorkoutSets = () => Promise.resolve([{
      id: 's1', userId: 'u1', workoutId: 'w1', exerciseId: 'e1',
      setNumber: 1, setType: 'straight', actualReps: 10, weight: 60,
    }]);
    try {
      const Screen = require('../screens/AnalyticsScreen').default;
      const { tree, errors } = await mountScreen(Screen);
      expect(tree).not.toBeNull();
      expect(errors).toEqual([]);
    } finally {
      Object.assign(database, orig);
    }
  });
});

// ─── Rapid double-tap stress on critical buttons ─────────────────────────
//
// Beta testers WILL mash buttons. We simulate that by tapping every
// touchable five times in rapid succession with no state flush. Should
// catch any onPress handler that doesn't guard against re-entrance.

async function bashTappablesRapid(tree, repeats = 5) {
  const failures = [];
  const tappables = collectTappables(tree);
  for (let i = 0; i < tappables.length; i++) {
    const node = tappables[i];
    try {
      await TestRenderer.act(async () => {
        for (let r = 0; r < repeats; r++) node.props.onPress?.();
        await Promise.resolve();
      });
    } catch (e) {
      failures.push({
        index: i,
        label: node.props.accessibilityLabel ?? '(no label)',
        error: e.message,
      });
    }
  }
  return { count: tappables.length, failures };
}

describe('Rapid double-tap stress on every screen', () => {
  const PRO_LOADED = STATE_VARIANTS[0].state;
  for (const screenName of SCREENS_TO_SWEEP) {
    test(`${screenName}: 5x rapid tap on every button`, async () => {
      useAppStore.setState(PRO_LOADED);
      let Screen;
      try { Screen = require(`../screens/${screenName}`).default; } catch (_) { return; }
      if (!Screen) return;
      let tree = null;
      try {
        const result = await mountScreen(Screen);
        tree = result.tree;
        if (!tree) return;
        const { failures } = await bashTappablesRapid(tree, 5);
        const real = failures.filter(f =>
          !/getState\b|dispatch\b|navigation\.navigate\b|getParent\b/i.test(f.error),
        );
        if (real.length) console.log(`[${screenName} rapid] failures:`, JSON.stringify(real.slice(0, 3), null, 2));
        expect(real).toEqual([]);
      } finally {
        unmountTree(tree);
      }
    });
  }
});

// ─── ActiveWorkoutScreen: with a workout in progress ─────────────────────

describe('ActiveWorkoutScreen — many exercises, varied set shapes', () => {
  test('5 exercises with varied set arrays mounts and renders', async () => {
    const mkExercise = (i, sets) => ({
      exercise: { id: `ex${i}`, name: `Exercise ${i}`, equipment: i % 2 ? 'Barbell' : 'Dumbbell', primaryMuscle: 'chest' },
      routineExercise: { id: `re${i}`, recommendedSets: 3, recommendedRepsMin: 8, recommendedRepsMax: 12 },
      sets,
    });
    useAppStore.setState({
      user: { id: 'u-many', isLocal: false },
      session: { user: { id: 'u-many' } },
      tier: 'pro',
      firstRunComplete: true,
      userProfile: { firstName: 'M', goal: 'lean_gain', units: 'metric' },
      activeWorkout: { id: 'w-many', userId: 'u-many', routineId: 'r-many', startedAt: Date.now(), isCompleted: false },
      workoutStartTime: Date.now(),
      workoutExercises: [
        mkExercise(1, [
          { id: 's1', exerciseId: 'ex1', workoutId: 'w-many', setNumber: 1, setType: 'warmup', actualReps: 10, weight: 40 },
          { id: 's2', exerciseId: 'ex1', workoutId: 'w-many', setNumber: 2, setType: 'straight', actualReps: 8, weight: 80 },
        ]),
        mkExercise(2, []),                          // empty array
        mkExercise(3, [{ id: 's3', exerciseId: 'ex3', workoutId: 'w-many', setNumber: 1, setType: 'straight', actualReps: 6, weight: 100 }]),
        // intentionally omit sets to confirm the entry.sets?.length guard fires
        { exercise: { id: 'ex4', name: 'Exercise 4', equipment: 'Cable' }, routineExercise: { id: 're4' } },
        mkExercise(5, [{ id: 's5', exerciseId: 'ex5', workoutId: 'w-many', setNumber: 1, setType: 'amrap', actualReps: 15, weight: 50 }]),
      ],
      currentExerciseIndex: 0,
      restTimerActive: false,
      accessibility: { reduceMotion: false },
    });
    const Screen = require('../screens/ActiveWorkoutScreen').default;
    let tree = null;
    try {
      const { tree: t, errors } = await mountScreen(Screen);
      tree = t;
      expect(tree).not.toBeNull();
      expect(errors).toEqual([]);
      const { failures } = await bashTappables(tree);
      const real = failures.filter(f => !/getState|dispatch|navigation\.navigate|getParent/i.test(f.error));
      if (real.length) console.log('[5 exercises] failures:', JSON.stringify(real.slice(0, 5), null, 2));
      expect(real).toEqual([]);
    } finally { unmountTree(tree); }
  });

  test('1 exercise with a set missing weight / reps fields', async () => {
    useAppStore.setState({
      user: { id: 'u1', isLocal: false },
      session: { user: { id: 'u1' } },
      tier: 'pro',
      firstRunComplete: true,
      userProfile: { firstName: 'A', goal: 'lean_gain', units: 'metric' },
      activeWorkout: { id: 'w1', userId: 'u1', routineId: 'r1', startedAt: Date.now(), isCompleted: false },
      workoutStartTime: Date.now(),
      workoutExercises: [{
        exercise: { id: 'ex1', name: 'Bench Press', equipment: 'Barbell', primaryMuscle: 'chest' },
        routineExercise: { id: 're1', recommendedSets: 3, recommendedRepsMin: 8, recommendedRepsMax: 12 },
        sets: [
          { id: 's1', exerciseId: 'ex1', workoutId: 'w1', setNumber: 1, setType: 'straight' }, // no weight or reps
          { id: 's2', exerciseId: 'ex1', workoutId: 'w1', setNumber: 2, setType: 'straight', actualReps: null, weight: null },
        ],
      }],
      currentExerciseIndex: 0,
      restTimerActive: false,
      accessibility: { reduceMotion: false },
    });
    const Screen = require('../screens/ActiveWorkoutScreen').default;
    let tree = null;
    try {
      const { tree: t, errors } = await mountScreen(Screen);
      tree = t;
      expect(tree).not.toBeNull();
      expect(errors).toEqual([]);
      const { failures } = await bashTappables(tree);
      const real = failures.filter(f => !/getState|dispatch|navigation\.navigate|getParent/i.test(f.error));
      if (real.length) console.log('[missing fields] failures:', JSON.stringify(real.slice(0, 5), null, 2));
      expect(real).toEqual([]);
    } finally { unmountTree(tree); }
  });
});

describe('ActiveWorkoutScreen with active workout state', () => {
  test('mounts mid-workout with logged sets without crashing', async () => {
    useAppStore.setState({
      user: { id: 'u-active', isLocal: false },
      session: { user: { id: 'u-active' } },
      tier: 'pro',
      firstRunComplete: true,
      userProfile: { firstName: 'A', goal: 'lean_gain', units: 'metric' },
      activeWorkout: {
        id: 'w1',
        userId: 'u-active',
        routineId: 'r1',
        startedAt: Date.now() - 10 * 60 * 1000,
        isCompleted: false,
      },
      workoutStartTime: Date.now() - 10 * 60 * 1000,
      workoutExercises: [
        {
          exercise: { id: 'ex1', name: 'Barbell Bench Press', equipment: 'Barbell', primaryMuscle: 'chest' },
          routineExercise: { id: 're1', recommendedSets: 3, recommendedRepsMin: 8, recommendedRepsMax: 12 },
          sets: [
            { id: 's1', exerciseId: 'ex1', workoutId: 'w1', setNumber: 1, setType: 'straight', actualReps: 10, weight: 60, rir: 2, rpe: null },
            { id: 's2', exerciseId: 'ex1', workoutId: 'w1', setNumber: 2, setType: 'straight', actualReps: 9, weight: 60, rir: 1, rpe: null },
          ],
        },
      ],
      currentExerciseIndex: 0,
      restTimerActive: false,
      restTimerDuration: 0,
      restTimerRemaining: 0,
      accessibility: { reduceMotion: false },
    });
    const Screen = require('../screens/ActiveWorkoutScreen').default;
    let tree = null;
    try {
      const result = await mountScreen(Screen);
      tree = result.tree;
      expect(tree).not.toBeNull();
      // Tap every touchable on the screen — covers Log Set, Skip Rest,
      // Add Set, Finish, Discard, exercise switcher, etc.
      const { failures } = await bashTappables(tree);
      const real = failures.filter(f =>
        !/getState\b|dispatch\b|navigation\.navigate\b|getParent\b/i.test(f.error),
      );
      if (real.length) console.log('[ActiveWorkout] failures:', JSON.stringify(real, null, 2));
      expect(real).toEqual([]);
    } finally {
      unmountTree(tree);
    }
  });

  test('handles 100-tap chains × 20 seeds in a 5-exercise workout', async () => {
    const mkExercise = (i, sets) => ({
      exercise: { id: `ex${i}`, name: `Exercise ${i}`, equipment: i % 2 ? 'Barbell' : 'Dumbbell', primaryMuscle: 'chest' },
      routineExercise: { id: `re${i}`, recommendedSets: 3, recommendedRepsMin: 8, recommendedRepsMax: 12 },
      sets,
    });
    useAppStore.setState({
      user: { id: 'u-fuzz', isLocal: false },
      session: { user: { id: 'u-fuzz' } },
      tier: 'pro',
      firstRunComplete: true,
      userProfile: { firstName: 'F', goal: 'lean_gain', units: 'metric' },
      activeWorkout: { id: 'wf', userId: 'u-fuzz', routineId: 'rf', startedAt: Date.now(), isCompleted: false },
      workoutStartTime: Date.now(),
      workoutExercises: [
        mkExercise(1, [{ id: 's1', exerciseId: 'ex1', workoutId: 'wf', setNumber: 1, setType: 'straight', actualReps: 10, weight: 60 }]),
        mkExercise(2, []),
        mkExercise(3, [{ id: 's3', exerciseId: 'ex3', workoutId: 'wf', setNumber: 1, setType: 'warmup', actualReps: 8, weight: 30 }]),
        { exercise: { id: 'ex4', name: 'Ex4', equipment: 'Cable' }, routineExercise: { id: 're4' } },
        mkExercise(5, [{ id: 's5', exerciseId: 'ex5', workoutId: 'wf', setNumber: 1, setType: 'amrap', actualReps: 12, weight: 40 }]),
      ],
      currentExerciseIndex: 0,
      restTimerActive: false,
      accessibility: { reduceMotion: false },
    });
    const Screen = require('../screens/ActiveWorkoutScreen').default;
    let tree = null;
    try {
      const result = await mountScreen(Screen);
      tree = result.tree;
      const allFailures = [];
      for (let seed = 1; seed <= 20; seed++) {
        const rand = seedRand(seed * 7919);
        const failures = await fuzzTapChain(tree, 100, rand);
        for (const f of failures) {
          if (!/getState|dispatch|navigation\.navigate|getParent/i.test(f.error)) {
            allFailures.push({ seed, ...f });
          }
        }
      }
      if (allFailures.length) console.log('[100×20 fuzz] failures:', JSON.stringify(allFailures.slice(0, 10), null, 2));
      expect(allFailures).toEqual([]);
    } finally { unmountTree(tree); }
  });

  test('handles a 50-tap random chain mid-workout', async () => {
    useAppStore.setState({
      user: { id: 'u-active', isLocal: false },
      session: { user: { id: 'u-active' } },
      tier: 'pro',
      firstRunComplete: true,
      userProfile: { firstName: 'A', goal: 'lean_gain', units: 'metric' },
      activeWorkout: { id: 'w1', userId: 'u-active', routineId: 'r1', startedAt: Date.now(), isCompleted: false },
      workoutStartTime: Date.now(),
      workoutExercises: [
        {
          exercise: { id: 'ex1', name: 'Squat', equipment: 'Barbell', primaryMuscle: 'quads' },
          routineExercise: { id: 're1', recommendedSets: 3, recommendedRepsMin: 5, recommendedRepsMax: 8 },
          sets: [],
        },
      ],
      currentExerciseIndex: 0,
      restTimerActive: false,
      accessibility: { reduceMotion: false },
    });
    const Screen = require('../screens/ActiveWorkoutScreen').default;
    let tree = null;
    try {
      const result = await mountScreen(Screen);
      tree = result.tree;
      const rand = seedRand(424242);
      const failures = await fuzzTapChain(tree, 50, rand);
      const real = failures.filter(f =>
        !/getState\b|dispatch\b|navigation\.navigate\b|getParent\b/i.test(f.error),
      );
      if (real.length) console.log('[ActiveWorkout fuzz] failures:', JSON.stringify(real.slice(0, 5), null, 2));
      expect(real).toEqual([]);
    } finally {
      unmountTree(tree);
    }
  });
});

describe('Fuzz: 20-tap chains across 10 seeds on every Pro screen', () => {
  const PRO_LOADED = STATE_VARIANTS[0].state;
  for (const screenName of SCREENS_TO_SWEEP) {
    test(`${screenName}: random 20-tap chains × 10 seeds`, async () => {
      useAppStore.setState(PRO_LOADED);
      let Screen;
      try { Screen = require(`../screens/${screenName}`).default; } catch (_) { return; }
      if (!Screen) return;
      let tree = null;
      try {
        const result = await mountScreen(Screen);
        tree = result.tree;
        if (!tree) return;
        const allFailures = [];
        for (let seed = 1; seed <= 10; seed++) {
          const rand = seedRand(seed * 1000 + screenName.length);
          const failures = await fuzzTapChain(tree, 20, rand);
          for (const f of failures) {
            if (!/getState\b|dispatch\b|navigation\.navigate\b|getParent\b/i.test(f.error)) {
              allFailures.push({ seed, ...f });
            }
          }
        }
        if (allFailures.length) {
          console.log(`[${screenName}] fuzz failures:`, JSON.stringify(allFailures.slice(0, 5), null, 2));
        }
        expect(allFailures).toEqual([]);
      } finally {
        unmountTree(tree);
      }
    });
  }
});
