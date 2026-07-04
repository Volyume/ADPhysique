/**
 * PartnerScreen (Step B rebuild) — the premium partner destination.
 * DESIGN-SPEC B2-B7. usePartners is mocked so each state shape is driven
 * directly; the moments module is mocked so this suite never depends on the
 * real C3 module's behaviour.
 *
 * Pins:
 *  - multiple active pairs render as isolated cards, in paired-at order;
 *  - free tier never shows the "invite another" affordance (cap = 1);
 *  - the empty state carries the exact two sentences + the full privacy
 *    receipt (both columns, exact copy, incl. the first-name line);
 *  - the invite journey mints exactly ONE code and every channel reuses it;
 *  - the block-confirm wires the real block + unpair primitives with the
 *    exact spec copy;
 *  - the milestone-moment slot renders from the mocked module;
 *  - the cheer disables and reads "Sent today" once spent.
 */
import { Linking, Share } from 'react-native';
import { create, act } from 'react-test-renderer';

const mockState = { user: { id: 'u1' }, tier: 'pro', accessibility: { reduceMotion: true } };
jest.mock('../../store/useAppStore', () => {
  const useAppStore = (sel) => (sel ? sel(mockState) : mockState);
  useAppStore.getState = () => mockState;
  return { __esModule: true, default: useAppStore };
});

const mockHook = { value: null };
jest.mock('../../hooks/usePartners', () => ({ __esModule: true, default: () => mockHook.value }));

jest.mock('../../components/Toast', () => ({
  __esModule: true,
  useToast: () => ({ show: jest.fn(), hide: jest.fn() }),
}));

const mockAlertCalls = [];
jest.mock('../../components/AppAlert', () => ({
  appAlert: (title, message, buttons) => { mockAlertCalls.push({ title, message, buttons }); },
}));

jest.mock('../../lib/partners/telemetry', () => ({
  trackPartnerSurfaceView: jest.fn(),
  trackInviteJourneyStep: jest.fn(),
}));

const mockGetVisibleMoments = jest.fn(async () => []);
const mockMarkMomentSeen = jest.fn(async () => {});
// NOTE: no { virtual: true }. src/lib/partners/moments.js now resolves (C3
// landed it), and a virtual mock on a RESOLVABLE module poisons Jest's
// worker-level resolver cache under --runInBand: once an earlier suite
// (screen-mount, which requires every screen) resolves the real module, this
// virtual marker no longer intercepts and PartnerScreen loads the real module
// (getVisibleMoments -> []), so the moment never renders. A plain mock is
// order-independent. See src/__tests__/screen-mount.test.js lines 32-42.
jest.mock('../../lib/partners/moments', () => ({
  getVisibleMoments: (...a) => mockGetVisibleMoments(...a),
  markMomentSeen: (...a) => mockMarkMomentSeen(...a),
}));

import PartnerScreen from '../PartnerScreen';
import { PARTNER_PRIVACY_NOTICE_VERSION } from '../../lib/partners/consent';

function pair(overrides = {}) {
  return {
    id: 'p1', partnerFirstName: 'Sam', partnerId: 'sam-id',
    rowState: 'active', myWeek: { done: 2, planned: 4 },
    partnerWeek: { done: 3, planned: 4, weekMet: false },
    sharedStreak: { run: 5, status: 'counting' },
    cheerEnabled: true, lastReceived: null, sharedBlock: null, pairedAt: 1,
    ...overrides,
  };
}

function base(overrides = {}) {
  return {
    loading: false, pairs: [], pendingInvite: null, canAdd: true,
    partnership: null, rowState: 'empty', partnerWeek: null, myWeek: null,
    sharedStreak: null, cheerEnabled: false, lastReceived: null, sharedBlock: null,
    invite: jest.fn(async () => ({ ok: true, data: { code: 'ABCD1234', shareMessage: 'join me' } })),
    redeem: jest.fn(async () => ({ ok: true })),
    cheer: jest.fn(async () => ({ ok: true })),
    unpair: jest.fn(async () => ({ ok: true })),
    block: jest.fn(async () => ({ ok: true })),
    proposeBlock: jest.fn(), adoptBlock: jest.fn(), leaveBlock: jest.fn(),
    setIntention: jest.fn(async () => ({ ok: true })),
    reload: jest.fn(),
    ...overrides,
  };
}

function allText(tree) {
  return tree.root.findAll((n) => n.type === 'Text')
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : n.props.children))
    .filter((c) => typeof c === 'string');
}

