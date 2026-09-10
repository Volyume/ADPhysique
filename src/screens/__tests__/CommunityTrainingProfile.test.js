/**
 * CommunityTrainingProfileScreen (discovery blueprint
 * `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` section 3;
 * SD-22, SD-25, SD-30, SD-31).
 *
 * What this suite pins:
 *
 *   1. `bandRows` renders the six bands in the fixed order the blueprint
 *      sets out, each with the value it is offering to share. There is
 *      no Programme band (communities revamp, 2026-09-10,
 *      `docs/communities-revamp-2026-09-10/20-BLUEPRINT.md` section 10):
 *      Volyume never explains Community as programme sharing.
 *   2. Switching a toggle writes the local share settings AND sends the
 *      recompute FORCED (`syncTrainingProfile(uid, {force: true})`),
 *      because the person just changed their mind and expects it to take
 *      immediately, not on tomorrow's throttle window.
 *   3. "Open to training together" calls `setPartner` with exactly what
 *      is on screen, and switching it off is nothing anywhere claiming
 *      the person was ever looking (SD-25).
 *
 * The client library is mocked: this is about what the screen sends,
 * not about the RPC.
 */

import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../components/BackHeader', () => () => null);

const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));

jest.mock('../../hooks/useCommunityMe', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Hand-held equivalents of the real closed sets and pure helpers
// (`trainingProfile.js`), the same convention `CommunityJoin.test.js`
// uses for `isValidHandle`: real shape, no I/O, no transport.
jest.mock('../../lib/community', () => ({
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
    consistency: false, share_sessions: false, sessions_audience: 'followers',
  },
  SESSIONS_AUDIENCE_VALUES: ['followers', 'groups', 'everyone'],
  SESSIONS_AUDIENCE_LABELS: { followers: 'Followers', groups: 'My groups', everyone: 'Everyone' },
  dayListLabel: (days) => (Array.isArray(days) && days.length ? days.join(', ') : ''),
  timeBandsLabel: (bands) => (Array.isArray(bands) && bands.length ? bands.join(', ') : ''),
  previewLine: (shared, ageBand) => [
    Object.keys(shared ?? {}).filter((k) => shared[k]).join('|'),
    ageBand ? `age:${ageBand}` : null,
  ].filter(Boolean).join('|'),
  shareablePayload: jest.fn((bands, share) => {
    const out = {};
    if (share?.days) out.tp_days = bands?.tp_days ?? null;
    if (share?.time_bands) out.tp_time_bands = bands?.tp_time_bands ?? null;
    if (share?.sessions) out.tp_sessions_band = bands?.tp_sessions_band ?? null;
    if (share?.staple_lifts) out.tp_staple_lifts = bands?.tp_staple_lifts ?? null;
    if (share?.experience) out.tp_experience_band = bands?.tp_experience_band ?? null;
    return out;
  }),
  loadTrainingProfile: jest.fn(),
  readShareSettings: jest.fn(),
  writeShareSettings: jest.fn(() => Promise.resolve()),
  syncTrainingProfile: jest.fn(() => Promise.resolve({ sent: true, reason: null, payload: null })),
  publishSharingSettings: jest.fn(() => Promise.resolve({ sent: true, reason: null })),
  publishConsistency: jest.fn(() => Promise.resolve({ sent: true, reason: null, payload: null })),
  setPartner: jest.fn(() => Promise.resolve()),
}));

const mockAppAlert = jest.fn();
jest.mock('../../components/AppAlert', () => ({ appAlert: (...args) => mockAppAlert(...args) }));

import {
  TP_DEFAULT_SHARE, loadTrainingProfile, readShareSettings, writeShareSettings, syncTrainingProfile,
  publishSharingSettings, setPartner,
} from '../../lib/community';
import useCommunityMe from '../../hooks/useCommunityMe';
import CommunityTrainingProfileScreen, {
  bandRows, NOT_ENOUGH_LINE, NOTHING_SHARED_LINE,
} from '../CommunityTrainingProfileScreen';

const BANDS = {
  tp_days: ['mon', 'wed', 'fri'],
  tp_time_bands: ['evening'],
  tp_sessions_band: '4_5',
  tp_staple_lifts: ['back_squat', 'bench_press'],
  tp_experience_band: 'intermediate',
  sessions: 20,
};

const ME = { profile: { user_id: 'u1' }, tp_age_band: null, open_to_partner: false, partner_prefs: null };

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

async function flush() {
  await act(async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); });
}

function switchFor(tree, label) {
  return tree.root.findAll(
    (n) => n.props?.accessibilityLabel === label && typeof n.props?.onValueChange === 'function',
  )[0];
}

