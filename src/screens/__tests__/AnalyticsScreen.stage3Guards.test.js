/**
 * AnalyticsScreen (Progress landing) — Campaign 23 Phase 2, Stage 3:
 * presentation guards (PROGRESS-UX-SPEC.md §22 region contract, §24 density
 * budget, §6/§28 IA-2 week-boundary unification, §13/§27 "For You"
 * retirement, §9 share budget). Source-level where mounting is overkill, per
 * the build brief. These EXTEND Stage 2's own guard suite
 * (AnalyticsScreen.campaign23.guard.test.js) and useVisualPillar's own hook
 * suite (useVisualPillar.test.js) only where a hole was found after reading
 * both first — they do not re-pin what those suites already cover.
 */
import fs from 'fs';
import path from 'path';

const ANALYTICS_SRC = fs.readFileSync(path.join(__dirname, '..', 'AnalyticsScreen.js'), 'utf8');
const USE_PROGRESS_DATA_SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'hooks', 'useProgressData.js'), 'utf8');

// ─── Visual pillar suppression (JSX shape, not just presence) ─────────────
//
// FOUNDER DECISION (fully free, no tier split): PillarRow's `proGated`
// variant ("Part of Pro" locked affordance) is retired outright, so there
// is no tier-gated content left for the suppression check to sit outside
// of. What remains, and what this closes the gap on: the suppression
// condition is still the sole gate around the entire Visual PillarRow
// block, so a suppressed user (ED flag/calm mode) sees nothing at all —
// never even the real evidence copy.
describe('Visual pillar suppression: the suppression check is the sole gate around the Visual PillarRow block', () => {
  test('the suppression condition is the sole gate around the entire Visual PillarRow block', () => {
    const marker = "{!visualPillar.suppressed && (";
    const markerIdx = ANALYTICS_SRC.indexOf(marker);
    expect(markerIdx).toBeGreaterThan(-1);
    // Exactly one Visual-pillar suppression gate on the landing.
    expect(ANALYTICS_SRC.indexOf(marker, markerIdx + 1)).toBe(-1);

    // Extract from the marker to the next top-level "))}" that closes this
    // fragment (the JSX shape is `{!visualPillar.suppressed && (\n  <>\n
    // ... <PillarRow ... />\n  </>\n)}`), and confirm the ENTIRE Visual
    // PillarRow call is nested inside it (i.e. every one of these tokens
    // appears strictly AFTER the opening marker and BEFORE the block's own
    // closing, never before).
    const closeIdx = ANALYTICS_SRC.indexOf('</>\n              )}', markerIdx);
    expect(closeIdx).toBeGreaterThan(markerIdx);
    const block = ANALYTICS_SRC.slice(markerIdx, closeIdx);

    // Re-pinned 2026-08-17 (founder device order): the pillar is labelled
    // "Progress photos" now — "Visual" was internal vocabulary.
    expect(block).toMatch(/label="Progress photos"/);
    expect(block).not.toMatch(/proGated/);
    expect(block).toMatch(/onPress=\{\(\) => navigation\.navigate\('ProgressPhotos'\)\}/);

    // Between the suppression marker and the PillarRow itself, the only
    // JSX is the fragment wrapper and the divider — no SECOND `&&` gate
    // sits between them narrowing visibility further. The row's mounting
    // is controlled by the suppression check alone, exactly once, exactly
    // here.
    const beforeLabel = block.slice(marker.length, block.indexOf('label="Progress photos"'));
    expect((beforeLabel.match(/&&/g) || []).length).toBe(0);
  });

  test('no proGated/"Part of Pro" affordance survives anywhere on the landing', () => {
    // Comments stripped: a retirement note may name the retired identifier
    // in prose without that counting as a surviving affordance.
    const code = ANALYTICS_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/proGated/);
    expect(code).not.toMatch(/Part of Pro/);
  });
});

// ─── Share-CTA budget (re-pinned 2026-08-17) ──────────────────────────────
//
// The founder device order of 2026-08-17 retired the tonnage-milestone
// Moment and with it the landing's single permitted share CTA, so the
// budget tightened from "exactly one, inside a Moment" to NONE.
// shareCopyPolish.guard.test.js still pins LiftProgressScreen's own
// relocated hero CTA (contained Button chrome), which is unaffected.
describe('Share-CTA budget: none on the landing (founder device order 2026-08-17)', () => {
  test('zero share CTAs on the landing (the milestone Moment that carried the single permitted one is retired)', () => {
    expect(ANALYTICS_SRC).not.toMatch(/Create share image/);
  });
});

