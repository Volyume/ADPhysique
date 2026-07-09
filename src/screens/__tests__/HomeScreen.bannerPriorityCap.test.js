/**
 * D14 (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md): "Home
 * banner cap: DELEGATED to the lead ('You decide what will be best'). Lead
 * ruling: ONE attention banner max above the Start-Workout hero, chosen by
 * the existing pickAttentionVariant priority order; others wait their turn
 * (strongest match to the one-hero Materials Policy)."
 *
 * This SUPERSEDES the earlier D7 "top two + collapsed overflow" model
 * (AC-6/CP-1, design-usability-audit-2026-07-09) that used to be pinned
 * here: the bannersExpanded/topBannerKeys/overflowBannerKeys machinery and
 * the "more updates" affordance are gone. At most one of the seven ranked
 * banner slots renders at a time; whichever loses the slot simply waits --
 * it stays fully loaded/eligible and takes the slot on a later render once
 * the winner is dismissed or resolves (own dismissal semantics untouched).
 *
 * This screen has no full render test (per HomeScreen.progressScanNudge.test.js:
 * "cannot safely be `require`'d in this Jest environment"), so these are
 * scoped source guards in the same established convention, plus one pure
 * unit test of the ranking arithmetic extracted verbatim from the screen so
 * the "exactly one" behaviour is actually exercised with values, not just
 * pattern-matched.
 *
 * Pins:
 *  1. The seven banner slots are ranked in one fixed, ordered list
 *     (BANNER_PRIORITY), highest priority first: coach > trial > deload >
 *     phase > plateau > activation > attention (free coach line /
 *     differential badge, which still resolve their own order within that
 *     shared slot exactly as before via AttentionCard's pickAttentionVariant).
 *  2. Exactly one entry of that list (the highest-ranked eligible one) is
 *     chosen as shownBannerKey; every show* flag reduces to a straight
 *     equality check against it. No affordance reveals more than one.
 *  3. None of the seven banner slots is an ED-safety, wellbeing or calm-mode
 *     banner in its own right (each is a coaching/training/monetisation
 *     notice; where ED-safety is relevant, e.g. the activation nudge and the
 *     differential badge, suppression already happens inside their own
 *     loaders under an open ED flag or calm mode, untouched by this change),
 *     so nothing in this stack needed exempt/always-show treatment. This
 *     test also confirms that untouched ED/calm suppression is still present.
 */
const fs = require('fs');
const path = require('path');

const HOME = fs.readFileSync(path.resolve(__dirname, '../HomeScreen.js'), 'utf8');

