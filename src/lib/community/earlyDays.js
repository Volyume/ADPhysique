/**
 * The honest early-days state (communities revamp, `26-EARLY-DAYS-SPEC.md`,
 * CR-16 / D162): a brand-new Community with one real member must read as
 * new and inviting, never as empty, and never with anyone in it who is not
 * real. Pure helpers only; the screens own the fetching and rendering.
 */

import { profileUrl } from './links';

/**
 * The founder's real Community handle: the one person shown as the host on
 * the Hub while a reader is not yet following them. A constant, not a
 * server flag: "Built Volyume" is a fact about this handle, and a change
 * of handle is a change here.
 */
export const COMMUNITY_HOST_HANDLE = 'allan';

/**
 * The same person by user id (review fix 8): a handle can be released and
 * claimed by someone else after the 30-day cooldown, and the row must
 * never present a stranger as the app's author. Both must match.
 */
export const COMMUNITY_HOST_USER_ID = 'c1af4878-6dac-4d66-9318-537544913f99';

/**
 * The invite a member sends from their own device (spec 1.5): their own
 * profile link, which opens the app when installed and the profile page
 * with both store buttons when not, and their gym when they have one.
 * Nothing else about the member travels.
 *
 * @param {{handle?: string|null, gymLabel?: string|null}} args
 * @returns {string}
 */
export function inviteMessage({ handle, gymLabel } = {}) {
  const link = profileUrl(String(handle ?? '').trim().toLowerCase());
  const gym = typeof gymLabel === 'string' ? gymLabel.trim() : '';
  return gym ? `Join me on Volyume. I train at ${gym}. ${link}` : `Join me on Volyume. ${link}`;
}

/** The invite action's label (spec 1.1, 1.4). */
export function inviteLabel({ gymLabel = null, ownGymPage = false } = {}) {
  const gym = typeof gymLabel === 'string' ? gymLabel.trim() : '';
  if (ownGymPage && gym) return `Invite someone from ${gym}`;
  return gym ? 'Invite a gym mate' : 'Invite a training partner';
}

/** The Hub PEOPLE zero-state line (spec 1.1). */
export function firstHereLine(gymLabel) {
  const gym = typeof gymLabel === 'string' ? gymLabel.trim() : '';
  return gym ? `You are the first here from ${gym}.` : 'You are one of the first here.';
}

/**
 * Does the reader belong to this cohort (spec 1.6)? `community_dimension`
 * counts everyone but the caller, so the page needs to know whether to
 * say "You and N others". Anything it cannot establish is false, which
 * leaves the line exactly as it was.
 */
export function isOwnCohort({
  kind, key, me, venueId = null, ownGymByLabel = false, label = null,
} = {}) {
  const profile = me?.profile ?? null;
  if (!profile) return false;
  const k = String(key ?? '');
  const l = typeof label === 'string' ? label.trim() : '';
  switch (kind) {
    case 'gym': {
      if (ownGymByLabel) return true;
      if (!venueId) return false;
      if (profile.gym_id && String(profile.gym_id) === String(venueId)) return true;
      const others = Array.isArray(profile.other_gym_ids) ? profile.other_gym_ids : [];
      return others.some((id) => String(id) === String(venueId));
    }
    case 'discipline': {
      const keys = Array.isArray(profile.discipline_keys) ? profile.discipline_keys : [];
      return keys.includes(k);
    }
    case 'age_band':
      return !!me?.tp_age_band && String(me.tp_age_band) === k;
    case 'area':
      // The profile card carries labels, not keys (`_community_profile_card`:
      // area_label, place_label), so the page's label is the match the
      // screen can make, the same precedent as the gym's own-label match.
      return (!!profile.area_key && String(profile.area_key) === k)
        || (!!profile.place_key && String(profile.place_key) === k)
        || (!!l && typeof profile.area_label === 'string' && profile.area_label.trim() === l)
        || (!!l && typeof profile.place_label === 'string' && profile.place_label.trim() === l);
    default:
      return false;
  }
}

/**
 * The cohort page's label line (spec 1.3). `others` is the server count,
 * which excludes the caller; `own` says whether the caller belongs.
 *
 * @param {{own: boolean, others: number, rosterMode: boolean, trainedToday: number}} args
 * @returns {string}
 */
export function cohortCountLine({ own, others, rosterMode = false, trainedToday = 0 } = {}) {
  const n = Math.max(0, Number(others) || 0);
  const k = Math.max(0, Number(trainedToday) || 0);
  if (!own) {
    const base = `${n} ${n === 1 ? 'member' : 'members'}`;
    return rosterMode ? `${base} · ${k} trained today` : base;
  }
  if (n === 0) return 'Just you so far';
  const base = `You and ${n} ${n === 1 ? 'other' : 'others'}`;
  return rosterMode ? `${base} · ${k} trained today` : base;
}

/**
 * Should the HOST row show (spec 1.2)? Only for a reader who is not the
 * host, is not following (or waiting on) them, and has no block or mute
 * either way; and only when the card is viewable at all.
 */
export function hostRowVisible({ card, viewable = true, uid } = {}) {
  if (!card || viewable === false) return false;
  if (!card.user_id || !uid || String(card.user_id) === String(uid)) return false;
  // The handle AND the user id must be the founder's (review fix 8).
  if (String(card.user_id) !== COMMUNITY_HOST_USER_ID) return false;
  if (String(card.handle ?? '').toLowerCase() !== COMMUNITY_HOST_HANDLE) return false;
  const rel = card.relationship ?? {};
  if (rel.blocked || rel.muted) return false;
  // `relationship.following` is the connection vocabulary of
  // `_community_profile_card`: 'none' | 'requested' | 'accepted'
  // (production, 2026-09-13: a fresh follow of a public profile reads
  // 'accepted'). Anything but an explicit "none" is a relationship that
  // already exists, so the row must go.
  const following = rel.following;
  if (following === undefined || following === null || following === false || following === 'none') return true;
  return false;
}

/** The HOST row's caption (spec 1.2). */
export function hostCaption(card) {
  const gym = card?.show_gym === false ? '' : String(card?.gym_label ?? '').trim();
  return gym ? `Built Volyume · ${gym}` : 'Built Volyume';
}
