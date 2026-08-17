/**
 * HomeScreen — Campaign 22 Phase 2, Stage 3: presentation guards, the two
 * §23 items that were NOT already sufficiently pinned by an existing suite.
 *
 * COVERAGE MAP (why this file is short — every other §23 presentation-guard
 * item already has a real, sufficient pin elsewhere, checked in full before
 * writing this file rather than assumed):
 *  - R2 single-occupancy adversarial: pure-resolver level is exhaustive in
 *    src/lib/home/__tests__/todayLineArbiter.test.js ("every rank eligible
 *    at once" + the dismissal-walks-the-ladder case). Extended at the real
 *    HomeScreen fact-feeding level (genuine DB-driven eligibility, not
 *    synthetic facts) in HomeScreen.stateMatrix.test.js's own "Presentation
 *    guard — R2 single occupancy" block.
 *  - Resume-state suppression: HomeScreen.stateMatrix.test.js's S2 mount
 *    (real hasActiveWorkout, real block-complete + coach-decision eligible
 *    at once) plus the arbiter's own pure-resolver pin.
 *  - Strip-below-hero order: HomeScreen.stateMatrix.test.js's dedicated
 *    "strip renders below the hero, above the footer" real-DOM-order mount.
 *  - Recovery single-voice: src/lib/__tests__/recoveryWordingSource.test.js
 *    already pins the source-level single-derivation guard AND the exact
 *    historical contradiction scenario (adaptive state, chip vs card). Read
 *    in full before writing this file; no hole found, nothing to extend.
 *  - Check-in-day P1 occupancy: HomeScreen.stateMatrix.test.js's S16 mount
 *    (real day-of-week + real weigh-in-window gating, trial-ending
 *    simultaneously eligible, check-in wins) plus the arbiter's rank-4
 *    isolation test.
 *  - Tutorial-copy retirement (everLogged gate): src/components/__tests__/
 *    TodayStrip.test.js's "first-use tutorial copy retires after the first
 *    ever log" block already covers everLogged=false/true/logged-state in
 *    full. Read in full before writing this file; nothing to extend.
 *  - D98-2 suppression parity: previously pinned by firstReviewLine.test.js
 *    (deleted with its module, Campaign 26). The exact 4-condition formula
 *    (edFlag, scoffScore>=2, wellbeing==='read_failed', isCalm(wellbeing))
 *    is now pinned in THIS file's suppression-parity block below, against
 *    HomeScreen's real loader text - the pin moved homes, it never lapsed.
 *
 * WHAT THIS FILE ADDS (the two items with no existing pin):
 *  1. Trial-ending-only commerce in P1 — a source guard that HomeScreen's
 *     trialEnding fact reads ONLY the exact 48-hour window (not "any trial
 *     state", not a looser condition that could regress into an everyday
 *     impression) and that the fact block passed to the arbiter carries
 *     nothing else trial-shaped.
 *  2. Honest denominators — a source guard that firstReviewLine.js's weigh-
 *     in countdown is built from `weighInsNeeded` (the unclamped helper)
 *     and never reads a coachLedger row's `label` field (which IS
 *     Math.min-clamped, by loud design comment in that module — see
 *     src/lib/coachLedger.js). This is the exact founder-named defect
 *     class (3-7 mornings all reading "3 of 3"); the existing behavioural
 *     tests in firstReviewLine.test.js prove the OUTPUT never shows a
 *     clamped fraction, this proves the INPUT the output is built from can
 *     never regress into one either.
 */
const fs = require('fs');
const path = require('path');

// RE-ANCHORED (Campaign 26, founder device order 2026-08-17): the
// firstReviewLine module is DELETED with the one-line link it fed - the
// restored evidence pane (src/lib/home/evidencePanel.js) is the readiness
// home now, and the honest-denominators guard below re-pins against it.
const HOME = fs.readFileSync(path.resolve(__dirname, '../HomeScreen.js'), 'utf8');
const EVIDENCE_PANEL = fs.readFileSync(
  path.resolve(__dirname, '../../lib/home/evidencePanel.js'), 'utf8',
);

