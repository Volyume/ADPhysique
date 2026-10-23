/**
 * D14 (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md) +
 * Campaign 22 Phase 2 Stage 1 (HOME-TODAY-UX-SPEC.md §13, the ranked
 * priority contract) RE-PIN.
 *
 * WHAT CHANGED. The seven-slot BANNER_PRIORITY cap (coach > trial > deload >
 * phase > plateau > activation > attention) is SPLIT:
 *  - coach, deload/recovery, phase, check-in and block-complete now compete
 *    for the single Today line (P1) via the pure `todayLineArbiter` resolver
 *    (see src/lib/home/__tests__/todayLineArbiter.test.js for that ranking's
 *    own adversarial coverage);
 *  - plateau and activation are UNCHANGED P3 content -- same one-banner cap
 *    mechanism as before, just with the senior slots removed from the array
 *    (they would otherwise still suppress plateau/activation whenever
 *    eligible, even though nothing renders their old JSX any more).
 *
 * FOUNDER DECISION (fully free, no tier split): the trial(-ending) occupant
 * and the free-tier/differential "attention" P3 slot are RETIRED along with
 * the trial and the tier split -- there is nothing left to upsell. The P3
 * stack is now plateau > activation only.
 *
 * This screen has no full render test (per HomeScreen.progressScanNudge.test.js:
 * "cannot safely be `require`'d in this Jest environment"), so these are
 * scoped source guards in the same established convention.
 *
 * Pins:
 *  1. BANNER_PRIORITY now lists exactly the two P3 slots, in order:
 *     plateau > activation.
 *  2. Exactly one entry of that list is chosen as shownBannerKey; every
 *     show* flag reduces to a straight equality check against it.
 *  3. coach/deload/phase/check-in/block-complete are NOT in the array --
 *     they feed the arbiter's facts instead, each carrying its exact
 *     original tap-through and dismissal.
 *  4. None of the two P3 triggers reads an ED flag or wellbeing/calm-mode
 *     signal directly (suppression already happens inside their own
 *     loaders, untouched by this change).
 *
 * RE-POINTED (D231, app layout rework batch 1, docs/app-rework-2026-10/SPEC.md
 * "Batch 1: Today" item 3): the activation banner LEFT the shared banner slot
 * for the one offer slot under the main card (src/lib/home/offerSlot.js:
 * coaching setup, the injuries question, "See who is training", the
 * getting-started nudge, one at a time). The plateau note stays at the bottom
 * on its own. So pins 1-3 below now say that: no BANNER_PRIORITY and no
 * shownBannerKey cap, one offer chosen by resolveOfferSlot, the plateau note
 * shown whenever it is eligible. Pin 4 (no ED/calm read in the triggers) is
 * kept as it was and still holds for both. The one-offer arithmetic itself is
 * driven for real in src/lib/home/__tests__/offerSlot.test.js.
 */
const fs = require('fs');
const path = require('path');

const HOME = fs.readFileSync(path.resolve(__dirname, '../HomeScreen.js'), 'utf8');

