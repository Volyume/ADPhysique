/**
 * blockSeed.stage6.test.js — TEST-FIRST, Stage 6 of the adaptive
 * mesocycle build (founder order 2026-08-09; authority
 * docs/blueprint-adaptive-mesocycle-2026-08-09.md §3.5/§3.9 + the
 * founder's Stage 6 spec: seeding fallback order, verbatim: "1 manual
 * override -> 2 valid ledger -> 3 learned band -> 4 profile-adjusted
 * research -> 5 raw research; Never silently discard a valid
 * previous-block recommendation").
 *
 * Pins the pure src/lib/blockSeed.js BEFORE it exists.
 * resolveSeedRange picks ONE muscle's next-block start/peak and names
 * its source, so the seeding write (generateInitialPlannedVolume) and
 * the Stage 8 explanation can never disagree about where a number came
 * from.
 *
 * Advisor button semantics (§3.5): intent 'repeat' = ledger carry-over
 * forced to a TRUE repeat (the block's own observed start/planned
 * peak); intent 'adjust' = the full ledger proposal. Suppression
 * (calm/ED, caller-ORed): a ledger seed degrades to the repeat numbers
 * and the learned band is skipped for the conservative profile/research
 * default — reductions in a ledger proposal still pass (§3.8/D15).
 */
import fs from 'fs';
import path from 'path';
import { resolveSeedRange } from '../blockSeed';

const RESEARCH = { mev: 8, mav: 14, mrv: 22 };
const PROFILE = { mev: 9, mav: 15, mrv: 21 };

const LEDGER_ENTRY = {
  classification: 'RESPONSIVE',
  confidence: 0.9,
  observed: { startSets: 10, achievedPeak: 16, plannedPeak: 16 },
  proposal: { startSets: 11, peakSets: 17, stimulusChange: null, deferredToManual: false },
};

const seed = (over = {}) => resolveSeedRange({
  manual: null,
  ledgerEntry: null,
  learnedRange: null,
  profileAdjusted: PROFILE,
  research: RESEARCH,
  suppressed: false,
  intent: 'adjust',
  ...over,
});

describe('the fallback order, exactly as ordered', () => {
  test('1. a manual override beats everything, including a valid ledger', () => {
    const out = seed({
      manual: { mev: 12, mav: 18, mrv: 24 },
      ledgerEntry: LEDGER_ENTRY,
      learnedRange: { floor: 9, ceiling: 16, isLearned: true },
    });
    expect(out).toEqual({ startSets: 12, peakSets: 18, source: 'manual' });
  });

  test('2. a valid ledger proposal seeds next, never silently discarded', () => {
    const out = seed({
      ledgerEntry: LEDGER_ENTRY,
      learnedRange: { floor: 9, ceiling: 16, isLearned: true },
    });
    expect(out).toEqual({ startSets: 11, peakSets: 17, source: 'ledger' });
  });

  test('3. the learned band seeds when no ledger exists', () => {
    const out = seed({ learnedRange: { floor: 9, ceiling: 16, isLearned: true } });
    expect(out).toEqual({ startSets: 9, peakSets: 16, source: 'learned' });
  });

  test('4. profile-adjusted research seeds when nothing is learned', () => {
    expect(seed()).toEqual({ startSets: 9, peakSets: 15, source: 'profile' });
  });

  test('5. raw research is the last resort', () => {
    expect(seed({ profileAdjusted: null })).toEqual({ startSets: 8, peakSets: 14, source: 'research' });
  });
});

describe('what makes a ledger entry valid', () => {
  test('null proposal numbers (no-landmarks entry) fall through to the next source', () => {
    const out = seed({
      ledgerEntry: { ...LEDGER_ENTRY, proposal: { startSets: null, peakSets: null, stimulusChange: null, deferredToManual: false } },
      learnedRange: { floor: 9, ceiling: 16, isLearned: true },
    });
    expect(out.source).toBe('learned');
  });

  test('a deferredToManual entry falls through (the manual table owns those numbers)', () => {
    const out = seed({
      ledgerEntry: { ...LEDGER_ENTRY, proposal: { ...LEDGER_ENTRY.proposal, deferredToManual: true } },
    });
    expect(out.source).toBe('profile');
  });

  test('an unlearned range never seeds', () => {
    const out = seed({ learnedRange: { floor: 9, ceiling: 16, isLearned: false } });
    expect(out.source).toBe('profile');
  });
});

