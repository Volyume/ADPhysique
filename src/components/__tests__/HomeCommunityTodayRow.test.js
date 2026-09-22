/**
 * HomeCommunityTodayRow.test.js (F7, fresh-eyes review, founder order
 * 2026-09-22 item 2).
 *
 * Pins: a non-zero count renders the "N people you follow trained today"
 * line with a chevron and no Invite action; a zero count renders the
 * honest zero line with an Invite button whose press calls onInvite and
 * never onOpen; pressing the row itself calls onOpen. All gating
 * (membership, ED/calm, visibility) lives in HomeScreen.js, not here --
 * see HomeScreen.communityRow.guard.test.js for that.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ accessibility: { reduceMotion: true } }),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import HomeCommunityTodayRow from '../HomeCommunityTodayRow';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  if (node.children) return flattenText(node.children);
  return '';
}

function render(props) {
  let tree;
  act(() => { tree = create(<HomeCommunityTodayRow {...props} />); });
  return tree;
}

describe('HomeCommunityTodayRow', () => {
  test('count 3 renders "3 people you follow trained today" with a chevron and no Invite', () => {
    const onOpen = jest.fn();
    const onInvite = jest.fn();
    const tree = render({ count: 3, onOpen, onInvite });

    expect(flattenText(tree.toJSON())).toContain('3 people you follow trained today');

    const chevrons = tree.root.findAll(
      (n) => n.type === 'Ionicons' && n.props.name === 'chevron-forward',
    );
    expect(chevrons.length).toBe(1);

    const inviteButtons = tree.root.findAll((n) => n.props && n.props.title === 'Invite');
    expect(inviteButtons.length).toBe(0);
  });

  test('count 0 renders the zero line with an Invite button; pressing it calls onInvite, not onOpen', () => {
    const onOpen = jest.fn();
    const onInvite = jest.fn();
    const tree = render({ count: 0, onOpen, onInvite });

    expect(flattenText(tree.toJSON())).toContain('Nobody you follow has trained yet today');

    const inviteButtons = tree.root.findAll(
      (n) => n.props && n.props.title === 'Invite' && typeof n.props.onPress === 'function',
    );
    expect(inviteButtons.length).toBe(1);

    act(() => { inviteButtons[0].props.onPress(); });
    expect(onInvite).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  test('pressing the row calls onOpen', () => {
    const onOpen = jest.fn();
    const onInvite = jest.fn();
    const tree = render({ count: 3, onOpen, onInvite });

    // testID/onPress forward unchanged from Card down through PressableCard,
    // so more than one nested instance can match -- they all carry the same
    // onOpen reference, so calling the outermost one is enough.
    const rows = tree.root.findAll(
      (n) => n.props && n.props.testID === 'home-community-today-row' && typeof n.props.onPress === 'function',
    );
    expect(rows.length).toBeGreaterThan(0);

    act(() => { rows[0].props.onPress(); });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onInvite).not.toHaveBeenCalled();
  });
});
