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
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: () => {} })),
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
    if (/wrap.*act|environment has been torn down|Cannot log after tests|Each child in a list/i.test(text)) return;
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
  for (const node of tappables) {
    try {
      await TestRenderer.act(async () => {
        node.props.onPress?.();
        await Promise.resolve();
      });
    } catch (e) {
      failures.push({ label: node.props.accessibilityLabel ?? '(no label)', error: e.message });
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
  'BodyMetricsScreen',
  'CoachOutputScreen',
  'CoachingRemindersScreen',
  'DebugLogScreen',
  'ExerciseLibraryScreen',
  'HomeScreen',
  'NotificationSettingsScreen',
  'NutritionTargetsScreen',
  'PRWallScreen',
  'PlanLibraryScreen',
  'PlansScreen',
  'PrivacyPolicyScreen',
  'ProGoalSetupScreen',
  'ProUpgradeScreen',
  'SettingsScreen',
  'SubscriptionPolicyScreen',
  'VolumeHeatmapScreen',
  'WeeklyCheckInScreen',
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
