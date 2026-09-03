/**
 * Sign in with Apple is not followed by a request for a name we already have.
 *
 * THIS IS A REJECTION, NOT A PREFERENCE. App Review rejected the app for
 * asking a signed-in athlete for a name it already had. An earlier commit in
 * this file's history claimed "nothing in this repo was ever rejected" and
 * used that to justify softening the rule; the claim was wrong, and the
 * softening is what shipped the rejection. Do not weaken these cases again.
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
 * THE RULE, after the founder's SECOND report on 2026-08-19 - made from a
 * TestFlight build that already carried the first attempt: an Apple account
 * is never shown the field. Not conditionally. Never.
 *
 * The first attempt hid it only when a name had actually arrived, so that an
 * athlete who cleared the name on Apple's sheet still had somewhere to answer.
 * That gate fails the commonest case there is. Apple supplies the name on the
 * FIRST authorisation for an Apple ID and returns null on every sign-in after
 * it, so anybody re-installing - every TestFlight tester, every App Review
 * re-test, every athlete on a new phone - arrives with no name and got the box
 * straight back, on the screen right after the Apple button. Hence the case
 * below that used to assert the box came back and now asserts it does not.
 *
 * Nobody is stranded: the name is presentation only, no engine reads it, every
 * surface that greets by name has a neutral fallback, and Settings -> Profile
 * sets or changes it whenever they like.
 *
 * Covered across BOTH onboarding routes, FirstRunScreen (free) and
 * ProOnboardingScreen (Pro): first Apple signup (Apple supplies the name),
 * repeat sign-in (Apple supplies nothing, the stored profile answers), a
 * private relay address, and the founder's own case - no name anywhere, from
 * any source - which must still show no field, and must never be blocked.
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

// The auth users each sign-in route actually produces.
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
// 'FirstRunScreen (free onboarding)' describe block REMOVED (D137, fully free
// product): FirstRunScreen.js is deleted outright -- there is no separate
// free-onboarding route any more. ProOnboardingScreen (below) is now the
// ONLY onboarding surface, reached by every account regardless of tier, so
// the Apple-no-name capability this block existed to protect is not lost:
// it is pinned below against the screen that now actually carries it
// (CONTROL/google, first Apple signup, repeat sign-in, no-name-anywhere, a
// linked Google+Apple account, and no-email-ever-asked). A private-relay-
// only case and a byte-identical "PERSISTED, not merely not-asked-for" /
// "never overwritten" pair are not re-added here: ProOnboardingScreen's
// name field only ever writes on the wizard's final build step (a full
// multi-step flow, not a single Continue tap), so those two specific
// mount-and-tap assertions do not have a like-for-like equivalent at this
// suite's mount depth; the underlying rule (an empty field never overwrites
// a stored name; Apple's name only fills an empty field) is visible
// unchanged in source at ProOnboardingScreen.js:1396-1400 and :856.

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

  test("no name anywhere: STILL no field - this is the founder's own case", async () => {
    // This is the screen in the screenshot: "Step 1 of 5 - Baseline",
    // reached straight after the Apple button.
    const tree = await mount(Screen(), {
      user: appleUser(), proOnboardingAccountCreated: true, userProfile: null,
    });
    expect(labels(tree)).not.toContain(NAME_LABEL);
    // D137: onboarding is not blocked by the missing name -- Continue still
    // renders (formerly pinned on the now-deleted FirstRunScreen).
    expect(labels(tree)).toContain('Continue');
  });

  test('the copy does not invite a name we already hold', async () => {
    // Formerly pinned on the now-deleted FirstRunScreen; re-pointed at the
    // one surviving onboarding screen (D137).
    noteAppleCredential({ givenName: 'Ada' });
    const tree = await mount(Screen(), { user: appleUser(), proOnboardingAccountCreated: true });
    expect(texts(tree).join(' ')).not.toMatch(/Add your name/i);
  });

  test('a Google account that later linked Apple counts as Apple', async () => {
    noteAppleCredential({ givenName: 'Ada' });
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
    // This fix is about what Apple already supplies. Sex, age, height and
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
