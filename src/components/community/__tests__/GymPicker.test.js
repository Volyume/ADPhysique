/**
 * GymPicker: the gym finder (gym database blueprint
 * `docs/gym-database-2026-09-06/20-BLUEPRINT.md`, GD-09, GD-11, GD-13;
 * community product audit 2026-09-07,
 * `docs/community-product-audit-2026-09-07/30-IMPLEMENTATION.md` section
 * 1.2).
 *
 * What this suite pins:
 *  - the text search is debounced (250ms), never one read per keystroke;
 *  - a result row reads "display name" then "town · outward · X.X miles"
 *    (one decimal, always, the word "miles");
 *  - a venue still waiting on its second confirmation carries a "Pending"
 *    badge, and a typed postcode shows the recognised-postcode chip;
 *  - once a centroid is known, the "5 · 10 · 25 · 50 miles" band appears,
 *    defaults to 5, and stepping it re-queries `near()` at the new radius;
 *  - a truncated near list shows the "Showing the nearest 40" footer;
 *  - the empty state offers "Can't find your gym? Add it", which
 *    navigates to CommunityGymAdd carrying the typed text AND this
 *    picker's own `onSelect`, so an added gym is selected here;
 *  - "Use my location" appears only when `deviceLocation.isAvailable()`
 *    is true, and never persists the coordinate it obtains; a `denied`
 *    refusal withdraws the button and shows the calm line instead of
 *    re-prompting, and a `timeout` says so without hanging the picker;
 *  - selecting a row calls `onSelect` with the venue;
 *  - a query under the minimum length never reaches the network.
 *
 * FlashList is the react-native manual mock's FlatList passthrough host
 * (jest moduleNameMapper), which does not render its cells in this test
 * environment (the same reason `CommunityHub.states.test.js` renders
 * `ListHeaderComponent`/`ListEmptyComponent` as their own trees rather
 * than reading them out of the mounted list). This suite follows the
 * same convention: pull `renderItem`, `ListEmptyComponent` and
 * `ListFooterComponent` off the FlatList element itself and render each
 * as its own tree.
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

// Only `search` and `near` are faked: `rankVenues`, `milesToMetres`,
// `isPostcodeLike` and `recognisePostcode` stay the real, pure
// implementations, so this suite exercises the same ranking/merge logic
// the app ships.
jest.mock('../../../lib/gyms', () => {
  const actual = jest.requireActual('../../../lib/gyms');
  return { ...actual, search: jest.fn(), near: jest.fn() };
});

jest.mock('../../../lib/deviceLocation', () => ({
  isAvailable: jest.fn(() => false),
  getApproximatePosition: jest.fn(),
}));

import GymPicker from '../GymPicker';
import { search, near } from '../../../lib/gyms';
import * as deviceLocation from '../../../lib/deviceLocation';

const PUREGYM = {
  id: 'v1',
  display_name: 'PureGym Motherwell',
  name: 'PureGym Motherwell',
  brand: 'PureGym',
  town: 'Motherwell',
  outward: 'ML1',
  distance_m: null,
  status: 'open',
  verification_status: 'verified',
};

const PENDING_VENUE = {
  id: 'v2',
  display_name: 'New Iron Gym',
  name: 'New Iron Gym',
  brand: null,
  town: 'Leeds',
  outward: 'LS1',
  distance_m: null,
  status: 'pending',
  verification_status: 'user_submitted_pending',
};

const MOTHERWELL_CENTROID = { kind: 'town', label: 'Motherwell', lat: 55.79, lng: -3.99 };

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

function render(props = {}) {
  let tree = null;
  act(() => { tree = create(<GymPicker {...props} />); });
  return tree;
}

/** The mocked FlatList element itself, so `data`, `renderItem`,
 * `ListEmptyComponent` and `ListFooterComponent` can be read straight off
 * its props (see header). */
function getList(tree) {
  return tree.root.findAll((n) => n.type === 'FlatList')[0];
}

function renderItem(list, item) {
  let part = null;
  act(() => { part = create(list.props.renderItem({ item })); });
  return part;
}

function renderSlot(slot) {
  if (!slot) return null;
  let part = null;
  act(() => { part = create(slot); });
  return part;
}

