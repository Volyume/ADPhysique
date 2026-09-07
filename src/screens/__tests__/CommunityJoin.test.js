/**
 * CommunityJoinScreen (blueprint sections 2, 6; SD-04).
 *
 * Two things this screen must get right, both pinned here:
 *
 *   1. The handle line tells the truth at every step. A handle of the
 *      wrong shape never reaches the server (nothing is asked of it until
 *      the shape is right), a taken handle says "Taken", a free one says
 *      "Available", and "Create profile" is only reachable from the last
 *      of those.
 *   2. Creating the profile IS the consent record. The call carries
 *      `accept_rules_version`, because a profile created without the
 *      accepted version is a Community row with no consent behind it.
 *
 * The client library is mocked: this is about what the screen sends and
 * shows, not about the RPC.
 */

import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

// 30-IMPLEMENTATION.md 1.2: GymPicker (rebuilt as the finder) needs a
// controllable `search` to exercise the main + other gyms flow below;
// everything else (rankVenues, milesToMetres, isPostcodeLike,
// recognisePostcode, setGyms) stays real/faked exactly as it already
// was for the rest of this suite's unmocked gym field.
jest.mock('../../lib/gyms', () => {
  const actual = jest.requireActual('../../lib/gyms');
  return {
    ...actual, search: jest.fn(), near: jest.fn(() => Promise.resolve({ venues: [], truncated: false })), setGyms: jest.fn(() => Promise.resolve({})),
  };
});
jest.mock('../../lib/deviceLocation', () => ({
  isAvailable: jest.fn(() => false),
  getApproximatePosition: jest.fn(),
}));

const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));

jest.mock('../../hooks/useCommunityMe', () => ({
  __esModule: true,
  default: jest.fn(() => ({ me: { profile: null, is_minor: false }, loading: false, error: null, refresh: jest.fn() })),
}));

// The discovery training profile step (`docs/social-discovery-2026-09-06/
// 70-DISCOVERY-BLUEPRINT.md` section 3) imports `bandRows` from the
// Training profile screen, which imports the closed-set band labels and
// the pure preview functions alongside the I/O ones this mock replaces.
// Everything below the handle/profile mocks is that closed set, hand-held
// rather than `requireActual` so this suite never has to boot the real
// transport module.
jest.mock('../../lib/community', () => ({
  // The real shape rule, not a stand-in: 3 to 20 lowercase letters,
  // digits or underscores, no leading or trailing underscore.
  isValidHandle: (h) => /^[a-z0-9_]{3,20}$/.test(h) && !h.startsWith('_') && !h.endsWith('_'),
  checkHandle: jest.fn(),
  upsertProfile: jest.fn(),
  DISPLAY_NAME_MAX: 40,
  COMMUNITY_RULES_VERSION: 1,
  currentUserId: () => 'u1',
  TP_DAYS: { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' },
  TP_TIME_BANDS: {
    morning: 'mornings', midday: 'at midday', afternoon: 'in the afternoon', evening: 'evenings', late: 'late',
  },
  TP_SESSIONS_BANDS: {
    '1_2': '1 to 2', 3: '3', '4_5': '4 to 5', '6_plus': '6 or more',
  },
  TP_EXPERIENCE_BANDS: { new: 'New', intermediate: 'Intermediate', experienced: 'Experienced' },
  TP_AGE_BANDS: {
    '18_24': '18 to 24', '25_34': '25 to 34', '35_44': '35 to 44', '45_54': '45 to 54', '55_plus': '55 or over',
  },
  TP_DEFAULT_SHARE: {
    days: false, time_bands: false, sessions: true, staple_lifts: true, experience: true, programme: true, age_band: false,
  },
  dayListLabel: () => '',
  timeBandsLabel: () => '',
  previewLine: () => '',
  shareablePayload: () => ({}),
  loadTrainingProfile: jest.fn(() => Promise.resolve({})),
  readShareSettings: jest.fn(() => Promise.resolve({
    days: false, time_bands: false, sessions: true, staple_lifts: true, experience: true, programme: true, age_band: false,
  })),
  writeShareSettings: jest.fn(() => Promise.resolve()),
  syncTrainingProfile: jest.fn(() => Promise.resolve({ sent: true, reason: null, payload: null })),
  setShowProgrammes: jest.fn(() => Promise.resolve()),
  setPartner: jest.fn(() => Promise.resolve()),
}));

import {
  checkHandle, upsertProfile, COMMUNITY_RULES_VERSION, syncTrainingProfile, setShowProgrammes,
} from '../../lib/community';
import { search as searchGyms, setGyms } from '../../lib/gyms';
import useCommunityMe from '../../hooks/useCommunityMe';
import CommunityJoinScreen from '../CommunityJoinScreen';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

async function flush() {
  await act(async () => {
    jest.advanceTimersByTime(400);
    for (let i = 0; i < 12; i += 1) await Promise.resolve();
  });
}

function field(tree, label) {
  return tree.root.findAll((n) => n.props?.accessibilityLabel === label && n.props?.onChangeText)[0];
}

function button(tree, label) {
  return tree.root.findAll(
    (n) => typeof n.type === 'function' && n.props?.accessibilityLabel === label && 'onPress' in n.props,
  )[0];
}

async function mount() {
  const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
  let tree;
  await act(async () => {
    tree = create(<CommunityJoinScreen navigation={navigation} route={{ params: {} }} />);
  });
  await flush();
  return { tree, navigation };
}

async function type(tree, label, value) {
  await act(async () => { field(tree, label).props.onChangeText(value); });
  await flush();
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  checkHandle.mockResolvedValue(true);
  upsertProfile.mockResolvedValue({ user_id: 'u1', handle: 'rowan_lifts' });
  searchGyms.mockResolvedValue({ venues: [], recognisedPostcode: null, centroid: null });
  setGyms.mockResolvedValue({});
  useCommunityMe.mockReturnValue({
    me: { profile: null, is_minor: false }, loading: false, error: null, refresh: jest.fn(),
  });
});

