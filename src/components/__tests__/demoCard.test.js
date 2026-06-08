jest.mock('expo-image', () => ({ Image: require('react-native').View }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

import { Text } from 'react-native';
import { create, act } from 'react-test-renderer';
import DemoCard from '../DemoCard';
import IllustrationCard from '../IllustrationCard';

// Collect all rendered text strings in the tree.
function texts(tree) {
  return tree.root.findAllByType(Text)
    .map(n => (Array.isArray(n.props.children) ? n.props.children.join('') : n.props.children))
    .filter(t => typeof t === 'string');
}

describe('DemoCard renders the fallback when there is no media', () => {
  test('no demoUrl → IllustrationCard with the muscle label + "Technique guide below"', () => {
    let tree;
    act(() => {
      tree = create(<DemoCard exercise={{ name: 'Barbell Bench Press', primaryMuscleLabel: 'Chest' }} />);
    });
    // The fallback card is present...
    expect(tree.root.findAllByType(IllustrationCard).length).toBe(1);
    const t = texts(tree);
    expect(t).toContain('Chest');
    expect(t).toContain('Technique guide below');
  });

  test('with a demoUrl → it does NOT fall back (renders the media card instead)', () => {
    let tree;
    act(() => {
      tree = create(<DemoCard exercise={{ name: 'X', demoUrl: 'https://example/x.webp', primaryMuscleLabel: 'Chest' }} />);
    });
    expect(tree.root.findAllByType(IllustrationCard).length).toBe(0);
    expect(texts(tree)).toContain('How to perform');
  });
});
