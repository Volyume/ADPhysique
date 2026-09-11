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

// GymDetailSheet's BottomSheet reads insets unconditionally on mount (not
// only once visible), so this needs a stub even though this suite never
// looks at the value itself.
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

// 30-IMPLEMENTATION.md 1.2: GymPicker (rebuilt as the finder) needs a
// controllable `search` to exercise the main + other gyms flow below;
// everything else (rankVenues, milesToMetres, isPostcodeLike,
// recognisePostcode, setGyms) stays real/faked exactly as it already
// was for the rest of this suite's unmocked gym field.
// GymDetailSheet (community product audit 2026-09-07: every tapped row
// opens the confirmation sheet before it is selected) calls `get(id)` to
// enrich the row; faked here the same way search/near/setGyms already
// are, resolving with whichever of the two fixtures below was tapped.
jest.mock('../../lib/gyms', () => {
  const actual = jest.requireActual('../../lib/gyms');
  return {
    ...actual,
    search: jest.fn(),
    near: jest.fn(() => Promise.resolve({ venues: [], truncated: false })),
    setGyms: jest.fn(() => Promise.resolve({})),
    get: jest.fn(),
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
  // Communities revamp 2026-09-10: the discipline picker (task 2). Four
  // keys (one more than the cap) so the "at most three" behaviour has
  // something to refuse.
  COMMUNITY_DISCIPLINE_KEYS: ['bodybuilding', 'powerlifting', 'wellness', 'hybrid'],
  COMMUNITY_DISCIPLINE_LABELS: {
    bodybuilding: 'Bodybuilding', powerlifting: 'Powerlifting', wellness: 'Wellness', hybrid: 'Hybrid',
  },
  MAX_DISCIPLINES_PER_PROFILE: 3,
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
    days: false, time_bands: false, sessions: true, staple_lifts: true, experience: true, age_band: false,
    consistency: false, share_sessions: false,
  },
  SESSIONS_AUDIENCE_VALUES: ['followers', 'groups', 'everyone'],
  SESSIONS_AUDIENCE_LABELS: { followers: 'Followers', groups: 'My groups', everyone: 'Everyone' },
  dayListLabel: () => '',
  timeBandsLabel: () => '',
  previewLine: () => '',
  shareablePayload: () => ({}),
  loadTrainingProfile: jest.fn(() => Promise.resolve({})),
  readShareSettings: jest.fn(() => Promise.resolve({
    days: false, time_bands: false, sessions: true, staple_lifts: true, experience: true, age_band: false,
    consistency: false, share_sessions: false, sessions_audience: 'followers',
  })),
  writeShareSettings: jest.fn(() => Promise.resolve()),
  syncTrainingProfile: jest.fn(() => Promise.resolve({ sent: true, reason: null, payload: null })),
  publishConsistency: jest.fn(() => Promise.resolve({ sent: true, reason: null, payload: null })),
  publishSharingSettings: jest.fn(() => Promise.resolve({ sent: true, reason: null })),
  setPartner: jest.fn(() => Promise.resolve()),
  listMyGroups: jest.fn(() => Promise.resolve([])),
  // Communities revamp 2026-09-10 (onboarding join, spec section 4.4).
  COMMUNITY_RULES_SUMMARY: [
    'Training talk only.',
    'Be decent to people.',
    'No body-shaming, no diet or calorie talk.',
    'Report what breaks this.',
  ],
  suggestHandle: jest.fn(),
  readOnboardingChoice: jest.fn(),
  readPendingJoin: jest.fn(),
  clearPendingJoin: jest.fn(),
}));

