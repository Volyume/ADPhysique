import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Alert, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { ensureNotifChannels } from './src/lib/restNotifications';
import { installGlobalHandlers, logError } from './src/lib/errorLog';

// Install verbose error logging — ring buffer in AsyncStorage, viewable from
// Settings → Debug logs. Catches uncaught exceptions and unhandled promise
// rejections. Coexists with the legacy single-slot crash log used by the
// LoginScreen banner.
installGlobalHandlers();

// Initialise Sentry as early as possible so any startup error is
// captured. No-op if @sentry/react-native isn't installed yet or the
// EXPO_PUBLIC_SENTRY_DSN env var isn't set — safe to ship before
// you've added the SDK.
{
  // eslint-disable-next-line global-require
  const { initSentry } = require('./src/lib/sentry');
  // eslint-disable-next-line global-require
  const Constants = require('expo-constants').default;
  initSentry({
    release: Constants?.expoConfig?.version
      ? `volyume@${Constants.expoConfig.version}`
      : undefined,
  });
}

// ---------------------------------------------------------------------------
// Background task — keeps the JS thread alive during rest periods on iOS so
// the timer does not freeze when the screen is locked.
// Must be defined at module scope (before any React components render).
// ---------------------------------------------------------------------------
const VOLYUME_REST_TIMER_KEEPALIVE = 'VOLYUME_REST_TIMER_KEEPALIVE';

TaskManager.defineTask(VOLYUME_REST_TIMER_KEEPALIVE, () => {
  // No-op: the act of waking the JS thread is what matters.
  // Return NEW_DATA so iOS schedules the next fetch promptly.
  return TaskManager.TaskManagerTaskBody
    ? TaskManager.TaskManagerTaskBody.NEW_DATA
    : 'newData';
});

// ---------------------------------------------------------------------------
// Daily background cloud sync — runs whenever the OS gives us a quiet
// moment (Android typically batches background fetches to coincide with
// existing wake-ups; iOS schedules opportunistically). Target frequency
// is ~12h so we get roughly one nightly catch-up plus a midday backup.
// If the user is offline at fetch time the task returns NoData and the
// next foreground sync (App.js useEffect below) picks things up.
// ---------------------------------------------------------------------------
const VOLYUME_DAILY_SYNC = 'VOLYUME_DAILY_SYNC';

TaskManager.defineTask(VOLYUME_DAILY_SYNC, async () => {
  try {
    // eslint-disable-next-line global-require
    const { getSupabaseClient: getSb } = require('./src/lib/supabase');
    // eslint-disable-next-line global-require
    const { bulkUploadLocalData } = require('./src/lib/sync');
    const sb = getSb();
    if (!sb) return 'noData';
    const { data: { session } } = await sb.auth.getSession();
    const supabaseUserId = session?.user?.id;
    if (!supabaseUserId) return 'noData';
    // Local user id is whatever Supabase gave us once they signed in.
    await bulkUploadLocalData(supabaseUserId, supabaseUserId);
    return 'newData';
  } catch (e) {
    try { logError('VOLYUME_DAILY_SYNC', e); } catch (_) {}
    return 'failed';
  }
});

// Suppress foreground notification banners — the rest timer handles in-app alerts with haptics.
// The rest-done channel fires when the app is backgrounded, so sound is handled by the channel.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Allow the rest-done alert to sound if it arrives while the app is foregrounded
    // (e.g. user returned to app just as rest ended and the scheduled notif still fired).
    const channelId = notification?.request?.content?.data?.channelId;
    const isRestDone = channelId === 'rest-done';
    return {
      shouldShowAlert: isRestDone,
      shouldPlaySound: isRestDone,
      shouldSetBadge: false,
    };
  },
});

// RootNavigator and PRCelebration are deliberately lazy-required from inside
// the gated render below. They (transitively) trigger every screen's
// StyleSheet.create, and we need accessibility prefs applied to the theme
// tokens BEFORE that happens — otherwise Larger Text / Higher Contrast /
// Colour-Blind Safe never take effect because the styles are frozen with
// the default palette at module-evaluation time.
import useAppStore from './src/store/useAppStore';
import { getWellbeingMode, isCalm } from './src/lib/wellbeing';
import { getSupabaseClient } from './src/lib/supabase';
import { applyAccessibility } from './src/styles/theme';
import { loadA11yPrefs } from './src/lib/accessibilityPrefs';
import * as Updates from 'expo-updates';