afterEach(() => { jest.useRealTimers(); });

describe('the handle line', () => {
  test('starts as the shape rule, and asks the server nothing', async () => {
    const { tree } = await mount();

    expect(flattenText(tree.toJSON()))
      .toContain('Use 3 to 20 letters, numbers or underscores.');
    expect(checkHandle).not.toHaveBeenCalled();
  });

  test('a handle of the wrong shape never reaches the server', async () => {
    const { tree } = await mount();
    await type(tree, 'Handle', 'ro');

    expect(checkHandle).not.toHaveBeenCalled();
    expect(flattenText(tree.toJSON()))
      .toContain('Use 3 to 20 letters, numbers or underscores.');
  });

  test('a free handle reads Available', async () => {
    const { tree } = await mount();
    await type(tree, 'Handle', 'rowan_lifts');

    expect(checkHandle).toHaveBeenCalledWith('rowan_lifts');
    expect(flattenText(tree.toJSON())).toContain('Available');
  });

  test('a used handle reads Taken', async () => {
    checkHandle.mockResolvedValue(false);
    const { tree } = await mount();
    await type(tree, 'Handle', 'rowan_lifts');

    expect(flattenText(tree.toJSON())).toContain('Taken');
  });

  test('whitespace and case are normalised before the check', async () => {
    const { tree } = await mount();
    await type(tree, 'Handle', 'Rowan Lifts');

    expect(checkHandle).toHaveBeenCalledWith('rowanlifts');
  });
});