describe('advisor button semantics (§3.5)', () => {
  test("'repeat' forces a TRUE repeat from the ledger's observed numbers, not the proposal", () => {
    const out = seed({ ledgerEntry: LEDGER_ENTRY, intent: 'repeat' });
    expect(out).toEqual({ startSets: 10, peakSets: 16, source: 'ledger' });
  });

  test("'adjust' takes the full ledger proposal", () => {
    const out = seed({ ledgerEntry: LEDGER_ENTRY, intent: 'adjust' });
    expect(out.startSets).toBe(11);
    expect(out.peakSets).toBe(17);
  });
});

describe('suppression posture (§3.8/D15: no upward carry anywhere)', () => {
  test('a suppressed ledger seed degrades to the repeat numbers', () => {
    const out = seed({ ledgerEntry: LEDGER_ENTRY, suppressed: true });
    expect(out).toEqual({ startSets: 10, peakSets: 16, source: 'ledger' });
  });

  test('a suppressed ledger REDUCTION still passes untouched', () => {
    const strained = {
      ...LEDGER_ENTRY,
      classification: 'STRAINED',
      proposal: { startSets: 8, peakSets: 14, stimulusChange: null, deferredToManual: false },
    };
    const out = seed({ ledgerEntry: strained, suppressed: true });
    expect(out).toEqual({ startSets: 8, peakSets: 14, source: 'ledger' });
  });

  test('suppression skips the learned band for the conservative default', () => {
    const out = seed({
      learnedRange: { floor: 9, ceiling: 18, isLearned: true },
      suppressed: true,
    });
    expect(out.source).toBe('profile');
  });

  test('manual overrides are the user\'s own numbers and stand even under suppression', () => {
    const out = seed({ manual: { mev: 12, mav: 18, mrv: 24 }, suppressed: true });
    expect(out.source).toBe('manual');
  });
});

describe('clamps and degenerate inputs', () => {
  test('every source clamps to research MEV and the 30-set ceiling', () => {
    const wild = seed({
      ledgerEntry: { ...LEDGER_ENTRY, proposal: { startSets: 2, peakSets: 60, stimulusChange: null, deferredToManual: false } },
    });
    expect(wild.startSets).toBeGreaterThanOrEqual(RESEARCH.mev);
    expect(wild.peakSets).toBeLessThanOrEqual(30);
  });

  test('peak never sits below start', () => {
    const out = seed({
      ledgerEntry: { ...LEDGER_ENTRY, proposal: { startSets: 12, peakSets: 9, stimulusChange: null, deferredToManual: false } },
    });
    expect(out.peakSets).toBeGreaterThanOrEqual(out.startSets);
  });

  test('junk manual values fall through instead of seeding garbage', () => {
    const out = seed({ manual: { mev: NaN, mav: 'x' } });
    expect(out.source).toBe('profile');
  });

  test('missing research still resolves (profile stands its ground)', () => {
    const out = seed({ research: null });
    expect(out.source).toBe('profile');
    expect(Number.isFinite(out.startSets)).toBe(true);
  });
});

describe('purity', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'blockSeed.js'), 'utf8');

  test('deterministic', () => {
    expect(seed({ ledgerEntry: LEDGER_ENTRY })).toEqual(seed({ ledgerEntry: LEDGER_ENTRY }));
  });

  test('no clocks, no randomness, no I/O, no store, tier-blind', () => {
    expect(SRC).not.toMatch(/Date\.now|Math\.random|new Date\(\)/);
    expect(SRC).not.toMatch(/require\(|from '\.\/database'|AsyncStorage|useAppStore|supabase/);
    expect(SRC).not.toMatch(/tier/i);
  });
});
