/**
 * scripts/paper-render/mockPreamble.js
 *
 * The screen-mount idiom (src/__tests__/screen-mount.test.js's native/
 * Expo/navigation mock wall), copied with paths adjusted for this folder,
 * plus the deliberate departures a PAPER RENDER needs that a crash-sweep
 * mount does not (screen-mount only asserts "does not throw"; this harness
 * has to show real content). Each departure is called out at its own
 * jest.mock() site rather than left for the reader to spot by diffing:
 *   1. THE data-layer change the brief asks for -- expo-sqlite becomes a
 *      node:sqlite-backed shim (expoSqliteShim.js) instead of the in-memory
 *      stub in __mocks__/expo-sqlite.js, and src/lib/dbCrypto.js (the
 *      SQLCipher migrate-in-place dance, unreachable under plain SQLite) is
 *      bypassed with a plaintext pass-through (dbCryptoPassthrough.js).
 *   2. @shopify/flash-list renders real row content (see its own site
 *      below) instead of screen-mount's empty-list stub.
 *   3. @react-navigation/native's useFocusEffect actually runs its
 *      callback (screen-mount's is a bare jest.fn(), which never does --
 *      fine for a crash sweep, but several of these screens load ALL their
 *      data on focus, not on mount, and would otherwise paper-render as an
 *      empty shell). Same idiom this repo's own tests already use.
 *   4. react-native-gesture-handler's Gesture builder additionally covers
 *      Race/Fling/Simultaneous/Exclusive (screen-mount never mounts the
 *      one screen, DiaryScreen, that calls them), and the `/Swipeable`
 *      deep-import subpath is mocked too (a separate module specifier
 *      screen-mount's top-level mock cannot reach).
 *   5. @supabase/supabase-js's auth.getSession() returns a live (never
 *      expired) session instead of screen-mount's null one, so
 *      Community's own sign-in gate (assertCommunityGates) does not turn
 *      every CommunityHubScreen render into "Could not load Community"
 *      regardless of what the seeded data would otherwise show.
 * Every mock NOT called out above is the same module, same factory, as
 * screen-mount's own preamble.
 *
 * Required to be the FIRST require in paper-render.test.js, before that
 * file requires anything the mocks below need to intercept. jest.mock()
 * calls run in plain textual/require order here (this file, like
 * screen-mount.test.js, uses require() throughout, never ES `import`), so
 * there is no babel-jest-hoist dependency to reason about: this module's
 * body registers every mock before returning, and nothing above requires
 * expo-sqlite/expo-secure-store/etc. before that has happened.
 *
 * NO { virtual: true } on any mock of an installed (resolvable) module,
 * for the exact reason screen-mount.test.js's own header comment gives: a
 * virtual mock on a resolvable module poisons Jest's worker-level resolver
 * cache for every suite sharing that worker. This file mocks none that
 * need it.
 */
'use strict';

// src/lib/supabase.js's getSupabaseClient() returns null (skipping the
// mocked createClient() above entirely, memoised via a module-level
// `_initialized` flag so it stays null for this module's whole lifetime)
// unless these two env vars are set -- screen-mount never needed either
// one set because it never mounts a screen that reaches Community's
// transport layer this deeply. A null client makes src/lib/community/
// transport.js's own `client()` helper throw 'unavailable' on every RPC
// regardless of what @supabase/supabase-js's mock above would otherwise
// answer, which is what CommunityHubScreen was doing before this was
// added (root-caused with a throwaway debug harness, not guessed).
// Fake values are fine: createClient() is mocked and never reads them.
process.env.EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://paper-render.invalid';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'paper-render-anon-key';

jest.mock('react-native-url-polyfill/auto', () => ({}));
jest.mock('expo/virtual/env', () => ({ env: process.env }));
jest.mock('expo-application');
jest.mock('expo-constants');
jest.mock('expo-crypto');
jest.mock('expo-secure-store');

// THE ONE CHANGE. Real SQLite (node:sqlite) instead of __mocks__/expo-sqlite.js's
// in-memory stub, so src/lib/database.js runs its own schema + migrations and
// every screen reads back real, query-able rows.
jest.mock('expo-sqlite', () => require('./expoSqliteShim'));

