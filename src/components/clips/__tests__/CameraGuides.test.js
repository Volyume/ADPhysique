/**
 * CameraGuides (D229 addendum 10): the thirds grid and the horizon level that
 * help a person set the camera up before a video.
 *
 * Pinned:
 *   - nothing is drawn unless visible, and the grid is four hairlines;
 *   - the level is the progress-photo capture's: roll from atan2(x, y) of the
 *     accelerometer, amber (a different test id) within 1.5 degrees, rotated
 *     by the roll otherwise;
 *   - a sample that is not a number is dropped and the last good one kept
 *     (sensorSampleGuard: NaN would freeze the level);
 *   - under Reduce Motion the line does not rotate;
 *   - the sensor is subscribed only while visible, and released after;
 *   - decorative to a screen reader.
 */
import { act, create } from 'react-test-renderer';

const listeners = [];
const mockRemove = jest.fn();
jest.mock('expo-sensors', () => ({
  Accelerometer: {
    setUpdateInterval: jest.fn(),
    addListener: (fn) => { listeners.push(fn); return { remove: mockRemove }; },
  },
}), { virtual: false });

import CameraGuides from '../CameraGuides';

const sample = (x, y) => act(() => { listeners.forEach((fn) => fn({ x, y })); });
const byId = (tree, id) => tree.root.findAll((n) => typeof n.type === 'string' && n.props.testID === id);
const flat = (style) => Object.assign({}, ...[].concat(style).flat(Infinity).filter(Boolean));

beforeEach(() => { listeners.length = 0; mockRemove.mockClear(); });

test('nothing unless visible; the grid is four hairlines, decorative to a screen reader', () => {
  let tree;
  act(() => { tree = create(<CameraGuides visible={false} reduceMotion={false} />); });
  expect(tree.toJSON()).toBeNull();
  expect(listeners).toHaveLength(0);
  act(() => { tree.update(<CameraGuides visible reduceMotion={false} />); });
  const root = byId(tree, 'clip-camera-guides')[0];
  expect(root.props.pointerEvents).toBe('none');
  expect(root.props.accessibilityElementsHidden).toBe(true);
  // Four lines (host views) under the root, and no level yet.
  expect(tree.root.findAll((n) => typeof n.type === 'string' && n.type === 'View' && n !== root)).toHaveLength(4);
  expect(listeners).toHaveLength(1);
});

test('the level: hidden until a sample, rotated by the roll, amber within 1.5 degrees', () => {
  let tree;
  act(() => { tree = create(<CameraGuides visible reduceMotion={false} />); });
  expect(byId(tree, 'clip-camera-level')).toHaveLength(0);
  sample(Math.sin(10 * (Math.PI / 180)), Math.cos(10 * (Math.PI / 180))); // 10 degrees of roll
  const line = byId(tree, 'clip-camera-level')[0];
  expect(line).toBeTruthy();
  const rotate = flat(line.props.style).transform[0].rotate;
  expect(parseFloat(rotate)).toBeCloseTo(-10, 3);
  sample(0.01, 1); // well within 1.5 degrees
  expect(byId(tree, 'clip-camera-level-aligned')).toHaveLength(1);
  expect(byId(tree, 'clip-camera-level')).toHaveLength(0);
});

test('a sample that is not a number is dropped and the last good reading kept', () => {
  let tree;
  act(() => { tree = create(<CameraGuides visible reduceMotion={false} />); });
  sample(0.01, 1);
  expect(byId(tree, 'clip-camera-level-aligned')).toHaveLength(1);
  sample(NaN, NaN);
  sample(undefined, undefined);
  expect(byId(tree, 'clip-camera-level-aligned')).toHaveLength(1);
  expect(flat(byId(tree, 'clip-camera-level-aligned')[0].props.style).transform[0].rotate).not.toMatch(/NaN/);
});

test('under Reduce Motion the line does not rotate, but still turns amber when level', () => {
  let tree;
  act(() => { tree = create(<CameraGuides visible reduceMotion />); });
  sample(Math.sin(10 * (Math.PI / 180)), Math.cos(10 * (Math.PI / 180)));
  expect(flat(byId(tree, 'clip-camera-level')[0].props.style).transform).toEqual([]);
  sample(0, 1);
  expect(byId(tree, 'clip-camera-level-aligned')).toHaveLength(1);
});

test('the sensor is released when the guides go or the component unmounts', () => {
  let tree;
  act(() => { tree = create(<CameraGuides visible reduceMotion={false} />); });
  expect(listeners).toHaveLength(1);
  act(() => { tree.update(<CameraGuides visible={false} reduceMotion={false} />); });
  expect(mockRemove).toHaveBeenCalledTimes(1);
  act(() => { tree.update(<CameraGuides visible reduceMotion={false} />); });
  act(() => tree.unmount());
  expect(mockRemove).toHaveBeenCalledTimes(2);
});
