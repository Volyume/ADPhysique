// The typed food line (D230 R13, food level-up 2026-10-16).
//
// A person types "2 eggs, toast and a tea" into the search box. This module
// splits that sentence into parts, reads each part's amount, and works out
// the grams a part stands for once a food has been matched to it. Nothing
// here logs anything: the screen shows the result as a list to check, and
// nothing is written until the person presses the one button.
//
// Plain rules over typed text. The same line always gives the same parts and
// the same grams. The matching itself is the existing food search, passed in
// by the caller (matchFoodLineParts), so this file performs no I/O of its own.

import { MAX_ENTRY_GRAMS, isValidEntryGrams } from './servingEntry';

// A leading amount may be written as a word. "a", "an" and "one" are 1.
const COUNT_WORDS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
};
const FRACTION_GLYPHS = { '½': 0.5, '¼': 0.25, '¾': 0.75 };

// Words that name a unit of amount when they follow the count.
const GRAM_WORDS = new Set(['g', 'gram', 'grams']);
const UNIT_WORDS = new Set([
  'g', 'gram', 'grams', 'ml',
  'slice', 'slices', 'cup', 'cups', 'mug', 'mugs', 'tbsp', 'tsp',
  'tablespoon', 'tablespoons', 'teaspoon', 'teaspoons',
  'scoop', 'scoops', 'piece', 'pieces', 'bowl', 'bowls', 'handful', 'handfuls',
  'serving', 'servings', 'portion', 'portions',
]);

// Protects a decimal comma ("1,5") from the comma split below.
const DECIMAL_COMMA_MARK = '\u0000';

// "toast and" -> "toast": a connector left dangling at either end of a part.
function stripConnectors(text) {
  return text
    .replace(/^(?:and|with)\s+/i, '')
    .replace(/\s+(?:and|with)$/i, '')
    .replace(/^(?:and|with)$/i, '')
    .trim();
}

function splitParts(text) {
  const protectedText = String(text ?? '')
    .replace(/(\d),(\d)/g, `$1${DECIMAL_COMMA_MARK}$2`);
  return protectedText
    .split(/\s*[,;]\s*|\s+(?:and|with)\s+/i)
    .map((p) => stripConnectors(p.split(DECIMAL_COMMA_MARK).join(',').replace(/\s+/g, ' ').trim()))
    .filter(Boolean);
}