describe('D14 + Campaign 22 Phase 2 Stage 1 + D231: the old banner cap is gone, one offer at a time, plateau on its own', () => {
  test('the two-slot BANNER_PRIORITY cap no longer exists', () => {
    expect(HOME).not.toMatch(/BANNER_PRIORITY/);
    expect(HOME).not.toMatch(/shownBannerKey/);
    // The senior ranks and the retired attention slot are not resurrected.
    expect(HOME).not.toMatch(/key: '(coach|trial|deload|phase|attention)'/);
  });

  test('exactly one offer is chosen: the highest-ranked eligible entry, by resolveOfferSlot', () => {
    expect(HOME).toMatch(/import \{ resolveOfferSlot \} from '\.\.\/lib\/home\/offerSlot';/);
    expect(HOME).toMatch(/const shownOfferKey = resolveOfferSlot\(\{/);
    expect(HOME).not.toMatch(/bannersExpanded/);
    expect(HOME).not.toMatch(/overflowBannerKeys/);
    expect(HOME).not.toMatch(/overflowBannerCount/);
    expect(HOME).not.toMatch(/topBannerKeys/);
    // The four offers render from a plain equality check against the one key.
    for (const key of ['coachingSetup', 'howYouTrain', 'communityIntro', 'activation']) {
      expect(HOME).toMatch(new RegExp(`shownOfferKey === '${key}'`));
    }
  });

  test('the plateau note shows whenever it is eligible, on its own', () => {
    expect(HOME).toMatch(/const showPlateauBanner = plateauBannerEligible;/);
    expect(HOME).not.toMatch(/showAttentionSlot|showFreeCoachLine|showDifferentialBadge/);
  });

  test('there is no "reveal the rest" affordance left in the JSX', () => {
    expect(HOME).not.toMatch(/more update/i);
    expect(HOME).not.toMatch(/moreBannersRow/);
    expect(HOME).not.toMatch(/moreBannersText/);
  });

  test('the ranking arithmetic picks exactly one and leaves the rest waiting (worked example)', () => {
    const { resolveOfferSlot } = require('../../lib/home/offerSlot');
    expect(resolveOfferSlot({ howYouTrain: true, communityIntro: true, activation: true })).toBe('howYouTrain');
    expect(resolveOfferSlot({ communityIntro: false, activation: true })).toBe('activation');
    expect(resolveOfferSlot({})).toBeNull();
  });

  test('plateau and activation keep their own original tap-through and dismiss handlers untouched', () => {
    expect(HOME).toMatch(/onPress=\{dismissPlateauBanner\}/);
    expect(HOME).toMatch(/onPress=\{dismissActivationNudge\}/);
  });

  test('dismissing the shown P3 banner never marks a waiting (unshown) banner as seen/dismissed', () => {
    const dismissers = [
      { fn: 'dismissPlateauBanner', setter: 'setPlateauBannerDismissed' },
      { fn: 'dismissActivationNudge', setter: 'setActivationNudgeDismissed' },
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
    for (const key of ['blockComplete', 'coachDecision', 'checkIn', 'recovery', 'reEntry', 'phaseMismatch']) {
      expect(block).toMatch(new RegExp(`${key}: \\{`));
    }
    // FOUNDER DECISION (fully free, no trial, no expiry): trialEnding is
    // retired, not merely moved.
    expect(block).not.toMatch(/trialEnding: \{/);
  });

  test('D231: the plan update choice, the limitation decision and the plan-rebuilt note are arbiter facts too, each keeping its own tap and dismissal', () => {
    const site = HOME.indexOf('const todayLineItem = resolveTodayLine({');
    const block = HOME.slice(site, HOME.indexOf('  });', site));
    for (const key of ['planChoice', 'limitation', 'planNote']) {
      expect(block).toMatch(new RegExp(`${key}: \\{`));
    }
    // Plan update: the Plan update flow on tap, the stored "Not now" on dismiss.
    expect(block).toMatch(/planChoice: \{\s*\n\s*eligible: planChoiceProgrammeId != null,\s*\n\s*onPress: \(\) => \{ haptics\.selection\(\); navigateCrossTab\(navigation, 'PlansTab', 'PlanUpdate'\); \},\s*\n\s*onDismiss: dismissPlanChoice,/);
    // Limitation decision: opens Injuries & limitations, as the two rows did.
    expect(block).toMatch(/limitation: \{[\s\S]*?navigation\.navigate\('HowYouTrain'\)/);
    // Plan-rebuilt note: opens the sheet; its "Got it" is the only retirement.
    expect(block).toMatch(/planNote: \{\s*\n\s*eligible: planRebuildNote != null,\s*\n\s*onPress: \(\) => \{ haptics\.selection\(\); setShowPlanRebuildNote\(true\); \},/);
  });

  test('coach decision keeps its exact original tap-through, dismissal key and store mirror', () => {
    // FOUNDER DECISION (fully free, no tier split): the coach decision
    // banner is no longer Pro-gated -- every account gets it.
    expect(HOME).toMatch(
      /const showCoachBanner = !!latestCoachOutput && latestCoachDecisionComplete\s*\n\s*&& !coachBannerDismissed\s*\n\s*&& \(Date\.now\(\) - \(latestCoachOutput\.weekStart \?\? 0\) < 7 \* 86400000\);/,
    );
    // Still its own trigger, not routed through shownBannerKey. Item 6
    // (D141) replaced the bare showCoachBanner mirror into the store with a
    // durable per-user "last viewed" marker (src/lib/home/unseenCoachChange.js)
    // so the You-tab badge no longer expires on this banner's 7-day window
    // or clears on this banner's own dismiss control -- see
    // CoachHomeUnseenMarker.item6.guard.test.js for that wiring's own pin.
    expect(HOME).toMatch(/setHasUnseenCoachChange\(resolveHasUnseenCoachChange\(\{/);
    expect(HOME).not.toMatch(/setHasUnseenCoachChange\(showCoachBanner\)/);
    expect(HOME).toMatch(/navigateCrossTab\(navigation, 'ProfileTab', 'CoachOutput', \{ weekStart: latestCoachOutput\.weekStart \}\)/);
    expect(HOME).toMatch(/AsyncStorage\.setItem\(`@volyume_coach_banner_dismissed_\$\{latestCoachOutput\.weekStart\}`, 'true'\)\.catch\(\(\) => \{\}\);/);
  });

  // RE-ANCHORED D224 (founder order 2026-10-11, on Today: "Remove the
  // recovery data from today. I don't want it there full stop."): the
  // fatigue-based recovery-week suggestion is a recovery reading; it leaves
  // Today (Progress keeps its own deload alert).
  test('the deload suggestion is not on Today (D224)', () => {
    expect(HOME).not.toMatch(/deloadEligible|onDeloadPress|onDeloadDismiss|deloadBannerEligible/);
  });

  test('the phase mismatch keeps its exact original dismissal function', () => {
    expect(HOME).toMatch(/onDismiss: dismissPhaseBanner,/);
  });

  test('FOUNDER DECISION (fully free, no trial, no expiry): trial ending is retired, not re-derived', () => {
    expect(HOME).not.toMatch(/trialEndsAtMs/);
    expect(HOME).not.toMatch(/const trialEndMs/);
    expect(HOME).not.toMatch(/daysRemaining\(userProfile\)/);
    expect(HOME).not.toMatch(/variant="trial"/);
  });

  test('resume suppression: the arbiter is told about the active workout', () => {
    expect(HOME).toMatch(/hasActiveWorkout,\s*\n\s*\}\);/);
  });
});

describe('D14: no P3 trigger is ED-safety/wellbeing/calm-mode, so none is exempt from the cap', () => {
  test('neither P3 eligibility trigger reads an ED flag or wellbeing/calm-mode signal directly', () => {
    const site = HOME.indexOf('const plateauBannerEligible = !!plateauBanner');
    const end = HOME.indexOf('const showPlateauBanner = plateauBannerEligible;');
    expect(site).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(site);
    const triggerBlock = HOME.slice(site, end);
    expect(triggerBlock).not.toMatch(/edFlag|isCalm|WELLBEING_KEY|openEdPatternFlag/i);
  });

  test('ED-flag/calm-mode suppression that already existed for the activation nudge is untouched (its loader, not its render gate)', () => {
    const activationLoader = HOME.slice(HOME.indexOf('async function loadActivationNudge'));
    // D228 item 2: the same three-way OR through the one composition.
    expect(activationLoader.slice(0, 1000)).toMatch(/deriveSafetyState\(\{ mode: wellbeing, edFlag \}\)\.suppressed/);
  });

  test('the offer slot governs only the four offers, and no ED/wellbeing surface was funnelled into it', () => {
    const declared = ['coachingSetup', 'howYouTrain', 'communityIntro', 'activation'];
    const gated = HOME.match(/shownOfferKey === '(\w+)'/g) || [];
    expect(gated.length).toBeGreaterThan(0);
    for (const line of gated) {
      expect(declared).toContain(line.match(/=== '(\w+)'/)[1]);
    }
    const { OFFER_SLOT_ORDER } = require('../../lib/home/offerSlot');
    expect([...OFFER_SLOT_ORDER]).toEqual(declared);
  });

  test('FOUNDER DECISION (fully free, no tier split): the differential paywall loader is retired from Home', () => {
    expect(HOME).not.toMatch(/loadDifferentialBanner/);
    expect(HOME).not.toMatch(/loadFreeCoachLine/);
  });
});
