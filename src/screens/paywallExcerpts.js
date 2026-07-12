/**
 * paywallExcerpts.js: COMP-007 Stage B: verified Play-review excerpts.
 *
 * Consumer: src/screens/ProUpgradeScreen.js (the single live upgrade
 * surface). Was previously consumed by PaywallScreen.js too; that orphaned
 * surface was deleted under C3/D71 (2026-07-11) and its excerpt card ported
 * onto ProUpgradeScreen, so this module survives with its test suite.
 *
 * Content, NOT billing logic, deliberately kept out of src/lib/payments/.
 * The paywall review block renders ONLY when this list is non-empty, so it
 * ships DARK today (empty array) and lights up via a content-only edit once
 * the honesty bar below is met. `EXCERPTS.length === 0` IS the feature flag,
 * no flag infrastructure.
 *
 * THE HONESTY CONTRACT (do not relax, these are absolute):
 *  1. SOURCE: only PUBLISHED Google Play reviews, read from Play Console
 *     (User feedback → Reviews). Never solicited copy, beta DMs, or paraphrase.
 *     Curation is manual + founder-approved; no runtime fetch (offline-first).
 *  2. VERBATIM: an excerpt may shorten (ellipsis) but never alter words, fix
 *     grammar, or splice sentences. Keep the reviewer's spelling.
 *  3. ATTRIBUTION: public first name / initial exactly as shown on Play, the
 *     literal source "Google Play", and month + year. No surnames, no invented
 *     demographics, no photos.
 *  4. RATING: the review's own stars (curate 5-star; a strong 4-star is fine
 *     later, show 4 then, never round up).
 *  5. RECENCY: retire anything older than 12 months; refresh quarterly.
 *  6. ED-SAFETY (absolute): NO excerpt that states weight lost, rate of loss,
 *     body measurements, appearance judgements, or "finally thin" sentiment.
 *     Eligible themes: the coach explaining itself, holds/safety behaviour,
 *     offline reliability, plan quality, "it refused to cut my calories" trust.
 *     Screened so they are safe for ALL users (incl. open wellbeing flags).
 *  7. REMOVAL: if a reviewer edits/deletes their review, drop it next refresh;
 *     if one objects, drop it next release.
 *
 * LAUNCH BAR: >= 3 usable excerpts (target 5 for rotation depth). Below 3, leave
 * the array empty, absence is the empty state, the block does not render.
 *
 * Shape per entry: { stars: 1..5, quote: string (<=~140 chars, verbatim),
 *                    name: string, source: 'Google Play', date: 'Mon YYYY' }
 */

export const PAYWALL_EXCERPTS = Object.freeze([
  // Intentionally empty until >= 3 real Play reviews pass the contract above.
  // Founder fills this from Play Console. Example SHAPE (not real content):
  //   { stars: 5, quote: 'It tells you why it changed your plan.', name: 'Chris', source: 'Google Play', date: 'Apr 2026' },
]);

/**
 * Deterministic daily pick (no randomness, stable within a session): rotates by
 * day-of-year so a returning user sees variety across days but never a flicker
 * within one visit. Returns null when the list is empty (block does not render).
 *
 * @param {Date} [now]
 */
export function pickPaywallExcerpt(now = new Date()) {
  const list = PAYWALL_EXCERPTS;
  if (!list.length) return null;
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - start) / 86400000);
  return list[dayOfYear % list.length];
}
