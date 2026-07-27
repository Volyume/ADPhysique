/**
 * brandLockup.guard.test.js
 *
 * Pins the share-card audit of 2026-07-27
 * (docs/audit/share-card-audit-2026-07-27.md), founder report: "some dont have
 * the logo and such and some do and things like that depending on the sizing
 * and function."
 *
 * Three contracts, all written to FAIL if the brand regresses:
 *
 *   R1 - No fake wordmark. drawFooter used to draw the plain system-font word
 *        "Volyume" whenever the asset had not loaded, which shipped an
 *        off-brand card that looked deliberate. The screen now refuses to
 *        export until the mark is loaded, so nothing may reintroduce a text
 *        substitute here.
 *   R3 - ONE lockup size across every format. The mark was `isSquare ? 66 : 90`
 *        design-px, i.e. 22.8% of the width on square but 31.1% on story -- a
 *        36% jump between two formats of the same card. It is now a fixed
 *        fraction of canvas width, and volyume.app prints on every format
 *        rather than story only.
 *   H2 - The story footer clears Instagram's reply bar, which used to overlay
 *        exactly the band the logo sat in.
 *
 * Source-level guard: drawFooter is module-private and Skia-dependent, so the
 * contract is pinned against the source, matching supabaseAuthStorage.guard.
 */

import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.join(__dirname, '..', 'drawShareCard.js'),
  'utf8',
);

describe('share-card brand lockup (audit 2026-07-27)', () => {
  test('R1: no plain-text wordmark substitute survives anywhere in the renderer', () => {
    // The old fallback. If this string is drawn again, an unbranded card can
    // ship silently for the second time.
    expect(src).not.toMatch(/text\(\s*canvas,\s*Skia,\s*'Volyume'/);
  });

  test('R3: the mark is a fraction of canvas width, not a per-format constant', () => {
    expect(src).toMatch(/const MARK_WIDTH_RATIO = 0\.\d+/);
    expect(src).toMatch(/const markW = W \* MARK_WIDTH_RATIO/);
    // The per-format literal that caused the 36% jump must not come back.
    expect(src).not.toMatch(/markH = Math\.round\(\(isSquare \? 66 : 90\) \* s\)/);
  });

  test('R3: volyume.app prints on EVERY format, not only story', () => {
    expect(src).toMatch(/'volyume\.app'/);
    // Previously guarded by `if (!isSquare)`. That condition must be gone.
    expect(src).not.toMatch(/if \(!isSquare\) text\(canvas, Skia, 'volyume\.app'/);
  });

  test('H2: the story footer lifts clear of the platform reply bar', () => {
    expect(src).toMatch(/const STORY_SAFE_BOTTOM_RATIO = 0\.\d+/);
    expect(src).toMatch(/const storyLift = isSquare \? 0 : Math\.round\(H \* STORY_SAFE_BOTTOM_RATIO\)/);
  });

  test('R4: hero labels clear the numeral descenders through one shared rule', () => {
    expect(src).toMatch(/function heroLabelBaseline\(/);
    // The flat offset that let commas in "1,240,000" strike through the label.
    expect(src).not.toMatch(/heroY \+ Math\.round\(\(p\.isSquare \? 30 : 50\) \* s\)/);
  });

  test('R5: the family says PR, never PB', () => {
    expect(src).not.toMatch(/NEW PB/);
    expect(src).toMatch(/NEW PR/);
  });
});
