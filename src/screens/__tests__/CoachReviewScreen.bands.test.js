/**
 * CoachReviewScreen -- the check-in review judges a muscle's weekly sets by the
 * one judgement every surface shares (D219 lane A5, design 5.3).
 *
 * The founder's case (register D219): "As I did 27 sets of biceps which is upper
 * tier but it shows I have overtrained or something." The review's "What stood
 * out" used to print "Biceps - more sets than you can comfortably recover from"
 * in the error colour for anything above a landmark ceiling, whatever the plan
 * intended. It now reads volumeJudgement.judgeWeek with the muscle's role from
 * the active plan's facts. What this pins, and why:
 *   - 27 weekly biceps sets for a muscle the plan raised read as "focus range"
 *     under "What went well", with the reason, and are NOT in "What stood out";
 *   - the same 27 sets for a muscle the plan did not raise read as "above normal
 *     growth" under "What stood out", described and never blamed ("This is
 *     focus-level volume for a muscle that is not a focus in your plan.");
 *   - the volume rows' badges say the one judgement's words, and no line says
 *     "too much", "more sets than you can comfortably recover from" or
 *     "approaching the upper limit";
 *   - the deload check is handed the roles, so a focus muscle is never counted as
 *     over (design 5.3, the over-MRV pass).
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
jest.mock('../../lib/effectiveLandmarks', () => ({ getPlanRoles: jest.fn() }));

import CoachReviewScreen from '../CoachReviewScreen';
import useAppStore from '../../store/useAppStore';
import * as database from '../../lib/database';
import * as algorithms from '../../lib/algorithms';
import { buildExerciseLookup } from '../../lib/exercise/lookup';

import { getPlanRoles } from '../../lib/effectiveLandmarks';

const flush = () => act(async () => {
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
});

const NOW = Date.now();
const CURL = { id: 'ex-curl', name: 'Barbell Curl', primaryMuscle: 'biceps', secondaryMuscles: [] };

const curlSets = (n) => Array.from({ length: n }, (_, i) => ({
  id: `c${i}`, workoutId: 'w1', exerciseId: 'ex-curl', weight: 20, actualReps: 10, setType: 'straight', createdAt: NOW,
}));

let currentTree = null;

async function mount() {
  let tree;
  await act(async () => { tree = create(<CoachReviewScreen />); });
  await flush();
  currentTree = tree;
  return tree;
}

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

beforeEach(() => {
  useAppStore.setState({ user: { id: 'u1' } });
  jest.clearAllMocks();
  getPlanRoles.mockResolvedValue({});
  database.getAllWorkouts.mockImplementation(() => Promise.resolve([
    { id: 'w1', isCompleted: true, startedAt: NOW, jointDiscomfort: 0, soreness24hBefore: 0 },
  ]));
  database.getCompletedWorkoutSets.mockImplementation(() => Promise.resolve(curlSets(27)));
  database.getAllExercises.mockImplementation(() => Promise.resolve([CURL]));
  database.getExerciseLookup.mockImplementation(() => Promise.resolve(buildExerciseLookup([CURL])));
  database.getCurrentMesocycleWeek.mockImplementation(() => Promise.resolve(null));
});

const RETIRED = /Too much|more sets than you can comfortably recover|approaching the upper limit|past the upper limit|overtrain/i;

describe("the check-in review, the founder's 27 biceps sets", () => {
  test('biceps raised by the plan: "focus range" under what went well, with the reason, and not under what stood out', async () => {
    getPlanRoles.mockResolvedValue({ biceps: 'focus' });
    const t = texts(await mount());
    const all = t.join(' | ');
    expect(t).toContain('Biceps - focus range');
    expect(t).toContain('Biceps are your focus this block: 27 sets, inside the focus range of 20 to 30.');
    // The volume row's badge says the one judgement's word.
    expect(t).toContain('Focus range');
    expect(all).not.toMatch(RETIRED);
    // "What stood out" holds nothing for it: its empty line is printed.
    expect(t).toContain('Nothing to flag this week, your training is looking nicely balanced.');
  });

  test('biceps NOT raised by the plan: "above normal growth" under what stood out, described and not blamed', async () => {
    const t = texts(await mount());
    const all = t.join(' | ');
    expect(t).toContain('Biceps - above normal growth');
    expect(t).toContain('Above the normal growth range. This is focus-level volume for a muscle that is not a focus in your plan.');
    expect(t).toContain('Above normal growth');
    expect(all).not.toMatch(RETIRED);
    expect(t).not.toContain('Nothing to flag this week, your training is looking nicely balanced.');
  });

  test('the deload check is handed the plan roles, so a focus muscle is never counted as over', async () => {
    getPlanRoles.mockResolvedValue({ biceps: 'focus' });
    const spy = jest.spyOn(algorithms, 'buildLast4WeekDeloadBuckets');
    try {
      await mount();
      expect(spy).toHaveBeenCalledTimes(1);
      const [, , , opts] = spy.mock.calls[0];
      expect(opts.roles).toEqual({ biceps: 'focus' });
    } finally {
      spy.mockRestore();
    }
  });

  test('source: the review reads the one judgement and no engine verdict or warning colour on a muscle', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'CoachReviewScreen.js'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(code).toMatch(/import \{ judgeWeek, roleFor, toneColors, GROUP, TONE \} from '\.\.\/lib\/volumeJudgement';/);
    expect(code).not.toMatch(/getVolumeStatus|statusDotColor|volumeStatusLabel/);
    expect(code).not.toMatch(RETIRED);
  });
});
