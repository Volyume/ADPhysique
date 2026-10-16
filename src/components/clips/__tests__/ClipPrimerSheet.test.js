/**
 * ClipPrimerSheet (D229 addendum 5): the one privacy line before the first
 * camera open. Pins the ruled words, the two actions and that leaving the sheet
 * any other way (swipe, tap outside, back) is "Not now".
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../../store/useAppStore', () => {
  const fn = (selector) => selector({ accessibility: { reduceMotion: true } });
  return { __esModule: true, default: fn };
});
jest.mock('../../../lib/haptics', () => ({ selection: jest.fn(), press: jest.fn() }));

import ClipPrimerSheet from '../ClipPrimerSheet';

function render(props = {}) {
  let tree;
  act(() => {
    tree = create(
      <ClipPrimerSheet
        visible
        onOpenCamera={props.onOpenCamera || (() => {})}
        onNotNow={props.onNotNow || (() => {})}
      />,
    );
  });
  return tree;
}

const press = (tree, label) => {
  const node = tree.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
  expect(node).toBeDefined();
  act(() => node.props.onPress());
};

describe('ClipPrimerSheet', () => {
  test('says what a clip is, in the ruled words', () => {
    const json = JSON.stringify(render().toJSON());
    expect(json).toContain('Videos stay on this phone');
    expect(json).toContain('Prop your phone up, tap the button, and get into position. Recording starts after the countdown and stops by itself. Each video is up to 15 seconds long, with no sound. Your videos are kept with the workout on this phone and are never uploaded.');
  });

  test('"Open camera" and "Not now" each fire their own handler once', () => {
    const onOpenCamera = jest.fn();
    const onNotNow = jest.fn();
    const tree = render({ onOpenCamera, onNotNow });
    press(tree, 'Open camera');
    expect(onOpenCamera).toHaveBeenCalledTimes(1);
    expect(onNotNow).not.toHaveBeenCalled();
    press(tree, 'Not now');
    expect(onNotNow).toHaveBeenCalledTimes(1);
  });

  test('closing the sheet any other way is "Not now"', () => {
    const onNotNow = jest.fn();
    const onOpenCamera = jest.fn();
    const tree = render({ onNotNow, onOpenCamera });
    const backdrop = tree.root.findAll((n) => n.props.accessibilityLabel === 'Close' && typeof n.props.onPress === 'function')[0];
    act(() => backdrop.props.onPress());
    expect(onNotNow).toHaveBeenCalledTimes(1);
    expect(onOpenCamera).not.toHaveBeenCalled();
  });

  test('renders nothing while it is not visible', () => {
    let tree;
    act(() => { tree = create(<ClipPrimerSheet visible={false} onOpenCamera={() => {}} onNotNow={() => {}} />); });
    expect(JSON.stringify(tree.toJSON())).not.toContain('Videos stay on this phone');
  });
});
