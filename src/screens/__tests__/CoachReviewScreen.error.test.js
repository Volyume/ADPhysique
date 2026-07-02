/**
 * U-B-6 regression: the free CoachReview screen must tell a genuine read failure
 * apart from a genuinely-empty week. A read throw renders the retryable error
 * state; a clean empty result renders the no-data card. (The first build added
 * this behaviour but left no test — recorded follow-up "add an error-state
 * regression test", _AUDIT-STATUS-AND-RESUME.md.)
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../lib/database', () => ({
  getAllWorkouts: jest.fn(),
  getCompletedWorkoutSets: jest.fn(() => Promise.resolve([])),
  getAllExercises: jest.fn(() => Promise.resolve([])),
  getRecentCheckins: jest.fn(() => Promise.resolve([])),
}));

// expo-haptics can't construct its native EventEmitter in the bare test env;
// mock it as the mount suites do (screen-mount.test.js). The screen reaches
// it through Button -> lib/haptics (audit 03b M1).
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import CoachReviewScreen from '../CoachReviewScreen';
import useAppStore from '../../store/useAppStore';
import { getAllWorkouts } from '../../lib/database';

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

async function mount() {
  let tree;
  await act(async () => { tree = create(<CoachReviewScreen />); });
  await flush();
  return JSON.stringify(tree.toJSON());
}

describe('CoachReviewScreen — U-B-6 read-error vs no-data', () => {
  beforeEach(() => {
    useAppStore.setState({ user: { id: 'u1' } });
    jest.clearAllMocks();
  });

  test('a read failure shows the retryable error state, not a false "no sessions"', async () => {
    getAllWorkouts.mockImplementation(() => Promise.reject(new Error('read fault')));
    const json = await mount();
    expect(json).toContain('Try again');
    expect(json).toContain('not a lost week');
    expect(json).not.toContain('No sessions logged this week');
  });

  test('a genuinely-empty week shows the no-data card, not the error state', async () => {
    getAllWorkouts.mockImplementation(() => Promise.resolve([]));
    const json = await mount();
    expect(json).toContain('No sessions logged this week');
    expect(json).not.toContain('Try again');
    expect(json).not.toContain('not a lost week');
  });
});
