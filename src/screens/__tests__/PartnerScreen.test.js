/**
 * PartnerScreen (Step B rebuild) — the premium partner destination.
 * DESIGN-SPEC B2-B7. usePartners is mocked so each state shape is driven
 * directly; the moments module is mocked (virtual) so the parallel C3
 * dependency can never break this suite.
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
jest.mock('../../lib/partners/moments', () => ({
  getVisibleMoments: (...a) => mockGetVisibleMoments(...a),
  markMomentSeen: (...a) => mockMarkMomentSeen(...a),
}), { virtual: true });

import PartnerScreen from '../PartnerScreen';

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

  test('an available cheer sends for that pair', async () => {
    const hook = base({ pairs: [pair({ cheerEnabled: true })] });
    mockHook.value = hook;
    const tree = await mount();
    await press(tree, 'Send a cheer');
    expect(hook.cheer).toHaveBeenCalledWith('p1', expect.any(Boolean));
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
});

describe('empty state', () => {
  test('carries the exact two sentences and the primary + secondary actions', async () => {
    mockHook.value = base({ pairs: [], pendingInvite: null });
    const text = allText(await mount());
    expect(text).toContain('Train with a partner');
    expect(text).toContain(
      'Training sticks better when someone you trust is in it with you. One partner, one calm weekly signal each way.',
    );
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
