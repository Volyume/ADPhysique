/**
 * The Today intro card's re-offer rule (founder order 2026-09-22, item 2;
 * audit A-04, docs/audit/community-audit-2026-09-22/
 * A-adoption-visibility-look-copy.md): a dismissal ("Have a look" or "Not
 * now") used to retire HomeCommunityIntroCard for good. It now retires
 * the card only FOR NOW; a person who still has no Community profile
 * sees it exactly once more, after five further completed sessions. The
 * second dismissal (either button) is final.
 *
 * Pure decision logic only -- HomeScreen.js owns reading and writing the
 * stored value and every other gate (totalSessions > 0, hasProfile,
 * shownBannerKey).
 */

/** How many further completed sessions after a first dismissal before
 * the card is offered again. */
export const INTRO_REOFFER_SESSIONS = 5;

/** The second dismissal is final; no count beyond this is ever stored
 * or checked. */
export const INTRO_DISMISSAL_MAX_COUNT = 2;

/**
 * Parse the stored dismissal value.
 *
 * `null`/absent (nothing stored yet) reads as never dismissed. The
 * legacy literal string 'true' -- every device before this change wrote
 * exactly this and nothing else -- reads as one dismissal with no
 * recorded session count (`sessionsAtDismiss: 0`), so an existing,
 * already-active dismisser clears the five-session bar on their own
 * history rather than being made to log five MORE sessions than they
 * already have.
 *
 * @param {string|null|undefined} raw the stored AsyncStorage value
 * @returns {{count: number, sessionsAtDismiss: number}|null}
 */
export function parseIntroDismissal(raw) {
  if (raw == null) return null;
  if (raw === 'true') return { count: 1, sessionsAtDismiss: 0 };
  try {
    const parsed = JSON.parse(raw);
    const count = Number(parsed?.count);
    if (!Number.isFinite(count) || count < 1) return null;
    const sessionsAtDismiss = Number(parsed?.sessionsAtDismiss);
    return {
      count: Math.trunc(count),
      sessionsAtDismiss: Number.isFinite(sessionsAtDismiss) ? Math.max(0, Math.trunc(sessionsAtDismiss)) : 0,
    };
  } catch (_e) {
    return null; // corrupt storage reads as never dismissed -- shown once, harmless
  }
}

/**
 * The next stored value after a dismissal (either button fires this the
 * same way -- the spec draws no distinction between "Have a look" and
 * "Not now" for the re-offer count). Pure.
 *
 * @param {{count: number, sessionsAtDismiss: number}|null} previous
 * @param {number} totalSessions completed sessions at the moment of THIS dismissal
 * @returns {{count: number, sessionsAtDismiss: number}}
 */
export function nextIntroDismissal(previous, totalSessions) {
  const count = Math.min(INTRO_DISMISSAL_MAX_COUNT, (previous?.count ?? 0) + 1);
  return { count, sessionsAtDismiss: Math.max(0, Number(totalSessions) || 0) };
}

/**
 * Should the intro card be hidden right now, given the stored dismissal
 * state and the person's CURRENT completed-session count? Pure --
 * HomeScreen.js still applies its own totalSessions > 0 / hasProfile /
 * banner-slot gates on top of this.
 *
 * @param {{count: number, sessionsAtDismiss: number}|null} dismissal
 * @param {number} totalSessions
 * @returns {boolean}
 */
export function isIntroDismissedNow(dismissal, totalSessions) {
  if (!dismissal) return false; // never dismissed: this rule hides nothing
  if (dismissal.count >= INTRO_DISMISSAL_MAX_COUNT) return true; // second dismissal is final
  const n = Number(totalSessions) || 0;
  return n < dismissal.sessionsAtDismiss + INTRO_REOFFER_SESSIONS;
}
