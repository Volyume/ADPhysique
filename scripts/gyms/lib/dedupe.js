// GD-06 deduplication scoring, exactly as specified in the blueprint. Pure,
// no I/O. Blocking (which pairs are even compared) lives in dedupe.mjs;
// this module only scores a candidate pair and applies the merge/review/
// distinct thresholds.

const { foldText, tokenize, stripBrandFromTokens, tokenJaccard } = require('./fold');
const { haversineMetres } = require('./geo');
const { postcodeUnit } = require('./postcode');
const { aliasTokenSetsFor } = require('./brands');

const MERGE_THRESHOLD = 5;
const REVIEW_THRESHOLD = 3;

// GD-22: "the town token is excluded from the name Jaccard" — a record's
// own town tokens never count towards (or against) name similarity, so
// e.g. two different independent gyms that both happen to be in
// "Motherwell" don't pick up a spurious name match on the town word alone.
function nameTokensExcludingTown(tokens, record) {
  const townTokens = new Set(tokenize(record.town || ''));
  if (townTokens.size === 0) return tokens;
  return tokens.filter((t) => !townTokens.has(t));
}

// GD-22: "Brand tokens are stripped only when both sides carry the same
// brand" — a lone side's brand is never stripped on its own (that would
// let e.g. "PureGym" vs "Motherwell Gym" compare on "Motherwell"/"Gym"
// alone and over-match). `stripBothBrand` is true only when the caller has
// already checked both records share the same brand key.
function nameTokensForCompare(record, { stripBothBrand = false } = {}) {
  const raw = record.name || record.display_name || '';
  let tokens = tokenize(raw);
  if (stripBothBrand && record.brand && record.brand.key) {
    tokens = stripBrandFromTokens(tokens, aliasTokenSetsFor(record.brand.key));
  }
  return nameTokensExcludingTown(tokens, record);
}

function parseStreetNumberAndName(addressLine) {
  if (!addressLine) return null;
  const folded = foldText(addressLine);
  const match = folded.match(/^(\d+[a-z]?)\s+(.+)$/);
  if (!match) return { number: null, street: folded };
  return { number: match[1], street: match[2] };
}

function websiteHost(url) {
  if (!url) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const host = new URL(withProtocol).hostname.toLowerCase();
    return host.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function normalisedPhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 7) return null;
  // Compare on the last 10 digits so a leading "0" vs "+44" doesn't break
  // an otherwise-identical number.
  return digits.slice(-10);
}

/**
 * Score a candidate pair of common records against GD-06.
 * @param {object} a
 * @param {object} b
 * @returns {{ score: number, reasons: string[], distanceM: number|null, forceDistinct: boolean }}
 */
