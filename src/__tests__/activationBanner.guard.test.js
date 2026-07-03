/**
 * S6 activation-nudge banner priority guard (S6 review finding #5).
 *
 * The in-app activation banner sits in the Home one-banner stack: below the
 * coaching/recovery banners, ABOVE the free-tier upsell lines (founder call:
 * retention over monetisation for a barely-active new user), and it must NEVER
 * render for the cold_start stage (welcomeCard owns the 0-session in-app
 * moment). Every sibling banner (plateauBanner.guard, differentialBanner.guard)
 * locks its own showX; this pins the activation banner's so a later refactor
 * can't silently drop the cold_start exclusion or reorder the precedence.
 */
import fs from 'fs';
import path from 'path';

const HOME = fs.readFileSync(path.resolve(__dirname, '../screens/HomeScreen.js'), 'utf8');

describe('S6: activation banner priority slot', () => {
  test('excludes cold_start and sits below every higher banner', () => {
    expect(HOME).toMatch(
      /const showActivationBanner = !!activationNudge && activationNudge\.stage !== NUDGE_STAGE\.COLD_START\s*\n\s*&& !activationNudgeDismissed\s*\n\s*&& !showCoachBanner && !showTrialCountdownBanner && !showDeloadBanner && !showPhaseBanner\s*\n\s*&& !showPlateauBanner;/,
    );
  });

  test('the free-tier upsell lines yield to it (it outranks them)', () => {
    const free = HOME.slice(HOME.indexOf('const showFreeCoachLine'), HOME.indexOf('const showDifferentialBadge'));
    expect(free).toMatch(/&& !showActivationBanner;/);
    const diff = HOME.slice(HOME.indexOf('const showDifferentialBadge'));
    expect(diff.slice(0, 400)).toMatch(/&& !showActivationBanner && !showFreeCoachLine;/);
  });

  test('the render is gated on showActivationBanner and shows the stage copy, not a hardcoded string', () => {
    expect(HOME).toMatch(/\{showActivationBanner && \(/);
    expect(HOME).toMatch(/activationBannerLine\(activationNudge\.stage\)/);
  });
});
