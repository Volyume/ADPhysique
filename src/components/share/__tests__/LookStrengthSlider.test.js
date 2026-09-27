/**
 * LookStrengthSlider — the photo-look strength control (founder, 2026-09-27:
 * "Maybe even the option to up and down the filter").
 *
 * The drag/tap gesture is not exercised here: this repo's
 * react-native-gesture-handler has no JS gesture engine in the Jest ("node")
 * test env (__mocks__/react-native-gesture-handler.js -- every gesture
 * builder call is a no-op stub, so nothing is ever actually recognised or
 * driven by mounting). What IS exercised, and is the whole of what the
 * SPEC requires be tested here, are the plain-callback accessibility
 * actions: accessibilityRole "adjustable", accessibilityValue {min, max,
 * now}, and increment/decrement moving the value by 10 within 0 to 100.
 *
 * Written to FAIL on a component with no accessibility route to the same
 * control (e.g. gesture-only), or one whose step size or clamping is wrong.
 */

const React = require('react');
const TestRenderer = require('react-test-renderer');
const LookStrengthSlider = require('../LookStrengthSlider').default;

function findAdjustable(tree) {
  return tree.root.findAll((n) => n.props && n.props.accessibilityRole === 'adjustable')[0];
}

function mount(props) {
  let tree = null;
  TestRenderer.act(() => {
    tree = TestRenderer.create(React.createElement(LookStrengthSlider, props));
  });
  return tree;
}

function fireAction(node, name) {
  TestRenderer.act(() => {
    node.props.onAccessibilityAction({ nativeEvent: { actionName: name } });
  });
}

describe('LookStrengthSlider accessibility', () => {
  test('is an adjustable control with min 0, max 100 and the current value', () => {
    const tree = mount({ value: 42, onValueChange: jest.fn(), onSlidingComplete: jest.fn() });
    const node = findAdjustable(tree);
    expect(node).toBeTruthy();
    expect(node.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 42 });
    expect(node.props.accessibilityActions).toEqual([{ name: 'increment' }, { name: 'decrement' }]);
  });

  test('uses the caller-supplied accessibility label, defaulting to "Look strength"', () => {
    const tree = mount({ value: 50, onValueChange: jest.fn(), onSlidingComplete: jest.fn() });
    expect(findAdjustable(tree).props.accessibilityLabel).toBe('Look strength');

    const treeCustom = mount({
      value: 50, onValueChange: jest.fn(), onSlidingComplete: jest.fn(), accessibilityLabel: 'Overlay strength',
    });
    expect(findAdjustable(treeCustom).props.accessibilityLabel).toBe('Overlay strength');
  });

  test('increment raises the value by 10 and calls both callbacks with the new value', () => {
    const onValueChange = jest.fn();
    const onSlidingComplete = jest.fn();
    const tree = mount({ value: 40, onValueChange, onSlidingComplete });
    fireAction(findAdjustable(tree), 'increment');
    expect(onValueChange).toHaveBeenCalledWith(50);
    expect(onSlidingComplete).toHaveBeenCalledWith(50);
  });

  test('decrement lowers the value by 10', () => {
    const onValueChange = jest.fn();
    const onSlidingComplete = jest.fn();
    const tree = mount({ value: 40, onValueChange, onSlidingComplete });
    fireAction(findAdjustable(tree), 'decrement');
    expect(onValueChange).toHaveBeenCalledWith(30);
    expect(onSlidingComplete).toHaveBeenCalledWith(30);
  });

  test('never increments past 100', () => {
    const onSlidingComplete = jest.fn();
    const tree = mount({ value: 95, onValueChange: jest.fn(), onSlidingComplete });
    fireAction(findAdjustable(tree), 'increment');
    expect(onSlidingComplete).toHaveBeenCalledWith(100);
  });

  test('never decrements below 0', () => {
    const onSlidingComplete = jest.fn();
    const tree = mount({ value: 5, onValueChange: jest.fn(), onSlidingComplete });
    fireAction(findAdjustable(tree), 'decrement');
    expect(onSlidingComplete).toHaveBeenCalledWith(0);
  });

  test('an unrecognised action is a no-op', () => {
    const onValueChange = jest.fn();
    const onSlidingComplete = jest.fn();
    const tree = mount({ value: 40, onValueChange, onSlidingComplete });
    fireAction(findAdjustable(tree), 'magic');
    expect(onValueChange).not.toHaveBeenCalled();
    expect(onSlidingComplete).not.toHaveBeenCalled();
  });
});

// The gestures set React state, so their callbacks must run on the JS thread:
// with Reanimated installed they otherwise run on the UI thread, where a state
// setter throws on a real phone. Jest has no gesture engine, so this is pinned
// on the source.
describe('the slider gestures run their callbacks on the JS thread', () => {
  const SRC = require('fs').readFileSync(require('path').join(__dirname, '..', 'LookStrengthSlider.js'), 'utf8');
  test('both the pan and the tap say so', () => {
    expect(SRC).toMatch(/Gesture\.Pan\(\)\s*\.runOnJS\(true\)/);
    expect(SRC).toMatch(/Gesture\.Tap\(\)\s*\.runOnJS\(true\)/);
  });
});
