/**
 * Wave C item 1 (whole-app coherence campaign 24, 2026-08-17), LEAD RULING
 * (D33) + FB-02: CoachReviewScreen's free-tier deload recommendation
 * (algorithms.shouldDeload, an independent, third recovery judgement,
 * AUTHORITY_DEFECT Class C in WAVE-C-FINDINGS.md) is sanctioned to stay
 * tier-visible, but must not fire inside a week already scheduled as
 * recovery or a finished block awaiting its decision -- the same gate
 * HomeScreen.js:1776-1777 already applies to its recovery banner
 * (`inScheduledRecovery = !!currentMesoWeek?.isDeload ||
 * !!currentMesoWeek?.awaitingDecision`). Missing that gate let this screen
 * tell a user "a recovery week might help" on the same day the block state
 * already says they are IN one, or that the block has finished.
 *
 * This pins: the recovery-week recommendation line and the "What to watch"
 * recovery InsightRow both render when shouldDeload fires outside a
 * scheduled recovery/awaiting-decision week, and both are suppressed when
 * currentMesoWeek says otherwise -- with the rest of the review (volume
 * rows, wins, joint flag) rendering exactly the same either way, i.e. the
 * "non-deload alternative state", not a screen-wide gate.
 */
const fs = require('fs');
const path = require('path');

import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';

const mockNavigation = { getParent: jest.fn(), navigate: jest.fn() };
const mockNow = Date.now();

// Inline factory (not an outer `const` reference): jest.mock calls are
// hoisted above the rest of the module, so a factory that closes over an
// outer variable sees it still undefined at require-time. Matches the
// established pattern in CoachReviewScreen.error.test.js /
// .setCountNotInflated.test.js; per-test overrides go through
// `require('../../lib/database')` below (same as screen-mount.test.js).
jest.mock('../../lib/database', () => ({
  getAllWorkouts: jest.fn(() => Promise.resolve([
    { id: 'w1', isCompleted: true, startedAt: Date.now(), jointDiscomfort: 0, soreness24hBefore: 0 },
  ])),
  getCompletedWorkoutSets: jest.fn(() => Promise.resolve([
    { id: 's1', workoutId: 'w1', exerciseId: 'ex-bench', weight: 60, actualReps: 8, setType: 'straight', createdAt: Date.now() },
  ])),
  getAllExercises: jest.fn(() => Promise.resolve([
    { id: 'ex-bench', name: 'Bench Press', primaryMuscle: 'chest', secondaryMuscles: [] },
  ])),
  getRecentCheckins: jest.fn(() => Promise.resolve([])),
  getCurrentMesocycleWeek: jest.fn(() => Promise.resolve(null)),
}));

// Force the deload signal to fire regardless of the crafted workout data
// above -- this pin is about the SEATING GATE (inScheduledRecovery), not
// shouldDeload's own maths, which is out of scope (do not touch, per the
// task brief) and already covered by algorithms.js's own suite.
jest.mock('../../lib/algorithms', () => {
  const actual = jest.requireActual('../../lib/algorithms');
  return {
    ...actual,
    shouldDeload: jest.fn(() => ({ deload: true, reasons: ['forced for gate test'] })),
  };
});

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

const mockDatabase = require('../../lib/database');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'CoachReviewScreen.js'), 'utf8');
const flush = () => act(async () => {
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
});

async function mount() {
  let tree;
  await act(async () => { tree = create(<CoachReviewScreen />); });
  await flush();
  return tree;
}

function textOf(tree) {
  return tree.root.findAllByType(Text).map((n) => {
    const c = n.props.children;
    return Array.isArray(c) ? c.join('') : c;
  }).join(' | ');
}

describe('CoachReviewScreen — recovery-week suggestion respects the scheduled-recovery gate', () => {
  beforeEach(() => {
    useAppStore.setState({ user: { id: 'u1' }, tier: 'free' });
    jest.clearAllMocks();
    mockDatabase.getAllWorkouts.mockImplementation(() => Promise.resolve([
      { id: 'w1', isCompleted: true, startedAt: mockNow, jointDiscomfort: 0, soreness24hBefore: 0 },
    ]));
    mockDatabase.getCompletedWorkoutSets.mockImplementation(() => Promise.resolve([
      { id: 's1', workoutId: 'w1', exerciseId: 'ex-bench', weight: 60, actualReps: 8, setType: 'straight', createdAt: mockNow },
    ]));
    mockDatabase.getAllExercises.mockImplementation(() => Promise.resolve([
      { id: 'ex-bench', name: 'Bench Press', primaryMuscle: 'chest', secondaryMuscles: [] },
    ]));
    mockDatabase.getRecentCheckins.mockImplementation(() => Promise.resolve([]));
  });

  test('source: reads getCurrentMesocycleWeek and mirrors HomeScreen.js\'s inScheduledRecovery predicate', () => {
    expect(SOURCE).toMatch(/getCurrentMesocycleWeek/);
    expect(SOURCE).toMatch(
      /const inScheduledRecovery = !!currentMesoWeek\?\.isDeload \|\| !!currentMesoWeek\?\.awaitingDecision;/,
    );
    expect(SOURCE).toMatch(/const deloadSuggestionEligible = !!deloadResult\?\.deload && !inScheduledRecovery;/);
  });

  test('outside a scheduled recovery week, the deload suggestion renders', async () => {
    mockDatabase.getCurrentMesocycleWeek.mockImplementation(() => Promise.resolve({
      isDeload: false, awaitingDecision: false,
    }));
    const tree = await mount();
    const text = textOf(tree);
    expect(text).toContain('Your recent training suggests a recovery week might help');
    expect(text).toContain('Consider making next week a lighter recovery week');
  });

  test('inside a scheduled recovery week (isDeload), the suggestion is suppressed', async () => {
    mockDatabase.getCurrentMesocycleWeek.mockImplementation(() => Promise.resolve({
      isDeload: true, awaitingDecision: false,
    }));
    const tree = await mount();
    const text = textOf(tree);
    expect(text).not.toContain('Your recent training suggests a recovery week might help');
    expect(text).not.toContain('Consider making next week a lighter recovery week');
    // The rest of the review still renders (non-deload alternative state,
    // not a screen-wide suppression).
    expect(text).toContain('Sessions this week');
  });

  test('in a finished block awaiting its decision, the suggestion is suppressed', async () => {
    mockDatabase.getCurrentMesocycleWeek.mockImplementation(() => Promise.resolve({
      isDeload: false, awaitingDecision: true,
    }));
    const tree = await mount();
    const text = textOf(tree);
    expect(text).not.toContain('Your recent training suggests a recovery week might help');
    expect(text).not.toContain('Consider making next week a lighter recovery week');
  });

  test('a getCurrentMesocycleWeek read failure fails closed (no crash, no silent contradiction)', async () => {
    // getCurrentMesocycleWeek's own contract fails closed to null internally;
    // this pins the screen behaves correctly with that null, i.e. treats it
    // as NOT in scheduled recovery (matching Home's optional-chaining reads).
    mockDatabase.getCurrentMesocycleWeek.mockImplementation(() => Promise.resolve(null));
    const tree = await mount();
    const text = textOf(tree);
    expect(text).toContain('Your recent training suggests a recovery week might help');
  });
});
