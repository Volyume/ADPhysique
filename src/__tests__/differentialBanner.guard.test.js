/**
 * NAV-4 (audit/02-ux-audit.md) — RETIRED.
 *
 * FOUNDER DECISION (fully free, no tier split): the differential paywall
 * badge (its Home wiring, loader, AttentionCard "differential" variant and
 * its shared "attention" slot with the free coach line) is retired
 * entirely, not merely re-homed. There is no upsell content left, so the
 * priority-slot mechanics, the ED-safety suppression chain and the
 * dismissal machinery this file used to pin all leave with it. This file
 * now pins the retirement itself.
 *
 * The pure detector (lib/differentialPaywall.js) stays in the tree,
 * production-unreferenced ("stays dormant" per CLAUDE.md), and its own
 * behavioural tests (differentialPaywall.test.js) are untouched.
 */
import fs from 'fs';
import path from 'path';

const HOME = fs.readFileSync(
  path.resolve(__dirname, '../screens/HomeScreen.js'),
  'utf8',
);
const COACH = fs.readFileSync(
  path.resolve(__dirname, '../screens/CoachOutputScreen.js'),
  'utf8',
);

describe('NAV-4: the dead CoachOutput render stays removed', () => {
  test('CoachOutputScreen no longer imports or renders DifferentialBadge', () => {
    expect(COACH).not.toMatch(/import DifferentialBadge/);
    expect(COACH).not.toMatch(/<DifferentialBadge/);
  });
});

describe('FOUNDER DECISION (fully free, no tier split): the differential badge is retired from Home entirely', () => {
  test('no differential-banner state, loader, dismiss handler or eligibility flag survives', () => {
    expect(HOME).not.toMatch(/differentialBanner/);
    expect(HOME).not.toMatch(/differentialDismissed/);
    expect(HOME).not.toMatch(/differentialBadgeEligible/);
    expect(HOME).not.toMatch(/loadDifferentialBanner/);
    expect(HOME).not.toMatch(/dismissDifferentialBanner/);
    expect(HOME).not.toMatch(/detectDifferentialTrigger/);
  });

  test('the free coach line it used to share the "attention" slot with is retired too', () => {
    expect(HOME).not.toMatch(/freeCoachLineEligible/);
    expect(HOME).not.toMatch(/showFreeCoachLine/);
    expect(HOME).not.toMatch(/loadFreeCoachLine/);
  });

  test('AttentionCard, the component that rendered the badge, is deleted', () => {
    expect(() => fs.readFileSync(
      path.resolve(__dirname, '..', 'components', 'AttentionCard.js'), 'utf8',
    )).toThrow();
  });

  test('BANNER_PRIORITY no longer carries an "attention" slot', () => {
    const site = HOME.indexOf('const BANNER_PRIORITY = [');
    expect(site).toBeGreaterThan(-1);
    const block = HOME.slice(site, HOME.indexOf('];', site));
    expect(block).not.toMatch(/key: 'attention'/);
    const order = ['plateau', 'activation'].map((key) => block.indexOf(`key: '${key}'`));
    expect(order.every((i) => i > -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});
