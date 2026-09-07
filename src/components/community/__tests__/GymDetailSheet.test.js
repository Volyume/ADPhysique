/**
 * GymDetailSheet tests (community product audit 2026-09-07, founder brief
 * "COMMUNITY ONBOARDING — SLICK 'WHERE DO YOU TRAIN?' GYM FINDER").
 *
 * Pins: the sheet shows the gym name immediately from the tapped row
 * (before any fetch lands), then enriches with `get(id)`'s address, town,
 * postcode; "Visit website" appears only when `officialWebsite()` allows
 * it; "Select this gym" always works, even before/without a successful
 * fetch, and hands the caller the merged venue (distance from the row
 * survives the merge); `onClose` dismisses without confirming.
 */

import { create, act } from 'react-test-renderer';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ accessibility: { reduceMotion: true } }),
}));
jest.mock('../../../lib/gyms', () => {
  const actual = jest.requireActual('../../../lib/gyms');
  return { ...actual, get: jest.fn() };
});

import GymDetailSheet from '../GymDetailSheet';
import { get } from '../../../lib/gyms';

// react-native Linking is steered per test (ShareCardScreen's own pattern).
const { Linking } = require('react-native');

const ROW = {
  id: 'v1', display_name: 'PureGym Motherwell', name: 'PureGym Motherwell',
  brand: 'PureGym', town: 'Motherwell', outward: 'ML1', distance_m: 1200,
};

const FULL = {
  id: 'v1', display_name: 'PureGym Motherwell', name: 'PureGym Motherwell', brand: 'PureGym',
  town: 'Motherwell', outward: 'ML1', postcode: 'ML1 1AA', address_line: '1 Windmillhill Street',
  website: 'https://www.puregym.com/gyms/motherwell/', verification_status: 'verified',
  source_names: ['PureGym'],
};

function texts(tree) {
  const out = [];
  const walk = (node) => {
    if (node == null) return;
    if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.children) walk(node.children);
  };
  walk(tree.toJSON());
  return out.join(' | ');
}

function byLabel(tree, label) {
  return tree.root.findAll(
    (n) => typeof n.type === 'function' && n.props?.accessibilityLabel === label,
  )[0];
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 12; i += 1) await Promise.resolve();
  });
}

function render(props = {}) {
  let tree = null;
  act(() => {
    tree = create(<GymDetailSheet visible venue={ROW} onClose={() => {}} onConfirm={() => {}} {...props} />);
  });
  return tree;
}

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue(null);
  Linking.openURL = jest.fn(() => Promise.resolve());
});

test('shows the gym name from the row immediately, before the fetch resolves', () => {
  get.mockReturnValue(new Promise(() => {})); // never resolves in this test
  const tree = render();
  expect(texts(tree)).toContain('PureGym Motherwell');
  act(() => { tree.unmount(); });
});

test('once get() resolves, shows address, town/outward and postcode', async () => {
  get.mockResolvedValue(FULL);
  const tree = render();
  await flush();

  const text = texts(tree);
  expect(text).toContain('1 Windmillhill Street');
  expect(text).toContain('Motherwell · ML1');
  expect(text).toContain('ML1 1AA');
  act(() => { tree.unmount(); });
});

test('"Visit website" appears when officialWebsite() allows it, and opens externally', async () => {
  get.mockResolvedValue(FULL);
  const tree = render();
  await flush();

  const button = byLabel(tree, 'Visit website, opens outside Volyume');
  expect(button).toBeDefined();
  await act(async () => { await button.props.onPress(); });
  expect(Linking.openURL).toHaveBeenCalledWith('https://www.puregym.com/gyms/motherwell/');
  act(() => { tree.unmount(); });
});

test('"Visit website" is absent when the venue is not operator-confirmed', async () => {
  get.mockResolvedValue({ ...FULL, verification_status: 'unverified', source_names: [] });
  const tree = render();
  await flush();

  expect(byLabel(tree, 'Visit website, opens outside Volyume')).toBeUndefined();
  act(() => { tree.unmount(); });
});

test('"Visit website" is absent when the website is an aggregator/social host', async () => {
  get.mockResolvedValue({ ...FULL, website: 'https://www.facebook.com/puregymmotherwell' });
  const tree = render();
  await flush();

  expect(byLabel(tree, 'Visit website, opens outside Volyume')).toBeUndefined();
  act(() => { tree.unmount(); });
});

describe('"Select this gym"', () => {
  test('confirms with the merged venue: get()\'s fields plus the row\'s own distance', async () => {
    get.mockResolvedValue(FULL);
    const onConfirm = jest.fn();
    const tree = render({ onConfirm });
    await flush();

    act(() => { byLabel(tree, 'Select PureGym Motherwell').props.onPress(); });

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
      id: 'v1', postcode: 'ML1 1AA', address_line: '1 Windmillhill Street', distance_m: 1200,
    }));
    act(() => { tree.unmount(); });
  });

  test('still works even before the fetch has resolved (never blocked on it)', async () => {
    get.mockReturnValue(new Promise(() => {}));
    const onConfirm = jest.fn();
    const tree = render({ onConfirm });

    act(() => { byLabel(tree, 'Select PureGym Motherwell').props.onPress(); });
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1' }));
    act(() => { tree.unmount(); });
  });

  test('still works after a failed fetch (offline), on whatever the row already carried', async () => {
    get.mockRejectedValue(new Error('offline'));
    const onConfirm = jest.fn();
    const tree = render({ onConfirm });
    await flush();

    act(() => { byLabel(tree, 'Select PureGym Motherwell').props.onPress(); });
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1', town: 'Motherwell' }));
    act(() => { tree.unmount(); });
  });
});

test('onClose dismisses without confirming', () => {
  const onClose = jest.fn();
  const onConfirm = jest.fn();
  const tree = render({ onClose, onConfirm });

  const close = tree.root.findAll(
    (n) => n.props?.accessibilityLabel === 'Close' && typeof n.props.onPress === 'function',
  )[0];
  act(() => { close.props.onPress(); });

  expect(onClose).toHaveBeenCalled();
  expect(onConfirm).not.toHaveBeenCalled();
  act(() => { tree.unmount(); });
});

test('renders nothing when there is no venue', () => {
  const tree = render({ venue: null });
  expect(tree.toJSON()).toBeNull();
  act(() => { tree.unmount(); });
});
