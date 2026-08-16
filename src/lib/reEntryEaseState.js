/**
 * reEntryEaseState.js — Campaign 18 long-gap re-entry amendment, follow-up.
 *
 * The IO seam for the athlete's "I haven't trained" answer. reEntryCheck.js
 * decides what that answer MEANS (easeReturn: true) and is deliberately
 * pure - it never touches storage. Until now nothing carried that decision
 * any further than a toast: Home asked the question, recorded that a gap had
 * been answered, and then threw the answer itself away, so the next session
 * was handed back at full peak targets regardless of what the athlete said.
 *
 * This module persists the ANSWER, bound to the exact outstanding required
 * session it was asked about (mesocycleWeekId + routineId - the same stable
 * identity blockProgression.js uses everywhere else).
 *
 * ONE-SESSION-ONLY BY IDENTITY, NOT BY A CLOCK. There is no expiry timestamp
 * here and no TTL: the decision is retired only when a caller confirms the
 * BOUND session actually resolved (clearPendingReEntryEase /
 * clearPendingReEntryEaseIfMatches), which HomeScreen (skip) and
 * ActiveWorkoutScreen (finish, including ended-early) call at every
 * resolution path. Starting a DIFFERENT session leaves it untouched -
 * reEntryEaseMatches simply returns false, so nothing here can be consumed
 * by an out-of-order or wrong-week session; it stays pending for whenever the
 * real bound session is eventually started, including after an app kill or a
 * discarded/abandoned attempt at it.
 *
 * AsyncStorage, not a new table or column: this is a transient UI decision
 * about ONE upcoming session, not programme state. It does not need to sync
 * to Supabase or survive a reinstall, and a schema change is not warranted
 * for it (CLAUDE.md: additive-only, and only when unavoidable).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logWarn } from './errorLog';

const KEY_PREFIX = '@volyume_reentry_ease_';

/**
 * Persist the decision, bound to the exact outstanding required session.
 * Best-effort: a write failure leaves nothing pending rather than throwing,
 * matching this module's "silence is safe" default everywhere else.
 */
export async function setPendingReEntryEase(userId, { mesocycleWeekId, routineId } = {}, now = Date.now()) {
  if (!userId || !mesocycleWeekId || !routineId) return;
  try {
    await AsyncStorage.setItem(KEY_PREFIX + userId, JSON.stringify({
      mesocycleWeekId,
      routineId,
      because: 'athlete_reentry_choice',
      setAt: now,
    }));
  } catch (e) {
    logWarn('reEntryEaseState.set', e?.message);
  }
}

/** The pending decision, or null. Never throws; malformed storage reads as null. */
export async function getPendingReEntryEase(userId) {
  if (!userId) return null;
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.mesocycleWeekId || !parsed?.routineId) return null;
    return parsed;
  } catch (_e) {
    return null;
  }
}

/**
 * PURE. Does this pending decision bind to this exact session? Both
 * identifiers must match - the same routine reused later in the week under a
 * different mesocycle_week_id, or the same routine in a different week, is a
 * different required session and must not consume it.
 */
export function reEntryEaseMatches(pending, { mesocycleWeekId, routineId } = {}) {
  if (!pending || !mesocycleWeekId || !routineId) return false;
  return pending.mesocycleWeekId === mesocycleWeekId && pending.routineId === routineId;
}

/** Retire the decision outright. Idempotent; safe when nothing is pending. */
export async function clearPendingReEntryEase(userId) {
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(KEY_PREFIX + userId);
  } catch (e) {
    logWarn('reEntryEaseState.clear', e?.message);
  }
}

/**
 * Retire the pending decision only if it is the one bound to THIS session -
 * resolving some other session (training elsewhere while this one is still
 * pending) must never clear a decision still waiting for its real match.
 */
export async function clearPendingReEntryEaseIfMatches(userId, session) {
  const pending = await getPendingReEntryEase(userId);
  if (reEntryEaseMatches(pending, session)) {
    await clearPendingReEntryEase(userId);
  }
}
