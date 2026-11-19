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


// The pressable that carries the visible words `label` (kit trial 2: the offer
// and row actions are kit Buttons, so they are found by their words, not by a
// `title` prop).
function actionNamed(tree, label) {
  const words = tree.root.findAll((n) => n.type === 'Text' && n.props.children === label)[0];
  if (!words) return undefined;
  let node = words.parent;
  while (node && typeof node.props.onPress !== 'function') node = node.parent;
  return node || undefined;
}

describe('HomeCommunityTodayRow', () => {
  test('count 3 renders "3 people you follow trained today" with a chevron and no Invite', () => {
    const onOpen = jest.fn();
    const onInvite = jest.fn();
    const tree = render({ count: 3, onOpen, onInvite });

    expect(flattenText(tree.toJSON())).toContain('3 people you follow trained today');

    const chevrons = tree.root.findAll(
      (n) => n.type === 'LucideIcon' && n.props.name === 'ChevronRight',
    );
    expect(chevrons.length).toBe(1);

    expect(actionNamed(tree, 'Invite')).toBeUndefined();
  });

  test('count 0 renders the zero line with an Invite button; pressing it calls onInvite, not onOpen', () => {
    const onOpen = jest.fn();
    const onInvite = jest.fn();
    const tree = render({ count: 0, onOpen, onInvite });

    expect(flattenText(tree.toJSON())).toContain('Nobody you follow has trained yet today');

    const invite = actionNamed(tree, 'Invite');
    expect(invite).toBeDefined();

    act(() => { invite.props.onPress(); });
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

// L10 (D221): following nobody reads "Find people to follow", with the
// action Find people; the Invite zero line stays for someone who follows
// people who just have not trained yet.
describe('following nobody', () => {
  test('shows "Find people to follow" and a Find people action that calls onFindPeople, not onOpen or onInvite', () => {
    const onOpen = jest.fn();
    const onInvite = jest.fn();
    const onFindPeople = jest.fn();
    const tree = render({ count: 0, followingNone: true, onOpen, onInvite, onFindPeople });

    expect(flattenText(tree.toJSON())).toContain('Find people to follow');
    expect(flattenText(tree.toJSON())).not.toContain('Nobody you follow has trained');
    expect(actionNamed(tree, 'Invite')).toBeUndefined();

    const action = actionNamed(tree, 'Find people');
    act(() => { action.props.onPress({ stopPropagation() {} }); });
    expect(onFindPeople).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
    expect(onInvite).not.toHaveBeenCalled();
  });

  test('following people who have not trained keeps the honest zero line and Invite', () => {
    const tree = render({ count: 0, followingNone: false, onOpen: jest.fn(), onInvite: jest.fn(), onFindPeople: jest.fn() });
    expect(flattenText(tree.toJSON())).toContain('Nobody you follow has trained yet today');
    expect(actionNamed(tree, 'Invite')).toBeDefined();
  });

  test('HomeScreen opens the Community tab People segment', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../../screens/HomeScreen.js'), 'utf8');
    expect(src).toContain("navigateCrossTab(navigation, 'CommunityTab', 'Community', { segment: 'people' })");
    expect(src).toMatch(/following_count != null && Number\(me\.profile\.following_count\) === 0/);
  });
});