async function mount() {
  const navigation = { navigate: jest.fn() };
  let tree;
  await act(async () => {
    tree = create(<CommunityTrainingProfileScreen navigation={navigation} route={{ params: {} }} />);
  });
  await flush();
  return { tree, navigation };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAppAlert.mockReset();
  loadTrainingProfile.mockResolvedValue({ ...BANDS });
  readShareSettings.mockResolvedValue({ ...TP_DEFAULT_SHARE });
  useCommunityMe.mockReturnValue({ me: ME, loading: false, error: null, refresh: jest.fn(() => Promise.resolve()) });
});

describe('bandRows: the six bands plus consistency and share_sessions, in order, each with its own value (SD-22)', () => {
  test('every row is present, in the blueprint order', () => {
    const rows = bandRows(BANDS, ME);
    expect(rows.map((r) => r.key)).toEqual([
      'days', 'time_bands', 'sessions', 'staple_lifts', 'experience', 'age_band',
      // Community product audit `60-DESIGN-PROGRESS-COMMUNITY.md` section 1.
      'consistency',
      // Phase 3 (spec section 1): "Share what I did".
      'share_sessions',
    ]);
  });

  test('there is no Programme row (communities revamp, 2026-09-10)', () => {
    expect(bandRows(BANDS, ME).some((r) => r.key === 'programme')).toBe(false);
  });

  test('the consistency row always shows the fixed copy, never a computed value', () => {
    const row = bandRows(BANDS, ME).find((r) => r.key === 'consistency');
    expect(row.label).toBe('Share my consistency');
    expect(row.value || row.empty).toBe(
      'Your sessions this week, this month and your weeks in a row. Never your weight or food.',
    );
  });

  test('staple lifts show a COUNT, never the exercise ids themselves', () => {
    const row = bandRows(BANDS, ME).find((r) => r.key === 'staple_lifts');
    expect(row.value).toBe('2 lifts');
  });

  test('a band with nothing behind it yet falls back to NOT_ENOUGH_LINE', () => {
    const rows = bandRows({ sessions: 0 }, ME);
    for (const row of rows) {
      expect(row.value || row.empty || NOT_ENOUGH_LINE).toBeTruthy();
    }
    expect(rows.find((r) => r.key === 'sessions').value).toBe('');
  });

});

describe('toggling a band', () => {
  test('writes the local settings and forces the sync (the person just changed their mind)', async () => {
    const { tree } = await mount();
    const daysSwitch = switchFor(tree, 'Share days you usually train');

    await act(async () => { daysSwitch.props.onValueChange(true); });
    await flush();

    expect(writeShareSettings).toHaveBeenCalledWith('u1', expect.objectContaining({ days: true }));
    expect(syncTrainingProfile).toHaveBeenCalledWith('u1', { force: true });
  });

  test('an offline sync is not reported as a failure: it says it will share later', async () => {
    syncTrainingProfile.mockResolvedValueOnce({ sent: false, reason: 'offline', payload: null });
    const { tree } = await mount();
    const sessionsSwitch = switchFor(tree, 'Share sessions a week');

    await act(async () => { sessionsSwitch.props.onValueChange(false); });
    await flush();

    expect(mockToastShow).toHaveBeenCalledWith('Saved on this device. It will share when you are back online.');
  });

  test('the preview line reflects only the toggles switched on', async () => {
    const { tree } = await mount();
    expect(flattenText(tree.toJSON())).toContain(
      'tp_sessions_band|tp_staple_lifts|tp_experience_band',
    );
  });

  test('with nothing shared, the preview says so plainly', async () => {
    readShareSettings.mockResolvedValue({
      days: false, time_bands: false, sessions: false, staple_lifts: false, experience: false, age_band: false,
    });
    const { tree } = await mount();
    expect(flattenText(tree.toJSON())).toContain(NOTHING_SHARED_LINE);
  });

  // Spec 1.3: the preview includes the age band exactly when the toggle
  // is on and the person has one -- never for a minor, whose
  // `tp_age_band` the server never populates in the first place.
  test('the age band joins the preview when its toggle is on', async () => {
    readShareSettings.mockResolvedValue({ ...TP_DEFAULT_SHARE, age_band: true });
    useCommunityMe.mockReturnValue({
      me: { ...ME, tp_age_band: '35_44' },
      loading: false,
      error: null,
      refresh: jest.fn(() => Promise.resolve()),
    });
    const { tree } = await mount();
    expect(flattenText(tree.toJSON())).toContain('age:35_44');
  });

  test('the toggle off: no age band in the preview, even with one on the record', async () => {
    useCommunityMe.mockReturnValue({
      me: { ...ME, tp_age_band: '35_44' },
      loading: false,
      error: null,
      refresh: jest.fn(() => Promise.resolve()),
    });
    const { tree } = await mount();
    expect(flattenText(tree.toJSON())).not.toContain('age:35_44');
  });
});

