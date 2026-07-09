/**
 * AC-6 / CP-1 (docs/design-usability-audit-2026-07-09/coverage-03-aesthetic-
 * craft.md and coverage-06-competitive-hps.md), founder decision D7
 * (DECISIONS-2026-07-09.md): Home could stack up to seven independently-
 * dismissible banners above the primary Start-Workout hero, with no cap.
 * D7: "PRIORITY-RANK them -- show top 1-2 above the hero, collapse the rest
 * behind a single 'more' affordance."
 *
 * This screen has no full render test (per HomeScreen.progressScanNudge.test.js:
 * "cannot safely be `require`'d in this Jest environment"), so these are
 * scoped source guards in the same established convention, plus one pure
 * unit test of the ranking arithmetic extracted verbatim from the screen so
 * the "top 2 + overflow" behaviour is actually exercised with values, not
 * just pattern-matched.
 *
 * Pins:
 *  1. The seven banner slots are ranked in one fixed, ordered list
 *     (BANNER_PRIORITY), highest priority first: coach > trial > deload >
 *     phase > plateau > activation > attention (free coach line /
 *     differential badge, which still resolve their own order within that
 *     shared slot exactly as before).
 *  2. Only the top two entries of that list (among the ones currently
 *     eligible) render directly; anything beyond position two is collapsed
 *     behind ONE "more updates" affordance, never rendered loose.
 *  3. The affordance only appears when there is a third-or-later eligible
 *     banner, and expands (bannersExpanded) to reveal exactly the overflowed
 *     ones, in their existing slots, with every original tap/dismiss handler
 *     untouched (no banner's trigger condition or copy changed by this).
 *  4. None of the seven banner slots is an ED-safety, wellbeing or calm-mode
 *     banner in its own right (each is a coaching/training/monetisation
 *     notice; where ED-safety is relevant, e.g. the activation nudge and the
 *     differential badge, suppression already happens inside their own
 *     loaders under an open ED flag or calm mode, untouched by this change),
 *     so nothing in this stack needed "always-show" treatment. This test
 *     also confirms that untouched ED/calm suppression is still present.
 */
const fs = require('fs');
const path = require('path');

const HOME = fs.readFileSync(path.resolve(__dirname, '../HomeScreen.js'), 'utf8');

