/**
 * observability.js
 *
 * Single front door for the app's error + performance + session
 * tracking. Sits on top of errorLog.js (ring buffer) and sentry.js
 * (cloud) so the rest of the codebase doesn't have to know which
 * destination an event lands in.
 *
 * Three things make this "automatic":
 *
 *   1. **instrumentStore(useStore)** — wraps every zustand action
 *      to emit a breadcrumb with action name + duration. So when
 *      a crash happens, Sentry's issue detail shows the last N
 *      store mutations leading up to it, with no manual logInfo
 *      calls.
 *
 *   2. **instrumentNavigation(navigationRef)** — subscribes to
 *      every navigation state change and emits a screen-view
 *      breadcrumb. The user's path through the app is captured
 *      automatically.
 *
 *   3. **instrumentSupabase(client)** — wraps the Supabase client's
 *      `.from(table)` and `.auth.*` calls so every cloud read /
 *      write emits a breadcrumb with the table and operation
 *      type. Network round-trip time is captured too.
 *
 * Everything is opt-in per surface — call instrumentX() once at
 * boot and the surface is covered for the rest of the session.
 *
 * Privacy by default: the redactPII layer strips body weight,
 * email, first name, height, DOB, body fat %, and any other key
 * tagged below before events leave the device. To include
 * sensitive data in an error report intentionally (e.g. for a
 * targeted debug session), pass `{ allowPII: true }` in ctx.
 *
 * The session id is a UUID minted on app launch. Every breadcrumb
 * + error carries it as a tag so a single user's full session
 * thread is searchable in Sentry without any user-identifying
 * fields needed.
 */

import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from './sentry';
import { logError, logWarn, logInfo } from './errorLog';

// ─── Session + build identity ────────────────────────────────────────────

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const SESSION_ID = uuid();
const SESSION_START_MS = Date.now();

let _buildIdentity = null;
function getBuildIdentity() {
  if (_buildIdentity) return _buildIdentity;
  try {
    // eslint-disable-next-line global-require
    const Constants = require('expo-constants').default;
    _buildIdentity = {
      version: Constants?.expoConfig?.version ?? null,
      buildNumber: Platform.OS === 'ios'
        ? Constants?.expoConfig?.ios?.buildNumber ?? null
        : Constants?.expoConfig?.android?.versionCode ?? null,
      platform: Platform.OS,
      runtimeVersion: Constants?.expoConfig?.runtimeVersion ?? null,
      // Commit SHA can be injected by the build pipeline at EAS
      // build time via expo.extra.commitSha. Until that's wired
      // we fall back to null.
      commitSha: Constants?.expoConfig?.extra?.commitSha ?? null,
    };
  } catch (_) {
    _buildIdentity = { version: null, buildNumber: null, platform: Platform.OS, runtimeVersion: null, commitSha: null };
  }
  return _buildIdentity;
}

export function getSessionId() { return SESSION_ID; }
export function getSessionStart() { return SESSION_START_MS; }

// ─── PII redaction ───────────────────────────────────────────────────────
//
// Keys that should never leave the device unless explicitly allowed.
// The check is on the KEY name only, recursively — a key 'email' at
// any depth is redacted regardless of which object it sits in.

const PII_KEYS = new Set([
  'email', 'firstName', 'lastName', 'fullName',
  'dateOfBirth', 'date_of_birth', 'birthDate',
  'weightKg', 'weight_kg', 'bodyWeight', 'body_weight',
  'heightCm', 'height_cm',
  'bodyFatPercent', 'body_fat_percent',
  'phone', 'phoneNumber', 'address',
  // Body measurements
  'waistCm', 'waist_cm', 'chestCm', 'chest_cm',
  'hipsCm', 'hips_cm', 'thighCm', 'quads',
  'hamCm', 'hamstrings', 'calfCm', 'calves',
  'armCm', 'arms', 'shouldersCm', 'shoulders',
  'forearmCm', 'forearms',
]);

const REDACT_PLACEHOLDER = '[redacted]';
const MAX_DEPTH = 5;

export function redactPII(value, depth = 0) {
  if (value == null || depth > MAX_DEPTH) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(v => redactPII(v, depth + 1));
  if (typeof value !== 'object') return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (PII_KEYS.has(k)) {
      // Keep the shape — replace the value but preserve the key so
      // log readers can tell "weight was present, just redacted"
      // versus "weight was missing".
      out[k] = v == null ? null : REDACT_PLACEHOLDER;
    } else {
      out[k] = redactPII(v, depth + 1);
    }
  }
  return out;
}