import {
  checkHandle, upsertProfile, COMMUNITY_RULES_VERSION, syncTrainingProfile, publishSharingSettings,
  listMyGroups, suggestHandle, readOnboardingChoice, readPendingJoin, clearPendingJoin,
} from '../../lib/community';
import { search as searchGyms, setGyms, get as getGym } from '../../lib/gyms';
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
  getGym.mockResolvedValue(null);
  // Communities revamp 2026-09-10 (spec section 4.4). Defaults preserve
  // every pre-existing test's behaviour above (a rejected suggestion and
  // nothing pending/remembered): the mount effect below does nothing
  // observable unless a test overrides one of these.
  suggestHandle.mockRejectedValue(Object.assign(new Error('unavailable'), { code: 'unavailable' }));
  readOnboardingChoice.mockResolvedValue(null);
  readPendingJoin.mockResolvedValue(null);
  clearPendingJoin.mockResolvedValue(undefined);
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
    expect(text).toContain('Nothing from your training is shared just now.');
  });

  // Phase 3 (spec section 1): "Share what I did" is offered here too,
  // beside the other bands, and its choice takes on Create.
  test('"Share what I did" is offered alongside the other bands', async () => {
    const { tree } = await mount();
    expect(flattenText(tree.toJSON())).toContain('Share what I did');
  });

  test('switching it on and choosing Everyone publishes that on Create', async () => {
    const { tree } = await mount();
    const shareSwitch = tree.root.findAll(
      (n) => n.props?.accessibilityLabel === 'Share share what i did' && typeof n.props?.onValueChange === 'function',
    )[0];
    await act(async () => { shareSwitch.props.onValueChange(true); });
    await flush();

    const everyone = tree.root.findAll((n) => n.props?.label === 'Everyone' && n.props?.onPress)[0];
    await act(async () => { everyone.props.onPress(); });
    await flush();

    await type(tree, 'Handle', 'rowan_lifts');
    await type(tree, 'Display name', 'Rowan M');
    await act(async () => { button(tree, 'Create my Community profile').props.onPress(); });
    await flush();

    expect(publishSharingSettings).toHaveBeenCalledWith(
      'u1', expect.objectContaining({ share_sessions: true, sessions_audience: 'everyone' }),
    );
  });

  test('left off, nothing is published for it on Create', async () => {
    const { tree } = await mount();
    await type(tree, 'Handle', 'rowan_lifts');
    await type(tree, 'Display name', 'Rowan M');
    await act(async () => { button(tree, 'Create my Community profile').props.onPress(); });
    await flush();

    expect(publishSharingSettings).not.toHaveBeenCalled();
  });

  // F5 (fresh-eyes review): "My groups" with nobody to post to is a
  // doomed, silent choice (`ambient.js` skips with skipped:'no_groups').
  async function openAudienceChips(tree) {
    const shareSwitch = tree.root.findAll(
      (n) => n.props?.accessibilityLabel === 'Share share what i did' && typeof n.props?.onValueChange === 'function',
    )[0];
    await act(async () => { shareSwitch.props.onValueChange(true); });
    await flush();
  }

  test('with no groups (the default for a fresh joiner), "My groups" is disabled and says why', async () => {
    const { tree } = await mount();
    await openAudienceChips(tree);

    const myGroups = tree.root.findAll((n) => n.props?.label === 'My groups' && n.props?.onPress)[0];
    expect(myGroups.props.disabled).toBe(true);
    expect(flattenText(tree.toJSON())).toContain('You are not in any groups yet.');
  });

  test('with a group, "My groups" is enabled and the line is absent', async () => {
    listMyGroups.mockResolvedValueOnce([{ group: { id: 'g1' }, role: 'member', state: 'member' }]);
    const { tree } = await mount();
    await openAudienceChips(tree);

    const myGroups = tree.root.findAll((n) => n.props?.label === 'My groups' && n.props?.onPress)[0];
    expect(myGroups.props.disabled).toBe(false);
    expect(flattenText(tree.toJSON())).not.toContain('You are not in any groups yet.');
  });

  test('a read failure fails open: never blocks the choice on a network error', async () => {
    listMyGroups.mockRejectedValueOnce(new Error('offline'));
    const { tree } = await mount();
    await openAudienceChips(tree);

    const myGroups = tree.root.findAll((n) => n.props?.label === 'My groups' && n.props?.onPress)[0];
    expect(myGroups.props.disabled).toBe(false);
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

  // F12 (fresh-eyes review): `emptyMe()` now defaults `is_minor` to true
  // (unknown means minor), so `useCommunityMe`'s own `loading` must gate
  // this copy -- an adult's identity still loading must never flash it.
  test('F12: while the identity is still loading, the under-18 line never shows, even though is_minor defaults true', async () => {
    useCommunityMe.mockReturnValue({
      me: { profile: null, is_minor: true }, loading: true, error: null, refresh: jest.fn(),
    });
    const { tree } = await mount();

    expect(flattenText(tree.toJSON()))
      .not.toContain('Under 18: your profile is followers-only and does not appear in search.');
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

  // Community product audit 2026-09-07 (gym finder brief): tapping a row
  // (selectFromList) only opens GymDetailSheet now; this presses the
  // sheet's own "Select this gym" to actually commit the choice.
  async function confirmGym(tree, venue) {
    await flush(); // the sheet's own get(id) fetch
    const btn = button(tree, `Select ${venue.display_name}`);
    await act(async () => { btn.props.onPress(); });
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
    await confirmGym(tree, MAIN);
    expect(flattenText(tree.toJSON())).toContain('PureGym Motherwell');

    await act(async () => { button(tree, 'Add another gym you train at').props.onPress(); });
    searchGyms.mockResolvedValue({ venues: [OTHER], recognisedPostcode: null, centroid: null });
    await typeGymQuery(tree, 'The Gym');
    selectFromList(flatLists(tree)[0], OTHER);
    await confirmGym(tree, OTHER);
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

// ─── Communities revamp 2026-09-10 (task 2): the discipline picker, after
// the gym step, optional, up to three, saved through upsertProfile. ─────
describe('the discipline picker', () => {
  function chipGroup(tree, groupLabel) {
    return tree.root.findAll((n) => n.props?.accessibilityLabel === groupLabel)[0];
  }
  function chip(tree, chipLabel) {
    return chipGroup(tree, 'What do you train for?').findAll(
      (n) => typeof n.type === 'function' && n.props?.label === chipLabel && n.props?.accessibilityRole === 'checkbox',
    )[0];
  }

  test('is optional: Create works with none chosen', async () => {
    const { tree } = await mount();
    await type(tree, 'Handle', 'rowan_lifts');
    await type(tree, 'Display name', 'Rowan M');

    await act(async () => { button(tree, 'Create my Community profile').props.onPress(); });
    await flush();

    expect(upsertProfile).toHaveBeenCalledWith(expect.objectContaining({ discipline_keys: [] }));
  });

  test('the helper line says what it is for', async () => {
    const { tree } = await mount();
    expect(flattenText(tree.toJSON())).toContain('Optional. Helps people like you find you.');
  });

  test('choosing disciplines sends exactly those keys, in the order tapped', async () => {
    const { tree } = await mount();
    await act(async () => { chip(tree, 'Bodybuilding').props.onPress(); });
    await act(async () => { chip(tree, 'Wellness').props.onPress(); });
    await type(tree, 'Handle', 'rowan_lifts');
    await type(tree, 'Display name', 'Rowan M');

    await act(async () => { button(tree, 'Create my Community profile').props.onPress(); });
    await flush();

    expect(upsertProfile).toHaveBeenCalledWith(
      expect.objectContaining({ discipline_keys: ['bodybuilding', 'wellness'] }),
    );
  });

  test('a fourth pick is refused: at most three travel', async () => {
    const { tree } = await mount();
    await act(async () => { chip(tree, 'Bodybuilding').props.onPress(); });
    await act(async () => { chip(tree, 'Powerlifting').props.onPress(); });
    await act(async () => { chip(tree, 'Wellness').props.onPress(); });
    await act(async () => { chip(tree, 'Hybrid').props.onPress(); });
    await type(tree, 'Handle', 'rowan_lifts');
    await type(tree, 'Display name', 'Rowan M');

    await act(async () => { button(tree, 'Create my Community profile').props.onPress(); });
    await flush();

    expect(upsertProfile).toHaveBeenCalledWith(expect.objectContaining({
      discipline_keys: ['bodybuilding', 'powerlifting', 'wellness'],
    }));
    expect(chip(tree, 'Hybrid').props.selected).toBe(false);
  });

  test('tapping a chosen chip again removes it', async () => {
    const { tree } = await mount();
    await act(async () => { chip(tree, 'Bodybuilding').props.onPress(); });
    expect(chip(tree, 'Bodybuilding').props.selected).toBe(true);

    await act(async () => { chip(tree, 'Bodybuilding').props.onPress(); });
    expect(chip(tree, 'Bodybuilding').props.selected).toBe(false);
  });
});

// ─── Communities revamp 2026-09-10 (onboarding join, spec section 4.4):
// the server suggestion, the "Not now" onboarding choice, and pending-
// join precedence, all on mount. ───────────────────────────────────────
describe('the handle suggestion on mount', () => {
  test('a resolved suggestion fills the handle and runs the SAME live check a typed one gets', async () => {
    suggestHandle.mockResolvedValueOnce({ handle: 'suggested_one', source: 'email' });
    const { tree } = await mount();
    await flush(); // the cascaded live-check debounce, on top of mount()'s own flush

    expect(field(tree, 'Handle').props.value).toBe('suggested_one');
    expect(checkHandle).toHaveBeenCalledWith('suggested_one');
    expect(flattenText(tree.toJSON())).toContain('Available');
  });

  test('a failure leaves the field empty with the shape hint, exactly as before this order', async () => {
    // The beforeEach default already rejects; named explicitly so the
    // "unchanged behaviour" half of spec 4.4 has its own test.
    const { tree } = await mount();

    expect(field(tree, 'Handle').props.value).toBe('');
    expect(checkHandle).not.toHaveBeenCalled();
    expect(flattenText(tree.toJSON())).toContain('Use 3 to 20 letters, numbers or underscores.');
  });

  test('a handle already typed before the suggestion resolves is never overwritten', async () => {
    let resolveSuggestion;
    suggestHandle.mockReturnValueOnce(new Promise((resolve) => { resolveSuggestion = resolve; }));
    const { tree } = await mount();

    await type(tree, 'Handle', 'my_own_handle');
    resolveSuggestion({ handle: 'suggested_one', source: 'email' });
    await flush();

    expect(field(tree, 'Handle').props.value).toBe('my_own_handle');
  });
});

describe('the "Not now" onboarding choice pre-fill', () => {
  test('pre-selects the gym (picked state) and the name, when both were remembered', async () => {
    readOnboardingChoice.mockResolvedValueOnce({
      gym: { id: 'g1', display_name: 'PureGym Motherwell', name: 'PureGym Motherwell', town: 'Motherwell', outward: 'ML1' },
      displayName: 'Rowan',
    });
    const { tree } = await mount();

    expect(flattenText(tree.toJSON())).toContain('Your main gym');
    expect(flattenText(tree.toJSON())).toContain('PureGym Motherwell');
    expect(field(tree, 'Display name').props.value).toBe('Rowan');
  });

  test('a null gym (chose "I don\'t train at a gym") never forces the picked state', async () => {
    readOnboardingChoice.mockResolvedValueOnce({ gym: null, displayName: 'Rowan' });
    const { tree } = await mount();

    expect(flattenText(tree.toJSON())).not.toContain('Your main gym');
    expect(field(tree, 'Display name').props.value).toBe('Rowan');
  });

  test('no remembered choice leaves the gym step at its default', async () => {
    const { tree } = await mount();
    expect(flattenText(tree.toJSON())).not.toContain('Your main gym');
  });
});

describe('a pending join pre-fills instead, and supersedes the queue', () => {
  test('pre-fills handle, name and gym from the pending join, and never asks for a suggestion or the onboarding choice', async () => {
    readPendingJoin.mockResolvedValueOnce({
      handle: 'queued_handle', displayName: 'Queued Name', gymId: 'g9', decidedAt: Date.now(),
    });
    const { tree } = await mount();
    await flush(); // the cascaded live-check debounce for the pre-filled handle

    expect(field(tree, 'Handle').props.value).toBe('queued_handle');
    expect(field(tree, 'Display name').props.value).toBe('Queued Name');
    expect(flattenText(tree.toJSON())).toContain('Your main gym');
    expect(suggestHandle).not.toHaveBeenCalled();
    expect(readOnboardingChoice).not.toHaveBeenCalled();
  });

  test('a successful create clears the pending join: this screen supersedes it', async () => {
    readPendingJoin.mockResolvedValueOnce({
      handle: 'queued_handle', displayName: 'Queued Name', gymId: null, decidedAt: Date.now(),
    });
    const { tree } = await mount();
    await flush(); // let the pre-filled handle's live check settle to 'available'

    await act(async () => { button(tree, 'Create my Community profile').props.onPress(); });
    await flush();

    expect(upsertProfile).toHaveBeenCalledTimes(1);
    expect(clearPendingJoin).toHaveBeenCalledWith('u1');
  });
});
