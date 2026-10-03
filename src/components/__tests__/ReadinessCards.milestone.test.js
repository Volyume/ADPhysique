/**
 * ReadinessCards.milestone.test.js
 *
 * D214 (Consistency elevation, lane 4; plan
 * `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` section 7.3 item 3, CS-2, CS-14, RC-33). The sessions
 * milestone was a card: a gold trophy, the label of the LAST rung reached ("50
 * sessions" to a person with 53, CS-2), "47 to go: 100 sessions" and a bar. It is
 * ONE plain sentence now, under the twelve-week grid:
 *
 *   53 sessions logged since 26 June · next milestone 100
 *
 * the TRUE count of completed sessions (the ones with at least one set, the
 * same count the card always made), the day the first of them started and the
 * next rung of the same ladder; no trophy, no gold, no amber, no "to go"
 * countdown. It waits for its read (RC-33): before the workouts read lands, and
 * if it fails, there is no "1 session logged" or "First session" to claim.
 *
 * Why the section stays in ReadinessCards rather than Consistency reading the
 * count itself (the brief's two options): the count and its "has a set" rule
 * already live in this component's own load, the recoveryPlace guard pins
 * Consistency's `sections="milestone"` mount and this component's two milestone
 * branches, and a second counting site on the screen is exactly how the Recaps
 * gate and the milestone came to disagree (PR-12).
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => {
    const React = require('react');
    React.useEffect(callback, [callback]);
  }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: () => {} })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: () => {} })),
  SchedulableTriggerInputTypes: {
    DAILY: 'daily', WEEKLY: 'weekly', YEARLY: 'yearly', DATE: 'date', TIME_INTERVAL: 'timeInterval', CALENDAR: 'calendar',
  },
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1, NONE: 0 },
  AndroidNotificationPriority: { MAX: 'max', HIGH: 'high', DEFAULT: 'default' },
}));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((selector) => selector({ accessibility: { reduceMotion: true } })),
}));
jest.mock('../AnimatedEntrance', () => ({ children }) => children);
jest.mock('../InfoTooltip', () => () => null);
jest.mock('../SectionLabel', () => {
  const { Text: RNText } = require('react-native');
  return ({ children }) => <RNText>{children}</RNText>;
});
jest.mock('../Button', () => () => null);
jest.mock('../BodyDiagramHeatmap', () => () => null);
jest.mock('../FatigueTrendCard', () => () => null);
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../lib/database', () => ({
  getAllWorkouts: jest.fn(),
  getCompletedWorkoutSets: jest.fn(),
  getLastTrainedPerMuscle: jest.fn(),
  getRecentCheckins: jest.fn(),
  getRecentCompletedWorkouts: jest.fn(),
  getWorkoutSetsForWorkout: jest.fn(),
  getAllExercises: jest.fn(),
  // D218 (founder order 2026-10-03, audit F-2): ReadinessCards reads the
  // unfiltered exercise lookup; each test's own getAllExercises fixture stays
  // the contract by bridging the lookup to it.
  getExerciseLookup: jest.fn(async () => {
    const db = jest.requireMock('../../lib/database');
    const { buildExerciseLookup } = jest.requireActual('../../lib/exercise/lookup');
    return buildExerciseLookup(await db.getAllExercises());
  }),
}));

import ReadinessCards, { sessionsMilestoneLine } from '../ReadinessCards';
import * as database from '../../lib/database';

const DAY = 86400000;
const THIS_YEAR = new Date().getFullYear();
const SIXTH_OF_JUNE = new Date(THIS_YEAR, 5, 26, 9, 0, 0).getTime();

function texts(tree) {
  return tree.root.findAllByType(Text).map((n) => [].concat(n.props.children).join(''));
}
async function flush() {
  await act(async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); });
}
async function render() {
  let tree;
  await act(async () => { tree = create(<ReadinessCards userId="u1" sections="milestone" />); });
  await flush();
  return tree;
}

// `n` completed sessions, each with one set, the first starting 26 June.
function completedSessions(n) {
  const workouts = [];
  const sets = [];
  for (let i = 0; i < n; i++) {
    const id = `w${i}`;
    workouts.push({ id, isCompleted: 1, startedAt: SIXTH_OF_JUNE + i * DAY });
    sets.push({ id: `s${i}`, workoutId: id, createdAt: SIXTH_OF_JUNE + i * DAY });
  }
  return { workouts, sets };
}

beforeEach(() => {
  jest.clearAllMocks();
  database.getAllWorkouts.mockResolvedValue([]);
  database.getCompletedWorkoutSets.mockResolvedValue([]);
  database.getLastTrainedPerMuscle.mockResolvedValue({});
  database.getRecentCheckins.mockResolvedValue([]);
  database.getRecentCompletedWorkouts.mockResolvedValue([]);
  database.getAllExercises.mockResolvedValue([]);
});

describe('sessionsMilestoneLine: one plain sentence (CS-2)', () => {
  const NOW = new Date(THIS_YEAR, 8, 1, 12, 0, 0).getTime();

  test('the plan\'s own example, the true count and the next rung', () => {
    expect(sessionsMilestoneLine({ count: 53, sinceMs: SIXTH_OF_JUNE, now: NOW }))
      .toBe('53 sessions logged since 26 June · next milestone 100');
  });

  test('the count is the person\'s, never the last rung reached ("50 sessions" to a person with 53)', () => {
    const line = sessionsMilestoneLine({ count: 53, sinceMs: SIXTH_OF_JUNE, now: NOW });
    expect(line).toMatch(/^53 sessions/);
    expect(line).not.toMatch(/\b50 sessions\b|47|to go/);
  });

  test('every rung of the ladder: the next one is always the first above the count', () => {
    const rung = (count) => sessionsMilestoneLine({ count, sinceMs: SIXTH_OF_JUNE, now: NOW }).match(/next milestone (\d+)/)?.[1];
    expect([1, 9, 10, 24, 25, 49, 50, 99, 100, 249, 250, 499].map(rung))
      .toEqual(['10', '10', '25', '25', '50', '50', '100', '100', '250', '250', '500', '500']);
  });

  test('past the last rung it names no next one; one session is singular', () => {
    expect(sessionsMilestoneLine({ count: 520, sinceMs: SIXTH_OF_JUNE, now: NOW })).toBe('520 sessions logged since 26 June');
    expect(sessionsMilestoneLine({ count: 1, sinceMs: SIXTH_OF_JUNE, now: NOW })).toBe('1 session logged since 26 June · next milestone 10');
  });

  test('a date in an earlier year carries the year, so it is never ambiguous', () => {
    const lastYear = new Date(THIS_YEAR - 1, 5, 26, 9, 0, 0).getTime();
    expect(sessionsMilestoneLine({ count: 120, sinceMs: lastYear, now: NOW }))
      .toBe(`120 sessions logged since 26 June ${THIS_YEAR - 1} · next milestone 250`);
  });

  test('no known start day leaves the clause out; no session says nothing', () => {
    expect(sessionsMilestoneLine({ count: 12, sinceMs: null, now: NOW })).toBe('12 sessions logged · next milestone 25');
    expect(sessionsMilestoneLine({ count: 0, sinceMs: SIXTH_OF_JUNE, now: NOW })).toBeNull();
    expect(sessionsMilestoneLine({ count: NaN })).toBeNull();
    expect(sessionsMilestoneLine()).toBeNull();
  });

  test('no trophy language, no countdown, no instruction (CS-14, plan rule 2)', () => {
    for (const count of [1, 10, 53, 500]) {
      expect(sessionsMilestoneLine({ count, sinceMs: SIXTH_OF_JUNE, now: NOW }))
        .not.toMatch(/to go|unlock|achiev|trophy|first session|keep|streak|well done/i);
    }
  });
});

describe('the milestone section draws the sentence, and only once its read has landed (RC-33)', () => {
  test('53 completed sessions read "53 sessions logged since 26 June · next milestone 100"', async () => {
    const { workouts, sets } = completedSessions(53);
    database.getAllWorkouts.mockResolvedValue(workouts);
    database.getCompletedWorkoutSets.mockResolvedValue(sets);
    const all = texts(await render());
    expect(all).toContain('53 sessions logged since 26 June · next milestone 100');
    // The old card's two texts are gone.
    expect(all.join(' | ')).not.toMatch(/to go|50 sessions|First session|\b47\b/);
  });

  test('the count is the sessions with at least one set: an empty or unfinished workout is not a session', () => {
    const { workouts, sets } = completedSessions(5);
    database.getAllWorkouts.mockResolvedValue([
      ...workouts,
      { id: 'empty', isCompleted: 1, startedAt: SIXTH_OF_JUNE - DAY },       // completed, no sets: not counted
      { id: 'open', isCompleted: 0, startedAt: SIXTH_OF_JUNE - 2 * DAY },    // not completed: not counted
    ]);
    database.getCompletedWorkoutSets.mockResolvedValue(sets);
    return render().then((tree) => {
      expect(texts(tree)).toContain('5 sessions logged since 26 June · next milestone 10');
    });
  });

  test('a cached set count on the workout row counts too (the card\'s own rule, unchanged)', async () => {
    database.getAllWorkouts.mockResolvedValue([
      { id: 'a', isCompleted: 1, startedAt: SIXTH_OF_JUNE, setCount: 12 },
      { id: 'b', isCompleted: 1, startedAt: SIXTH_OF_JUNE + DAY, setCount: 9 },
    ]);
    database.getCompletedWorkoutSets.mockResolvedValue([]);
    expect(texts(await render())).toContain('2 sessions logged since 26 June · next milestone 10');
  });

  test('before the workouts read lands it prints nothing, never "First session" or "0 sessions"', async () => {
    let release;
    const { workouts, sets } = completedSessions(3);
    database.getAllWorkouts.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    database.getCompletedWorkoutSets.mockResolvedValue(sets);
    let tree;
    await act(async () => { tree = create(<ReadinessCards userId="u1" sections="milestone" />); });
    await flush();
    expect(texts(tree).join(' | ')).not.toMatch(/session|milestone/i);
    await act(async () => { release(workouts); });
    await flush();
    expect(texts(tree)).toContain('3 sessions logged since 26 June · next milestone 10');
  });

  test('a failed read prints nothing (and certainly not "First session")', async () => {
    database.getAllWorkouts.mockRejectedValue(new Error('db down'));
    const all = texts(await render());
    expect(all.join(' | ')).not.toMatch(/session|milestone/i);
  });

  test('no completed session says nothing (the screen shows its empty state instead)', async () => {
    const all = texts(await render());
    expect(all.join(' | ')).not.toMatch(/session|milestone/i);
  });
});

describe('source guard: no trophy, medal, gold or amber is left in the milestone (CS-14)', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'ReadinessCards.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  test('the ladder carries numbers only', () => {
    const ladder = SRC.slice(SRC.indexOf('const MILESTONES = ['), SRC.indexOf('function nextMilestone'));
    expect(ladder).not.toMatch(/icon|trophy|medal|ribbon|star|label/);
    expect(ladder.match(/sessions: (\d+)/g)).toHaveLength(7);
  });

  test('the milestone line is ink text, in the live theme', () => {
    expect(SRC).not.toMatch(/colors\.gold/);
    expect(SRC).not.toMatch(/milestoneCard|milestoneBar|milestoneUnlocked|milestoneNext/);
    expect(SRC).toMatch(/milestoneLine: \{ \.\.\.type\.bodySm, color: colors\.textSecondary \}/);
    expect(SRC).toMatch(/milestoneLine: \{ \.\.\.t\.type\.bodySm, color: t\.colors\.textSecondary \}/);
  });
});
