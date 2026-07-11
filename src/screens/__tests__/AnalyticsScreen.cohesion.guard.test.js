/**
 * Source guard for the Progress-tab cohesion sweep (R2, 2026-07-11), scoring
 * AnalyticsScreen against docs/remediation-2026-07-11/FOOD-DESIGN-STANDARD.md.
 *
 * The bulk of this screen's cohesion (CTAs -> shared Button, cards ->
 * radius.lg, blocking alert -> toast) already landed under R9 (D70). This
 * guard PINS the settled census so it cannot regress, plus the small R2
 * residuals it added:
 *   1. Every data-numeral style carries tabular figures (diffText joined the
 *      volSummaryCount/lifetimeValue discipline).
 *   2. The nav-tile label uses the shared type.captionStrong role, not a raw
 *      fontSize+fontWeight pair.
 *   3. Card-class surfaces sit at radius.lg; recapCard stays radius.md as the
 *      RECORDED R9 (D70) ephemeral-banner exception (not a new invention).
 *   4. No raw <Modal> is hand-rolled on this screen.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'AnalyticsScreen.js'), 'utf8');

describe('AnalyticsScreen cohesion census (R2)', () => {
  test('data numerals carry tabular figures', () => {
    // R2 addition: the difficulty chip readout.
    expect(SRC).toMatch(/diffText:\s*\{[^}]*fontVariant: \['tabular-nums'\]/);
    // Pre-existing numerals stay tabular.
    expect(SRC).toMatch(/volSummaryCount:\s*\{[^}]*fontVariant: \['tabular-nums'\]/);
    expect(SRC).toMatch(/lifetimeValue:\s*\{[\s\S]{0,120}?fontVariant: \['tabular-nums'\]/);
  });

  test('nav-tile label uses the shared type.captionStrong role, not a raw pair', () => {
    expect(SRC).toMatch(/navTileLabel:\s*\{\s*\.\.\.type\.captionStrong/);
    // The live twin mirrors the same role for theme parity.
    expect(SRC).toMatch(/navTileLabel:\s*\{\s*\.\.\.t\.type\.captionStrong/);
  });

  test('nav tiles are card-class (radius.lg)', () => {
    expect(SRC).toMatch(/navTile:\s*\{[\s\S]{0,140}?borderRadius: radius\.lg/);
  });

  test('recapCard keeps its RECORDED radius.md ephemeral-banner exception (R9/D70)', () => {
    expect(SRC).toMatch(/recapCard:\s*\{[\s\S]{0,160}?borderRadius: radius\.md/);
  });

  test('no hand-rolled raw <Modal> on the screen', () => {
    expect(SRC).not.toMatch(/<Modal[\s/>]/);
  });
});