function byLabel(tree, label) {
  return tree.root.findAll(
    (n) => typeof n.type === 'function' && n.props?.accessibilityLabel === label,
  )[0];
}

async function type(tree, value) {
  const input = tree.root.findByProps({ accessibilityLabel: 'Gym, town or postcode' });
  // Two separate act() passes, deliberately: the debounce's setTimeout is
  // only actually registered once React flushes the passive effect that
  // schedules it, which act()'s own internal flushing does at the END of
  // this first call, not synchronously inside it. Advancing the fake
  // clock in the SAME act() call as the keystroke would advance a clock
  // with nothing pending yet, and the real timer would then be created
  // too late to ever fire.
  await act(async () => { input.props.onChangeText(value); });
  await act(async () => {
    jest.advanceTimersByTime(300);
    for (let i = 0; i < 12; i += 1) await Promise.resolve();
  });
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 12; i += 1) await Promise.resolve();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  search.mockReset();
  near.mockReset();
  near.mockResolvedValue({ venues: [], truncated: false });
  deviceLocation.isAvailable.mockReturnValue(false);
  deviceLocation.getApproximatePosition.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the header prop', () => {
  test('off by default: no "Where do you train?" text', () => {
    const tree = render({});
    expect(texts(tree)).not.toContain('Where do you train?');
    act(() => { tree.unmount(); });
  });

  test('when true, shows the header and sub line', () => {
    const tree = render({ header: true });
    expect(texts(tree)).toContain('Where do you train?');
    expect(texts(tree)).toContain(
      'Choose your main gym so you can find people who train there and discover relevant local connections.',
    );
    act(() => { tree.unmount(); });
  });
});

describe('the debounce', () => {
  test('a query under two characters never reaches the network', async () => {
    const tree = render({});
    await type(tree, 'P');
    expect(search).not.toHaveBeenCalled();
    act(() => { tree.unmount(); });
  });

  test('a real query searches exactly once, after the debounce window', async () => {
    search.mockResolvedValue({ venues: [PUREGYM], recognisedPostcode: null, centroid: null });
    const tree = render({});
    await type(tree, 'PureGym');
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('PureGym');
    expect(near).not.toHaveBeenCalled(); // no centroid resolved: never queried
    act(() => { tree.unmount(); });
  });
});

describe('a result row', () => {
  test('reads display name, then town · outward · X.X miles (one decimal, always)', async () => {
    search.mockResolvedValue({
      venues: [{ ...PUREGYM, distance_m: 1200 }], recognisedPostcode: null, centroid: null,
    });
    const tree = render({});
    await type(tree, 'PureGym');

    const list = getList(tree);
    expect(list.props.data.map((v) => v.id)).toEqual(['v1']);
    const row = renderItem(list, list.props.data[0]);
    const text = texts(row);
    expect(text).toContain('PureGym Motherwell');
    expect(text).toContain('Motherwell · ML1 · 0.7 miles');
    act(() => { row.unmount(); tree.unmount(); });
  });

  test('selecting it calls onSelect with the venue', async () => {
    search.mockResolvedValue({ venues: [PUREGYM], recognisedPostcode: null, centroid: null });
    const onSelect = jest.fn();
    const tree = render({ onSelect });
    await type(tree, 'PureGym');

    const list = getList(tree);
    const row = renderItem(list, list.props.data[0]);
    const card = row.root.findAll(
      (n) => n.props?.accessibilityLabel === 'PureGym Motherwell' && typeof n.props.onPress === 'function',
    )[0];
    act(() => { card.props.onPress(); });

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1' }));
    act(() => { row.unmount(); tree.unmount(); });
  });

  test('a venue still pending its second confirmation carries a Pending badge', async () => {
    search.mockResolvedValue({ venues: [PENDING_VENUE], recognisedPostcode: null, centroid: null });
    const tree = render({});
    await type(tree, 'New Iron');

    const list = getList(tree);
    const row = renderItem(list, list.props.data[0]);
    expect(texts(row)).toContain('Pending');
    act(() => { row.unmount(); tree.unmount(); });
  });
});

