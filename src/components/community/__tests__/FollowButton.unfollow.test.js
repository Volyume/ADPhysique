/**
 * FollowButton unfollow toast (audit 2026-10-17, item c): unfollowing says
 * "Unfollowed @handle." with an Undo that follows again. A plain follow
 * shows no toast.
 */
import { create, act } from 'react-test-renderer';

const mockShow = jest.fn();
jest.mock('../../../store/useAppStore', () => ({
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
jest.mock('../../Toast', () => ({ useToast: () => ({ show: mockShow }) }));
jest.mock('../../../lib/community', () => ({
  follow: jest.fn(() => Promise.resolve({ state: 'accepted' })),
  unfollow: jest.fn(() => Promise.resolve({})),
}));

import FollowButton from '../FollowButton';
import ButtonComponent from '../../Button';
import { follow, unfollow } from '../../../lib/community';

const card = { user_id: 'u9', handle: 'rowan_lifts', display_name: 'Rowan M', relationship: { following: 'accepted' } };

beforeEach(() => jest.clearAllMocks());

test('unfollowing toasts "Unfollowed @handle." and Undo follows again', async () => {
  const onChange = jest.fn();
  let tree;
  await act(async () => { tree = create(<FollowButton card={card} onChange={onChange} />); });
  await act(async () => { await tree.root.findByType(ButtonComponent).props.onPress(); });

  expect(unfollow).toHaveBeenCalledWith('u9');
  expect(mockShow).toHaveBeenCalledTimes(1);
  const [line, opts] = mockShow.mock.calls[0];
  expect(line).toBe('Unfollowed @rowan_lifts.');
  expect(opts.variant).toBe('undo');
  expect(opts.action.label).toBe('Undo');

  await act(async () => { await opts.action.onPress(); });
  expect(follow).toHaveBeenCalledWith('u9');
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ following: 'accepted' }), card);
});

test('Undo on a followers-only profile reports a request, as the server answers', async () => {
  follow.mockResolvedValueOnce({ state: 'requested' });
  const onChange = jest.fn();
  let tree;
  await act(async () => { tree = create(<FollowButton card={card} onChange={onChange} />); });
  await act(async () => { await tree.root.findByType(ButtonComponent).props.onPress(); });
  await act(async () => { await mockShow.mock.calls[0][1].action.onPress(); });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ following: 'requested' }), card);
});

test('a plain follow shows no toast', async () => {
  const none = { ...card, relationship: { following: 'none' } };
  let tree;
  await act(async () => { tree = create(<FollowButton card={none} />); });
  await act(async () => { await tree.root.findByType(ButtonComponent).props.onPress(); });
  expect(follow).toHaveBeenCalledWith('u9');
  expect(mockShow).not.toHaveBeenCalled();
});
