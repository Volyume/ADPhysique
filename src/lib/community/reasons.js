/**
 * Reason vocabulary for Find people (discovery blueprint; SD-24: reasons,
 * never percentages or distances between people).
 *
 * Most of `community_find_people`'s reasons already arrive as complete
 * display copy ("Trains at PureGym Leeds", "Also trains powerlifting"):
 * the server built the sentence, and this module leaves it exactly as
 * it stands. Migration 163 (spec 1.1 C) adds four reasons that arrive as
 * FIXED TOKENS instead of copy, because either the wording is the same
 * for every row (`same_age_band`, `near_place`, `within_25_miles`) or it
 * needs a value the row's own card already carries (`same_place`, which
 * needs the place name). This is the one place a token becomes the
 * sentence a person reads.
 *
 * `same_place`'s label reads the ROW's own `place_label` (falling back to
 * `area_label`, matching the place chip in `ProfileCard`): the two
 * people share a place by definition when this reason is present, so the
 * candidate's own label is the caller's label too, and no extra `me`
 * payload needs to travel here to say it.
 */

/** Reasons whose copy never changes row to row. */
export const REASON_TOKENS = Object.freeze({
  same_age_band: 'Same age band',
  near_place: 'Near you',
  within_25_miles: 'Within 25 miles',
});

/**
 * One reason, as read copy. Anything that is not a known token already
 * IS copy (the majority of reasons) and passes through unchanged, which
 * is what keeps this safe to run over every existing reason string too.
 *
 * @param {string} reason
 * @param {{place_label?: string, area_label?: string}} [card] the row
 *   this reason belongs to, for `same_place` only
 * @returns {string}
 */
export function reasonCopy(reason, card = null) {
  if (reason === 'same_place') {
    const place = card?.place_label || card?.area_label || null;
    return place ? `In ${place}` : 'In your place';
  }
  if (REASON_TOKENS[reason]) return REASON_TOKENS[reason];
  return reason;
}

/**
 * A row's whole `reasons` array, ready to render.
 *
 * @param {string[]} reasons
 * @param {object} [card]
 * @returns {string[]}
 */
export function reasonLines(reasons, card = null) {
  return (Array.isArray(reasons) ? reasons : []).map((reason) => reasonCopy(reason, card));
}
