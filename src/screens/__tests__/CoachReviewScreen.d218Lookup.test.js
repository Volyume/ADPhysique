/**
 * D218 (founder order 2026-10-03: "I need you to check across the board and
 * ensure all exercises are logged and reported correct after the workout
 * ends"; audit docs/audit/exercise-logging-reporting-audit-2026-10-03/
 * 00-FINDINGS.md, F-3, F-17 and F-25 caller): the Training review reads the
 * exercise library through the ONE unfiltered, survivor-aware lookup
 * (getExerciseLookup), not getAllExercises(), which hides a soft-deleted
 * custom exercise (EL-18).
 *
 * Before D218 this screen dropped every set logged on such an exercise from
 * "Volume this week" and from the progression wins (`if (!exercise) continue`
 * over a map built from the filtered library), while its own "total sets"
 * tile counted them: the same week read two different set totals on one
 * screen. This pins, against the real screen:
 *  - a muscle trained only through a soft-deleted custom exercise is listed
 *    under "Volume this week" with its sets;
 *  - a progression win on that exercise is named (the plain map the win
 *    detector reads is built from the lookup);
 *  - the deload bucket builder is handed the lookup itself (its over-MRV pass
 *    credits through it), with its options exactly as before (Monday-anchored
 *    weeks, no zero-fill, no recency override: see also
 *    CoachReviewScreen.deloadDerivation.guard.test.js);
 *  - a lookup that resolves nothing never crashes the review, and a lookup
 *    read that FAILS is the screen's own retryable error state (U-B-6), never
 *    a review that silently credits nothing;
 *  - the "total sets" tile still counts every non-warm-up set (the summary
 *    tile's definition, unchanged).
 */
const fs = require('fs');
const path = require('path');

import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';

const mockNavigation = { getParent: jest.fn(), navigate: jest.fn() };

jest.mock('../../lib/database', () => ({
  getAllWorkouts: jest.fn(),
  getCompletedWorkoutSets: jest.fn(),
  // The FILTERED library: a soft-deleted custom exercise is not in it (EL-18).
  getAllExercises: jest.fn(),
  // The shared UNFILTERED lookup, which is what the review must read.
  getExerciseLookup: jest.fn(),
  getRecentCheckins: jest.fn(() => Promise.resolve([])),
  getCurrentMesocycleWeek: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));
jest.mock('../../navigation/navigateCrossTab', () => ({
  navigateCrossTab: jest.fn(),
}));

import CoachReviewScreen from '../CoachReviewScreen';
import useAppStore from '../../store/useAppStore';
import * as database from '../../lib/database';
import * as algorithms from '../../lib/algorithms';
import { buildExerciseLookup } from '../../lib/exercise/lookup';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'CoachReviewScreen.js'), 'utf8');
const flush = () => act(async () => {
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
});

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

const BENCH = { id: 'ex-bench', name: 'Bench Press', primaryMuscle: 'chest', secondaryMuscles: [] };
// Created by the person, then deleted from the library: the row stays, flagged.
const DELETED_CURL = {
  id: 'ex-custom-curl', name: 'Zottman Curl X', primaryMuscle: 'biceps', secondaryMuscles: [],
  isCustom: 1, deletedAt: NOW - 3 * DAY,
};

function setRow(id, exerciseId, weight, createdAt) {
  return {
    id, workoutId: 'w1', exerciseId, weight, actualReps: 12, setType: 'straight', createdAt,
  };
}

const WEEK_SETS = [
  setRow('b1', 'ex-bench', 60, NOW),
  setRow('b2', 'ex-bench', 60, NOW),
  setRow('c1', 'ex-custom-curl', 20, NOW),
  setRow('c2', 'ex-custom-curl', 20, NOW),
  setRow('c3', 'ex-custom-curl', 20, NOW),
];
// The same exercise two weeks ago, lighter: this week's 20 kg is a heavier-weight win.
const PRIOR_SETS = [setRow('p1', 'ex-custom-curl', 15, NOW - 14 * DAY)];

let currentTree = null;

async function mount() {
  let tree;
  await act(async () => { tree = create(<CoachReviewScreen />); });
  await flush();
  currentTree = tree;
  return tree;
}

