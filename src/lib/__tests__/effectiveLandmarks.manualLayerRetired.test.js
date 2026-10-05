/**
 * effectiveLandmarks.manualLayerRetired.test.js
 *
 * What this suite pins and why. Register D219, "Founder answers, 2026-10-05"
 * (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md), item 1: the
 * Volume targets editor is REMOVED ("Remove the editor": "One set of numbers
 * everywhere. People's existing custom targets stop being shown", and stop
 * being applied). Since D219 every screen judges weekly sets by the plan's
 * evidence-based role bands, so a person's own targets no longer changed any
 * verdict, and a control that does nothing is misleading.
 *
 * The person's stored targets (one blob at @volyume_landmarks_<userId>) must
 * therefore change NO number anywhere. The layer is switched off at its one
 * source (effectiveLandmarks.js), and these tests run the REAL landmark table,
 * the REAL getters and the REAL activation seed chain with a custom-target blob
 * sitting in storage, requiring the result to be exactly what a person who
 * never set any gets. They fail on any code that still reads the blob.
 *
 * The blob itself is NOT touched (no deletion, no migration, no sync change),
 * so one test pins that nothing here writes or removes it either.
 */
import { VOLUME_LANDMARKS } from '../algorithms';

// A custom-target blob exactly as the retired editor saved it: an explicit
// edit on chest (differs from research) and one pinned AT the research values.
const CUSTOM_BLOB = {
  chest: { mev: 9, mav: 14, mrv: 19, explicit: true },
  quads: {
    mev: VOLUME_LANDMARKS.quads.mev, mav: VOLUME_LANDMARKS.quads.mav, mrv: VOLUME_LANDMARKS.quads.mrv, explicit: true,
  },
  back: { mev: 11, mav: 16, mrv: 25 }, // a legacy edit with no flag that differs from research
};

let mockStoredBlob = null;
const mockGetItem = jest.fn((key) => Promise.resolve(
  String(key).startsWith('@volyume_landmarks_') && mockStoredBlob ? JSON.stringify(mockStoredBlob) : null,
));
const mockSetItem = jest.fn(() => Promise.resolve());
const mockRemoveItem = jest.fn(() => Promise.resolve());

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...a) => mockGetItem(...a),
  setItem: (...a) => mockSetItem(...a),
  removeItem: (...a) => mockRemoveItem(...a),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

const mockGetAllMesocyclesForUser = jest.fn();
jest.mock('../database', () => ({
  getAdaptiveLandmarkHistory: jest.fn(() => Promise.resolve([])),
  getActivePlan: jest.fn(() => Promise.resolve(null)),
  getRoutinesForPlan: jest.fn(() => Promise.resolve([])),
  getRoutineExercisesWithDetails: jest.fn(() => Promise.resolve([])),
  getAllMesocyclesForUser: (...a) => mockGetAllMesocyclesForUser(...a),
  getOpenEdPatternFlag: jest.fn(() => Promise.resolve(null)),
  getBlockTrainingData: jest.fn(),
  getPriorCompletedSets: jest.fn(),
  getPlannedMuscleVolumeForBlock: jest.fn(),
  getDeloadSuggestedWeekStarts: jest.fn(),
  getExerciseRowsById: jest.fn(),
  getCheckinsInRange: jest.fn(),
  getMesocycleWeeks: jest.fn(),
  storeBlockLedger: jest.fn(),
}));

const {
  mergeLandmarkPrecedence, getEffectiveLandmarks, getManualLandmarks, getManualVolumeMuscles,
} = require('../effectiveLandmarks');
const { buildLearnedSeedRangesForActivation } = require('../blockLedgerRunner');

const PROFILE = { experienceLevel: 'intermediate', recoveryCapacity: 'average', nutritionPhase: 'maintenance' };
const DAY = 24 * 60 * 60 * 1000;

const landmarkReads = () => mockGetItem.mock.calls.filter(([k]) => String(k).startsWith('@volyume_landmarks_'));

beforeEach(() => {
  jest.clearAllMocks();
  mockStoredBlob = null;
});

describe('the pure merge takes no manual input', () => {
  const research = { chest: { mv: 4, mev: 6, mav: 14, mrv: 22 }, quads: { mv: 6, mev: 8, mav: 14, mrv: 20 } };

  test('a manual table, however explicit, changes nothing: the result equals the merge without one', () => {
    const without = mergeLandmarkPrecedence({ research });
    const withManual = mergeLandmarkPrecedence({ manual: CUSTOM_BLOB, research });
    expect(withManual).toEqual(without);
    expect(withManual.source.chest).toBe('research');
    expect(withManual.table.chest).toMatchObject(research.chest);
  });

  test('over the adapted layer it changes nothing either: the adapted numbers stand', () => {
    const adapted = { chest: { mev: 7, mav: 15, mrv: 23, isAdapted: true } };
    const { table, source } = mergeLandmarkPrecedence({ manual: CUSTOM_BLOB, adapted, research });
    expect(source.chest).toBe('adapted');
    expect(table.chest).toMatchObject({ mev: 7, mav: 15, mrv: 23 });
  });

  test('over the plan layer it changes nothing either: the plan band stands', () => {
    const plan = { table: { chest: { mev: 6, mav: 16, mrv: 22 } }, source: { chest: 'plan' } };
    const { table, source } = mergeLandmarkPrecedence({ manual: CUSTOM_BLOB, plan, research });
    expect(source.chest).toBe('plan');
    expect(table.chest).toMatchObject({ mev: 6, mav: 16, mrv: 22 });
  });

  test('no source it reports is ever "manual"', () => {
    const { source } = mergeLandmarkPrecedence({ manual: CUSTOM_BLOB });
    expect(Object.values(source)).not.toContain('manual');
  });
});

