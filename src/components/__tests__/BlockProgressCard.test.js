/**
 * BlockProgressCard — Progress-tab product-coherence ruling (lead brief,
 * this campaign): the Consistency screen's BlockShapeCard directly above
 * this card already states "Week N of M · <phase>", so this card's own
 * header no longer restates the week — only the effort/recovery/finished
 * state for it. Pins:
 *  1. The three non-repeating header states (finished / deload / effort).
 *  2. The old "Week N/M · ..." restatement never reappears.
 *  3. With `onPress` supplied the card renders as a pressable button (via
 *     the shared PressableCard primitive) that calls onPress when tapped;
 *     without it, there is no button role at all (plain View, unchanged).
 */
import { create, act } from 'react-test-renderer';
import BlockProgressCard from '../BlockProgressCard';

const BLOCK_PROGRESS = [{ muscle: 'chest', label: 'Chest', actual: 8, planned: 12 }];

function texts(tree) {
  return tree.root.findAllByType(require('react-native').Text).map((n) => [].concat(n.props.children).join(''));
}

describe('BlockProgressCard header no longer restates the week', () => {
  test('awaitingDecision -> "Block finished" (unchanged)', () => {
    let tree;
    act(() => {
      tree = create(
        <BlockProgressCard
          blockProgress={BLOCK_PROGRESS}
          currentMesoWeek={{ weekIndex: 5, plannedWeeks: 5, awaitingDecision: true }}
        />
      );
    });
    expect(texts(tree)).toContain('Block finished');
  });

  test('isDeload -> "Recovery week", not "Week N/M"', () => {
    let tree;
    act(() => {
      tree = create(
        <BlockProgressCard
          blockProgress={BLOCK_PROGRESS}
          currentMesoWeek={{ weekIndex: 5, plannedWeeks: 5, isDeload: true, rirTarget: 4 }}
        />
      );
    });
    const all = texts(tree);
    expect(all).toContain('Recovery week');
    expect(all.join(' | ')).not.toMatch(/Week \d+\/\d+/);
  });

  test('otherwise -> "Effort X/5", derived from rirTarget, no week restated', () => {
    let tree;
    act(() => {
      tree = create(
        <BlockProgressCard
          blockProgress={BLOCK_PROGRESS}
          currentMesoWeek={{ weekIndex: 2, plannedWeeks: 5, isDeload: false, rirTarget: 2 }}
        />
      );
    });
    const all = texts(tree);
    expect(all).toContain('Effort 3/5');
    expect(all.join(' | ')).not.toMatch(/Week \d+\/\d+/);
  });

  test('rirTarget null and not deload/finished -> no week text at all', () => {
    let tree;
    act(() => {
      tree = create(
        <BlockProgressCard
          blockProgress={BLOCK_PROGRESS}
          currentMesoWeek={{ weekIndex: 2, plannedWeeks: 5, isDeload: false, rirTarget: null }}
        />
      );
    });
    const all = texts(tree);
    expect(all.some((t) => t.startsWith('Effort'))).toBe(false);
    expect(all.join(' | ')).not.toMatch(/Week \d+\/\d+/);
  });
});

describe('BlockProgressCard onPress (pressable when supplied, plain otherwise)', () => {
  test('with onPress: renders a pressable button that calls onPress when pressed', () => {
    const onPress = jest.fn();
    let tree;
    act(() => {
      tree = create(
        <BlockProgressCard
          blockProgress={BLOCK_PROGRESS}
          currentMesoWeek={{ weekIndex: 2, plannedWeeks: 5, rirTarget: 2 }}
          onPress={onPress}
        />
      );
    });
    const button = tree.root.findByProps({ accessibilityRole: 'button' });
    expect(button.props.accessibilityHint).toBe('Opens weekly volume by muscle');
    act(() => { button.props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('without onPress: the card itself carries no button role (plain View, unchanged)', () => {
    let tree;
    act(() => {
      tree = create(
        <BlockProgressCard
          blockProgress={BLOCK_PROGRESS}
          currentMesoWeek={{ weekIndex: 2, plannedWeeks: 5, rirTarget: 2 }}
        />
      );
    });
    // The outermost rendered host element is a plain View, not a Pressable.
    expect(tree.toJSON().type).toBe('View');
    // No element anywhere carries the onPress-only hint (InfoTooltip's own
    // internal Close button is unrelated and still renders regardless).
    const hinted = tree.root.findAll((n) => n.props.accessibilityHint === 'Opens weekly volume by muscle');
    expect(hinted.length).toBe(0);
  });
});
