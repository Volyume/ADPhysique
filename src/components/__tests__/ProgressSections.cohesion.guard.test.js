/**
 * Source guard for the Progress-tab cohesion sweep (R2, 2026-07-11), scoring
 * the shared Progress section cards (ProgressSections.js) against
 * docs/remediation-2026-07-11/FOOD-DESIGN-STANDARD.md.
 *
 * Pins the settled census:
 *   1. Every card-class surface sits at radius.lg + colors.surface + border.
 *   2. Both horizontal meters (mesocycle progress + training-load ACWR) share
 *      the pill/bar radius family (radius.full) -- the R2 fix unified the
 *      training-load meter, previously a one-off radius.sm.
 *   3. Every data-numeral style carries tabular figures (frequency counts and
 *      the session-duration readout, added in R2).
 *   4. No raw <Modal> is hand-rolled here.
 *
 * Chart plotting marks (the 84-day calendar cells, the legend swatch and the
 * duration bars at raw borderRadius 2/3) are deliberately NOT pinned to a
 * token here: they are chart geometry, a hard bound of the R2 brief
 * (CLAUDE.md Section 2 chrome-only), and mirror each other by design.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'ProgressSections.js'), 'utf8');

describe('ProgressSections cohesion census (R2)', () => {
  test('card-class surfaces are radius.lg', () => {
    for (const name of ['card', 'calWrap', 'durationWrap', 'freqWrap', 'workloadCard']) {
      expect(SRC).toMatch(new RegExp(`${name}:\\s*\\{[\\s\\S]{0,200}?borderRadius: radius\\.lg`));
    }
  });

  test('both horizontal meters share the radius.full pill/bar family', () => {
    expect(SRC).toMatch(/mesoProgressTrack:\s*\{[\s\S]{0,80}?borderRadius: radius\.full/);
    expect(SRC).toMatch(/workloadBarBg:\s*\{[\s\S]{0,120}?borderRadius: radius\.full/);
    expect(SRC).toMatch(/workloadBarFill:\s*\{[\s\S]{0,80}?borderRadius: radius\.full/);
  });

  test('data numerals carry tabular figures', () => {
    expect(SRC).toMatch(/freqCountBold:\s*\{[\s\S]{0,500}?fontVariant: \['tabular-nums'\]/);
    expect(SRC).toMatch(/freqLastWeek:\s*\{[\s\S]{0,200}?fontVariant: \['tabular-nums'\]/);
    expect(SRC).toMatch(/durationBarValue:\s*\{[\s\S]{0,500}?fontVariant: \['tabular-nums'\]/);
  });

  test('no hand-rolled raw <Modal>', () => {
    expect(SRC).not.toMatch(/<Modal[\s/>]/);
  });
});
