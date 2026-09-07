// Pure text-folding helpers for the gym directory pipeline.
// No I/O. Used by classify.js, dedupe.js, brands.js and build.mjs (tokens).

/**
 * Lowercase, strip accents, strip punctuation, collapse whitespace, trim.
 * @param {string} input
 * @returns {string}
 */
function foldText(input) {
  if (input === null || input === undefined) return '';
  const str = String(input);
  const noAccents = str.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const lower = noAccents.toLowerCase();
  // Replace anything that isn't a letter, digit or whitespace with a space.
  const noPunct = lower.replace(/[^a-z0-9\s]/g, ' ');
  return noPunct.replace(/\s+/g, ' ').trim();
}

/**
 * Fold then split into a token array. Empty tokens are dropped.
 * @param {string} input
 * @returns {string[]}
 */
function tokenize(input) {
  const folded = foldText(input);
  if (!folded) return [];
  return folded.split(' ').filter(Boolean);
}

/**
 * Remove tokens that appear (as a contiguous run) in any of the given
 * brand alias token sequences. Used to strip a brand name out of a venue
 * name before comparing what's left (locality / qualifier words).
 * @param {string[]} tokens - already-folded tokens
 * @param {string[][]} aliasTokenSets - folded token arrays, one per alias
 * @returns {string[]} remaining tokens with any matched alias run removed
 */
function stripBrandFromTokens(tokens, aliasTokenSets) {
  if (!Array.isArray(tokens) || tokens.length === 0) return [];
  if (!Array.isArray(aliasTokenSets) || aliasTokenSets.length === 0) return tokens.slice();

  // Try the longest alias first so "the gym group" is stripped before "the gym".
  const sorted = aliasTokenSets
    .filter((set) => Array.isArray(set) && set.length > 0)
    .slice()
    .sort((a, b) => b.length - a.length);

  let result = tokens.slice();
  for (const alias of sorted) {
    const idx = findSubsequence(result, alias);
    if (idx !== -1) {
      result = result.slice(0, idx).concat(result.slice(idx + alias.length));
    }
  }
  return result;
}

function findSubsequence(haystack, needle) {
  if (needle.length === 0 || needle.length > haystack.length) return -1;
  for (let i = 0; i <= haystack.length - needle.length; i += 1) {
    let match = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

/**
 * Jaccard similarity of two token arrays treated as sets.
 * @param {string[]} tokensA
 * @param {string[]} tokensB
 * @returns {number} 0..1
 */
function tokenJaccard(tokensA, tokensB) {
  const setA = new Set(tokensA || []);
  const setB = new Set(tokensB || []);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

module.exports = { foldText, tokenize, stripBrandFromTokens, tokenJaccard };
