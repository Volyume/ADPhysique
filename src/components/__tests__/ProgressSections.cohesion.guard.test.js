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
  // RE-ANCHORED 2026-09-17 under D165 law 2 (the card sweep). The INTENT is
  // unchanged -- these surfaces must not drift apart, and none of them may
  // invent its own corner -- but which treatment they share has moved. R2
  // settled radius.lg because radius.lg was the card class of its day; the
  // founder's later ruling is that "a card should mean: this thing is an
  // object", and four of the five are charts and readouts (a calendar, a
  // duration chart, a frequency table, a training-load panel), which the
  // founder's own examples put outside objecthood ("a trend isn't
  // necessarily"). The fifth, `card`, WAS the object -- the training block --
  // and it is now the real `Card` component rather than a fifth hand-rolled
  // copy of one, so it no longer has a local style key at all.
  test('the four chart surfaces carry the same hairline and no card shell', () => {
    for (const name of ['calWrap', 'durationWrap', 'freqWrap', 'workloadCard']) {
      const block = new RegExp(`${name}:\\s*\\{[^}]*`).exec(SRC);
      expect({ name, found: !!block }).toEqual({ name, found: true });
      expect({ name, radius: /borderRadius/.test(block[0]) }).toEqual({ name, radius: false });
      expect({ name, fill: /backgroundColor/.test(block[0]) }).toEqual({ name, fill: false });
      expect({ name, hairline: /borderTopColor: colors\.borderSubtle/.test(block[0]) })
        .toEqual({ name, hairline: true });
    }
  });

  test('the training block is the real Card, not a fifth hand-rolled one', () => {
    expect(SRC).toMatch(/import Card from '\.\/Card'/);
    expect(SRC).toMatch(/<Card\s+style=\{styles\.mesoCard\}/);
    // The shell it replaced is gone rather than left behind unused.
    expect(SRC).not.toMatch(/\n {2}card:\s*\{/);
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
