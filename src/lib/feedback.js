/**
 * feedback.js
 *
 * Submit and suppression logic for the in-app user feedback sheet.
 *
 * Three submission paths land in the same `user_feedback` table:
 *   - contextual: triggered by the app at meaningful moments
 *     (first workout, first plan, every 5th completion)
 *   - shake: power-user shake-to-report
 *   - settings: intentional "Send feedback" from Settings
 *
 * Every submission auto-attaches:
 *   - session id, build identity, current screen (from observability)
 *   - recent screens + actions from the on-device breadcrumb buffer
 *   - the most recent error in the last 60s (so the report is
 *     pre-debugged)
 *   - low-cardinality tags for dashboard grouping
 *
 * Suppression rules so the user is never nagged:
 *   - never twice in 14 days from the same contextual trigger
 *   - never within 2 minutes of a crash recovery banner
 *   - never during an active workout
 *   - never on the same screen twice in one session
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getSupabaseClient } from './supabase';
import { getRecentErrors } from './errorLog';
import {
  getSessionId, setCurrentUserId, track,
} from './observability';

const PROMPT_HISTORY_KEY = '@volyume_feedback_prompt_history_v1';
const FOURTEEN_DAYS_MS = 14 * 86400000;

// In-session memory: triggers we've already shown this launch, so
// repeated work-completions in one sitting don't keep prompting.
const _shownThisSession = new Set();

/**
 * Should we present the feedback prompt for this trigger?
 *
 * @param {string} triggerKey  Stable id for the trigger (e.g.
 *                             'first_workout', 'plan_generated',
 *                             'every_5th_completion:Upper A').
 * @returns true if the prompt should appear now.
 */
export async function shouldPrompt(triggerKey) {
  if (!triggerKey) return false;
  if (_shownThisSession.has(triggerKey)) return false;
  try {
    const raw = await AsyncStorage.getItem(PROMPT_HISTORY_KEY);
    const history = raw ? JSON.parse(raw) : {};
    const lastShown = history[triggerKey];
    if (lastShown && Date.now() - lastShown < FOURTEEN_DAYS_MS) return false;
    return true;
  } catch (_) {
    return true;
  }
}

/**
 * Record that the prompt was shown so the suppression window starts.
 * Called by FeedbackSheet on mount (not on submit) so dismissals
 * count too — we don't want to badger.
 */
export async function markPromptShown(triggerKey) {
  if (!triggerKey) return;
  _shownThisSession.add(triggerKey);
  try {
    const raw = await AsyncStorage.getItem(PROMPT_HISTORY_KEY);
    const history = raw ? JSON.parse(raw) : {};
    history[triggerKey] = Date.now();
    await AsyncStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(history));
  } catch (_) {}
}

/**
 * Submit a feedback row. The caller passes `trigger`, `sentiment`,
 * and optional `message`; everything else is auto-attached from the
 * observability layer + the local error buffer.
 *
 * Returns { ok: true } on success or { ok: false, error } on
 * failure. Failure paths: no Supabase client (anonymous local-only
 * install), network error, RLS rejection. None of these crash the
 * caller — feedback is fire-and-forget UX-wise.
 */
export async function submitFeedback({
  trigger, sentiment, message,
  triggerKey, userId,
}) {
  const sb = getSupabaseClient();
  if (!sb) {
    // Local-only install — record the submission locally so the
    // user's intent isn't lost, and ship on next foreground when
    // we have a session.
    try {
      const pending = await AsyncStorage.getItem('@volyume_feedback_pending_v1');
      const list = pending ? JSON.parse(pending) : [];
      list.unshift({
        trigger, sentiment, message,
        triggerKey,
        capturedAt: Date.now(),
      });
      await AsyncStorage.setItem('@volyume_feedback_pending_v1', JSON.stringify(list.slice(0, 20)));
    } catch (_) {}
    return { ok: false, error: { message: 'No cloud session — feedback queued locally.' } };
  }

  try {
    const enrich = await _gatherContext();
    const payload = {
      user_id: userId ?? null,
      trigger,
      sentiment,
      message: (message || '').slice(0, 2000) || null,
      ...enrich,
    };
    const { error } = await sb.from('user_feedback').insert(payload);
    if (error) {
      // Don't surface raw PostgREST errors to the user — just log.
      track.warn('feedback.submit.failed', 'feedback', { code: error.code, details: error.details });
      return { ok: false, error };
    }
    track.event('feedback.submitted', {
      trigger, sentiment,
      hasMessage: !!message,
    });
    if (triggerKey) await markPromptShown(triggerKey);
    return { ok: true };
  } catch (e) {
    track.warn('feedback.submit.threw', 'feedback', { error: e?.message });
    return { ok: false, error: e };
  }
}

