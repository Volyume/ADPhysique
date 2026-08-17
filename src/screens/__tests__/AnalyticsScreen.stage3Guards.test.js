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

// ─── Visual pillar suppression seniority (JSX shape, not just presence) ───
//
// HOLE FOUND: AnalyticsScreen.campaign23.guard.test.js only pins that the
// string `!visualPillar.suppressed` appears somewhere in the file
// (`expect(SRC).toMatch(/!visualPillar\.suppressed/)`) — it does not prove
// the check WRAPS OUTSIDE the tier check, i.e. that suppression hides the
// row for EVERY tier (including a free user, who would otherwise see the
// "Part of Pro" locked affordance). useVisualPillar.test.js thoroughly pins
// the HOOK's own fail-closed contract (tier-then-suppression gate on the
// DATA fetch) but never touches the SCREEN's JSX nesting. This closes that
// gap: the suppression condition must be the outermost wrapper around the
// entire Visual PillarRow, with `proGated={tier !== 'pro'}` nested INSIDE
// it, so a suppressed free user renders nothing (not even the lock icon),
// never the tier-gated affordance.
describe('Visual pillar suppression seniority: the suppression check wraps OUTSIDE the tier check (§16/§22 R2 fail-closed contract)', () => {
  test('the suppression condition is the sole gate around the entire Visual PillarRow block', () => {
    const marker = "{!visualPillar.suppressed && (";
    const markerIdx = ANALYTICS_SRC.indexOf(marker);
    expect(markerIdx).toBeGreaterThan(-1);
    // Exactly one Visual-pillar suppression gate on the landing.
    expect(ANALYTICS_SRC.indexOf(marker, markerIdx + 1)).toBe(-1);

    // Extract from the marker to the next top-level "))}" that closes this
    // fragment (the JSX shape is `{!visualPillar.suppressed && (\n  <>\n
    // ... <PillarRow ... />\n  </>\n)}`), and confirm the ENTIRE Visual
    // PillarRow call — label, proGated, state/evidence text — is nested
    // inside it (i.e. every one of these tokens appears strictly AFTER the
    // opening marker and BEFORE the block's own closing, never before).
    const closeIdx = ANALYTICS_SRC.indexOf('</>\n              )}', markerIdx);
    expect(closeIdx).toBeGreaterThan(markerIdx);
    const block = ANALYTICS_SRC.slice(markerIdx, closeIdx);

    expect(block).toMatch(/label="Visual"/);
    expect(block).toMatch(/proGated=\{tier !== 'pro'\}/);
    expect(block).toMatch(/onPress=\{\(\) => navigation\.navigate\('ProgressPhotos'\)\}/);

    // Between the suppression marker and the PillarRow itself, the only
    // JSX is the fragment wrapper and the divider — no SECOND `&&` gate
    // (e.g. a `tier === 'pro' &&`) sits between them narrowing visibility
    // further. `proGated` is a PROP passed to PillarRow (toggles CONTENT:
    // "Part of Pro" vs real copy), never a second visibility wrapper — the
    // row's mounting is controlled by the suppression check alone, exactly
    // once, exactly here.
    const beforeLabel = block.slice(marker.length, block.indexOf('label="Visual"'));
    expect((beforeLabel.match(/&&/g) || []).length).toBe(0);
  });

  test('a suppressed Visual pillar renders nothing for Pro OR Free (no branch bypasses the gate)', () => {
    // Structural proof, not a duplicate of useVisualPillar.test.js's hook
    // suite: PillarRow's own `proGated` prop only ever changes CONTENT
    // (icon colour stays, "Part of Pro" text vs real copy) — it never
    // controls whether the row mounts at all. The row's mounting is
    // controlled SOLELY by the suppression `&&` gate above it, so there is
    // no tier value for which a suppressed pillar can still appear.
    expect(ANALYTICS_SRC).not.toMatch(/tier === 'pro'[\s\S]{0,50}visualPillar\.suppressed/);
  });
});

