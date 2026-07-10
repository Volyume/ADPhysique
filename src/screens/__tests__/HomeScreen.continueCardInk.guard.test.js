/**
 * AC-3 (docs/ux-world-class-audit-2026-07-09/SCORECARD.md, D14 Group A,
 * approved in full): the "Continue workout" card's subtitle and chevron used
 * `withAlpha(colors.background, 0.8)` as INK on the card's filled
 * `colors.success` background. `colors.background` is the screen background
 * token (near-white in light theme), so on a filled card it produced poor
 * contrast in light theme instead of a softened on-primary ink. Fixed to
 * `withAlpha(colors.onPrimary, 0.8)`, matching `continueTitle`'s own
 * `colors.onPrimary`.
 *
 * `continueIcon`'s `withAlpha(colors.background, alpha.soft)` is a genuine
 * background FILL (the icon-circle backing), not ink, and is deliberately
 * left untouched.
 *
 * CP-10 stage 3 (theming batch 2, 2026-07-10): HomeScreen now reads a live
 * theme (src/hooks/useTheme.js) for its colour tokens, so the frozen
 * `colors.*` singleton import was replaced with `t.colors.*` at JSX call
 * sites (the STATIC StyleSheet.create definitions below stay byte-identical
 * -- see the "still reads withAlpha(colors.background, ...)" test, which is
 * unchanged and still passes against that frozen block). The chevron's
 * inline `color` prop is one such call site, so its literal text moved from
 * `colors.onPrimary` to `t.colors.onPrimary`; the pinned RULE -- onPrimary,
 * never background, as the ink on the filled continue-card -- is unchanged.
 */
const fs = require('fs');
const path = require('path');

const HOME = fs.readFileSync(path.resolve(__dirname, '../HomeScreen.js'), 'utf8');

describe('AC-3: Continue-workout card ink uses colors.onPrimary, not colors.background', () => {
  test('the chevron ink is withAlpha(t.colors.onPrimary, 0.8)', () => {
    expect(HOME).toMatch(
      /<Ionicons name="chevron-forward" size=\{18\} color=\{withAlpha\(t\.colors\.onPrimary, 0\.8\)\} \/>/,
    );
  });

  test('the subtitle (continueSub) ink is withAlpha(colors.onPrimary, 0.8)', () => {
    expect(HOME).toMatch(
      /continueSub: \{ \.\.\.type\.caption, color: withAlpha\(colors\.onPrimary, 0\.8\), marginTop: spacing\.xxs \},/,
    );
  });

  test('no ink on the card still reads withAlpha(colors.background, ...)', () => {
    // The only surviving withAlpha(colors.background, ...) use in this file
    // must be the continueIcon's genuine background FILL, never an ink/text
    // colour on the filled continueCard.
    const matches = [...HOME.matchAll(/withAlpha\(colors\.background,[^)]*\)/g)];
    expect(matches.length).toBe(1);
    const site = HOME.indexOf(matches[0][0]);
    const window = HOME.slice(Math.max(0, site - 120), site + 40);
    expect(window).toMatch(/backgroundColor: withAlpha\(colors\.background, alpha\.soft\)/);
  });

  test('continueTitle and the fixed ink sites agree on colors.onPrimary', () => {
    expect(HOME).toMatch(/continueTitle: \{ \.\.\.type\.bodyStrong, color: colors\.onPrimary \},/);
  });
});