describe('a recognised postcode', () => {
  test('typing an outward code shows the postcode chip', async () => {
    search.mockResolvedValue({ venues: [], recognisedPostcode: null, centroid: null });
    const tree = render({});
    await type(tree, 'ML1');
    expect(texts(tree)).toContain('Postcode area ML1');
    act(() => { tree.unmount(); });
  });

  test('typing a full postcode shows it normalised', async () => {
    search.mockResolvedValue({ venues: [], recognisedPostcode: 'ML1 1AA', centroid: null });
    const tree = render({});
    await type(tree, 'ml1 1aa');
    expect(texts(tree)).toContain('Postcode ML1 1AA');
    act(() => { tree.unmount(); });
  });
});

describe('the distance band (30-IMPLEMENTATION.md 1.2 item 5)', () => {
  test('appears once a centroid is known, defaulting to 5 miles, and steps near() on tap', async () => {
    search.mockResolvedValue({ venues: [], recognisedPostcode: null, centroid: MOTHERWELL_CENTROID });
    const tree = render({});
    await type(tree, 'Motherwell');
    await flush();

    expect(texts(tree)).toContain('5 miles');
    expect(near).toHaveBeenCalledWith(
      MOTHERWELL_CENTROID.lat, MOTHERWELL_CENTROID.lng,
      expect.objectContaining({ radiusM: Math.round(5 * 1609.344) }),
    );

    const tenChip = tree.root.findAll(
      (n) => typeof n.type === 'function' && n.props?.label === '10 miles' && n.props?.accessibilityRole === 'radio',
    )[0];
    await act(async () => { tenChip.props.onPress(); });
    await flush();

    expect(near).toHaveBeenCalledWith(
      MOTHERWELL_CENTROID.lat, MOTHERWELL_CENTROID.lng,
      expect.objectContaining({ radiusM: Math.round(10 * 1609.344) }),
    );
    act(() => { tree.unmount(); });
  });

  test('is absent when no centroid is known at all', async () => {
    search.mockResolvedValue({ venues: [PUREGYM], recognisedPostcode: null, centroid: null });
    const tree = render({});
    await type(tree, 'PureGym');
    expect(texts(tree)).not.toContain('5 miles');
    act(() => { tree.unmount(); });
  });

  test('a text match is never filtered by the band: it stays even outside the near radius', async () => {
    search.mockResolvedValue({
      venues: [{ ...PUREGYM, id: 'far-1', distance_m: null }],
      recognisedPostcode: null,
      centroid: MOTHERWELL_CENTROID,
    });
    near.mockResolvedValue({ venues: [], truncated: false }); // nothing within the band
    const tree = render({});
    await type(tree, 'PureGym Motherwell');
    await flush();

    const list = getList(tree);
    expect(list.props.data.map((v) => v.id)).toContain('far-1');
    act(() => { tree.unmount(); });
  });
});

describe('a truncated near list', () => {
  test('shows the "Showing the nearest 40" footer, and keeps the band chips active', async () => {
    search.mockResolvedValue({ venues: [], recognisedPostcode: null, centroid: MOTHERWELL_CENTROID });
    near.mockResolvedValue({ venues: [{ ...PUREGYM }], truncated: true });
    const tree = render({});
    await type(tree, 'Motherwell');
    await flush();

    const list = getList(tree);
    const footer = renderSlot(list.props.ListFooterComponent);
    expect(texts(footer)).toContain("Showing the nearest 40. Type the gym's name to narrow it down.");
    expect(texts(tree)).toContain('10 miles'); // the chip row is still there, not replaced by the footer
    act(() => { footer.unmount(); tree.unmount(); });
  });

  test('no footer text when the near list is not truncated', async () => {
    search.mockResolvedValue({ venues: [], recognisedPostcode: null, centroid: MOTHERWELL_CENTROID });
    near.mockResolvedValue({ venues: [{ ...PUREGYM }], truncated: false });
    const tree = render({});
    await type(tree, 'Motherwell');
    await flush();

    const list = getList(tree);
    const footer = renderSlot(list.props.ListFooterComponent);
    expect(texts(footer)).not.toContain('Showing the nearest');
    act(() => { footer?.unmount(); tree.unmount(); });
  });
});

