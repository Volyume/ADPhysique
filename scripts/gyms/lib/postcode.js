// UK postcode recognition and normalisation. Pure, no I/O.
// Covers the standard shape, the GIR 0AA special case, and the BFPO shape.

// Standard UK postcode (GOV.UK-style pattern), case-insensitive, with an
// optional single space between outward and inward codes.
const STANDARD_POSTCODE_RE =
  /^(GIR\s?0AA|(([A-Z][0-9]{1,2})|([A-Z][A-HJ-Y][0-9]{1,2})|([A-Z][0-9][A-Z])|([A-Z][A-HJ-Y][0-9][A-Z]?))\s?[0-9][A-Z]{2})$/i;

// BFPO (British Forces Post Office) — either the legacy "BFPO" + 1-4 digits
// shape, or a standard-looking postcode with a "BF1" style outward code
// (already matched by STANDARD_POSTCODE_RE above).
const BFPO_LEGACY_RE = /^BFPO\s?[0-9]{1,4}$/i;

/**
 * @param {string} raw
 * @returns {boolean}
 */
function isValidPostcode(raw) {
  return normalisePostcode(raw) !== null;
}

/**
 * Normalise a UK postcode to "OUTWARD INWARD" (single space, upper case).
 * Returns null when the input does not match a recognised UK postcode or
 * BFPO shape.
 * @param {string} raw
 * @returns {{ normalised: string, outward: string, inward: string|null, sector: string|null, isBfpo: boolean }|null}
 */
function normalisePostcode(raw) {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).trim().toUpperCase();
  if (!trimmed) return null;

  if (BFPO_LEGACY_RE.test(trimmed)) {
    const digits = trimmed.replace(/^BFPO\s?/, '');
    return {
      normalised: `BFPO ${digits}`,
      outward: 'BFPO',
      inward: digits,
      sector: null,
      isBfpo: true,
    };
  }

  const collapsed = trimmed.replace(/\s+/g, '');
  if (!STANDARD_POSTCODE_RE.test(collapsed) && !STANDARD_POSTCODE_RE.test(trimmed)) {
    return null;
  }

  // Re-run the check against the space-collapsed form so we can safely
  // re-insert a single canonical space before the 3-char inward code.
  const candidate = collapsed;
  if (candidate.length < 5 || candidate.length > 7) return null;
  const inward = candidate.slice(-3);
  const outward = candidate.slice(0, -3);
  if (!/^[0-9][A-Z]{2}$/.test(inward)) return null;
  if (!outward) return null;

  const normalised = `${outward} ${inward}`;
  if (!STANDARD_POSTCODE_RE.test(normalised)) return null;

  return {
    normalised,
    outward,
    inward,
    sector: `${outward} ${inward[0]}`,
    isBfpo: false,
  };
}

/**
 * @param {string} raw
 * @returns {string|null} the outward code, or null if not a recognised postcode
 */
function outwardCode(raw) {
  const parsed = normalisePostcode(raw);
  return parsed ? parsed.outward : null;
}

/**
 * @param {string} raw
 * @returns {string|null} "OUTWARD X" postcode sector, or null (BFPO has no sector)
 */
function sectorCode(raw) {
  const parsed = normalisePostcode(raw);
  return parsed ? parsed.sector : null;
}

/**
 * The postcode "unit" is the full normalised postcode — used as an exact
 * dedupe blocking key (GD-06 "same postcode unit").
 * @param {string} raw
 * @returns {string|null}
 */
function postcodeUnit(raw) {
  const parsed = normalisePostcode(raw);
  return parsed ? parsed.normalised : null;
}

module.exports = {
  STANDARD_POSTCODE_RE,
  BFPO_LEGACY_RE,
  isValidPostcode,
  normalisePostcode,
  outwardCode,
  sectorCode,
  postcodeUnit,
};
