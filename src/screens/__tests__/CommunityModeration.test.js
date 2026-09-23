/**
 * CommunityModerationScreen (blueprint sections 3, 6; SD-11; product
 * review 2026-09-06, items 19 and 22).
 *
 * What this suite pins:
 *  - the actions sheet CAPTURES the "why". `moderate()` was always called
 *    with a null note while `CommunityRulesScreen` promised every action
 *    is recorded "including who did it and why", so the promise could
 *    never be true;
 *  - an empty note is sent as null, never as a blank string;
 *  - the Actioned tab is named as the audit view it is, and it renders a
 *    moderator handle and a note when the queue returns them;
 *  - the queue is still moderator-only.
 */

import { create, act } from 'react-test-renderer';

const mockToastShow = jest.fn();

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

jest.mock('../../hooks/useCommunityMe', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../lib/community', () => ({
  moderationQueue: jest.fn(),
  moderate: jest.fn(() => Promise.resolve({ ok: true })),
  MODERATION_ACTIONS: jest.requireActual('../../lib/community/moderation').MODERATION_ACTIONS,
  REPORT_REASONS: jest.requireActual('../../lib/community/validation').REPORT_REASONS,
}));

// Founder order 2026-09-22 item 7 (B-03): the Gyms segment's own wrappers
// (migrate_181_gym_moderation_lists.sql). REPORT_KINDS is copied verbatim
// from src/lib/gyms/index.js rather than requireActual'd, so this test
// never pulls in the real gyms transport chain (callGyms -> callCommunity
// -> supabase) just to read a fixed label map.
let lastAlertButtons = null;
jest.mock('../../lib/gyms', () => ({
  pendingSubmissions: jest.fn(),
  pendingReports: jest.fn(),
  reviewSubmission: jest.fn(() => Promise.resolve({ ok: true })),
  reviewReport: jest.fn(() => Promise.resolve({ ok: true })),
  REPORT_KINDS: {
    closed: 'This gym has closed',
    wrong_name: 'The name is wrong',
    wrong_location: 'The location is wrong',
    duplicate_of: 'This is a duplicate of another gym',
    not_a_gym: 'This is not a gym',
    other: 'Something else',
  },
}));
jest.mock('../../components/AppAlert', () => ({
  appAlert: jest.fn((title, message, buttons) => { lastAlertButtons = buttons; }),
}));

import { moderationQueue, moderate } from '../../lib/community';
import {
  pendingSubmissions, pendingReports, reviewSubmission, reviewReport,
} from '../../lib/gyms';
import { appAlert } from '../../components/AppAlert';
import useCommunityMe from '../../hooks/useCommunityMe';
import CommunityModerationScreen, { MODERATION_NOTE_MAX } from '../CommunityModerationScreen';

// The shape `community_moderation_queue` actually returns
// (supabase/migrate_160_community.sql): id, target_kind, target_id,
// target_owner_id, reason, detail, status, priority, created_at, content.
const REPORT = {
  id: 'r1',
  target_kind: 'comment',
  target_id: 'c1',
  target_owner_id: 'u9',
  reason: 'harassment',
  detail: 'Told someone to eat less.',
  status: 'open',
  priority: true,
  created_at: Date.now(),
  content: { body: 'Told someone to eat less.', status: 'visible' },
};

// The shapes gyms_pending_submissions/gyms_pending_reports actually return
// (supabase/migrate_181_gym_moderation_lists.sql).
const GYM_SUBMISSION = {
  id: 'sub1',
  name: 'Volt Gym',
  address_line: '1 Main Street',
  town: 'Burscough',
  postcode: 'L40 4BY',
  website: 'https://voltgym.example',
  operator: null,
  confirmation_count: 1,
  created_at: Date.now(),
};
const GYM_REPORT = {
  id: 'grep1',
  venue_id: 'v1',
  venue_name: 'PureGym Motherwell',
  reason: 'closed',
  detail: 'Permanently shut in June.',
  reporter_count: 2,
  created_at: Date.now(),
};

function texts(tree) {
  const out = [];
  const walk = (node) => {
    if (node == null) return;
    if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.children) walk(node.children);
  };
  walk(tree.toJSON());
  return out.join(' | ');
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
  });
}

async function mount() {
  let tree = null;
  await act(async () => { tree = create(<CommunityModerationScreen />); });
  await flush();
  return tree;
}

/** The RN manual mock renders FlashList as a passthrough FlatList host, so
 * a row is read by rendering `renderItem` for real. */