describe('no match yet', () => {
  test('offers "Can\'t find your gym? Add it", carrying the typed text and onSelect', async () => {
    search.mockResolvedValue({ venues: [], recognisedPostcode: null, centroid: null });
    const navigation = { navigate: jest.fn() };
    const onSelect = jest.fn();
    const tree = render({ navigation, onSelect });
    await type(tree, 'Nonexistent Gym');

    const list = getList(tree);
    expect(list.props.data).toEqual([]);
    const empty = renderSlot(list.props.ListEmptyComponent);
    expect(empty).not.toBeNull();
    expect(texts(empty)).toContain("Can't find your gym?");

    const addRow = empty.root.findAll(
      (n) => n.props?.accessibilityLabel === 'Add your gym' && typeof n.props.onPress === 'function',
    )[0];
    act(() => { addRow.props.onPress(); });

    expect(navigation.navigate).toHaveBeenCalledWith('CommunityGymAdd', { typed: 'Nonexistent Gym', onSelect });
    act(() => { empty.unmount(); tree.unmount(); });
  });

  test('with a known centroid and nothing in the band, names the place and the radius', async () => {
    search.mockResolvedValue({ venues: [], recognisedPostcode: null, centroid: { kind: 'postcode', label: 'ML1', lat: 55.79, lng: -3.99 } });
    near.mockResolvedValue({ venues: [], truncated: false });
    const tree = render({});
    await type(tree, 'ML1');
    await flush();

    const list = getList(tree);
    const empty = renderSlot(list.props.ListEmptyComponent);
    expect(texts(empty)).toContain('No gyms within 5 miles of ML1 yet. Try a wider distance, or add yours.');
    act(() => { empty.unmount(); tree.unmount(); });
  });
});

describe('"Use my location" (deviceLocation.js)', () => {
  test('is absent while deviceLocation.isAvailable() is false (this build)', () => {
    deviceLocation.isAvailable.mockReturnValue(false);
    const tree = render({});
    expect(texts(tree)).not.toContain('Use my location');
    act(() => { tree.unmount(); });
  });

  test('when available, a tap resolves a position and queries near() with it, never persisting it', async () => {
    deviceLocation.isAvailable.mockReturnValue(true);
    deviceLocation.getApproximatePosition.mockResolvedValue({ lat: 51.5, lng: -0.1 });
    near.mockResolvedValue({ venues: [PUREGYM], truncated: false });
    const tree = render({});

    const button = byLabel(tree, 'Use my location');
    await act(async () => { await button.props.onPress(); });
    await flush();

    expect(near).toHaveBeenCalledWith(51.5, -0.1, expect.objectContaining({ radiusM: expect.any(Number) }));
    // The band appears (a centroid is now known) with no place label rendered.
    expect(texts(tree)).toContain('5 miles');
    act(() => { tree.unmount(); });
  });

  test('a denied permission withdraws the button and shows the calm line, never re-prompting', async () => {
    deviceLocation.isAvailable.mockReturnValue(true);
    deviceLocation.getApproximatePosition.mockRejectedValue(Object.assign(new Error('denied'), { code: 'denied' }));
    const tree = render({});

    await act(async () => { await byLabel(tree, 'Use my location').props.onPress(); });
    await flush();

    expect(texts(tree)).toContain('Location is off for Volyume. Search by gym, town or postcode instead.');
    expect(byLabel(tree, 'Use my location')).toBeUndefined();
    // The search route stays available either way.
    expect(tree.root.findByProps({ accessibilityLabel: 'Gym, town or postcode' })).toBeDefined();
    act(() => { tree.unmount(); });
  });

  test('a timeout says so without hanging the picker', async () => {
    deviceLocation.isAvailable.mockReturnValue(true);
    deviceLocation.getApproximatePosition.mockRejectedValue(Object.assign(new Error('timeout'), { code: 'timeout' }));
    const tree = render({});

    await act(async () => { await byLabel(tree, 'Use my location').props.onPress(); });
    await flush();

    expect(texts(tree)).toContain('Could not find your location in time. Try again, or search instead.');
    expect(byLabel(tree, 'Use my location')).toBeDefined(); // still offered, unlike a denial
    act(() => { tree.unmount(); });
  });
});