// dbCrypto's SQLCipher dance has no plain-SQLite equivalent to fake honestly
// (see dbCryptoPassthrough.js's header) -- bypassed with a plaintext
// pass-through onto the real shim above, exactly as the brief allows.
jest.mock('../../src/lib/dbCrypto', () => require('./dbCryptoPassthrough'));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      // ADDED BEYOND screen-mount's own preamble (departure #5): a null
      // session is right for a crash sweep, but src/lib/community/
      // transport.js's assertCommunityGates() treats it as "signed out"
      // (src/lib/supabase.js's hasLiveSession(): no access_token -> false
      // -> CommunityError('not_signed_in')) and CommunityHubScreen renders
      // that as "Could not load Community" regardless of what data
      // callCommunity() would otherwise have returned -- screen-mount never
      // notices because it only asserts "does not throw". A generic,
      // never-expiring token unblocks that gate; nothing here reads the
      // user id off it, so it does not need to match the seeded persona.
      getSession: jest.fn(() => Promise.resolve({
        data: { session: { access_token: 'paper-render-token', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'paper-render-uid' } } },
        error: null,
      })),
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
    functions: { invoke: jest.fn(() => Promise.resolve({ data: null, error: null })) },
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
// expo-file-system/legacy (database.js's own dbSnapshot/dbCrypto fallback
// paths, all bypassed or best-effort here) is handled by package.json's
// jest.moduleNameMapper -> __mocks__/expo-file-system-legacy.js globally;
// no per-file mock needed.

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

// A Skia path records the commands the app draws it with (moveTo, lineTo,
// close: all MacroRings' calorie ring uses), so treeToHtml.js draws the
// app's own geometry as SVG instead of an unknown-type box.
jest.mock('@shopify/react-native-skia', () => {
  const makePath = () => {
    const cmds = [];
    const path = {
      moveTo: (x, y) => { cmds.push(`M${x} ${y}`); return path; },
      lineTo: (x, y) => { cmds.push(`L${x} ${y}`); return path; },
      close: () => { cmds.push('Z'); return path; },
      toSVGString: () => cmds.join(' '),
    };
    return path;
  };
  return {
    Canvas: 'Canvas', Path: 'Path', Skia: { Path: { Make: makePath } },
    useFont: () => null, useImage: () => null,
  };
});

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
  const gestureStub = new Proxy({}, { get: () => () => gestureStub });
  // ADDED BEYOND screen-mount's own preamble (whose Gesture only covers
  // Pan/Tap/LongPress -- it never mounts DiaryScreen): DiaryScreen's C5
  // swipe-to-change-day builds `Gesture.Race(Gesture.Fling()...)` in a
  // useMemo(fn, []) that runs unconditionally on first render, so Race and
  // Fling must resolve to something chainable too. Same factory shape as
  // src/components/__tests__/ProgressPhotoViewer.test.js's own Gesture mock
  // (the established idiom for "every Gesture builder method, chainable").
  const gestureFactory = () => gestureStub;
  return {
    GestureHandlerRootView: passthrough('GHRoot'),
    GestureDetector: passthrough('GestureDetector'),
    Gesture: {
      Pan: gestureFactory, Tap: gestureFactory, LongPress: gestureFactory,
      Fling: gestureFactory, Race: gestureFactory, Simultaneous: gestureFactory, Exclusive: gestureFactory,
    },
    PanGestureHandler: passthrough('PanGH'),
    TapGestureHandler: passthrough('TapGH'),
    State: {},
    Directions: { LEFT: 'left', RIGHT: 'right', UP: 'up', DOWN: 'down' },
    gestureHandlerRootHOC: c => c,
  };
});

// DiaryScreen -> src/components/food/EntryRow.js imports the /Swipeable
// subpath directly (`from 'react-native-gesture-handler/Swipeable'`), a
// different module specifier the jest.mock() above does not reach --
// exactly the gap src/screens/__tests__/DiaryScreen.bankingAvailable.test.js
// already documents and works around; same fix, copied verbatim.
jest.mock('react-native-gesture-handler/Swipeable', () => {
  const React = require('react');
  return { __esModule: true, default: props => React.createElement('Swipeable', props, props.children) };
});

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), addListener: () => () => {}, setOptions: jest.fn(), dispatch: jest.fn(), getParent: () => ({ addListener: () => () => {} }) }),
    useRoute: () => ({ params: {} }),
    // ADDED BEYOND screen-mount's own preamble, and the second deliberate
    // departure (besides the real data layer) this file's header doesn't
    // yet name -- screen-mount's own `useFocusEffect: jest.fn()` NEVER
    // invokes its callback (a bare jest.fn() records the call and returns
    // undefined), which is fine for a crash sweep but wrong for a paper
    // render: YouScreen/PlanDetailScreen/LiftProgressScreen/
    // BodyMetricsScreen load ALL or most of their data inside
    // useFocusEffect, not useEffect, so under the no-op mock they render
    // stuck on their loading/empty branch -- BodyMetricsScreen down to a
    // bare header. Same idiom already established in this repo's own tests
    // (src/screens/__tests__/DiaryScreen.bankingAvailable.test.js:
    // `useFocusEffect: (cb) => React.useEffect(cb, [cb])`) -- a real mount
    // fires focus effects too, this just makes that true here as well.
    useFocusEffect: (cb) => React.useEffect(cb, [cb]),
    useIsFocused: () => true,
    useScrollToTop: jest.fn(),
    NavigationContainer: ({ children }) => children,
    StackActions: { popToTop: jest.fn(), replace: jest.fn(), push: jest.fn() },
    CommonActions: { navigate: jest.fn(), reset: jest.fn() },
    // Added beyond screen-mount's own preamble: VolyumeTabBar (mounted
    // directly, standalone, for screens 01/04/06/07/13 per the brief) calls
    // this to detect whether the focused nested route is ActiveWorkout. The
    // real implementation just reads state.routes[state.index]'s own nested
    // state; mirrored exactly (also inlined the same way in
    // workoutSummaryFooterBand.guard.test.js, the one other place that
    // mounts VolyumeTabBar directly).
    getFocusedRouteNameFromRoute: (route) => route?.state?.routes?.[route.state.index]?.name,
  };
});