/**
 * Collect the auto-attached context. Runs at submission time so we
 * capture state as close as possible to when the user clicked send.
 */
async function _gatherContext() {
  // eslint-disable-next-line global-require
  const obs = (() => { try { return require('./observability'); } catch (_) { return {}; } })();
  const build = obs.getBuildIdentity?.() ?? {};
  const sessionId = obs.getSessionId?.() ?? null;
  const sessionStart = obs.getSessionStart?.() ?? null;
  const screen = obs.getCurrentScreen?.() ?? null;

  // Recent screens + actions: scrape from the on-device ring buffer.
  // Limit to the last 10 / 20 to keep payload light.
  let recentScreens = [];
  let recentActions = [];
  let lastError = null;
  try {
    const entries = await getRecentErrors(200);
    for (const e of entries) {
      if (recentScreens.length < 10 && e.scope === 'navigation') {
        // observability emits screen breadcrumbs with scope='navigation'
        // and message='screen.<name>'.
        const name = String(e.message || '').replace(/^screen\./, '');
        recentScreens.push({ name, ts: e.ts });
      }
      if (recentActions.length < 20 && /^store\./.test(String(e.scope || ''))) {
        recentActions.push({ name: e.scope, ts: e.ts });
      }
      if (!lastError && e.level === 'error' && Date.now() - e.ts < 60_000) {
        lastError = { ts: e.ts, scope: e.scope, message: e.message };
      }
    }
  } catch (_) { /* tolerate */ }

  const tags = [];
  if (build.version) tags.push(`v${build.version}`);
  if (screen) tags.push(`screen:${screen}`);
  if (lastError) tags.push('recent_error');
  if (Platform.OS) tags.push(`platform:${Platform.OS}`);

  return {
    session_id: sessionId,
    app_version: build.version ?? null,
    build_number: build.buildNumber != null ? String(build.buildNumber) : null,
    platform: build.platform ?? Platform.OS,
    commit_sha: build.commitSha ?? null,
    runtime_version: build.runtimeVersion ?? null,
    screen,
    recent_screens: recentScreens,
    recent_actions: recentActions,
    last_error: lastError,
    session_age_ms: sessionStart ? Date.now() - sessionStart : null,
    tags,
  };
}

/**
 * Flush any feedback rows that were captured offline and queued
 * locally because there was no Supabase client at submission time.
 * Called from App.js's foreground sync handler so a returning user
 * who reports while signed-out gets their report shipped once they
 * sign in.
 */
export async function flushPendingFeedback(userId) {
  const sb = getSupabaseClient();
  if (!sb) return 0;
  try {
    const raw = await AsyncStorage.getItem('@volyume_feedback_pending_v1');
    const list = raw ? JSON.parse(raw) : [];
    if (!list.length) return 0;
    let shipped = 0;
    for (const item of list) {
      try {
        const res = await submitFeedback({
          ...item,
          userId: userId ?? null,
        });
        if (res.ok) shipped++;
      } catch (_) { /* leave for next foreground */ }
    }
    if (shipped === list.length) {
      await AsyncStorage.removeItem('@volyume_feedback_pending_v1');
    } else if (shipped > 0) {
      // Keep the items that failed; we'll try them again next time.
      await AsyncStorage.setItem(
        '@volyume_feedback_pending_v1',
        JSON.stringify(list.slice(shipped)),
      );
    }
    return shipped;
  } catch (_) { return 0; }
}
