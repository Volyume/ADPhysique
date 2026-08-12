/**
 * campaign8.nextBlockDecision.test.js — Work 1 (RA6-8 / RA6-9).
 *
 * Pins that the next-block recommendation is decided by the evidence
 * that actually seeds the adjusted block, that the Repeat-vs-Adjust
 * difference is shown when it exists, and that equivalence is stated
 * honestly instead of dressed up as adaptation.
 */
import { buildAdjustPreview, adjustPreviewLines } from '../lib/nextBlockPreview';
import { applyAdjustEvidence } from '../lib/blockAdvisor';

const entry = (muscle, over = {}) => ({
  muscle,
  classification: over.classification ?? 'RESPONSIVE',
  confidence: 0.9,
  rationale: `${muscle} rationale.`,
  observed: { startSets: 10, achievedPeak: 16, plannedPeak: 16, ...(over.observed ?? {}) },
  proposal: { startSets: 11, peakSets: 16, stimulusChange: null, deferredToManual: false },
});

const PRO_BASE = {
  recommendation: 'repeat', coached: true,
  headline: 'Go again: same plan', body: 'old body', secondaryLabel: 'Build a new plan',
};

describe('the preview measures the REAL Repeat vs Adjust difference', () => {
  test('an earned climb is a meaningful change, and it is named', () => {
    const ledger = { entries: [entry('chest'), entry('quads')] };
    const ranges = {
      chest: { startSets: 11, peakSets: 16, source: 'ledger' }, // +1
      quads: { startSets: 10, peakSets: 16, source: 'ledger' }, // held
    };
    const p = buildAdjustPreview({ ranges, ledger });
    expect(p.meaningful).toBe(true);
    expect(p.climbs).toBe(1);
    const lines = adjustPreviewLines(p);
    expect(lines[0]).toMatch(/Chest: week 1 up from 10 to 11 sets\./);
    expect(lines.join(' ')).toMatch(/stays where it is, because that workload keeps working/);
    // Consequences only: no engine internals in user copy.
    expect(lines.join(' ')).not.toMatch(/MEV|MRV|RESPONSIVE|INSUFFICIENT_DATA/);
  });

  test('a retention block is NOT meaningful, and says so honestly', () => {
    const ledger = { entries: [entry('chest'), entry('quads')] };
    const ranges = {
      chest: { startSets: 10, peakSets: 16, source: 'ledger' },
      quads: { startSets: 10, peakSets: 16, source: 'ledger' },
    };
    const p = buildAdjustPreview({ ranges, ledger });
    expect(p.meaningful).toBe(false);
    const lines = adjustPreviewLines(p);
    expect(lines[0]).toMatch(/still supported by the evidence, so there are no meaningful training changes to apply/);
    // It must NOT imply adaptation happened.
    expect(lines.join(' ')).not.toMatch(/adjusted|higher|lower/i);
  });

  test('a reduction is meaningful too, and is named as a reduction', () => {
    const ledger = { entries: [entry('calves')] };
    const ranges = { calves: { startSets: 8, peakSets: 16, source: 'ledger' } };
    const p = buildAdjustPreview({ ranges, ledger });
    expect(p.meaningful).toBe(true);
    expect(p.reductions).toBe(1);
    expect(adjustPreviewLines(p)[0]).toMatch(/down from 10 to 8 sets/);
  });

  test('a manual muscle is reported as the user\'s own setting, never as coaching', () => {
    const ledger = { entries: [entry('chest')] };
    const ranges = { chest: { startSets: 10, peakSets: 16, source: 'manual' } };
    const p = buildAdjustPreview({ ranges, ledger });
    expect(p.heldManual).toBe(1);
    expect(adjustPreviewLines(p).join(' ')).toMatch(/on your own settings and stays exactly there/);
  });

  // Review D2: resolveSeedRange step 1 is intent-blind, so Repeat returns
  // the manual numbers too. A manual value that differs from what the
  // block ran is a difference between the block and the user's setting,
  // never between the two buttons.
  test('a manual muscle that differs from the block is NOT an Adjust-only change', () => {
    const ledger = { entries: [entry('chest')] };
    const ranges = { chest: { startSets: 12, peakSets: 18, source: 'manual' } };
    const p = buildAdjustPreview({ ranges, ledger });
    expect(p.meaningful).toBe(false);
    expect(p.climbs).toBe(0);
    expect(p.heldManual).toBe(1);
    const copy = adjustPreviewLines(p).join(' ');
    expect(copy).toMatch(/on your own settings/);
    // The user's own number must never be credited to the coach.
    expect(copy).not.toMatch(/up from 10 to 12/);
  });

  // Review D3: only the adjust intent sizes the recovery week, so
  // identical training weeks can still hide a real difference.
  test('a recovery week sized differently is named, not swallowed by "the same"', () => {
    const ledger = { entries: [entry('chest')] };
    // Chest research MEV is 8, so a seeded deload of 10 is a real change.
    const ranges = { chest: { startSets: 10, peakSets: 16, source: 'ledger', deloadSets: 10 } };
    const p = buildAdjustPreview({ ranges, ledger });
    expect(p.meaningful).toBe(false); // the training weeks really are the same
    expect(p.recoveryWeekDiffers).toBe(true);
    expect(adjustPreviewLines(p).join(' ')).toMatch(/recovery week would be sized to the work you actually did/);
    const out = applyAdjustEvidence(PRO_BASE, p);
    expect(out.recommendation).toBe('repeat');
    expect(out.body).not.toMatch(/same training week/);
    expect(out.body).toMatch(/size your recovery week/);
  });

  // Review D7: "starts higher" is a claim about week 1, so a ceiling-only
  // move must not be counted as a climb.
  test('a peak-only move is not reported as a higher start', () => {
    const ledger = { entries: [entry('chest')] };
    const ranges = { chest: { startSets: 10, peakSets: 18, source: 'ledger' } };
    const p = buildAdjustPreview({ ranges, ledger });
    expect(p.meaningful).toBe(true);
    expect(p.climbs).toBe(0);
    expect(p.peakOnly).toBe(1);
    expect(applyAdjustEvidence(PRO_BASE, p).body).toMatch(/build to a different peak/);
  });

  test('no ledger or no ranges means no preview at all (never a guess)', () => {
    expect(buildAdjustPreview({ ranges: null, ledger: { entries: [entry('chest')] } })).toBeNull();
    expect(buildAdjustPreview({ ranges: {}, ledger: null })).toBeNull();
  });
});

