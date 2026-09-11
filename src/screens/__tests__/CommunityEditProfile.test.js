/**
 * CommunityEditProfileScreen and the visibility control on
 * CommunityPrivacyScreen (blueprint sections 2, 6; SD-05).
 *
 * Both screens send a PARTIAL profile: `community_upsert_profile` treats a
 * key that is absent on an update as "keep the current value" and a key
 * sent as null as "clear it" (migrate_160_community.sql, product review
 * 2026-09-06 findings 1-2). What this suite pins is the client half of
 * that contract, because getting it wrong is silent and total:
 *
 *   1. RE-ANCHORED (communities revamp 2026-09-10, founder order
 *      2026-09-11: "the option to change their user / display name";
 *      `docs/communities-revamp-2026-09-10/25-ONBOARDING-COMMUNITY-SPEC.md`
 *      section 4.4). The OLD pin here was "neither screen sends a
 *      handle" -- that changes DELIBERATELY for CommunityEditProfileScreen
 *      only: it now offers a Handle field, live-checked exactly as Join
 *      checks a new one, and Save carries a `handle` key ONLY when the
 *      typed value differs from the profile's own; an untouched save
 *      still sends none, the same partial-update contract every other
 *      field here relies on. CommunityPrivacyScreen has no handle field
 *      and is unaffected; its own "sends only { visibility }" pin below
 *      stands unchanged.
 *   2. A refusal is spoken calmly, names nothing the user did not do, and
 *      nothing is claimed to have happened (no toast of success, no
 *      goBack).
 *   3. The privacy screen sends `{ visibility }` and NOTHING else, and a
 *      failure puts the segment back where it was rather than leaving a
 *      privacy control showing a state the server never accepted.
 *
 * The client library is mocked: this is about what the screens send and
 * show, not about the RPC.
 */

import { create, act } from 'react-test-renderer';

// GymDetailSheet's BottomSheet reads insets unconditionally on mount, so
// this needs a stub too (community product audit 2026-09-07: every tapped
// gym row now opens that sheet before it is selected).
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));

jest.mock('../../hooks/useCommunityMe', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../lib/community', () => ({
  upsertProfile: jest.fn(),
  leaveCommunity: jest.fn(),
  relationships: jest.fn(),
  unblockUser: jest.fn(),
  unmuteUser: jest.fn(),
  hasProfile: (me) => !!me?.profile?.handle,
  COMMUNITY_STYLE_KEYS: { strength: 'Strength', kettlebell: 'Kettlebell' },
  COMMUNITY_GOALS: { get_stronger: 'Get stronger' },
  COMMUNITY_SETTINGS: { home_gym: 'Home gym' },
  MAX_STYLES_PER_PROFILE: 3,
  // Communities revamp 2026-09-10: the discipline picker (task 2). Four
  // keys (one more than the cap) so the "at most three" behaviour has
  // something to refuse.
  COMMUNITY_DISCIPLINE_KEYS: ['bodybuilding', 'powerlifting', 'wellness', 'hybrid'],
  COMMUNITY_DISCIPLINE_LABELS: {
    bodybuilding: 'Bodybuilding', powerlifting: 'Powerlifting', wellness: 'Wellness', hybrid: 'Hybrid',
  },
  MAX_DISCIPLINES_PER_PROFILE: 3,
  DISPLAY_NAME_MAX: 40,
  BIO_MAX: 160,
  AREA_LABEL_MAX: 60,
  setConnectFrom: jest.fn(),
  setPlace: jest.fn(() => Promise.resolve({ kind: 'none', label: null, lat: null, lng: null })),
  CONNECT_FROM_VALUES: { anyone: 'Anyone', followers: 'People who follow me', nobody: 'Nobody' },
  // Communities revamp 2026-09-10 (spec section 4.4): the handle field.
  // The real shape rule, not a stand-in (same rule CommunityJoin.test.js
  // uses for its own Join-screen suite): 3 to 20 lowercase letters,
  // digits or underscores, no leading or trailing underscore.
  isValidHandle: (h) => /^[a-z0-9_]{3,20}$/.test(h) && !h.startsWith('_') && !h.endsWith('_'),
  checkHandle: jest.fn(),
  HANDLE_CHANGE_DAYS: 30,
}));