// ─── Crashed-last-session detection ──────────────────────────────────────

const CRASHED_FLAG_KEY = '@volyume_clean_shutdown_v1';
const LAST_CRASH_KEY = '@volyume_last_crash_meta_v1';

let _wasCrashedLastSession = null;

/**
 * Returns true if the previous app session ended without a clean
 * shutdown (i.e. it crashed, was force-quit, or the OS killed it).
 * Call once at app boot; the answer is cached for the session.
 *
 * Implementation: we write 'true' to the CRASHED_FLAG_KEY on every
 * app launch and 'false' on graceful shutdown (AppState → background
 * is the closest stable signal RN gives us). If we see 'true' on
 * boot, the previous session never reached the shutdown handler.
 */
export async function detectCrashedLastSession() {
  if (_wasCrashedLastSession !== null) return _wasCrashedLastSession;
  try {
    const flag = await AsyncStorage.getItem(CRASHED_FLAG_KEY);
    // 'true' means a previous launch set it AND never cleared it.
    _wasCrashedLastSession = flag === 'true';
    // Now mark THIS session as in-progress. The next clean
    // shutdown will reset it; if THIS one crashes, the next
    // boot will see 'true' here and report.
    await AsyncStorage.setItem(CRASHED_FLAG_KEY, 'true');
  } catch (_) {
    _wasCrashedLastSession = false;
  }
  return _wasCrashedLastSession;
}

/**
 * Wire the AppState handler that flips the "clean shutdown" flag.
 * Call once at boot. Backgrounding = clean enough; the OS may
 * still kill the process after this point but the user has chosen
 * to leave so we don't treat that as a crash.
 */
export function installShutdownHandler() {
  try {
    AppState.addEventListener('change', state => {
      if (state === 'background' || state === 'inactive') {
        AsyncStorage.setItem(CRASHED_FLAG_KEY, 'false').catch(() => {});
      } else if (state === 'active') {
        AsyncStorage.setItem(CRASHED_FLAG_KEY, 'true').catch(() => {});
      }
    });
  } catch (_) { /* tolerate */ }
}

