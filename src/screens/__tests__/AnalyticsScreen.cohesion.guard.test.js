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
    // Campaign 23 (§27: "Lifetime totals panel | REHOME to Recaps/YearOfLifts
    // family"): the 3-cell lifetimeValue panel this used to pin left
    // AnalyticsScreen entirely -- it is not a like-for-like style move, the
    // rehomed figure now renders as a YearOfLiftsScreen story 'stat' card
    // (a different component, its own numeral style), so there is nothing
    // left on this screen to pin.
  });

  // RE-ANCHORED 2026-09-18 under D192 finding 5 (finish spec 4.3): the tile
  // became a Row, and a Row's title takes the `title` role (spec section 2:
  // "every row title, card title, button label"), not the small centred
  // caption role a tile used. Intent kept: still a named shared role, never
  // a raw fontSize+fontWeight pair.
  test('nav-tile label uses the shared type.title role (the row-title role), not a raw pair', () => {
    expect(SRC).toMatch(/navTileLabel:\s*\{\s*\.\.\.type\.title/);
    // The live twin mirrors the same role for theme parity.
    expect(SRC).toMatch(/navTileLabel:\s*\{\s*\.\.\.t\.type\.title/);
  });

  // RE-ANCHORED 2026-09-18 under D192 finding 5 (finish spec 4.3): "MORE
  // STATS" tiles became rows, matching the Answer Block's PillarRow anatomy
  // -- a row is layout only (flexDirection/gap/padding), never a
  // bordered/radiused control. This supersedes the 2026-09-17 re-anchor
  // immediately below (kept for its own history): that ruling moved the
  // tile from card-class to control-class radius; this one removes the
  // radius/border class altogether, because the object is no longer a
  // tile of any class -- it is a row. The intent survives once more: the
  // element sits on a named class rather than inventing a corner, and the
  // named class here is "no corner, because it is a row".
  //
  // RE-ANCHORED 2026-09-17 under D165 law 3 (geometry carries meaning): "a
  // control is 10 px and never a pill; a card stays 16 px". A nav tile is a
  // BUTTON -- you press it and a screen opens -- and the founder's own worked
  // examples end "a button definitely isn't [an object]". The intent of the R2
  // case is kept: the tile must sit on a named class rather than invent a
  // corner. The class it belongs to has moved from card to control.
  test('nav tiles are rows now, not bordered/radiused tiles of any class', () => {
    expect(SRC).toMatch(/navTile:\s*\{[^}]*flexDirection:\s*'row'/);
    expect(SRC).not.toMatch(/navTile:\s*\{[\s\S]{0,200}?borderRadius/);
    expect(SRC).not.toMatch(/navTile:\s*\{[\s\S]{0,200}?borderWidth/);
  });

  test('recapCard keeps its RECORDED radius.md ephemeral-banner exception (R9/D70)', () => {
    expect(SRC).toMatch(/recapCard:\s*\{[\s\S]{0,160}?borderRadius: radius\.md/);
  });

  test('no hand-rolled raw <Modal> on the screen', () => {
    expect(SRC).not.toMatch(/<Modal[\s/>]/);
  });
});
