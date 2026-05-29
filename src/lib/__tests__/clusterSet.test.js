/**
 * clusterSet.test.js
 *
 * Myo-rep / rest-pause cluster maths + copy. This is the logic behind
 * the live-workout cluster banner (GAP row 19): the banner accumulates
 * a rep list and this module turns it into the single workout_sets row
 * (summed reps + breakdown note) that keeps a cluster counting as one
 * working set without a schema change.
 */
import {
  isClusterType, clusterLabel, summariseCluster, mergeClusterNote,
  CLUSTER_SET_TYPES,
} from '../clusterSet';

describe('isClusterType / clusterLabel', () => {
  test('myo_reps and rest_pause are clusters', () => {
    expect(isClusterType('myo_reps')).toBe(true);
    expect(isClusterType('rest_pause')).toBe(true);
    expect(CLUSTER_SET_TYPES).toEqual(['myo_reps', 'rest_pause']);
  });
  test('straight / warmup / dropset / amrap are not', () => {
    for (const t of ['straight', 'warmup', 'dropset', 'amrap', 'superset', undefined, null]) {
      expect(isClusterType(t)).toBe(false);
    }
  });
  test('labels', () => {
    expect(clusterLabel('myo_reps')).toBe('Myo-reps');
    expect(clusterLabel('rest_pause')).toBe('Rest-pause');
    expect(clusterLabel('straight')).toBeNull();
  });
});

describe('summariseCluster', () => {
  test('sums every effort and formats the breakdown', () => {
    expect(summariseCluster('myo_reps', [15, 5, 4, 3])).toEqual({
      totalReps: 27,
      effortCount: 4,
      notes: 'Myo-reps: 15, 5, 4, 3',
    });
  });

  test('rest-pause label', () => {
    expect(summariseCluster('rest_pause', [12, 4, 3])).toEqual({
      totalReps: 19,
      effortCount: 3,
      notes: 'Rest-pause: 12, 4, 3',
    });
  });

  test('activation only (no mini-sets yet) still summarises', () => {
    expect(summariseCluster('myo_reps', [20])).toEqual({
      totalReps: 20,
      effortCount: 1,
      notes: 'Myo-reps: 20',
    });
  });

  test('coerces strings and drops junk reps', () => {
    expect(summariseCluster('myo_reps', ['15', 0, -2, null, '5', NaN])).toEqual({
      totalReps: 20,
      effortCount: 2,
      notes: 'Myo-reps: 15, 5',
    });
  });

  test('no valid reps returns null (nothing to log)', () => {
    expect(summariseCluster('myo_reps', [])).toBeNull();
    expect(summariseCluster('myo_reps', [0, -1, null])).toBeNull();
    expect(summariseCluster('myo_reps', 'nope')).toBeNull();
  });
});

describe('mergeClusterNote', () => {
  test('breakdown only when no user note', () => {
    expect(mergeClusterNote('', 'Myo-reps: 15, 5')).toBe('Myo-reps: 15, 5');
    expect(mergeClusterNote(null, 'Myo-reps: 15, 5')).toBe('Myo-reps: 15, 5');
  });
  test('keeps the user note and appends the breakdown', () => {
    expect(mergeClusterNote('felt strong', 'Myo-reps: 15, 5')).toBe('felt strong (Myo-reps: 15, 5)');
  });
  test('user note only when there is no breakdown', () => {
    expect(mergeClusterNote('felt strong', '')).toBe('felt strong');
  });
});