// Read accessibility prefs at app boot and mutate the exported theme
// tokens before any screen module is loaded. Idempotent — safe to call
// more than once, but only the first call matters for already-built
// StyleSheets.
async function bootstrapAccessibility() {
  const prefs = await loadA11yPrefs();
  if (prefs) applyAccessibility(prefs);
}

// Handles volyume:// and https://volyume.app deep links from Supabase auth emails.
// Supports both PKCE (code=xxx) and implicit (access_token in fragment) flows.
async function handleAuthDeepLink(url) {
  if (!url) return;
  if (!url.startsWith('volyume://') && !url.startsWith('https://volyume.app')) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;

  // PKCE flow — Supabase v2 default: volyume://?code=xxx
  const codeMatch = url.match(/[?&]code=([^&#]+)/);
  if (codeMatch) {
    try { await supabase.auth.exchangeCodeForSession(decodeURIComponent(codeMatch[1])); } catch (_) {}
    return;
  }

  // Implicit flow fallback — tokens in URL fragment: volyume://#access_token=xxx&refresh_token=xxx
  const fragment = url.split('#')[1] || '';
  if (fragment.includes('access_token')) {
    const params = Object.fromEntries(
      fragment.split('&').map(p => {
        const [k, v] = p.split('=');
        return [k, decodeURIComponent(v || '')];
      }),
    );
    if (params.access_token && params.refresh_token) {
      try {
        await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
      } catch (_) {}
    }
  }
}

const CRASH_LOG_KEY = '@volyume_crash_log';

// Uncaught exceptions and unhandled rejections are now captured by
// installGlobalHandlers() above. ErrorBoundary still writes the legacy
// single-slot crash log so LoginScreen's banner keeps working.

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    logError('ErrorBoundary', error, { componentStack: errorInfo?.componentStack?.slice(0, 1200) });
    AsyncStorage.setItem(CRASH_LOG_KEY, JSON.stringify({
      message: error?.message || String(error),
      stack: error?.stack?.slice(0, 1200) || '',
      ts: Date.now(),
    })).catch(() => {});
  }

  render() {
    if (this.state.error) {
      return (
        <View style={eb.container}>
          <Text style={eb.title}>Volyume: Crash Report</Text>
          <Text style={eb.subtitle}>Send this to support:</Text>
          <View style={eb.msgBox}>
            <Text selectable style={eb.msg}>
              {this.state.error?.message || String(this.state.error)}
            </Text>
          </View>
          <ScrollView style={eb.scroll}>
            <Text selectable style={eb.stack}>
              {__DEV__
                ? this.state.error?.stack
                : this.state.error?.stack?.split('\n').slice(0, 5).join('\n')}
            </Text>
          </ScrollView>
          <TouchableOpacity style={eb.btn} onPress={() => this.setState({ error: null })}>
            <Text style={eb.btnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const eb = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D', padding: 20, paddingTop: 60 },
  title: { color: '#FF3B30', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#aaa', fontSize: 14, marginBottom: 12 },
  scroll: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 8, padding: 12 },
  msgBox: { backgroundColor: '#2a1212', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FF3B30' },
  msg: { color: '#FF6B60', fontSize: 14, fontWeight: 'bold' },
  stack: { color: '#ccc', fontSize: 11, fontFamily: 'monospace' },
  btn: { marginTop: 16, backgroundColor: '#2979FF', borderRadius: 8, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

// Small inner component that fires the "crash recovered" toast +
// (optionally) opens the feedback sheet primed with the crash
// trigger so the user can tell us what they were doing right before
// the previous session died. Mounted inside ToastProvider +
// FeedbackProvider so it can use both hooks. Fires once per launch.
function CrashRecoveryToast({ priorCrash }) {
  // eslint-disable-next-line global-require
  const { useToast } = require('./src/components/Toast');
  // eslint-disable-next-line global-require
  const { useFeedback } = require('./src/components/FeedbackSheet');
  const toast = useToast();
  const feedback = useFeedback();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!priorCrash || firedRef.current) return;
    firedRef.current = true;
    // Wait a beat after launch so the toast doesn't compete with the
    // splash → home transition. 1.6s lands it clearly inside Home.
    const t = setTimeout(() => {
      try {
        toast?.show?.(
          'Volyume crashed last session. Report sent.',
          {
            variant: 'info',
            duration: 7000,
            // Action button on the toast — taps open the feedback
            // sheet pre-filled with the crash_recovery trigger so the
            // user can add what they were doing in one sentence. The
            // sheet auto-attaches the crash metadata from the
            // observability layer.
            action: {
              label: 'Add details',
              onPress: () => feedback?.open?.({ trigger: 'crash_recovery' }),
            },
          },
        );
      } catch (_) { /* tolerate */ }
    }, 1600);
    return () => clearTimeout(t);
  }, [priorCrash, toast, feedback]);

  return null;
}

export default function App() {
  const prCelebration = useAppStore(s => s.prCelebration);
  const hidePRCelebration = useAppStore(s => s.hidePRCelebration);
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  const accessibilityLoaded = useAppStore(s => s.accessibilityLoaded);
  const loadAccessibility = useAppStore(s => s.loadAccessibility);
  const [calm, setCalm] = useState(false);
  const [themeReady, setThemeReady] = useState(false);

  const [priorCrash, setPriorCrash] = useState(false);

  // Mutate the theme exports from saved a11y prefs BEFORE the navigator (and
  // therefore every screen's StyleSheet.create) is required. Without this
  // gate, the user toggles Higher Contrast in Settings, restarts, and sees
  // no change because the StyleSheets were baked with the default palette.
  useEffect(() => {
    bootstrapAccessibility().then(() => setThemeReady(true));
  }, []);

  // Boot the observability layer — session id, build identity, crash
  // detection, shutdown handler. Returns the prior-crash flag so we
  // can surface a calm "we crashed last session, report's already
  // away" indicator without the user having to do anything.
  useEffect(() => {
    // eslint-disable-next-line global-require
    const { bootObservability } = require('./src/lib/observability');
    bootObservability()
      .then(({ wasCrashed }) => setPriorCrash(!!wasCrashed))
      .catch(() => {});
  }, []);

  // Hydrate accessibility prefs into the store too so SettingsScreen's
  // switches reflect saved state. Independent of the theme bake above —
  // the store drives Reduce Motion (reactive) and the Settings UI.
  useEffect(() => {
    if (!accessibilityLoaded) loadAccessibility();
  }, [accessibilityLoaded, loadAccessibility]);

  useEffect(() => {
    if (prCelebration) getWellbeingMode().then(m => setCalm(isCalm(m)));
  }, [prCelebration]);

  // End any iOS Live Activity left over from a previous launch. If the
  // app was force-closed mid-rest or crashed during a workout, the
  // system retained the Activity — calling endAllActivities here on
  // cold boot dismisses it so the user doesn't see a stale countdown
  // on their lock screen for a workout that's no longer happening.
  // No-op on Android.
  useEffect(() => {
    try {
      // eslint-disable-next-line global-require, import/no-unresolved
      const liveActivity = require('live-activity');
      liveActivity.endAllActivities?.().catch(() => {});
    } catch (_) { /* module not bundled on this platform */ }
  }, []);

  // Deep link handler — processes volyume:// auth callbacks from confirmation emails.
  // RootNavigator's onAuthStateChange listener picks up the resulting session
  // automatically and re-routes the user without any extra navigation calls.
  useEffect(() => {
    Linking.getInitialURL().then(url => { if (url) handleAuthDeepLink(url); }).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => handleAuthDeepLink(url));
    return () => sub.remove();
  }, []);

  // OTA update check — runs once on mount, production builds only.
  // Silently downloads the update and prompts the user to restart.
  useEffect(() => {
    async function checkForUpdate() {
      if (__DEV__) return; // only in production builds
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          Alert.alert(
            'Update available',
            'A new version of Volyume has been downloaded. Restart to apply it.',
            [
              { text: 'Later' },
              { text: 'Restart now', onPress: () => Updates.reloadAsync() },
            ],
            { cancelable: true }
          );
        }
      } catch (_) {
        // Silently ignore — update check is non-critical
      }
    }
    checkForUpdate();
  }, []);

  // Set up Android notification channels and wire notification-tap deep links.
  // When the user taps the lock-screen rest timer notification, open the app
  // directly to the active workout via the volyume:// scheme.
  useEffect(() => {
    ensureNotifChannels();

    const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
      const url = response?.notification?.request?.content?.data?.url;
      if (url && url.startsWith('volyume://')) {
        Linking.openURL(url).catch(() => {});
      }
    });

    return () => responseSub.remove();
  }, []);

  // Register the daily background sync task once on mount. The OS decides
  // when it actually fires (Android batches fetches with other apps; iOS
  // schedules opportunistically) — we just ask for "at most once every
  // ~12 hours". If registration fails (older Android skipping background
  // tasks, simulator, etc.) the foreground sync is still there as a
  // fallback every time the app comes to active.
  useEffect(() => {
    (async () => {
      try {
        const status = await BackgroundFetch.getStatusAsync();
        if (status !== BackgroundFetch.BackgroundFetchStatus.Available) return;
        await BackgroundFetch.registerTaskAsync(VOLYUME_DAILY_SYNC, {
          minimumInterval: 12 * 60 * 60, // seconds — target ~twice a day
          stopOnTerminate: false,
          startOnBoot: true,
        });
      } catch (_) { /* unsupported on this device — fine, foreground sync covers it */ }
    })();
  }, []);

  // Foreground sync — drains the local→cloud sync whenever the app returns
  // to active state. Offline writes (workouts logged with no connection, a
  // body metric entered while underground, etc.) catch up the next time the
  // user opens the app on a connected network. Throttled so a quick
  // foreground/background toggle doesn't hammer the API.
  useEffect(() => {
    let lastSyncAt = 0;
    const MIN_SYNC_INTERVAL_MS = 60_000; // at most once a minute
    async function maybeSync() {
      const now = Date.now();
      if (now - lastSyncAt < MIN_SYNC_INTERVAL_MS) return;
      try {
        const sb = getSupabaseClient();
        if (!sb) return;
        const { data: { session: s } } = await sb.auth.getSession();
        const supabaseUserId = s?.user?.id;
        const localUserId = useAppStore.getState().user?.id;
        lastSyncAt = now;
        if (supabaseUserId && localUserId) {
          // eslint-disable-next-line global-require
          const { bulkUploadLocalData } = require('./src/lib/sync');
          bulkUploadLocalData(supabaseUserId, localUserId).catch(() => {});
        }
        // Drain the sync queue — retries any cloud writes that failed
        // since the last foreground (offline at the gym, flaky 5G, 5xx
        // on Supabase, etc.). Backoff schedule means we don't hammer
        // the API; each op has its own next_attempt_at gate. Safe to
        // run alongside bulkUploadLocalData — they operate on
        // different tables (queue is per-op retry, bulk is catch-up).
        if (supabaseUserId) {
          // eslint-disable-next-line global-require
          const { drainSyncQueue } = require('./src/lib/syncQueue');
          drainSyncQueue(sb, supabaseUserId).catch(() => {});
        }
        // Error log shipping is now Sentry's job (initialised below).
        // The SDK has its own offline buffer + transport, so we don't
        // need to push from here.

        // Health connections: pull any new weight readings the user
        // logged on a smart scale or wearable since the last foreground.
        // Local user id is enough; importNewWeights silently no-ops if
        // permissions aren't granted yet.
        if (localUserId) {
          // eslint-disable-next-line global-require
          const { importNewWeights } = require('./src/lib/health');
          importNewWeights(localUserId).catch(() => {});
        }

        // Flush any feedback rows that were captured offline (the user
        // tapped a sentiment chip while signed-out, etc.). Idempotent;
        // returns 0 quickly when nothing's queued.
        if (supabaseUserId) {
          try {
            // eslint-disable-next-line global-require
            const { flushPendingFeedback } = require('./src/lib/feedback');
            flushPendingFeedback(supabaseUserId).catch(() => {});
          } catch (_) {}
        }

        // Year of Lifts unlock — fire the one-shot "your wrap-up is
        // ready" local notification the first time the user crosses
        // the 365-day training mark. Cheap query (single SELECT for
        // the earliest completed workout); the helper itself is
        // idempotent via an AsyncStorage flag so it never fires
        // twice.
        if (localUserId) {
          try {
            // eslint-disable-next-line global-require
            const { db } = require('./src/lib/database');
            // eslint-disable-next-line global-require
            const { checkYearOfLiftsUnlock } = require('./src/lib/notifications');
            db().then(async (d) => {
              const row = await d.getFirstAsync(
                'SELECT MIN(started_at) AS first_at FROM workouts WHERE user_id = ? AND is_completed = 1',
                [localUserId],
              ).catch(() => null);
              await checkYearOfLiftsUnlock(row?.first_at ?? null);
            }).catch(() => {});
          } catch (_) { /* tolerate — feature is a "nice to have" */ }
        }
      } catch (_) { /* offline / no session — try again next foreground */ }
    }
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') maybeSync();
    });
    // Also run once on mount so an app launched after a long offline period
    // catches up immediately.
    maybeSync();
    return () => sub.remove();
  }, []);

  if (!themeReady) {
    // Minimal pre-theme placeholder. No theme tokens here on purpose — uses
    // hard-coded background that matches the splash so the transition is
    // invisible to the user.
    return <View style={{ flex: 1, backgroundColor: '#0D0D0D' }} />;
  }

  // Lazy-require after applyAccessibility has mutated the theme. These
  // requires synchronously evaluate the whole screen graph; doing them
  // here guarantees every StyleSheet.create sees the post-a11y tokens.
  // eslint-disable-next-line global-require
  const RootNavigator = require('./src/navigation/RootNavigator').default;
  // eslint-disable-next-line global-require
  const PRCelebration = require('./src/components/PRCelebration').default;

  // eslint-disable-next-line global-require
  const { ToastProvider } = require('./src/components/Toast');
  // eslint-disable-next-line global-require
  const WhatsNewSheet = require('./src/components/WhatsNewSheet').default;
  // eslint-disable-next-line global-require
  const { FeedbackProvider } = require('./src/components/FeedbackSheet');

  // Items surfaced ONCE on this release. Each item is a small icon +
  // headline + one-line body. Keep this list short so the sheet
  // doesn't read as a marketing dump. Health Connect is intentionally
  // NOT listed here — the native module isn't bundled in this build
  // (pending an Android Gradle Plugin upgrade), so promising it would
  // send the user to a Settings row that doesn't exist. The item
  // returns the moment the module is back.
  const whatsNewItems = [
    {
      icon: 'sparkles-outline',
      tint: '#F59E0B',
      headline: 'Coach explanations on every session',
      body: 'Tap "Why this status?" on any muscle row in your session summary for a coach paragraph and next-week guidance.',
    },
    {
      icon: 'trophy-outline',
      tint: '#FFD700',
      headline: 'Your Year of Lifts, restyled',
      body: 'Tap into it from Progress to swipe through the highlights of your training year, one stat at a time.',
    },
    {
      icon: 'notifications-outline',
      tint: '#9C27B0',
      headline: 'Smarter reminders',
      body: 'Notifications check what you already did today and stay quiet when there\'s nothing to nudge.',
    },
  ];

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" backgroundColor="#0D0D0D" />
          <ToastProvider>
            <FeedbackProvider>
              <RootNavigator />
              {prCelebration && (
                <PRCelebration
                  pr={prCelebration}
                  onDismiss={hidePRCelebration}
                  // Honour either calm-mode (wellbeing preference) OR the
                  // accessibility "reduce motion" pref. Both should suppress
                  // particles + heavy spring animations.
                  subdued={calm || reduceMotion}
                />
              )}
              <WhatsNewSheet
                items={whatsNewItems}
                onOpenSettings={() => {
                  try {
                    // eslint-disable-next-line global-require
                    const { navigationRef } = require('./src/navigation/RootNavigator');
                    if (navigationRef?.isReady?.()) {
                      navigationRef.navigate('ProfileTab', { screen: 'Settings' });
                    }
                  } catch (_) {}
                }}
              />
              <CrashRecoveryToast priorCrash={priorCrash} />
            </FeedbackProvider>
          </ToastProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
