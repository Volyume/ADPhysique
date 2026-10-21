/**
 * Helpers for the volyume.app facts guard: reading a number off a page,
 * finding its fact in public/assets/facts.json, and judging whether the page's
 * way of writing it ("923", "29,279", "over 29,000", "six") agrees with the
 * code's figure. Kept apart from the test so site.selftest.test.js can pin it.
 *
 * Authority: docs/site-rebuild-2026-10/BRIEF.md ("Facts from code": a build
 * step writes the site's numbers; a guard test fails if a page states a number
 * the code does not support).
 */
'use strict';

const WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
  twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};
const WORD_OF = Object.fromEntries(Object.entries(WORDS).map(([w, n]) => [n, w]));

/** "29,279", "923+", "six" -> a number; anything else -> null. */
function parseNumber(text) {
  const t = text.trim().toLowerCase().replace(/\+$/, '');
  if (/^\d{1,3}(,\d{3})+$|^\d+$/.test(t)) return Number(t.replace(/,/g, ''));
  if (Object.prototype.hasOwnProperty.call(WORDS, t)) return WORDS[t];
  return null;
}

const QUALIFIER = /^(over|more than|nearly|almost|around|about)\s+/i;
const magnitude = (value) => 10 ** Math.max(0, Math.floor(Math.log10(Math.max(1, value))));

/**
 * Does the way a page writes a number agree with the code's figure?
 * An exact figure must be exact. "over N" / "more than N" must be a round
 * number at or below the figure and within its leading magnitude (over 29,000
 * for 29,279; over 900 for 923). "nearly N" must be a round number at or above.
 * "around N" must be within 5%.
 */
function agrees(text, value, { before = '' } = {}) {
  if (typeof value !== 'number') return text.trim() === String(value);
  let t = text.trim();
  let qualifier = (before.match(/(over|more than|nearly|almost|around|about)\s*$/i) || [])[1];
  const own = t.match(QUALIFIER);
  if (own) { qualifier = own[1]; t = t.replace(QUALIFIER, ''); }
  const n = parseNumber(t);
  if (n === null) return false;
  if (!qualifier) return n === value;
  const q = qualifier.toLowerCase();
  const round = n % 10 === 0;
  if (q === 'over' || q === 'more than') return round && n <= value && value - n < magnitude(value);
  if (q === 'nearly' || q === 'almost') return round && n >= value && n - value < magnitude(value);
  return Math.abs(n - value) <= value * 0.05;
}

/** The fact for a key: a top-level key, a dotted path, or either under "facts". */
function factFor(facts, key) {
  const dig = (root) => {
    if (root && Object.prototype.hasOwnProperty.call(root, key)) return root[key];
    return key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), root);
  };
  let v = dig(facts);
  if (v === undefined && facts && typeof facts.facts === 'object') v = dig(facts.facts);
  if (v && typeof v === 'object' && 'value' in v) v = v.value;
  return v;
}

/** Every leaf of a facts object as [dotted.path, value]. */
function leaves(obj, prefix = '') {
  return Object.entries(obj || {}).flatMap(([k, v]) => {
    const p = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' && !('value' in v && Object.keys(v).length <= 3) ? leaves(v, p) : [[p, v && typeof v === 'object' ? v.value : v]];
  });
}

// A number written next to the thing the code counts. Small numbers next to
// "meals" or "exercises" are ordinary ("5 meals a day", "3 exercises", "one
// training style"), so each noun only counts from a floor up.
const COUNTED = [
  { noun: 'exercises', re: 'exercises?', keys: /exercise/i, floor: 20 },
  { noun: 'plans', re: 'plans?', keys: /plan/i, floor: 20 },
  { noun: 'foods', re: 'foods?', keys: /food/i, floor: 100 },
  { noun: 'meals', re: 'meals?', keys: /meal/i, floor: 20 },
  { noun: 'training styles', re: 'training styles?', keys: /style/i, floor: 2 },
  { noun: 'physique goals', re: '(?:physique goals?|goal options?)', keys: /goal/i, floor: 2 },
];

/** Numbers written next to a counted noun: [{noun, text, n, before, keys}]. */
function claimsIn(text) {
  const out = [];
  COUNTED.forEach((c) => {
    const re = new RegExp(`(?<![\\w.,])(\\d[\\d,]*\\+?|${Object.keys(WORDS).join('|')})\\s+(?:[A-Za-z-]+\\s+){0,2}${c.re}\\b`, 'gi');
    for (const m of text.matchAll(re)) {
      const n = parseNumber(m[1]);
      if (n === null || n < c.floor) continue;
      const before = text.slice(Math.max(0, m.index - 12), m.index);
      out.push({ noun: c.noun, text: m[1], n, before, keys: c.keys });
    }
  });
  return out;
}

module.exports = { WORDS, WORD_OF, parseNumber, agrees, factFor, leaves, claimsIn, COUNTED };
