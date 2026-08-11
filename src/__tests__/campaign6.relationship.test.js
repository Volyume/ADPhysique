/**
 * campaign6.relationship.test.js — the founder addendum's TEST
 * ADDITIONS: relationship-level invariants pinned under the five
 * permanent promises plus FREE-PRO. Behavioural pins against the REAL
 * pure chain wherever the invariant is behavioural; the
 * ANTI-MANIPULATION source walker and the internals/jargon ban already
 * live in campaign6.longTerm.test.js and campaign2.comprehension
 * (checkJargon) and are not duplicated here.
 *
 * These pin the RELATIONSHIP, one level above the mechanism suites:
 * what six months of history may and may not do to a user's next
 * prescription, and what the app may claim about it.
 */
import { computeLearnedRange } from '../lib/learnedRange';
import { resolveSeedRange } from '../lib/blockSeed';
import { buildNextBlockOptions } from '../lib/blockAdvisor';
import { BLOCK_CLASS } from '../lib/interBlock';
import fs from 'fs';
import path from 'path';

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

const PRIOR = { mev: 8, mav: 14, mrv: 20 };
const RESEARCH_MEV = 8;

const entry = (o = {}) => ({
  classification: BLOCK_CLASS.RESPONSIVE,
  confidence: 0.9,
  proposal: { startSets: 11, peakSets: 17, deferredToManual: false },
  observed: { startSets: 10, achievedPeak: 16, plannedPeak: 16, suppressed: false },
  ...o,
});

const range = (ledgerHistory) => computeLearnedRange({
  prior: PRIOR, researchMev: RESEARCH_MEV, ledgerHistory,
});

describe('REMEMBER ME', () => {
  test('an unjudgeable block neither erases nor grows the memory', () => {
    const good = entry();
    const unjudgeable = entry({
      classification: BLOCK_CLASS.INSUFFICIENT_DATA,
      proposal: { startSets: null, peakSets: null, deferredToManual: false },
    });
    expect(range([good, unjudgeable])).toEqual(range([good]));
  });

  test('proven capacity is never erased by a later good lower-volume block', () => {
    const high = entry({ observed: { startSets: 10, achievedPeak: 18, plannedPeak: 18, suppressed: false } });
    const lower = entry({ observed: { startSets: 10, achievedPeak: 12, plannedPeak: 12, suppressed: false } });
    const afterHigh = range([high]).ceiling;
    const afterBoth = range([high, lower]).ceiling;
    expect(afterBoth).toBeGreaterThanOrEqual(afterHigh);
  });
});

describe('RESPOND TO ME', () => {
  test('identical history gives an identical answer, byte for byte (provable response, no drift)', () => {
    const history = [entry(), entry({ observed: { startSets: 11, achievedPeak: 17, plannedPeak: 17, suppressed: false } })];
    expect(JSON.stringify(range(history))).toBe(JSON.stringify(range(history)));
  });

  test('evidence below the confidence bar is not silently treated as response-worthy', () => {
    const weak = entry({ confidence: 0.3 });
    const r = range([weak]);
    expect(r.isLearned).toBe(false);
    expect(r.evidenceBlocks).toBe(0);
  });
});

describe('HELP ME IMPROVE (specificity, never flattery)', () => {
  test('a block of real evidence makes the next seed more specific than the research prior', () => {
    const seeded = resolveSeedRange({
      manual: null, ledgerEntry: entry(), learnedRange: null,
      profileAdjusted: PRIOR, research: { mev: 8, mav: 14, mrv: 20 },
      suppressed: false, intent: 'adjust',
    });
    expect(seeded.source).toBe('ledger');
    expect(seeded.startSets).not.toBe(PRIOR.mev);
  });

  test('every seed source resolveSeedRange can return has a provenance voice', () => {
    // 'manual' | 'ledger' | 'learned' | 'profile' | 'research' — each maps
    // to a receipt clause or the research start line, so no prescription
    // origin is ever silent (promise 5 backs promise 3: improvement is
    // only credible when its source is named).
    const src = read('lib/blockExplain.js');
    expect(src).toMatch(/seed_ledger: 'set by how your last block went'/);
    expect(src).toMatch(/seed_learned: 'set by what past blocks have shown'/);
    expect(src).toMatch(/seed_manual: 'your own setting'/);
    expect(src).toMatch(/'template', 'seed_profile', 'seed_research'/);
  });
});

describe('RESPECT MY CHOICES', () => {
  test('a manual override beats every other source, including rich history', () => {
    const seeded = resolveSeedRange({
      manual: { mev: 12, mav: 20, mrv: 24 },
      ledgerEntry: entry(),
      learnedRange: { floor: 9, ceiling: 16, isLearned: true },
      profileAdjusted: PRIOR, research: { mev: 8, mav: 14, mrv: 20 },
      suppressed: false, intent: 'adjust',
    });
    expect(seeded.source).toBe('manual');
    expect(seeded.startSets).toBe(12);
  });

  test('a manually overridden block teaches the engine nothing', () => {
    const manualBlock = entry({ proposal: { startSets: 12, peakSets: 20, deferredToManual: true } });
    const r = range([manualBlock]);
    expect(r.evidenceBlocks).toBe(0);
    expect(r.isLearned).toBe(false);
  });

  test('a repeat is the block the user chose, not a recommendation in disguise', () => {
    const seeded = resolveSeedRange({
      manual: null, ledgerEntry: entry(), learnedRange: { floor: 9, ceiling: 16, isLearned: true },
      profileAdjusted: PRIOR, research: { mev: 8, mav: 14, mrv: 20 },
      suppressed: false, intent: 'repeat',
    });
    expect(seeded.startSets).toBe(10); // observed, not the proposal's 11
    expect(seeded.peakSets).toBe(16);
  });
});

describe('SHOW ME WHY binds SAFETY: memory cannot climb over a suppression', () => {
  test('a suppressed block\'s biggest peak never raises the learned ceiling', () => {
    const good = entry();
    const suppressedPeak = entry({
      observed: { startSets: 12, achievedPeak: 22, plannedPeak: 22, suppressed: true },
    });
    expect(range([good, suppressedPeak]).ceiling)
      .toBeLessThanOrEqual(range([good]).ceiling);
  });
});

describe('FREE-PRO: self-directed continuity, never implied coaching', () => {
  test('Free keeps repeat (continuity) and is locked out of adjust (coaching), at the decision itself', () => {
    const options = buildNextBlockOptions({ recommendation: null, isPro: false });
    expect(options.find((o) => o.intent === 'repeat').locked).toBe(false);
    expect(options.find((o) => o.intent === 'adjust').locked).toBe(true);
  });

  test('no surface claims Volyume has been coaching a Free user all along', () => {
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(p);
      return e.name.endsWith('.js') ? [p] : [];
    });
    const BANNED = [/we've been coaching you/i, /been coaching you all along/i, /your coach has been watching/i];
    for (const root of ['screens', 'components', 'lib'].map((d) => path.join(__dirname, '..', d))) {
      for (const file of walk(root)) {
        const src = fs.readFileSync(file, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
        for (const re of BANNED) {
          if (re.test(src)) throw new Error(`${file} matches banned upgrade copy: ${re}`);
        }
      }
    }
  });
});