function scorePair(a, b) {
  const reasons = [];
  let score = 0;

  const brandA = a.brand && a.brand.key;
  const brandB = b.brand && b.brand.key;
  const sameBrand = Boolean(brandA && brandB && brandA === brandB);
  if (sameBrand) {
    score += 3;
    reasons.push('same_brand:+3');
  }

  const tokensA = nameTokensForCompare(a, { stripBothBrand: sameBrand });
  const tokensB = nameTokensForCompare(b, { stripBothBrand: sameBrand });
  // GD-22: "a single-token name never earns name points on its own" — this
  // is the "Moorgate" vs "THIRD SPACE (MOORGATE)" defect from the first
  // pipeline run, where a single shared token gave a full name-match score.
  const singleTokenGuard = tokensA.length <= 1 || tokensB.length <= 1;
  const jaccard = tokenJaccard(tokensA, tokensB);
  if (singleTokenGuard) {
    // no name points awarded either way
  } else if (jaccard >= 0.85) {
    score += 3;
    reasons.push(`name_jaccard_high(${jaccard.toFixed(2)}):+3`);
  } else if (jaccard >= 0.6) {
    score += 1;
    reasons.push(`name_jaccard_mid(${jaccard.toFixed(2)}):+1`);
  }

  const pcA = postcodeUnit(a.postcode);
  const pcB = postcodeUnit(b.postcode);
  if (pcA && pcB && pcA === pcB) {
    score += 2;
    reasons.push('same_postcode_unit:+2');
  }

  const streetA = parseStreetNumberAndName(a.address_line);
  const streetB = parseStreetNumberAndName(b.address_line);
  let sameAddress = false;
  if (streetA && streetB && streetA.number && streetB.number) {
    if (streetA.number === streetB.number && streetA.street === streetB.street) {
      score += 2;
      reasons.push('same_street_number_and_name:+2');
      sameAddress = true;
    }
  } else if (streetA && streetB && streetA.street && streetA.street === streetB.street) {
    sameAddress = pcA && pcB && pcA === pcB;
  }

  let distanceM = null;
  if (Number.isFinite(a.lat) && Number.isFinite(a.lng) && Number.isFinite(b.lat) && Number.isFinite(b.lng)) {
    distanceM = haversineMetres(a.lat, a.lng, b.lat, b.lng);
    if (distanceM <= 100) {
      score += 2;
      reasons.push(`within_100m(${distanceM.toFixed(0)}m):+2`);
    } else if (distanceM <= 150) {
      score += 1;
      reasons.push(`within_150m(${distanceM.toFixed(0)}m):+1`);
    }
  }

  const phoneA = normalisedPhone(a.phone);
  const phoneB = normalisedPhone(b.phone);
  if (phoneA && phoneB && phoneA === phoneB) {
    score += 2;
    reasons.push('same_phone:+2');
  }

  const hostA = websiteHost(a.website);
  const hostB = websiteHost(b.website);
  if (hostA && hostB && hostA === hostB) {
    score += 2;
    reasons.push('same_website_host:+2');
  }

  // GD-19: "Two records carrying different known brands never merge (hard
  // veto)." This supersedes the original GD-06 "within 30m" scoping — the
  // first pipeline run's dedup gave name/postcode/distance points enough to
  // clear the merge threshold for two clearly different chains further
  // apart than 30m, so the veto is now unconditional on distance. The
  // identical-address exception stays a parent/child case, handled by the
  // caller (dedupe.mjs) BEFORE scorePair/decide are consulted for a merge
  // decision at all — sameAddress is reported here only for that caller.
  let forceDistinct = false;
  if (brandA && brandB && brandA !== brandB && !sameAddress) {
    forceDistinct = true;
    reasons.push('different_known_brands:force_distinct');
  }

  return { score, reasons, distanceM, forceDistinct, sameAddress };
}

/**
 * Apply the GD-06 thresholds to a scored pair.
 * @param {ReturnType<typeof scorePair>} scored
 * @returns {'merge'|'review'|'distinct'}
 */
function decide(scored) {
  if (scored.forceDistinct) return 'distinct';
  if (scored.score >= MERGE_THRESHOLD) return 'merge';
  if (scored.score >= REVIEW_THRESHOLD) return 'review';
  return 'distinct';
}

// GD-23: split the review band into a moderator queue ("likely" — a name,
// phone or website signal contributed) and a queue no person is asked to
// work ("weak" — the pair only shares postcode/street/distance proximity,
// e.g. two different businesses in the same building).
const NAME_PHONE_WEBSITE_REASON_RE = /^(name_jaccard_(high|mid)|same_phone|same_website_host)/;

/**
 * @param {string[]} reasons - a scored pair's `reasons` array
 * @returns {'likely'|'weak'}
 */
function reviewTier(reasons) {
  const hasSignal = (reasons || []).some((r) => NAME_PHONE_WEBSITE_REASON_RE.test(r));
  return hasSignal ? 'likely' : 'weak';
}

module.exports = {
  scorePair,
  decide,
  reviewTier,
  nameTokensForCompare,
  parseStreetNumberAndName,
  websiteHost,
  normalisedPhone,
  MERGE_THRESHOLD,
  REVIEW_THRESHOLD,
};
