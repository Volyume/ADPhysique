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
import fs from 'fs';
import path from 'path';
import { Linking, Share } from 'react-native';
import { create, act } from 'react-test-renderer';

const PARTNER_SCREEN_SOURCE = fs.readFileSync(path.resolve(__dirname, '../PartnerScreen.js'), 'utf8');

const mockToastShow = jest.fn();

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
  useToast: () => ({ show: mockToastShow, hide: jest.fn() }),
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
  mockToastShow.mockClear();
  mockGetVisibleMoments.mockReset().mockResolvedValue([]);
  mockMarkMomentSeen.mockReset().mockResolvedValue();
});

describe('load error state', () => {
  test('renders a soft local-read notice without hiding the normal empty path', async () => {
    const reload = jest.fn();
    mockHook.value = base({ localReadIssue: true, reload });
    const tree = await mount();
    const text = allText(tree).join(' ');
    expect(text).toContain('Refreshing partner data');
    expect(text).toContain('Your partner space is safe.');
    expect(text).toContain('Train with a partner');
    await press(tree, 'Refresh partner data');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  test('renders a retry surface instead of the empty invite pitch', async () => {
    const reload = jest.fn();
    mockHook.value = base({ error: true, reload });
    const tree = await mount();
    const text = allText(tree).join(' ');
    expect(text).toContain('Partners needs a refresh');
    expect(text).toContain('Volyume could not read your partner space on this device.');
    expect(text).not.toContain('Train with a partner');
    await press(tree, 'Refresh Partners');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  test('retry uses the cloud-refresh path when the hook exposes it', async () => {
    const reload = jest.fn();
    const refresh = jest.fn(async () => ({ ok: true }));
    mockHook.value = base({ error: true, reload, refresh });
    const tree = await mount();
    await press(tree, 'Refresh Partners');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
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
    expect(text).toContain('Shared with Sam');
    expect(text).toContain('Private accountability with one person.');
    expect(text).toContain('Shared');
    expect(text).toContain('Weekly training status');
    expect(text).toContain('Weekly sessions you set');
    expect(text).toContain('One fixed cheer a day');
    expect(text).toContain('Block label you approve');
    expect(text).toContain('Private');
    expect(text).toContain('Full workouts and lift numbers');
    expect(text).toContain('Food, Coach and check-ins');
    expect(text).toContain('Body metrics and progress photos');
    expect(text).not.toContain('This week: you 2 of 4. Sam 3 of 4. No weights, food, photos or Coach notes are shared.');
    expect(text).toContain('Shared block label');
    expect(text).toContain('Upper Lower is shared as a label only. Workouts, exercises, loads, notes and Coach changes stay private.');
    expect(text).toContain('Manage label');
  });

  test('active pairs show weekly sessions with the next safe action', async () => {
    mockHook.value = base({ pairs: [pair({ myAim: 0, partnerAim: 3 })] });
    const tree = await mount();
    const text = allText(tree).join(' ');
    expect(text).toContain('Weekly sessions');
    expect(text).toContain('Optional: share your rough training rhythm for this week. It does not assign workouts, change Coach, or judge the week.');
    expect(text).toContain('Sam set weekly sessions too.');
    expect(text).not.toContain('Choose a realistic number. Sam sees the number only.');
    expect(text).not.toContain('This week with Sam');
    expect(text).not.toContain('You have logged 2 of 4.');
    await press(tree, "Set this week's sessions");
    expect(allText(tree)).toContain('Weekly sessions');
    expect(findPress(tree, 'Decrease sessions').length).toBeGreaterThan(0);
    expect(findPress(tree, 'Increase sessions').length).toBeGreaterThan(0);
  });

  test('active pairs show consent-gated shareable wins without widening partner privacy', async () => {
    mockHook.value = base({ pairs: [pair()] });
    const tree = await mount();
    let text = allText(tree).join(' ');
    expect(text).toContain('Share a win');
    expect(text).toContain('Choose one workout, PR or progress update for Sam. You approve the exact preview first.');

    await press(tree, 'Share a win');
    text = allText(tree).join(' ');
    expect(tree.root.findAll((n) => n.props?.keyboardShouldPersistTaps === 'handled').length).toBeGreaterThan(0);
    expect(text).toContain('Share a win');
    expect(text).toContain('Pick one update. You approve the preview before Sam sees it.');
    expect(text).toContain('Preview only');
    expect(text).toContain('Workout complete');
    expect(text).toContain('Upper body session completed on chosen date.');
    expect(text).toContain('Sam sees');
    expect(text).toContain('Workout name, date and completed status.');
    expect(text).toContain('Show what stays private');
    expect(text).not.toContain('Stays private');
    expect(text).not.toContain('No passive feed, leaderboard, workout history browsing, food diary, coach notes, body metrics or automatic photo sharing.');
    await press(tree, 'Show what stays private');
    text = allText(tree).join(' ');
    expect(text).toContain('Stays private');
    expect(text).toContain('Exercises, sets, reps, loads, notes and effort stay private unless that card asks again.');
    expect(text).toContain('Not sent until you choose one partner and approve this exact card.');
    expect(text).toContain('No passive feed, leaderboard, workout history browsing, food diary, coach notes, body metrics or automatic photo sharing.');
    await press(tree, 'Preview personal record');
    text = allText(tree).join(' ');
    expect(text).toContain('Bench press: New rep best.');
    expect(text).toContain('The lift name and the record you choose to celebrate.');
    expect(text).toContain('Your wider lift history and other records stay private.');
    expect(text).toContain('Workout complete');
    expect(text).toContain('Personal record');
    expect(text).toContain('Block milestone');
    expect(text).toContain('Progress card');
    expect(text).toContain('No passive feed, leaderboard, workout history browsing, food diary, coach notes, body metrics or automatic photo sharing.');
  });

  test('sends the selected win card to the current partner only', async () => {
    const hook = base({ pairs: [pair()] });
    mockHook.value = hook;
    const tree = await mount();
    await press(tree, 'Share a win');
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
    await press(tree, 'Share a win');
    const text = allText(tree).join(' ');
    expect(text).toContain('Progress card');
    expect(text).toContain('Progress photo card, 5 Jan to 20 Jun.');
    expect(text).toContain('The visible scan index is part of that export.');
    expect(text).toContain('Weight is off for this export.');
    expect(text).toContain('Raw photos, body metrics and the photo library stay private.');
    expect(text).toContain('The composed progress card image, with only the details shown in its export receipt.');
    await press(tree, 'Show what stays private');
    const expandedText = allText(tree).join(' ');
    expect(expandedText).toContain('Stays private');
    expect(expandedText).toContain('Raw photos, the photo library, unexported scan details and body metrics stay private.');
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
    expect(text).toContain('Share a win');
    expect(text).toContain('Progress Photos card, 5 Jan 2026 to 20 Jun 2026.');
    expect(text).toContain('The visible scan index is part of that export.');
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
    expect(text).toContain('Share a win');
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

  test('incoming share route with no partner explains that nothing was sent', async () => {
    mockHook.value = base({ pairs: [], pendingInvite: null });
    const tree = await mount({
      shareWinType: 'workout_summary',
      shareWinPayload: {
        workoutName: 'Upper body strength',
        completedAt: '6 Jul 2026',
      },
    });
    const text = allText(tree).join(' ');
    expect(text).toContain('Add a partner to share this');
    expect(text).toContain('Nothing has been sent. Partner sharing starts after you pair with one person you already know and trust.');
    expect(text).toContain('Your card stays private');
    expect(text).toContain('Invite your partner first. Once they accept, you can choose exactly which card to send.');
    expect(text).toContain('Invite someone you train with');
    expect(text).not.toContain('Share a win');
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
    let resolveCheer;
    const hook = base({
      pairs: [pair({ cheerEnabled: true })],
      cheer: jest.fn(() => new Promise((resolve) => { resolveCheer = resolve; })),
    });
    mockHook.value = hook;
    const tree = await mount();
    await press(tree, 'Send a cheer');
    // The four fixed acknowledgements are offered.
    expect(allText(tree).join(' ')).toContain('One tap, no free text, no pressure.');
    expect(allText(tree).join(' ')).not.toMatch(/\bchat\b|chatbot/i);
    expect(allText(tree)).toContain('Here with you.');
    await act(async () => { findPress(tree, 'Here with you.')[0].props.onPress(); await Promise.resolve(); });
    expect(allText(tree)).toContain('Sending...');
    expect(findPress(tree, 'Sending Here with you.')[0].props.disabled).toBe(true);
    await act(async () => { resolveCheer({ ok: true }); await Promise.resolve(); await Promise.resolve(); });
    expect(hook.cheer).toHaveBeenCalledWith('p1', 'here', expect.any(Boolean));
    expect(mockToastShow).toHaveBeenCalledWith('Cheer sent', { variant: 'success' });
    expect(allText(tree)).not.toContain('Here with you.');
  });

  test('weekly sessions do not create a second cheer surface', async () => {
    const hook = base({ pairs: [pair({ myAim: 4, cheerEnabled: true })] });
    mockHook.value = hook;
    const tree = await mount();
    expect(allText(tree)).not.toContain('Choose a cheer');
    expect(allText(tree).filter((text) => text === 'Send a cheer')).toHaveLength(1);

    await press(tree, 'Send a cheer');
    expect(allText(tree)).toContain('Here with you.');
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

  test('a failed acknowledgement without an error still tells the user', async () => {
    const hook = base({
      pairs: [pair({ cheerEnabled: true })],
      cheer: jest.fn(async () => ({ ok: false })),
    });
    mockHook.value = hook;
    const tree = await mount();
    await press(tree, 'Send a cheer');
    await press(tree, 'Here with you.');
    expect(hook.cheer).toHaveBeenCalledWith('p1', 'here', expect.any(Boolean));
    expect(mockToastShow).toHaveBeenCalledWith(
      'Could not send that cheer. Open Partners again and try once more.',
      { variant: 'error' },
    );
  });

  test('a stale partnership acknowledgement tells the user to refresh partners', async () => {
    const hook = base({
      pairs: [pair({ cheerEnabled: true })],
      cheer: jest.fn(async () => ({ ok: false, error: 'not_active' })),
    });
    mockHook.value = hook;
    const tree = await mount();
    await press(tree, 'Send a cheer');
    await press(tree, 'Here with you.');
    expect(hook.cheer).toHaveBeenCalledWith('p1', 'here', expect.any(Boolean));
    expect(mockToastShow).toHaveBeenCalledWith(
      'Volyume has not finished setting up this partnership on this device yet. Refresh Partners, then try again.',
      { variant: 'error' },
    );
  });

  test('a missing cheer backend does not blame the user connection', async () => {
    const hook = base({
      pairs: [pair({ cheerEnabled: true })],
      cheer: jest.fn(async () => ({ ok: false, error: 'cheers_unavailable' })),
    });
    mockHook.value = hook;
    const tree = await mount();
    await press(tree, 'Send a cheer');
    await press(tree, 'Here with you.');
    expect(mockToastShow).toHaveBeenCalledWith(
      'Partner cheers are not available right now. Try again later.',
      { variant: 'error' },
    );
  });

  test('a partner schema update cheer failure does not blame the user connection', async () => {
    const hook = base({
      pairs: [pair({ cheerEnabled: true })],
      cheer: jest.fn(async () => ({ ok: false, error: 'partner_update_needed' })),
    });
    mockHook.value = hook;
    const tree = await mount();
    await press(tree, 'Send a cheer');
    await press(tree, 'Here with you.');
    expect(mockToastShow).toHaveBeenCalledWith(
      'Partner cheers need the latest partner update before they can send. Refresh Partners, then try again.',
      { variant: 'error' },
    );
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
      'Pair with one person you already train with. They see whether you trained this week, one daily cheer and only the wins you choose to send. Food, photos, body metrics and notes stay private.',
    );
    // The plain-English receipt explains what pairing actually exposes before
    // the user invites anyone.
    expect(text).toContain('What your partner sees');
    expect(text).toContain('Whether you trained this week');
    expect(text).toContain('One fixed cheer a day');
    expect(text).toContain('Only the wins you choose to send');
    expect(text).toContain('No food, photos, body metrics or private notes');
    // The word "signal" is gone from the pitch.
    expect(text).not.toContain('signal');
    expect(text).toContain('Invite someone you train with');
    expect(text).toContain('I have a code');
  });

  test('renders the privacy receipt with the exact copy of both columns', async () => {
    mockHook.value = base({ pairs: [] });
    const text = allText(await mount());
    expect(text).toContain('What your partner can see');
    expect(text).toContain('THEY WILL SEE');
    expect(text).toContain('THEY NEVER SEE');
    // Left column (crosses), first line is the newly added first-name line.
    for (const line of [
      'Your first name',
      'Whether you trained this week',
      'Your shared streak in weeks',
      'Rest weeks shown as resting',
      'One fixed cheer a day',
      'A block name you choose to share',
    ]) expect(text).toContain(line);
    // Right column (never).
    for (const line of [
      'Your sets, reps or loads',
      'Your body metrics or photos',
      'Your food diary',
      'Coach notes or check-ins',
      'Your location',
    ]) expect(text).toContain(line);
    expect(text).toContain('Either of you can end this at any time. Shared partner data is deleted.');
  });
});

describe('pending state', () => {
  test('shows the waiting card with a cancel affordance', async () => {
    mockHook.value = base({ pairs: [], pendingInvite: { id: 'pend1', status: 'invited' } });
    const tree = await mount();
    expect(allText(tree)).toContain('Invitation sent. Waiting for your partner.');
    expect(allText(tree)).toContain('This checks automatically while the screen is open. Share the same invite again if they missed it; it still only pairs one person.');
    expect(findPress(tree, 'Share invite again').length).toBeGreaterThan(0);
    expect(findPress(tree, 'Check invite status').length).toBeGreaterThan(0);
    expect(findPress(tree, 'Cancel invitation').length).toBeGreaterThan(0);
  });

  test('can manually refresh a pending connection after the other person accepts', async () => {
    const hook = base({ pairs: [], pendingInvite: { id: 'pend1', status: 'invited' } });
    mockHook.value = hook;
    const tree = await mount();
    await press(tree, 'Check invite status');
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

  test('manual code entry warns when the invite was accepted but the device mirror is still refreshing', async () => {
    const refresh = jest.fn(async () => ({ ok: true }));
    const hook = base({
      pairs: [],
      pendingInvite: null,
      refresh,
      redeem: jest.fn(async () => ({ ok: true, pendingLocalMirror: true })),
    });
    mockHook.value = hook;
    const tree = await mount();
    await press(tree, 'I have a code');
    const field = tree.root.findAll((n) => n.props.accessibilityLabel === 'Invite code')[0];
    await act(async () => { field.props.onChangeText('abcd1234'); });
    await press(tree, 'Join with code');
    expect(hook.redeem).toHaveBeenCalledWith('ABCD1234');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(mockToastShow).toHaveBeenCalledWith(
      'Invite accepted. Setting up your partner space now.',
      { variant: 'warning' },
    );
    expect(allText(tree)).toContain('Partner invite accepted');
    expect(allText(tree)).toContain('Volyume is setting up the private partner space on this device.');
    expect(mockToastShow).not.toHaveBeenCalledWith('Partner connected', expect.anything());
  });

  test('deep-linked invite redemption waits until partner capacity has loaded', async () => {
    const redeem = jest.fn(async () => ({ ok: true }));
    mockHook.value = base({ pairs: [], canAdd: false, redeem });
    let tree;
    await act(async () => { tree = create(<PartnerScreen route={{ params: { code: 'abcd1234' } }} />); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(redeem).not.toHaveBeenCalled();

    mockHook.value = base({ pairs: [], canAdd: true, redeem });
    await act(async () => {
      tree.update(<PartnerScreen route={{ params: { code: 'abcd1234' } }} />);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(redeem).toHaveBeenCalledWith('ABCD1234');
  });
});

describe('manage sheet: block confirm', () => {
  test('partner bottom sheets that can overflow opt into internal scrolling', () => {
    expect(PARTNER_SCREEN_SOURCE).toMatch(/accessibilityLabel="Manage partnership" scroll/);
    expect(PARTNER_SCREEN_SOURCE).toMatch(/accessibilityLabel="This week's sessions" scroll/);
    expect(PARTNER_SCREEN_SOURCE).toMatch(/accessibilityLabel="Send a cheer" scroll/);
    expect(PARTNER_SCREEN_SOURCE).toMatch(/accessibilityLabel="Choose a win to share" scroll/);
    expect(PARTNER_SCREEN_SOURCE).toMatch(/keyboardShouldPersistTaps="handled"/);
    expect(PARTNER_SCREEN_SOURCE).toMatch(/journeyContent: \{ flexGrow: 1,/);
  });

  test('manage sheet keeps new block-label sharing out of the main path', async () => {
    mockHook.value = base({ pairs: [pair({ partnerFirstName: 'Sam', partnerId: 'sam-id' })] });
    const tree = await mount();

    await press(tree, 'Manage partnership with Sam');

    expect(allText(tree)).not.toContain('Share current block name');
    expect(findPress(tree, 'Share current block name')).toHaveLength(0);
  });

  test('block wires the real block + unpair primitives with the exact copy', async () => {
    const hook = base({ pairs: [pair({ partnerFirstName: 'Sam', partnerId: 'sam-id' })] });
    mockHook.value = hook;
    const tree = await mount();

    await press(tree, 'Manage partnership with Sam');
    await press(tree, 'Block Sam');

    const call = mockAlertCalls.find((c) => c.title === 'Block Sam');
    expect(call).toBeTruthy();
    expect(call.message).toBe(
      'Volyume blocks them first, then ends the partnership and removes shared data. They will not be told you blocked them. If the final clean-up cannot complete, they stay blocked and you can retry ending the partnership.',
    );
    const blockBtn = call.buttons.find((b) => b.style === 'destructive');
    expect(blockBtn.text).toBe('Block');
    await act(async () => { await blockBtn.onPress(); await Promise.resolve(); });
    expect(hook.block).toHaveBeenCalledWith('sam-id');
    expect(hook.unpair).toHaveBeenCalledWith('p1');
  });
});
