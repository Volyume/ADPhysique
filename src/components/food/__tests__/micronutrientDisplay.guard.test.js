/**
 * micronutrientDisplay.guard.test.js — Ultimate-Audit item 16 (MN-1), D22
 * ruling. Source-level guards for both display surfaces
 * (MicronutrientDetail.js per-food primary, WeeklyMicronutrientsCard.js
 * Food Insights secondary) pinning the ED-safety register from
 * docs/ux-world-class-audit-2026-07-09/item-16-micronutrients-scoping.md §5:
 * quiet, non-quantified-first, no colour-coding by good/bad, no progress
 * bars read as targets, no judgement copy, never wired into the coaching
 * engine. Also pins the "keep FoodDetailSheet.js's diff tiny" build
 * constraint (a second agent had concurrent WIP in that file).
 */
const fs = require('fs');
const path = require('path');

const DETAIL = fs.readFileSync(path.resolve(__dirname, '../MicronutrientDetail.js'), 'utf8');
const WEEKLY = fs.readFileSync(path.resolve(__dirname, '../WeeklyMicronutrientsCard.js'), 'utf8');
const COVERAGE = fs.readFileSync(path.resolve(__dirname, '../../../lib/food/micronutrientCoverage.js'), 'utf8');
const SHEET = fs.readFileSync(path.resolve(__dirname, '../FoodDetailSheet.js'), 'utf8');

const ENGINE_MODULES = [
  'nutritionEngine', 'weeklyCoach', 'coachApply', 'planEngine',
  'edPatternDetector', 'wellbeing', 'coachingGoals', 'mesocycle', 'planAutoGen',
];

// Strips /* ... */ and // ... comments first: a naive quote-matching regex
// run directly on the raw source would misfire on contractions inside prose
// comments ("doesn't", "isn't", "let's" - a lone apostrophe reads as opening
// a string literal and swallows everything up to the next apostrophe,
// including unrelated code). Stripping comments first mirrors what
// eslint.config.js's Literal/JSXText selectors actually see (real code, not
// prose), so em dashes and prose words in JSDoc headers (this repo's own
// convention, e.g. micronutrients.js's header) never false-fire here.
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// Extracts quoted string literals (single/double/template, non-greedy) from
// comment-stripped source, so the em-dash check mirrors eslint.config.js's
// actual Literal/JSXText selectors rather than flagging prose in comments.
function stringLiterals(source) {
  const out = [];
  const code = stripComments(source);
  const re = /'([^'\\]|\\.)*'|"([^"\\]|\\.)*"|`([^`\\]|\\.)*`/g;
  let m;
  while ((m = re.exec(code))) out.push(m[0]);
  return out;
}

describe('MicronutrientDetail + WeeklyMicronutrientsCard — ED-safety register guard', () => {
  for (const [name, source] of [['MicronutrientDetail.js', DETAIL], ['WeeklyMicronutrientsCard.js', WEEKLY]]) {
    test(`${name}: no valence colour (error/success/warning/danger) used for a nutrient row`, () => {
      expect(source).not.toMatch(/colors\.(error|success|warning|danger)/);
    });

    test(`${name}: no progress bar / meter primitive (would read as a target to hit)`, () => {
      expect(source).not.toMatch(/ProgressBar|<Bar\b|progressWidth|percentComplete/);
    });

    test(`${name}: no judgement or deficiency-framing copy in any string literal`, () => {
      for (const lit of stringLiterals(source)) {
        expect(lit).not.toMatch(/deficient|deficiency|bad|poor|unhealthy|inadequate|too (much|little|low|high)|not enough(?! foods with known values)/i);
      }
    });

    test(`${name}: no em dash in any string literal (locked British-English voice rule)`, () => {
      for (const lit of stringLiterals(source)) {
        expect(lit).not.toMatch(/—/);
      }
    });

    test(`${name}: never wired into the deterministic coaching engine`, () => {
      for (const mod of ENGINE_MODULES) {
        expect(source).not.toMatch(new RegExp(`from ['"].*${mod}['"]`));
      }
      expect(source).not.toMatch(/runWeeklyCoach|applyCoachAdjustment|saveCoachOutput/);
    });
  }

  test('micronutrientCoverage.js (shared maths) also never reaches the coaching engine', () => {
    for (const mod of ENGINE_MODULES) {
      expect(COVERAGE).not.toMatch(new RegExp(`from ['"].*${mod}['"]`));
    }
  });

  test('no notification/scheduler wiring anywhere in the new display surfaces (never a daily-policing nag)', () => {
    for (const source of [DETAIL, WEEKLY, COVERAGE]) {
      expect(source).not.toMatch(/scheduleNotification|notifications\/scheduler|trackNotification/);
    }
  });

  test('FoodDetailSheet.js gained a minimal, clearly-separate hook for MicronutrientDetail (not an inlined rebuild)', () => {
    expect(SHEET).toMatch(/import MicronutrientDetail from '\.\/MicronutrientDetail';/);
    expect(SHEET).toMatch(/<MicronutrientDetail food=\{food\} quantityG=\{quantityG\} \/>/);
    // The render call is a single self-closing line, not a multi-line inlined
    // reimplementation of the section inside FoodDetailSheet itself.
    const renderLine = SHEET.split(/\r?\n/).find((l) => l.includes('<MicronutrientDetail'));
    expect(renderLine.trim()).toBe('<MicronutrientDetail food={food} quantityG={quantityG} />');
  });
});
