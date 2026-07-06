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
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
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
    cheerEnabled: true, lastReceived: null, sharedBlock: null, winCards: [], pairedAt: 1,
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
    shareWin: jest.fn(async () => ({ ok: true })),
    revokeWin: jest.fn(async () => ({ ok: true })),
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

async function mount(routeParams = {}) {
  let tree;
  await act(async () => { tree = create(<PartnerScreen route={{ params: routeParams }} />); });
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

describe('load error state', () => {
  test('renders a retry surface instead of the empty invite pitch', async () => {
    const reload = jest.fn();
    mockHook.value = base({ error: true, reload });
    const tree = await mount();
    const text = allText(tree).join(' ');
    expect(text).toContain("Couldn't load partners");
    expect(text).toContain('Check your connection and try again.');
    expect(text).not.toContain('Train with a partner');
    await press(tree, 'Try again');
    expect(reload).toHaveBeenCalledTimes(1);
  });
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

  test('active pairs show a support snapshot with shared and private boundaries', async () => {
    mockHook.value = base({ pairs: [pair({ sharedBlock: { status: 'active', blockName: 'Upper Lower' } })] });
    const text = allText(await mount()).join(' ');
    expect(text).toContain('What Sam can see');
    expect(text).toContain('Shared');
    expect(text).toContain('Weekly training against your own plan');
    expect(text).toContain('Your chosen weekly aim');
    expect(text).toContain('One fixed acknowledgement a day');
    expect(text).toContain('Shared block name');
    expect(text).toContain('Private');
    expect(text).toContain('Weights, sets and reps');
    expect(text).toContain('Food diary and coach notes');
    expect(text).toContain('Body metrics and progress photos');
    expect(text).toContain('Current week: you against your own plan: 2 of 4. Sam against their own plan: 3 of 4. No score table.');
    expect(text).toContain('Training the same block');
    expect(text).toContain('Upper Lower is shared by name only. Workouts, loading and notes stay private.');
    expect(text).toContain('Manage block');
  });

  test('active pairs show a compact support plan with the next safe action', async () => {
    mockHook.value = base({ pairs: [pair({ myAim: 0, partnerAim: 3 })] });
    const tree = await mount();
    const text = allText(tree).join(' ');
    expect(text).toContain('This week together');
    expect(text).toContain('Set how many sessions you plan to do this week. Your partner sees the number, not your workout details.');
    expect(text).toContain('Choose your own session aim for the week.');
    expect(text).toContain('Your week row reads 2 of 4 against your own plan.');
    expect(text).toContain('Your partner sees weekly training status and optional cards only. Food, coach notes, body metrics and photos stay private.');
    await press(tree, 'Set your weekly aim', 1);
    expect(allText(tree)).toContain('Your aim for the week');
  });

  test('active pairs show consent-gated shareable wins without widening partner privacy', async () => {
    mockHook.value = base({ pairs: [pair()] });
    const tree = await mount();
    let text = allText(tree).join(' ');
    expect(text).toContain('Share wins');
    expect(text).toContain('Ask each time. Review one card, then send it to Sam only. No feed.');
    expect(text).toContain('No feed.');

    await press(tree, 'Review shareable wins');
    text = allText(tree).join(' ');
    expect(text).toContain('Shareable wins');
    expect(text).toContain('Partner wins are off by default.');
    expect(text).toContain('Default: Ask every time.');
    expect(text).toContain('Review the exact card first, then send it to Sam only.');
    expect(text).toContain('Preview only');
    expect(text).toContain('Workout complete');
    expect(text).toContain('Upper body session completed on chosen date.');
    expect(text).toContain('Partner sees');
    expect(text).toContain('Workout name, date and completed status.');
    expect(text).toContain('Stays private');
    expect(text).toContain('Exercises, sets, reps, loads, notes and effort stay private unless that card asks again.');
    expect(text).toContain('Not sent until you choose one partner and approve this exact card.');
    expect(text).toContain('Review before sending');
    expect(text).toContain('Choose the moment');
    expect(text).toContain('Pick one workout, record, block milestone or exported progress card.');
    expect(text).toContain('Preview exact card');
    expect(text).toContain('Confirm one partner');
    expect(text).toContain('Keep control');
    expect(text).toContain('Send controls show the partner name, card type and exact card copy on one screen.');
    expect(text).toContain('Hard boundaries');
    expect(text).toContain('Ask every time before a card is sent.');
    expect(text).toContain('One card, one moment, one partner.');
    expect(text).toContain('A sent card can be deleted by the sender.');
    expect(text).toContain('Eligible cards');
    await press(tree, 'Preview personal record');
    text = allText(tree).join(' ');
    expect(text).toContain('Bench press: New rep best.');
    expect(text).toContain('The lift name and the record you choose to celebrate.');
    expect(text).toContain('Your wider lift history and other records stay private.');
    expect(text).toContain('Workout summary');
    expect(text).toContain('Personal record');
    expect(text).toContain('Block milestone');
    expect(text).toContain('Progress card');
    expect(text).toContain('No passive feed, leaderboard, workout history browsing, food diary, coach notes, body metrics or automatic photo sharing.');
  });

  test('sends the selected win card to the current partner only', async () => {
    const hook = base({ pairs: [pair()] });
    mockHook.value = hook;
    const tree = await mount();
    await press(tree, 'Review shareable wins');
    await press(tree, 'Send workout complete to Sam');
    expect(hook.shareWin).toHaveBeenCalledWith('p1', expect.objectContaining({ type: 'workout_summary' }));
  });

  test('renders sent win cards with sender delete control', async () => {
    const hook = base({
      pairs: [pair({
        winCards: [{
          id: 'win1',
          senderId: 'u1',
          cardType: 'personal_record',
          title: 'Personal record',
          summary: 'Bench press: New rep best.',
          detail: 'Only this chosen record is shared. Wider lift history stays private.',
          createdAt: Date.UTC(2026, 6, 6),
        }],
      })],
    });
    mockHook.value = hook;
    const tree = await mount();
    expect(allText(tree)).toContain('Shared wins');
    expect(allText(tree)).toContain('Bench press: New rep best.');
    await press(tree, 'Delete shared win Personal record');
    expect(hook.revokeWin).toHaveBeenCalledWith('win1');
  });

  test('progress-card share preview can use a sanitized exported-card payload', async () => {
    mockHook.value = base({ pairs: [pair()] });
    const tree = await mount({
      shareWinType: 'progress_card',
      progressCardSharePayload: {
        label: 'Progress photo card',
        dateRange: '5 Jan to 20 Jun',
        format: 'Square',
        includesWeight: false,
        includesScanScore: true,
        imageUri: 'file:///private-card.png',
      },
    });
    await press(tree, 'Review shareable wins');
    const text = allText(tree).join(' ');
    expect(text).toContain('Progress card');
    expect(text).toContain('Progress photo card, 5 Jan to 20 Jun.');
    expect(text).toContain('The visible scan score is part of that export.');
    expect(text).toContain('Weight is off for this export.');
    expect(text).toContain('Raw photos, body metrics and the photo library stay private.');
    expect(text).toContain('The composed progress card image, with only the details shown in its export receipt.');
    expect(text).toContain('Raw photos, the photo library, unexported scan details and body metrics stay private.');
    expect(text).not.toContain('file:///private-card.png');
  });

  test('incoming progress-card route opens the share preview directly', async () => {
    mockHook.value = base({ pairs: [pair()] });
    const tree = await mount({
      shareWinType: 'progress_card',
      progressCardSharePayload: {
        label: 'Progress Photos card',
        dateRange: '5 Jan 2026 to 20 Jun 2026',
        format: 'Square',
        includesWeight: false,
        includesScanScore: true,
      },
    });
    const text = allText(tree).join(' ');
    expect(text).toContain('Shareable wins');
    expect(text).toContain('Progress Photos card, 5 Jan 2026 to 20 Jun 2026.');
    expect(text).toContain('The visible scan score is part of that export.');
    expect(text).toContain('Weight is off for this export.');
  });

  test('incoming workout-summary route opens a narrow partner preview', async () => {
    mockHook.value = base({ pairs: [pair()] });
    const tree = await mount({
      shareWinType: 'workout_summary',
      shareWinPayload: {
        workoutName: 'Upper body strength',
        completedAt: '6 Jul 2026',
        sets: 18,
      },
    });
    const text = allText(tree).join(' ');
    expect(text).toContain('Shareable wins');
    expect(text).toContain('Upper body strength completed on 6 Jul 2026.');
    expect(text).toContain('Exercises, sets, reps, loads, notes and effort stay private.');
    expect(text).not.toContain('18');
  });

  test('incoming PR route opens a narrow partner preview', async () => {
    mockHook.value = base({ pairs: [pair()] });
    const tree = await mount({
      shareWinType: 'personal_record',
      shareWinPayload: {
        liftName: 'Incline press',
        recordLabel: 'New rep best',
        reps: 10,
        load: 40,
      },
    });
    const text = allText(tree).join(' ');
    expect(text).toContain('Incline press: New rep best.');
    expect(text).toContain('Only this chosen record is shared. Wider lift history stays private.');
    expect(text).not.toContain('40');
    expect(text).not.toContain('10');
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

  test('a failed acknowledgement does not consume the visible moment', async () => {
    mockGetVisibleMoments.mockResolvedValue([
      { id: 'm1', pairId: 'p1', kind: 'streak_week_kept', line: 'Another week you both showed up.', atMs: Date.now() },
    ]);
    const hook = base({
      pairs: [pair({ cheerEnabled: true })],
      cheer: jest.fn(async () => ({ ok: false, error: 'offline' })),
    });
    mockHook.value = hook;
    const tree = await mount();
    await press(tree, 'Send a cheer');
    await press(tree, 'Here with you.');
    expect(hook.cheer).toHaveBeenCalledWith('p1', 'here', expect.any(Boolean));
    expect(mockMarkMomentSeen).not.toHaveBeenCalled();
    expect(allText(tree)).toContain('Another week you both showed up.');
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
    expect(allText(tree)).toContain('Share the same invite again if they missed it. It still only pairs one person.');
    expect(findPress(tree, 'Share invite again').length).toBeGreaterThan(0);
    expect(findPress(tree, 'Check partner connection').length).toBeGreaterThan(0);
    expect(findPress(tree, 'Cancel invitation').length).toBeGreaterThan(0);
  });

  test('can manually refresh a pending connection after the other person accepts', async () => {
    const hook = base({ pairs: [], pendingInvite: { id: 'pend1', status: 'invited' } });
    mockHook.value = hook;
    const tree = await mount();
    await press(tree, 'Check partner connection');
    expect(hook.reload).toHaveBeenCalledTimes(1);
  });

  test('can share the same pending invite again without minting a second path', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const hook = base({ pairs: [], pendingInvite: { id: 'pend1', status: 'invited' } });
    mockHook.value = hook;
    const tree = await mount();
    await press(tree, 'Share invite again');
    expect(hook.invite).toHaveBeenCalledTimes(1);
    expect(Share.share).toHaveBeenCalledWith({ message: 'join me' });
    Share.share.mockRestore();
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

  test('manual code entry accepts a pasted Volyume invite link', async () => {
    const hook = base({ pairs: [], pendingInvite: null });
    mockHook.value = hook;
    const tree = await mount();
    await press(tree, 'I have a code');
    const field = tree.root.findAll((n) => n.props.accessibilityLabel === 'Invite code')[0];
    await act(async () => { field.props.onChangeText('https://volyume.app/partner/abcd1234?ref=sms'); });
    await press(tree, 'Join with code');
    expect(hook.redeem).toHaveBeenCalledWith('ABCD1234');
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
