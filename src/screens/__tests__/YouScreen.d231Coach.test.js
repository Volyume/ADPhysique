/**
 * YouScreen (the Coach tab) - D231 app layout rework, batch 4: the mounted suite.
 *
 * What this pins, written to fail against the previous Coach screen:
 *   1. The order, top to bottom: This week, Your progress, Looking back, Your
 *      coaching setup, Safety checks; and what left: the subtitle, the profile
 *      card, "Weekly coaching decision", the three "This week" rows, "Your
 *      body" (Injuries & limitations), the Community row, Coaching reminders.
 *   2. The ONE This week card's three states: the countdown ("First check-in
 *      <date>"), "Check-in is open" (it was "Weekly check-in is open"), and
 *      "This week's decision · See why", each opening its screen; the check-in
 *      titles keep their neutral variants under calm mode, an open ED flag and a
 *      positive SCOFF score (no "open", no weigh-in wording).
 *   3. Under it: "Your week" (WeeklyStory) and "Past decisions", shown only when
 *      a COMPLETED decision exists from an earlier week, opening CoachOutput for
 *      the most recent earlier week.
 *   4. "Your coaching setup": Goal and phase carries the focus line (phase, goal,
 *      days a week) the profile card used to show; it shows only once coaching is
 *      set up.
 *   5. A failed read is a failed load (the retry card), never a quiet "no
 *      decision"; the `focusWeightTrend` arrival scrolls to the Body row.
 *
 * The rows of Your progress and Looking back are pinned in the CoachProgress
 * suites (state matrix, guards) and the safety rules of those rows (photos
 * hidden while suppressed, Body figures withheld) in CoachProgress.d231Safety
 * .test.js; this suite mounts the whole screen to pin where they sit.
 */

// ─── Mock scaffold (copied from CoachProgress.stateMatrix.test.js) ─────────
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
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const database = require('../../lib/database');
const { WELLBEING_KEY } = require('../../lib/wellbeing');
const { localWeekStartMs } = require('../../lib/dayKey');
const { GOAL_LABELS, PHASE_LABELS } = require('../../lib/coachingGoals');

const origConsoleError = console.error;
beforeAll(() => {
  console.error = (msg, ...rest) => {
    const text = typeof msg === 'string' ? msg : String(msg);
    if (/wrap.*act|environment has been torn down|Cannot log after tests|Each child in a list|react-test-renderer is deprecated/i.test(text)) return;
    origConsoleError(msg, ...rest);
  };
});
afterAll(() => { console.error = origConsoleError; });

const DAY = 24 * 60 * 60 * 1000;
const THIS_WEEK = localWeekStartMs();
const LAST_WEEK = THIS_WEEK - 7 * DAY;
const TWO_WEEKS_AGO = THIS_WEEK - 14 * DAY;

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
let patched = [];
function patch(mod, key, fn) { patched.push([mod, key, mod[key]]); mod[key] = fn; }

async function settle() {
  await TestRenderer.act(async () => {
    for (let i = 0; i < 25; i++) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
}

async function mountCoach({ route = { params: {} }, nav = makeNav(), options } = {}) {
  const YouScreen = require('../YouScreen').default;
  let tree = null;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(React.createElement(YouScreen, { navigation: nav, route }), options);
  });
  await settle();
  currentTree = tree;
  return { tree, nav };
}

afterEach(async () => {
  if (currentTree) {
    try { TestRenderer.act(() => { currentTree.unmount(); }); } catch (_) { /* already gone */ }
    currentTree = null;
  }
  for (const [mod, key, orig] of patched.reverse()) mod[key] = orig;
  patched = [];
  await AsyncStorage.clear();
});

function flattenText(tree) {
  const out = [];
  (function visit(node) {
    if (node == null) return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
    const c = node.children;
    if (Array.isArray(c)) c.forEach(visit); else if (c) visit(c);
  })(tree.toJSON());
  return out.join(' ');
}