// Unmount between tests so a store write in the next beforeEach never re-renders a stale tree.
afterEach(() => {
  if (currentTree) {
    try { act(() => { currentTree.unmount(); }); } catch (_) { /* already unmounted */ }
    currentTree = null;
  }
});

function texts(tree) {
  return tree.root.findAllByType(Text).map((n) => {
    const c = n.props.children;
    return String(Array.isArray(c) ? c.join('') : c);
  });
}

describe('D218 (F-3): the Training review credits every logged set through the unfiltered lookup', () => {
  beforeEach(() => {
    useAppStore.setState({ user: { id: 'u1' } });
    jest.clearAllMocks();
    database.getAllWorkouts.mockImplementation(() => Promise.resolve([
      { id: 'w1', isCompleted: true, startedAt: NOW, jointDiscomfort: 0, soreness24hBefore: 0 },
    ]));
    database.getCompletedWorkoutSets.mockImplementation(() => Promise.resolve([...WEEK_SETS, ...PRIOR_SETS]));
    database.getAllExercises.mockImplementation(() => Promise.resolve([BENCH]));
    database.getExerciseLookup.mockImplementation(() => Promise.resolve(buildExerciseLookup([BENCH, DELETED_CURL])));
    database.getCurrentMesocycleWeek.mockImplementation(() => Promise.resolve(null));
  });

  test('a muscle trained only through a soft-deleted custom exercise is listed under "Volume this week" with its sets', async () => {
    const t = texts(await mount());
    // Each volume row is its muscle's name followed by its set count.
    const rows = t.map((text, i) => [text, t[i + 1]]);
    expect(rows).toContainEqual(['Biceps', '3 sets']);
    // The live exercise still credits its own muscle.
    expect(rows).toContainEqual(['Chest', '2 sets']);
  });

  test('the progression win on a soft-deleted custom exercise is named', async () => {
    const t = texts(await mount());
    expect(t).toContain('Zottman Curl X - heavier weight this week');
  });

  test('the "total sets" tile still counts every non-warm-up set of the week (5), unchanged', async () => {
    const t = texts(await mount());
    expect(t[t.indexOf('total sets') - 1]).toBe('5');
  });

  test('the deload bucket builder is handed the lookup itself, with its options exactly as before', async () => {
    const spy = jest.spyOn(algorithms, 'buildLast4WeekDeloadBuckets');
    try {
      await mount();
      expect(spy).toHaveBeenCalledTimes(1);
      const [, , exerciseMap, opts] = spy.mock.calls[0];
      expect(typeof exerciseMap.resolve).toBe('function');
      expect(exerciseMap.get('ex-custom-curl')).toMatchObject({ name: 'Zottman Curl X' });
      expect(Object.keys(opts)).toEqual(['weekAnchorMs']);
    } finally {
      spy.mockRestore();
    }
  });

  test('a lookup that resolves nothing never crashes the review: the sessions card still renders, never the error state', async () => {
    database.getExerciseLookup.mockImplementation(() => Promise.resolve(undefined));
    const t = texts(await mount());
    expect(t).toContain('Sessions this week');
    expect(t).not.toContain("Couldn't load your review");
  });

  test('a failed lookup read is the retryable error state (U-B-6), never a review that silently credits nothing', async () => {
    database.getExerciseLookup.mockImplementation(() => Promise.reject(new Error('exercises unreadable')));
    const t = texts(await mount());
    expect(t).toContain("Couldn't load your review");
    expect(t).not.toContain('Sessions this week');
  });

  test('source guard: the screen reads the lookup and no longer reads the filtered library', () => {
    expect(SOURCE).toMatch(/getExerciseLookup/);
    expect(SOURCE).not.toMatch(/getAllExercises/);
    expect(SOURCE).toMatch(/calculateWeeklyVolume\(thisWeekSets, lookup\)/);
    expect(SOURCE).toMatch(/buildLast4WeekDeloadBuckets\(allSets, allWorkouts, lookup, \{/);
    // The set tile keeps the summary's definition: every non-warm-up set.
    expect(SOURCE).toMatch(/summariseWorkoutSets\(thisWeekSets\)\.workingSetCount/);
  });
});