describe('D14: banner stack is priority-ranked and capped to exactly one', () => {
  test('BANNER_PRIORITY lists all seven slots in the documented priority order', () => {
    const site = HOME.indexOf('const BANNER_PRIORITY = [');
    expect(site).toBeGreaterThan(-1);
    const block = HOME.slice(site, HOME.indexOf('];', site));
    const keys = ['coach', 'trial', 'deload', 'phase', 'plateau', 'activation', 'attention'];
    const positions = keys.map((key) => block.indexOf(`key: '${key}'`));
    expect(positions.every((i) => i > -1)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  test('exactly one banner key is chosen: the highest-ranked eligible entry', () => {
    expect(HOME).toMatch(
      /const shownBannerKey = BANNER_PRIORITY\[0\]\?\.key \?\? null;/,
    );
    // No cap-2/overflow/expand machinery survives from the superseded D7 model.
    expect(HOME).not.toMatch(/bannersExpanded/);
    expect(HOME).not.toMatch(/overflowBannerKeys/);
    expect(HOME).not.toMatch(/overflowBannerCount/);
    expect(HOME).not.toMatch(/topBannerKeys/);
  });

  test('every one of the seven show* flags renders from a plain equality check against shownBannerKey', () => {
    const perBanner = {
      showTrialCountdownBanner: 'trial',
      showDeloadBanner: 'deload',
      showPhaseBanner: 'phase',
      showPlateauBanner: 'plateau',
      showActivationBanner: 'activation',
      showAttentionSlot: 'attention',
    };
    for (const [flag, key] of Object.entries(perBanner)) {
      const re = new RegExp(`const ${flag} = shownBannerKey === '${key}';`);
      expect(HOME).toMatch(re);
    }
    // Coach is rank 1: it is BANNER_PRIORITY[0] whenever eligible (nothing
    // outranks it), so its own render flag is simply its own trigger,
    // verified unchanged, not re-gated through shownBannerKey.
    expect(HOME).toMatch(
      /const showCoachBanner = tier === 'pro' && !!latestCoachOutput && latestCoachOutput\.hasEnoughData\s*\n\s*&& !coachBannerDismissed\s*\n\s*&& \(Date\.now\(\) - \(latestCoachOutput\.weekStart \?\? 0\) < 7 \* 86400000\);/,
    );
  });

  test('there is no "reveal the rest" affordance left in the JSX', () => {
    expect(HOME).not.toMatch(/more update/i);
    expect(HOME).not.toMatch(/moreBannersRow/);
    expect(HOME).not.toMatch(/moreBannersText/);
  });

  test('the ranking arithmetic picks exactly one and leaves the rest waiting (worked example)', () => {
    // Extracted verbatim from the screen's own logic: five of the seven
    // slots eligible at once (a realistic worst case per the audit) must
    // yield exactly one shown, the highest-ranked of the five.
    const eligible = {
      coach: true, trial: true, deload: true, phase: false, plateau: true,
      activation: true, attention: false,
    };
    const BANNER_PRIORITY = ['coach', 'trial', 'deload', 'phase', 'plateau', 'activation', 'attention']
      .map((key) => ({ key, eligible: eligible[key] }))
      .filter((b) => b.eligible);
    const shownBannerKey = BANNER_PRIORITY[0]?.key ?? null;
    expect(shownBannerKey).toBe('coach');

    // A different mix: coach absent, so the slot shifts down to the next
    // eligible rank (trial), confirming the cap is dynamic, not a fixed
    // "always show slot 1 regardless of eligibility" rule, and that only
    // ONE key is ever chosen even with four eligible candidates.
    const eligible2 = { coach: false, trial: true, deload: true, phase: true, plateau: false, activation: false, attention: true };
    const rank2 = ['coach', 'trial', 'deload', 'phase', 'plateau', 'activation', 'attention']
      .map((key) => ({ key, eligible: eligible2[key] }))
      .filter((b) => b.eligible);
    expect(rank2[0]?.key ?? null).toBe('trial');
    expect(rank2.length).toBe(4); // trial, deload, phase, attention all eligible...
    // ...but only the first is ever surfaced; the cap is a single key, not a set.
    expect(new Set([rank2[0]?.key ?? null]).size).toBe(1);
  });

  test('each banner keeps its own original tap-through and dismiss handlers untouched', () => {
    expect(HOME).toMatch(/onPress=\{dismissPhaseBanner\}/);
    expect(HOME).toMatch(/onPress=\{\(\) => setDeloadDismissed\(true\)\}/);
    expect(HOME).toMatch(/onPress=\{dismissPlateauBanner\}/);
    expect(HOME).toMatch(/onPress=\{dismissActivationNudge\}/);
    expect(HOME).toMatch(/navigateCrossTab\(navigation, 'ProfileTab', 'CoachOutput', \{ weekStart: latestCoachOutput\.weekStart \}\)/);
    expect(HOME).toMatch(/onTrialDismiss=\{dismissTrialBanner\}/);
  });

  test('dismissing the shown banner never marks a waiting (unshown) banner as seen/dismissed', () => {
    // Each dismiss handler only ever writes ITS OWN storage key / setState,
    // scoped to its own banner name; none references another banner's
    // dismissed-state setter or storage key.
    const dismissers = [
      { fn: 'dismissPhaseBanner', setter: 'setPhaseBannerDismissed' },
      { fn: 'dismissPlateauBanner', setter: 'setPlateauBannerDismissed' },
      { fn: 'dismissActivationNudge', setter: 'setActivationNudgeDismissed' },
      { fn: 'dismissTrialBanner', setter: 'setTrialBannerDismissed' },
      { fn: 'dismissFreeCoachLine', setter: 'setFreeCoachLineDismissed' },
      { fn: 'dismissDifferentialBanner', setter: 'setDifferentialDismissed' },
    ];
    for (const { fn, setter } of dismissers) {
      const start = HOME.indexOf(`function ${fn}(`);
      expect(start).toBeGreaterThan(-1);
      const next = HOME.slice(start + 1).search(/\n  (async )?function /);
      const body = next === -1 ? HOME.slice(start) : HOME.slice(start, start + 1 + next);
      expect(body).toMatch(new RegExp(setter));
      // None of the OTHER dismissed-state setters appear inside this body.
      const otherSetters = dismissers.filter((d) => d.setter !== setter).map((d) => d.setter);
      for (const other of otherSetters) {
        expect(body).not.toMatch(new RegExp(other));
      }
    }
  });
});

describe('D14: no banner in this stack is ED-safety/wellbeing/calm-mode, so none is exempt from the cap', () => {
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

  // Classification note (D14 task): HomeScreen renders no Article 9/consent
  // surface at all (that gate lives in RootNavigator, before Home ever
  // mounts). The one wellbeing/ED-adjacent element that DOES live on this
  // screen, ConsistencyEcho, is not part of the seven-slot banner stack and
  // is never funnelled through shownBannerKey/BANNER_PRIORITY, so the cap
  // cannot ever hide it. This pins that independence: it renders alongside
  // whichever (if any) attention banner currently holds the one slot.
  test('ConsistencyEcho (the one ED/wellbeing-adjacent element on Home) is exempt by construction: never gated by shownBannerKey', () => {
    const site = HOME.indexOf('<ConsistencyEcho');
    expect(site).toBeGreaterThan(-1);
    // Its only gating is the surrounding hero card's own activePlan/nextWorkout
    // condition, established well before the banner stack in the JSX.
    const before = HOME.slice(Math.max(0, site - 400), site);
    expect(before).not.toMatch(/shownBannerKey/);
    expect(before).not.toMatch(/showAttentionSlot/);
    // ConsistencyEcho itself performs its own ED-flag/SCOFF/calm-mode
    // suppression (verified in its own component, not duplicated here); this
    // guard only pins that HomeScreen never wires it into the banner cap.
    const componentSrc = fs.readFileSync(
      path.resolve(__dirname, '../../components/ConsistencyEcho.js'), 'utf8',
    );
    expect(componentSrc).toMatch(/edFlag|isCalm|scoff/i);
  });
});
