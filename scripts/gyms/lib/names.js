// GD-18 display-name cleanup, pure, no I/O. Fixes the defects the first
// full pipeline run turned up: HTML entities left undecoded (115 rows with
// &amp;), status baked into the name ("(CLOSED)", "- CLOSED", "(TEMPORARILY
// CLOSED)" and case variants — 1,983 rows), all-caps source names, and a
// trailing bracketed qualifier that should read as a plain suffix
// ("Third Space (Moorgate)" -> "Third Space Moorgate"). Also composes a
// brand + branch display name when a branded venue's own name is bare
// (just the town, or just a generic word like "Gym").
//
// Wired from: normalise.mjs (per-record cleanup on every source, plus the
// GD-22 operator brand+branch composition via lib/transforms.js) and
// build.mjs (cluster-level display_name, source preference order operator
// feed > Overture > Active Places per GD-18).

const { foldText, tokenize } = require('./fold');

// GD-18's exceptions list, kept case-exact. Brand casing is layered on top
// from a brand table's own `name` field (see brandCasingExceptions below)
// so a brand added there is never fought by generic title-casing.
const BASE_EXCEPTIONS = ['YMCA', 'JD', 'DW', 'LA', 'F45', 'UK', 'PT'];

// A trailing status baked into the name itself (GD-18: "closure is
// `status`, never a name"). Ordered most-specific-first so "(TEMPORARILY
// CLOSED)" is not partially matched by the plainer "(CLOSED)" pattern.
const STATUS_SUFFIX_PATTERNS = [
  { re: /[\s-]*\(\s*temporarily\s+closed\s*\)\s*$/i, status: 'closed' },
  { re: /[\s-]+temporarily\s+closed\s*$/i, status: 'closed' },
  { re: /[\s-]*\(\s*closed\s*\)\s*$/i, status: 'closed' },
  { re: /[\s-]+closed\s*$/i, status: 'closed' },
];

const ROMAN_NUMERAL_RE = /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i;

const HTML_ENTITY_MAP = {
  amp: '&',
  apos: "'",
  quot: '"',
  lt: '<',
  gt: '>',
  nbsp: ' ',
};

/**
 * Decode the handful of HTML entities that turn up in scraped/exported
 * names (numeric entities included). Unknown named entities are left as-is
 * rather than guessed at.
 * @param {string} input
 * @returns {string}
 */
function decodeEntities(input) {
  if (input === null || input === undefined) return input;
  return String(input)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&(amp|apos|quot|lt|gt|nbsp);/gi, (_, name) => HTML_ENTITY_MAP[name.toLowerCase()]);
}

/**
 * Strip a trailing closure suffix baked into the name ("(CLOSED)",
 * "- CLOSED", "(TEMPORARILY CLOSED)", case-insensitive). Closure belongs in
 * `status`, never in the name — this only cleans the string; it does not
 * change any status field itself. Loops so a doubled-up source defect
 * ("DEIGHTON SPORTS ARENA (CLOSED) (CLOSED)", seen in the first pipeline
 * run's Active Places export) is fully stripped, not just its last
 * occurrence.
 * @param {string} input
 * @returns {{ name: string, statusHint: 'closed'|null }}
 */
function stripStatusSuffix(input) {
  if (!input) return { name: input || '', statusHint: null };
  let name = String(input);
  let statusHint = null;
  let strippedSomething = true;
  while (strippedSomething) {
    strippedSomething = false;
    for (const { re, status } of STATUS_SUFFIX_PATTERNS) {
      if (re.test(name)) {
        name = name.replace(re, '').trim();
        statusHint = status;
        strippedSomething = true;
        break;
      }
    }
  }
  return { name, statusHint };
}

/**
 * @param {string} input
 * @returns {boolean} true when every letter in the string is upper case
 * (and there is at least one letter) — the all-caps case GD-18 targets.
 */
function isAllCaps(input) {
  const letters = (input || '').replace(/[^A-Za-z]/g, '');
  return letters.length > 0 && letters === letters.toUpperCase();
}

function isRomanNumeral(word) {
  return word.length > 0 && word.length <= 8 && ROMAN_NUMERAL_RE.test(word) && /^[MDCLXVImdclxvi]+$/.test(word);
}

/**
 * Build a folded-word -> exact-casing lookup from a brand table's `name`
 * fields, so e.g. "PureGym", "énergie Fitness" or "1Rebel" survive
 * title-casing unmolested. Harmless to include ordinary words too (they
 * title-case to the same result either way).
 * @param {{name:string}[]} brands
 * @returns {Record<string,string>}
 */
