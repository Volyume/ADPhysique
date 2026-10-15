/**
 * WorkoutSummaryScreen.firstPostSheet.test.js (D228 item 1, option B).
 *
 * What this suite pins, and why each case is written to FAIL: the first
 * automatic post to Community waits for ONE confirmation on the workout
 * summary. A full render (the same isolation convention as
 * WorkoutSummaryScreen.allowRating.test.js), because the behaviour -- which
 * calls happen, in which order, for whom -- cannot be pinned by source text
 * alone (the source-order guard lives in community.firstPost.guard.test.js).
 *
 *  - an unconfirmed member with sharing on and the gate open sees the sheet
 *    and NOTHING is posted until they answer;
 *  - "Everyone" / "People who follow me" write the audience through the
 *    existing sharing publish path (`saveShareSessions`), mark the
 *    confirmation, and only then run the normal publish for this workout;
 *  - "Not now" (and a swipe or backdrop dismissal) posts nothing and marks
 *    nothing, so the sheet returns at the next finished workout;
 *  - after a confirmation the sheet never appears again;
 *  - the sheet never appears under calm mode or an open ED flag, with
 *    sharing off, without a profile, or on a read-only re-open;
 *  - a minor is offered only "People who follow me" and "Not now";
 *  - an unreadable confirmation key reads as not confirmed (fails closed).
 */
import { create, act } from 'react-test-renderer';

jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((selector) => selector({
    user: { id: 'u1' },
    units: 'kg',
    userProfile: {},
    session: { user: { id: 'u1' } },
    hasUnseenCoachChange: false,
    accessibility: { reduceMotion: true },
  })),
}));

jest.mock('../../components/InfoTooltip', () => () => null);
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/RollingNumber', () => () => null);
jest.mock('../../components/BlockShapeCard', () => () => null);
jest.mock('../../components/Card', () => {
  const { View } = require('react-native');
  return ({ children, style }) => <View style={style}>{children}</View>;
});
// The sheet chrome is not under test; its children and its onClose are.
jest.mock('../../components/BottomSheet', () => {
  const { View } = require('react-native');
  return function MockBottomSheet({
    visible, onClose, children, accessibilityLabel,
  }) {
    return visible ? <View accessibilityLabel={accessibilityLabel} onClose={onClose}>{children}</View> : null;
  };
});
jest.mock('../../components/TextField', () => () => null);
jest.mock('../../components/PRCelebration', () => ({ MilestoneBurst: () => null }));
jest.mock('../../components/ProgressPhotoPrompt', () => () => null);
jest.mock('../../components/Button', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockButton({ title, onPress, accessibilityLabel, disabled }) {
    return (
      <TouchableOpacity
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !!disabled }}
        onPress={disabled ? undefined : onPress}
      >
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  };
});
const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../components/FeedbackSheet', () => ({ useFeedback: () => ({ open: jest.fn() }) }));

