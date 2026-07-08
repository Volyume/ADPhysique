/**
 * U-B-6 regression: the free CoachReview screen must tell a genuine read failure
 * apart from a genuinely-empty week. A read throw renders the retryable error
 * state; a clean empty result renders the no-data card. (The first build added
 * this behaviour but left no test — recorded follow-up "add an error-state
 * regression test", _AUDIT-STATUS-AND-RESUME.md.)
 */
const fs = require('fs');
const path = require('path');

import { create, act } from 'react-test-renderer';

const mockNavigation = { getParent: jest.fn(), navigate: jest.fn() };
const mockNavigateCrossTab = jest.fn();

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
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));
jest.mock('../../navigation/navigateCrossTab', () => ({
  navigateCrossTab: (...args) => mockNavigateCrossTab(...args),
}));

import CoachReviewScreen from '../CoachReviewScreen';
import useAppStore from '../../store/useAppStore';
import { getAllWorkouts } from '../../lib/database';

const source = fs.readFileSync(path.join(__dirname, '..', 'CoachReviewScreen.js'), 'utf8');
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

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

  test('read failure uses the shared EmptyState treatment', () => {
    expect(source).toMatch(/import EmptyState from '\.\.\/components\/EmptyState';/);
    expect(source).toMatch(/const loadRequestRef = useRef\(0\);/);
    expect(source).toMatch(/if \(!isCurrentRequest\(\)\) return;[\s\S]*setLoadError\(true\);/);
    expect(source).toMatch(
      /<EmptyState[\s\S]*icon="warning-outline"[\s\S]*title="Couldn't load your review"[\s\S]*text="Your sessions are safe\. This is a loading problem, not lost data\."[\s\S]*actionLabel="Try again"[\s\S]*onAction=\{retryLoad\}/,
    );
  });

  test('a read failure shows the retryable error state, not a false "no sessions"', async () => {
    getAllWorkouts.mockImplementation(() => Promise.reject(new Error('read fault')));
    const json = await mount();
    expect(json).toContain('Try again');
    expect(json).toContain('not lost data');
    expect(json).not.toContain('No sessions logged this week');
  });

  test('a genuinely-empty week shows the no-data card, not the error state', async () => {
    getAllWorkouts.mockImplementation(() => Promise.resolve([]));
    let tree;
    await act(async () => { tree = create(<CoachReviewScreen />); });
    await flush();
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('No sessions logged this week');
    expect(json).toContain('Start a workout');
    const start = tree.root.findByProps({ accessibilityLabel: 'Start a workout' });
    await act(async () => { start.props.onPress(); });
    expect(mockNavigateCrossTab).toHaveBeenCalledWith(mockNavigation, 'HomeTab', 'BuildWorkout');
    expect(json).not.toContain('Try again');
    expect(json).not.toContain('not lost data');
  });

  test('an older failed load cannot overwrite a newer successful review', async () => {
    const older = deferred();
    const newer = deferred();
    getAllWorkouts.mockImplementation((userId) => (
      userId === 'u1' ? older.promise : newer.promise
    ));

    let tree;
    await act(async () => { tree = create(<CoachReviewScreen />); });
    await flush();
    await act(async () => { useAppStore.setState({ user: { id: 'u2' } }); });
    await flush();
    expect(getAllWorkouts).toHaveBeenCalledWith('u1');
    expect(getAllWorkouts).toHaveBeenCalledWith('u2');

    await act(async () => { newer.resolve([]); });
    await flush();
    let json = JSON.stringify(tree.toJSON());
    expect(json).toContain('No sessions logged this week');
    expect(json).not.toContain('not lost data');

    await act(async () => { older.reject(new Error('late old failure')); });
    await flush();
    json = JSON.stringify(tree.toJSON());
    expect(json).toContain('No sessions logged this week');
    expect(json).not.toContain('not lost data');
  });
});