// GD-14 (gym database blueprint `docs/gym-database-2026-09-06/
// 20-BLUEPRINT.md`): the gym field is now GymPicker over `src/lib/gyms`,
// saved through `setGyms` rather than the old free-text `gym_label` on
// `upsertProfile`. Nothing here types a gym or opens the picker (the
// fixture profile carries a LEGACY `gym_label` with no `gym_id`, which
// renders read-only), so these stubs only need to exist for `save()`'s
// unconditional `setGyms` call and for the module graph to resolve.
jest.mock('../../lib/gyms', () => {
  // 30-IMPLEMENTATION.md 1.2: GymPicker (rebuilt as the finder) also uses
  // `near`, `rankVenues` and `milesToMetres` from this module. Only
  // `search`/`get`/`setGyms`/`isPostcodeLike`/`recognisePostcode` need
  // faking for this suite (nothing here types a gym or opens the
  // picker); the rest stay the real, pure implementations so GymPicker
  // renders exactly as it does in the app.
  const actual = jest.requireActual('../../lib/gyms');
  return {
    __esModule: true,
    ...actual,
    get: jest.fn(() => Promise.resolve(null)),
    setGyms: jest.fn(() => Promise.resolve({})),
    search: jest.fn(() => Promise.resolve({ venues: [], recognisedPostcode: null, centroid: null })),
    near: jest.fn(() => Promise.resolve({ venues: [], truncated: false })),
    placeCentroid: jest.fn(() => Promise.resolve({ kind: 'none', label: null, lat: null, lng: null })),
    isPostcodeLike: jest.fn(() => false),
    recognisePostcode: jest.fn(() => ({ kind: 'none', normalised: null, outward: null })),
    venueLine: (v) => ({ primary: v?.display_name || v?.name || '', secondary: '' }),
    isPendingVenue: jest.fn(() => false),
  };
});
jest.mock('../../lib/deviceLocation', () => ({
  isAvailable: jest.fn(() => false),
  getApproximatePosition: jest.fn(),
}));

import { upsertProfile, relationships, setConnectFrom, setPlace, checkHandle } from '../../lib/community';
import { setGyms, placeCentroid, get as getGymModule } from '../../lib/gyms';
import useCommunityMe from '../../hooks/useCommunityMe';
import CommunityEditProfileScreen from '../CommunityEditProfileScreen';
import CommunityPrivacyScreen from '../CommunityPrivacyScreen';

const PROFILE = {
  user_id: 'u1',
  handle: 'rowan_lifts',
  display_name: 'Rowan M',
  bio: 'Kettlebells and squats.',
  avatar_preset: null,
  styles: ['kettlebell'],
  goal: 'get_stronger',
  setting: 'home_gym',
  area_label: 'Leeds',
  gym_label: 'PureGym Leeds',
  visibility: 'public',
};

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

async function flush() {
  await act(async () => {
    // GymTypeahead debounces its suggestion read (250ms), the same pattern
    // the Join screen's handle check uses; fake timers keep that pending
    // read from firing after a test has already finished.
    jest.advanceTimersByTime(400);
    for (let i = 0; i < 12; i += 1) await Promise.resolve();
  });
}

function byLabel(tree, label) {
  return tree.root.findAll(
    (n) => typeof n.type === 'function' && n.props?.accessibilityLabel === label,
  )[0];
}

function field(tree, label) {
  return tree.root.findAll((n) => n.props?.accessibilityLabel === label && n.props?.onChangeText)[0];
}

async function mount(Screen) {
  const navigation = { navigate: jest.fn(), goBack: jest.fn(), popToTop: jest.fn() };
  let tree;
  await act(async () => {
    tree = create(<Screen navigation={navigation} route={{ params: {} }} />);
  });
  await flush();
  return { tree, navigation };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  upsertProfile.mockResolvedValue({ ...PROFILE });
  relationships.mockResolvedValue({ blocked: [], muted: [] });
  checkHandle.mockResolvedValue(true);
  setPlace.mockResolvedValue({ kind: 'town', label: 'Motherwell', lat: 55.79, lng: -3.99 });
  placeCentroid.mockResolvedValue({ kind: 'town', label: 'Motherwell', lat: 55.79, lng: -3.99 });
  useCommunityMe.mockReturnValue({
    me: { profile: PROFILE, is_moderator: false },
    loading: false,
    error: null,
    refresh: jest.fn(),
  });
});