const pressables = (tree) => tree.root.findAll(
  (n) => typeof n.type === 'string' && typeof n.props?.accessibilityLabel === 'string' && typeof n.props?.onPress === 'function',
);
const byLabel = (tree, matcher) => pressables(tree).filter((n) => (
  matcher instanceof RegExp ? matcher.test(n.props.accessibilityLabel) : n.props.accessibilityLabel === matcher
));
function press(tree, matcher) {
  const nodes = byLabel(tree, matcher);
  expect(nodes.length).toBeGreaterThan(0);
  TestRenderer.act(() => { nodes[0].props.onPress(); });
}

// The same long British date the check-in title prints ("19 July").
const shortDate = (ms) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
const localMidnight = (offsetDays = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.getTime();
};

const USER = {
  user: { id: 'u1', email: 't@e.com', isLocal: false },
  session: { user: { id: 'u1' } },
  tier: 'pro',
  firstRunComplete: true,
  userProfile: { firstName: 'Alex' },
  units: 'metric',
  bodyWeightUnits: 'kg',
};

// First weigh-in ten days ago (the five days of data are met) and three distinct
// mornings in the current Monday week (the three weigh-ins are met). The window
// has no upper bound, so a Monday run still counts them: the fixtures hold on
// every weekday.
function weighIns() {
  const out = [{ weightKg: 80, loggedAt: Date.now() - 10 * DAY }];
  for (let k = 0; k < 3; k++) out.push({ weightKg: 80, loggedAt: THIS_WEEK + k * DAY + 8 * 3600000 });
  return out;
}

const output = (weekStart, extra = {}) => ({ weekStart, hasEnoughData: true, ...extra });
const checkin = (weekStart) => ({ weekStart, energyScore: 3 });

async function arrange({
  history = [], checkins = [], checkinDay = new Date().getDay(), wellbeing = null, edFlag = null,
  profile = {}, readFails = false,
} = {}) {
  useAppStore.setState({ ...USER, userProfile: { ...USER.userProfile, ...profile } });
  await AsyncStorage.setItem('@volyume_notification_prefs', JSON.stringify({ checkinDay }));
  if (wellbeing) await AsyncStorage.setItem(WELLBEING_KEY, wellbeing);
  patch(database, 'getAllWorkouts', async () => []);
  patch(database, 'getCoachOutputHistory', async () => history);
  patch(database, 'getLatestCheckin', async (_userId, weekStart) => {
    if (readFails) throw new Error('db down');
    return checkins.find((c) => Number(c.weekStart) === Number(weekStart)) ?? null;
  });
  patch(database, 'getMorningWeightsLast14Days', async () => weighIns());
  patch(database, 'getOpenEdPatternFlag', async () => edFlag);
}

const THIS_WEEK_CARD = /^Weekly check-in\. |^Open this week's coaching decision$/;
const cardText = (tree) => byLabel(tree, THIS_WEEK_CARD)[0]?.props.accessibilityLabel;