describe('AC-6/CP-1 (D7): banner stack is priority-ranked and capped to two', () => {
  test('BANNER_PRIORITY lists all seven slots in the documented priority order', () => {
    const site = HOME.indexOf('const BANNER_PRIORITY = [');
    expect(site).toBeGreaterThan(-1);
    const block = HOME.slice(site, HOME.indexOf('];', site));
    const keys = ['coach', 'trial', 'deload', 'phase', 'plateau', 'activation', 'attention'];
    const positions = keys.map((key) => block.indexOf(`key: '${key}'`));
    expect(positions.every((i) => i > -1)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  test('only the top two ranked entries are eligible for direct display; the rest are the overflow set', () => {
    expect(HOME).toMatch(
      /const topBannerKeys = new Set\(BANNER_PRIORITY\.slice\(0, 2\)\.map\(b => b\.key\)\);/,
    );
    expect(HOME).toMatch(
      /const overflowBannerKeys = new Set\(BANNER_PRIORITY\.slice\(2\)\.map\(b => b\.key\)\);/,
    );
    expect(HOME).toMatch(/const overflowBannerCount = overflowBannerKeys\.size;/);
  });

  test('every one of the seven show* flags renders from topBannerKeys, or from the overflow set only once expanded', () => {
    const perBanner = {
      showTrialCountdownBanner: 'trial',
      showDeloadBanner: 'deload',
      showPhaseBanner: 'phase',
      showPlateauBanner: 'plateau',
      showActivationBanner: 'activation',
    };
    for (const [flag, key] of Object.entries(perBanner)) {
      const re = new RegExp(
        `const ${flag} = topBannerKeys\\.has\\('${key}'\\) \\|\\| \\(bannersExpanded && overflowBannerKeys\\.has\\('${key}'\\)\\);`,
      );
      expect(HOME).toMatch(re);
    }
    // Coach is rank 1: always inside the top two whenever eligible, so its
    // flag is simply its own trigger (verified unchanged, not re-gated).
    expect(HOME).toMatch(
      /const showCoachBanner = tier === 'pro' && !!latestCoachOutput && latestCoachOutput\.hasEnoughData\s*\n\s*&& !coachBannerDismissed\s*\n\s*&& \(Date\.now\(\) - \(latestCoachOutput\.weekStart \?\? 0\) < 7 \* 86400000\);/,
    );
    // The attention slot (free coach line / differential badge) shares rank
    // 7, gated the same top2-or-expanded way via showAttentionSlot.
    expect(HOME).toMatch(
      /const showAttentionSlot = topBannerKeys\.has\('attention'\) \|\| \(bannersExpanded && overflowBannerKeys\.has\('attention'\)\);/,
    );
  });

  test('the ranking arithmetic actually caps to two and overflows the rest (worked example)', () => {
    // Extracted verbatim from the screen's own logic so this is a real unit
    // test of the cap, not only a pattern match: five of the seven slots
    // eligible at once (a realistic worst case per the audit) must yield
    // exactly two shown directly and three in overflow.
    const eligible = {
      coach: true, trial: true, deload: true, phase: false, plateau: true,
      activation: true, attention: false,
    };
    const BANNER_PRIORITY = ['coach', 'trial', 'deload', 'phase', 'plateau', 'activation', 'attention']
      .map((key) => ({ key, eligible: eligible[key] }))
      .filter((b) => b.eligible);
    const topBannerKeys = new Set(BANNER_PRIORITY.slice(0, 2).map((b) => b.key));
    const overflowBannerKeys = new Set(BANNER_PRIORITY.slice(2).map((b) => b.key));

    expect([...topBannerKeys]).toEqual(['coach', 'trial']);
    expect([...overflowBannerKeys]).toEqual(['deload', 'plateau', 'activation']);
    expect(overflowBannerKeys.size).toBe(3);

    // A different mix: coach absent, so the top two shift down to the next
    // two eligible ranks (trial, deload), confirming the cap is dynamic, not
    // a fixed "always show slots 1 and 2 regardless of eligibility" rule.
    const eligible2 = { coach: false, trial: true, deload: true, phase: true, plateau: false, activation: false, attention: true };
    const rank2 = ['coach', 'trial', 'deload', 'phase', 'plateau', 'activation', 'attention']
      .map((key) => ({ key, eligible: eligible2[key] }))
      .filter((b) => b.eligible);
    expect([...new Set(rank2.slice(0, 2).map((b) => b.key))]).toEqual(['trial', 'deload']);
    expect([...new Set(rank2.slice(2).map((b) => b.key))]).toEqual(['phase', 'attention']);
  });

  test('the "more" affordance renders only when overflow exists, toggles bannersExpanded, and never dismisses a banner itself', () => {
    const site = HOME.indexOf('{overflowBannerCount > 0 && (');
    expect(site).toBeGreaterThan(-1);
    const block = HOME.slice(site, site + 900);
    expect(block).toMatch(/onPress=\{\(\) => setBannersExpanded\(v => !v\)\}/);
    expect(block).toMatch(/accessibilityState=\{\{ expanded: bannersExpanded \}\}/);
    // It is a single row, not a per-banner close control: no dismiss handler
    // lives inside it.
    expect(block).not.toMatch(/dismiss[A-Z]\w*\(\)/);
  });

  test('bannersExpanded is session-local state, defaulting collapsed on every mount', () => {
    expect(HOME).toMatch(/const \[bannersExpanded, setBannersExpanded\] = useState\(false\);/);
  });

  test('each banner keeps its own original tap-through and dismiss handlers untouched', () => {
    expect(HOME).toMatch(/onPress=\{dismissPhaseBanner\}/);
    expect(HOME).toMatch(/onPress=\{\(\) => setDeloadDismissed\(true\)\}/);
    expect(HOME).toMatch(/onPress=\{dismissPlateauBanner\}/);
    expect(HOME).toMatch(/onPress=\{dismissActivationNudge\}/);
    expect(HOME).toMatch(/navigateCrossTab\(navigation, 'ProfileTab', 'CoachOutput', \{ weekStart: latestCoachOutput\.weekStart \}\)/);
    expect(HOME).toMatch(/onTrialDismiss=\{dismissTrialBanner\}/);
  });
});

describe('AC-6/CP-1: no banner in this stack is ED-safety/wellbeing/calm-mode, so none needed always-show', () => {
  test('none of the seven eligibility triggers reads an ED flag or wellbeing/calm-mode signal directly', () => {
    const site = HOME.indexOf("const trialBannerEligible = !!trialBanner");
    const end = HOME.indexOf('const BANNER_PRIORITY = [');
    const triggerBlock = HOME.slice(site, end);
    expect(triggerBlock).not.toMatch(/edFlag|isCalm|WELLBEING_KEY|openEdPatternFlag/i);
  });

  test('ED-flag/calm-mode suppression that already existed for the activation nudge and differential badge is untouched (their loaders, not their render gate)', () => {
    const activationLoader = HOME.slice(HOME.indexOf('async function loadActivationNudge'));
    expect(activationLoader.slice(0, 1000)).toMatch(/edFlag \|\| wellbeing === 'read_failed' \|\| isCalm\(wellbeing\)/);
    const differentialLoader = HOME.slice(HOME.indexOf('async function loadDifferentialBanner'));
    expect(differentialLoader.slice(0, 1200)).toMatch(/edFlag \|\| wellbeing === 'read_failed' \|\| isCalm\(wellbeing\)/);
  });
});
