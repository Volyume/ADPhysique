/**
 * Source guard for the Progress-tab cohesion sweep (R2, 2026-07-11), scoring
 * AnalyticsScreen against docs/remediation-2026-07-11/FOOD-DESIGN-STANDARD.md.
 *
 * The bulk of this screen's cohesion (CTAs -> shared Button, cards ->
 * radius.lg, blocking alert -> toast) already landed under R9 (D70). This
 * guard PINS the settled census so it cannot regress, plus the small R2
 * residuals it added:
 *   1. Every data-numeral style carries tabular figures (re-anchored under
 *      D214 lane 3: the strip's sentence of numbers and the session meta line;
 *      the difficulty chip now prints a word).
 *   2. The doors are the shared NavRow inside one NavGroup (re-anchored under
 *      D214 lane 3: no hand-rolled NavTile, so no raw fontSize+fontWeight pair
 *      and no screen-local card radius to census).
 *   3. Card-class surfaces sit at radius.lg; recapCard stays radius.md as the
 *      RECORDED R9 (D70) ephemeral-banner exception (not a new invention).
 *   4. No raw <Modal> is hand-rolled on this screen.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'AnalyticsScreen.js'), 'utf8');

describe('AnalyticsScreen cohesion census (R2)', () => {
  test('data numerals carry tabular figures', () => {
    // RE-ANCHORED under D214 lane 3: the old volSummaryCount numeral and the
    // "8/10" difficulty readout are gone (the chip prints the person's word,
    // PR-1). The strip's line is a sentence of numbers and wears the tabular
    // role; the session meta line keeps its own.
    expect(SRC).toMatch(/stripLine:\s*\{\s*\.\.\.type\.num\('bodySm'\)/);
    expect(SRC).toMatch(/stripLine:\s*\{\s*\.\.\.t\.type\.num\('bodySm'\)/);
    expect(SRC).toMatch(/sessionMeta:\s*\{\s*\.\.\.type\.num\('caption'\)/);
    // Campaign 23 (§27: "Lifetime totals panel | REHOME to Recaps/YearOfLifts
    // family"): the 3-cell lifetimeValue panel this used to pin left
    // AnalyticsScreen entirely -- it is not a like-for-like style move, the
    // rehomed figure now renders as a YearOfLiftsScreen story 'stat' card
    // (a different component, its own numeral style), so there is nothing
    // left on this screen to pin.
  });

  // RE-ANCHORED under D214 lane 3 (plan 7.1 item 6, PR-17): the NavTile tiles
  // (a hand-rolled card with the bright border) are replaced by the shared
  // NavRow inside one NavGroup, which owns its own label role and card radius.
  test('the doors are the shared NavRow inside one NavGroup; no hand-rolled tile, label pair or tile card remains', () => {
    expect(SRC).toMatch(/import \{ NavRow, NavGroup \} from '\.\.\/components\/NavRow';/);
    expect(SRC).not.toMatch(/NavTile|navTile/);
    expect(SRC).not.toMatch(/fontWeight: fontWeight\.semibold[^}]*navTile/);
  });

  test('the difficulty chip is a quiet pill printing the person\'s own word in ink (PR-1)', () => {
    expect(SRC).toMatch(/diffChip:\s*\{[^}]*borderRadius: radius\.full[^}]*backgroundColor: colors\.surface2/);
    expect(SRC).toMatch(/diffText:\s*\{\s*\.\.\.type\.captionStrong,\s*color: colors\.textSecondary/);
    expect(SRC).toMatch(/diffText:\s*\{\s*\.\.\.t\.type\.captionStrong,\s*color: t\.colors\.textSecondary/);
    // No warning or error tone (the old thresholds, 6 and 8, never fire on a 1 to 5 rating).
    expect(SRC).not.toMatch(/buildDiffChip|errorBg|warningBg/);
  });

  test('recapCard keeps its RECORDED radius.md ephemeral-banner exception (R9/D70)', () => {
    expect(SRC).toMatch(/recapCard:\s*\{[\s\S]{0,160}?borderRadius: radius\.md/);
  });

  test('no hand-rolled raw <Modal> on the screen', () => {
    expect(SRC).not.toMatch(/<Modal[\s/>]/);
  });
});