jest.mock('../../lib/database', () => ({
  getCompletedWorkoutSets: jest.fn(),
  getAllExercises: jest.fn(),
  getExerciseLookup: jest.fn(async () => {
    const db = jest.requireMock('../../lib/database');
    const { buildExerciseLookup } = jest.requireActual('../../lib/exercise/lookup');
    return buildExerciseLookup(await db.getAllExercises());
  }),
  getAllWorkouts: jest.fn(),
  updateWorkout: jest.fn(),
  getActivePlan: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  createAdaptationEvent: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
  saveWeeklyCheckin: jest.fn(),
  saveNextTimeNote: jest.fn(),
  getRoutineWorkoutTonnages: jest.fn(),
  getRoutineById: jest.fn(),
  getWorkoutById: jest.fn(),
  getOpenEdPatternFlag: jest.fn(),
  getSessionConstraintEffect: jest.fn(),
  getWorkoutSetsForWorkout: jest.fn(),
  getCompletedWorkoutCount: jest.fn(),
}));
jest.mock('../../lib/wellbeing', () => ({ isCalm: jest.fn(() => false), WELLBEING_KEY: '@volyume_wellbeing_mode' }));
jest.mock('../../lib/milestones', () => ({ claimMilestones: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), prAchieved: jest.fn() }));
jest.mock('../../lib/feedback', () => ({ shouldPrompt: jest.fn().mockResolvedValue(false) }));
jest.mock('../../lib/effectiveLandmarks', () => ({
  getEffectiveLandmarks: jest.fn().mockResolvedValue(null),
  getPlanRoles: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../lib/sync', () => ({ syncWorkout: jest.fn() }));
jest.mock('../../lib/storeReview', () => ({
  incrementSessionCount: jest.fn().mockResolvedValue(undefined),
  shouldPromptReview: jest.fn().mockResolvedValue(false),
  requestReview: jest.fn(),
}));
jest.mock('../../navigation/navigateCrossTab', () => ({ navigateCrossTab: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('../../lib/community', () => ({
  loadMe: jest.fn(),
  hasProfile: jest.fn(),
  readCachedMe: jest.fn(),
  readShareSettings: jest.fn(),
  writeShareSettings: jest.fn(),
  refreshMe: jest.fn(),
  sessionsSharingSentence: jest.fn((on, audience) => `sentence:${on}:${audience}`),
  sessionShareGateState: jest.fn(),
  publishConsistency: jest.fn(),
  publishAmbientItems: jest.fn(),
  flushPendingAmbientItems: jest.fn(),
  hasSeenSessionShareOffer: jest.fn(),
  recordSessionShareOfferSeen: jest.fn(),
}));
// The existing sharing publish path (the Training profile and Privacy
// screens call the same function); the screen must reuse it, not write the
// store itself.
jest.mock('../../lib/community/shareSessions', () => ({ saveShareSessions: jest.fn() }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import WorkoutSummaryScreen from '../WorkoutSummaryScreen';
import * as database from '../../lib/database';
import * as community from '../../lib/community';
import { saveShareSessions } from '../../lib/community/shareSessions';
import { firstPostConfirmedKey } from '../../lib/community/firstPost';

const KEY = firstPostConfirmedKey('u1');
const SHEET = 'Share this session?';
const BODY = 'Every session you finish can post to Community automatically: exercises, sets, the total lifted and any PRs. Never your body, food or coaching. Who should see them?';

async function flush() {
  await act(async () => {
    for (let i = 0; i < 40; i++) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
}

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

async function renderScreen(routeExtra = {}) {
  const navigation = { navigate: jest.fn(), goBack: jest.fn(), popToTop: jest.fn() };
  const route = {
    params: {
      workoutId: 'w1', durationMinutes: 45, exerciseCount: 0, setCount: 0,
      workingSetCount: 0, tonnage: 0, exerciseNames: [],
      startedAt: Date.now() - 3600000, endedAt: Date.now() - 3000000,
      routineId: null, routineName: null,
      readOnly: false,
      ...routeExtra,
    },
  };
  let tree;
  await act(async () => {
    tree = create(<WorkoutSummaryScreen navigation={navigation} route={route} />);
  });
  await flush();
  return { tree, navigation };
}

// Host nodes only (a composite and the host element it renders share props).
function sheetNode(tree) {
  return tree.root.findAll(
    (n) => n.type === 'View' && n.props?.accessibilityLabel === SHEET && typeof n.props.onClose === 'function',
  )[0] ?? null;
}

function sheetButtons(tree) {
  const sheet = sheetNode(tree);
  if (!sheet) return [];
  return sheet.findAll(
    (n) => n.type === 'TouchableOpacity' && typeof n.props?.onPress === 'function' && n.props.accessibilityLabel,
  );
}

function buttonTitles(tree) {
  return sheetButtons(tree).map((b) => flattenText(b.children));
}

async function tap(tree, title) {
  const btn = sheetButtons(tree).find((b) => flattenText(b.children) === title);
  expect(btn).toBeTruthy();
  await act(async () => { btn.props.onPress(); });
  await flush();
}

const SETTINGS = { share_sessions: true, sessions_audience: 'everyone' };
const store = () => require('@react-native-async-storage/async-storage').__store;

function restoreStorage() {
  AsyncStorage.getItem.mockImplementation((k) => Promise.resolve(store().get(k) ?? null));
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  restoreStorage();
  database.getCompletedWorkoutSets.mockResolvedValue([]);
  database.getAllExercises.mockResolvedValue([]);
  database.getAllWorkouts.mockResolvedValue([]);
  database.getWorkoutSetsForWorkout.mockResolvedValue([]);
  database.getSessionConstraintEffect.mockResolvedValue(null);
  database.getActivePlan.mockResolvedValue(null);
  database.getCurrentMesocycleWeek.mockResolvedValue(null);
  database.getOpenEdPatternFlag.mockResolvedValue(null);
  database.getCompletedWorkoutCount.mockResolvedValue(3);
  community.readShareSettings.mockResolvedValue({ ...SETTINGS });
  community.readCachedMe.mockResolvedValue({ profile: { user_id: 'u1', handle: 'rowan' }, is_minor: false });
  community.hasProfile.mockImplementation((me) => !!me?.profile);
  community.loadMe.mockResolvedValue({ me: null });
  community.sessionShareGateState.mockResolvedValue({ allowed: true, gated: false });
  community.flushPendingAmbientItems.mockResolvedValue({ flushed: 0, dropped: 0, remaining: 0 });
  community.hasSeenSessionShareOffer.mockResolvedValue(true);
  community.refreshMe.mockResolvedValue(undefined);
  community.publishAmbientItems.mockResolvedValue({
    created: 1, queued: 0, skipped: null, sessionPostId: 'p1', sessionPayload: { sessionName: 'Upper A' }, sessionAudience: 'everyone', sessionRefused: null,
  });
  saveShareSessions.mockImplementation(async (uid, prev, next) => ({ settings: next, status: 'sent' }));
});

describe('an unconfirmed member sees the sheet and nothing is posted', () => {
  test('the sheet carries the exact words and the three actions in order; publish waits', async () => {
    const { tree } = await renderScreen();
    expect(sheetNode(tree)).toBeTruthy();
    const text = flattenText(sheetNode(tree).children);
    expect(text).toContain('Share this session?');
    expect(text).toContain(BODY);
    expect(buttonTitles(tree)).toEqual(['Everyone', 'People who follow me', 'Not now']);
    expect(community.publishAmbientItems).not.toHaveBeenCalled();
    expect(saveShareSessions).not.toHaveBeenCalled();
  });

  test('the gate was consulted with the live sharing toggle before the sheet showed', async () => {
    await renderScreen();
    expect(community.sessionShareGateState).toHaveBeenCalledWith('u1', true);
  });
});

describe('Everyone and People who follow me', () => {
  test.each([
    ['Everyone', 'everyone'],
    ['People who follow me', 'followers'],
  ])('%s writes the audience through the publish path, marks the confirmation, then posts this workout', async (title, audience) => {
    const order = [];
    saveShareSessions.mockImplementation(async (uid, prev, next, opts) => {
      order.push(['save', { uid, prev, next, opts }, await AsyncStorage.getItem(KEY)]);
      return { settings: next, status: 'sent' };
    });
    community.publishAmbientItems.mockImplementation(async () => {
      order.push(['publish', await AsyncStorage.getItem(KEY)]);
      return {
        created: 1, queued: 0, skipped: null, sessionPostId: 'p1', sessionPayload: { sessionName: 'Upper A' }, sessionAudience: audience, sessionRefused: null,
      };
    });
    const { tree } = await renderScreen();
    await tap(tree, title);

    expect(order.map((o) => o[0])).toEqual(['save', 'publish']);
    const [, saved, keyAtSave] = order[0];
    expect(saved.uid).toBe('u1');
    expect(saved.prev).toEqual(SETTINGS);
    expect(saved.next).toEqual({ share_sessions: true, sessions_audience: audience });
    expect(saved.opts).toEqual({ isMinor: false });
    // Not yet confirmed while the audience is being written; confirmed by the time the post goes.
    expect(keyAtSave).toBeNull();
    expect(order[1][1]).toBe('1');
    expect(community.publishAmbientItems).toHaveBeenCalledTimes(1);
    expect(community.publishAmbientItems.mock.calls[0][0]).toMatchObject({ userId: 'u1', workoutId: 'w1' });
    // The sheet is gone and the normal strip shows.
    expect(sheetNode(tree)).toBeNull();
    expect(flattenText(tree.toJSON())).toContain('Shared to Community');
  });

  test('the rules having moved on: the choice was not saved, so nothing is confirmed and nothing posts', async () => {
    saveShareSessions.mockResolvedValue({ settings: SETTINGS, status: 'rules_outdated' });
    const { tree } = await renderScreen();
    await tap(tree, 'Everyone');
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    expect(community.publishAmbientItems).not.toHaveBeenCalled();
    expect(sheetNode(tree)).toBeNull();
  });

  test('a save that throws confirms nothing and posts nothing', async () => {
    saveShareSessions.mockRejectedValue(new Error('boom'));
    const { tree } = await renderScreen();
    await tap(tree, 'Everyone');
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    expect(community.publishAmbientItems).not.toHaveBeenCalled();
  });
});

describe('Not now', () => {
  test('posts nothing, writes nothing and marks nothing; the strip says this session was kept private', async () => {
    const { tree } = await renderScreen();
    await tap(tree, 'Not now');
    expect(community.publishAmbientItems).not.toHaveBeenCalled();
    expect(saveShareSessions).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    expect(sheetNode(tree)).toBeNull();
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Only you can see this session');
    expect(text).toContain('Post this session');
  });

  test('the sheet returns at the next finished workout', async () => {
    const first = await renderScreen();
    await tap(first.tree, 'Not now');
    const next = await renderScreen({ workoutId: 'w2' });
    expect(sheetNode(next.tree)).toBeTruthy();
    expect(community.publishAmbientItems).not.toHaveBeenCalled();
  });

  test('closing the sheet (backdrop, swipe, back) is Not now', async () => {
    const { tree } = await renderScreen();
    await act(async () => { sheetNode(tree).props.onClose(); });
    await flush();
    expect(community.publishAmbientItems).not.toHaveBeenCalled();
    expect(saveShareSessions).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    expect(sheetNode(tree)).toBeNull();
  });
});

describe('after a confirmation the sheet never comes back', () => {
  test('a confirmed person posts as before, with no sheet', async () => {
    await AsyncStorage.setItem(KEY, '1');
    const { tree } = await renderScreen();
    expect(sheetNode(tree)).toBeNull();
    expect(community.publishAmbientItems).toHaveBeenCalledTimes(1);
    expect(saveShareSessions).not.toHaveBeenCalled();
  });

  test('answering once settles it for the next workout', async () => {
    const first = await renderScreen();
    await tap(first.tree, 'Everyone');
    community.publishAmbientItems.mockClear();
    const next = await renderScreen({ workoutId: 'w2' });
    expect(sheetNode(next.tree)).toBeNull();
    expect(community.publishAmbientItems).toHaveBeenCalledTimes(1);
  });

  test('FAILS CLOSED: an unreadable confirmation key reads as not confirmed (the sheet shows, nothing posts)', async () => {
    await AsyncStorage.setItem(KEY, '1');
    AsyncStorage.getItem.mockImplementation((k) => (
      k === KEY ? Promise.reject(new Error('unreadable')) : Promise.resolve(store().get(k) ?? null)
    ));
    const { tree } = await renderScreen();
    expect(sheetNode(tree)).toBeTruthy();
    expect(community.publishAmbientItems).not.toHaveBeenCalled();
  });
});

describe('the sheet never shows where sharing is withheld or not offered', () => {
  test('calm mode or an open ED flag: no sheet and no post (the gate runs first)', async () => {
    community.sessionShareGateState.mockResolvedValue({ allowed: false, gated: true });
    const { tree } = await renderScreen();
    expect(sheetNode(tree)).toBeNull();
    expect(community.publishAmbientItems).not.toHaveBeenCalled();
    expect(saveShareSessions).not.toHaveBeenCalled();
  });

  test('a gate that cannot answer is treated as closed', async () => {
    community.sessionShareGateState.mockRejectedValue(new Error('unreadable'));
    const { tree } = await renderScreen();
    expect(sheetNode(tree)).toBeNull();
    expect(community.publishAmbientItems).not.toHaveBeenCalled();
  });

  test('sharing off: no sheet and no post', async () => {
    community.readShareSettings.mockResolvedValue({ share_sessions: false, sessions_audience: 'everyone' });
    const { tree } = await renderScreen();
    expect(sheetNode(tree)).toBeNull();
    expect(community.publishAmbientItems).not.toHaveBeenCalled();
  });

  test('no Community profile on this device: no sheet and no post', async () => {
    community.readCachedMe.mockResolvedValue(null);
    const { tree } = await renderScreen();
    expect(sheetNode(tree)).toBeNull();
    expect(community.publishAmbientItems).not.toHaveBeenCalled();
  });

  test('a read-only re-open of an old summary: no sheet and no post', async () => {
    const { tree } = await renderScreen({ readOnly: true });
    expect(sheetNode(tree)).toBeNull();
    expect(community.publishAmbientItems).not.toHaveBeenCalled();
    expect(community.sessionShareGateState).not.toHaveBeenCalled();
  });
});

describe('a minor', () => {
  beforeEach(() => {
    community.readCachedMe.mockResolvedValue({ profile: { user_id: 'u1', handle: 'rowan' }, is_minor: true });
  });

  test('is offered only People who follow me and Not now', async () => {
    const { tree } = await renderScreen();
    expect(buttonTitles(tree)).toEqual(['People who follow me', 'Not now']);
  });

  test('People who follow me writes followers with the minor clamp, then posts', async () => {
    const { tree } = await renderScreen();
    await tap(tree, 'People who follow me');
    expect(saveShareSessions).toHaveBeenCalledWith(
      'u1', SETTINGS, { share_sessions: true, sessions_audience: 'followers' }, { isMinor: true },
    );
    expect(await AsyncStorage.getItem(KEY)).toBe('1');
    expect(community.publishAmbientItems).toHaveBeenCalledTimes(1);
  });
});
