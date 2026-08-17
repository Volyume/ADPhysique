/**
 * Campaign 23 Stage 2 (docs/progress-audit-campaign-23-2026-08-17/
 * PROGRESS-UX-SPEC.md §13/§22/§24/§27) — source guards for the Progress
 * landing rebuild.
 *
 * What this suite pins and why:
 *  1. "For You" feed retirement (§13/§27): the landing renders NO advisory
 *     feed, no insightsEngine import, no dismiss-insight affordance.
 *  2. Share-CTA budget: ZERO share affordances on the landing. (§9/§24
 *     originally allowed exactly one, inside the tonnage-milestone Moment;
 *     the founder device order of 2026-08-17 retired that Moment entirely,
 *     so the budget tightened from one to none. Share entry points live on
 *     the evidence detail screens and Recaps.)
 *  3. Week-boundary unification (§6/§28 IA-2): the landing carries no
 *     rolling-week series any more (the hero that disagreed with the
 *     Monday-anchored volume strip moved to LiftProgressScreen), so the one
 *     surviving "this week" construct (the volume strip) is the only week
 *     definition left on the page.
 *  4. The Answer Block (§21/§22 R2) exists with all three pillars, no
 *     imperative training/nutrition copy, no standing share CTA on it.
 *  5. The Visual pillar's fail-closed wiring is present on the screen
 *     itself (the hook-level fail-closed contract is pinned separately in
 *     useVisualPillar.test.js).
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'AnalyticsScreen.js'), 'utf8');

describe('"For You" feed retirement (§13/§27)', () => {
  test('no insightsEngine import, no runInsightsEngine/dismissInsight call', () => {
    expect(SRC).not.toMatch(/insightsEngine/i);
    expect(SRC).not.toMatch(/runInsightsEngine/);
    expect(SRC).not.toMatch(/dismissInsight/);
  });

  test('no "For you" section, no InsightRow', () => {
    expect(SRC).not.toContain('For you');
    expect(SRC).not.toMatch(/function InsightRow/);
    expect(SRC).not.toMatch(/<InsightRow/);
  });

  test('no severity/warning-styled advisory grammar left on the landing', () => {
    expect(SRC).not.toMatch(/buildSeverityStyle/);
  });
});

describe('Share-CTA budget: none on the landing (founder device order 2026-08-17)', () => {
  test('zero "Create share image" CTAs on the landing', () => {
    expect(SRC).not.toMatch(/Create share image/);
  });

  test('the tonnage-milestone Moment is fully retired (state, builder, lib import)', () => {
    // Founder device order 2026-08-17: "Get rid of this landmark thing" —
    // the milestone row, its loader effect and its share-card builder are
    // gone; the R5 Moment slot is recap-only.
    expect(SRC).not.toMatch(/tonnageLandmark/);
    expect(SRC).not.toMatch(/makeTonnageCard/);
    expect(SRC).not.toMatch(/from '\.\.\/lib\/tonnageMilestone'/);
    expect(SRC).not.toMatch(/getLifetimeTonnage/);
    expect(SRC).not.toMatch(/milestoneRow/);
  });

  test('no standing Training Load hero share CTA remains (relocated to LiftProgressScreen)', () => {
    expect(SRC).not.toMatch(/makeTrainingLoadCard/);
    expect(SRC).not.toContain('trainingLoadCtaRow');
  });
});

describe('Week-boundary unification (§6/§28 IA-2)', () => {
  test('no rolling-week series builder remains on the landing', () => {
    expect(SRC).not.toMatch(/buildWeeklyLoadSeries/);
    expect(SRC).not.toMatch(/buildWeeklySessionCounts/);
  });

  test('the volume strip is the one surviving "this week" construct, still Monday-anchored', () => {
    expect(SRC).toContain("This week's volume");
  });
});

describe('The Answer Block (§21/§22 R2)', () => {
  test('all three pillar rows are wired, tapping to their evidence detail screens', () => {
    expect(SRC).toMatch(/label="Training"[\s\S]{0,300}?navigation\.navigate\('LiftProgress'\)/);
    expect(SRC).toMatch(/label="Body"[\s\S]{0,300}?navigation\.navigate\('BodyMetrics'\)/);
    // Founder device order 2026-08-17: the third pillar is labelled
    // "Progress photos" (the feature's own name) — "Visual" was internal
    // architecture vocabulary users could not decode.
    expect(SRC).toMatch(/label="Progress photos"[\s\S]{0,300}?navigation\.navigate\('ProgressPhotos'\)/);
  });

  test('the Body and Progress photos pillars carry the Pro-gated affordance; Training never does', () => {
    expect(SRC).toMatch(/label="Body"[\s\S]{0,200}?proGated=\{tier !== 'pro'\}/);
    expect(SRC).toMatch(/label="Progress photos"[\s\S]{0,200}?proGated=\{tier !== 'pro'\}/);
  });

  test('the Visual pillar row is gated on the fail-closed suppression flag', () => {
    expect(SRC).toMatch(/!visualPillar\.suppressed/);
  });

  test('no imperative training/nutrition directive strings on the landing (§14)', () => {
    expect(SRC).not.toMatch(/add (a |two |2\.5 ?kg )?(sets?|weight)/i);
    expect(SRC).not.toMatch(/consider deloading/i);
  });
});

describe('Progress photos tile is not duplicated in the utilities grid (§22 R6 excludes it)', () => {
  test('no "Progress photos" NavTile remains (the pillar row is its tap target now)', () => {
    // Re-pinned 2026-08-17: the pillar row itself is now labelled
    // "Progress photos" (founder device order), so the old "no such label
    // anywhere" pin would false-fail. The guard's intent — the utilities
    // grid must not duplicate the pillar's destination — is pinned
    // directly: no NavTile carries it.
    expect(SRC).not.toMatch(/<NavTile[^>]*label="Progress photos"/);
    const labelCount = (SRC.match(/label="Progress photos"/g) || []).length;
    expect(labelCount).toBe(1); // the pillar row, nowhere else
  });
});

describe('Lifetime totals panel rehomed, not left dangling (§27)', () => {
  test('no standing lifetime totals panel remains on the landing', () => {
    expect(SRC).not.toContain('Lifetime totals');
    expect(SRC).not.toMatch(/lifetimeTonnage/);
    expect(SRC).not.toMatch(/lifetimeReps/);
  });
});