describe('share what I did (phase 3 spec section 1)', () => {
  test('switching it on saves and publishes through publishSharingSettings, not syncTrainingProfile', async () => {
    const { tree } = await mount();
    const shareSwitch = switchFor(tree, 'Share share what i did');

    await act(async () => { shareSwitch.props.onValueChange(true); });
    await flush();

    expect(writeShareSettings).toHaveBeenCalledWith('u1', expect.objectContaining({ share_sessions: true }));
    expect(publishSharingSettings).toHaveBeenCalledWith(
      'u1', expect.objectContaining({ share_sessions: true }), { removeShared: false },
    );
  });

  test('switching it off asks once whether to remove what is already shared', async () => {
    readShareSettings.mockResolvedValue({ ...TP_DEFAULT_SHARE, share_sessions: true });
    const { tree } = await mount();
    const shareSwitch = switchFor(tree, 'Share share what i did');

    await act(async () => { shareSwitch.props.onValueChange(false); });
    await flush();

    expect(mockAppAlert).toHaveBeenCalledWith(
      'Remove the items already shared?',
      expect.any(String),
      expect.any(Array),
    );
    // Nothing saved yet -- only the confirm's own button press commits.
    expect(publishSharingSettings).not.toHaveBeenCalled();
  });

  test('"Keep" turns it off without removing anything', async () => {
    readShareSettings.mockResolvedValue({ ...TP_DEFAULT_SHARE, share_sessions: true });
    const { tree } = await mount();
    const shareSwitch = switchFor(tree, 'Share share what i did');
    await act(async () => { shareSwitch.props.onValueChange(false); });
    await flush();

    const [, , buttons] = mockAppAlert.mock.calls[0];
    await act(async () => { buttons.find((b) => b.text === 'Keep').onPress(); });
    await flush();

    expect(publishSharingSettings).toHaveBeenCalledWith(
      'u1', expect.objectContaining({ share_sessions: false }), { removeShared: false },
    );
  });

  test('"Remove" turns it off and sends _remove_shared', async () => {
    readShareSettings.mockResolvedValue({ ...TP_DEFAULT_SHARE, share_sessions: true });
    const { tree } = await mount();
    const shareSwitch = switchFor(tree, 'Share share what i did');
    await act(async () => { shareSwitch.props.onValueChange(false); });
    await flush();

    const [, , buttons] = mockAppAlert.mock.calls[0];
    await act(async () => { buttons.find((b) => b.text === 'Remove').onPress(); });
    await flush();

    expect(publishSharingSettings).toHaveBeenCalledWith(
      'u1', expect.objectContaining({ share_sessions: false }), { removeShared: true },
    );
  });

  test('the audience Chip row shows exactly three options, Followers selected by default', async () => {
    readShareSettings.mockResolvedValue({ ...TP_DEFAULT_SHARE, share_sessions: true });
    const { tree } = await mount();
    const chips = tree.root.findAll((n) => n.props?.accessibilityRole === 'radio' && 'selected' in n.props
      && ['Followers', 'My groups', 'Everyone'].includes(n.props.label));
    expect(chips.map((c) => c.props.label)).toEqual(['Followers', 'My groups', 'Everyone']);
    expect(chips.find((c) => c.props.label === 'Followers').props.selected).toBe(true);
  });

  test('picking an audience chip publishes the new choice', async () => {
    readShareSettings.mockResolvedValue({ ...TP_DEFAULT_SHARE, share_sessions: true });
    const { tree } = await mount();
    const everyone = tree.root.findAll((n) => n.props?.label === 'Everyone' && n.props?.onPress)[0];
    await act(async () => { everyone.props.onPress(); });
    await flush();

    expect(publishSharingSettings).toHaveBeenCalledWith(
      'u1', expect.objectContaining({ sessions_audience: 'everyone' }), { removeShared: false },
    );
  });

  test('the audience chips never render for a minor, even with sharing on', async () => {
    readShareSettings.mockResolvedValue({ ...TP_DEFAULT_SHARE, share_sessions: true });
    useCommunityMe.mockReturnValue({
      me: { ...ME, is_minor: true }, loading: false, error: null, refresh: jest.fn(() => Promise.resolve()),
    });
    const { tree } = await mount();
    expect(tree.root.findAll((n) => n.props?.label === 'Everyone' && n.props?.onPress)).toHaveLength(0);
    expect(flattenText(tree.toJSON())).toContain('Shared with people who follow you.');
  });
});