afterEach(() => { jest.useRealTimers(); });

describe('Edit profile saves the fields it owns', () => {
  test('an untouched handle sends no `handle` key, the same partial-update contract as every other field', async () => {
    const { tree, navigation } = await mount(CommunityEditProfileScreen);

    await act(async () => { field(tree, 'Bio').props.onChangeText('Now with more squats.'); });
    await act(async () => { byLabel(tree, 'Save profile').props.onPress(); });
    await flush();

    expect(upsertProfile).toHaveBeenCalledTimes(1);
    const sent = upsertProfile.mock.calls[0][0];
    expect(sent).not.toHaveProperty('handle');
    expect(sent).toEqual(expect.objectContaining({
      display_name: 'Rowan M',
      bio: 'Now with more squats.',
      visibility: 'public',
    }));
    expect(sent).not.toHaveProperty('gym_label');
    // GD-14: the gym is saved through community_set_gyms, not this call.
    // The fixture profile has no gym_id (a legacy free-text label), so
    // nothing was picked and both arguments stay empty.
    expect(setGyms).toHaveBeenCalledWith(null, []);
    expect(mockToastShow).toHaveBeenCalledWith('Profile saved');
    expect(navigation.goBack).toHaveBeenCalled();
  });

  test('a taken handle is spoken calmly and the screen stays put', async () => {
    const err = new Error('handle_taken');
    err.code = 'handle_taken';
    upsertProfile.mockRejectedValueOnce(err);

    const { tree, navigation } = await mount(CommunityEditProfileScreen);
    await act(async () => { byLabel(tree, 'Save profile').props.onPress(); });
    await flush();

    expect(mockToastShow).toHaveBeenCalledWith(
      'That handle is taken. Try another.',
      expect.objectContaining({ variant: 'error' }),
    );
    expect(mockToastShow).not.toHaveBeenCalledWith('Profile saved');
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test('a rate limit says so plainly, and never blames the wording', async () => {
    const err = new Error('rate_limited');
    err.code = 'rate_limited';
    upsertProfile.mockRejectedValueOnce(err);

    const { tree } = await mount(CommunityEditProfileScreen);
    await act(async () => { byLabel(tree, 'Save profile').props.onPress(); });
    await flush();

    expect(mockToastShow).toHaveBeenCalledWith(
      'That is a lot of changes for one day. Try again tomorrow.',
      expect.objectContaining({ variant: 'error' }),
    );
  });
});

// ─── Communities revamp 2026-09-10 (spec section 4.4; founder order
// 2026-09-11): the Handle field, live-checked exactly as Join checks a
// NEW one, but measured against the profile's OWN handle rather than
// against "well-formed and free" alone. ────────────────────────────────
describe('the handle field', () => {
  test('is on the screen now, pre-filled from the profile, with the cooldown hint', async () => {
    const { tree } = await mount(CommunityEditProfileScreen);

    expect(field(tree, 'Handle').props.value).toBe('rowan_lifts');
    expect(flattenText(tree.toJSON()))
      .toContain('Letters, numbers and underscores. You can change your handle once every 30 days.');
  });

  test('re-typing the SAME handle asks the server nothing, and Save stays enabled', async () => {
    const { tree } = await mount(CommunityEditProfileScreen);

    await act(async () => { field(tree, 'Handle').props.onChangeText('rowan_lifts'); });
    await flush();

    expect(checkHandle).not.toHaveBeenCalled();
    expect(byLabel(tree, 'Save profile').props.disabled).toBe(false);
  });

  test('a handle of the wrong shape never reaches the server, and Save is disabled', async () => {
    const { tree } = await mount(CommunityEditProfileScreen);

    await act(async () => { field(tree, 'Handle').props.onChangeText('ro'); });
    await flush();

    expect(checkHandle).not.toHaveBeenCalled();
    expect(byLabel(tree, 'Save profile').props.disabled).toBe(true);
  });

  test('a free new handle reads Available, live-checked against the server', async () => {
    const { tree } = await mount(CommunityEditProfileScreen);

    await act(async () => { field(tree, 'Handle').props.onChangeText('New_Handle'); });
    await flush();

    expect(checkHandle).toHaveBeenCalledWith('new_handle'); // lowercased and stripped
    expect(flattenText(tree.toJSON())).toContain('Available');
    expect(byLabel(tree, 'Save profile').props.disabled).toBe(false);
  });

  test('a taken handle disables Save until it changes again', async () => {
    checkHandle.mockResolvedValue(false);
    const { tree } = await mount(CommunityEditProfileScreen);

    await act(async () => { field(tree, 'Handle').props.onChangeText('new_handle'); });
    await flush();

    expect(flattenText(tree.toJSON())).toContain('Taken');
    expect(byLabel(tree, 'Save profile').props.disabled).toBe(true);
  });

  test('a check that cannot run never blocks Save (same posture as Join)', async () => {
    checkHandle.mockRejectedValue(Object.assign(new Error('offline'), { code: 'offline' }));
    const { tree } = await mount(CommunityEditProfileScreen);

    await act(async () => { field(tree, 'Handle').props.onChangeText('new_handle'); });
    await flush();

    expect(flattenText(tree.toJSON())).toContain('Could not check that handle. You are offline.');
    expect(byLabel(tree, 'Save profile').props.disabled).toBe(false);
  });

  test('a changed, available handle is sent on Save', async () => {
    const { tree } = await mount(CommunityEditProfileScreen);

    await act(async () => { field(tree, 'Handle').props.onChangeText('new_handle'); });
    await flush();
    await act(async () => { byLabel(tree, 'Save profile').props.onPress(); });
    await flush();

    expect(upsertProfile).toHaveBeenCalledWith(expect.objectContaining({ handle: 'new_handle' }));
  });

  test('not_allowed (the server\'s 30-day cooldown) is named plainly, and nothing is claimed to have happened', async () => {
    upsertProfile.mockRejectedValueOnce(Object.assign(new Error('not_allowed'), { code: 'not_allowed' }));
    const { tree, navigation } = await mount(CommunityEditProfileScreen);

    await act(async () => { field(tree, 'Handle').props.onChangeText('new_handle'); });
    await flush();
    await act(async () => { byLabel(tree, 'Save profile').props.onPress(); });
    await flush();

    expect(mockToastShow).toHaveBeenCalledWith(
      'You changed your handle less than 30 days ago.',
      expect.objectContaining({ variant: 'error' }),
    );
    expect(mockToastShow).not.toHaveBeenCalledWith('Profile saved');
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});

// ─── 30-IMPLEMENTATION.md 1.1 B / 1.2: the Place picker replaces the old
// "Area" text box, and is its own RPC (`setPlace`), called only when the
// person actually changed it this session. ───────────────────────────
describe('the Place picker (replaces the old Area text box)', () => {
  test('picking a new place and saving calls setPlace, not upsertProfile, with it', async () => {
    const { tree } = await mount(CommunityEditProfileScreen);

    await act(async () => { field(tree, 'Place').props.onChangeText('Motherwell'); });
    await flush();
    await act(async () => { byLabel(tree, 'Use this place').props.onPress(); });

    await act(async () => { byLabel(tree, 'Save profile').props.onPress(); });
    await flush();

    expect(setPlace).toHaveBeenCalledWith('Motherwell');
    const sent = upsertProfile.mock.calls[0][0];
    expect(sent).not.toHaveProperty('area_label');
  });

  test('saving without touching the place never calls setPlace', async () => {
    const { tree } = await mount(CommunityEditProfileScreen);

    await act(async () => { byLabel(tree, 'Save profile').props.onPress(); });
    await flush();

    expect(setPlace).not.toHaveBeenCalled();
  });

  test('"Use my gym\'s town" is offered once the linked gym\'s town is known', async () => {
    getGymModule.mockResolvedValue({ id: 'g1', display_name: 'PureGym Leeds', town: 'Leeds' });
    useCommunityMe.mockReturnValue({
      me: { profile: { ...PROFILE, gym_id: 'g1', gym_label: 'PureGym Leeds' }, is_moderator: false },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { tree } = await mount(CommunityEditProfileScreen);
    await flush();
    expect(byLabel(tree, "Use my gym's town")).toBeDefined();
  });
});

describe('the privacy screen visibility control', () => {
  // Visual rulings 2026-09-07 (V6, V13): the privacy screen's pick-one
  // controls are Chip rows now, not SegmentedControl, so these look up the
  // "People I approve" / "Anyone" Chip inside its labelled row rather than
  // a single onChange/value component.
  function chipGroup(tree, groupLabel) {
    return tree.root.findAll((n) => n.props?.accessibilityLabel === groupLabel)[0];
  }
  function chip(tree, groupLabel, chipLabel) {
    return chipGroup(tree, groupLabel).findAll(
      (n) => typeof n.type === 'function' && n.props?.label === chipLabel && n.props?.accessibilityRole === 'radio',
    )[0];
  }

  test('sends only the visibility, and nothing else; the confirmation reads the STORED value', async () => {
    // The returned card carries what the server stored (hostile review
    // OJ-REV-SQL-2, F8): the toast never echoes the request.
    upsertProfile.mockResolvedValueOnce({ ...PROFILE, visibility: 'followers' });
    const { tree } = await mount(CommunityPrivacyScreen);

    await act(async () => { chip(tree, 'Who can follow you', 'People I approve').props.onPress(); });
    await flush();

    expect(upsertProfile).toHaveBeenCalledTimes(1);
    expect(upsertProfile).toHaveBeenCalledWith({ visibility: 'followers' });
    expect(mockToastShow).toHaveBeenCalledWith('You approve every follower');
  });

  test('asked for public but kept followers-only by the server: said plainly, and the control shows the stored value', async () => {
    useCommunityMe.mockReturnValue({
      me: { profile: { ...PROFILE, visibility: 'followers' }, is_moderator: false },
      loading: false, error: null, refresh: jest.fn(),
    });
    upsertProfile.mockResolvedValueOnce({ ...PROFILE, visibility: 'followers' });
    const { tree } = await mount(CommunityPrivacyScreen);

    await act(async () => { chip(tree, 'Who can follow you', 'Anyone').props.onPress(); });
    await flush();

    expect(upsertProfile).toHaveBeenCalledWith({ visibility: 'public' });
    expect(mockToastShow).toHaveBeenCalledWith('Your profile stays followers only. You approve every follower.');
    expect(chip(tree, 'Who can follow you', 'People I approve').props.selected).toBe(true);
    expect(chip(tree, 'Who can follow you', 'Anyone').props.selected).toBe(false);
  });

  test('a refusal puts the control back where it was', async () => {
    upsertProfile.mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'offline' }));

    const { tree } = await mount(CommunityPrivacyScreen);
    await act(async () => { chip(tree, 'Who can follow you', 'People I approve').props.onPress(); });
    await flush();

    expect(chip(tree, 'Who can follow you', 'Anyone').props.selected).toBe(true);
    expect(chip(tree, 'Who can follow you', 'People I approve').props.selected).toBe(false);
    expect(mockToastShow).toHaveBeenCalledWith(
      'Could not change that just now.',
      expect.objectContaining({ variant: 'error' }),
    );
  });

  test('the moderation queue is offered to a moderator only', async () => {
    const { tree } = await mount(CommunityPrivacyScreen);
    expect(flattenText(tree.toJSON())).not.toContain('Moderation queue');

    useCommunityMe.mockReturnValue({
      me: { profile: PROFILE, is_moderator: true },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    const moderator = await mount(CommunityPrivacyScreen);
    expect(flattenText(moderator.tree.toJSON())).toContain('Moderation queue');
  });
});

// ─── Discovery additions (`docs/social-discovery-2026-09-06/
// 70-DISCOVERY-BLUEPRINT.md` sections 1, 3, 7; SD-20, SD-22, SD-26) ──────
describe('who can send a connection request, and the two discovery links', () => {
  // Visual rulings 2026-09-07 (V6, V13): a Chip row, same lookup shape as
  // the visibility control above.
  function chipGroup(tree, groupLabel) {
    return tree.root.findAll((n) => n.props?.accessibilityLabel === groupLabel)[0];
  }
  function connectChip(tree, chipLabel) {
    return chipGroup(tree, 'Who can send you connection requests').findAll(
      (n) => typeof n.type === 'function' && n.props?.label === chipLabel && n.props?.accessibilityRole === 'radio',
    )[0];
  }

  test('changes connect_from through its own RPC, never through upsertProfile', async () => {
    const { tree } = await mount(CommunityPrivacyScreen);

    await act(async () => { connectChip(tree, 'People who follow me').props.onPress(); });
    await flush();

    expect(setConnectFrom).toHaveBeenCalledWith('followers');
    expect(upsertProfile).not.toHaveBeenCalled();
  });

  // Product review 2026-09-06 finding 4: `rules_outdated` was mishandled as
  // a generic "could not change that" refusal on this screen.
  test('rules_outdated reverts the segment and sends the person to accept the rules', async () => {
    setConnectFrom.mockRejectedValueOnce({ code: 'rules_outdated' });
    const { tree, navigation } = await mount(CommunityPrivacyScreen);

    await act(async () => { connectChip(tree, 'People who follow me').props.onPress(); });
    await flush();

    expect(navigation.navigate).toHaveBeenCalledWith('CommunityRules', { mustAccept: true });
    expect(connectChip(tree, 'Anyone').props.selected).toBe(true);
    expect(mockToastShow).not.toHaveBeenCalledWith('Could not change that just now.', { variant: 'error' });
  });

  test('any other connect_from refusal reverts the segment and shows the existing toast', async () => {
    setConnectFrom.mockRejectedValueOnce({ code: 'offline' });
    const { tree } = await mount(CommunityPrivacyScreen);

    await act(async () => { connectChip(tree, 'People who follow me').props.onPress(); });
    await flush();

    expect(connectChip(tree, 'Anyone').props.selected).toBe(true);
    expect(mockToastShow).toHaveBeenCalledWith('Could not change that just now.', { variant: 'error' });
  });

  test('"Training profile" opens its own screen', async () => {
    const { tree, navigation } = await mount(CommunityPrivacyScreen);
    await act(async () => { byLabel(tree, 'Training profile').props.onPress(); });

    expect(navigation.navigate).toHaveBeenCalledWith('CommunityTrainingProfile');
  });
});

// ─── Communities revamp 2026-09-10 (task 2): the discipline picker,
// edited here after Join, optional, up to three, saved through
// upsertProfile. ──────────────────────────────────────────────────────
describe('the discipline picker', () => {
  function chipGroup(tree, groupLabel) {
    return tree.root.findAll((n) => n.props?.accessibilityLabel === groupLabel)[0];
  }
  function chip(tree, chipLabel) {
    return chipGroup(tree, 'What do you train for?').findAll(
      (n) => typeof n.type === 'function' && n.props?.label === chipLabel && n.props?.accessibilityRole === 'checkbox',
    )[0];
  }

  test('pre-fills from the profile\'s own discipline_keys', async () => {
    useCommunityMe.mockReturnValue({
      me: { profile: { ...PROFILE, discipline_keys: ['bodybuilding'] }, is_moderator: false },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { tree } = await mount(CommunityEditProfileScreen);

    expect(chip(tree, 'Bodybuilding').props.selected).toBe(true);
    expect(chip(tree, 'Wellness').props.selected).toBe(false);
  });

  test('a profile with none chosen shows none selected, and Save still carries an empty array', async () => {
    const { tree } = await mount(CommunityEditProfileScreen);
    expect(chip(tree, 'Bodybuilding').props.selected).toBe(false);

    await act(async () => { byLabel(tree, 'Save profile').props.onPress(); });
    await flush();

    expect(upsertProfile).toHaveBeenCalledWith(expect.objectContaining({ discipline_keys: [] }));
  });

  test('changing the selection sends exactly the new keys on Save', async () => {
    useCommunityMe.mockReturnValue({
      me: { profile: { ...PROFILE, discipline_keys: ['bodybuilding'] }, is_moderator: false },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { tree } = await mount(CommunityEditProfileScreen);

    await act(async () => { chip(tree, 'Bodybuilding').props.onPress(); }); // remove
    await act(async () => { chip(tree, 'Wellness').props.onPress(); }); // add
    await act(async () => { byLabel(tree, 'Save profile').props.onPress(); });
    await flush();

    expect(upsertProfile).toHaveBeenCalledWith(expect.objectContaining({ discipline_keys: ['wellness'] }));
  });

  test('a fourth pick is refused: at most three travel', async () => {
    const { tree } = await mount(CommunityEditProfileScreen);
    await act(async () => { chip(tree, 'Bodybuilding').props.onPress(); });
    await act(async () => { chip(tree, 'Powerlifting').props.onPress(); });
    await act(async () => { chip(tree, 'Wellness').props.onPress(); });
    await act(async () => { chip(tree, 'Hybrid').props.onPress(); });

    expect(chip(tree, 'Hybrid').props.selected).toBe(false);
  });
});
