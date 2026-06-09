jest.mock('expo-image', () => ({ Image: function MockExpoImage() { return null; } }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
// Control Reduce Motion deterministically; reduce-motion path renders statically
// (no Animated.loop), keeping the test free of native-driver timers.
let mockReduceMotion = true;
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (selector) => selector({ accessibility: { reduceMotion: mockReduceMotion } }),
}));

import { Text } from 'react-native';
import { Image } from 'expo-image';
import { create, act } from 'react-test-renderer';
import DemoCard from '../DemoCard';
import IllustrationCard from '../IllustrationCard';

function texts(tree) {
  return tree.root.findAllByType(Text)
    .map(n => (Array.isArray(n.props.children) ? n.props.children.join('') : n.props.children))
    .filter(t => typeof t === 'string');
}

describe('DemoCard', () => {
  test('no media, no frames → IllustrationCard fallback', () => {
    let tree;
    act(() => { tree = create(<DemoCard exercise={{ name: 'X', primaryMuscleLabel: 'Chest' }} />); });
    expect(tree.root.findAllByType(IllustrationCard).length).toBe(1);
  });

  test('localFrames → renders both frames + a public-domain demo caption (offline loop)', () => {
    mockReduceMotion = true;
    let tree;
    act(() => {
      tree = create(<DemoCard exercise={{ name: 'Barbell Bench Press', primaryMuscleLabel: 'Chest' }} localFrames={[1, 2]} />);
    });
    // Not the fallback...
    expect(tree.root.findAllByType(IllustrationCard).length).toBe(0);
    // ...both start and end frames are rendered...
    expect(tree.root.findAllByType(Image).length).toBe(2);
    // ...and it is honestly labelled.
    expect(texts(tree)).toContain('Reference demo · public domain');
  });

  test('demoUrl present → uses real media path, not the fallback or the frame loop', () => {
    let tree;
    act(() => {
      tree = create(<DemoCard exercise={{ name: 'X', demoUrl: 'https://e/x.webp', primaryMuscleLabel: 'Chest' }} localFrames={[1, 2]} />);
    });
    expect(tree.root.findAllByType(IllustrationCard).length).toBe(0);
    expect(texts(tree)).toContain('How to perform');
  });
});
