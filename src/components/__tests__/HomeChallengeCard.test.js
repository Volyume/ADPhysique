/**
 * HomeChallengeCard (gym challenge SPEC section 2): the slim Today row for an
 * entrant. Pins the title, the score out of 100, the days left, the tap
 * through, and that an ended challenge no longer counts days.
 */
import { create, act } from 'react-test-renderer';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);

import HomeChallengeCard from '../HomeChallengeCard';

function texts(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(texts).join(' ');
  return texts(node.children);
}

const ROW = { id: 'c1', title: 'Volt Gym November', status: 'active', days_left: 12, total: 62 };

test('shows the title, the score out of 100 and the days left, and opens on tap', () => {
  const onOpen = jest.fn();
  let tree;
  act(() => { tree = create(<HomeChallengeCard challenge={ROW} onOpen={onOpen} />); });
  const out = texts(tree.toJSON());
  expect(out).toContain('Volt Gym November');
  expect(out).toContain('Your score: 62 of 100');
  expect(out).toContain('12 days left');
  const press = tree.root.findAll((n) => typeof n.props?.onPress === 'function' && n.props.accessibilityLabel)[0];
  act(() => { press.props.onPress(); });
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test('an ended challenge says the scores are being confirmed, not a day count', () => {
  let tree;
  act(() => { tree = create(<HomeChallengeCard challenge={{ ...ROW, status: 'ended' }} onOpen={jest.fn()} />); });
  const out = texts(tree.toJSON());
  expect(out).toContain('Finished, scores being confirmed');
  expect(out).not.toContain('days left');
});
