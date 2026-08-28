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
      // Stage 1 (2026-08-09): a finished block awaiting the user's next-block
      // decision must not claim a live week on the home screen.
      weekInBlock: (mesoWeek && !mesoWeek.awaitingDecision && Number.isFinite(mesoWeek.weekIndex) && Number.isFinite(mesoWeek.plannedWeeks))
        ? { week: mesoWeek.weekIndex, total: mesoWeek.plannedWeeks }
        : null,
    };
  }

  const weekStart = localWeekStartMs(Date.now());
  // D112 R2 (closes audit T2-16): a read failure honestly reports itself as
  // an estimate too (never a bare zero presented as a real denominator) -
  // see plannedIsEstimate below.
  const stats = await getWeeklySessionStats(userId, weekStart)
    .catch(() => ({ completed: 0, planned: 0, plannedIsEstimate: true }));
  // ED-safety, fail CLOSED: a transient flag read maps to the truthy
  // 'read_failed' sentinel (edFlagOpen: !!edFlag below), so the persisted
  // widget snapshot carries the suppressed bit on a read error. Calm mode is
  // read the same fail-closed way and ORed in, matching useWeeklyStreak's
  // suppression of the run number on the in-app surfaces.
  const edFlag = await getOpenEdPatternFlag(userId).catch(() => 'read_failed');
  const wellbeing = await AsyncStorage.getItem(WELLBEING_KEY)
    .then((v) => v || 'unspecified').catch(() => 'read_failed');
  // C6 RD6-9 (D97-25): with no active plan the stats fallback is a
  // trailing-average ESTIMATE, and the widget rendered it as "N of M
  // sessions this week" as though a plan prescribed M. No plan -> no
  // denominator; the widget falls to its honest plain-count mode.
  // D112 R2 (closes audit T2-16): the denominator itself is now the
  // EFFECTIVE planned figure (CC29, getWeeklySessionStats), not a raw
  // routine count - a constrained week whose plan cannot deliver every
  // session is no longer over-counted as planned. plannedIsEstimate keeps
  // RD6-9's contract: the trailing-average fallback still shows as no
  // denominator, never smuggled in as though a plan prescribed it.
  const planned = (!stats?.plannedIsEstimate && Number.isFinite(stats?.planned)) ? stats.planned : null;

  // Founder ruling (Today truth repair): the widget no longer carries a
  // weeks-running figure. The run/streak construct is rejected product-wide,
  // so there is nothing to mirror here any more; the widget publishes only
  // the factual session count for the week.
  return {
    nextSession,
    consistency: { completed: stats?.completed ?? 0, planned },
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
