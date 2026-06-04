/**
 * AnimatedEntrance mounts in both motion modes and never throws. Reanimated
 * is mocked globally (__mocks__/react-native-reanimated.js).
 */
import { Text } from 'react-native';
import { create, act } from 'react-test-renderer';

import AnimatedEntrance from '../AnimatedEntrance';
import useAppStore from '../../store/useAppStore';

function mountIt(props = {}) {
  let tree;
  act(() => {
    tree = create(
      <AnimatedEntrance {...props}><Text>hello</Text></AnimatedEntrance>,
    );
  });
  return tree;
}

afterEach(() => {
  act(() => { useAppStore.setState({ accessibility: { reduceMotion: false } }); });
});

test('renders its children (motion on)', () => {
  act(() => { useAppStore.setState({ accessibility: { reduceMotion: false } }); });
  const tree = mountIt();
  expect(JSON.stringify(tree.toJSON())).toContain('hello');
});

test('renders a plain view with children when reduce-motion is on', () => {
  act(() => { useAppStore.setState({ accessibility: { reduceMotion: true } }); });
  const tree = mountIt();
  expect(JSON.stringify(tree.toJSON())).toContain('hello');
});

test('a staggered list index does not throw', () => {
  act(() => { useAppStore.setState({ accessibility: { reduceMotion: false } }); });
  expect(() => mountIt({ index: 5 })).not.toThrow();
  expect(() => mountIt({ index: 50 })).not.toThrow();
});
