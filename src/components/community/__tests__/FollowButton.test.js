/**
 * FollowButton (blueprint section 6).
 *
 * V7a (docs/social-discovery-2026-09-06/81-VISUAL-RULINGS.md, Lead render
 * review): once connected, FollowButton renders icon-only when `iconOnly`
 * is passed and the state is `following` -- checkmark glyph, no label,
 * accessibility label "Following @<handle>" -- so the profile row reads
 * Following · Connected · Message on one line. Every other state ignores
 * `iconOnly` and renders as before.
 */
import { create, act } from 'react-test-renderer';

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
jest.mock('../../../lib/community', () => ({
  follow: jest.fn(),
  unfollow: jest.fn(),
}));

import FollowButton from '../FollowButton';
import ButtonComponent from '../../Button';

function findButton(tree) {
  return tree.root.findByType(ButtonComponent);
}

describe('FollowButton: iconOnly (V7a)', () => {
  const card = { user_id: 'u9', handle: 'rowan_lifts', display_name: 'Rowan M', relationship: { following: 'accepted' } };

  test('following + iconOnly: checkmark icon, no title, "Following @handle" label', async () => {
    let tree;
    await act(async () => { tree = create(<FollowButton card={card} iconOnly />); });
    const button = findButton(tree);
    expect(button.props.title).toBeUndefined();
    expect(button.props.icon).toBe('checkmark');
    expect(button.props.accessibilityLabel).toBe('Following @rowan_lifts');
  });

  test('following + iconOnly with no handle falls back to "Following"', async () => {
    let tree;
    const noHandle = { ...card, handle: null };
    await act(async () => { tree = create(<FollowButton card={noHandle} iconOnly />); });
    const button = findButton(tree);
    expect(button.props.accessibilityLabel).toBe('Following');
  });

  test('following without iconOnly keeps the title and outline icon', async () => {
    let tree;
    await act(async () => { tree = create(<FollowButton card={card} />); });
    const button = findButton(tree);
    expect(button.props.title).toBe('Following');
    expect(button.props.icon).toBe('checkmark-outline');
  });

  test('iconOnly has no effect on the follow (not-yet-following) state', async () => {
    let tree;
    const notFollowing = { ...card, relationship: { following: 'none' } };
    await act(async () => { tree = create(<FollowButton card={notFollowing} iconOnly />); });
    const button = findButton(tree);
    expect(button.props.title).toBe('Follow');
  });
});
