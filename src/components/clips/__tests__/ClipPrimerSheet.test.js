/**
 * ClipPrimerSheet (D229 addendum 5): the one privacy line before the first
 * camera open. Pins the ruled words, the two actions and that leaving the sheet
 * any other way (swipe, tap outside, back) is "Not now".
 */
import { create, act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    // Addendum 13 (two minutes) and addendum 14 (where the videos are kept);
    // the default setting reads 7 days.
    expect(json).toContain('Prop your phone up, tap the button, and get into position. Recording starts after the countdown and stops by itself at the length you choose, up to two minutes, with no sound. Your share uses up to 15 seconds of it; you choose which. Your videos are kept with the workout on this phone and are never uploaded. During a workout, find them under the three dots on the exercise, in Your videos; after it, under the workout in History. Each video is removed after 7 days unless you tap Keep on it there. You can change the 7 days in Settings, under Your data. Keep bright lights behind the phone, not behind you. The clear band across the middle of the picture is where the share shows your lift best.');
  });

  test('the keep sentences follow the person\'s own setting, read when the sheet opens', async () => {
    const { KEEP_DAYS_KEY } = require('../../../lib/clips/rules');
    await AsyncStorage.setItem(KEEP_DAYS_KEY, '30');
    let tree;
    await act(async () => { tree = create(<ClipPrimerSheet visible onOpenCamera={() => {}} onNotNow={() => {}} />); });
    await act(async () => {});
    let json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Each video is removed after 30 days unless you tap Keep on it there. You can change the 30 days in Settings, under Your data.');
    expect(json).not.toContain('after 7 days');
    await AsyncStorage.setItem(KEEP_DAYS_KEY, '0');
    await act(async () => { tree = create(<ClipPrimerSheet visible onOpenCamera={() => {}} onNotNow={() => {}} />); });
    await act(async () => {});
    json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Your videos stay until you delete them. You can change this in Settings, under Your data.');
    expect(json).not.toMatch(/removed after/);
    await AsyncStorage.removeItem(KEEP_DAYS_KEY);
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
