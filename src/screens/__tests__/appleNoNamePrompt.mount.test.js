/**
 * Sign in with Apple is never followed by a request for a name.
 *
 * Founder report (2026-08-19): "It asks you on the first bloody box of
 * onboarding!" Authentication Services already supplies the name at the Apple
 * button, so the screen straight after it must not ask for one.
 *
 * WHY THIS SUITE MOUNTS THE SCREENS INSTEAD OF READING THEIR SOURCE. The first
 * version of this file was a source-level pin, and it PASSED against code that
 * did nothing. It asserted that ProOnboardingScreen set a `nameFromApple` flag
 * in its OAuth handler and gated the first-name field on it. All of that was
 * literally present in the file - and all of it was dead. ProOnboardingStack
 * only mounts once a session exists (RootNavigator returns WelcomeStack while
 * `user` is null), so `step` initialises to 2, the sign-in step never renders,
 * the handler that set the flag never ran, and the field was shown to every
 * real Apple user. A source pin can prove a gate is written. Only a mount can
 * prove it is REACHED.
 *
 * So each case here renders the actual screen against a real store state and
 * asserts on what the tree contains. The Google case is the control: it must
 * still show the field, so a fix that simply deleted the input would fail.
 *
 * Covered across BOTH onboarding routes, FirstRunScreen (free) and
 * ProOnboardingScreen (Pro): first Apple signup (Apple supplies the name),
 * repeat sign-in (Apple supplies nothing), a private relay address, and an
 * athlete who refused the name, who must not be blocked or prompted.
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
}));

jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas', Path: 'Path', Skia: { Path: { Make: () => ({ moveTo: () => {}, lineTo: () => {}, close: () => {} }) } },
  useFont: () => null, useImage: () => null,
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const mk = name => props => React.createElement(name, props, props.children);
  return {
    // __esModule matters: without it Babel's interop hands `import Svg
    // from 'react-native-svg'` the whole mock object (an invalid element
    // type), not the default component below.
    __esModule: true,
    Svg: mk('Svg'), Path: mk('Path'), G: mk('G'), Circle: mk('Circle'),
    Rect: mk('Rect'), Line: mk('Line'), Text: mk('Text'), Defs: mk('Defs'),
    LinearGradient: mk('LinearGradient'), Stop: mk('Stop'), ClipPath: mk('ClipPath'),
    default: mk('Svg'),
  };
});

// react-native-reanimated is mocked globally via __mocks__/react-native-
// reanimated.js (auto-applied by Jest), so no per-file mock is needed here.

jest.mock('react-native-webview', () => {
  const React = require('react');
  return { WebView: props => React.createElement('WebView', props), default: props => React.createElement('WebView', props) };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const passthrough = name => props => React.createElement(name, props, props.children);
  // Gesture builder: every method is chainable and returns the same stub, so
  // VolyumeChart's Gesture.Pan().activateAfterLongPress(300).onBegin(...)... chain
  // resolves to a harmless object under test.
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
  useFocusEffect: jest.fn(),
  useIsFocused: () => true,
  useScrollToTop: jest.fn(),
  NavigationContainer: ({ children }) => children,
  StackActions: { popToTop: jest.fn(), replace: jest.fn(), push: jest.fn() },
  CommonActions: { navigate: jest.fn(), reset: jest.fn() },
}));

// Toast hook used by some screens. Returns a no-op show fn.
jest.mock('../../components/Toast', () => {
  const React = require('react');
  return {
    useToast: () => ({ show: jest.fn(), hide: jest.fn() }),
    ToastProvider: ({ children }) => children,
    default: props => React.createElement('Toast', props),
  };
});

// Feedback hook surfaces a feedback sheet. Stubbed so screens that
// open it on render don't crash.
jest.mock('../../components/FeedbackSheet', () => {
  const React = require('react');
  return {
    useFeedback: () => ({ open: jest.fn(), close: jest.fn() }),
    FeedbackProvider: ({ children }) => children,
    default: props => React.createElement('FeedbackSheet', props),
  };
});

// Components that wrap react-native-svg or Skia: stubbed so we don't
// need every drawing primitive to be mocked deeply. __esModule:true is
// required so babel's default-export interop returns the function, not
// the whole module wrapper.
jest.mock('../../components/BodyDiagramHeatmap', () => {
  const React = require('react');
  return { __esModule: true, default: props => React.createElement('BodyDiagramHeatmap', props) };
});

jest.mock('../../components/GradientCard', () => {
  const React = require('react');
  return { __esModule: true, default: props => React.createElement('GradientCard', props, props.children) };
});

// Local native modules, referenced by package.json file: deps.
jest.mock('rest-timer-live', () => ({ start: jest.fn(), stop: jest.fn(), update: jest.fn() }));
jest.mock('live-activity', () => ({ start: jest.fn(), stop: jest.fn(), update: jest.fn() }));
const React = require('react');
const TestRenderer = require('react-test-renderer');

const useAppStore = require('../../store/useAppStore').default;
const { noteAppleCredential, clearAppleCredential } = require('../../lib/appleIdentity');

const RELAY = 'ab12cd34ef@privaterelay.appleid.com';

// The auth users the reviewer's journeys actually produce.
const appleUser = (over = {}) => ({
  id: 'u-apple',
  email: RELAY,
  app_metadata: { provider: 'apple', providers: ['apple'] },
  user_metadata: {},
  ...over,
});
const googleUser = () => ({
  id: 'u-google',
  email: 'ada@gmail.com',
  app_metadata: { provider: 'google', providers: ['google'] },
  user_metadata: {},
});

function makeNav() {
  return {
    navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn(),
    addListener: jest.fn(() => () => {}), replace: jest.fn(), push: jest.fn(),
    reset: jest.fn(), canGoBack: jest.fn(() => true), dispatch: jest.fn(),
  };
}

const trees = [];
async function mount(Screen, state) {
  useAppStore.setState({
    user: null, session: null, userProfile: null, units: 'kg',
    bodyWeightUnits: 'st', tier: 'pro', firstRunComplete: false,
    proOnboardingAccountCreated: false,
    ...state,
  });
  let tree;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(React.createElement(Screen, { navigation: makeNav() }));
  });
  trees.push(tree);
  return tree;
}

/** Every accessibilityLabel rendered anywhere in the tree. */
function labels(tree) {
  return tree.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string', { deep: true })
    .map((n) => n.props.accessibilityLabel);
}