describe('a minor never sees the age band row (SD-32, exactly as Join filters it)', () => {
  test('the row is absent entirely, not merely disabled', async () => {
    useCommunityMe.mockReturnValue({
      me: { ...ME, is_minor: true, tp_age_band: null },
      loading: false,
      error: null,
      refresh: jest.fn(() => Promise.resolve()),
    });
    const { tree } = await mount();
    expect(flattenText(tree.toJSON())).not.toContain('Age band');
    expect(switchFor(tree, 'Share age band')).toBeUndefined();
  });

  test('an adult still sees the row', async () => {
    const { tree } = await mount();
    expect(flattenText(tree.toJSON())).toContain('Age band');
  });
});

describe('a minor and the partner section (SD-32, product review 2026-09-06 finding 2)', () => {
  test('renders no partner switch, only a calm line saying matching opens at 18', async () => {
    useCommunityMe.mockReturnValue({
      me: { ...ME, is_minor: true },
      loading: false,
      error: null,
      refresh: jest.fn(() => Promise.resolve()),
    });
    const { tree } = await mount();

    expect(switchFor(tree, 'Open to training together')).toBeUndefined();
    expect(flattenText(tree.toJSON())).toContain('Training partner matching opens at 18.');
  });
});

describe('rules_outdated on a training-profile save (product review 2026-09-06 finding 4)', () => {
  test('a band toggle reverts and sends the person to accept the rules, never "saved on this device"', async () => {
    syncTrainingProfile.mockResolvedValueOnce({ sent: false, reason: 'rules_outdated', payload: null });
    const { tree, navigation } = await mount();
    const daysSwitch = switchFor(tree, 'Share days you usually train');

    await act(async () => { daysSwitch.props.onValueChange(true); });
    await flush();

    expect(navigation.navigate).toHaveBeenCalledWith('CommunityRules', { mustAccept: true });
    expect(mockToastShow).not.toHaveBeenCalledWith('Saved on this device. It will share when you are back online.');
    expect(switchFor(tree, 'Share days you usually train').props.value).toBe(false);
  });

  test('a partner-section change reverts the switch and sends the person to accept the rules', async () => {
    setPartner.mockRejectedValueOnce({ code: 'rules_outdated' });
    const { tree, navigation } = await mount();
    const partnerSwitch = switchFor(tree, 'Open to training together');

    await act(async () => { partnerSwitch.props.onValueChange(true); });
    await flush();

    expect(navigation.navigate).toHaveBeenCalledWith('CommunityRules', { mustAccept: true });
    expect(switchFor(tree, 'Open to training together').props.value).toBe(false);
    expect(mockToastShow).not.toHaveBeenCalledWith('Could not save that just now.', { variant: 'error' });
  });

  test('any other partner-save error reverts the switch and shows the existing toast', async () => {
    setPartner.mockRejectedValueOnce({ code: 'offline' });
    const { tree } = await mount();
    const partnerSwitch = switchFor(tree, 'Open to training together');

    await act(async () => { partnerSwitch.props.onValueChange(true); });
    await flush();

    expect(switchFor(tree, 'Open to training together').props.value).toBe(false);
    expect(mockToastShow).toHaveBeenCalledWith('Could not save that just now.', { variant: 'error' });
  });
});

describe('open to training together (SD-25)', () => {
  test('switching it on sends the flag with whatever preferences are already chosen', async () => {
    const { tree } = await mount();
    const partnerSwitch = switchFor(tree, 'Open to training together');

    await act(async () => { partnerSwitch.props.onValueChange(true); });
    await flush();

    expect(setPartner).toHaveBeenCalledWith(true, { days: [], time_bands: [], same_gym_only: false });
  });

  test('switching it off still carries the preferences the person had chosen (the library nulls them)', async () => {
    // The screen sends the state as it stands; nulling the preferences
    // when `open` is false is `setPartner`'s own job (`connections.js`:
    // `_prefs: open ? cleanPartnerPrefs(prefs) : null`), so this pins
    // only what the SCREEN is responsible for: passing `open` correctly.
    useCommunityMe.mockReturnValue({
      me: { ...ME, open_to_partner: true, partner_prefs: { days: ['mon'], time_bands: ['evening'], same_gym_only: true } },
      loading: false,
      error: null,
      refresh: jest.fn(() => Promise.resolve()),
    });
    const { tree } = await mount();
    const partnerSwitch = switchFor(tree, 'Open to training together');

    await act(async () => { partnerSwitch.props.onValueChange(false); });
    await flush();

    expect(setPartner).toHaveBeenCalledWith(
      false,
      { days: ['mon'], time_bands: ['evening'], same_gym_only: true },
    );
  });
});
