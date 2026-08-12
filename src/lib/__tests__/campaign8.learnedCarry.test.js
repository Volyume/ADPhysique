/**
 * campaign8.learnedCarry.test.js — Work 2 (D97-9).
 *
 * Muscle-level learned evidence must survive a LEGITIMATE plan or phase
 * change, because it belongs to the muscle and the user, not to one
 * plan ID. Before this, only "Continue with adjustments" ever handed
 * seed ranges to the block writer, so a plan switch, a copied routine,
 * a phase rebuild or the post-upgrade wizard re-ramped a mature user
 * from the static research template.
 *
 * These are the cases the founder's order names, and they run against
 * the REAL buildLearnedSeedRangesForActivation and the real pure chain
 * (computeLearnedRange -> resolveSeedRange) with only the database
 * reads mocked:
 *
 *   - mature user -> a different compatible plan (carry)
 *   - phase change (carry: the band is muscle-level, not phase-level)
 *   - Free history -> Pro (no carry claimed for a Free past)
 *   - manual override present (the user's setting wins and is labelled)
 *   - safety suppression present (no upward carry during calm/ED)
 *   - genuinely incompatible context (nothing to carry -> template ramp)
 *
 * Review D1 is pinned here too: the returned map contains ONLY muscles
 * that genuinely carried something, so one manual override can never
 * hand the whole body a profile-prior ramp.
 */
import { VOLUME_LANDMARKS } from '../algorithms';
import { buildSeededWeeklyTargets } from '../blockLedgerGather';

const mockGetAllMesocyclesForUser = jest.fn();
const mockGetOpenEdPatternFlag = jest.fn();
let mockWellbeing = null;

jest.mock('../database', () => ({
  getAllMesocyclesForUser: (...a) => mockGetAllMesocyclesForUser(...a),
  getOpenEdPatternFlag: (...a) => mockGetOpenEdPatternFlag(...a),
  getBlockTrainingData: jest.fn(),
  getPriorCompletedSets: jest.fn(),
  getPlannedMuscleVolumeForBlock: jest.fn(),
  getDeloadSuggestedWeekStarts: jest.fn(),
  getExerciseRowsById: jest.fn(),
  getCheckinsInRange: jest.fn(),
  getMesocycleWeeks: jest.fn(),
  storeBlockLedger: jest.fn(),
}));

const mockManual = jest.fn();
jest.mock('../effectiveLandmarks', () => {
  const actual = jest.requireActual('../effectiveLandmarks');
  return {
    ...actual,
    getManualLandmarks: (...a) => mockManual(...a),
    getAdaptedLandmarks: jest.fn().mockResolvedValue(null),
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(mockWellbeing)),
  setItem: jest.fn(() => Promise.resolve()),
}));

const { buildLearnedSeedRangesForActivation } = require('../blockLedgerRunner');

const PROFILE = { experienceLevel: 'intermediate', recoveryCapacity: 'average', nutritionPhase: 'maintenance' };

/**
 * A judged block that RAN a muscle at a repeatable dose. Several of
 * these in a row are what earns a learned band.
 */
