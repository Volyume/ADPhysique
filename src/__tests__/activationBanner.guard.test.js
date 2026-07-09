/**
 * S6 activation-nudge banner priority guard (S6 review finding #5).
 *
 * Priority-slot mechanics updated for AC-6/CP-1 (design-usability-audit-
 * 2026-07-09), founder decision D7: the old strict one-banner invariant is
 * replaced by a ranked list that shows the top two eligible banners and
 * collapses the rest behind one "more updates" affordance. The activation
 * banner's own trigger (activationBannerEligible, including the cold_start
 * exclusion) is untouched by D7; only how many banners can show alongside it
 * changed. Every sibling banner (plateauBanner.guard, differentialBanner.guard)
 * locks its own eligibility/rank the same way, so a later refactor can't
 * silently drop the cold_start exclusion or reorder the precedence.
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

  test('ranks below coach, trial, deload, phase and plateau; above the attention slot', () => {
    const site = HOME.indexOf('const BANNER_PRIORITY = [');
    expect(site).toBeGreaterThan(-1);
    const block = HOME.slice(site, HOME.indexOf('];', site));
    const order = ['coach', 'trial', 'deload', 'phase', 'plateau', 'activation', 'attention']
      .map((key) => block.indexOf(`key: '${key}'`));
    expect(order.every((i) => i > -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  test('the free-tier/differential attention slot yields to it (it outranks them)', () => {
    // Under the ranked-list mechanics the attention slot's own eligibility
    // (freeCoachLineEligible || differentialBadgeEligible) does not reference
    // activation directly; precedence instead comes from BANNER_PRIORITY
    // order, already pinned above. Confirm the attention slot still checks
    // showAttentionSlot, which is derived from that same ranked list.
    expect(HOME).toMatch(/const showFreeCoachLine = freeCoachLineEligible && showAttentionSlot;/);
    expect(HOME).toMatch(/const showDifferentialBadge = differentialBadgeEligible && !freeCoachLineEligible && showAttentionSlot;/);
  });

  test('renders only when it wins one of the top two slots (direct or expanded-overflow), and shows the stage copy, not a hardcoded string', () => {
    expect(HOME).toMatch(
      /const showActivationBanner = topBannerKeys\.has\('activation'\) \|\| \(bannersExpanded && overflowBannerKeys\.has\('activation'\)\);/,
    );
    expect(HOME).toMatch(/\{showActivationBanner && \(/);
    expect(HOME).toMatch(/activationBannerLine\(activationNudge\.stage\)/);
  });
});