describe('creating the profile', () => {
  test('is unreachable until the handle is available and a name is typed', async () => {
    const { tree } = await mount();
    expect(button(tree, 'Create my Community profile').props.disabled).toBe(true);

    await type(tree, 'Handle', 'rowan_lifts');
    expect(button(tree, 'Create my Community profile').props.disabled).toBe(true);

    await type(tree, 'Display name', 'Rowan M');
    expect(button(tree, 'Create my Community profile').props.disabled).toBe(false);
  });

  test('sends the accepted rules version with the profile', async () => {
    const { tree } = await mount();
    await type(tree, 'Handle', 'rowan_lifts');
    await type(tree, 'Display name', 'Rowan M');

    await act(async () => { button(tree, 'Create my Community profile').props.onPress(); });
    await flush();

    expect(upsertProfile).toHaveBeenCalledTimes(1);
    expect(upsertProfile).toHaveBeenCalledWith(expect.objectContaining({
      handle: 'rowan_lifts',
      display_name: 'Rowan M',
      visibility: 'public',
      accept_rules_version: COMMUNITY_RULES_VERSION,
    }));
  });

  test('the training profile syncs, forced, once the profile exists (SD-22)', async () => {
    const { tree } = await mount();
    await type(tree, 'Handle', 'rowan_lifts');
    await type(tree, 'Display name', 'Rowan M');

    await act(async () => { button(tree, 'Create my Community profile').props.onPress(); });
    await flush();

    expect(syncTrainingProfile).toHaveBeenCalledWith('u1', { force: true });
    expect(setShowProgrammes).toHaveBeenCalledWith(true);
  });

  test('a refusal is spoken calmly and nothing is claimed to have happened', async () => {
    const err = new Error('handle_taken');
    err.code = 'handle_taken';
    upsertProfile.mockRejectedValueOnce(err);

    const { tree, navigation } = await mount();
    await type(tree, 'Handle', 'rowan_lifts');
    await type(tree, 'Display name', 'Rowan M');
    await act(async () => { button(tree, 'Create my Community profile').props.onPress(); });
    await flush();

    expect(mockToastShow).toHaveBeenCalledWith(
      'That handle is taken. Try another.',
      expect.objectContaining({ variant: 'error' }),
    );
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});

describe('the training profile step (SD-22)', () => {
  test('shows the toggles and a preview line before Create profile', async () => {
    const { tree } = await mount();
    const text = flattenText(tree.toJSON());

    expect(text).toContain('Your training profile');
    expect(text).toContain('Show which programmes I use');
    expect(text).toContain('Nothing from your training is shared just now.');
  });
});

describe('the rules and the under-18 rule', () => {
  test('the four rules are on the screen before the action', async () => {
    const { tree } = await mount();
    const text = flattenText(tree.toJSON());

    expect(text).toContain('Training talk only.');
    expect(text).toContain('Be decent to people.');
    expect(text).toContain('No body-shaming, no diet or calorie talk.');
    expect(text).toContain('Report what breaks this.');
  });

  test('an under-18 account is told its profile is followers-only', async () => {
    useCommunityMe.mockReturnValue({
      me: { profile: null, is_minor: true }, loading: false, error: null, refresh: jest.fn(),
    });
    const { tree } = await mount();

    expect(flattenText(tree.toJSON()))
      .toContain('Under 18: your profile is followers-only and does not appear in search.');
  });
});

// ─── Product review 2026-09-06, item 20 ─────────────────────────────────
//
// A handle check that could not RUN used to fall back to 'idle', which
// reads as the shape hint and leaves Create disabled forever: joining
// offline was a silent dead end with `REFUSALS.offline` unreachable.
describe('when the handle check cannot run', () => {
  function offline() {
    const e = new Error('offline');
    e.code = 'offline';
    return e;
  }

  test('offline says so, and Create stays available', async () => {
    checkHandle.mockRejectedValue(offline());
    const { tree } = await mount();
    await type(tree, 'Handle', 'rowan_lifts');
    await type(tree, 'Display name', 'Rowan M');

    expect(flattenText(tree.toJSON())).toContain('Could not check that handle. You are offline.');
    expect(button(tree, 'Create my Community profile').props.disabled).toBe(false);
  });

  test('any other failure says try again, and Create stays available', async () => {
    checkHandle.mockRejectedValue(new Error('boom'));
    const { tree } = await mount();
    await type(tree, 'Handle', 'rowan_lifts');
    await type(tree, 'Display name', 'Rowan M');

    expect(flattenText(tree.toJSON())).toContain('Could not check that handle just now. Try again.');
    expect(button(tree, 'Create my Community profile').props.disabled).toBe(false);
  });

  test('tapping Create then surfaces the real refusal', async () => {
    checkHandle.mockRejectedValue(offline());
    upsertProfile.mockRejectedValueOnce(offline());

    const { tree } = await mount();
    await type(tree, 'Handle', 'rowan_lifts');
    await type(tree, 'Display name', 'Rowan M');
    await act(async () => { button(tree, 'Create my Community profile').props.onPress(); });
    await flush();

    expect(upsertProfile).toHaveBeenCalledTimes(1);
    expect(mockToastShow).toHaveBeenCalledWith(
      'You are offline. Try again when you have a connection.',
      expect.objectContaining({ variant: 'error' }),
    );
  });

  test('a check that answers again clears the line', async () => {
    checkHandle.mockRejectedValueOnce(offline());
    const { tree } = await mount();
    await type(tree, 'Handle', 'rowan_lifts');
    expect(flattenText(tree.toJSON())).toContain('Could not check that handle. You are offline.');

    checkHandle.mockResolvedValue(true);
    await type(tree, 'Handle', 'rowan_lift');

    expect(flattenText(tree.toJSON())).toContain('Available');
    expect(flattenText(tree.toJSON())).not.toContain('Could not check that handle');
  });
});

// ─── 30-IMPLEMENTATION.md 1.2: the gym step (after identity, before
// privacy) - main gym via the finder, up to three others, "Not now"
// skips with no penalty. ─────────────────────────────────────────────
describe('the gym step', () => {
  const MAIN = {
    id: 'g1', display_name: 'PureGym Motherwell', name: 'PureGym Motherwell',
    brand: 'PureGym', town: 'Motherwell', outward: 'ML1', distance_m: null,
    status: 'open', verification_status: 'verified',
  };
  const OTHER = {
    id: 'g2', display_name: 'The Gym Leeds', name: 'The Gym Leeds',
    brand: 'The Gym Group', town: 'Leeds', outward: 'LS1', distance_m: null,
    status: 'open', verification_status: 'verified',
  };

  function flatLists(tree) {
    return tree.root.findAll((n) => n.type === 'FlatList');
  }

  function selectFromList(list, venue) {
    let row = null;
    act(() => { row = create(list.props.renderItem({ item: venue })); });
    const card = row.root.findAll(
      (n) => n.props?.accessibilityLabel === venue.display_name && typeof n.props.onPress === 'function',
    )[0];
    act(() => { card.props.onPress(); });
    act(() => { row.unmount(); });
  }

  async function typeGymQuery(tree, value) {
    const input = tree.root.findByProps({ accessibilityLabel: 'Gym, town or postcode' });
    await act(async () => { input.props.onChangeText(value); });
    await flush();
  }

  test('"Not now" skips with no penalty: Create still works and setGyms is never called', async () => {
    const { tree } = await mount();

    await act(async () => { button(tree, 'Skip choosing a gym for now').props.onPress(); });
    expect(flattenText(tree.toJSON()))
      .toContain('Not chosen yet. You can add this any time from Edit profile.');

    await type(tree, 'Handle', 'rowan_lifts');
    await type(tree, 'Display name', 'Rowan M');
    await act(async () => { button(tree, 'Create my Community profile').props.onPress(); });
    await flush();

    expect(upsertProfile).toHaveBeenCalledTimes(1);
    expect(setGyms).not.toHaveBeenCalled();
  });

  test('a main gym plus one other gym both send on Create', async () => {
    searchGyms.mockResolvedValue({ venues: [MAIN], recognisedPostcode: null, centroid: null });
    const { tree } = await mount();

    await typeGymQuery(tree, 'PureGym');
    selectFromList(flatLists(tree)[0], MAIN);
    expect(flattenText(tree.toJSON())).toContain('PureGym Motherwell');

    await act(async () => { button(tree, 'Add another gym you train at').props.onPress(); });
    searchGyms.mockResolvedValue({ venues: [OTHER], recognisedPostcode: null, centroid: null });
    await typeGymQuery(tree, 'The Gym');
    selectFromList(flatLists(tree)[0], OTHER);
    expect(flattenText(tree.toJSON())).toContain('The Gym Leeds');

    await type(tree, 'Handle', 'rowan_lifts');
    await type(tree, 'Display name', 'Rowan M');
    await act(async () => { button(tree, 'Create my Community profile').props.onPress(); });
    await flush();

    expect(setGyms).toHaveBeenCalledWith('g1', ['g2']);
  });

  test('a minor sees the identical gym step (no special-casing)', async () => {
    useCommunityMe.mockReturnValue({
      me: { profile: null, is_minor: true }, loading: false, error: null, refresh: jest.fn(),
    });
    const { tree } = await mount();

    expect(button(tree, 'Skip choosing a gym for now')).toBeDefined();
    expect(tree.root.findByProps({ accessibilityLabel: 'Gym, town or postcode' })).toBeDefined();
  });
});