function block(startMs, muscle, { start, peak, classification = 'RESPONSIVE' } = {}) {
  return {
    id: `meso-${startMs}`,
    startDate: startMs,
    blockLedger: JSON.stringify({
      version: 3,
      entries: [{
        muscle,
        classification,
        confidence: 0.9,
        observed: { startSets: start, plannedPeak: peak, achievedPeak: peak },
        proposal: { startSets: start, peakSets: peak, deferredToManual: false },
      }],
    }),
  };
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Four judged blocks whose LAST one finished recently. A block runs six
 * weeks, so the newest block starts 45 days back and is a few days past
 * its recovery week - fresh evidence by the engine's own reckoning.
 */
function maturityFor(muscle, { start, peak, lastEndedDaysAgo = 3 } = {}) {
  const newestStart = Date.now() - (42 + lastEndedDaysAgo) * DAY;
  return [180, 120, 60, 0].map((d, i) => block(newestStart - d * DAY, muscle, {
    start: start ?? 12 + i, peak: peak ?? 20,
  }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockWellbeing = null;
  mockGetOpenEdPatternFlag.mockResolvedValue(null);
  mockManual.mockResolvedValue(null);
});

describe('Work 2: learned evidence survives a legitimate activation', () => {
  test('mature user activating a DIFFERENT compatible plan carries the learned band', async () => {
    mockGetAllMesocyclesForUser.mockResolvedValue(maturityFor('chest'));
    const out = await buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE, tier: 'pro' });
    expect(out).not.toBeNull();
    expect(out.intent).toBe('activation');
    expect(out.ranges.chest.source).toBe('learned');
    // What is carried is the CEILING the user has proven they handle -
    // the block builds to 20 sets instead of the template's 14 - while
    // week 1 still starts at the conservative research floor. That is
    // the whole shape of the fix: a mature user stops re-ramping to a
    // beginner's ceiling, without being thrown into a heavy week 1.
    expect(out.ranges.chest.peakSets).toBe(20);
    expect(out.ranges.chest.peakSets).toBeGreaterThan(VOLUME_LANDMARKS.chest.mav);
    expect(out.ranges.chest.startSets).toBe(VOLUME_LANDMARKS.chest.mev);
  });

  // C8 closeout, issue 1. The continuity is REAL but PARTIAL, and this
  // records exactly where the line falls, so no later reader can mistake
  // "the ceiling survived" for "the mature prescription survived".
  //
  // The learned band's floor is monotone DOWNWARD by construction
  // (learnedRange.js: "a rising floor would be upward volume pressure"),
  // so no amount of history can raise week 1 above the research start.
  // Only a current-block proposal does that, and the activation path
  // deliberately has none. Week 1 after a compatible switch is therefore
  // the same number a brand-new user gets; the ramp above it is not.
  test('CONTINUITY IS PARTIAL: the proven ceiling carries, the mature START does not', async () => {
    mockGetAllMesocyclesForUser.mockResolvedValue(maturityFor('chest'));
    const out = await buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE, tier: 'pro' });
    const carried = out.ranges.chest;
    // The last block ran 15 -> 20. The ceiling survives the switch.
    expect(carried.peakSets).toBe(20);
    // The start does NOT: it is the same Day-1 research floor.
    expect(carried.startSets).toBe(VOLUME_LANDMARKS.chest.mev);
    expect(carried.startSets).toBe(6);
    // Weeks 2-5 do diverge from the template, so the block as a whole is
    // genuinely personalised even though its first week is not.
    const seeded = buildSeededWeeklyTargets({
      startSets: carried.startSets, peakSets: carried.peakSets, accumWeeks: 5,
      deloadSets: VOLUME_LANDMARKS.chest.mev,
    });
    expect(seeded).toEqual([6, 10, 13, 17, 20, 6]);
    const template = [0, 1, 2, 3, 4].map((i) => Math.round(
      VOLUME_LANDMARKS.chest.mev
      + (VOLUME_LANDMARKS.chest.mav - VOLUME_LANDMARKS.chest.mev) * (i / 4),
    ));
    expect(template).toEqual([6, 8, 10, 12, 14]);
    expect(seeded[0]).toBe(template[0]);      // week 1: identical
    expect(seeded[4]).toBeGreaterThan(template[4]); // week 5: not
  });

  test('a phase change carries it too: the band is muscle-level, not phase-level', async () => {
    mockGetAllMesocyclesForUser.mockResolvedValue(maturityFor('chest'));
    const cut = await buildLearnedSeedRangesForActivation('u1', {
      userProfile: { ...PROFILE, nutritionPhase: 'cut' }, tier: 'pro',
    });
    expect(cut?.ranges?.chest?.source).toBe('learned');
  });

  test('FREE gets nothing: no coaching, and no claim that Volyume coached a free past', async () => {
    mockGetAllMesocyclesForUser.mockResolvedValue(maturityFor('chest'));
    expect(await buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE, tier: 'free' })).toBeNull();
    // The same history, once the user IS Pro, is usable - it is their own
    // training record, not a retroactive coaching claim.
    const pro = await buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE, tier: 'pro' });
    expect(pro?.ranges?.chest?.source).toBe('learned');
  });

  test('a manual override outranks the carry and is labelled as the user\'s own', async () => {
    mockGetAllMesocyclesForUser.mockResolvedValue(maturityFor('chest'));
    mockManual.mockResolvedValue({ chest: { mev: 9, mav: 14, mrv: 19, explicit: true } });
    const out = await buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE, tier: 'pro' });
    expect(out.ranges.chest.source).toBe('manual');
    expect(out.ranges.chest.startSets).toBe(9);
  });

  test('SAFETY: under suppression nothing is carried upward', async () => {
    mockGetAllMesocyclesForUser.mockResolvedValue(maturityFor('chest'));
    mockGetOpenEdPatternFlag.mockResolvedValue({ id: 'flag-1', status: 'open' });
    const out = await buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE, tier: 'pro' });
    // Nothing carried at all -> the caller keeps the honest template ramp.
    expect(out).toBeNull();
  });

  test('SAFETY: calm mode suppresses the carry the same way', async () => {
    mockGetAllMesocyclesForUser.mockResolvedValue(maturityFor('chest'));
    mockWellbeing = 'calm';
    expect(await buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE, tier: 'pro' })).toBeNull();
  });

  test('SAFETY: a failed flag read fails CLOSED, never into an upward carry', async () => {
    mockGetAllMesocyclesForUser.mockResolvedValue(maturityFor('chest'));
    mockGetOpenEdPatternFlag.mockRejectedValue(new Error('db gone'));
    expect(await buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE, tier: 'pro' })).toBeNull();
  });

  test('an incompatible context carries nothing: no history means the template ramp', async () => {
    mockGetAllMesocyclesForUser.mockResolvedValue([]);
    expect(await buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE, tier: 'pro' })).toBeNull();
    // Blocks that were never judged are not evidence: an unjudged past
    // (or one the ledger could not parse) carries nothing at all.
    mockGetAllMesocyclesForUser.mockResolvedValue([
      { id: 'x', startDate: Date.now() - 30 * DAY, blockLedger: null },
      { id: 'y', startDate: Date.now() - 60 * DAY, blockLedger: 'not json' },
    ]);
    expect(await buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE, tier: 'pro' })).toBeNull();
  });
});

