/**
 * GymPicker (gym database blueprint `docs/gym-database-2026-09-06/
 * 20-BLUEPRINT.md`, "## App"; GD-09, GD-11, GD-13).
 *
 * What this suite pins:
 *  - the search is debounced (250ms), never one read per keystroke;
 *  - a result row reads "display name" then "town · outward · distance";
 *  - a venue still waiting on its second confirmation carries a "Pending"
 *    badge, and a typed postcode shows the recognised-postcode chip;
 *  - the empty state offers "Can't find your gym? Add it", which
 *    navigates to CommunityGymAdd carrying whatever was typed;
 *  - selecting a row calls `onSelect` with the venue, unchanged;
 *  - a query under the minimum length never reaches the network.
 *
 * FlashList is the react-native manual mock's FlatList passthrough host
 * (jest moduleNameMapper), which does not render its cells in this test
 * environment (the same reason `CommunityHub.states.test.js` renders
 * `ListHeaderComponent`/`ListEmptyComponent` as their own trees rather
 * than reading them out of the mounted list). This suite follows the
 * same convention: pull `renderItem` and `ListEmptyComponent` off the
 * FlatList element itself and render each as its own tree.
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

// Only `search` is faked: `venueLine`, `isPendingVenue`, `isPostcodeLike`
// and `recognisePostcode` stay the real, pure implementations, so this
// suite is exercising the same rendering logic the app ships.
jest.mock('../../../lib/gyms', () => {
  const actual = jest.requireActual('../../../lib/gyms');
  return { ...actual, search: jest.fn() };
});

import GymPicker from '../GymPicker';
import { search } from '../../../lib/gyms';

const PUREGYM = {
  id: 'v1',
  display_name: 'PureGym Motherwell',
  name: 'PureGym Motherwell',
  brand: 'PureGym',
  town: 'Motherwell',
  outward: 'ML1',
  distance_m: 1200,
  status: 'open',
  verification_status: 'verified',
  reasons: ['Matches PureGym'],
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
  reasons: [],
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

function render(props = {}) {
  let tree = null;
  act(() => { tree = create(<GymPicker {...props} />); });
  return tree;
}

/** The mocked FlatList element itself, so `data`, `renderItem` and
 * `ListEmptyComponent` can be read straight off its props (see header). */
function getList(tree) {
  return tree.root.findAll((n) => n.type === 'FlatList')[0];
}

/** Render one row by calling the list's own `renderItem`, as its own
 * tree, exactly the way the real list would render that cell. */
function renderRow(list, item) {
  let part = null;
  act(() => { part = create(list.props.renderItem({ item })); });
  return part;
}

/** Render `ListEmptyComponent` as its own tree, or null when there is
 * none (a non-empty result list). */
function renderEmpty(list) {
  if (!list.props.ListEmptyComponent) return null;
  let part = null;
  act(() => { part = create(list.props.ListEmptyComponent); });
  return part;
}

async function type(tree, value) {
  const input = tree.root.findByProps({ accessibilityLabel: 'Search for your gym' });
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

beforeEach(() => {
  jest.useFakeTimers();
  search.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the debounce', () => {
  test('a query under two characters never reaches the network', async () => {
    const tree = render({});
    await type(tree, 'P');
    expect(search).not.toHaveBeenCalled();
    act(() => { tree.unmount(); });
  });

  test('a real query searches exactly once, after the debounce window', async () => {
    search.mockResolvedValue({ venues: [PUREGYM], recognisedPostcode: null });
    const tree = render({});
    await type(tree, 'PureGym');
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('PureGym');
    act(() => { tree.unmount(); });
  });
});

describe('a result row', () => {
  test('reads display name, then town · outward · distance', async () => {
    search.mockResolvedValue({ venues: [PUREGYM], recognisedPostcode: null });
    const tree = render({});
    await type(tree, 'PureGym');

    const list = getList(tree);
    expect(list.props.data).toEqual([PUREGYM]);
    const row = renderRow(list, PUREGYM);
    const text = texts(row);
    expect(text).toContain('PureGym Motherwell');
    expect(text).toContain('Motherwell · ML1 · 0.7 mi');
    act(() => { row.unmount(); tree.unmount(); });
  });

  test('selecting it calls onSelect with the venue, unchanged', async () => {
    search.mockResolvedValue({ venues: [PUREGYM], recognisedPostcode: null });
    const onSelect = jest.fn();
    const tree = render({ onSelect });
    await type(tree, 'PureGym');

    const list = getList(tree);
    const row = renderRow(list, PUREGYM);
    const card = row.root.findAll(
      (n) => n.props?.accessibilityLabel === 'PureGym Motherwell' && typeof n.props.onPress === 'function',
    )[0];
    act(() => { card.props.onPress(); });

    expect(onSelect).toHaveBeenCalledWith(PUREGYM);
    act(() => { row.unmount(); tree.unmount(); });
  });

  test('a venue still pending its second confirmation carries a Pending badge', async () => {
    search.mockResolvedValue({ venues: [PENDING_VENUE], recognisedPostcode: null });
    const tree = render({});
    await type(tree, 'New Iron');

    const list = getList(tree);
    const row = renderRow(list, PENDING_VENUE);
    expect(texts(row)).toContain('Pending');
    act(() => { row.unmount(); tree.unmount(); });
  });
});

describe('a recognised postcode', () => {
  test('typing an outward code shows the postcode chip', async () => {
    search.mockResolvedValue({ venues: [], recognisedPostcode: null });
    const tree = render({});
    await type(tree, 'ML1');
    expect(texts(tree)).toContain('Postcode area ML1');
    act(() => { tree.unmount(); });
  });

  test('typing a full postcode shows it normalised', async () => {
    search.mockResolvedValue({ venues: [], recognisedPostcode: 'ML1 1AA' });
    const tree = render({});
    await type(tree, 'ml1 1aa');
    expect(texts(tree)).toContain('Postcode ML1 1AA');
    act(() => { tree.unmount(); });
  });
});

describe('no match yet', () => {
  test('offers "Can\'t find your gym? Add it", carrying the typed text', async () => {
    search.mockResolvedValue({ venues: [], recognisedPostcode: null });
    const navigation = { navigate: jest.fn() };
    const tree = render({ navigation });
    await type(tree, 'Nonexistent Gym');

    const list = getList(tree);
    expect(list.props.data).toEqual([]);
    const empty = renderEmpty(list);
    expect(empty).not.toBeNull();
    expect(texts(empty)).toContain('No gyms match yet');

    const addRow = empty.root.findAll(
      (n) => n.props?.accessibilityLabel === 'Add your gym' && typeof n.props.onPress === 'function',
    )[0];
    act(() => { addRow.props.onPress(); });

    expect(navigation.navigate).toHaveBeenCalledWith('CommunityGymAdd', { typed: 'Nonexistent Gym' });
    act(() => { empty.unmount(); tree.unmount(); });
  });
});