function row(tree, item) {
  const list = tree.root.findAll((n) => n.type === 'FlatList')[0];
  let rendered = null;
  act(() => { rendered = create(list.props.renderItem({ item })); });
  return rendered;
}

function field(tree, label) {
  return tree.root.findAll((n) => n.props?.accessibilityLabel === label && n.props?.onChangeText)[0];
}

function action(tree, label) {
  return tree.root.findAll(
    (n) => typeof n.type === 'function' && n.props?.accessibilityLabel === label && 'onPress' in n.props,
  )[0];
}

beforeEach(() => {
  jest.clearAllMocks();
  lastAlertButtons = null;
  useCommunityMe.mockReturnValue({
    me: { profile: { user_id: 'u1', handle: 'mod' }, is_moderator: true },
    loading: false,
    error: null,
    refresh: jest.fn(),
  });
  moderationQueue.mockResolvedValue({ reports: [REPORT], cursor: null });
  pendingSubmissions.mockResolvedValue({ submissions: [], cursor: null });
  pendingReports.mockResolvedValue({ reports: [], cursor: null });
});

async function openSheet(tree) {
  const card = row(tree, REPORT);
  const pressable = card.root.findAll((n) => n.props?.onPress && n.props?.accessibilityLabel)[0];
  await act(async () => { pressable.props.onPress(); });
  act(() => { card.unmount(); });
}

/** Taps the new "Gyms" segment chip and waits for its own loader. */
async function openGyms(tree) {
  await act(async () => { action(tree, 'Gyms').props.onPress(); });
  await flush();
}

describe('the note for the record', () => {
  test('travels with the action', async () => {
    const tree = await mount();
    await openSheet(tree);

    await act(async () => { field(tree, 'Note for the record').props.onChangeText('Repeat offender.'); });
    await act(async () => { action(tree, 'Hide the content').props.onPress(); });
    await flush();

    expect(moderate).toHaveBeenCalledWith('r1', 'hide_content', 'Repeat offender.');
    act(() => { tree.unmount(); });
  });

  test('an empty note is null, never a blank string', async () => {
    const tree = await mount();
    await openSheet(tree);

    await act(async () => { field(tree, 'Note for the record').props.onChangeText('   '); });
    await act(async () => { action(tree, 'Dismiss the report').props.onPress(); });
    await flush();

    expect(moderate).toHaveBeenCalledWith('r1', 'dismiss', null);
    act(() => { tree.unmount(); });
  });

  test('is capped, and the sheet says the note is part of the record', async () => {
    const tree = await mount();
    await openSheet(tree);

    expect(field(tree, 'Note for the record').props.maxLength).toBe(MODERATION_NOTE_MAX);
    expect(MODERATION_NOTE_MAX).toBe(300);
    expect(texts(tree))
      .toContain('Every action is recorded with who did it, when, and the note you leave here.');
    act(() => { tree.unmount(); });
  });
});

describe('the Actioned tab is the audit view', () => {
  test('it is named as one', async () => {
    const tree = await mount();
    expect(texts(tree)).toContain('Actioned (audit log)');
    act(() => { tree.unmount(); });
  });

  test('a row renders the moderator and the note when the queue returns them', async () => {
    const tree = await mount();
    const card = row(tree, {
      ...REPORT,
      status: 'actioned',
      resolution: 'hide_content',
      moderator_handle: 'mod',
      note: 'Repeat offender.',
    });

    const text = texts(card);
    expect(text).toContain('Resolution: Hide the content');
    expect(text).toContain('by @mod');
    expect(text).toContain('Note: Repeat offender.');
    act(() => { card.unmount(); tree.unmount(); });
  });

  test('a row with neither invents neither', async () => {
    const tree = await mount();
    const card = row(tree, { ...REPORT, status: 'actioned' });

    expect(texts(card)).not.toContain('by @');
    expect(texts(card)).not.toContain('Note:');
    act(() => { card.unmount(); tree.unmount(); });
  });
});

// F2 (Opus adversarial review, founder order 2026-09-22): the live queue
// (migrate_165 lines 1525-1549) never returns `preview` -- it returns
// `content`, shaped per target_kind. A reported note (target_kind
// 'post') reached the moderator with no text at all until this fell
// through to `content.caption`.
describe('the reported content itself renders (F2 fix)', () => {
  test('a note report with no report detail still shows its caption, from content', async () => {
    const tree = await mount();
    const card = row(tree, {
      ...REPORT,
      target_kind: 'post',
      detail: null,
      content: { kind: 'note', caption: 'Feeling really low about training today.', status: 'visible' },
    });

    expect(texts(card)).toContain('Feeling really low about training today.');
    act(() => { card.unmount(); tree.unmount(); });
  });
});