describe('the recommendation follows that same evidence (RA6-8/RA6-9, requirement D)', () => {
  const meaningful = { meaningful: true, changes: [], moreChanged: 0, held: 0, heldUnjudged: 0, heldManual: 0, climbs: 2, reductions: 0 };
  const equivalent = { meaningful: false, changes: [], moreChanged: 0, held: 3, heldUnjudged: 0, heldManual: 0, climbs: 0, reductions: 0 };

  test('earned climbs flip a readiness-driven Repeat to Adjust', () => {
    const out = applyAdjustEvidence(PRO_BASE, meaningful);
    expect(out.recommendation).toBe('adjust');
    expect(out.body).toMatch(/start higher next block/);
  });

  test('an equivalent block recommends Repeat and says the options match', () => {
    const out = applyAdjustEvidence({ ...PRO_BASE, recommendation: 'adjust' }, equivalent);
    expect(out.recommendation).toBe('repeat');
    expect(out.body).toMatch(/no meaningful training changes to apply/);
    expect(out.body).toMatch(/same training week/);
  });

  test('persistent fatigue advice is never overridden by a volume delta', () => {
    const rebuild = { ...PRO_BASE, recommendation: 'consider_rebuild', headline: 'Might be worth a fresh look' };
    expect(applyAdjustEvidence(rebuild, meaningful)).toBe(rebuild);
  });

  test('FREE is never given coaching by this path', () => {
    const free = { recommendation: null, coached: false, headline: 'Your next block', body: 'x' };
    expect(applyAdjustEvidence(free, meaningful)).toBe(free);
    expect(applyAdjustEvidence(free, equivalent).recommendation).toBeNull();
  });

  test('with no preview the base recommendation is returned untouched', () => {
    expect(applyAdjustEvidence(PRO_BASE, null)).toBe(PRO_BASE);
  });
});