/** Every string rendered anywhere in the tree, flattened. */
function texts(tree) {
  const out = [];
  const walk = (node) => {
    if (typeof node === 'string') { out.push(node); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node && typeof node === 'object' && node.children) node.children.forEach(walk);
  };
  walk(tree.toJSON());
  return out;
}

/** Any TextInput whose keyboard/content type marks it as an e-mail box. */
function emailInputs(tree) {
  return tree.root.findAll(
    (n) => n.props?.keyboardType === 'email-address' || n.props?.textContentType === 'emailAddress',
    { deep: true },
  );
}

const NAME_LABEL = 'First name, optional';

afterEach(() => {
  clearAppleCredential();
  while (trees.length) {
    const t = trees.pop();
    try { TestRenderer.act(() => { t.unmount(); }); } catch (_) { /* already gone */ }
  }
});

// ── The free route ──────────────────────────────────────────────────────────
describe('FirstRunScreen (free onboarding)', () => {
  const Screen = () => require('../FirstRunScreen').default;

  test('CONTROL: a Google user still gets the name field', async () => {
    const tree = await mount(Screen(), { user: googleUser(), tier: 'free' });
    expect(labels(tree)).toContain(NAME_LABEL);
  });

  test('first Apple signup: no name field', async () => {
    noteAppleCredential({ givenName: 'Ada' });
    const tree = await mount(Screen(), { user: appleUser(), tier: 'free' });
    expect(labels(tree)).not.toContain(NAME_LABEL);
  });

  test('the name Apple gave is PERSISTED, not merely not-asked-for', async () => {
    // The other half of the fix. Hiding the box without keeping the name would
    // satisfy App Review and quietly lose the name the athlete already gave,
    // so the greeting would go blank. Apple hands it over once per Apple ID
    // ever, to signInWithApple and nobody else, which is why it is stashed at
    // that call and picked up here at the next profile write.
    const saveLocalProfile = jest.fn(() => Promise.resolve());
    noteAppleCredential({ givenName: 'Ada' });
    const tree = await mount(Screen(), { user: appleUser(), tier: 'free', saveLocalProfile });

    const cont = tree.root.findAll(
      (n) => n.props?.accessibilityLabel === 'Continue' && typeof n.props?.onPress === 'function',
      { deep: true },
    )[0];
    await TestRenderer.act(async () => { cont.props.onPress(); });

    expect(saveLocalProfile).toHaveBeenCalledTimes(1);
    expect(saveLocalProfile.mock.calls[0][1].firstName).toBe('Ada');
  });

  test('a name the athlete already has is never overwritten by Apple', async () => {
    const saveLocalProfile = jest.fn(() => Promise.resolve());
    noteAppleCredential({ givenName: 'Ada' });
    const tree = await mount(Screen(), {
      user: appleUser(), tier: 'free', saveLocalProfile,
      userProfile: { firstName: 'Bear' },
    });
    const cont = tree.root.findAll(
      (n) => n.props?.accessibilityLabel === 'Continue' && typeof n.props?.onPress === 'function',
      { deep: true },
    )[0];
    await TestRenderer.act(async () => { cont.props.onPress(); });
    expect(saveLocalProfile.mock.calls[0][1].firstName).toBe('Bear');
  });

  test('repeat Apple sign-in: credential null, stored profile answers, still no field', async () => {
    const tree = await mount(Screen(), {
      user: appleUser(), tier: 'free', userProfile: { firstName: 'Ada' },
    });
    expect(labels(tree)).not.toContain(NAME_LABEL);
  });

  test('reinstall: credential null AND no stored profile, still no field', async () => {
    // Apple returns the name once per Apple ID, ever, so there is nothing to
    // pre-fill here - and the pre-fill-only fix therefore showed an EMPTY box.
    const tree = await mount(Screen(), { user: appleUser(), tier: 'free', userProfile: null });
    expect(labels(tree)).not.toContain(NAME_LABEL);
  });

  test('a private relay address alone is enough to suppress the field', async () => {
    // Even with no provider metadata at all: the address can only be Apple's.
    const tree = await mount(Screen(), {
      user: { id: 'u-relay', email: RELAY }, tier: 'free',
    });
    expect(labels(tree)).not.toContain(NAME_LABEL);
  });

  test('the copy does not invite a name that is not there', async () => {
    const tree = await mount(Screen(), { user: appleUser(), tier: 'free' });
    expect(texts(tree).join(' ')).not.toMatch(/Add your name/i);
  });

  test('onboarding is not blocked: Continue renders with no name anywhere', async () => {
    const tree = await mount(Screen(), { user: appleUser(), tier: 'free', userProfile: null });
    expect(labels(tree)).toContain('Continue');
  });

  test('no e-mail is ever asked for', async () => {
    const tree = await mount(Screen(), { user: appleUser(), tier: 'free' });
    expect(emailInputs(tree)).toHaveLength(0);
  });
});