function brandCasingExceptions(brands) {
  const map = {};
  for (const b of brands || []) {
    if (!b || !b.name) continue;
    for (const word of String(b.name).split(/\s+/)) {
      const folded = foldText(word);
      if (folded) map[folded] = word;
    }
  }
  return map;
}

function buildExceptionsMap(extra) {
  const map = {};
  for (const word of BASE_EXCEPTIONS) map[foldText(word)] = word;
  Object.assign(map, extra || {});
  return map;
}

/**
 * Convert an all-caps string to title case, honouring an exceptions map
 * (brand casing, YMCA/JD/DW/LA/F45/UK/PT) and roman numerals.
 * @param {string} input
 * @param {Record<string,string>} [exceptionsMap]
 * @returns {string}
 */
function toTitleCase(input, exceptionsMap = {}) {
  if (!input) return input || '';
  return String(input).replace(/[A-Za-z0-9']+/g, (word) => {
    const folded = word.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(exceptionsMap, folded)) return exceptionsMap[folded];
    if (/^\d+$/.test(word)) return word;
    if (isRomanNumeral(word)) return word.toUpperCase();
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

/**
 * A trailing bracketed qualifier becomes a plain suffix: "Third Space
 * (Moorgate)" -> "Third Space Moorgate". Only the FINAL bracketed group is
 * touched (an earlier bracket in the middle of a name is left alone).
 * @param {string} input
 * @returns {string}
 */
function bracketQualifierToSuffix(input) {
  if (!input) return input || '';
  const match = String(input).match(/^(.*\S)\s*\(([^()]+)\)\s*$/);
  if (!match) return input;
  const base = match[1].trim();
  const qualifier = match[2].trim();
  if (!qualifier) return base;
  return `${base} ${qualifier}`;
}

const GENERIC_TRAILING_WORDS = ['gym', 'fitness', 'health club', 'leisure centre', 'club'];

function stripTrailingGenericWord(input) {
  let result = input;
  for (const word of GENERIC_TRAILING_WORDS) {
    const re = new RegExp(`\\s+${word}$`, 'i');
    if (re.test(result)) {
      result = result.replace(re, '').trim();
      break;
    }
  }
  return result;
}

function containsTokenSubsequence(haystack, needle) {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let i = 0; i <= haystack.length - needle.length; i += 1) {
    let match = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

/**
 * GD-18/GD-22 brand + branch composition: when the (already-cleaned)
 * source name doesn't itself mention the brand, compose brand + branch
 * ("PureGym Motherwell"); when it already does ("JD Gyms York"), leave it.
 * @param {string} cleanedName
 * @param {string|null} brandName
 * @returns {string}
 */
function composeBrandBranch(cleanedName, brandName) {
  if (!brandName) return cleanedName;
  if (!cleanedName) return brandName;

  const brandTokens = tokenize(brandName);
  const nameTokens = tokenize(cleanedName);
  if (containsTokenSubsequence(nameTokens, brandTokens)) return cleanedName;

  const branch = stripTrailingGenericWord(cleanedName);
  return branch ? `${brandName} ${branch}` : brandName;
}

/**
 * Full GD-18 display-name cleanup pipeline for one raw name: decode
 * entities, strip a baked-in status suffix, title-case an all-caps name
 * (honouring exceptions), turn a trailing bracket qualifier into a plain
 * suffix. Does NOT compose brand + branch — that is a separate, deliberate
 * step (composeBrandBranch) applied only where GD-18/GD-22 call for it.
 * @param {string} rawName
 * @param {{ exceptionsMap?: Record<string,string> }} [opts]
 * @returns {{ name: string, statusHint: 'closed'|null }}
 */
function cleanDisplayName(rawName, opts = {}) {
  if (!rawName) return { name: rawName || '', statusHint: null };
  const decoded = decodeEntities(rawName);
  const { name: destatused, statusHint } = stripStatusSuffix(decoded);
  const titled = isAllCaps(destatused) ? toTitleCase(destatused, opts.exceptionsMap || {}) : destatused;
  const debracketed = bracketQualifierToSuffix(titled);
  return { name: debracketed, statusHint };
}

module.exports = {
  decodeEntities,
  stripStatusSuffix,
  isAllCaps,
  isRomanNumeral,
  toTitleCase,
  bracketQualifierToSuffix,
  composeBrandBranch,
  cleanDisplayName,
  buildExceptionsMap,
  brandCasingExceptions,
  BASE_EXCEPTIONS,
};
