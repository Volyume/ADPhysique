/**
 * X6 (cross-surface consistency audit 2026-07-30,
 * docs/audit/cross-surface-consistency-audit-2026-07-30.md): CoachReviewScreen's
 * "total sets" stat used to sum muscle CREDIT from calculateWeeklyVolume
 * (allocateExerciseVolume gives each secondary muscle 0.5+), not a set count.
 * Ten straight sets of an exercise with two secondary muscles displayed as
 * 20 "total sets" instead of 10.
 *
 * Ruled: set counts COUNT SETS. This pins the real screen against a real
 * multi-muscle exercise: 10 working sets of an exercise whose primary is
 * chest and secondaries are triceps + front delts (0.5 credit each, i.e.
 * 10 + 5 + 5 = 20 units of volume credit) must still render "10", not "20".
 */
const fs = require('fs');
const path = require('path');

import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';

const mockNavigation = { getParent: jest.fn(), navigate: jest.fn() };

const mockNow = Date.now();

function mockBench() {
  return {
    id: 'ex-bench',
    name: 'Bench Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'front_delts'],
  };
}

function mockTenBenchSets() {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `set-${i}`,
    workoutId: 'w1',
    exerciseId: 'ex-bench',
    weight: 60,
    actualReps: 8,
    setType: 'straight',
    createdAt: mockNow,
  }));
}

jest.mock('../../lib/database', () => ({
  getAllWorkouts: jest.fn(() => Promise.resolve([
    { id: 'w1', isCompleted: true, startedAt: mockNow, jointDiscomfort: 0, soreness24hBefore: 0 },
  ])),
  getCompletedWorkoutSets: jest.fn(() => Promise.resolve(mockTenBenchSets())),
  getAllExercises: jest.fn(() => Promise.resolve([mockBench()])),
  getRecentCheckins: jest.fn(() => Promise.resolve([])),
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

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'CoachReviewScreen.js'), 'utf8');
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

async function mount() {
  let tree;
  await act(async () => { tree = create(<CoachReviewScreen />); });
  await flush();
  return tree;
}

describe('X6: CoachReviewScreen total-sets stat counts sets, not muscle credit', () => {
  beforeEach(() => {
    useAppStore.setState({ user: { id: 'u1' } });
    jest.clearAllMocks();
  });

  test('source guard: derives totalSets from summariseWorkoutSets, not a workingSets credit sum', () => {
    expect(SOURCE).toMatch(/summariseWorkoutSets/);
    expect(SOURCE).toMatch(/const totalSets = weeklySetCount;/);
    // The old bug: reduce(...) summing data.workingSets (muscle credit) must be gone.
    expect(SOURCE).not.toMatch(/trainedMuscles\.reduce\(\(sum, \[, data\]\) => sum \+ data\.workingSets, 0\)/);
  });

  test('10 sets of a 2-secondary-muscle exercise render "10" total sets, not "20"', async () => {
    const tree = await mount();
    const texts = tree.root.findAllByType(Text).map((n) => {
      const c = n.props.children;
      return Array.isArray(c) ? c.join('') : c;
    });
    const idx = texts.findIndex((t) => String(t) === 'total sets');
    expect(idx).toBeGreaterThan(-1);
    expect(String(texts[idx - 1])).toBe('10');
    expect(String(texts[idx - 1])).not.toBe('20');
  });
});
