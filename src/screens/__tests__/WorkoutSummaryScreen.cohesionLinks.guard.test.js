/**
 * CO-3 (cohesion audit 2026-07-09,
 * docs/ux-world-class-audit-2026-07-09/cohesion-01-flow-language.md):
 * workout completion never gestured onward to Progress or Coach. Source
 * guards, in the repo's own convention for this screen
 * (WorkoutSummaryScreen.feedback.guard.test.js), because the screen's real
 * data loads (SQLite, wellbeing reads, mesocycle week) make a full render
 * harness fragile; these pin the exact condition expressions, copy and
 * navigation targets against the real source so any regression here fails
 * loudly rather than silently reintroducing the dead-end.
 */
const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'WorkoutSummaryScreen.js'), 'utf8');

describe('CO-3: onward links render only under a genuinely relevant state', () => {
  test('the Progress link fires on a PR or a strong 4-week volume verdict, never in read-only', () => {
    expect(SOURCE).toContain("const firstPrWithExercise = detectedPRs.find(pr => pr?.exerciseId) || null;");
    expect(SOURCE).toMatch(
      /const showProgressLink = !readOnly\s*&&\s*\(!!firstPrWithExercise \|\| comparison\?\.verdict === 'best' \|\| comparison\?\.verdict === 'up'\);/
    );
  });

  test('the Coach link reuses the SAME unseen-coach-change signal as the tab badge, never a generic upsell', () => {
    // Reuses T2's hasUnseenCoachChange (useAppStore), the exact flag that
    // drives the Coach-tab icon badge -- not a new independent condition.
    expect(SOURCE).toContain('hasUnseenCoachChange: s.hasUnseenCoachChange,');
    expect(SOURCE).toContain("const showCoachLink = !readOnly && tier === 'pro' && hasUnseenCoachChange;");
  });

  test('both links are gated out entirely on the read-only history view', () => {
    expect(SOURCE).toMatch(/const showProgressLink = !readOnly/);
    expect(SOURCE).toMatch(/const showCoachLink = !readOnly && tier === 'pro'/);
  });

  test('the Coach link never renders for a free-tier user, even if the store flag were somehow stale', () => {
    // Defence in depth, matching this screen's own pattern for the partner
    // beat (tier === 'pro' re-checked locally rather than trusting a single
    // upstream gate). The route itself is also withProGuard-wrapped in
    // RootNavigator.js, so this is a belt-and-braces check, not the only one.
    const site = SOURCE.indexOf("const showCoachLink =");
    expect(site).toBeGreaterThan(-1);
    expect(SOURCE.slice(site, site + 120)).toMatch(/tier === 'pro'/);
  });
});

describe('CO-3: onward links use the quiet CO-2 link register, not a banner', () => {
  test('renders as a pill row (onwardLink), reusing the planEditLink/volumeWhyToggle register', () => {
    expect(SOURCE).toMatch(/onwardLinksRow: \{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing\.sm \}/);
    expect(SOURCE).toMatch(/onwardLink: \{[\s\S]*borderRadius: radius\.full,[\s\S]*backgroundColor: colors\.surface2,/);
    expect(SOURCE).toContain('onwardLinkText: { ...type.label, color: colors.textPrimary }');
  });

  test('the onward-link row style is never amber/primary tinted', () => {
    const linkStyle = SOURCE.match(/onwardLink: \{[\s\S]*?\n  \},/)?.[0] || '';
    const textStyle = SOURCE.match(/onwardLinkText: \{[^}]*\}/)?.[0] || '';
    expect(linkStyle).not.toContain('colors.primary');
    expect(linkStyle).not.toContain('colors.primaryBg');
    expect(textStyle).not.toContain('colors.primary');
  });

  test('both link rows are conditionally rendered, only inside the showProgressLink/showCoachLink checks', () => {
    expect(SOURCE).toContain('{(showProgressLink || showCoachLink) && (');
    expect(SOURCE).toContain('{showProgressLink && (');
    expect(SOURCE).toContain('{showCoachLink && (');
  });
});

describe('CO-3: training-only copy, no weight/body/intake references', () => {
  test('Progress link copy names the lift, never a number of kg or a body metric', () => {
    expect(SOURCE).toContain(
      "? `See your progress on ${firstPrWithExercise.exerciseName || firstPrWithExercise.exercise || 'that lift'}`"
    );
    expect(SOURCE).toContain(": 'See your progress';");
  });

  test('Coach link copy is the calm, generic "this week\'s review" line', () => {
    expect(SOURCE).toContain('See this week&apos;s coaching review');
    expect(SOURCE).toContain('accessibilityLabel="See this week\'s coaching review"');
  });

  test('neither link string mentions weight, calories, kg or intake', () => {
    const block = SOURCE.slice(
      SOURCE.indexOf('{(showProgressLink || showCoachLink) && ('),
      SOURCE.indexOf('{/* Photos LOOP-3'),
    );
    expect(block.toLowerCase()).not.toMatch(/kg\b|calorie|weight|intake|bodyweight/);
  });
});

describe('CO-3: navigation targets are pinned to the correct destinations', () => {
  test('a PR routes to that exercise\'s own trend (ExerciseDetail), matching the existing PR deep-link pattern', () => {
    expect(SOURCE).toContain('function handleSeeProgress() {');
    const site = SOURCE.indexOf('function handleSeeProgress() {');
    const body = SOURCE.slice(site, site + 400);
    expect(body).toContain("if (firstPrWithExercise) {");
    expect(body).toContain(
      "navigateCrossTab(navigation, 'ProgressTab', 'ExerciseDetail', { exerciseId: firstPrWithExercise.exerciseId });"
    );
    expect(body).toContain("navigateCrossTab(navigation, 'ProgressTab', 'LiftProgress');");
  });

  test('the Progress link calls handleSeeProgress, not a hand-rolled navigate', () => {
    expect(SOURCE).toContain('onPress={handleSeeProgress}');
  });

  test('the Coach link routes via navigateCrossTab to ProfileTab -> CoachOutput, the withProGuard-wrapped route', () => {
    expect(SOURCE).toContain(
      "onPress={() => navigateCrossTab(navigation, 'ProfileTab', 'CoachOutput')}"
    );
  });

  test('neither new link uses a raw getParent().navigate (navigateCrossTab.guard.test.js convention)', () => {
    const block = SOURCE.slice(
      SOURCE.indexOf('{(showProgressLink || showCoachLink) && ('),
      SOURCE.indexOf('{/* Photos LOOP-3'),
    );
    expect(block).not.toMatch(/getParent\(\)\??\.navigate\(/);
  });
});
