/**
 * NAV-4 (audit/02-ux-audit.md, founder-decided in A1): the differential
 * paywall re-homed from the Pro-guarded CoachOutput (where its free-tier
 * audience could never see it) to HomeScreen's banner stack.
 *
 * Priority-slot mechanics updated for D14 (DECISIONS-2026-07-09.md, Home
 * banner cap ruling delegated to the lead): at most ONE attention banner
 * shows above the Start-Workout hero at a time, chosen by the fixed
 * BANNER_PRIORITY order; every other eligible banner waits its turn and
 * takes the slot on a later render once the current winner is dismissed or
 * resolves (this supersedes the earlier D7 "top two + overflow" model). The
 * differential badge shares the lowest-priority "attention" slot with the
 * free coach line (AttentionCard's own pickAttentionVariant still decides
 * between the two).
 *
 * The detector itself is behaviourally tested in differentialPaywall.test.js;
 * the Home wiring is a screen load effect + JSX, exercised on device per the
 * repo convention, so these are scoped source guards in the plateauBanner
 * style. They pin:
 *  - the dead render never returns to CoachOutput (the original NAV-4 bug);
 *  - the banner's priority slot: the LOWEST in the ranked list, sharing it
 *    with the free coach line, which still outranks it within that slot;
 *  - the free-tier gate and the pure locked detector as the only trigger;
 *  - ED-flag / calm-mode suppression BEFORE any detection (the trigger keys
 *    off adherence gaps, squarely inside COMP-004's weight/food scope);
 *  - per-week dismissal, read before reveal, written by the dismiss handler;
 *  - no billing logic: the CTA only navigates to ProUpgrade (registered in
 *    the Home stack, so a bare navigate is correct here);
 *  - errors swallowed to null like every other banner loader.
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

// Slice one inner function body: from its declaration to the next top-level
// function declaration, so a regex can't match an unrelated loader.
function fnBody(src, decl) {
  const start = src.indexOf(decl);
  if (start === -1) throw new Error(`not found: ${decl}`);
  const next = src.slice(start + decl.length).search(/\n  (async )?function /);
  return next === -1 ? src.slice(start) : src.slice(start, start + decl.length + next);
}

describe('NAV-4: the dead CoachOutput render stays removed', () => {
  test('CoachOutputScreen no longer imports or renders DifferentialBadge', () => {
    expect(COACH).not.toMatch(/import DifferentialBadge/);
    expect(COACH).not.toMatch(/<DifferentialBadge/);
  });
});

describe('NAV-4: banner priority slot (D7 ranked-list mechanics)', () => {
  test('the eligibility trigger is unchanged: free tier, detector shown, not dismissed', () => {
    expect(HOME).toMatch(
      /const differentialBadgeEligible = tier === 'free' && !!differentialBanner\?\.shown && !differentialDismissed;/,
    );
  });

  test('shares the lowest-priority "attention" slot with the free coach line', () => {
    const site = HOME.indexOf('const BANNER_PRIORITY = [');
    expect(site).toBeGreaterThan(-1);
    const block = HOME.slice(site, HOME.indexOf('];', site));
    const order = ['coach', 'trial', 'deload', 'phase', 'plateau', 'activation', 'attention']
      .map((key) => block.indexOf(`key: '${key}'`));
    expect(order.every((i) => i > -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    // The attention slot's own eligibility is free-line-or-differential.
    expect(block).toMatch(/key: 'attention', eligible: freeCoachLineEligible \|\| differentialBadgeEligible/);
  });

  test('within the shared slot, the free coach line still outranks it', () => {
    expect(HOME).toMatch(
      /const showDifferentialBadge = differentialBadgeEligible && !freeCoachLineEligible && showAttentionSlot;/,
    );
  });
});

describe('NAV-4: the loader is honest, gated and suppressed', () => {
  const loader = fnBody(HOME, 'async function loadDifferentialBanner');

  test('free tier only; the pure locked detector is the only trigger', () => {
    expect(loader).toMatch(/tier !== 'free'/);
    expect(loader).toMatch(/detectDifferentialTrigger\(\{/);
    // Tier goes in as-is so the detector's own paid-user gate also holds.
    expect(loader).toMatch(/userTier: tier,/);
  });

  test('ED flag or calm mode suppresses the banner entirely, before any detection', () => {
    const edIdx = loader.indexOf('getOpenEdPatternFlag');
    const calmIdx = loader.indexOf('isCalm(wellbeing)');
    const detectIdx = loader.indexOf('detectDifferentialTrigger');
    expect(edIdx).toBeGreaterThan(-1);
    expect(calmIdx).toBeGreaterThan(-1);
    expect(edIdx).toBeLessThan(detectIdx);
    expect(calmIdx).toBeLessThan(detectIdx);
    expect(loader).toMatch(/if \(edFlag \|\| wellbeing === 'read_failed' \|\| isCalm\(wellbeing\)\) \{ setDifferentialBanner\(null\); return; \}/);
  });

  test('the flag/wellbeing reads fail CLOSED: a read error suppresses the banner', () => {
    // Food-adjacent monetisation surface: a transient read failure must never
    // show the upsell over a possibly open ED flag or calm mode. The ED-flag
    // catch resolves to a sentinel the suppression check treats as "suppress",
    // never a value that reads as "no flag". Wellbeing is read RAW from
    // AsyncStorage, not via getWellbeingMode (which swallows genuine failures to
    // 'unspecified' and would fail OPEN), so a real failure yields 'read_failed'.
    expect(loader).toMatch(/getOpenEdPatternFlag\(user\.id\)\.catch\(\(\) => 'read_failed'\)/);
    expect(loader).toMatch(/AsyncStorage\.getItem\(WELLBEING_KEY\)[\s\S]*?\.catch\(\(\) => 'read_failed'\)/);
    expect(loader).not.toMatch(/getWellbeingMode\(/);
    expect(loader).not.toMatch(/getOpenEdPatternFlag\([^)]*\)\.catch\(\(\) => null\)/);
  });

  test('adherence answers are mapped onto the engine vocabulary via the shared helper', () => {
    expect(loader).toMatch(/mapCalsAdherence\(ci\.calsAdherence, weekAvg, targets\?\.targetKcal\)/);
    expect(loader).toMatch(/localDayKey\(ci\.weekStart \+ 6 \* 86400000\)/);
  });

  test('dismissal is per user + local week, read before reveal, written on dismiss', () => {
    const key = /@volyume_differential_banner_dismissed_\$\{user\.id\}_\$\{localWeekStartMs\(\)\}/;
    expect(loader).toMatch(key);
    expect(loader.indexOf('@volyume_differential_banner_dismissed_'))
      .toBeLessThan(loader.indexOf('setDifferentialBanner(diff)'));
    const dismiss = fnBody(HOME, 'function dismissDifferentialBanner');
    expect(dismiss).toMatch(key);
  });

  test('errors swallow to null (banner-loader pattern)', () => {
    expect(loader).toMatch(/catch \(_\) \{\s*\n\s*setDifferentialBanner\(null\);/);
  });
});

describe('NAV-4: no billing logic on Home', () => {
  test("the CTA only navigates to ProUpgrade (registered in this stack); never the ProfileStack Paywall", () => {
    // D3: the badge renders inside the merged AttentionCard low slot.
    const site = HOME.indexOf('showFreeCoachLine || showDifferentialBadge');
    expect(site).toBeGreaterThan(-1);
    const block = HOME.slice(site, site + 1600);
    // C2 (2026-07-11): the navigate now threads the entry source so the
    // upgrade screen's impression event can attribute it; the pinned rule
    // (banner CTA -> ProUpgrade, never Paywall) is unchanged.
    expect(block).toMatch(/navigation\.navigate\('ProUpgrade', \{ source: /);
    expect(HOME).not.toMatch(/navigate\(\s*['"]Paywall['"]/);
    // No purchase/restore/entitlement calls ride in with the banner.
    expect(HOME).not.toMatch(/playBilling|requestPurchase|restorePurchases|startCascade/);
    // And the card class itself stays billing-free.
    const CARD = require('fs').readFileSync(
      require('path').resolve(__dirname, '..', 'components', 'AttentionCard.js'), 'utf8'
    );
    expect(CARD).not.toMatch(/playBilling|requestPurchase|restorePurchases|startCascade/);
  });
});
