/**
 * CoachProgress (the Progress landing's rows, now on the Coach tab) — Campaign
 * 23 Phase 2, Stage 3: presentation guards (PROGRESS-UX-SPEC.md §22 region
 * contract, §24 density budget, §6/§28 IA-2 week-boundary unification, §13/§27
 * "For You" retirement, §9 share budget). Source-level where mounting is
 * overkill, per the build brief. These EXTEND Stage 2's own guard suite
 * (CoachProgress.campaign23.guard.test.js) and useVisualPillar's own hook
 * suite (useVisualPillar.test.js) only where a hole was found after reading
 * both first — they do not re-pin what those suites already cover.
 *
 * D231 (app layout rework, batch 4) RE-POINTING: AnalyticsScreen.js is retired
 * and its rows (Your progress, Looking back) moved unchanged into
 * components/coach/CoachProgress.js, which the Coach screen draws; the guards
 * read that file now. The Visual pillar's suppression gate (a safety rule) is
 * pinned exactly as before, at its new home. The monthly recap banner (the
 * Moment card) is gone, so its two density pins are re-anchored below.
 */
import fs from 'fs';
import path from 'path';

const ANALYTICS_SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'coach', 'CoachProgress.js'), 'utf8');
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
    // D231: the fragment's closing is found whatever the indentation (the
    // block moved one level deeper with the component).
    const closeMatch = /<\/>\s*\)\}/.exec(ANALYTICS_SRC.slice(markerIdx));
    expect(closeMatch).not.toBeNull();
    const closeIdx = markerIdx + closeMatch.index;
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

  test('CoachProgress.js re-verified clean (Stage 2 already pins this; re-checked here alongside the hook)', () => {
    expect(ANALYTICS_SRC).not.toMatch(/insightsEngine/i);
    expect(ANALYTICS_SRC).not.toMatch(/runInsightsEngine/);
    expect(ANALYTICS_SRC).not.toMatch(/dismissInsight/);
    expect(ANALYTICS_SRC).not.toMatch(/getActiveInsights/);
  });
});

// ─── §24 density budget: primary evidence containers, source-counted ──────
//
// Per the recorded interpretation ("primary evidence cards, the doors list
// counts as one"): the rows' bordered-container SLOTS are counted at the source
// level —
//   1 Answer Block (always)
// + 1 doors list (R6, one NavGroup = one container, regardless of how many
//     NavRows it holds)
// = 2. RE-ANCHORED under D231 (app layout rework, batches 2 and 4): the
// plan-week card (with the volume strip inside it) and the three Recent-session
// cards moved to Train, and the monthly recap banner (the one Moment card) is
// gone: its invitation is the Recaps row's own sub line now. The old ceilings
// were 1 + 1 + 3 + 1 + 1 = 7 (before batch 2) and 1 + 1 + 1 = 3 (before
// batch 4).
describe('§24 density budget: primary evidence container ceiling, source-counted', () => {
  // RE-POINTED (D231, batch 2): the cap still lives in the hook; the three cards
  // it bounds are Train's Recent sessions now.
  test('recentSessions is capped at 3 by useProgressData (the Recent sessions ceiling, now on Train)', () => {
    expect(USE_PROGRESS_DATA_SRC).toMatch(/\.slice\(0, 3\)/);
  });

  // RE-POINTED (D231, batch 4): the Moments slot was recap-only, a single
  // conditional banner. The spec turns the banner into the Recaps row's sub
  // line, so there is no Moment card and no dismiss control any more; the
  // invitation is a string on the row, gated by the same window and the same
  // stored "opened" marker.
  test('the monthly recap invitation is the Recaps row\'s own sub line: no banner, no Moment card, no tonnage branch', () => {
    expect(ANALYTICS_SRC).not.toMatch(/Moments \(R5/);
    expect(ANALYTICS_SRC).not.toMatch(/recapCard\b|recapCardText|newspaper-outline"\s+size/);
    expect(ANALYTICS_SRC).not.toMatch(/tonnageLandmark/);
    expect(ANALYTICS_SRC).toMatch(/const recapInvite = recapUnlocked && !recapCardHidden\s*\? recapBannerText\(/);
    expect(ANALYTICS_SRC).toMatch(/sub=\{recapSub\}/);
    expect(ANALYTICS_SRC).toMatch(/const recapSub = recapInvite\s*\?\? /);
  });

  // RE-ANCHORED under D214 lane 3 (plan 7.1 item 6): the NavTile grid is
  // replaced by NavRows inside one NavGroup (the shared grouped list), still
  // one container however many rows it holds.
  test('the doors are one container (one NavGroup, arbitrarily many NavRows inside it); no NavTile grid remains', () => {
    expect(ANALYTICS_SRC).toMatch(/<NavGroup>/);
    expect((ANALYTICS_SRC.match(/<NavGroup>/g) || []).length).toBe(1);
    expect(ANALYTICS_SRC).not.toMatch(/NavTile|navGrid/);
  });

  test('the ceiling arithmetic: 1 + 1 = 2 (the plan-week card, its strip and the sessions moved to Train, the recap banner became a row line)', () => {
    const answerBlock = 1;
    const doorsList = 1; // counts as one, per the recorded interpretation
    expect(answerBlock + doorsList).toBe(2);
  });

  test('the component draws exactly one card-shaped container of its own: the Answer Block; no plan-week card, strip or session card', () => {
    expect((ANALYTICS_SRC.match(/<Card\b/g) || []).length).toBe(1);
    expect(ANALYTICS_SRC).toMatch(/<Card padding="none" surface="surfaceElevated"/);
    expect(ANALYTICS_SRC).not.toMatch(/volume-strip|PlanWeekCard|<VolumeStrip|<SessionCard|RecentSessionCard/);
  });

  // RE-ANCHORED under D231 (batch 4): the section opens with its label and the
  // Answer Block is the first container, the doors list the second and last.
  test('the Answer Block is the first container after the "Your progress" label, and the doors list follows it', () => {
    const labelIdx = ANALYTICS_SRC.indexOf('<SectionLabel>Your progress</SectionLabel>');
    const answerBlockMatch = ANALYTICS_SRC.match(/<Card [^>]*style=\{styles\.answerBlock\}>/);
    const answerBlockIdx = answerBlockMatch ? answerBlockMatch.index : -1;
    const doorsLabelIdx = ANALYTICS_SRC.indexOf('<SectionLabel>Looking back</SectionLabel>');
    expect(labelIdx).toBeGreaterThan(-1);
    expect(answerBlockIdx).toBeGreaterThan(labelIdx);
    expect(doorsLabelIdx).toBeGreaterThan(answerBlockIdx);
    // No Card-shaped container between the label and the Answer Block, or between the Answer Block and the doors.
    expect(ANALYTICS_SRC.slice(labelIdx, answerBlockIdx)).not.toMatch(/<Card\b/);
    expect(ANALYTICS_SRC.slice(answerBlockIdx + 1, doorsLabelIdx)).not.toMatch(/<Card\b/);
    expect(ANALYTICS_SRC).not.toContain('Evidence trail (R3');
  });
});
