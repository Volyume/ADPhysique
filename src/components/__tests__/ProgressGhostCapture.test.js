/**
 * ProgressGhostCapture — the ghost-overlay capture guide.
 *
 * Pins the load-bearing behaviour of the differentiator surface:
 *   1. with a reference photo it renders a camera preview + the ghost overlay,
 *   2. it exposes an adjustable opacity control for that overlay,
 *   3. capture writes through saveProgressPhoto, THEN records the pose via
 *      upsertPhotoMeta, THEN calls onCaptured (order matters: the meta row keys
 *      off the saved filename),
 *   4. a hard-denied camera permission never crashes and shows the calm
 *      photo-library fallback affordance.
 *
 * expo-camera and expo-sensors are native modules; both are mocked here.
 */

import { create, act } from 'react-test-renderer';

import ProgressGhostCapture from '../ProgressGhostCapture';
import useAppStore from '../../store/useAppStore';

// Mutable permission the mocked hook returns (mock-prefixed so the jest.mock
// factory may close over it).
let mockPermission = { granted: true, canAskAgain: true };
const mockRequestPermission = jest.fn(async () => mockPermission);
const mockTakePicture = jest.fn(async () => ({ uri: 'file:///captured.jpg' }));

jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    CameraView: React.forwardRef(function CameraView(props, ref) {
      React.useImperativeHandle(ref, () => ({ takePictureAsync: mockTakePicture }));
      return React.createElement(View, props, props.children);
    }),
    useCameraPermissions: () => [mockPermission, mockRequestPermission],
  };
});

jest.mock('expo-sensors', () => ({
  Accelerometer: {
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

// Order tracker for the capture pipeline.
const order = [];
jest.mock('../../lib/progressPhotos', () => ({
  saveProgressPhoto: jest.fn(async () => {
    order.push('save');
    return { name: '1700000000000.jpg', uri: 'file:///photos/1700000000000.jpg', ts: 1700000000000 };
  }),
}));
jest.mock('../../lib/progressPhotoMeta', () => ({
  upsertPhotoMeta: jest.fn(async () => {
    order.push('meta');
    return {};
  }),
}));

const { saveProgressPhoto } = require('../../lib/progressPhotos');
const { upsertPhotoMeta } = require('../../lib/progressPhotoMeta');

const REF = { uri: 'file:///photos/ref.jpg' };

async function render(props = {}) {
  let tree;
  await act(async () => {
    tree = create(<ProgressGhostCapture {...props} />);
  });
  return tree;
}

beforeEach(() => {
  mockPermission = { granted: true, canAskAgain: true };
  order.length = 0;
  jest.clearAllMocks();
});

test('renders the camera preview and the ghost overlay when a reference is given', async () => {
  const tree = await render({ referencePhoto: REF, pose: 'front' });
  const json = JSON.stringify(tree.toJSON());
  // Neutral framing copy, no cadence.
  expect(json).toContain('Line up your last photo');
  // The ghost overlay image carries the reference uri.
  expect(json).toContain('file:///photos/ref.jpg');
});

test('exposes an adjustable opacity control for the overlay', async () => {
  const tree = await render({ referencePhoto: REF, pose: 'front' });
  const adjustables = tree.root.findAll((n) => n.props?.accessibilityRole === 'adjustable');
  expect(adjustables.length).toBeGreaterThan(0);
  const slider = adjustables[0];
  expect(slider.props.accessibilityValue).toMatchObject({ min: 15, max: 85 });
  // Increment action nudges the reported opacity up without throwing.
  const before = slider.props.accessibilityValue.now;
  act(() => {
    slider.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
  });
  const after = tree.root.findAll((n) => n.props?.accessibilityRole === 'adjustable')[0]
    .props.accessibilityValue.now;
  expect(after).toBeGreaterThan(before);
});

test('capture saves the photo, then records the pose, then calls onCaptured (in order)', async () => {
  act(() => { useAppStore.setState({ tier: 'pro' }); });
  const onCaptured = jest.fn();
  const tree = await render({ referencePhoto: REF, pose: 'side', onCaptured });

  const captureBtn = tree.root.find((n) => n.props?.accessibilityLabel === 'Take photo');
  await act(async () => {
    await captureBtn.props.onPress();
  });

  expect(saveProgressPhoto).toHaveBeenCalledWith('file:///captured.jpg');
  expect(upsertPhotoMeta).toHaveBeenCalledWith(
    undefined, // no signed-in user in this bare test store
    '1700000000000.jpg',
    { pose: 'side' },
  );
  expect(onCaptured).toHaveBeenCalledWith('1700000000000.jpg');
  // Order is load-bearing: the meta row keys off the saved filename.
  expect(order).toEqual(['save', 'meta']);
});

test('capture is blocked when the live tier is no longer pro (mid-modal flip)', async () => {
  act(() => { useAppStore.setState({ tier: 'pro' }); });
  const onCaptured = jest.fn();
  const tree = await render({ referencePhoto: REF, pose: 'side', onCaptured });

  // The tier flips to free while the capture modal is open.
  act(() => { useAppStore.setState({ tier: 'free' }); });

  const captureBtn = tree.root.find((n) => n.props?.accessibilityLabel === 'Take photo');
  await act(async () => {
    await captureBtn.props.onPress();
  });

  // No write, no meta, no callback: the shutter is inert for a lapsed user.
  expect(saveProgressPhoto).not.toHaveBeenCalled();
  expect(upsertPhotoMeta).not.toHaveBeenCalled();
  expect(onCaptured).not.toHaveBeenCalled();
});

test('a hard-denied permission shows the calm photo-library fallback, no crash', async () => {
  mockPermission = { granted: false, canAskAgain: false };
  const onFallback = jest.fn();
  const tree = await render({ referencePhoto: REF, pose: 'front', onFallback });

  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain('Camera access is off');
  expect(json).toContain('Use your photo library');
  // The capture pipeline never ran.
  expect(saveProgressPhoto).not.toHaveBeenCalled();

  const fallbackBtn = tree.root.find(
    (n) => n.props?.accessibilityLabel === 'Add a photo from your library',
  );
  act(() => { fallbackBtn.props.onPress(); });
  expect(onFallback).toHaveBeenCalled();
});
