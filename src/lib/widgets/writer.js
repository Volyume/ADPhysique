/**
 * COMP-019 Stage 2 — gather widget inputs and persist the snapshot (the thin,
 * OTA-patchable writer; the pure shaping lives in snapshot.js).
 *
 * Gathers from existing local reads ONLY (offline-first, no network):
 *   - next session: active plan + getCurrentMesocycleWeek for the
 *     week-in-block chip.
 *   - consistency: this week's session count + the COMP-018 ED suppression rule.
 *   - friends (CR-14): the small local cache friends.js maintains, included
 *     only when it is for TODAY.
 * Privacy: NEVER weight/calories/macros/body data: only a routine name,
 * counts, and (CR-14) a same-day count of friends who trained today.
 *
 * The snapshot's dayLabel is always null (founder ruling 2026-08-03: the
 * product has no scheduled training days; @volyume_schedule_v1 is a habit
 * inference sanctioned only for soft reminder copy — D17. See
 * docs/audit/cross-surface-consistency-audit-2026-07-30.md).
 *
 * Triggered (no polling) on: workout finish (ActiveWorkoutScreen.js), a
 * history change (WorkoutHistoryScreen.js), app backgrounding (App.js's
 * AppState effect), and the periodic background-fetch task (App.js's
 * VOLYUME_DAILY_SYNC, CR-14) as a once/twice-a-day safety net for a widget
 * left untouched. Since CR-14, every trigger also runs a second, best-effort
 * network stage that refreshes the friends count (see writeWidgetSnapshot).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getActivePlan, getRoutinesForPlan, getCurrentMesocycleWeek,
  getWeeklySessionStats, getOpenEdPatternFlag,
} from '../database';
import { localWeekStartMs, todayLocalKey } from '../dayKey';
import { isCalm, WELLBEING_KEY } from '../wellbeing';
import { buildWidgetSnapshot, emptyWidgetSnapshot } from './snapshot';
import { persistWidgetSnapshot } from './storage';
import { readCachedFriends, fetchFriendsTrainedToday } from './friends';

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

  // CR-14 (24-PHASE4-SPEC.md section 1 rule 6): offline-first stays intact
  // -- this is a local cache read only, never the network. Included only
  // when the cache is for TODAY, so a widget left untouched overnight never
  // shows yesterday's count as today's; the network refresh that KEEPS this
  // cache current is a separate, best-effort stage in writeWidgetSnapshot.
  const cachedFriends = await readCachedFriends(userId);
  const friends = (cachedFriends && cachedFriends.dayKey === todayLocalKey())
    ? { dayKey: cachedFriends.dayKey, count: cachedFriends.count }
    : null;

  // Founder ruling (Today truth repair): the widget no longer carries a
  // weeks-running figure. The run/streak construct is rejected product-wide,
  // so there is nothing to mirror here any more; the widget publishes only
  // the factual session count for the week.
  return {
    nextSession,
    consistency: { completed: stats?.completed ?? 0, planned },
    friends,
    // Review 2026-09-11 finding 6a: the second stage below reads this to
    // skip a network call while today's count is fresh enough.
    friendsFetchedAt: (cachedFriends && cachedFriends.dayKey === todayLocalKey())
      ? cachedFriends.fetchedAt
      : null,
    edFlagOpen: !!edFlag || wellbeing === 'read_failed' || isCalm(wellbeing),
  };
}

// Review 2026-09-11 finding 6a: how long today's fetched count is trusted
// before the writer asks the board again. Backgrounding is the most
// frequent trigger, and community_board is rate-railed per call, so
// ordinary app-switching must not spend that budget on a number that
// changes a handful of times a day. Fifteen minutes, the same window the
// message push collapse uses.
export const FRIENDS_REFRESH_MIN_MS = 15 * 60 * 1000;

// Review 2026-09-11 finding 6b: writes are serialised. Two overlapping
// calls (a workout finish followed by a backgrounding) each gathered their
// own inputs before the network wait, and whichever resolved LAST won, so
// an older local session count could be persisted over a newer one. Each
// call now runs after the previous one has fully settled and gathers
// fresh inputs of its own; a failed run never blocks the next.
let writeChain = Promise.resolve();

/**
 * Gather, build and persist the widget snapshot. Best-effort: never throws.
 * Returns the LAST snapshot written (useful for tests / callers).
 *
 * @param {string} userId
 * @param {{refreshFriends?: boolean}} [opts] CR-14: `refreshFriends`
 *   (default true) runs the second stage below; pass false to skip it.
 */
export function writeWidgetSnapshot(userId, { refreshFriends = true } = {}) {
  const run = writeChain.then(() => writeWidgetSnapshotNow(userId, { refreshFriends }));
  writeChain = run.catch(() => {});
  return run;
}

async function writeWidgetSnapshotNow(userId, { refreshFriends = true } = {}) {
  let inputs = null;
  let snapshot;
  try {
    inputs = await gatherWidgetInputs(userId);
    snapshot = inputs ? buildWidgetSnapshot(inputs) : emptyWidgetSnapshot();
    await persistWidgetSnapshot(snapshot);
  } catch (_) {
    inputs = null;
    snapshot = emptyWidgetSnapshot();
    try { await persistWidgetSnapshot(snapshot); } catch (_e) { /* no-op */ }
  }

  // CR-14 second stage (24-PHASE4-SPEC.md section 1 rule 6): a separate,
  // best-effort network refresh of the friends count. The snapshot above is
  // already written with whatever was locally cached, so offline-first
  // stays intact; this only rebuilds and re-persists when the freshly
  // fetched count differs from what that first snapshot carried, reusing
  // the SAME local inputs (never a second, possibly different, gather).
  // Lead review 2026-09-11: never under calm mode or an open ED flag. The
  // count is withheld there (spec rule 4), so the call would buy nothing,
  // and the phase 2 cohort pages set the pattern: no fetch under the gate.
  const fetchedRecently = Number.isFinite(inputs?.friendsFetchedAt)
    && (Date.now() - inputs.friendsFetchedAt) < FRIENDS_REFRESH_MIN_MS;
  if (refreshFriends && inputs && !inputs.edFlagOpen && !fetchedRecently) {
    try {
      const fetched = await fetchFriendsTrainedToday(userId);
      const fetchedCount = fetched ? fetched.count : null;
      const priorCount = snapshot?.friends ? snapshot.friends.count : null;
      if (fetched && fetchedCount !== priorCount) {
        const rebuilt = buildWidgetSnapshot({
          ...inputs,
          friends: { dayKey: fetched.dayKey, count: fetched.count },
        });
        await persistWidgetSnapshot(rebuilt);
        snapshot = rebuilt;
      }
    } catch (_) {
      // Best-effort: offline, no profile, a CommunityError of any code --
      // the first snapshot above already stands. Nothing logged at error
      // level (friends.js / transport.js already classify what matters).
    }
  }

  return snapshot;
}