describe('the landmark table ignores the stored custom targets', () => {
  test('getEffectiveLandmarks is the same table with a blob in storage as without one', async () => {
    const without = await getEffectiveLandmarks('u1', { userProfile: PROFILE });

    mockStoredBlob = CUSTOM_BLOB;
    const withBlob = await getEffectiveLandmarks('u1', { userProfile: PROFILE });

    expect(withBlob).toEqual(without);
    expect(withBlob.table.chest).not.toMatchObject({ mev: 9, mav: 14, mrv: 19 });
    expect(withBlob.table.back).not.toMatchObject({ mev: 11, mav: 16, mrv: 25 });
    expect(Object.values(withBlob.source)).not.toContain('manual');
  });

  test('the stored blob is never even read by the table', async () => {
    mockStoredBlob = CUSTOM_BLOB;
    await getEffectiveLandmarks('u1', { userProfile: PROFILE });
    expect(landmarkReads()).toEqual([]);
  });

  test('a blob stored at the research values is no pin either (the retired "explicit" case)', async () => {
    mockStoredBlob = { quads: CUSTOM_BLOB.quads };
    const { source } = await getEffectiveLandmarks('u1', { userProfile: PROFILE });
    expect(source.quads).not.toBe('manual');
  });
});

describe('the two manual getters answer "none", with a blob in storage', () => {
  test('getManualLandmarks resolves null and does not read storage', async () => {
    mockStoredBlob = CUSTOM_BLOB;
    await expect(getManualLandmarks('u1')).resolves.toBeNull();
    expect(landmarkReads()).toEqual([]);
  });

  test('getManualVolumeMuscles resolves an empty list, as a promise (its caller chains .catch)', async () => {
    mockStoredBlob = CUSTOM_BLOB;
    const pending = getManualVolumeMuscles('u1');
    expect(typeof pending.catch).toBe('function');
    await expect(pending).resolves.toEqual([]);
    expect(landmarkReads()).toEqual([]);
  });
});

describe('the stored data is left exactly where it is', () => {
  test('nothing in the landmark module writes or removes the blob', async () => {
    mockStoredBlob = CUSTOM_BLOB;
    await getEffectiveLandmarks('u1', { userProfile: PROFILE });
    await getManualLandmarks('u1');
    await getManualVolumeMuscles('u1');
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(mockRemoveItem).not.toHaveBeenCalled();
  });
});

describe('the engine paths run on the same numbers it would use for a person who never set any', () => {
  // A judged block that RAN a muscle at a repeatable dose; four of them in a row, the last finished
  // recently, are what earns a carried start for the next block (campaign8.learnedCarry.test.js).
  function block(startMs, muscle, { start, peak }) {
    return {
      id: `meso-${startMs}`,
      startDate: startMs,
      blockLedger: JSON.stringify({
        version: 3,
        entries: [{
          muscle,
          classification: 'RESPONSIVE',
          confidence: 0.9,
          observed: { startSets: start, plannedPeak: peak, achievedPeak: peak },
          proposal: { startSets: start, peakSets: peak, deferredToManual: false },
        }],
      }),
    };
  }
  const maturity = (muscle) => {
    const newestStart = Date.now() - 45 * DAY;
    return [180, 120, 60, 0].map((d, i) => block(newestStart - d * DAY, muscle, { start: 12 + i, peak: 20 }));
  };

  test('the activation carry for a person with custom targets equals the carry for one without', async () => {
    mockGetAllMesocyclesForUser.mockResolvedValue(maturity('chest'));
    const without = await buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE });

    mockStoredBlob = CUSTOM_BLOB;
    const withBlob = await buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE });

    expect(without).not.toBeNull();
    expect(without.ranges.chest.source).toBe('ledger');
    expect(withBlob).toEqual(without);
  });

  test('no muscle is seeded from the person\'s own targets', async () => {
    mockGetAllMesocyclesForUser.mockResolvedValue(maturity('chest'));
    mockStoredBlob = CUSTOM_BLOB;
    const out = await buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE });
    for (const r of Object.values(out.ranges)) expect(r.source).not.toBe('manual');
    // chest carries the engine's own last judged start (15) and peak (20), not the blob's 9 and 14.
    expect(out.ranges.chest.startSets).toBe(15);
    expect(out.ranges.chest.peakSets).toBe(20);
  });

  test('a blob alone, with no judged history, seeds nothing: the template ramp stands', async () => {
    // A finished block with no ledger: nothing was judged, so nothing may carry. Under the retired
    // layer the blob alone seeded chest, quads and back as "manual" from exactly this state.
    mockGetAllMesocyclesForUser.mockResolvedValue([{ id: 'meso-1', startDate: Date.now() - 45 * DAY }]);
    mockStoredBlob = CUSTOM_BLOB;
    await expect(buildLearnedSeedRangesForActivation('u1', { userProfile: PROFILE })).resolves.toBeNull();
  });
});