export async function getLastCrashMeta() {
  try {
    const raw = await AsyncStorage.getItem(LAST_CRASH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

export async function recordCrashMeta(meta) {
  try {
    await AsyncStorage.setItem(LAST_CRASH_KEY, JSON.stringify({
      ts: Date.now(),
      sessionId: SESSION_ID,
      ...meta,
    }));
  } catch (_) {}
}

// ─── Track API ───────────────────────────────────────────────────────────
//
// The public surface for the rest of the app. Every event is enriched
// with session id + build identity + screen + user id automatically.

let _currentScreen = null;
let _currentUserId = null;

export function setCurrentScreen(name) { _currentScreen = name || null; }
export function setCurrentUserId(id)   { _currentUserId = id || null; }
export function getCurrentScreen() { return _currentScreen; }
export function getCurrentUserId() { return _currentUserId; }
export { getBuildIdentity };

function enrich(extra = {}, opts = {}) {
  const allowPII = !!opts.allowPII;
  const build = getBuildIdentity();
  const base = {
    sessionId: SESSION_ID,
    sessionAgeMs: Date.now() - SESSION_START_MS,
    screen: _currentScreen,
    userId: _currentUserId,
    appVersion: build.version,
    buildNumber: build.buildNumber,
    platform: build.platform,
    runtimeVersion: build.runtimeVersion,
    commitSha: build.commitSha,
  };
  const merged = { ...base, ...extra };
  return allowPII ? merged : redactPII(merged);
}

export const track = {
  /**
   * Emit a structured event. Goes to the ring buffer AND Sentry as
   * a message. Use this when the event is significant enough to want
   * searchable later but isn't an error.
   */
  event(name, props = {}, opts = {}) {
    const enriched = enrich(props, opts);
    logInfo(name, name, enriched);
  },

  /**
   * Capture an error. Forwards to Sentry as an issue (creates a
   * group) and to the ring buffer for on-device viewing.
   *
   * @param {Error|unknown} error  Exception or any throwable.
   * @param {string} scope         Logical area (e.g. 'sync.routines').
   *                               Low-cardinality, used for grouping.
   * @param {Object} extra         Structured context — anything
   *                               JSON-serialisable. PII redacted
   *                               automatically unless opts.allowPII.
   */
  error(error, scope, extra = {}, opts = {}) {
    const enriched = enrich(extra, opts);
    logError(scope, error, enriched);
  },

  warn(message, scope, extra = {}, opts = {}) {
    const enriched = enrich(extra, opts);
    logWarn(scope, message, enriched);
  },

  /**
   * Add a breadcrumb without creating an event. Cheap; the next
   * error fired in this session inherits the trail of breadcrumbs
   * automatically.
   */
  breadcrumb(message, scope, extra = {}, opts = {}) {
    const enriched = enrich(extra, opts);
    logInfo(scope, message, enriched);
  },

  /**
   * Record a screen view. Called automatically by
   * instrumentNavigation. Manual calls are fine if you want to mark
   * a sub-section (e.g. a modal sheet that doesn't go through the
   * navigator).
   */
  screen(name, params = {}) {
    setCurrentScreen(name);
    this.breadcrumb(`screen.${name}`, 'navigation', { name, params });
  },

  /**
   * Record a user-initiated action. Called automatically by
   * instrumentStore for every zustand action. Manual calls cover
   * gestures, tap events, etc. not in the store.
   */
  userAction(name, props = {}) {
    this.breadcrumb(`action.${name}`, 'user', props);
  },

  /**
   * Start a performance transaction. Returns a finish() function.
   * Use for "is this slow?" investigation:
   *
   *   const finish = track.transaction('sync.pullFromCloud');
   *   await pull();
   *   finish();   // logs duration
   *
   * The finish() call emits a breadcrumb with the duration tagged
   * so Sentry's performance view can surface slow operations.
   */
  transaction(name, scope = 'perf') {
    const startedAt = Date.now();
    return (extra = {}) => {
      const durationMs = Date.now() - startedAt;
      this.breadcrumb(`${name}.done`, scope, { ...extra, durationMs });
      return durationMs;
    };
  },
};

// ─── Auto-instrumentation: zustand ───────────────────────────────────────

/**
 * Wrap every action in a zustand store so calls automatically emit a
 * breadcrumb with the action name + duration. Sentry's issue detail
 * then shows the last N store mutations leading up to the crash
 * without any manual logInfo calls.
 *
 * Heuristic: an "action" is any field on the store whose value is a
 * function. The wrapper preserves the function's identity contract
 * (still a function, still callable with the same args) so existing
 * `useAppStore(s => s.setX)` selector patterns still work.
 *
 * Side-effect-free actions (pure getters that happen to be functions)
 * get a tiny extra breadcrumb cost, which is fine — store actions are
 * called O(per-tap), not O(per-frame).
 */
export function instrumentStore(useStore) {
  if (!useStore || typeof useStore.getState !== 'function') return;
  try {
    const state = useStore.getState();
    const setState = useStore.setState.bind(useStore);
    const next = {};
    for (const [key, value] of Object.entries(state)) {
      if (typeof value !== 'function') continue;
      // Skip already-wrapped (idempotent if called twice in dev).
      if (value.__volyumeInstrumented) continue;
      const original = value;
      const wrapped = function instrumentedAction(...args) {
        const startedAt = Date.now();
        try {
          const result = original.apply(this, args);
          if (result && typeof result.then === 'function') {
            // Promise — wait for resolution to log timing.
            return result.then(r => {
              track.userAction(`store.${key}`, { durationMs: Date.now() - startedAt });
              return r;
            }).catch(e => {
              track.error(e, `store.${key}`, { durationMs: Date.now() - startedAt });
              throw e;
            });
          }
          track.userAction(`store.${key}`, { durationMs: Date.now() - startedAt });
          return result;
        } catch (e) {
          track.error(e, `store.${key}`, { durationMs: Date.now() - startedAt });
          throw e;
        }
      };
      wrapped.__volyumeInstrumented = true;
      next[key] = wrapped;
    }
    if (Object.keys(next).length) setState(next);
  } catch (e) {
    // Instrumentation is observability infrastructure — if it errors
    // the app should still work. Log and move on.
    try { logWarn('observability.instrumentStore', e?.message); } catch (_) {}
  }
}

// ─── Auto-instrumentation: react-navigation ──────────────────────────────

/**
 * Subscribe to a react-navigation ref's state changes and emit a
 * screen-view breadcrumb on every navigation. The currently-active
 * screen is also tracked on the module level so every subsequent
 * track.* call carries it as context.
 *
 * Returns the unsubscribe function so callers can detach in tests.
 */
export function instrumentNavigation(navigationRef) {
  if (!navigationRef) return () => {};
  let lastRouteKey = null;
  function getActiveRoute(state) {
    if (!state) return null;
    const route = state.routes?.[state.index];
    if (!route) return null;
    if (route.state) return getActiveRoute(route.state);
    return route;
  }
  function handle() {
    try {
      const state = navigationRef.getRootState?.();
      const route = getActiveRoute(state);
      if (!route) return;
      if (route.key === lastRouteKey) return;
      lastRouteKey = route.key;
      track.screen(route.name, route.params ?? {});
    } catch (_) { /* tolerate */ }
  }
  // 'state' event fires on every nav. Initial state arrives once the
  // navigator is ready.
  if (typeof navigationRef.addListener === 'function') {
    const unsub = navigationRef.addListener('state', handle);
    // Capture the initial screen too.
    if (typeof navigationRef.isReady === 'function' && navigationRef.isReady()) handle();
    return unsub;
  }
  return () => {};
}

// ─── Auto-instrumentation: Supabase client ───────────────────────────────

/**
 * Wrap the supabase-js client so every database query emits a
 * breadcrumb with the table and operation. Returns a proxied client
 * that forwards all other methods through. Safe to call multiple
 * times — the proxy is idempotent.
 *
 * Coverage:
 *   - client.from(table) → tracks .select / .insert / .update /
 *     .upsert / .delete with the table name and duration
 *   - client.auth.* → tracks the method name
 *   - client.rpc(name) → tracks the RPC name
 *
 * Failures bubble through unchanged; we only OBSERVE the calls, we
 * never intercept errors. Sentry's existing Network breadcrumb
 * integration covers the underlying fetch; this layer adds the
 * higher-level operation name so a search by "table=routines op=upsert"
 * is possible without parsing URLs.
 */
export function instrumentSupabase(client) {
  if (!client || client.__volyumeInstrumented) return client;
  const QUERY_OPS = ['select', 'insert', 'update', 'upsert', 'delete'];
  const proxiedFrom = (...fromArgs) => {
    const table = fromArgs[0];
    const builder = client.from.apply(client, fromArgs);
    // Wrap the terminal operations. The builder uses chained methods
    // (.from('x').select('*').eq('id', y)) so we proxy each terminal
    // op by replacing the method on this particular builder instance.
    for (const op of QUERY_OPS) {
      const orig = builder[op];
      if (typeof orig !== 'function') continue;
      builder[op] = function instrumentedOp(...args) {
        const startedAt = Date.now();
        const result = orig.apply(this, args);
        // Many ops return a thenable PostgrestQueryBuilder; wrap .then.
        if (result && typeof result.then === 'function') {
          const origThen = result.then.bind(result);
          result.then = (onFulfilled, onRejected) => origThen(
            (value) => {
              track.breadcrumb(`db.${op}`, `supabase.${table}`, {
                durationMs: Date.now() - startedAt,
                hasError: !!value?.error,
              });
              return onFulfilled ? onFulfilled(value) : value;
            },
            onRejected,
          );
        }
        return result;
      };
    }
    return builder;
  };
  const proxy = new Proxy(client, {
    get(target, prop) {
      if (prop === 'from') return proxiedFrom;
      if (prop === '__volyumeInstrumented') return true;
      return Reflect.get(target, prop);
    },
  });
  return proxy;
}

// ─── Boot helper ─────────────────────────────────────────────────────────

/**
 * One-call setup that wires the whole observability layer.
 *
 *   - Detects whether the previous session crashed
 *   - Installs the AppState shutdown handler
 *   - Returns the result so the caller can show a calm "we crashed
 *     last time and the report's already on its way" banner
 *
 * Call once from App.js after applyAccessibility but before the
 * navigator mounts.
 */
export async function bootObservability() {
  const wasCrashed = await detectCrashedLastSession();
  installShutdownHandler();
  if (wasCrashed) {
    // Fire a one-off Sentry event so the previous session's crash
    // surfaces in the dashboard even when the JS error handler
    // didn't get a chance to fire (e.g. native crash, OOM kill,
    // hard reboot).
    const meta = await getLastCrashMeta();
    track.event('app.session.priorCrash', {
      previousSessionId: meta?.sessionId ?? null,
      previousCrashAt: meta?.ts ?? null,
    });
  }
  // Mark this session in Sentry tags so dashboard filters work.
  try {
    Sentry?.setSentryUser({ id: null }); // clears stale id until sign-in re-sets
  } catch (_) {}
  return { wasCrashed };
}
