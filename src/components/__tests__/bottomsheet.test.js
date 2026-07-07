/**
 * BottomSheet chrome tests. Run with reduce-motion on (via the store mock)
 * so mount/unmount is synchronous and deterministic.
 */
import { Text } from 'react-native';
import { create, act } from 'react-test-renderer';

// Force reduce-motion so the sheet skips animation and unmounts synchronously.
jest.mock('../../store/useAppStore', () => {
  const fn = (selector) => selector({ accessibility: { reduceMotion: true } });
  return { __esModule: true, default: fn };
});

import BottomSheet from '../BottomSheet';

describe('BottomSheet', () => {
  test('renders children when visible', () => {
    let tree;
    act(() => {
      tree = create(
        <BottomSheet visible onClose={() => {}}><Text>Sheet body</Text></BottomSheet>
      );
    });
    expect(JSON.stringify(tree.toJSON())).toContain('Sheet body');
  });

  test('renders nothing when not visible', () => {
    let tree;
    act(() => {
      tree = create(
        <BottomSheet visible={false} onClose={() => {}}><Text>hidden</Text></BottomSheet>
      );
    });
    expect(tree.toJSON()).toBeNull();
  });

  test('tapping the backdrop calls onClose', () => {
    const onClose = jest.fn();
    let tree;
    act(() => {
      tree = create(
        <BottomSheet visible onClose={onClose}><Text>x</Text></BottomSheet>
      );
    });
    const closer = tree.root.findByProps({ accessibilityLabel: 'Close' });
    act(() => closer.props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('the panel is marked as a modal for assistive tech', () => {
    let tree;
    act(() => {
      tree = create(
        <BottomSheet visible onClose={() => {}} accessibilityLabel="Quick add"><Text>x</Text></BottomSheet>
      );
    });
    const panel = tree.root.findByProps({ accessibilityViewIsModal: true });
    expect(panel.props.accessibilityLabel).toBe('Quick add');
  });

  test('scrolling sheets shrink inside the panel instead of overflowing', () => {
    let tree;
    act(() => {
      tree = create(
        <BottomSheet visible scroll onClose={() => {}}><Text>Long sheet body</Text></BottomSheet>
      );
    });
    const scroll = tree.root.findByProps({ keyboardShouldPersistTaps: 'handled' });
    expect(scroll.props.style).toMatchObject({ flexShrink: 1 });
    expect(scroll.props.nestedScrollEnabled).toBe(true);
    expect(scroll.props.showsVerticalScrollIndicator).toBe(true);
    expect(JSON.stringify(tree.toJSON())).toContain('Long sheet body');
  });

  test('unmounts after visible flips to false (reduce motion: synchronous)', () => {
    const onClose = jest.fn();
    let tree;
    act(() => {
      tree = create(
        <BottomSheet visible onClose={onClose}><Text>body</Text></BottomSheet>
      );
    });
    expect(tree.toJSON()).not.toBeNull();
    act(() => { tree.update(<BottomSheet visible={false} onClose={onClose}><Text>body</Text></BottomSheet>); });
    expect(tree.toJSON()).toBeNull();
  });
});
