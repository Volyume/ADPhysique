/**
 * COMP-019 Stage 2 — gather widget inputs and persist the snapshot (the thin,
 * OTA-patchable writer; the pure shaping lives in snapshot.js).
 *
 * Gathers from existing local reads ONLY (offline-first, no network):
 *   - next session: active plan + getCurrentMesocycleWeek for the
 *     week-in-block chip.
 *   - consistency: this week's session count + the COMP-018 ED suppression rule.
 * Privacy: NEVER weight/calories/macros/body data — only a routine name + counts.
 *
 * The snapshot's dayLabel is always null (founder ruling 2026-08-03: the
 * product has no scheduled training days; @volyume_schedule_v1 is a habit
 * inference sanctioned only for soft reminder copy — D17. See
 * docs/audit/cross-surface-consistency-audit-2026-07-30.md).
 *
 * Triggered (no polling) on: workout finish, plan/schedule change,
 * foreground→background, and the existing background-fetch date rollover.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getActivePlan, getRoutinesForPlan, getCurrentMesocycleWeek,
  getWeeklySessionStats, getOpenEdPatternFlag,
} from '../database';
import { localWeekStartMs } from '../dayKey';
import { loadStreakState } from '../streakState';
import { isCalm, WELLBEING_KEY } from '../wellbeing';
import { buildWidgetSnapshot, emptyWidgetSnapshot } from './snapshot';
import { persistWidgetSnapshot } from './storage';

/** Gather the widget inputs from local storage. Exposed for unit tests. */
export async function gatherWidgetInputs(userId) {
  if (!userId) return null;

  const plan = await getActivePlan(userId).catch(() => null);
  const routines = plan?.id ? await getRoutinesForPlan(plan.id).catch(() => []) : [];
  const mesoWeek = await getCurrentMesocycleWeek(userId).catch(() => null);

  let nextSession = null;
  if (plan?.id && Array.isArray(routines) && routines.length > 0) {
    nextSession = {
      // A routine/plan name only — never body data. v1 names the plan; per-day
      // routine rotation is a later refinement.
      name: routines[0]?.name || plan.name || 'Next session',
      // Never a day claim: no scheduled training days exist (see header).
      dayLabel: null,
      // X17 (cross-surface-consistency-audit-2026-07-30): weekIndex from
      // getCurrentMesocycleWeek is already 1-indexed; this +1 was the
      // widget's OWN off-by-one, independent of (and only masked by) the
      // week-1 pin the resolver used to have.
      weekInBlock: (mesoWeek && Number.isFinite(mesoWeek.weekIndex) && Number.isFinite(mesoWeek.plannedWeeks))
        ? { week: mesoWeek.weekIndex, total: mesoWeek.plannedWeeks }
        : null,
    };
  }

  const weekStart = localWeekStartMs(Date.now());
  const stats = await getWeeklySessionStats(userId, weekStart).catch(() => ({ completed: 0, planned: 0 }));
  // ED-safety, fail CLOSED: a transient flag read maps to the truthy
  // 'read_failed' sentinel (edFlagOpen: !!edFlag below), so the persisted
  // widget snapshot carries the suppressed bit on a read error. Calm mode is
  // read the same fail-closed way and ORed in, matching useWeeklyStreak's
  // suppression of the run number on the in-app surfaces.
  const edFlag = await getOpenEdPatternFlag(userId).catch(() => 'read_failed');
  const wellbeing = await AsyncStorage.getItem(WELLBEING_KEY)
    .then((v) => v || 'unspecified').catch(() => 'read_failed');
  const planned = (Array.isArray(routines) && routines.length) ? routines.length : (stats?.planned ?? 0);

  // T1 (comprehension-trust audit 2026-08-06): streakWeeks was a hardcoded 0,
  // so the widget's promised streak line could never render. The widget does
  // NOT re-derive the run (forking useWeeklyStreak's rules -- plan target,
  // manual goal, pauses, deloads, repairs -- is exactly the cross-surface
  // divergence this audit exists to kill). It mirrors the persisted
  // high-water instead: the run the user was actually SHOWN this week,
  // written by the real computation. Until the run is seen in-app this week
  // the widget shows its sessions fallback rather than a stale prior-week
  // number that a lapse could have invalidated.
  const streakState = await loadStreakState(userId).catch(() => null);
  const shownRun = streakState?.highWater?.[String(weekStart)] ?? 0;

  return {
    nextSession,
    consistency: { completed: stats?.completed ?? 0, planned, streakWeeks: shownRun },
    edFlagOpen: !!edFlag || wellbeing === 'read_failed' || isCalm(wellbeing),
  };
}

/**
 * Gather, build and persist the widget snapshot. Best-effort: never throws.
 * Returns the snapshot that was written (useful for tests / callers).
 */
export async function writeWidgetSnapshot(userId) {
  try {
    const inputs = await gatherWidgetInputs(userId);
    const snapshot = inputs ? buildWidgetSnapshot(inputs) : emptyWidgetSnapshot();
    await persistWidgetSnapshot(snapshot);
    return snapshot;
  } catch (_) {
    const fallback = emptyWidgetSnapshot();
    try { await persistWidgetSnapshot(fallback); } catch (_e) { /* no-op */ }
    return fallback;
  }
}
