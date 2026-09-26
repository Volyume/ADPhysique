/**
 * Tab header gap guard (founder device report 2026-09-26).
 *
 * Founder, with screenshots of Nutrition and Today: "Spacing at the top of
 * Nutrition is off there should be a space like there is in other headings
 * between it and the main content. The Nutrition and Trends button is almost
 * touching the content below."
 *
 * ScreenHeader leaves only spacing.xs under its title row; each tab root
 * supplies the rest. Today, Train and Coach do it with a spacing.lg content
 * gap. Nutrition spaces its blocks with margins instead of a gap, so its
 * first block (the day pager) carries the same spacing.lg as a top margin.
 * This suite fails if that margin is removed, if the day pager stops being
 * the first block under the header, or if the other tabs' gap changes
 * without Nutrition being revisited.
 */
const fs = require('fs');
const path = require('path');

const read = (f) => fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8');

function styleBlock(src, key) {
  const start = src.indexOf(`\n  ${key}: {`);
  if (start < 0) return null;
  return src.slice(start, src.indexOf('\n  },', start));
}

describe('every tab root leaves the same gap under ScreenHeader', () => {
  test.each(['HomeScreen.js', 'PlansScreen.js', 'YouScreen.js'])(
    '%s spaces its content with spacing.lg',
    (f) => {
      expect(read(f)).toMatch(/^ {2}content: \{ padding: spacing\.lg, gap: spacing\.lg,/m);
    },
  );

  test('Nutrition gives its first block the same spacing.lg under the header', () => {
    const src = read('DiaryScreen.js');
    // The day pager is the first thing rendered after the header (only a
    // comment sits between them).
    expect(src).toMatch(
      /<ScreenHeader\s*\n\s*title="Nutrition"[\s\S]*?\/>\s*\n(?:\s*\{\/\*[\s\S]*?\*\/\}\s*\n)?\s*<View style=\{styles\.dayPagerCard\}>/,
    );
    expect(styleBlock(src, 'dayPagerCard')).toMatch(/marginTop: spacing\.lg,/);
    // The scroll content has no gap of its own, which is why the margin is
    // needed. If a gap is ever added there, this margin must be revisited.
    expect(src).toMatch(/^ {2}scrollContent: \{ padding: spacing\.lg, paddingBottom:/m);
  });
});