describe('Presentation guard — trial-ending-only commerce in P1 (spec §14, FOUNDER-RULINGS-PHASE2 R3)', () => {
  test('trialEndingEligible reads only the exact 48-hour window, tier-gated to pro_trial, nothing looser', () => {
    expect(HOME).toMatch(
      /const trialEndingEligible = stageOf\(userProfile\) === 'pro_trial'\s*\n\s*&& msToTrialEnd != null && msToTrialEnd <= 48 \* 60 \* 60 \* 1000;/,
    );
  });

  test('the trialEnding fact block passed to the arbiter carries only eligibility, daysRemaining and onPress — no everyday trial content', () => {
    const site = HOME.indexOf('trialEnding: {');
    expect(site).toBeGreaterThan(-1);
    const block = HOME.slice(site, HOME.indexOf('},', site) + 2);
    expect(block).toMatch(/eligible: trialEndingEligible,/);
    expect(block).toMatch(/daysRemaining: daysRemaining\(userProfile\) \?\? 0,/);
    // No S0-S3 variant machinery, no "runs to" end-date sentence, no
    // methodology button, no everyday-value fields of any kind.
    expect(block).not.toMatch(/variant|trialBanner|endsLabel|methodology/i);
  });

  test('no OTHER fact block feeding the arbiter references trial state at all — trialEnding is the single trial-aware occupant', () => {
    const arbiterCallSite = HOME.indexOf('const todayLineItem = resolveTodayLine({');
    const arbiterCallEnd = HOME.indexOf('  });', arbiterCallSite);
    const block = HOME.slice(arbiterCallSite, arbiterCallEnd);
    // Strip the trialEnding sub-block itself, then confirm nothing else in
    // the facts object mentions trial-flavoured identifiers.
    const trialSite = block.indexOf('trialEnding: {');
    const trialEnd = block.indexOf('},', trialSite) + 2;
    const withoutTrialEnding = block.slice(0, trialSite) + block.slice(trialEnd);
    expect(withoutTrialEnding).not.toMatch(/trial/i);
  });

  test('the everyday trial value card (S0-S3 variants, AttentionCard variant="trial") is gone from Home entirely', () => {
    expect(HOME).not.toMatch(/variant="trial"/);
    expect(HOME).not.toMatch(/selectTrialVariant/);
    expect(HOME).not.toMatch(/loadTrialBanner/);
  });
});

describe('Presentation guard — honest denominators (the evidence pane never shows a Math.min-clamped count)', () => {
  test('evidencePanel.js never reads a coach-ledger row\'s clamped `label` field', () => {
    // The pane authors its own row labels from the RAW weighIns7d count
    // (progress "N of 3" only while short, the actual count once met) and
    // reads only the ledger's variant/title/unlockDate - never `row.label`,
    // which is Math.min-clamped by design for coachLedger's own
    // threshold-ledger UI and is the exact founder-named defect class
    // (3-7 mornings all reading "3 of 3").
    // Comments stripped: the module's own docs cite the Math.min defect
    // they forbid.
    const code = EVIDENCE_PANEL
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/\.label\b/);
    expect(code).not.toMatch(/Math\.min/);
    expect(code).toMatch(/weighIns7d >= MIN_WEIGH_INS/);
  });

  test('the met-state weigh-in row states the ACTUAL count; the short state is a real needed-to-do fraction', () => {
    expect(EVIDENCE_PANEL).toMatch(/plural\(weighIns7d, 'morning weigh-in'\)/);
    expect(EVIDENCE_PANEL).toMatch(/\$\{weighIns7d\} of \$\{MIN_WEIGH_INS\} morning weigh-ins this week/);
  });

  test('HomeScreen feeds the loader\'s raw weighIns7d straight through, never pre-clamped before it reaches the resolver', () => {
    const site = HOME.indexOf('async function loadFirstReviewFacts()');
    const end = HOME.indexOf('async function loadFreeCoachLine()');
    const loader = HOME.slice(site, end);
    expect(loader).toMatch(/const weighIns7d = new Set\(/);
    expect(loader).not.toMatch(/Math\.min\(weighIns7d/);
    expect(loader).toMatch(/weighIns7d,\s*\n/);
  });
});

describe('ED-safety — D98-2 suppression parity (moved here from the deleted firstReviewLine.test.js, never lapsed)', () => {
  test('the loader\'s edSuppressed chain carries all four conditions, fail closed, matching the You tab formula', () => {
    const site = HOME.indexOf('async function loadFirstReviewFacts()');
    const end = HOME.indexOf('async function loadFreeCoachLine()');
    const loader = HOME.slice(site, end);
    expect(loader).toMatch(/const edSuppressed = !!edFlag\s*\n\s*\|\| \(Number\.isFinite\(userProfile\?\.scoffScore\) && userProfile\.scoffScore >= 2\)\s*\n\s*\|\| wellbeing === 'read_failed'\s*\n\s*\|\| isCalm\(wellbeing\);/);
    // The flag read itself fails CLOSED (truthy sentinel on error).
    expect(loader).toMatch(/getOpenEdPatternFlag\(user\.id\)\.catch\(\(\) => 'read_failed'\)/);
    // The chain is what the resolver receives - no weaker second path.
    expect(loader).toMatch(/edFlagOpen: edSuppressed,/);
  });

  test('the evidence pane resolver drops every count AND the weight line under suppression (neutral variant)', () => {
    expect(EVIDENCE_PANEL).toMatch(/if \(ledger\.variant === 'neutral'\) \{/);
    // The neutral early-return renders rows: [] (and, per the founder's
    // 2026-08-17 correction, NO coach-voiced title) and never reaches the
    // weigh-in/sessions/food/weight row builders below it.
    expect(EVIDENCE_PANEL).toMatch(/return \{ variant: 'neutral', title: null, countdown, rows: \[\] \};/);
  });
});
