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
 *
 * CR-14 (`docs/communities-revamp-2026-09-10/24-PHASE4-SPEC.md`): the
 * snapshot also carries an optional `friends` block, a same-day COUNT of
 * followed people who trained today. Presence, never a person: no handle,
 * name, avatar, gym or anything that identifies who, and no line at all
 * unless the count is 1 or more for today. Suppressed under the same calm
 * mode / open ED flag rule as the consistency block above.
 */

export const WIDGET_SNAPSHOT_VERSION = 1;

function clampInt(n) {
  return Math.max(0, Math.min(9999, Math.round(Number(n) || 0)));
}

function trim(s, max) {
  return s == null ? null : String(s).trim().slice(0, max) || null;
}

// CR-14 (`docs/communities-revamp-2026-09-10/24-PHASE4-SPEC.md` section 2):
// the friends block's own `dayKey` must be a real YYYY-MM-DD key, the same
// format `todayLocalKey()` (src/lib/dayKey.js) produces, so a malformed
// cache entry can never reach the renderers.
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Build the versioned widget snapshot from already-shaped inputs. Pure.
 *
 * @param {object}  input
 * @param {?object} input.nextSession  { name, dayLabel?, weekInBlock?: {week,total} } | null
 * @param {?object} input.consistency  { completed, planned } | null
 * @param {?object} input.friends      { dayKey, count } | null (CR-14: a
 *   same-day count of followed people who trained today, never a person --
 *   source: src/lib/widgets/friends.js)
 * @param {boolean} input.edFlagOpen   true => suppress the consistency AND
 *   friends blocks entirely (spec section 1 rule 4: the same social-
 *   comparison suppression as calm mode / an open ED flag applies everywhere)
 * @param {number}  input.now          epoch ms stamped onto the snapshot
 * @returns {{ v:number, nextSession:?object, consistency:?object, friends:?object, computedAt:number }}
 */
export function buildWidgetSnapshot({
  nextSession = null, consistency = null, friends = null, edFlagOpen = false, now = Date.now(),
} = {}) {
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
  // C6 RD6-9 (D97-25): with no plan-derived denominator the block
  // renders the plain session count instead of presenting a trailing
  // average as a plan ("N of M").
  const cons = (!edFlagOpen
    && consistency
    && Number.isFinite(consistency.completed))
    ? (Number.isFinite(consistency.planned) && consistency.planned > 0
      ? {
        completed: clampInt(consistency.completed),
        planned: clampInt(consistency.planned),
        label: `${clampInt(consistency.completed)} of ${clampInt(consistency.planned)} sessions this week`,
      }
      : {
        completed: clampInt(consistency.completed),
        planned: null,
        label: `${clampInt(consistency.completed)} session${clampInt(consistency.completed) === 1 ? '' : 's'} this week`,
      })
    : null;

  // CR-14 (spec section 1 rules 1, 3, 4, 5): presence, never absence -- a
  // count only appears for TODAY, with a real (>=1) figure, and never
  // under calm mode / an open ED flag. `friends` carries exactly
  // `dayKey`, `count` and `label`: never a name, handle or avatar (the
  // caller already reduced its input to a bare count before it gets here).
  const friendsDayKeyOk = typeof friends?.dayKey === 'string' && DAY_KEY_RE.test(friends.dayKey);
  const friendsCount = friendsDayKeyOk ? clampInt(friends.count) : 0;
  const fr = (!edFlagOpen && friendsDayKeyOk && friendsCount >= 1)
    ? {
      dayKey: friends.dayKey,
      count: friendsCount,
      label: friendsCount === 1 ? '1 friend trained today' : `${friendsCount} friends trained today`,
    }
    : null;

  return {
    v: WIDGET_SNAPSHOT_VERSION,
    nextSession: ns,
    consistency: cons,
    friends: fr,
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
