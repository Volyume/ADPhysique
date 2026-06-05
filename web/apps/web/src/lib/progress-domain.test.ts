import { describe, it, expect } from 'vitest';
import {
  getVolumeStatus,
  estimatedOneRepMax,
  canonicalExerciseId,
  libraryById,
  VOLUME_LANDMARKS,
} from '@volyume/supabase';

describe('getVolumeStatus against the recalibrated triceps band (mev6/mav14/mrv22)', () => {
  it('0 sets reads below', () => expect(getVolumeStatus(0, 'triceps')).toBe('below'));
  it('7 sets reads minimum (within mev+2)', () => expect(getVolumeStatus(7, 'triceps')).toBe('minimum'));
  it('10 sets reads optimal', () => expect(getVolumeStatus(10, 'triceps')).toBe('optimal'));
  it('20 sets reads near_mrv, not over (the founder case)', () =>
    expect(getVolumeStatus(20, 'triceps')).toBe('near_mrv'));
  it('23 sets reads over_mrv', () => expect(getVolumeStatus(23, 'triceps')).toBe('over_mrv'));

  it('triceps mrv is 22 after recalibration', () => expect(VOLUME_LANDMARKS.triceps?.mrv).toBe(22));
});

describe('estimatedOneRepMax (Epley)', () => {
  it('returns the weight for a single', () => expect(estimatedOneRepMax(100, 1)).toBe(100));
  it('applies the rep factor', () => expect(estimatedOneRepMax(100, 10)).toBeCloseTo(133.33, 1));
  it('guards bad input', () => expect(estimatedOneRepMax(0, 5)).toBe(0));
});

describe('exercise library resolves canonical ids to muscles', () => {
  it('Rope Pushdown hashes to its known canonical id', () => {
    expect(canonicalExerciseId('Rope Pushdown')).toBe('aac1c182-2881-47d6-aaac-135eb2fea31d');
  });
  it('the bundled library maps that id back to the exercise', () => {
    const ex = libraryById().get(canonicalExerciseId('Rope Pushdown'));
    expect(ex?.name).toBe('Rope Pushdown');
    expect(ex?.primary).toBe('triceps');
  });
  it('a pressing compound lists triceps as a secondary', () => {
    const ex = libraryById().get(canonicalExerciseId('Incline Barbell Bench Press'));
    expect(ex?.primary).toBe('chest');
    expect(ex?.secondary).toContain('triceps');
  });
});