// ─── Week-boundary unification: EVERY production caller, not just the
// landing (§6/§28 IA-2) ───────────────────────────────────────────────────
describe('Week-boundary unification: no production caller uses the rolling default beside a Monday-anchored surface', () => {
  test('buildWeeklyLoadSeries has exactly one production call site, and it passes weekBoundary: \'monday\'', () => {
    // Search every screen/lib source file (excluding tests) for callers.
    const glob = require('glob');
    const files = glob.sync('src/**/*.js', {
      cwd: path.join(__dirname, '..', '..', '..'),
      ignore: ['**/__tests__/**', '**/*.test.js'],
    });
    const callers = [];
    for (const f of files) {
      const abs = path.join(__dirname, '..', '..', '..', f);
      const src = fs.readFileSync(abs, 'utf8');
      if (/buildWeeklyLoadSeries\(/.test(src) && !/export function buildWeeklyLoadSeries/.test(src)) {
        callers.push({ file: f.replace(/\\/g, '/'), src });
      }
    }
    expect(callers.length).toBe(1);
    expect(callers[0].file).toBe('src/screens/LiftProgressScreen.js');
    // Re-pinned for D107-2 load semantics: the call now also passes the
    // per-exercise weight-meaning map; the LAW (one production caller,
    // Monday-anchored) is unchanged.
    expect(callers[0].src).toMatch(/buildWeeklyLoadSeries\(sets, \{ exerciseTypeById, loadSemanticsById, weekBoundary: 'monday' \}\)/);
  });

  test('the landing itself carries no rolling-week construct (re-verified, Stage 2 already pins this)', () => {
    expect(ANALYTICS_SRC).not.toMatch(/buildWeeklyLoadSeries/);
    expect(ANALYTICS_SRC).not.toMatch(/weekBoundary:\s*'rolling'/);
  });
});

// ─── "For You" retirement: BOTH files, not just the screen (§13/§27) ──────
describe('"For You" retirement covers useProgressData.js as well as the screen', () => {
  test('useProgressData.js carries no insight token at all', () => {
    expect(USE_PROGRESS_DATA_SRC).not.toMatch(/insight/i);
  });

  test('AnalyticsScreen.js re-verified clean (Stage 2 already pins this; re-checked here alongside the hook)', () => {
    expect(ANALYTICS_SRC).not.toMatch(/insightsEngine/i);
    expect(ANALYTICS_SRC).not.toMatch(/runInsightsEngine/);
    expect(ANALYTICS_SRC).not.toMatch(/dismissInsight/);
    expect(ANALYTICS_SRC).not.toMatch(/getActiveInsights/);
  });
});

// ─── §24 density budget: primary evidence containers, source-counted ──────
//
// Per the recorded interpretation ("primary evidence cards, the doors list
// counts as one"): the landing's bordered-container SLOTS are counted at
// the source level (not per-render, since several are mutually exclusive
// or count-capped by construction) —
//   1 plan-week card (PlanWeekCard, always once loaded)
//     (the volume strip, D214 lane 3's line 3 and bar, sits INSIDE the
//     plan-week card under a hairline, as the plan's mockup draws it:
//     PlanWeekCard takes children since the lead's landing fix, so the strip
//     is no container of its own)
// + 1 Answer Block (always)
// + 3 SessionCard slots MAX (R3, capped by useProgressData's own
//     `.slice(0, 3)` on recentSessions — verified below, not assumed)
// + 1 Moment card MAX (R5: recap only since 2026-08-17; a single
//     conditional — verified below)
// + 1 doors list (R6, one NavGroup = one container, regardless of how many
//     NavRows it holds)
// = 7. RE-ANCHORED under D214 lane 3 (plan 7.1) and the lead's landing fix:
// the plan-week object is new and comes first with the strip inside it, the
// old conditional VolumeSummaryStrip card is gone, and the NavTile grid is now
// one NavGroup, so the ceiling the spec's §24 stated (7) holds.
describe('§24 density budget: primary evidence container ceiling, source-counted', () => {
  test('recentSessions is capped at 3 by useProgressData (the R3 evidence-trail ceiling)', () => {
    expect(USE_PROGRESS_DATA_SRC).toMatch(/\.slice\(0, 3\)/);
  });

  test('R5 Moments is recap-only: a single conditional, no milestone branch (founder device order 2026-08-17)', () => {
    // Was `recap XOR milestone` via one ternary chain; the tonnage-milestone
    // Moment is retired, so the slot is `{!recapCardHidden ? (<recap...>) :
    // null}` — still a single conditional expression, so "at most one
    // Moment renders" remains a JS-semantics guarantee.
    const momentsIdx = ANALYTICS_SRC.indexOf('Moments (R5');
    expect(momentsIdx).toBeGreaterThan(-1);
    const nextSectionIdx = ANALYTICS_SRC.indexOf('Utilities (R6', momentsIdx);
    expect(nextSectionIdx).toBeGreaterThan(momentsIdx);
    const momentsBlock = ANALYTICS_SRC.slice(momentsIdx, nextSectionIdx);
    expect(momentsBlock).toMatch(/\{!recapCardHidden \? \(/);
    expect(momentsBlock).not.toMatch(/tonnageLandmark/);
    expect(momentsBlock).toMatch(/\) : null\}/);
    // Exactly one conditional in this block.
    expect((momentsBlock.match(/\{!recapCardHidden \?/g) || []).length).toBe(1);
  });

  // RE-ANCHORED under D214 lane 3 (plan 7.1 item 6): the NavTile grid is
  // replaced by NavRows inside one NavGroup (the shared grouped list), still
  // one container however many rows it holds.
  test('the doors are one container (one NavGroup, arbitrarily many NavRows inside it); no NavTile grid remains', () => {
    expect(ANALYTICS_SRC).toMatch(/<NavGroup>/);
    expect((ANALYTICS_SRC.match(/<NavGroup>/g) || []).length).toBe(1);
    expect(ANALYTICS_SRC).not.toMatch(/NavTile|navGrid/);
  });

  test('the ceiling arithmetic: 1 + 0 + 1 + 3 + 1 + 1 = 7 (the strip inside the plan-week card, D214)', () => {
    const planWeekCard = 1;
    const volumeStrip = 0; // inside the plan-week card: PlanWeekCard takes children
    const answerBlock = 1;
    const sessionCardsMax = 3;
    const momentMax = 1; // recap only (milestone retired 2026-08-17)
    const doorsList = 1; // counts as one, per the recorded interpretation
    expect(planWeekCard + volumeStrip + answerBlock + sessionCardsMax + momentMax + doorsList).toBe(7);
  });

  test('the strip is a plain View inside the plan-week card; the screen draws exactly two card-shaped containers of its own besides the sessions', () => {
    // The plan-week card is PlanWeekCard's own Card; this file's own: the
    // Answer Block and (per session) the SessionCard. The strip is a View the
    // PlanWeekCard renders as its child.
    expect((ANALYTICS_SRC.match(/<Card\b/g) || []).length).toBe(2);
    expect(ANALYTICS_SRC).toMatch(/<View testID="volume-strip"/);
    expect(ANALYTICS_SRC).not.toMatch(/<Card testID="volume-strip"/);
    expect(ANALYTICS_SRC).toMatch(/<PlanWeekCard summary=\{planWeekSummary\}>\s*\{hasData \? \(\s*<VolumeStrip/);
    expect(ANALYTICS_SRC).toMatch(/<Card padding="none" surface="surfaceElevated"/);
  });

  // RE-ANCHORED under D214 lane 3 (plan 7.1): "Your plan week" is now the first
  // object, so the pair above the fold is the plan-week card (with its strip)
  // and then the Answer Block; the Answer Block is no longer first.
  test('above-the-fold ceiling: the plan-week card is the first container, immediately after the header; the Answer Block is the next object', () => {
    const headerIdx = ANALYTICS_SRC.indexOf('Header (R1)');
    const planWeekIdx = ANALYTICS_SRC.indexOf('<PlanWeekCard summary={planWeekSummary}>');
    expect(planWeekIdx).toBeGreaterThan(headerIdx);
    // No Card-shaped container between the header and the plan-week card.
    expect(ANALYTICS_SRC.slice(headerIdx, planWeekIdx)).not.toMatch(/<Card\b/);
    // The Answer Block follows it (the strip sits between, under the card).
    const answerAfterPlan = ANALYTICS_SRC.search(/<Card [^>]*style=\{styles\.answerBlock\}>/);
    expect(answerAfterPlan).toBeGreaterThan(planWeekIdx);
  });

  test('above-the-fold ceiling: after the plan-week object the Answer Block is the first container before the evidence trail', () => {
    const headerIdx = ANALYTICS_SRC.indexOf('Header (R1)');
    // Anchored on styles.answerBlock, the stable identifier, rather than on
    // the full opening tag: the tag gained surface="surfaceElevated" (D3, the
    // hero is the screen's only elevated object) and a literal locator broke
    // on a prop change that does not touch the ordering rule this test pins.
    const answerBlockMatch = ANALYTICS_SRC.match(/<Card [^>]*style=\{styles\.answerBlock\}>/);
    const answerBlockIdx = answerBlockMatch ? answerBlockMatch.index : -1;
    const evidenceTrailIdx = ANALYTICS_SRC.indexOf('Evidence trail (R3');
    expect(headerIdx).toBeGreaterThan(-1);
    expect(answerBlockIdx).toBeGreaterThan(headerIdx);
    expect(evidenceTrailIdx).toBeGreaterThan(answerBlockIdx);
    // No second Card-shaped container between the header and the Answer
    // Block, and none between the Answer Block and the evidence trail
    // section (SessionCard is the first evidence card, matching the
    // spec's "answer block + first evidence card" above-the-fold pair).
    const between = ANALYTICS_SRC.slice(answerBlockIdx + 1, evidenceTrailIdx);
    expect(between).not.toMatch(/<Card\b/);
  });
});
