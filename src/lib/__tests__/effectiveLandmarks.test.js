/**
 * effectiveLandmarks.test.js — pins the ONE landmark precedence
 * (D90 #3, 2026-08-06): manual > adapted(Pro, isAdapted) > research.
 * Behavioural tests against the real merge; the loader's tier gate and
 * fail-open reads are pinned with mocked layers.
 */
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn() }));
jest.mock('../database', () => ({ getAdaptiveLandmarkHistory: jest.fn() }));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const { getAdaptiveLandmarkHistory } = require('../database');
const { mergeLandmarkPrecedence, getEffectiveLandmarks } = require('../effectiveLandmarks');
const { VOLUME_LANDMARKS } = require('../algorithms');

const research = { chest: { mv: 4, mev: 6, mav: 14, mrv: 22 }, quads: { mv: 6, mev: 8, mav: 14, mrv: 20 } };

describe('mergeLandmarkPrecedence', () => {
  test('manual beats adapted beats research, per muscle independently', () => {
    const { table, source } = mergeLandmarkPrecedence({
      manual: { chest: { mev: 8, mav: 16, mrv: 24 } },
      adapted: {
        chest: { mev: 7, mav: 15, mrv: 23, isAdapted: true },
        quads: { mev: 9, mav: 15, mrv: 21, isAdapted: true },
      },
      research,
    });
    expect(table.chest).toMatchObject({ mev: 8, mav: 16, mrv: 24 });
    expect(source.chest).toBe('manual');
    expect(table.quads).toMatchObject({ mev: 9, mav: 15, mrv: 21 });
    expect(source.quads).toBe('adapted');
  });

  test('a not-yet-adapted muscle (isAdapted false, under 3 data points) stays research', () => {
    const { table, source } = mergeLandmarkPrecedence({
      adapted: { chest: { mev: 6, mav: 14, mrv: 22, isAdapted: false, dataPoints: 2 } },
      research,
    });
    expect(source.chest).toBe('research');
    expect(table.chest).toMatchObject(research.chest);
  });

  test('malformed layers degrade to research, and mv survives the merge', () => {
    const { table, source } = mergeLandmarkPrecedence({
      manual: { chest: { mev: 'x', mav: null, mrv: 24 } },
      research,
    });
    expect(source.chest).toBe('research');
    expect(table.chest.mv).toBe(4);
    expect(mergeLandmarkPrecedence({}).table).toMatchObject(VOLUME_LANDMARKS);
  });
});

describe('getEffectiveLandmarks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    getAdaptiveLandmarkHistory.mockResolvedValue([]);
  });

  test('Free tier never reads the adaptive history: research plus manual only', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ chest: { mev: 9, mav: 15, mrv: 23 } }));
    const { table, source } = await getEffectiveLandmarks('u1', { tier: 'free' });
    expect(getAdaptiveLandmarkHistory).not.toHaveBeenCalled();
    expect(source.chest).toBe('manual');
    expect(table.back).toMatchObject(VOLUME_LANDMARKS.back);
  });

  test('Pro tier resolves adapted values through the REAL engine', async () => {
    // Real computeAdaptiveLandmarks: 3+ entries flips isAdapted for that
    // muscle; the merge then prefers it over research.
    getAdaptiveLandmarkHistory.mockResolvedValue([
      { muscle: 'chest', pumpScore: 4, sorenessScore: 2, jointDiscomfort: 0, performanceTrend: 1, prFrequency: 1, missedReps: 0, weeklyVolume: 16 },
      { muscle: 'chest', pumpScore: 4, sorenessScore: 2, jointDiscomfort: 0, performanceTrend: 1, prFrequency: 1, missedReps: 0, weeklyVolume: 16 },
      { muscle: 'chest', pumpScore: 4, sorenessScore: 1, jointDiscomfort: 0, performanceTrend: 1, prFrequency: 1, missedReps: 0, weeklyVolume: 18 },
    ]);
    const { source } = await getEffectiveLandmarks('u1', { tier: 'pro' });
    expect(source.chest).toBe('adapted');
    expect(source.quads).toBe('research');
  });

  test('a failed pref read fails open to research, never throws', async () => {
    AsyncStorage.getItem.mockRejectedValue(new Error('fs down'));
    getAdaptiveLandmarkHistory.mockRejectedValue(new Error('db down'));
    const { table, source } = await getEffectiveLandmarks('u1', { tier: 'pro' });
    expect(source.chest).toBe('research');
    expect(table.chest).toMatchObject(VOLUME_LANDMARKS.chest);
  });
});
