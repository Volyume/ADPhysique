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

describe('A3: Home coach ledger (day 0, pre-first-review)', () => {
  test('the trial banner builds and carries the ledger', () => {
    expect(HOME).toMatch(/buildCoachLedger\(\{/);
    expect(HOME).toMatch(/setTrialBanner\(\{ line, variant, ledger \}\)/);
  });
  test('the window runs from day 0 to trial end, not day 2 to 7', () => {
    expect(HOME).toMatch(/trialDay < 0 \|\| trialDay > TRIAL_LENGTH_DAYS/);
    expect(HOME).not.toMatch(/trialDay < 2 \|\| trialDay > 7/);
  });
  test('ledger rows render with done/open marks', () => {
    // D3: the trial banner's JSX (ledger rows included) moved into the
    // merged AttentionCard; Home still owns the slot and passes the banner.
    const CARD = read('../../components/AttentionCard.js');
    expect(CARD).toMatch(/trialBanner\.ledger\?\.rows\?\.length/);
    expect(CARD).toMatch(/row\.done \? 'checkmark-circle' : 'ellipse-outline'/);
    expect(HOME).toMatch(/trialBanner=\{trialBanner\}/);
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
    // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): the JSX
    // call sites now read the live theme (color={t.colors.textSecondary})
    // instead of the frozen static import; the frozen `styles` block asserted
    // below (planEditLink/planEditLinkText) is byte-identical to before, so
    // this is a mechanical update, not a weakening.
    expect(COACH).toContain('Ionicons name="calendar-outline" size={14} color={t.colors.textSecondary}');
    expect(COACH).toContain('Ionicons name="repeat-outline" size={14} color={t.colors.textSecondary}');
    expect(COACH).toContain('Ionicons name="restaurant-outline" size={14} color={t.colors.textSecondary}');
    expect(COACH).toMatch(/planEditLink: \{[\s\S]*minHeight: 40,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(COACH).toContain('planEditLinkText: { ...type.label, color: colors.textPrimary }');
    expect(COACH).not.toContain('planEditLinkText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary }');
  });

  test('held-decision explainer renders as a contained neutral control', () => {
    // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): same
    // mechanical live-theme JSX update as the meal-planning test above.
    expect(COACH).toContain('Ionicons name="information-circle-outline" size={14} color={t.colors.textSecondary}');
    expect(COACH).toMatch(/heldLearnMore: \{[\s\S]*minHeight: 44,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(COACH).toContain('heldLearnMoreText: {\n    ...type.label,\n    color: colors.textPrimary,');
    expect(COACH).not.toMatch(/heldLearnMoreText: \{[\s\S]*textDecorationLine: 'underline'/);
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

describe('S3: Home coach daily brief + runway (ongoing, post-first-review)', () => {
  test('the runway is built from buildCoachLedger, wired into the pro-only load array', () => {
    expect(HOME).toMatch(/async function loadCoachRunway\(\)/);
    expect(HOME).toMatch(/buildCoachLedger\(\{\s*\n\s*weighIns7d, completedSessions, firstWeightAt, checkinDay,/);
    expect(HOME).toMatch(
      /\.\.\.\(tier === 'pro' \? \[loadTodayWeight\(\), loadLatestCoachOutput\(\), loadTrialBanner\(\), loadCoachRunway\(\)\] : \[\]\),/,
    );
  });
  test('calm mode / SCOFF / a failed flag-or-wellbeing read fold into the SAME edFlagOpen lever (mirrors useWeeklyStreak)', () => {
    expect(HOME).toMatch(
      /const edSuppressed = !!edFlag\s*\n\s*\|\| \(Number\.isFinite\(userProfile\?\.scoffScore\) && userProfile\.scoffScore >= 2\)\s*\n\s*\|\| wellbeing === 'read_failed'\s*\n\s*\|\| isCalm\(wellbeing\);/,
    );
    expect(HOME).toMatch(/edFlagOpen: edSuppressed,/);
  });
  test('the one-liner mesocycle brief is gone (removed on the founder call 2026-07-03)', () => {
    // The build-week variant said nothing and duplicated the hero chip's own
    // deload/build state, so the whole one-liner was removed; the runway is the
    // component now. Guard against it creeping back.
    expect(HOME).not.toMatch(/dailyBriefLine/);
    expect(HOME).not.toMatch(/Training week\. Same targets today\./);
  });
  test('CoachDailyBrief is placed below the plan card, runway gated to Pro and hidden during the trial window', () => {
    expect(HOME).toMatch(/import CoachDailyBrief from '\.\.\/components\/CoachDailyBrief';/);
    expect(HOME).toMatch(/<CoachDailyBrief ledger=\{tier === 'pro' && !trialBanner \? coachRunway : null\} \/>/);
  });
});

describe('A3: wizard step 4 shows the provisional energy target', () => {
  test('pure engine call, no persistence', () => {
    expect(ONBOARD).toMatch(/let provisionalKcal = null;/);
    expect(ONBOARD).toMatch(/provisionalKcal = t\?\.targetKcal \?\? null;/);
  });
  test('renders as a provisional line under the focus dropdown', () => {
    expect(ONBOARD).toMatch(/Provisionally about \{provisionalKcal\.toLocaleString\('en-GB'\)\} kcal a day/);
  });
});