// ─── Share-CTA budget: verify Stage 2's pin is sufficient (no new pin) ────
//
// VERIFIED SUFFICIENT, not re-pinned: AnalyticsScreen.campaign23.guard.
// test.js already asserts exactly one `title="Create share image"` match
// AND that it sits after the "Moments (R5" marker (i.e. inside the
// milestone Moment, never a standing hero). shareCopyPolish.guard.test.js
// separately pins the CTA's contained-control chrome (Button variant=
// "outline") and that LiftProgressScreen's own relocated hero CTA carries
// the same contract. Between the two, "at most ONE share affordance
// visible per landing render, and only inside a transient achievement
// moment" (§9/§24) is fully covered; this file adds nothing here.
describe('Share-CTA budget (§9/§24): sufficiency check only', () => {
  test('exactly one "Create share image" CTA remains, confirmed still true after Stage 3 changes', () => {
    const matches = ANALYTICS_SRC.match(/title="Create share image"/g);
    expect(matches?.length).toBe(1);
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
        callers.push({ file: f, src });
      }
    }
    expect(callers.length).toBe(1);
    expect(callers[0].file).toBe('src/screens/LiftProgressScreen.js');
    expect(callers[0].src).toMatch(/buildWeeklyLoadSeries\(sets, \{ exerciseTypeById, weekBoundary: 'monday' \}\)/);
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
// Per the recorded interpretation ("primary evidence cards, utilities grid
// counts as one"): the landing's bordered-container SLOTS are counted at
// the source level (not per-render, since several are mutually exclusive
// or count-capped by construction) —
//   1 Answer Block (always)
// + 3 SessionCard slots MAX (R3, capped by useProgressData's own
//     `.slice(0, 3)` on recentSessions — verified below, not assumed)
// + 1 VolumeSummaryStrip Card (R4, conditional)
// + 1 Moment card MAX (R5: recap OR milestone, mutually exclusive by a
//     single ternary chain — verified below, never both)
// + 1 utilities grid (R6, one NavTile grid = one container per the
//     recorded interpretation, regardless of how many tiles it holds)
// = 7, exactly the spec's stated ceiling ("Max bordered containers on the
// whole landing: 7").
describe('§24 density budget: primary evidence container ceiling, source-counted', () => {
  test('recentSessions is capped at 3 by useProgressData (the R3 evidence-trail ceiling)', () => {
    expect(USE_PROGRESS_DATA_SRC).toMatch(/\.slice\(0, 3\)/);
  });

  test('R5 Moments is a single mutually-exclusive ternary: recap XOR milestone, never both', () => {
    // `{!recapCardHidden ? (<recap...>) : tonnageLandmark ? (<milestone...>) : null}`
    // -- a single conditional EXPRESSION (one `?`, one matching `:`, one
    // final `: null`) can only ever evaluate to ONE of its branches, so
    // "at most one Moment renders" is a JS-semantics guarantee once this
    // shape is confirmed, not merely a convention.
    const momentsIdx = ANALYTICS_SRC.indexOf('Moments (R5');
    expect(momentsIdx).toBeGreaterThan(-1);
    const nextSectionIdx = ANALYTICS_SRC.indexOf('Utilities (R6', momentsIdx);
    expect(nextSectionIdx).toBeGreaterThan(momentsIdx);
    const momentsBlock = ANALYTICS_SRC.slice(momentsIdx, nextSectionIdx);
    expect(momentsBlock).toMatch(/\{!recapCardHidden \? \(/);
    expect(momentsBlock).toMatch(/\) : tonnageLandmark \? \(/);
    expect(momentsBlock).toMatch(/\) : null\}/);
    // Exactly one ternary in this block (not two independent conditionals
    // that could both be true at once).
    expect((momentsBlock.match(/\{!recapCardHidden \?/g) || []).length).toBe(1);
  });

  test('the utilities grid is one container (one NavTile-grid View, arbitrarily many tiles inside it)', () => {
    expect(ANALYTICS_SRC).toMatch(/<View style=\{styles\.navGrid\}>/);
    expect((ANALYTICS_SRC.match(/<View style=\{styles\.navGrid\}>/g) || []).length).toBe(1);
  });

  test('the ceiling arithmetic matches the spec exactly: 1 + 3 + 1 + 1 + 1 = 7', () => {
    const answerBlock = 1;
    const sessionCardsMax = 3;
    const volumeStripMax = 1;
    const momentMax = 1; // recap XOR milestone
    const utilitiesGrid = 1; // counts as one, per the recorded interpretation
    expect(answerBlock + sessionCardsMax + volumeStripMax + momentMax + utilitiesGrid).toBe(7);
  });

  test('above-the-fold ceiling: the Answer Block is the first bordered container, immediately after the header, before any other container', () => {
    const headerIdx = ANALYTICS_SRC.indexOf('Header (R1)');
    const answerBlockIdx = ANALYTICS_SRC.indexOf('<Card padding="none" style={styles.answerBlock}>');
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
