/**
 * D14 (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md) +
 * Campaign 22 Phase 2 Stage 1 (HOME-TODAY-UX-SPEC.md §13, the ranked
 * priority contract) RE-PIN.
 *
 * WHAT CHANGED. The seven-slot BANNER_PRIORITY cap (coach > trial > deload >
 * phase > plateau > activation > attention) is SPLIT:
 *  - coach, trial(-ending only), deload/recovery, phase, check-in and
 *    block-complete now compete for the single Today line (P1) via the pure
 *    `todayLineArbiter` resolver (see src/lib/home/__tests__/
 *    todayLineArbiter.test.js for that ranking's own adversarial coverage);
 *  - plateau, activation and the free/differential attention slot are
 *    UNCHANGED P3 content -- same three-way one-banner cap mechanism as
 *    before, just with the four senior slots removed from the array (they
 *    would otherwise still suppress plateau/activation whenever eligible,
 *    even though nothing renders their old JSX any more). Their own move
 *    into a full P3 footer redesign is Stage 2's scope (marked `// Stage 2:`
 *    at the array site in HomeScreen.js), untouched here.
 *
 * This screen has no full render test (per HomeScreen.progressScanNudge.test.js:
 * "cannot safely be `require`'d in this Jest environment"), so these are
 * scoped source guards in the same established convention.
 *
 * Pins:
 *  1. BANNER_PRIORITY now lists exactly the three P3 slots, in order:
 *     plateau > activation > attention.
 *  2. Exactly one entry of that list is chosen as shownBannerKey; every
 *     show* flag reduces to a straight equality check against it.
 *  3. coach/trial/deload/phase/check-in/block-complete are NOT in the array
 *     -- they feed the arbiter's facts instead, each carrying its exact
 *     original tap-through and dismissal.
 *  4. None of the three P3 triggers reads an ED flag or wellbeing/calm-mode
 *     signal directly (suppression already happens inside their own
 *     loaders, untouched by this change).
 */
const fs = require('fs');
const path = require('path');

const HOME = fs.readFileSync(path.resolve(__dirname, '../HomeScreen.js'), 'utf8');

