/**
 * effectiveLandmarks.test.js — pins the ONE landmark precedence
 * (D90 #3, 2026-08-06): adapted(isAdapted) > research. RE-PINNED 2026-10-05
 * (D219, founder answer "Remove the editor"): the manual layer that used to head
 * it is retired, so nothing here lets a person's own targets win; the retired
 * layer's own pins are effectiveLandmarks.manualLayerRetired.test.js.
 * Behavioural tests against the real merge; the loader's fail-open reads
 * are pinned with mocked layers. Volyume is fully free (founder decision
 * 2026-09-03), so the adapted layer's old Pro gate is gone.
 */
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn() }));
jest.mock('../database', () => ({ getAdaptiveLandmarkHistory: jest.fn() }));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const { getAdaptiveLandmarkHistory } = require('../database');
const { mergeLandmarkPrecedence, getEffectiveLandmarks } = require('../effectiveLandmarks');
const { VOLUME_LANDMARKS } = require('../algorithms');

const research = { chest: { mv: 4, mev: 6, mav: 14, mrv: 22 }, quads: { mv: 6, mev: 8, mav: 14, mrv: 20 } };

describe('mergeLandmarkPrecedence', () => {
  // RE-PINNED 2026-10-05 (D219, founder answer "Remove the editor"): this pinned manual > adapted > research, per
  // muscle. The manual layer is retired, so a manual table beats nothing and adapted > research is the precedence.
  test('adapted beats research, per muscle independently, and a manual table beats neither', () => {
    const { table, source } = mergeLandmarkPrecedence({
      manual: { chest: { mev: 8, mav: 16, mrv: 24 } },
      adapted: {
        chest: { mev: 7, mav: 15, mrv: 23, isAdapted: true },
        quads: { mev: 9, mav: 15, mrv: 21, isAdapted: false, dataPoints: 2 },
      },
      research,
    });
    expect(table.chest).toMatchObject({ mev: 7, mav: 15, mrv: 23 });
    expect(source.chest).toBe('adapted');
    expect(table.quads).toMatchObject(research.quads);
    expect(source.quads).toBe('research');
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
    // RE-PINNED 2026-10-05 (D219): the malformed layer is the adapted one now (the manual layer is retired).
    const { table, source } = mergeLandmarkPrecedence({
      adapted: { chest: { mev: 'x', mav: null, mrv: 24, isAdapted: true } },
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

  // RE-PINNED 2026-10-05 (D219, founder answer "Remove the editor"): this read the stored custom targets and
  // expected them to win. The blob is never read now: the table is what a person who never set any gets.
  test('a stored custom-target blob is not read and does not win', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ chest: { mev: 9, mav: 15, mrv: 23 } }));
    getAdaptiveLandmarkHistory.mockResolvedValue([]);
    const { table, source } = await getEffectiveLandmarks('u1');
    expect(source.chest).toBe('research');
    expect(table.chest).toMatchObject(VOLUME_LANDMARKS.chest);
    expect(table.back).toMatchObject(VOLUME_LANDMARKS.back);
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  });

  test('resolves adapted values through the REAL engine for every user', async () => {
    // Real computeAdaptiveLandmarks: 3+ entries flips isAdapted for that
    // muscle; the merge then prefers it over research.
    getAdaptiveLandmarkHistory.mockResolvedValue([
      { muscle: 'chest', pumpScore: 4, sorenessScore: 2, jointDiscomfort: 0, performanceTrend: 1, prFrequency: 1, missedReps: 0, weeklyVolume: 16 },
      { muscle: 'chest', pumpScore: 4, sorenessScore: 2, jointDiscomfort: 0, performanceTrend: 1, prFrequency: 1, missedReps: 0, weeklyVolume: 16 },
      { muscle: 'chest', pumpScore: 4, sorenessScore: 1, jointDiscomfort: 0, performanceTrend: 1, prFrequency: 1, missedReps: 0, weeklyVolume: 18 },
    ]);
    const { source } = await getEffectiveLandmarks('u1');
    expect(source.chest).toBe('adapted');
    expect(source.quads).toBe('research');
  });

  test('a failed adaptive-history read fails open to research, never throws', async () => {
    // RE-PINNED 2026-10-05 (D219): the pref read this also failed is gone with the manual layer.
    getAdaptiveLandmarkHistory.mockRejectedValue(new Error('db down'));
    const { table, source } = await getEffectiveLandmarks('u1');
    expect(source.chest).toBe('research');
    expect(table.chest).toMatchObject(VOLUME_LANDMARKS.chest);
  });
});

// RE-PINNED 2026-10-05 (D219, founder answer "Remove the editor"): this describe pinned that only a REAL edit
// counted as manual in the merge (Stage 6 blocker #1). Nothing counts as manual now, real edit or untouched
// default, so the merge falls through to adapted, then research, for every entry.
describe('C6 RA6-1 (D97-25): no stored entry, a real edit or an untouched default, reaches the merge as manual', () => {
  test('a legacy full-table save and a genuine edit both fall through to the adapted layer, then research', () => {
    const { table, source } = mergeLandmarkPrecedence({
      // The old editor saved EVERY muscle on any save; chest here is the
      // research default byte-for-byte, quads is a genuine edit.
      manual: {
        chest: { mev: 6, mav: 14, mrv: 22 }, // untouched default
        quads: { mev: 10, mav: 16, mrv: 20 }, // real edit (mev differs): once "manual", now ignored
      },
      adapted: { chest: { mev: 7, mav: 15, mrv: 23, isAdapted: true } },
      research,
    });
    expect(source.chest).toBe('adapted');
    expect(table.chest).toMatchObject({ mev: 7, mav: 15, mrv: 23 });
    expect(source.quads).toBe('research'); // the genuine edit is no longer applied
    expect(table.quads).toMatchObject(research.quads);
  });

  test('an untouched default with no adapted layer stays research, still not "manual"', () => {
    const { source } = mergeLandmarkPrecedence({
      manual: { chest: { mev: 6, mav: 14, mrv: 22 } },
      research,
    });
    expect(source.chest).toBe('research');
  });
});