// ─── 1. The order, and what left ──────────────────────────────────────────
describe('Coach: top to bottom', () => {
  test('This week, Your progress, Looking back, Your coaching setup, Safety checks, in that order', async () => {
    await arrange({ profile: { trainingPhase: Object.keys(PHASE_LABELS)[0], trainingGoal: Object.keys(GOAL_LABELS)[0], daysPerWeek: 4 } });
    const { tree } = await mountCoach();
    const text = flattenText(tree);
    const order = [
      'This week', 'Your week', 'Your progress', 'Training', 'Body', 'Progress photos', 'Recovery',
      'Looking back', 'Consistency', 'Recaps', 'Your coaching setup', 'Goal and phase', 'Nutrition targets',
      'Safety checks', 'Goal lock', 'Wellbeing check',
    ].map((label) => [label, text.indexOf(label)]);
    for (const [label, at] of order) expect({ label, found: at > -1 }).toEqual({ label, found: true });
    const positions = order.map(([, at]) => at);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  test('what left: the subtitle, the profile card, the decision card, the three week rows, Your body, Community, Coaching reminders', async () => {
    await arrange({ history: [output(THIS_WEEK)], checkins: [checkin(THIS_WEEK)] });
    const { tree } = await mountCoach();
    const text = flattenText(tree);
    for (const gone of [
      'Weekly coaching based on what you log.',
      'completed session',
      'Weekly coaching decision',
      'What your coach changed this week, what stayed the same, and why.',
      'Answer a few questions so your coach knows how your week went.',
      'Your latest coaching decision, kept here to look back on.',
      'Your body',
      'Injuries & limitations',
      'Community',
      'Connect with other lifters',
      'Coaching reminders',
      'Update goal and phase',
    ]) {
      expect({ gone, present: text.includes(gone) }).toEqual({ gone, present: false });
    }
    expect(byLabel(tree, /^Open athlete profile/)).toHaveLength(0);
  });

  test('the header is "Coach" with the settings button and nothing else', async () => {
    await arrange();
    const { tree, nav } = await mountCoach();
    expect(byLabel(tree, 'Settings')).toHaveLength(1);
    press(tree, 'Settings');
    expect(nav.navigate).toHaveBeenCalledWith('Settings');
  });

  test('Your coaching setup shows only once coaching is set up; a quick-start person sees the Set up coaching card instead', async () => {
    await arrange({ profile: { coachingDeferred: true } });
    const { tree } = await mountCoach();
    const text = flattenText(tree);
    expect(text).not.toContain('Your coaching setup');
    expect(text).not.toContain('Goal and phase');
    expect(text).toContain('Set up coaching');
    // The rest of the screen stays available.
    expect(text).toContain('This week');
    expect(text).toContain('Safety checks');
  });

  test('Goal and phase carries the profile card\'s focus line (phase, goal, days a week) as its sub line; Nutrition targets opens its screen', async () => {
    const phase = Object.keys(PHASE_LABELS)[0];
    const goal = Object.keys(GOAL_LABELS).find((k) => GOAL_LABELS[k] !== 'Not competing');
    await arrange({ profile: { trainingPhase: phase, trainingGoal: goal, daysPerWeek: 4 } });
    const { tree, nav } = await mountCoach();
    const focus = `${PHASE_LABELS[phase]} - ${GOAL_LABELS[goal]} - 4 days/week`;
    expect(byLabel(tree, `Goal and phase. ${focus}`)).toHaveLength(1);
    press(tree, `Goal and phase. ${focus}`);
    expect(nav.navigate).toHaveBeenCalledWith('ProGoalSetup');
    press(tree, /^Nutrition targets\./);
    expect(nav.navigate).toHaveBeenCalledWith('NutritionTargets');
    press(tree, /^Goal lock\./);
    expect(nav.navigate).toHaveBeenCalledWith('GoalLockConsent', { editMode: true });
    press(tree, /^Wellbeing check\./);
    expect(nav.navigate).toHaveBeenCalledWith('WellbeingCheck');
  });

  test('with no phase, goal or days on the profile, Goal and phase has no sub line', async () => {
    await arrange({ profile: {} });
    const { tree } = await mountCoach();
    expect(byLabel(tree, 'Goal and phase')).toHaveLength(1);
  });
});

// ─── 2. The one This week card ────────────────────────────────────────────
describe('Coach: the This week card changes through the week', () => {
  test('state 1, the countdown: the next check-in day is ahead, so the card names the date and opens the check-in', async () => {
    const tomorrow = localMidnight(1);
    await arrange({ checkinDay: new Date(tomorrow).getDay() });
    const { tree, nav } = await mountCoach();
    expect(cardText(tree)).toBe(`Weekly check-in. First check-in ${shortDate(tomorrow)}`);
    const text = flattenText(tree);
    expect(text).toContain(`First check-in ${shortDate(tomorrow)}`);
    expect(text).not.toContain('Check-in is open');
    expect(text).not.toContain("This week's decision");
    press(tree, THIS_WEEK_CARD);
    expect(nav.navigate).toHaveBeenCalledWith('WeeklyCheckIn');
  });

  test('state 2, check-in day: "Check-in is open" (it was "Weekly check-in is open"), opening the check-in', async () => {
    await arrange({ checkinDay: new Date().getDay() });
    const { tree, nav } = await mountCoach();
    expect(cardText(tree)).toBe('Weekly check-in. Check-in is open');
    expect(flattenText(tree)).not.toContain('Weekly check-in is open');
    press(tree, THIS_WEEK_CARD);
    expect(nav.navigate).toHaveBeenCalledWith('WeeklyCheckIn');
  });

  test('until the first read settles the card is a placeholder, never a state the read is about to replace', async () => {
    await arrange({ history: [output(THIS_WEEK)], checkins: [checkin(THIS_WEEK)] });
    patch(database, 'getCoachOutputHistory', () => new Promise(() => {})); // never settles
    const { tree } = await mountCoach();
    expect(cardText(tree)).toBeUndefined();
    expect(flattenText(tree)).not.toMatch(/First check-in|Check-in is open|This week's decision/);
    // The rest of the screen is there.
    expect(flattenText(tree)).toContain('Your week');
    expect(flattenText(tree)).toContain('Safety checks');
  });

  test('not enough morning weights yet: the same title the Weekly check-in row used', async () => {
    await arrange({ checkinDay: new Date().getDay() });
    patch(database, 'getMorningWeightsLast14Days', async () => [{ weightKg: 80, loggedAt: Date.now() - 10 * DAY }]);
    const { tree } = await mountCoach();
    expect(cardText(tree)).toBe('Weekly check-in. First check-in needs more morning weights');
  });

  test('no weigh-in at all: the first-weight title', async () => {
    await arrange();
    patch(database, 'getMorningWeightsLast14Days', async () => []);
    const { tree } = await mountCoach();
    expect(cardText(tree)).toBe('Weekly check-in. First check-in starts after your first morning weight');
  });

  test('state 3, this week\'s decision exists: "This week\'s decision · See why", opening CoachOutput for that week', async () => {
    await arrange({ history: [output(THIS_WEEK)], checkins: [checkin(THIS_WEEK)] });
    const { tree, nav } = await mountCoach();
    expect(cardText(tree)).toBe("Open this week's coaching decision");
    expect(flattenText(tree)).toContain("This week's decision · See why");
    expect(flattenText(tree)).not.toContain('Check-in is open');
    expect(flattenText(tree)).not.toMatch(/First check-in/);
    press(tree, THIS_WEEK_CARD);
    expect(nav.navigate).toHaveBeenCalledWith('CoachOutput', { weekStart: THIS_WEEK });
  });

  test('an output with no check-in behind it, or a baseline output, is not a decision: the card stays on the check-in', async () => {
    await arrange({
      history: [output(THIS_WEEK), output(LAST_WEEK, { hasEnoughData: false })],
      checkins: [checkin(LAST_WEEK)],
      checkinDay: new Date().getDay(),
    });
    const { tree } = await mountCoach();
    expect(cardText(tree)).toBe('Weekly check-in. Check-in is open');
    expect(flattenText(tree)).not.toContain("This week's decision");
  });

  test('a decision from an earlier week is not this week\'s: the card is the check-in again', async () => {
    await arrange({ history: [output(LAST_WEEK)], checkins: [checkin(LAST_WEEK)], checkinDay: new Date().getDay() });
    const { tree } = await mountCoach();
    expect(cardText(tree)).toBe('Weekly check-in. Check-in is open');
  });

  // The neutral variants. The title is the readiness title only, and under calm
  // mode, an open ED flag or a positive SCOFF score it is the date alone: never
  // "open", never weigh-in wording.
  describe.each([
    ['calm mode', { wellbeing: 'calm' }],
    ['an open ED flag', { edFlag: { id: 'f1', userId: 'u1' } }],
    ['a positive SCOFF score', { profile: { scoffScore: 3 } }],
  ])('under %s', (_name, safety) => {
    test('on check-in day the card says the date, never "Check-in is open" and never a weigh-in count', async () => {
      await arrange({ checkinDay: new Date().getDay(), ...safety });
      const { tree, nav } = await mountCoach();
      const text = flattenText(tree);
      expect(cardText(tree)).toBe(`Weekly check-in. First check-in ${shortDate(localMidnight(0))}`);
      expect(text).not.toContain('Check-in is open');
      // The card itself (Your week's own sub line names weigh-ins and is unchanged).
      expect(cardText(tree)).not.toMatch(/morning weight|weigh-in|open/i);
      press(tree, THIS_WEEK_CARD);
      expect(nav.navigate).toHaveBeenCalledWith('WeeklyCheckIn');
    });

    test('with no first weigh-in the neutral title does not ask for one', async () => {
      await arrange({ ...safety });
      patch(database, 'getMorningWeightsLast14Days', async () => []);
      const { tree } = await mountCoach();
      expect(cardText(tree)).toBe('Weekly check-in. First check-in not open yet');
      expect(flattenText(tree)).not.toMatch(/morning weight/i);
    });
  });
});

// ─── 3. Your week, Past decisions ─────────────────────────────────────────
describe('Coach: Your week and Past decisions sit under the card', () => {
  test('Your week is always there and opens WeeklyStory', async () => {
    await arrange();
    const { tree, nav } = await mountCoach();
    press(tree, /^Your week\./);
    expect(nav.navigate).toHaveBeenCalledWith('WeeklyStory');
  });

  test('no completed decision at all: no Past decisions row', async () => {
    await arrange();
    const { tree } = await mountCoach();
    expect(flattenText(tree)).not.toContain('Past decisions');
  });

  test('only this week\'s decision: nothing from an earlier week, so no Past decisions row', async () => {
    await arrange({ history: [output(THIS_WEEK)], checkins: [checkin(THIS_WEEK)] });
    const { tree } = await mountCoach();
    expect(flattenText(tree)).not.toContain('Past decisions');
  });

  test('this week\'s decision and one from an earlier week: the row opens the earlier week', async () => {
    await arrange({
      history: [output(THIS_WEEK), output(LAST_WEEK)],
      checkins: [checkin(THIS_WEEK), checkin(LAST_WEEK)],
    });
    const { tree, nav } = await mountCoach();
    expect(byLabel(tree, 'Past decisions')).toHaveLength(1);
    press(tree, 'Past decisions');
    expect(nav.navigate).toHaveBeenCalledWith('CoachOutput', { weekStart: LAST_WEEK });
  });

  test('several earlier decisions: the row opens the MOST RECENT earlier week', async () => {
    await arrange({
      history: [output(THIS_WEEK), output(LAST_WEEK), output(TWO_WEEKS_AGO)],
      checkins: [checkin(THIS_WEEK), checkin(LAST_WEEK), checkin(TWO_WEEKS_AGO)],
    });
    const { tree, nav } = await mountCoach();
    press(tree, 'Past decisions');
    expect(nav.navigate).toHaveBeenCalledWith('CoachOutput', { weekStart: LAST_WEEK });
  });

  test('a person past their first check-in never reads "First check-in": before the check-in opens the card asks about the week', async () => {
    const tomorrow = localMidnight(1);
    await arrange({ history: [output(LAST_WEEK)], checkins: [checkin(LAST_WEEK)], checkinDay: new Date(tomorrow).getDay() });
    const { tree } = await mountCoach();
    expect(cardText(tree)).toBe('Weekly check-in. Answer a few questions so your coach knows how your week went.');
    expect(flattenText(tree)).not.toContain('First check-in');
  });

  test('the same under an open ED flag: the established line, never a date or weigh-in wording', async () => {
    await arrange({ history: [output(LAST_WEEK)], checkins: [checkin(LAST_WEEK)], checkinDay: new Date().getDay(), edFlag: { id: 'f1', userId: 'u1' } });
    const { tree } = await mountCoach();
    expect(cardText(tree)).toBe('Weekly check-in. Answer a few questions so your coach knows how your week went.');
    expect(flattenText(tree)).not.toContain('Check-in is open');
  });

  test('no decision this week but one from last week: the card is the check-in and Past decisions opens last week', async () => {
    await arrange({ history: [output(LAST_WEEK)], checkins: [checkin(LAST_WEEK)] });
    const { tree, nav } = await mountCoach();
    expect(cardText(tree)).toMatch(/^Weekly check-in\. /);
    press(tree, 'Past decisions');
    expect(nav.navigate).toHaveBeenCalledWith('CoachOutput', { weekStart: LAST_WEEK });
  });

  test('earlier outputs that were never decisions (no check-in behind them, or baseline weeks) do not count', async () => {
    await arrange({
      history: [output(THIS_WEEK), output(LAST_WEEK), output(TWO_WEEKS_AGO, { hasEnoughData: false })],
      checkins: [checkin(THIS_WEEK), checkin(TWO_WEEKS_AGO)],
    });
    const { tree } = await mountCoach();
    expect(flattenText(tree)).not.toContain('Past decisions');
  });
});

// ─── 4. A failed read is a failed load ────────────────────────────────────
describe('Coach: a failed read is visible and retryable, never a quiet "no decision"', () => {
  test('a check-in read that throws shows the retry card and no Past decisions row', async () => {
    await arrange({ history: [output(THIS_WEEK), output(LAST_WEEK)], readFails: true });
    const { tree } = await mountCoach();
    expect(flattenText(tree)).toContain('Could not refresh Coach');
    expect(flattenText(tree)).not.toContain('Past decisions');
    expect(flattenText(tree)).not.toContain("This week's decision");
  });

  test('a history read that rejects shows the retry card and the screen still stands', async () => {
    await arrange();
    patch(database, 'getCoachOutputHistory', async () => { throw new Error('db down'); });
    const { tree } = await mountCoach();
    expect(flattenText(tree)).toContain('Could not refresh Coach');
    expect(flattenText(tree)).toContain('Safety checks');
  });
});

// ─── 5. The focusWeightTrend arrival ──────────────────────────────────────
// The scroll itself (measuring the Body row against the scroll content) is pinned
// on CoachProgress, which owns it (CoachProgress.stateMatrix.test.js); the jest
// ScrollView has no ref, so here the screen's half is pinned: it hands the param
// to the Body row of Your progress and clears it once that has been done.
describe('Coach: arriving with focusWeightTrend', () => {
  const wait = (ms) => TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, ms)); });

  test('the param is cleared once Your progress has had time to lay out, so a normal re-focus does not scroll again', async () => {
    await arrange();
    const { nav } = await mountCoach({ route: { params: { focusWeightTrend: true } } });
    expect(nav.setParams).not.toHaveBeenCalled();
    await wait(500);
    expect(nav.setParams).toHaveBeenCalledWith({ focusWeightTrend: undefined });
  });

  test('without the param nothing is cleared', async () => {
    await arrange();
    const { nav } = await mountCoach({ route: { params: {} } });
    await wait(500);
    expect(nav.setParams).not.toHaveBeenCalled();
  });

  test('the screen hands the param, the scroll ref and the clearing callback to Your progress', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'YouScreen.js'), 'utf8');
    expect(src).toMatch(/const focusWeightTrend = !!route\?\.params\?\.focusWeightTrend;/);
    expect(src).toMatch(/<CoachProgress\s+navigation=\{navigation\}\s+scrollRef=\{scrollRef\}\s+focusBody=\{focusWeightTrend\}\s+onFocusBodyDone=\{clearFocusWeightTrend\}\s*\/>/);
    expect(src).toMatch(/useScrollToTop\(scrollRef\)/);
  });
});