describe('D14 + Campaign 22 Phase 2 Stage 1: the P3 banner stack is priority-ranked and capped to exactly one', () => {
  test('BANNER_PRIORITY lists exactly the three P3 slots in order', () => {
    const site = HOME.indexOf('const BANNER_PRIORITY = [');
    expect(site).toBeGreaterThan(-1);
    const block = HOME.slice(site, HOME.indexOf('];', site));
    const keys = ['plateau', 'activation', 'attention'];
    const positions = keys.map((key) => block.indexOf(`key: '${key}'`));
    expect(positions.every((i) => i > -1)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    // The four senior ranks are gone from this array -- they compete for the
    // Today line instead, not this cap.
    expect(block).not.toMatch(/key: '(coach|trial|deload|phase)'/);
  });

  test('exactly one banner key is chosen: the highest-ranked eligible entry', () => {
    expect(HOME).toMatch(
      /const shownBannerKey = BANNER_PRIORITY\[0\]\?\.key \?\? null;/,
    );
    expect(HOME).not.toMatch(/bannersExpanded/);
    expect(HOME).not.toMatch(/overflowBannerKeys/);
    expect(HOME).not.toMatch(/overflowBannerCount/);
    expect(HOME).not.toMatch(/topBannerKeys/);
  });

  test('every one of the three show* flags renders from a plain equality check against shownBannerKey', () => {
    const perBanner = {
      showPlateauBanner: 'plateau',
      showActivationBanner: 'activation',
      showAttentionSlot: 'attention',
    };
    for (const [flag, key] of Object.entries(perBanner)) {
      const re = new RegExp(`const ${flag} = shownBannerKey === '${key}';`);
      expect(HOME).toMatch(re);
    }
  });

  test('there is no "reveal the rest" affordance left in the JSX', () => {
    expect(HOME).not.toMatch(/more update/i);
    expect(HOME).not.toMatch(/moreBannersRow/);
    expect(HOME).not.toMatch(/moreBannersText/);
  });

  test('the ranking arithmetic picks exactly one and leaves the rest waiting (worked example)', () => {
    const eligible = { plateau: true, activation: true, attention: true };
    const BANNER_PRIORITY = ['plateau', 'activation', 'attention']
      .map((key) => ({ key, eligible: eligible[key] }))
      .filter((b) => b.eligible);
    const shownBannerKey = BANNER_PRIORITY[0]?.key ?? null;
    expect(shownBannerKey).toBe('plateau');

    const eligible2 = { plateau: false, activation: true, attention: true };
    const rank2 = ['plateau', 'activation', 'attention']
      .map((key) => ({ key, eligible: eligible2[key] }))
      .filter((b) => b.eligible);
    expect(rank2[0]?.key ?? null).toBe('activation');
    expect(rank2.length).toBe(2);
    expect(new Set([rank2[0]?.key ?? null]).size).toBe(1);
  });

  test('plateau and activation keep their own original tap-through and dismiss handlers untouched', () => {
    expect(HOME).toMatch(/onPress=\{dismissPlateauBanner\}/);
    expect(HOME).toMatch(/onPress=\{dismissActivationNudge\}/);
  });

  test('dismissing the shown P3 banner never marks a waiting (unshown) banner as seen/dismissed', () => {
    const dismissers = [
      { fn: 'dismissPlateauBanner', setter: 'setPlateauBannerDismissed' },
      { fn: 'dismissActivationNudge', setter: 'setActivationNudgeDismissed' },
      { fn: 'dismissFreeCoachLine', setter: 'setFreeCoachLineDismissed' },
      { fn: 'dismissDifferentialBanner', setter: 'setDifferentialDismissed' },
    ];
    for (const { fn, setter } of dismissers) {
      const start = HOME.indexOf(`function ${fn}(`);
      expect(start).toBeGreaterThan(-1);
      const next = HOME.slice(start + 1).search(/\n  (async )?function /);
      const body = next === -1 ? HOME.slice(start) : HOME.slice(start, start + 1 + next);
      expect(body).toMatch(new RegExp(setter));
      const otherSetters = dismissers.filter((d) => d.setter !== setter).map((d) => d.setter);
      for (const other of otherSetters) {
        expect(body).not.toMatch(new RegExp(other));
      }
    }
  });
});

describe('Campaign 22 Phase 2 Stage 1: the senior ranks moved to the Today line arbiter, not deleted', () => {
  test('the arbiter facts object carries all six senior occupants, each keyed to its own fact', () => {
    const site = HOME.indexOf('const todayLineItem = resolveTodayLine({');
    expect(site).toBeGreaterThan(-1);
    const block = HOME.slice(site, HOME.indexOf('  });', site));
    for (const key of ['blockComplete', 'coachDecision', 'checkIn', 'recovery', 'reEntry', 'phaseMismatch', 'trialEnding']) {
      expect(block).toMatch(new RegExp(`${key}: \\{`));
    }
  });

  test('coach decision keeps its exact original tap-through, dismissal key and store mirror', () => {
    expect(HOME).toMatch(
      /const showCoachBanner = tier === 'pro' && !!latestCoachOutput && latestCoachDecisionComplete\s*\n\s*&& !coachBannerDismissed\s*\n\s*&& \(Date\.now\(\) - \(latestCoachOutput\.weekStart \?\? 0\) < 7 \* 86400000\);/,
    );
    // Still its own trigger, not routed through shownBannerKey -- and still
    // mirrored into the store for the You-tab badge, exactly as before.
    expect(HOME).toMatch(/setHasUnseenCoachChange\(showCoachBanner\)/);
    expect(HOME).toMatch(/\}, \[showCoachBanner\]\);/);
    expect(HOME).toMatch(/navigateCrossTab\(navigation, 'ProfileTab', 'CoachOutput', \{ weekStart: latestCoachOutput\.weekStart \}\)/);
    expect(HOME).toMatch(/AsyncStorage\.setItem\(`@volyume_coach_banner_dismissed_\$\{latestCoachOutput\.weekStart\}`, 'true'\)\.catch\(\(\) => \{\}\);/);
  });

  test('the deload suggestion keeps its exact original eligibility gate, tap-through and dismissal', () => {
    expect(HOME).toMatch(/deloadEligible: deloadBannerEligible,/);
    expect(HOME).toMatch(/onDeloadPress: \(\) => \{ haptics\.selection\(\); navigation\.navigate\('CoachReview'\); \},/);
    expect(HOME).toMatch(/onDeloadDismiss: \(\) => setDeloadDismissed\(true\),/);
  });

  test('the phase mismatch keeps its exact original dismissal function', () => {
    expect(HOME).toMatch(/onDismiss: dismissPhaseBanner,/);
  });

  test('trial ending is derived read-only from cascade.js, never a re-derivation of trial state', () => {
    expect(HOME).toMatch(/const trialEndMs = trialEndsAtMs\(userProfile\);/);
    expect(HOME).toMatch(/daysRemaining: daysRemaining\(userProfile\) \?\? 0,/);
    // The everyday S0-S3 variant machinery is gone; only the ending fact remains.
    expect(HOME).not.toMatch(/variant="trial"/);
  });

  test('resume suppression: the arbiter is told about the active workout', () => {
    expect(HOME).toMatch(/hasActiveWorkout,\s*\n\s*\}\);/);
  });
});

describe('D14: no P3 trigger is ED-safety/wellbeing/calm-mode, so none is exempt from the cap', () => {
  test('none of the three P3 eligibility triggers reads an ED flag or wellbeing/calm-mode signal directly', () => {
    const site = HOME.indexOf('const plateauBannerEligible = !!plateauBanner');
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

  test('the cap governs only the P3 stack, and no ED/wellbeing surface was funnelled into it', () => {
    const declared = ['plateau', 'activation', 'attention'];
    const gated = HOME.match(/const show\w+ = shownBannerKey === '(\w+)';/g) || [];
    expect(gated.length).toBeGreaterThan(0);
    for (const line of gated) {
      expect(declared).toContain(line.match(/=== '(\w+)'/)[1]);
    }
  });
});
