/**
 * Source guard, founder order 2026-10-02 (register D214 addendum 8):
 * user-facing copy on Body metrics uses the term a lay British reader
 * already knows, never an invented paraphrase of it. The title "Calories
 * that hold your weight" was rejected as nonsense English; the term is
 * "maintenance calories" (the coach's own diet-break line uses it). The
 * same order bans "N points" for a body-fat change (percentage points are
 * not a lay term; the change reads from one figure to the other) and the
 * roundabout "In the 7 days to today" (plain: "Over the last 7 days").
 * Pinned on the source so a rewrite cannot bring any of them back.
 */
const fs = require('fs');
const path = require('path');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', '..', '..', rel), 'utf8');

// Comments stripped so a header that names the rejected phrase as history
// (this guard's own reason) never trips the guard on the live strings.
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const SOURCES = [
  'src/lib/bodyMetricsDisplay.js',
  'src/lib/recompReframe.js',
  'src/screens/BodyMetricsScreen.js',
  'src/lib/weightTrend.js',
  'src/lib/progress/pillars.js',
];

const BANNED = [
  { re: /hold(?:s)? your weight/i, why: 'the term is "maintenance calories"' },
  { re: /\bpoints? (?:since|from|up|down)\b/i, why: 'a body-fat change reads from one figure to the other, never "N points"' },
  { re: /In the \$\{[^}]+\} days to today|In the \d+ days to today/, why: 'plain: "Over the last 7 days"' },
];

describe('Body metrics copy uses the plain term (founder order 2026-10-02)', () => {
  test.each(SOURCES)('%s carries none of the rejected phrasings', (rel) => {
    const src = stripComments(read(rel));
    for (const { re, why } of BANNED) {
      expect({ file: rel, match: (src.match(re) || [null])[0], why }).toEqual({ file: rel, match: null, why });
    }
  });

  test('the maintenance card is titled "Maintenance calories"', () => {
    const { MAINTENANCE_TITLE, MAINTENANCE_INFO } = require('../bodyMetricsDisplay');
    expect(MAINTENANCE_TITLE).toBe('Maintenance calories');
    expect(MAINTENANCE_INFO).toMatch(/^The daily calories you logged at times when your weight stayed roughly steady\./);
    expect(MAINTENANCE_INFO).toMatch(/Your coaching calls it effective maintenance\./);
  });
});