// Toast hook used by some screens. Returns a no-op show fn.
jest.mock('../../src/components/Toast', () => {
  const React = require('react');
  return {
    useToast: () => ({ show: jest.fn(), hide: jest.fn() }),
    ToastProvider: ({ children }) => children,
    default: props => React.createElement('Toast', props),
  };
});

// Feedback hook surfaces a feedback sheet. Stubbed so screens that
// open it on render don't crash.
jest.mock('../../src/components/FeedbackSheet', () => {
  const React = require('react');
  return {
    useFeedback: () => ({ open: jest.fn(), close: jest.fn() }),
    FeedbackProvider: ({ children }) => children,
    default: props => React.createElement('FeedbackSheet', props),
  };
});

// Components that wrap react-native-svg or Skia: stubbed so we don't
// need every drawing primitive to be mocked deeply.
jest.mock('../../src/components/BodyDiagramHeatmap', () => {
  const React = require('react');
  return { __esModule: true, default: props => React.createElement('BodyDiagramHeatmap', props) };
});

jest.mock('../../src/components/GradientCard', () => {
  const React = require('react');
  return { __esModule: true, default: props => React.createElement('GradientCard', props, props.children) };
});

// Local native modules, referenced by package.json file: deps.
jest.mock('rest-timer-live', () => ({ start: jest.fn(), stop: jest.fn(), update: jest.fn() }));
jest.mock('live-activity', () => ({ start: jest.fn(), stop: jest.fn(), update: jest.fn() }));

// ADDED BEYOND screen-mount's preamble (departure #2 in this file's header
// comment). __mocks__/shopify-flash-list.js
// (wired via moduleNameMapper, no jest.mock call needed to activate it)
// redirects FlashList onto react-native's own FlatList passthrough, which
// renders `props.children` verbatim -- but FlashList/FlatList never take
// children, they take `data` + `renderItem`, so under that mock every
// list on every screen renders as an EMPTY host node. Fine for
// screen-mount's crash sweep (an empty list still mounts without
// throwing); wrong for a paper render, whose whole point is showing the
// design lead real rows at real density. CLAUDE.md: "every list in the
// app renders through FlashList, never an unrecycled FlatList" -- so this
// one override covers list content app-wide.
//
// Capped at 40 rendered rows: enough to judge ordering/density/type sizes
// without producing a multi-thousand-row page for a long history list.
jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const ROW_CAP = 40;
  function renderSlot(slot) {
    if (slot == null) return null;
    if (React.isValidElement(slot)) return slot;
    if (typeof slot === 'function') return React.createElement(slot);
    return null;
  }
  function FlashListMock(props) {
    const { data, renderItem, ListHeaderComponent, ListFooterComponent, ListEmptyComponent, contentContainerStyle, keyExtractor } = props;
    const items = Array.isArray(data) ? data.slice(0, ROW_CAP) : [];
    const header = renderSlot(ListHeaderComponent);
    const footer = renderSlot(ListFooterComponent);
    let body;
    if (items.length === 0) {
      body = renderSlot(ListEmptyComponent);
    } else if (typeof renderItem === 'function') {
      body = items.map((item, index) => {
        const el = renderItem({ item, index, target: 'Cell' });
        const key = typeof keyExtractor === 'function' ? keyExtractor(item, index) : (item?.id ?? index);
        return el ? React.cloneElement(el, { key }) : null;
      });
    } else {
      body = null;
    }
    return React.createElement(
      'View',
      { style: contentContainerStyle },
      header,
      body,
      footer,
    );
  }
  FlashListMock.displayName = 'FlashList';
  return { FlashList: FlashListMock, AnimatedFlashList: FlashListMock };
});

// __DEV__ is a Metro-injected global in real RN bundles; jest's node env
// doesn't have it (jest.setup.js sets it true globally, mirrored here in
// case this file is ever required before that setup file runs).
global.__DEV__ = typeof global.__DEV__ === 'boolean' ? global.__DEV__ : true;

if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
}

module.exports = {};
