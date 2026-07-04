/**
 * COMP-019 Stage 2 — gather widget inputs and persist the snapshot (the thin,
 * OTA-patchable writer; the pure shaping lives in snapshot.js).
 *
 * Gathers from existing local reads ONLY (offline-first, no network):
 *   - next session: active plan + the @volyume_schedule_v1 training weekdays +
 *     getCurrentMesocycleWeek for the week-in-block chip.
 *   - consistency: this week's session count + the COMP-018 ED suppression rule.
 * Privacy: NEVER weight/calories/macros/body data — only a routine name + counts.
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
import { SCHEDULE_KEY } from '../notifications/trainingReminders';
import { buildWidgetSnapshot, emptyWidgetSnapshot } from './snapshot';
import { persistWidgetSnapshot } from './storage';

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// The next training weekday from today, as a human label. days = weekday
// indices (0=Sun..6=Sat); returns { dayLabel } or null when none scheduled.
export function nextTrainingDayLabel(days, now = new Date()) {
  if (!Array.isArray(days) || days.length === 0) return null;
  const set = new Set(days.map((d) => ((Number(d) % 7) + 7) % 7));
  const today = now.getDay();
  for (let offset = 0; offset < 7; offset++) {
    const d = (today + offset) % 7;
    if (set.has(d)) {
      if (offset === 0) return 'Today';
      if (offset === 1) return 'Tomorrow';
      return WEEKDAY[d];
    }
  }
  return null;
}

/** Gather the widget inputs from local storage. Exposed for unit tests. */
export async function gatherWidgetInputs(userId) {
  if (!userId) return null;

  let days = [];
  try {
    const raw = await AsyncStorage.getItem(SCHEDULE_KEY);
    if (raw) { const s = JSON.parse(raw); if (Array.isArray(s?.days)) days = s.days; }
  } catch (_) { /* no schedule */ }

  const plan = await getActivePlan(userId).catch(() => null);
  const routines = plan?.id ? await getRoutinesForPlan(plan.id).catch(() => []) : [];
  const mesoWeek = await getCurrentMesocycleWeek(userId).catch(() => null);

  let nextSession = null;
  if (plan?.id && Array.isArray(routines) && routines.length > 0) {
    nextSession = {
      // A routine/plan name only — never body data. v1 names the plan; per-day
      // routine rotation is a later refinement.
      name: routines[0]?.name || plan.name || 'Next session',
      dayLabel: nextTrainingDayLabel(days),
      weekInBlock: (mesoWeek && Number.isFinite(mesoWeek.weekIndex) && Number.isFinite(mesoWeek.plannedWeeks))
        ? { week: (mesoWeek.weekIndex ?? 0) + 1, total: mesoWeek.plannedWeeks }
        : null,
    };
  }

  const weekStart = localWeekStartMs(Date.now());
  const stats = await getWeeklySessionStats(userId, weekStart).catch(() => ({ completed: 0, planned: 0 }));
  // ED-safety, fail CLOSED: a transient flag read maps to the truthy
  // 'read_failed' sentinel (edFlagOpen: !!edFlag below), so the persisted
  // widget snapshot carries the suppressed bit on a read error.
  const edFlag = await getOpenEdPatternFlag(userId).catch(() => 'read_failed');
  const planned = (Array.isArray(routines) && routines.length) ? routines.length : (stats?.planned ?? 0);

  return {
    nextSession,
    consistency: { completed: stats?.completed ?? 0, planned, streakWeeks: 0 },
    edFlagOpen: !!edFlag,
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
