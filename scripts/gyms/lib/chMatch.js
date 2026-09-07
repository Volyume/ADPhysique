// GD-20 Companies House corroboration matching, pure, no I/O. Tightened
// from "postcode unit alone" (which let a golf club 'corroborate' a yoga
// studio at the same postcode unit in the first pipeline run) to postcode
// unit AND name similarity: the folded company name (legal suffixes and
// generic gym-domain tokens removed) must share at least two tokens with
// the venue name, or reach a token-Jaccard of 0.5 or above.

const { foldText, tokenize, tokenJaccard } = require('./fold');

// Legal-form suffixes (Companies House company names always carry one) and
// generic gym-domain tokens that would otherwise inflate every comparison
// ("... Fitness Limited" vs "... Gym Ltd" sharing only generic words).
const LEGAL_AND_GENERIC_TOKENS = new Set([
  'limited',
  'ltd',
  'plc',
  'llp',
  'uk',
  'gb',
  'gym',
  'gyms',
  'fitness',
  'health',
  'club',
  'clubs',
  'centre',
  'center',
]);

/**
 * Fold a company or venue name and drop legal-suffix / generic-domain
 * tokens, leaving only the distinctive tokens used for similarity.
 * @param {string} name
 * @returns {string[]}
 */
function foldCompanyName(name) {
  return tokenize(name).filter((t) => !LEGAL_AND_GENERIC_TOKENS.has(t));
}

/**
 * GD-20: does this Companies House candidate name corroborate this venue
 * name? Postcode-unit matching is the caller's job (it blocks candidates
 * before calling this); this only judges name similarity.
 * @param {string} companyName
 * @param {string} venueName
 * @returns {{ matches: boolean, sharedTokenCount: number, jaccard: number }}
 */
function companyNameMatchesVenue(companyName, venueName) {
  const companyTokens = foldCompanyName(companyName);
  const venueTokens = foldCompanyName(venueName);

  const venueSet = new Set(venueTokens);
  const sharedTokenCount = companyTokens.reduce((n, t) => (venueSet.has(t) ? n + 1 : n), 0);
  const jaccard = tokenJaccard(companyTokens, venueTokens);

  return { matches: sharedTokenCount >= 2 || jaccard >= 0.5, sharedTokenCount, jaccard };
}

module.exports = { foldCompanyName, companyNameMatchesVenue, LEGAL_AND_GENERIC_TOKENS, foldText };