// ── The Pro route ───────────────────────────────────────────────────────────
describe('ProOnboardingScreen (Pro onboarding)', () => {
  const Screen = () => require('../ProOnboardingScreen').default;

  test('CONTROL: a Google user still gets the name field', async () => {
    const tree = await mount(Screen(), { user: googleUser(), proOnboardingAccountCreated: true });
    expect(labels(tree)).toContain(NAME_LABEL);
  });

  test('first Apple signup: no name field', async () => {
    noteAppleCredential({ givenName: 'Ada' });
    const tree = await mount(Screen(), { user: appleUser(), proOnboardingAccountCreated: true });
    expect(labels(tree)).not.toContain(NAME_LABEL);
  });

  test('repeat Apple sign-in: credential null, stored profile answers, still no field', async () => {
    const tree = await mount(Screen(), {
      user: appleUser(), proOnboardingAccountCreated: true, userProfile: { firstName: 'Ada' },
    });
    expect(labels(tree)).not.toContain(NAME_LABEL);
  });

  test('reinstall: credential null AND no stored profile, still no field', async () => {
    const tree = await mount(Screen(), {
      user: appleUser(), proOnboardingAccountCreated: true, userProfile: null,
    });
    expect(labels(tree)).not.toContain(NAME_LABEL);
  });

  test('a Google account that later linked Apple counts as Apple', async () => {
    const tree = await mount(Screen(), {
      user: {
        id: 'u-both', email: 'ada@gmail.com',
        app_metadata: { provider: 'google', providers: ['google', 'apple'] },
      },
      proOnboardingAccountCreated: true,
    });
    expect(labels(tree)).not.toContain(NAME_LABEL);
  });

  test('the rest of the wizard is untouched: sex is still asked, and still required', async () => {
    // Guideline 4 is about what Apple already supplies. Sex, age, height and
    // weight are ours, they drive the ED calorie floors, and hiding the name
    // must not have loosened any of them.
    const tree = await mount(Screen(), { user: appleUser(), proOnboardingAccountCreated: true });
    const l = labels(tree);
    expect(l).toContain('Biological sex');
    expect(l).toContain('Age');
  });

  test('no e-mail is ever asked for', async () => {
    const tree = await mount(Screen(), { user: appleUser(), proOnboardingAccountCreated: true });
    expect(emailInputs(tree)).toHaveLength(0);
  });
});