// Review D5: a caller that MEANT a repeat must never reach the carry.
// buildSeedRangesForNextBlock returns null on a transient read failure,
// and "the same set targets as last time" would then have been served
// from the learned band - breaking P-6 behind an alert promising the
// opposite.
// C8 closeout, D10. The carry consumes a band that has no clock, so an
// eight-month-lapsed user activating a plan was ramped straight back to
// the ceiling they last held. The engine already refuses an increase
// once a block ended STALE_EVIDENCE_WEEKS ago ("once the gap could have
// deconditioned the muscle", interBlock.js); the carry now applies that
// same existing law rather than inventing a decay.
describe('D10: stale memory alone cannot authorise a fresh upward prescription', () => {
  test('an eight-month lapse carries nothing: the template ramp stands', async () => {
    mockGetAllMesocyclesForUser.mockResolvedValue(maturityFor('chest', { lastEndedDaysAgo: 240 }));
    expect(await buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE, tier: 'pro' })).toBeNull();
  });

  test('the very same history, freshly finished, DOES carry', async () => {
    mockGetAllMesocyclesForUser.mockResolvedValue(maturityFor('chest', { lastEndedDaysAgo: 3 }));
    const out = await buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE, tier: 'pro' });
    expect(out?.ranges?.chest?.source).toBe('learned');
    expect(out.ranges.chest.peakSets).toBe(20);
  });

  test('memory PERSISTS: a fresh block after the lapse makes the carry live again', async () => {
    // The stale history is untouched; one newly finished block joins it.
    const stale = maturityFor('chest', { lastEndedDaysAgo: 240 });
    const fresh = block(Date.now() - 45 * DAY, 'chest', { start: 15, peak: 20 });
    mockGetAllMesocyclesForUser.mockResolvedValue([...stale, fresh]);
    const out = await buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE, tier: 'pro' });
    expect(out?.ranges?.chest?.source).toBe('learned');
  });

  test('an unreadable block date fails toward stale, never toward a carry', async () => {
    mockGetAllMesocyclesForUser.mockResolvedValue([
      { ...maturityFor('chest')[0], startDate: 'not a date' },
    ]);
    expect(await buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE, tier: 'pro' })).toBeNull();
  });

  test('a manual setting is NOT evidence and survives the staleness gate', async () => {
    mockGetAllMesocyclesForUser.mockResolvedValue(maturityFor('chest', { lastEndedDaysAgo: 240 }));
    mockManual.mockResolvedValue({ chest: { mev: 9, mav: 14, mrv: 19, explicit: true } });
    const out = await buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE, tier: 'pro' });
    // The user's own setting carries; the stale learned band does not.
    expect(Object.keys(out.ranges)).toEqual(['chest']);
    expect(out.ranges.chest.source).toBe('manual');
  });
});

