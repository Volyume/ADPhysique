/**
 * startupTrace.js
 *
 * Diagnostic: writes timestamped step markers to AsyncStorage as the
 * app boots. If the app crashes before reaching the "ready" step, the
 * next launch can read the trace and tell the user exactly which
 * phase died.
 *
 * Self-contained and fault-tolerant: every public function swallows
 * its own AsyncStorage errors so the tracer can never be the cause
 * of a crash. If AsyncStorage itself is unavailable, the tracer
 * silently no-ops and the rest of the app keeps running.
 *
 * Lifecycle:
 *   - App.js top: clearTrace() then traceStep('boot.start')
 *   - Each phase: traceStep('phase.name', { detail }) once entered
 *   - When the app fully renders past the splash: traceStep('boot.ready')
 *   - When the app backgrounds cleanly: trace is moved to the
 *     "previous trace" slot so the next launch can read what
 *     happened (in case the previous session died mid-step)
 *
 * On next launch, if observability.detectCrashedLastSession() reports
 * true, errorLog will include the last few trace steps in the crash
 * log entry so LoginScreen's banner surfaces them.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const TRACE_KEY = '@volyume_startup_trace_v1';
const PREV_TRACE_KEY = '@volyume_startup_trace_prev_v1';
const MAX_STEPS = 60;

// In-memory mirror so traceStep is synchronous from the caller's
// perspective; the AsyncStorage write fires in the background. If
// the process is killed before the write lands we still have the
// in-memory trace via the prev key written on the next clean
// shutdown.
let _trace = [];
let _started = false;

function _persist() {
  // Fire and forget. Tracer must never throw.
  try {
    AsyncStorage.setItem(TRACE_KEY, JSON.stringify(_trace)).catch(() => {});
  } catch (_) {}
}

/**
 * Begin a new trace session. Idempotent within a process; calling
 * twice is a no-op so accidental double-init can't lose the trace.
 * The previous trace (if any) is moved to PREV_TRACE_KEY so the
 * next launch's crash log can reference it.
 */
export async function beginStartupTrace() {
  if (_started) return;
  _started = true;
  _trace = [{ step: 'boot.start', ts: Date.now() }];
  try {
    const prev = await AsyncStorage.getItem(TRACE_KEY);
    if (prev) {
      await AsyncStorage.setItem(PREV_TRACE_KEY, prev).catch(() => {});
    }
    await AsyncStorage.setItem(TRACE_KEY, JSON.stringify(_trace)).catch(() => {});
  } catch (_) {}
}

/**
 * Record a step. Steps capped at MAX_STEPS — oldest entries drop
 * off the front. `detail` is optional JSON-serialisable context
 * (e.g. { userId, table }) that helps narrow the cause.
 */
export function traceStep(step, detail) {
  try {
    const entry = { step, ts: Date.now() };
    if (detail != null) {
      // Best-effort serialise; if it fails (circular), drop the detail.
      try { entry.detail = JSON.parse(JSON.stringify(detail)); } catch (_) {}
    }
    _trace.push(entry);
    if (_trace.length > MAX_STEPS) _trace.splice(0, _trace.length - MAX_STEPS);
    _persist();
  } catch (_) {}
}

/**
 * Read the trace from the PREVIOUS launch (the one that may have
 * crashed). Returns an array of { step, ts, detail? } entries or [].
 * Used by errorLog / LoginScreen to surface which step the prior
 * session died at.
 */
export async function getPreviousStartupTrace() {
  try {
    const raw = await AsyncStorage.getItem(PREV_TRACE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

/**
 * Read the trace from the CURRENT launch. Useful for live diagnostics
 * (e.g. a debug screen that wants to show what's happened so far).
 */
export function getCurrentStartupTrace() {
  return _trace.slice();
}

/**
 * Format a trace array as a short human-readable summary. Each line
 * is `+Nms  step.name  {detail JSON}`. Used by the LoginScreen
 * crash banner.
 */
export function formatTrace(trace) {
  if (!trace || trace.length === 0) return '';
  const start = trace[0]?.ts ?? 0;
  return trace.map(e => {
    const offset = e.ts - start;
    const detail = e.detail ? '  ' + JSON.stringify(e.detail) : '';
    return `+${String(offset).padStart(5, ' ')}ms  ${e.step}${detail}`;
  }).join('\n');
}
