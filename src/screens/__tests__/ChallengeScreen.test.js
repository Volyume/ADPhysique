/**
 * ChallengeScreen (gym challenge SPEC sections 3 and 4).
 *
 * What this suite pins:
 *  1. The score out of 100, the draw line with the gap, and one breakdown row
 *     per part with its points, its max and its plain detail line.
 *  2. Coaching not set up: the CoachingSetupCard replaces the three coaching
 *     rows and says coaching adds up to 20 points.
 *  3. Withheld (SPEC 3.3): no food or weigh-in row, no coaching prompt, no
 *     board and no hint of why, while the rest renders as normal.
 *  4. The board: the top 10 rows, the "You" marker, the counts line.
 *  5. Closed: the final score, the draw you finished in and the winners.
 *  6. Leave confirms through appAlert, calls withdraw, and goes back.
 *  7. Source guard: the screen never names the food or weigh-in detail values.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
const mockToastShow = jest.fn();
const mockAppAlert = jest.fn();
jest.mock('../../components/AppAlert', () => ({ appAlert: (...a) => mockAppAlert(...a) }));
jest.mock('../../hooks/useCoachingSetUp', () => ({
  __esModule: true,
  default: jest.fn(),
  openCoachingSetup: jest.fn(),
}));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' } }),
}));
jest.mock('../../lib/challenges/api', () => ({
  myChallenges: jest.fn(),
  challengeScore: jest.fn(),
  challengeBoard: jest.fn(),
  setChallengeTarget: jest.fn(() => Promise.resolve({})),
  withdrawFromChallenge: jest.fn(() => Promise.resolve({ withdrawn: true })),
}));
jest.mock('../../lib/challenges/plannedPerWeek', () => ({
  readPlannedPerWeek: jest.fn(() => Promise.resolve(4)),
}));
jest.mock('../ChallengeJoinScreen', () => ({ __esModule: true, default: () => null, datesLine: () => '1 Nov to 30 Nov' }));

import useCoachingSetUp from '../../hooks/useCoachingSetUp';
import {
  myChallenges, challengeScore, challengeBoard, setChallengeTarget, withdrawFromChallenge,
} from '../../lib/challenges/api';
import ChallengeScreen from '../ChallengeScreen';

const CHALLENGE = {
  id: 'c1', code: 'volt-nov', title: 'Volt Gym November', gym_name: 'Volt Gym', status: 'active',
  starts_on: '2026-11-01', ends_on: '2026-11-30', days_left: 12, main_threshold: 70, second_threshold: 50,
  terms_url: 'https://volyume.app/c/volt-nov/terms', total: 62,
};

function scoreRow(over = {}) {
  return {
    total: 62,
    parts: {
      train: 30, week: 10, stronger: 6, community: 5, checkin: 5, food: 3, weighin: 2,
    },
    max: {
      train: 40, week: 15, stronger: 15, community: 10, checkin: 10, food: 6, weighin: 4,
    },
    detail: {
      training_days: 9, target_days: 12, weeks_hit: 2, weeks: 4, lifts_beaten: 2, posts_weeks: 2,
      checkins: 2, checkins_target: 4, food_days: 7, food_cap: 12, weighin_weeks: 2,
    },
    withheld: false,
    frozen: false,
    tier: 'second',
    to_main: 8,
    to_second: 0,
    planned_per_week: 3,
    ...over,
  };
}

const TOP = Array.from({ length: 10 }, (_, i) => ({ name: `Member ${i + 1}`, score: 90 - i, me: i === 3 }));
const BOARD = {
  status: 'active', days_left: 12, top: TOP, me: { score: 62, in_top: true },
  counts: { entrants: 30, main: 4, second: 11 }, winners: [],
};

function texts(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(texts).join(' ');
  return texts(node.children);
}

async function mount({
  challenge = CHALLENGE, score = scoreRow(), board = BOARD, coachingSetUp = true,
} = {}) {
  useCoachingSetUp.mockReturnValue(coachingSetUp);
  myChallenges.mockResolvedValue([challenge]);
  challengeScore.mockResolvedValue(score);
  challengeBoard.mockResolvedValue(board);
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  let tree;
  await act(async () => {
    tree = create(<ChallengeScreen navigation={navigation} route={{ params: { id: 'c1' } }} />);
  });
  await act(async () => {});
  return { tree, navigation, text: () => texts(tree.toJSON()) };
}

beforeEach(() => jest.clearAllMocks());

test('shows the score, the draw and the gap, and a row per part with its detail', async () => {
  const { text } = await mount();
  const out = text();
  expect(out).toContain('Volt Gym November');
  expect(out).toContain('Volt Gym · 1 Nov to 30 Nov');
  expect(out).toContain('12 days left');
  expect(out).toContain('62');
  expect(out).toContain('out of 100');
  expect(out).toContain('You are in the second draw.');
  expect(out).toContain('8 more points for the main draw.');
  expect(out).toContain('9 of 12 training days');
  expect(out).toContain('30 of 40');
  expect(out).toContain('2 of 4 weeks hit');
  expect(out).toContain('With coaching');
  expect(out).toContain('7 of 12 days logged');
});

test('main draw says so and has no gap line', async () => {
  const { text } = await mount({ score: scoreRow({ tier: 'main', to_main: 0, total: 74 }) });
  expect(text()).toContain('You are in the main draw.');
  expect(text()).not.toContain('more points for the main draw');
});

test('without coaching the card replaces the three coaching rows', async () => {
  const { tree, text } = await mount({ coachingSetUp: false });
  const out = text();
  expect(out).toContain('Coaching adds up to 20 more points to your score.');
  expect(out).not.toContain('With coaching');
  expect(out).not.toContain('Weekly check-in');
  expect(out).not.toContain('Food logging');
  expect(tree.root.findAll((n) => n.props?.testID === 'coaching-setup-card').length).toBeGreaterThan(0);
});

test('a withheld caller sees no food or weigh-in row, no coaching prompt and no board', async () => {
  const score = scoreRow({
    withheld: true,
    detail: {
      training_days: 9, target_days: 12, weeks_hit: 2, weeks: 4, lifts_beaten: 2, posts_weeks: 2,
      checkins: 2, checkins_target: 4, food_days: null, food_cap: null, weighin_weeks: null,
    },
  });
  for (const coachingSetUp of [true, false]) {
    const { tree, text } = await mount({ score, board: null, coachingSetUp });
    const out = text();
    expect(out).not.toMatch(/food/i);
    expect(out).not.toMatch(/weigh/i);
    expect(out).not.toContain('Top 10');
    expect(out).not.toContain('members are in the main draw');
    expect(tree.root.findAll((n) => n.props?.testID === 'coaching-setup-card').length).toBe(0);
    expect(out).toContain('9 of 12 training days');
    expect(out).toContain(coachingSetUp ? 'Weekly check-in' : 'Train to your plan');
  }
});

test('the board lists ten rows, marks you and prints the counts', async () => {
  const { tree, text } = await mount();
  const out = text();
  expect(out).toContain('Top 10');
  expect(out).toContain('Member 1');
  expect(out).toContain('Member 10');
  expect(out).toContain('4 members have reached 70 points, and 11 have reached 50.');
  const you = tree.root.findAll((n) => n.props?.person?.isYou && n.props.person.display_name === 'Member 4');
  expect(you.length).toBeGreaterThan(0);
  expect(out).toContain('You');
});

test('when you are off the board your own row follows it', async () => {
  const { text } = await mount({
    board: { ...BOARD, top: TOP.map((r) => ({ ...r, me: false })), me: { score: 62, in_top: false } },
  });
  expect(text()).toContain('You');
});

test('closed shows the final score, the draw you finished in and the winners, and no leave row', async () => {
  const { text } = await mount({
    challenge: { ...CHALLENGE, status: 'closed' },
    score: scoreRow({ tier: 'main', total: 74, frozen: true }),
    board: { ...BOARD, status: 'closed', winners: [{ name: 'Sam K', tier: 'main' }, { name: 'Ali B', tier: 'second' }] },
  });
  const out = text();
  expect(out).toContain('final score, out of 100');
  expect(out).toContain('You finished in the main draw.');
  expect(out).toContain('Winners');
  expect(out).toContain('Sam K');
  expect(out).toContain('Second draw');
  expect(out).not.toContain('Leave the challenge');
});

test('the weekly target follows the plan', async () => {
  await mount();
  expect(setChallengeTarget).toHaveBeenCalledWith('c1', 4);
});

test('leaving confirms, withdraws and goes back', async () => {
  const { navigation, tree } = await mount();
  const leave = tree.root.findAll((n) => n.props?.title === 'Leave the challenge' && n.props.onPress)[0];
  await act(async () => { leave.props.onPress(); });
  expect(mockAppAlert).toHaveBeenCalledTimes(1);
  expect(withdrawFromChallenge).not.toHaveBeenCalled();
  const buttons = mockAppAlert.mock.calls[0][2];
  await act(async () => { await buttons.find((b) => b.style === 'destructive').onPress(); });
  expect(withdrawFromChallenge).toHaveBeenCalledWith('c1');
  expect(navigation.goBack).toHaveBeenCalled();
});

test('a failed load is an error state with a retry, not a crash', async () => {
  useCoachingSetUp.mockReturnValue(true);
  myChallenges.mockRejectedValue(Object.assign(new Error('x'), { code: 'network' }));
  challengeScore.mockRejectedValue(Object.assign(new Error('x'), { code: 'network' }));
  let tree;
  await act(async () => {
    tree = create(<ChallengeScreen navigation={{ goBack: jest.fn() }} route={{ params: { id: 'c1' } }} />);
  });
  expect(texts(tree.toJSON())).toContain('Could not load the challenge');
});

test('source guard: the screen never reads the food or weigh-in detail values', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'ChallengeScreen.js'), 'utf8');
  expect(src).not.toMatch(/food_days|food_cap|weighin_weeks/);
  const display = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'challenges', 'display.js'), 'utf8');
  // The only readers sit in the per-part formatter, reached through partRows,
  // which drops both parts for any caller whose withheld flag is not a clear false.
  expect(display).toMatch(/const withheld = score\.withheld !== false/);
  expect(display).toMatch(/withheld \? \['checkin'\] : COACHING_KEYS/);
});
