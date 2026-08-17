/**
 * A3 (Wave 1) + S3 wiring guards: week-one proof surfaces, plus the ongoing
 * "since your check-in" runway that reuses the same ledger post-first-review.
 *
 * The ledger maths is behaviourally tested in coachLedger.test.js; these
 * scoped source guards pin the five screen integrations (device-walked, not
 * jest-mounted, per the repo convention). Each fails if its wiring is
 * reverted.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');
const HOME = read('../../screens/HomeScreen.js');
const COACH = read('../../screens/CoachOutputScreen.js');
const REVEAL = read('../../screens/ProSetupCompleteScreen.js');
const ONBOARD = read('../../screens/ProOnboardingScreen.js');

describe('A3: Home trial banner (day 0, pre-first-review)', () => {
  // RE-PINNED (Today truth repair, founder Ruling 2): Home no longer builds
  // or carries a coach ledger at all. Its rows were first-review THRESHOLD
  // counters, and Today must not present gate plumbing as ongoing coaching
  // observation. The banner LINE, its window, its dismissal and its
  // methodology CTA are unchanged and still pinned below.
  test('the trial banner carries its line and variant only, never a ledger', () => {
    expect(HOME).not.toMatch(/buildCoachLedger/);
    expect(HOME).toMatch(/setTrialBanner\(\{ line, variant \}\)/);
  });
  test('the window runs from day 0 to trial end, not day 2 to 7', () => {
    expect(HOME).toMatch(/trialDay < 0 \|\| trialDay > TRIAL_LENGTH_DAYS/);
    expect(HOME).not.toMatch(/trialDay < 2 \|\| trialDay > 7/);
  });
  // RE-PINNED (Campaign 22 Phase 2 Stage 1, FOUNDER-RULINGS-PHASE2 R3): the
  // everyday trial card (this A3 banner's render location) no longer
  // mounts on Home at all -- it rehomes to Profile/You (Stage 2 scope). The
  // AttentionCard component's own "no ledger rows, still the banner line"
  // contract is unchanged and still pinned directly against the component;
  // Home's half of the pin is now that it still COMPUTES the line (for
  // Stage 2 to consume) without rendering it.
  test('the attention card component itself renders NO ledger rows and still carries the banner line; Home still computes but no longer renders it', () => {
    const CARD = read('../../components/AttentionCard.js');
    expect(CARD).not.toMatch(/trialBanner\.ledger/);
    expect(CARD).not.toMatch(/trialLedger/);
    expect(CARD).toMatch(/trialBanner\.line/);
    expect(HOME).not.toMatch(/variant="trial"/);
    expect(HOME).toMatch(/setTrialBanner\(\{ line, variant \}\)/);
  });

  test('attention-card coach CTAs use contained neutral buttons, not loose amber text links', () => {
    const CARD = read('../../components/AttentionCard.js');
    // R9/D70 (2026-07-11): both CTAs moved off their hand-rolled bordered
    // rows onto the shared <Button variant="outline"> - which IS the
    // contained neutral treatment (surface bg, 1px border, textPrimary
    // ink, Button.js buildVariants). The pinned RULE is unchanged: a
    // contained neutral control, never a loose amber text link; it is now
    // enforced through the variant choice rather than byte-pinned local
    // styles (which are deleted).
    expect(CARD).toMatch(/variant="outline"[\s\S]{0,500}accessibilityLabel="How Precision Coaching works"/);
    expect(CARD).toMatch(/variant="outline"[\s\S]{0,500}accessibilityLabel="Pro reads the full story\. Learn about Pro coaching\."/);
    // The old style names may survive as layout-only margins; what must
    // never return is a hand-rolled box (background/border) on them.
    expect(CARD).not.toMatch(/trialMethodologyButton: \{[^}]*backgroundColor/);
    expect(CARD).not.toMatch(/freeCoachFooterButton: \{[^}]*backgroundColor/);
    expect(CARD).not.toContain('trialBannerLink: { ...type.caption, color: colors.primary');
  });
});

describe('A3: CoachOutput hold renders as a full receipt', () => {
  test('the receipt is built when the coach lacks data, cleared otherwise', () => {
    expect(COACH).toMatch(/if \(!result\.hasEnoughData\) \{/);
    expect(COACH).toMatch(/setHoldReceipt\(buildHoldReceipt\(\{/);
    expect(COACH).toMatch(/\} else \{\n        setHoldReceipt\(null\);/);
  });
  test('InsufficientDataView receives and renders the receipt', () => {
    expect(COACH).toMatch(/receipt=\{holdReceipt\}/);
    expect(COACH).toMatch(/receipt\?\.ledger\?\.rows\?\.length/);
    expect(COACH).toMatch(/receipt\?\.unlockLine/);
    // The engine's own hold message stays the rule when present.
    expect(COACH).toMatch(/receipt\?\.rule \?\? dataNote/);
  });

  test('next-week meal planning actions render as contained neutral buttons', () => {
    // Founder device report 2026-08-06 ("random look and feel, text only
    // links"): the hand-rolled planEditLink pills became the shared
    // <Button variant="outline"> - which IS the contained neutral
    // treatment, same re-anchor precedent as the AttentionCard test above.
    // The pinned RULE is unchanged: contained neutral controls, never
    // loose amber text links.
    expect(COACH).toMatch(/icon="calendar-outline"[\s\S]{0,300}accessibilityLabel="Plan a fresh week of meals"/);
    expect(COACH).toMatch(/icon="repeat-outline"[\s\S]{0,300}accessibilityLabel="Repeat last week's meals"/);
    expect(COACH).toMatch(/variant="outline"[\s\S]{0,300}icon="restaurant-outline"/);
    // The hand-rolled pill styles must not return.
    expect(COACH).not.toMatch(/planEditLink: \{/);
  });

  test('held-decision explainer renders as a contained neutral control', () => {
    // Same 2026-08-06 Button-outline re-anchor as the meal-planning test.
    expect(COACH).toMatch(/variant="outline"[\s\S]{0,300}icon="information-circle-outline"/);
    expect(COACH).toMatch(/accessibilityLabel="See how Precision Coaching decides"/);
    expect(COACH).not.toMatch(/heldLearnMore: \{/);
    expect(COACH).not.toMatch(/textDecorationLine: 'underline'/);
  });
});

describe('A3: plan reveal names the actual first-review date (OB-4)', () => {
  test('computes the date with the gate-honoured helper', () => {
    expect(REVEAL).toMatch(/firstReviewUnlockDate\(firstWeightAt, checkinDay\)/);
    expect(REVEAL).toMatch(/formatUnlockDate/);
  });
  test('the named date leads the check-in card copy, generic line as fallback', () => {
    expect(REVEAL).toMatch(/Your first weekly check-in opens on \$\{firstReviewLabel\} and takes about two minutes/);
    expect(REVEAL).not.toMatch(/first coaching decision lands/);
    expect(REVEAL).toMatch(/At the end of your training week, review how it went/);
  });
});

describe('S3 RETIRED: the Today runway is removed (founder Ruling 2)', () => {
  // The "since your check-in" runway rendered buildCoachLedger's rows under
  // "What your coach is reading". Those rows are threshold counters -
  // Math.min(weighIns7d, MIN_WEIGH_INS) means 3, 4, 5, 6 or 7 qualifying
  // mornings all read "3 of 3" - so they described a GATE, not what the
  // coach currently understands about the athlete. Removed from Today
  // entirely, with nothing put in its place.
  test('the runway component, its state and its loader are all gone', () => {
    expect(HOME).not.toMatch(/CoachDailyBrief/);
    expect(HOME).not.toMatch(/coachRunway/);
    expect(HOME).not.toMatch(/loadCoachRunway/);
    expect(fs.existsSync(path.resolve(__dirname, '../../components/CoachDailyBrief.js'))).toBe(false);
  });
  test('the pro-only load array no longer fetches it', () => {
    expect(HOME).toMatch(
      /\.\.\.\(tier === 'pro' \? \[loadTodayWeight\(\), loadLatestCoachOutput\(\), loadTrialBanner\(\)\] : \[\]\),/,
    );
  });
  test('the one-liner mesocycle brief stays gone too (founder call 2026-07-03)', () => {
    expect(HOME).not.toMatch(/dailyBriefLine/);
    expect(HOME).not.toMatch(/Training week\. Same targets today\./);
  });
});

describe('A3: wizard step 4 shows the provisional energy target', () => {
  test('read-only canonical authority preview, no revalidation-marker persistence', () => {
    expect(ONBOARD).toMatch(/const \[provisionalKcal, setProvisionalKcal\] = useState\(null\);/);
    expect(ONBOARD).toMatch(/await resolveEffectiveMaintenanceForUser\(user\.id,[\s\S]*?persistRevalidationMarker: false/);
    expect(ONBOARD).toMatch(/effectiveMaintenanceResidualKcal: authority\?\.resolved\?\.appliedResidualKcal \?\? 0/);
    expect(ONBOARD).toMatch(/setProvisionalKcal\(targets\?\.targetKcal \?\? null\);/);
  });
  test('renders as a provisional line under the focus dropdown', () => {
    expect(ONBOARD).toMatch(/Provisionally about \{provisionalKcal\.toLocaleString\('en-GB'\)\} kcal a day/);
  });
});
