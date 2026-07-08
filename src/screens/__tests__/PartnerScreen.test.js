/**
 * PartnerScreen (Step B rebuild) — the premium partner destination.
 * DESIGN-SPEC B2-B7. usePartners is mocked so each state shape is driven
 * directly; the moments module is mocked so this suite never depends on the
 * real C3 module's behaviour.
 *
 * Pins:
 *  - multiple active pairs render as isolated cards, in paired-at order;
 *  - free tier never shows the "invite another" affordance (cap = 1);
 *  - the empty state carries the short pitch, while the invite consent step
 *    carries the full privacy receipt (both columns, exact copy);
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
    expect(text).toContain('Refresh partner data');
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
    expect(text).toContain('Volyume could not read your partner area on this device.');
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

  test('active pairs show one guided partner-week card with shared and private boundaries', async () => {
    mockHook.value = base({ pairs: [pair({ sharedBlock: { status: 'active', blockName: 'Upper Lower' } })] });
    const text = allText(await mount()).join(' ');
    expect(text).toContain('What Sam sees');
    expect(text).toContain('Sam can see whether you trained this week. They only see extra detail when you choose to send a win.');
    expect(text).toContain('Private: full workout details, food, Coach check-ins, body metrics and photos');
    expect(text).toContain('full workout details, food, Coach check-ins, body metrics and photos');
    expect(text).not.toContain('Shared with Sam');
    expect(text).not.toContain('Full workouts and lift numbers');
    expect(text).not.toContain('This week: you 2 of 4. Sam 3 of 4. No weights, food, photos or Coach notes are shared.');
    expect(text).toContain('Shared training phase');
    expect(text).toContain('Upper Lower is shared as a phase name only. Your workouts, exercises, weights and notes stay private.');
    expect(text).toContain('Sharing settings');
    expect(text).not.toContain('Manage label');
  });

  test('active pairs do not ask users to set weekly sessions', async () => {
    mockHook.value = base({ pairs: [pair({ myAim: 0, partnerAim: 3 })] });
    const tree = await mount();
    const text = allText(tree).join(' ');
    expect(text).not.toContain('weekly sessions');
    expect(text).not.toContain("Set this week's sessions. Sam sees only the number, not your plan.");
    expect(text).not.toContain("Sam's weekly sessions");
    expect(text).toContain('What Sam sees');
    expect(text).toContain('Sam can see whether you trained this week. They only see extra detail when you choose to send a win.');
    expect(text).not.toContain('Visible to Sam');
    expect(text).not.toContain('Choose a realistic number. Sam sees the number only.');
    expect(text).not.toContain('This week with Sam');
    expect(text).not.toContain('Training status from your current plan.');
    expect(findPress(tree, "Set this week's sessions")).toHaveLength(0);
    expect(findPress(tree, 'Decrease sessions')).toHaveLength(0);
    expect(findPress(tree, 'Increase sessions')).toHaveLength(0);
  });

  test('active pairs show consent-gated shareable wins without widening partner privacy', async () => {
    mockHook.value = base({ pairs: [pair()] });
    const tree = await mount();
    let text = allText(tree).join(' ');
    expect(text).toContain('Share a win');
    expect(text).toContain('Send a workout, PR, or progress update. You approve the preview before Sam sees it.');

    await press(tree, 'Share a win');
    text = allText(tree).join(' ');
    expect(tree.root.findAll((n) => n.props?.keyboardShouldPersistTaps === 'handled').length).toBeGreaterThan(0);
    expect(text).toContain('Share a win');
    expect(text).toContain('Pick one update, check exactly what Sam will see, then send it.');
    expect(text).toContain('Preview only');
    expect(text).toContain('Workout complete');
    expect(text).toContain('Upper body session completed on chosen date.');
    expect(text).toContain('Sam will see');
    expect(text).toContain('Workout name, date and completed status.');
    expect(text).toContain('Show what stays private');
    expect(text).not.toContain('No passive feed, leaderboard, workout history browsing, food diary, coach notes, body metrics or automatic photo sharing.');
    await press(tree, 'Show what stays private');
    text = allText(tree).join(' ');
    expect(text).toContain('Stays private');
    expect(text).toContain('Exercises, sets, reps, loads, notes and effort stay private unless you choose to share them later.');
    expect(text).toContain('Not sent until you choose one partner and approve this exact update.');
    expect(text).toContain('No passive feed, leaderboard, workout history browsing, food diary, coach notes, body metrics or automatic photo sharing.');
    await press(tree, 'Preview personal record');
    text = allText(tree).join(' ');
    expect(text).toContain('Bench press: New rep best.');
    expect(text).toContain('The lift name and the record you choose to celebrate.');
    expect(text).toContain('Your wider lift history and other records stay private.');
    expect(text).toContain('Workout complete');
    expect(text).toContain('Personal record');
    expect(text).toContain('Training phase milestone');
    expect(text).toContain('Progress comparison');
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

  test('win sharing cloud-schema failures do not blame the user connection', async () => {
    const hook = base({
      pairs: [pair()],
      shareWin: jest.fn(async () => ({ ok: false, error: 'win_cards_unavailable' })),
    });
    mockHook.value = hook;
    const tree = await mount();
    await press(tree, 'Share a win');
    await press(tree, 'Send workout complete to Sam');
    expect(mockToastShow).toHaveBeenCalledWith('Partner win sharing needs the latest cloud update.', { variant: 'error' });
    expect(mockToastShow).not.toHaveBeenCalledWith(
      expect.stringMatching(/connection|internet/i),
      expect.anything(),
    );
  });

  test('win sharing stale partnership state is a sync warning, not a connection error', async () => {
    const hook = base({
      pairs: [pair()],
      shareWin: jest.fn(async () => ({ ok: false, error: 'partner_syncing' })),
    });
    mockHook.value = hook;
    const tree = await mount();
    await press(tree, 'Share a win');
    await press(tree, 'Send workout complete to Sam');
    expect(mockToastShow).toHaveBeenCalledWith(
      'This partner link is still being prepared. We are refreshing it now; try again in a moment.',
      { variant: 'warning' },
    );
    expect(mockToastShow).not.toHaveBeenCalledWith(
      expect.stringMatching(/connection|internet/i),
      expect.anything(),
    );
  });

  test('renders sent win cards with sender delete control', async () => {
    const hook = base({
      pairs: [pair({
        winCards: [{
          id: 'win1',
          pairId: 'p1',
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
    expect(hook.revokeWin).toHaveBeenCalledWith('win1', 'p1');
  });

  test('win delete cloud-schema failures do not blame the user connection', async () => {
    const hook = base({
      pairs: [pair({
        winCards: [{
          id: 'win1',
          pairId: 'p1',
          senderId: 'u1',
          cardType: 'personal_record',
          title: 'Personal record',
          summary: 'Bench press: New rep best.',
          detail: 'Only this chosen record is shared. Wider lift history stays private.',
          createdAt: Date.UTC(2026, 6, 6),
        }],
      })],
      revokeWin: jest.fn(async () => ({ ok: false, error: 'win_cards_unavailable' })),
    });
    mockHook.value = hook;
    const tree = await mount();
    await press(tree, 'Delete shared win Personal record');
    expect(mockToastShow).toHaveBeenCalledWith('Partner win sharing needs the latest cloud update.', { variant: 'error' });
    expect(mockToastShow).not.toHaveBeenCalledWith(
      expect.stringMatching(/connection|internet/i),
      expect.anything(),
    );
  });

  test('win delete stale partnership state is a sync warning, not a connection error', async () => {
    const hook = base({
      pairs: [pair({
        winCards: [{
          id: 'win1',
          pairId: 'p1',
          senderId: 'u1',
          cardType: 'personal_record',
          title: 'Personal record',
          summary: 'Bench press: New rep best.',
          detail: 'Only this chosen record is shared. Wider lift history stays private.',
          createdAt: Date.UTC(2026, 6, 6),
        }],
      })],
      revokeWin: jest.fn(async () => ({ ok: false, error: 'partner_syncing' })),
    });
    mockHook.value = hook;
    const tree = await mount();
    await press(tree, 'Delete shared win Personal record');
    expect(mockToastShow).toHaveBeenCalledWith(
      'This partner link is still being prepared. We are refreshing it now; try again in a moment.',
      { variant: 'warning' },
    );
    expect(mockToastShow).not.toHaveBeenCalledWith(
      expect.stringMatching(/connection|internet/i),
      expect.anything(),
    );
  });

  test('progress-card share preview can use a sanitized exported-card payload', async () => {
    mockHook.value = base({ pairs: [pair()] });
    const tree = await mount({
      shareWinType: 'progress_card',
      progressCardSharePayload: {
        label: 'Progress comparison',
        dateRange: '5 Jan to 20 Jun',
        format: 'Square',
        includesWeight: false,
        includesScanScore: true,
        imageUri: 'file:///private-card.png',
      },
    });
    await press(tree, 'Share a win');
    const text = allText(tree).join(' ');
    expect(text).toContain('Progress comparison');
    expect(text).toContain('Progress comparison, 5 Jan to 20 Jun.');
    expect(text).toContain('The visible Volyume Score is part of that export.');
    expect(text).toContain('Weight is off for this export.');
    expect(text).toContain('Raw photos, body metrics and the photo library stay private.');
    expect(text).toContain('The composed progress image, with only the details shown before you send it.');
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
        label: 'Progress comparison',
        dateRange: '5 Jan 2026 to 20 Jun 2026',
        format: 'Square',
        includesWeight: false,
        includesScanScore: true,
      },
    });
    const text = allText(tree).join(' ');
    expect(text).toContain('Share a win');
    expect(text).toContain('Progress comparison, 5 Jan 2026 to 20 Jun 2026.');
    expect(text).toContain('The visible Volyume Score is part of that export.');
    expect(text).toContain('Weight is off for this export.');
  });

  test('incoming progress-card payload infers the preview type when the route omits it', async () => {
    mockHook.value = base({ pairs: [pair()] });
    const tree = await mount({
      progressCardSharePayload: {
        label: 'Progress comparison',
        dateRange: '5 Jan 2026 to 20 Jun 2026',
        format: 'Square',
        includesWeight: false,
        includesScanScore: true,
      },
    });
    const text = allText(tree).join(' ');
    expect(text).toContain('Sam will see');
    expect(text).toContain('Progress comparison, 5 Jan 2026 to 20 Jun 2026.');
    expect(text).toContain('The visible Volyume Score is part of that export.');
  });

  test('incoming progress-card route with multiple partners asks the user to choose', async () => {
    mockHook.value = base({
      pairs: [
        pair({ id: 'p1', partnerFirstName: 'Sam', pairedAt: 1 }),
        pair({ id: 'p2', partnerFirstName: 'Alex', partnerId: 'alex-id', pairedAt: 2 }),
      ],
    });
    const tree = await mount({
      shareWinType: 'progress_card',
      progressCardSharePayload: {
        label: 'Progress comparison',
        dateRange: '5 Jan 2026 to 20 Jun 2026',
        format: 'Square',
        includesWeight: false,
        includesScanScore: true,
      },
    });
    const text = allText(tree).join(' ');
    expect(text).toContain('Choose who receives it');
    expect(text).toContain('Nothing has been sent. Pick Share a win under the right partner and approve the preview first.');
    expect(text).not.toContain('Progress comparison, 5 Jan 2026 to 20 Jun 2026.');
  });

  test('incoming progress-card route opens a named partner directly', async () => {
    mockHook.value = base({
      pairs: [
        pair({ id: 'p1', partnerFirstName: 'Sam', pairedAt: 1 }),
        pair({ id: 'p2', partnerFirstName: 'Alex', partnerId: 'alex-id', pairedAt: 2 }),
      ],
    });
    const tree = await mount({
      pairId: 'p2',
      shareWinType: 'progress_card',
      progressCardSharePayload: {
        label: 'Progress comparison',
        dateRange: '5 Jan 2026 to 20 Jun 2026',
        format: 'Square',
        includesWeight: false,
        includesScanScore: true,
      },
    });
    const text = allText(tree).join(' ');
    expect(text).toContain('Alex will see');
    expect(text).toContain('Progress comparison, 5 Jan 2026 to 20 Jun 2026.');
    expect(text).not.toContain('Choose who receives it');
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
    expect(text).toContain('Add a partner to share this update');
    expect(text).toContain('Nothing has been sent yet. Pair with someone you know and trust to start sharing.');
    expect(text).toContain('Your update stays private');
    expect(text).toContain('Invite your partner first. Once they accept, you can choose exactly which update to send.');
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

  test('partner support does not create a second cheer surface', async () => {
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
      'Could not send that cheer. Refresh Partners, then try once more.',
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
      'This partner link is not ready yet. Refresh Partners, then try again.',
      { variant: 'error' },
    );
  });

  test('a syncing partnership acknowledgement is a warning, not a connection error', async () => {
    const hook = base({
      pairs: [pair({ cheerEnabled: true })],
      cheer: jest.fn(async () => ({ ok: false, error: 'partner_syncing' })),
    });
    mockHook.value = hook;
    const tree = await mount();
    await press(tree, 'Send a cheer');
    await press(tree, 'Here with you.');
    expect(hook.cheer).toHaveBeenCalledWith('p1', 'here', expect.any(Boolean));
    expect(mockToastShow).toHaveBeenCalledWith(
      'This partner link is still being prepared. We are refreshing it now; try again in a moment.',
      { variant: 'warning' },
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
      'Partner cheers need the latest app update before they can send. Refresh Partners, then try again.',
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
    const tree = await mount();
    expect(allText(tree)).not.toContain('THEY WILL SEE');
    await press(tree, 'Invite someone you train with');
    await press(tree, 'Continue');
    const text = allText(tree);
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
      'A training phase name you choose to share',
    ]) expect(text).toContain(line);
    // Right column (never).
    for (const line of [
      'Your sets, reps or loads',
      'Your body metrics or photos',
      'Your food diary',
      'Coach notes or check-ins',
      'Your location',
    ]) expect(text).toContain(line);
    expect(text).toContain('Either of you can end this at any time.');
    expect(text).not.toContain('Shared partner data is deleted.');
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

  test('pending invite actions are styled as buttons, not plain text links', () => {
    expect(PARTNER_SCREEN_SOURCE).toMatch(/style=\{styles\.pendingDanger\}/);
    expect(PARTNER_SCREEN_SOURCE).toMatch(/name="close-circle-outline"/);
    expect(PARTNER_SCREEN_SOURCE).not.toMatch(/style=\{styles\.textRow\}/);
    expect(PARTNER_SCREEN_SOURCE).not.toMatch(/textRow:/);
  });

  test('visible plan copy refers to the current assigned plan, not an Own Plan concept', () => {
    expect(PARTNER_SCREEN_SOURCE).toContain("each person's current plan");
    expect(PARTNER_SCREEN_SOURCE).toContain('trained against your current plan');
    expect(PARTNER_SCREEN_SOURCE).not.toMatch(/own plan/i);
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
    expect(allText(tree)).toContain('We are finishing the private link on this device.');
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
    expect(PARTNER_SCREEN_SOURCE).not.toMatch(/accessibilityLabel="This week's sessions" scroll/);
    expect(PARTNER_SCREEN_SOURCE).toMatch(/accessibilityLabel="Send a cheer"[\s\S]*scroll[\s\S]*sheetStyle=\{styles\.partnerActionSheet\}/);
    expect(PARTNER_SCREEN_SOURCE).toMatch(/accessibilityLabel="Choose a win to share"[\s\S]*scroll[\s\S]*sheetStyle=\{styles\.partnerActionSheet\}/);
    expect(PARTNER_SCREEN_SOURCE).toMatch(/partnerActionSheet: \{\s*alignSelf: 'stretch',\s*maxHeight: '86%',\s*\}/);
    expect(PARTNER_SCREEN_SOURCE).toMatch(/keyboardShouldPersistTaps="handled"/);
    expect(PARTNER_SCREEN_SOURCE).toMatch(/journeyContent: \{ flexGrow: 1,/);
  });

  test('shared phase status uses a contained neutral action instead of a text link', () => {
    expect(PARTNER_SCREEN_SOURCE).toContain('<Text style={styles.blockStatusActionText}>Sharing settings</Text>');
    expect(PARTNER_SCREEN_SOURCE).not.toContain('<Text style={styles.blockStatusActionText}>Manage label</Text>');
    expect(PARTNER_SCREEN_SOURCE).toMatch(/blockStatusAction: \{[\s\S]*minHeight: 40,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface/);
    expect(PARTNER_SCREEN_SOURCE).toContain('blockStatusActionText: { ...type.label, color: colors.textPrimary }');
  });

  test('shared-win delete action is destructive, not amber-positive', () => {
    expect(PARTNER_SCREEN_SOURCE).toContain('Ionicons name="trash-outline" size={iconSize.sm} color={colors.error}');
    expect(PARTNER_SCREEN_SOURCE).toMatch(/partnerWinDeleteButton: \{[\s\S]*borderColor: withAlpha\(colors\.error, alpha\.edge\),[\s\S]*backgroundColor: colors\.surface2/);
    expect(PARTNER_SCREEN_SOURCE).toContain('partnerWinDelete: { ...type.label, color: colors.error }');
    expect(PARTNER_SCREEN_SOURCE).not.toContain('partnerWinDelete: { ...type.label, color: colors.primary }');
  });

  test('share-win utility rows use neutral contained chrome, not amber links', () => {
    expect(PARTNER_SCREEN_SOURCE).toMatch(/shareWinPrivacyToggle: \{[\s\S]*minHeight: 44,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(PARTNER_SCREEN_SOURCE).toContain('shareWinPrivacyToggleText: { ...type.caption, color: colors.textPrimary');
    expect(PARTNER_SCREEN_SOURCE).toContain('shareWinExampleConsent: { ...type.caption, color: colors.textSecondary');
    expect(PARTNER_SCREEN_SOURCE).not.toContain('shareWinPrivacyToggleText: { ...type.caption, color: colors.primary');
    expect(PARTNER_SCREEN_SOURCE).not.toContain('shareWinExampleConsent: { ...type.caption, color: colors.primary');
  });

  test('invite channels keep secondary options neutral, with one filled primary', () => {
    expect(PARTNER_SCREEN_SOURCE).toMatch(/channelBtn: \{[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(PARTNER_SCREEN_SOURCE).toContain('channelBtnPrimary: {\n    backgroundColor: colors.primaryFill,');
    expect(PARTNER_SCREEN_SOURCE).toContain('channelBtnText: { ...type.label, color: colors.textPrimary }');
    expect(PARTNER_SCREEN_SOURCE).not.toContain('channelBtnText: { ...type.label, color: colors.primary }');
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
