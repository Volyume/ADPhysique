/**
 * widgets/snapshot.js — COMP-019 Stage 2 widget data pipeline (the OTA brains).
 *
 * Home-screen widgets are dumb renderers: they read a small versioned JSON
 * snapshot from the shared app store, never the DB (blueprint §"Data pipeline").
 * Keeping ALL the logic here means widget content fixes ship OTA in this writer,
 * not in a native binary that needs a store release.
 *
 * Two widgets (blueprint §Stage 2):
 *   - Next session: routine name + planned day + week-in-block chip. Free tier.
 *   - Weekly consistency: "N of M sessions this week" + streak. Free tier;
 *     FULLY suppressed (the widget falls back to neutral next-session content)
 *     while a wellbeing/ED flag is open, inheriting COMP-018's rule.
 *
 * Privacy (binding): the home screen is semi-public, so the snapshot NEVER
 * carries weight, calories, macros or any body data — only a routine name and
 * session counts. Pure + deterministic: the builder takes already-shaped inputs
 * and a `now`, so it is fully unit-testable; the gather + persist live in the
 * thin writer below, behind a storage adapter that swaps to the native
 * App-Group / SharedPreferences bridge at EAS-build time (see writeWidgetSnapshot).
 */

export const WIDGET_SNAPSHOT_VERSION = 1;

function clampInt(n) {
  return Math.max(0, Math.min(9999, Math.round(Number(n) || 0)));
}

function trim(s, max) {
  return s == null ? null : String(s).trim().slice(0, max) || null;
}

/**
 * Build the versioned widget snapshot from already-shaped inputs. Pure.
 *
 * @param {object}  input
 * @param {?object} input.nextSession  { name, dayLabel?, weekInBlock?: {week,total} } | null
 * @param {?object} input.consistency  { completed, planned, streakWeeks? } | null
 * @param {boolean} input.edFlagOpen   true => suppress the consistency block entirely
 * @param {number}  input.now          epoch ms stamped onto the snapshot
 * @returns {{ v:number, nextSession:?object, consistency:?object, computedAt:number }}
 */
export function buildWidgetSnapshot({ nextSession = null, consistency = null, edFlagOpen = false, now = Date.now() } = {}) {
  const ns = nextSession && trim(nextSession.name, 40)
    ? {
      name: trim(nextSession.name, 40),
      dayLabel: trim(nextSession.dayLabel, 24),
      weekLabel:
        nextSession.weekInBlock
        && Number.isFinite(nextSession.weekInBlock.week)
        && Number.isFinite(nextSession.weekInBlock.total)
        && nextSession.weekInBlock.total > 0
          ? `Week ${clampInt(nextSession.weekInBlock.week)} of ${clampInt(nextSession.weekInBlock.total)}`
          : null,
    }
    : null;

  // Consistency is suppressed entirely under an open wellbeing/ED flag: the
  // widget renders the neutral next-session content instead (COMP-018 rule).
  const cons = (!edFlagOpen
    && consistency
    && Number.isFinite(consistency.completed)
    && Number.isFinite(consistency.planned))
    ? {
      completed: clampInt(consistency.completed),
      planned: clampInt(consistency.planned),
      streakWeeks: clampInt(consistency.streakWeeks),
      label: `${clampInt(consistency.completed)} of ${clampInt(consistency.planned)} sessions this week`,
    }
    : null;

  return {
    v: WIDGET_SNAPSHOT_VERSION,
    nextSession: ns,
    consistency: cons,
    computedAt: Number.isFinite(now) ? now : Date.now(),
  };
}

/**
 * The empty-state snapshot (no plan scheduled). The widget shows
 * "No plan scheduled. Build one in Plans." for a null nextSession.
 */
export function emptyWidgetSnapshot(now = Date.now()) {
  return buildWidgetSnapshot({ nextSession: null, consistency: null, now });
}