function tidyName(text) {
  return text
    .toLowerCase()
    .replace(/[.!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Reads the leading amount from a lower-cased part. Returns the count (or
// null when the part states none) and what is left after it.
function readCount(text) {
  const couple = /^a couple of\s+(.*)$/.exec(text);
  if (couple) return { count: 2, rest: couple[1] };

  const half = /^(?:half|½)(?:\s+(?:of\s+)?(?:an?\s+)?|$)(.*)$/.exec(text);
  if (half) return { count: 0.5, rest: half[1] };

  // A digit amount: "2", "1.5", "1,5", "1½", "¾". A number run into the next
  // word ("7up") is part of the name, not an amount, unless that word is a
  // unit ("200g").
  const num = /^(\d+(?:[.,]\d+)?)?([½¼¾])?(.*)$/.exec(text);
  if (num && (num[1] !== undefined || num[2] !== undefined)) {
    const whole = num[1] !== undefined ? Number(num[1].replace(',', '.')) : 0;
    const frac = num[2] !== undefined ? FRACTION_GLYPHS[num[2]] : 0;
    const rest = num[3];
    const spaced = rest === '' || /^\s/.test(rest) || num[2] !== undefined;
    const glued = /^([a-z]+)/.exec(rest);
    if (Number.isFinite(whole + frac) && (spaced || (glued && UNIT_WORDS.has(glued[1])))) {
      return { count: whole + frac, rest: rest.trim() };
    }
    return { count: null, rest: text };
  }

  const word = /^([a-z]+)\s+(.*)$/.exec(text);
  if (word && Object.prototype.hasOwnProperty.call(COUNT_WORDS, word[1])) {
    return { count: COUNT_WORDS[word[1]], rest: word[2] };
  }
  return { count: null, rest: text };
}

/**
 * Splits a typed line into its parts and reads each part's amount.
 *
 * Parts are split at commas, semicolons, " and " and " with " (any case; a
 * comma inside a number such as "1,5" is a decimal comma, not a split).
 * Each part is { raw, count, unitWord, name }:
 *   raw       the part as typed, trimmed
 *   count     the leading amount (1 when none is stated)
 *   unitWord  the unit word after the count ("g", "slices", "scoop"), or
 *             null. "eggs" in "2 eggs" is the food's name, not a unit.
 *   name      the food, lower-cased, spaces collapsed, a trailing "s" kept
 * A part with no food name left (just "2") is dropped.
 *
 * @param {string} text
 * @returns {Array<{raw:string,count:number,unitWord:string|null,name:string}>}
 */
export function parseFoodLine(text) {
  const out = [];
  for (const raw of splitParts(text)) {
    const lower = raw.toLowerCase();
    const { count, rest } = readCount(lower);
    let unitWord = null;
    let remainder = rest;
    if (count !== null) {
      const first = /^([a-z]+)(?:\s+(.*))?$/.exec(remainder);
      if (first && UNIT_WORDS.has(first[1])) {
        unitWord = first[1];
        remainder = (first[2] ?? '').replace(/^of\s+/, '');
      }
    }
    const name = tidyName(remainder);
    if (!name) continue;
    out.push({ raw, count: count ?? 1, unitWord, name });
  }
  return out;
}

/** True when the line holds two or more foods. */
export function isFoodLine(text) {
  return parseFoodLine(text).length >= 2;
}

function singularUnit(word) {
  return word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word;
}

function personalUnitG(personalG, servingG) {
  if (servingG > 0) {
    const n = Math.round(personalG / servingG);
    if (n >= 2 && Math.abs(personalG - n * servingG) <= 0.15 * personalG) return personalG / n;
  }
  return personalG;
}

/**
 * The grams a part stands for once it has a food.
 *
 *  - grams ("g", "gram", "grams"): the typed number.
 *  - "ml": counted as grams, as for water. There is no density table, so a
 *    thicker drink is only approximate; the person can change it in the
 *    food's own sheet before anything is added.
 *  - a household unit ("slices", "scoop"): the food's own serving weight,
 *    whether or not its serving label names that unit; with no serving
 *    weight known, 100 g per unit.
 *  - a bare count ("2 eggs"): the count times the food's serving weight, or
 *    100 g per count when none is known.
 * The result is rounded and held inside the 1 to 5000 g bound that every
 * logged amount obeys.
 *
 * `basis` says where the figure came from, so the list can be honest:
 * 'typed_g' (the person typed grams or millilitres), 'personal' (the amount
 * the person last logged of this food), 'serving' (the food's
 * own serving weight) or 'default' (no portion known, 100 g per count).
 * `unitMatched` is true when a household word was found in the serving label.
 *
 * @returns {{ grams:number, basis:'typed_g'|'personal'|'serving'|'default', unitMatched:boolean }}
 */
export function portionFor(part, food, { personalG } = {}) {
  const count = Number.isFinite(Number(part?.count)) && Number(part.count) > 0
    ? Number(part.count) : 1;
  const unit = part?.unitWord ?? null;
  const servingG = Number(food?.serving_g) > 0 ? Number(food.serving_g) : 0;

  let raw;
  let basis;
  let unitMatched = false;
  if (unit && (GRAM_WORDS.has(unit) || unit === 'ml')) {
    raw = count;
    basis = 'typed_g';
  } else {
    if (unit) {
      const label = String(food?.serving_label ?? '').toLowerCase();
      unitMatched = !!label && (label.includes(unit) || label.includes(singularUnit(unit)));
    }
    // The person's own amount for this food comes first for a bare count (or a
    // "serving"): what they last logged stands for one of it. When it is a
    // clear whole number of the food's serving (120 g of a 60 g egg), it was
    // several, and one is the serving.
    const own = Number(personalG) > 0 && (!unit || /^(serving|portion)s?$/.test(unit))
      ? personalUnitG(Number(personalG), servingG) : 0;
    if (own > 0) {
      raw = count * own;
      basis = 'personal';
    } else if (servingG > 0) {
      raw = count * servingG;
      basis = 'serving';
    } else {
      raw = count * 100;
      basis = 'default';
    }
  }
  const rounded = Math.round(Number.isFinite(raw) ? raw : 100);
  const grams = Math.min(MAX_ENTRY_GRAMS, Math.max(1, rounded));
  return { grams: isValidEntryGrams(grams) ? grams : 100, basis, unitMatched };
}

// "1 egg (50 g)": one of the food's own servings in words, for the line that
// shows how a figure was reached.
function servingText(food) {
  const sg = Math.round(Number(food?.serving_g) || 0);
  const label = typeof food?.serving_label === 'string' ? food.serving_label.trim() : '';
  if (!label) return `${sg} g`;
  if (/^(g|ml)$/i.test(label)) return `${sg} ${label.toLowerCase()}`;
  if (/\d\s*(g|ml|kg|l)\b/i.test(label)) return label;
  const counted = /^[\d½¼¾]/.test(label) ? label : `1 ${label}`;
  return `${counted} (${sg} g)`;
}

/**
 * The portion line the review list shows, in plain words with the grams
 * said, e.g. "2 eggs · 1 egg (50 g) each = 100 g". When no portion is known
 * it says so: "tea · 100 g (no portion known)".
 */
export function describePortion(part, food, portion) {
  const p = portion ?? portionFor(part, food);
  const typed = part?.raw ? String(part.raw).trim() : '';
  const count = Number(part?.count) || 1;
  if (p.basis === 'typed_g') return `${typed} · ${p.grams} g`;
  if (p.basis === 'personal') {
    const each = Math.round(p.grams / (count > 0 ? count : 1));
    return count === 1
      ? `${typed} · ${p.grams} g (your usual amount)`
      : `${typed} · ${each} g each (your usual amount) = ${p.grams} g`;
  }
  if (p.basis === 'default') {
    return count === 1
      ? `${typed} · ${p.grams} g (no portion known)`
      : `${typed} · 100 g each (no portion known) = ${p.grams} g`;
  }
  return count === 1
    ? `${typed} · ${servingText(food)} = ${p.grams} g`
    : `${typed} · ${servingText(food)} each = ${p.grams} g`;
}

/**
 * Matches every part to a food through the caller's search. `searchRanked`
 * is given a part's name and returns the foods in the order the screen would
 * show them (the existing search, then the person's own history ranked
 * first); the FIRST food that can be logged on its own is the match, and no
 * result means no match. A saved meal is never a match for one typed food.
 * A search that fails leaves that part with no match rather than failing the
 * whole line.
 *
 * @returns {Promise<Array<{ part, food: object|null }>>}
 */
export async function matchFoodLineParts(parts, searchRanked) {
  return Promise.all((parts || []).map(async (part) => {
    let rows = [];
    try {
      rows = (await searchRanked(part.name)) || [];
    } catch (_e) {
      rows = []; // a failed search is "no match" for this part only
    }
    const food = rows.find((f) => f && f.food_ref
      && !(typeof f.food_ref === 'string' && f.food_ref.startsWith('meal:'))) ?? null;
    return { part, food };
  }));
}