function findPress(tree, label) {
  return tree.root.findAll(
    (n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  );
}

async function mount() {
  let tree;
  await act(async () => { tree = create(<PartnerScreen route={{ params: {} }} />); });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  return tree;
}

async function press(tree, label, i = 0) {
  const node = findPress(tree, label)[i];
  await act(async () => { node.props.onPress(); await Promise.resolve(); });
}

beforeEach(() => {
  mockState.tier = 'pro';
  mockAlertCalls.length = 0;
  mockGetVisibleMoments.mockReset().mockResolvedValue([]);
  mockMarkMomentSeen.mockReset().mockResolvedValue();
});

describe('connected state: isolated pair cards', () => {
  test('multiple active pairs render as separate cards in the given (paired-at) order', async () => {
    mockHook.value = base({
      pairs: [
        pair({ id: 'p1', partnerFirstName: 'Sam', pairedAt: 1 }),
        pair({ id: 'p2', partnerFirstName: 'Alex', partnerId: 'alex-id', pairedAt: 2, sharedStreak: { run: 2, status: 'counting' } }),
      ],
    });
    const tree = await mount();
    const text = allText(tree).join(' ');
    // Two isolated cards, each with its own manage affordance.
    expect(findPress(tree, 'Manage partnership with Sam').length).toBeGreaterThan(0);
    expect(findPress(tree, 'Manage partnership with Alex').length).toBeGreaterThan(0);
    // Order preserved (never reordered by streak/performance).
    expect(text.indexOf('Sam')).toBeLessThan(text.indexOf('Alex'));
    // Each card owns its own week lines; resting/counting never a fail word.
    expect(text).toContain('You: 2 of 4 this week');
    expect(text).not.toMatch(/missed|fail|broke/i);
  });

  test('pro under the cap offers "Invite another partner"', async () => {
    mockHook.value = base({ pairs: [pair()] });
    const tree = await mount();
    expect(allText(tree)).toContain('Invite another partner');
  });

  test('free tier renders at most one card and no invite-another affordance', async () => {
    mockState.tier = 'free';
    mockHook.value = base({ pairs: [pair()], canAdd: false });
    const tree = await mount();
    expect(findPress(tree, 'Manage partnership with Sam').length).toBeGreaterThan(0);
    expect(allText(tree)).not.toContain('Invite another partner');
  });

  test('a resting partner reads "resting this week", never a fail word', async () => {
    mockHook.value = base({ pairs: [pair({ rowState: 'resting', partnerWeek: { state: 'resting' } })] });
    const text = allText(await mount());
    expect(text).toContain('Sam: resting this week');
    expect(text.join(' ')).not.toMatch(/missed|fail|broke/i);
  });
});

describe('cheer affordance', () => {
  test('a spent cheer disables and reads "Sent today"', async () => {
    mockHook.value = base({ pairs: [pair({ cheerEnabled: false })] });
    const tree = await mount();
    expect(allText(tree)).toContain('Sent today');
    const btn = findPress(tree, 'Cheer sent today')[0];
    expect(btn.props.disabled).toBe(true);
  });

  test('an available cheer opens the acknowledgement picker and sends the chosen line', async () => {
    // D5-B1: the cheer is no longer wordless. Tapping "Send a cheer" opens the
    // fixed picker; picking a line sends the cheer WITH that acknowledgement kind
    // (never free text).
    const hook = base({ pairs: [pair({ cheerEnabled: true })] });
    mockHook.value = hook;
    const tree = await mount();
    await press(tree, 'Send a cheer');
    // The four fixed acknowledgements are offered.
    expect(allText(tree)).toContain('Here with you.');
    await press(tree, 'Here with you.');
    expect(hook.cheer).toHaveBeenCalledWith('p1', 'here', expect.any(Boolean));
  });
});

describe('milestone moment slot', () => {
  test('renders the moment line from the mocked moments module', async () => {
    mockGetVisibleMoments.mockResolvedValue([
      { id: 'm1', pairId: 'p1', kind: 'streak_week_kept', line: 'Another week you both showed up.', atMs: Date.now() },
    ]);
    mockHook.value = base({ pairs: [pair()] });
    const tree = await mount();
    expect(allText(tree)).toContain('Another week you both showed up.');
    // The moment card carries its own cheer affordance.
    expect(findPress(tree, 'Send a cheer').length).toBeGreaterThan(0);
  });

  test('a moment replaces the standing cheer row rather than adding a second', async () => {
    // No moment: the standing cheer row is the pair's single cheer surface.
    mockGetVisibleMoments.mockResolvedValue([]);
    mockHook.value = base({ pairs: [pair({ cheerEnabled: true })] });
    const withoutMoment = findPress(await mount(), 'Send a cheer').length;

    // With a moment: the moment IS that day's cheer surface, so the standing
    // row is hidden and the pair still shows exactly one cheer affordance, not
    // a duplicated pair. (findPress counts each touchable more than once, so we
    // compare the two mounts rather than pin an absolute number.)
    mockGetVisibleMoments.mockResolvedValue([
      { id: 'm1', pairId: 'p1', kind: 'streak_week_kept', line: 'Another week you both showed up.', atMs: Date.now() },
    ]);
    mockHook.value = base({ pairs: [pair({ cheerEnabled: true })] });
    const withMoment = findPress(await mount(), 'Send a cheer').length;

    expect(withoutMoment).toBeGreaterThan(0);
    expect(withMoment).toBe(withoutMoment);
  });
});

describe('empty state', () => {
  test('carries the plain-English pitch, the how-it-works explainer, and the primary + secondary actions', async () => {
    mockHook.value = base({ pairs: [], pendingInvite: null });
    const text = allText(await mount());
    expect(text).toContain('Train with a partner');
    expect(text).toContain(
      'Pair up with one person you already train with. It is quiet accountability: someone you trust who knows whether you showed up.',
    );
    // The plain-English "how it works" explainer (founder call 2026-07-03: the
    // old pitch never said what the feature was or what a "signal" meant).
    expect(text).toContain('HOW IT WORKS');
    expect(text).toContain('Once a week, you each see whether the other trained, and nothing else.');
    expect(text).toContain('No feed, no followers, no numbers to compare.');
    // The word "signal" is gone from the pitch.
    expect(text).not.toContain('signal');
    expect(text).toContain('Invite someone you train with');
    expect(text).toContain('I have a code');
  });

  test('renders the privacy receipt with the exact copy of both columns', async () => {
    mockHook.value = base({ pairs: [] });
    const text = allText(await mount());
    expect(text).toContain('What crosses, and what never does');
    expect(text).toContain('THEY WILL SEE');
    expect(text).toContain('THEY NEVER SEE');
    // Left column (crosses), first line is the newly added first-name line.
    for (const line of [
      'Your first name',
      'Whether you trained this week, against your own plan',
      'Your shared streak, counted in weeks',
      'A resting week, shown simply as resting',
      'One cheer a day, if you send it',
      'The name of a block you choose to share',
    ]) expect(text).toContain(line);
    // Right column (never).
    for (const line of [
      'Your weights, sets or reps',
      'Your body weight or measurements',
      'Your food or diary',
      'Anything you tell the coach',
      'Your location',
    ]) expect(text).toContain(line);
    expect(text).toContain('Either of you can end this at any time. Everything shared is deleted.');
  });
});

describe('pending state', () => {
  test('shows the waiting card with a cancel affordance', async () => {
    mockHook.value = base({ pairs: [], pendingInvite: { id: 'pend1', status: 'invited' } });
    const tree = await mount();
    expect(allText(tree)).toContain('Invitation sent. Waiting for your partner.');
    expect(findPress(tree, 'Cancel invitation').length).toBeGreaterThan(0);
  });
});

describe('invite journey', () => {
  test('mints exactly one code across the three beats and every channel reuses it', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    jest.spyOn(Linking, 'openURL').mockResolvedValue();
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const hook = base({ pairs: [] });
    mockHook.value = hook;
    const tree = await mount();

    await press(tree, 'Invite someone you train with');
    await press(tree, 'Continue');
    await press(tree, 'Agree and get my code');
    // One mint on agree.
    expect(hook.invite).toHaveBeenCalledTimes(1);
    // Beat 3 shows the single minted code.
    expect(allText(tree)).toContain('ABCD1234');

    // A channel share reuses the minted code — it does not mint again.
    await press(tree, 'Send by Text');
    expect(hook.invite).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('join%20me'));

    Linking.canOpenURL.mockRestore();
    Linking.openURL.mockRestore();
    Share.share.mockRestore();
  });

  test('beat 2 pins the notice version derived from the consent constant', async () => {
    mockHook.value = base({ pairs: [] });
    const tree = await mount();
    await press(tree, 'Invite someone you train with');
    await press(tree, 'Continue');
    expect(allText(tree)).toContain(
      `Pairing means you both agree to share this, and only this. Notice v${PARTNER_PRIVACY_NOTICE_VERSION}.`,
    );
  });
});

describe('manage sheet: block confirm', () => {
  test('block wires the real block + unpair primitives with the exact copy', async () => {
    const hook = base({ pairs: [pair({ partnerFirstName: 'Sam', partnerId: 'sam-id' })] });
    mockHook.value = hook;
    const tree = await mount();

    await press(tree, 'Manage partnership with Sam');
    await press(tree, 'Block Sam');

    const call = mockAlertCalls.find((c) => c.title === 'Block Sam');
    expect(call).toBeTruthy();
    expect(call.message).toBe(
      'This ends the partnership, deletes everything you shared, and stops them pairing with you again. They will not be told.',
    );
    const blockBtn = call.buttons.find((b) => b.style === 'destructive');
    expect(blockBtn.text).toBe('Block');
    await act(async () => { await blockBtn.onPress(); await Promise.resolve(); });
    expect(hook.block).toHaveBeenCalledWith('sam-id');
    expect(hook.unpair).toHaveBeenCalledWith('p1');
  });
});