describe('Review D5: a repeat never falls through to the learned carry', () => {
  const read = (p) => require('fs').readFileSync(require('path').resolve(__dirname, '../../', p), 'utf8');

  test('activatePlanWithBlock takes an allowLearnedCarry gate and honours it', () => {
    const SRC = read('lib/database.js');
    expect(SRC).toMatch(/activatePlanWithBlock\(userId, planId, planName, \{ ledger = null, allowLearnedCarry = true \} = \{\}\)/);
    expect(SRC).toMatch(/if \(!effectiveLedger && allowLearnedCarry\)/);
  });

  test('the repeat path closes that gate', () => {
    const SRC = read('screens/PlansScreen.js');
    expect(SRC).toMatch(/allowLearnedCarry: seedIntent !== 'repeat'/);
  });
});

describe('Review D1: the carry is PER MUSCLE, never body-wide', () => {
  test('one manual muscle does not hand every other muscle a profile-prior ramp', async () => {
    // No learnable history at all; a single unrelated manual override.
    mockGetAllMesocyclesForUser.mockResolvedValue([block(Date.now() - 30 * DAY, 'calves', { start: 10, peak: 16 })]);
    mockManual.mockResolvedValue({ calves: { mev: 10, mav: 16, mrv: 20, explicit: true } });
    const out = await buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE, tier: 'pro' });
    expect(out).not.toBeNull();
    // ONLY the manual muscle is written. Everything else is absent, so the
    // writer leaves it on the honest template ramp.
    expect(Object.keys(out.ranges)).toEqual(['calves']);
    expect(out.ranges.chest).toBeUndefined();
  });

  test('a mixed body writes only the muscles that genuinely carried', async () => {
    mockGetAllMesocyclesForUser.mockResolvedValue(maturityFor('chest'));
    mockManual.mockResolvedValue({ calves: { mev: 10, mav: 16, mrv: 20, explicit: true } });
    const out = await buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE, tier: 'pro' });
    expect(Object.keys(out.ranges).sort()).toEqual(['calves', 'chest']);
    expect(out.ranges.chest.source).toBe('learned');
    expect(out.ranges.calves.source).toBe('manual');
    for (const r of Object.values(out.ranges)) {
      expect(['learned', 'manual']).toContain(r.source);
    }
  });
});