// Founder order 2026-09-22 item 7 (B-03): gym submissions and reports were
// actionable only via raw SQL; this is the minimal moderator queue that
// closes it. The screen's existing Open/Actioned tabs are untouched by any
// test in this block.
describe('the Gyms segment', () => {
  test('rows render from a fixture: a submission and a report', async () => {
    pendingSubmissions.mockResolvedValue({ submissions: [GYM_SUBMISSION], cursor: null });
    pendingReports.mockResolvedValue({ reports: [GYM_REPORT], cursor: null });
    const tree = await mount();
    await openGyms(tree);

    const text = texts(tree);
    expect(text).toContain('Volt Gym');
    expect(text).toContain('1 Main Street, Burscough, L40 4BY');
    expect(text).toContain('PureGym Motherwell');
    expect(text).toContain('This gym has closed');
    expect(text).toContain('Permanently shut in June.');
    act(() => { tree.unmount(); });
  });

  test('the calm empty states show when a queue is empty', async () => {
    const tree = await mount();
    await openGyms(tree);

    const text = texts(tree);
    expect(text).toContain('No gym submissions waiting.');
    expect(text).toContain('No gym reports waiting.');
    act(() => { tree.unmount(); });
  });

  test('approve calls reviewSubmission with the id, no confirm needed', async () => {
    pendingSubmissions.mockResolvedValue({ submissions: [GYM_SUBMISSION], cursor: null });
    const tree = await mount();
    await openGyms(tree);

    await act(async () => { action(tree, `Approve ${GYM_SUBMISSION.name}`).props.onPress(); });
    await flush();

    expect(appAlert).not.toHaveBeenCalled();
    expect(reviewSubmission).toHaveBeenCalledWith('sub1', 'approve');
    act(() => { tree.unmount(); });
  });

  test('reject asks first, and only calls reviewSubmission once the destructive button is confirmed', async () => {
    pendingSubmissions.mockResolvedValue({ submissions: [GYM_SUBMISSION], cursor: null });
    const tree = await mount();
    await openGyms(tree);

    await act(async () => { action(tree, `Reject ${GYM_SUBMISSION.name}`).props.onPress(); });
    expect(appAlert).toHaveBeenCalled();
    expect(reviewSubmission).not.toHaveBeenCalled();

    const destructive = lastAlertButtons.find((b) => b.style === 'destructive');
    expect(destructive).toBeTruthy();
    await act(async () => { await destructive.onPress(); });
    await flush();

    expect(reviewSubmission).toHaveBeenCalledWith('sub1', 'reject');
    act(() => { tree.unmount(); });
  });

  test('resolve calls reviewReport with the id and "resolve"', async () => {
    pendingReports.mockResolvedValue({ reports: [GYM_REPORT], cursor: null });
    const tree = await mount();
    await openGyms(tree);

    await act(async () => {
      action(tree, `Resolve report on ${GYM_REPORT.venue_name}`).props.onPress();
    });
    await flush();

    expect(reviewReport).toHaveBeenCalledWith('grep1', 'resolve');
    act(() => { tree.unmount(); });
  });

  test('dismiss calls reviewReport with the id and "dismiss", no confirm needed', async () => {
    pendingReports.mockResolvedValue({ reports: [GYM_REPORT], cursor: null });
    const tree = await mount();
    await openGyms(tree);

    await act(async () => {
      action(tree, `Dismiss report on ${GYM_REPORT.venue_name}`).props.onPress();
    });
    await flush();

    expect(appAlert).not.toHaveBeenCalled();
    expect(reviewReport).toHaveBeenCalledWith('grep1', 'dismiss');
    act(() => { tree.unmount(); });
  });

  test('a non-moderator never reaches the Gyms queues either (the screen-level guard covers all three segments)', async () => {
    useCommunityMe.mockReturnValue({
      me: { profile: { user_id: 'u2', handle: 'rowan' }, is_moderator: false },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    const tree = await mount();

    expect(pendingSubmissions).not.toHaveBeenCalled();
    expect(pendingReports).not.toHaveBeenCalled();
    act(() => { tree.unmount(); });
  });
});

describe('the guard', () => {
  test('a non-moderator sees a calm note and no queue', async () => {
    useCommunityMe.mockReturnValue({
      me: { profile: { user_id: 'u2', handle: 'rowan' }, is_moderator: false },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    const tree = await mount();

    expect(texts(tree)).toContain('The moderator queue is only open to moderators.');
    expect(moderationQueue).not.toHaveBeenCalled();
    act(() => { tree.unmount(); });
  });
});
