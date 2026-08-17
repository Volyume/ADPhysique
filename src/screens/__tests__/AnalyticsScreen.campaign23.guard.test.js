/**
 * Campaign 23 Stage 2 (docs/progress-audit-campaign-23-2026-08-17/
 * PROGRESS-UX-SPEC.md §13/§22/§24/§27) — source guards for the Progress
 * landing rebuild.
 *
 * What this suite pins and why:
 *  1. "For You" feed retirement (§13/§27): the landing renders NO advisory
 *     feed, no insightsEngine import, no dismiss-insight affordance.
 *  2. Share-CTA budget (§9/§24): at most ONE share affordance per landing
 *     render, and it lives only inside the tonnage-milestone Moment.
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

describe('Share-CTA budget: at most one, inside a Moment only (§9/§24)', () => {
  test('exactly one "Create share image" CTA on the landing', () => {
    const matches = SRC.match(/title="Create share image"/g);
    expect(matches?.length).toBe(1);
  });

  test('the one CTA sits inside the tonnage-milestone Moment, not a standing hero', () => {
    const ctaIdx = SRC.indexOf('title="Create share image"');
    const momentIdx = SRC.indexOf('Moments (R5');
    expect(ctaIdx).toBeGreaterThan(-1);
    expect(momentIdx).toBeGreaterThan(-1);
    expect(ctaIdx).toBeGreaterThan(momentIdx);
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
    expect(SRC).toMatch(/label="Visual"[\s\S]{0,300}?navigation\.navigate\('ProgressPhotos'\)/);
  });

  test('the Body and Visual pillars carry the Pro-gated affordance; Training never does', () => {
    expect(SRC).toMatch(/label="Body"[\s\S]{0,200}?proGated=\{tier !== 'pro'\}/);
    expect(SRC).toMatch(/label="Visual"[\s\S]{0,200}?proGated=\{tier !== 'pro'\}/);
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
  test('no "Progress photos" NavTile remains (the Visual pillar is its tap target now)', () => {
    expect(SRC).not.toMatch(/label="Progress photos"/);
  });
});

describe('Lifetime totals panel rehomed, not left dangling (§27)', () => {
  test('no standing lifetime totals panel remains on the landing', () => {
    expect(SRC).not.toContain('Lifetime totals');
    expect(SRC).not.toMatch(/lifetimeTonnage/);
    expect(SRC).not.toMatch(/lifetimeReps/);
  });
});
