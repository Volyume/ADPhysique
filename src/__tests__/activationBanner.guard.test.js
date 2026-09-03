/**
 * S6 activation-nudge banner priority guard (S6 review finding #5).
 *
 * Priority-slot mechanics updated for D14 (DECISIONS-2026-07-09.md, Home
 * banner cap ruling delegated to the lead): at most ONE attention banner
 * shows above the Start-Workout hero at a time, chosen by the fixed
 * BANNER_PRIORITY order; every other eligible banner waits its turn and
 * takes the slot on a later render once the current winner is dismissed or
 * resolves (this supersedes the earlier D7 "top two + overflow" model). The
 * activation banner's own trigger (activationBannerEligible, including the
 * cold_start exclusion) is untouched; only whether it can share the stack
 * with another banner at the same time changed. Every sibling banner
 * (plateauBanner.guard, differentialBanner.guard) locks its own
 * eligibility/rank the same way, so a later refactor can't silently drop the
 * cold_start exclusion or reorder the precedence.
 */
import fs from 'fs';
import path from 'path';

const HOME = fs.readFileSync(path.resolve(__dirname, '../screens/HomeScreen.js'), 'utf8');

describe('S6: activation banner priority slot (D7 ranked-list mechanics)', () => {
  test('the eligibility trigger excludes cold_start, unchanged by D7', () => {
    expect(HOME).toMatch(
      /const activationBannerEligible = !!activationNudge && activationNudge\.stage !== NUDGE_STAGE\.COLD_START\s*\n\s*&& !activationNudgeDismissed;/,
    );
  });

  // RE-PINNED (Campaign 22 Phase 2 Stage 1): coach/trial/deload/phase moved
  // off this array onto the Today line arbiter (see
  // HomeScreen.bannerPriorityCap.test.js) -- they no longer compete for
  // this P3 stack's slot at all.
  // FOUNDER DECISION (fully free, no tier split): the free-tier/differential
  // "attention" slot activation used to rank above is retired entirely
  // (see differentialBanner.guard.test.js), so activation's only remaining
  // peer here is plateau.
  test('ranks below plateau; the retired attention slot is gone', () => {
    const site = HOME.indexOf('const BANNER_PRIORITY = [');
    expect(site).toBeGreaterThan(-1);
    const block = HOME.slice(site, HOME.indexOf('];', site));
    const order = ['plateau', 'activation'].map((key) => block.indexOf(`key: '${key}'`));
    expect(order.every((i) => i > -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(block).not.toMatch(/key: 'attention'/);
  });

  test('renders only when it is the single highest-priority eligible banner, and shows the stage copy, not a hardcoded string', () => {
    expect(HOME).toMatch(
      /const showActivationBanner = shownBannerKey === 'activation';/,
    );
    expect(HOME).toMatch(/\{showActivationBanner && \(/);
    expect(HOME).toMatch(/activationBannerLine\(activationNudge\.stage\)/);
  });
});
