/**
 * postcode.js (gym database blueprint `docs/gym-database-2026-09-06/
 * 20-BLUEPRINT.md`, "## App"; GD-09, GD-11).
 *
 * UK postcode recognition, pure and offline: no network, no ONSPD lookup
 * (that lives server-side, GD-08). This module only answers "does this
 * look like a postcode, and which part is the outward/district code",
 * which the search bar, the recognised-postcode chip and the gym
 * submission form all need on every keystroke.
 *
 * The outward code (area + district, e.g. "ML1", "SW1A", "EC1A") is
 * recognised on its own so a still-typing user ("ML1") gets the chip
 * before finishing the inward part; a full postcode additionally
 * recognises the inward code (a digit followed by two letters, e.g.
 * "1AA") and is normalised to the standard "OUTWARD INWARD" form.
 */

// Area: 1-2 letters. District: 1-2 digits, optionally followed by one
// letter (the London-style "W1A", "EC1A" districts). This is the outward
// half of the standard UK postcode format.
const OUTWARD_RE = /^[A-Z]{1,2}[0-9][A-Z0-9]?$/;

// A full postcode: the outward half above, directly followed (no space
// yet, spacing is normalised separately) by the inward code, a digit and
// two letters.
const FULL_RE = /^([A-Z]{1,2}[0-9][A-Z0-9]?)([0-9][A-Z]{2})$/;

function clean(text) {
  return String(text ?? '').toUpperCase().trim().replace(/\s+/g, ' ');
}

/**
 * Recognise a postcode or a partial (outward-only) postcode.
 *
 * @param {string} text
 * @returns {{kind: ('full'|'outward'|'none'), normalised: (string|null),
 *   outward: (string|null)}}
 */
export function recognisePostcode(text) {
  const c = clean(text);
  if (!c) return { kind: 'none', normalised: null, outward: null };
  const compact = c.replace(/\s+/g, '');
  const full = compact.match(FULL_RE);
  if (full) {
    return { kind: 'full', normalised: `${full[1]} ${full[2]}`, outward: full[1] };
  }
  if (OUTWARD_RE.test(compact)) {
    return { kind: 'outward', normalised: null, outward: compact };
  }
  return { kind: 'none', normalised: null, outward: null };
}

/** Does this look like a postcode, full or partial (e.g. "ML1")? */
export function isPostcodeLike(text) {
  return recognisePostcode(text).kind !== 'none';
}

/** Is this a complete, recognisable postcode (outward + inward)? */
export function isFullPostcode(text) {
  return recognisePostcode(text).kind === 'full';
}

/** "ml1 1aa" -> "ML1 1AA"; anything not a full postcode -> null. */
export function normalisePostcode(text) {
  return recognisePostcode(text).normalised;
}

/** The outward/district code, from either a full or a partial postcode;
 * null when the text is not postcode-like at all. */
export function outwardOf(text) {
  return recognisePostcode(text).outward;
}

/**
 * Find a postcode (full or outward) anywhere inside a longer phrase, e.g.
 * "gym near ML1" or "PureGym ML1 1AA". Tried as the trailing one or two
 * words, since a postcode is always typed at the end of that kind of
 * phrase and a fixed word never happens to look like one on its own here.
 *
 * @param {string} text
 * @returns {{kind: ('full'|'outward'|'none'), normalised: (string|null),
 *   outward: (string|null)}}
 */
export function extractPostcode(text) {
  const words = clean(text).split(' ').filter(Boolean);
  for (let len = Math.min(2, words.length); len >= 1; len -= 1) {
    const candidate = words.slice(words.length - len).join(' ');
    const hit = recognisePostcode(candidate);
    if (hit.kind !== 'none') return hit;
  }
  return { kind: 'none', normalised: null, outward: null };
}
