/**
 * CommunityPeopleListScreen (discovery blueprint sections 4, 5, 7, 10;
 * SD-23, SD-24, SD-26; community-product-audit-2026-09-07
 * `docs/community-product-audit-2026-09-07/30-IMPLEMENTATION.md` section
 * 1.3).
 *
 * What this suite pins:
 *
 *   1. `normaliseRow` carries the SD-28 `fallback` flag through.
 *   2. `withFallbackDivider` inserts exactly one divider, directly before
 *      the first fallback row, as its own list item -- never when there
 *      are no fallback rows, never more than one.
 *   3. Applying a filter (the sheet's `onApply`) re-reads `findPeople`
 *      WITH `filters`, and the door's existing door tests keep passing
 *      with `_filters` absent because `filters` starts `null`.
 *   4. The count line reads "N people" / "N+ people" once `count` and
 *      `count_truncated` land, and applied filters render as removable
 *      chips that narrow the query when tapped.
 *
 * Programme-people lists were removed with Community programme-sharing
 * (`docs/community-product-audit-2026-09-07/40-GAP-CLOSURE.md` §2).
 *
 * The client library and the heavier sheets are mocked: this is about
 * what the screen does with a page and a filter change, not the RPC.
 */

import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../components/BackHeader', () => ({ title, right }) => {
  const React = require('react');
  const { Text } = require('react-native');
  return React.createElement(React.Fragment, null, React.createElement(Text, null, title), right ?? null);
});
jest.mock('../../components/community/ConnectSheet', () => () => null);

jest.mock('../../components/community/PeopleFiltersSheet', () => function MockFiltersSheet({ visible, onApply, onClose }) {
  if (!visible) return null;
  const { View, Text, TouchableOpacity } = require('react-native');
  return (
    <View>
      <TouchableOpacity accessibilityLabel="apply-gym-filter" onPress={() => onApply({ scope: 'gym' })}>
        <Text>apply-gym-filter</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityLabel="close-filters" onPress={onClose}>
        <Text>close</Text>
      </TouchableOpacity>
    </View>
  );
});

jest.mock('../../hooks/useCommunityMe', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../lib/community', () => {
  const actual = jest.requireActual('../../lib/community/findPeople');
  return {
    doorsFor: jest.fn(() => []),
    doorZeroState: jest.fn(() => 'Nobody here yet, honestly.'),
    findPeople: jest.fn(),
    profileUrl: (handle) => `https://volyume.app/u/${handle}`,
    filterChips: actual.filterChips,
    removeFilterChip: actual.removeFilterChip,
    peopleCountLine: actual.peopleCountLine,
    TP_DAYS: {}, TP_TIME_BANDS: {}, TP_EXPERIENCE_BANDS: {}, TP_AGE_BANDS: {},
    COMMUNITY_STYLE_KEYS: {}, COMMUNITY_GOALS: {},
  };
});

import { findPeople } from '../../lib/community';
import useCommunityMe from '../../hooks/useCommunityMe';
import CommunityPeopleListScreen, { normaliseRow, withFallbackDivider } from '../CommunityPeopleListScreen';

const ME = { profile: { user_id: 'u1', handle: 'rowan_lifts' }, is_minor: false };

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

async function flush() {
  await act(async () => { for (let i = 0; i < 10; i += 1) await Promise.resolve(); });
}

function findList(tree) {
  return tree.root.findAll((n) => n.type === 'FlatList')[0];
}

/** The FlashList mock carries `ListHeaderComponent` (where the count line
 * and the applied-filter chips live) as an unrendered element prop rather
 * than as children -- see `__mocks__/shopify-flash-list.js`. Render it as
 * its own tree, matching the pattern `CommunityDimension.gymConfirm.test.js`
 * and `CommunityProgramme.test.js` already use. */
function renderHeader(tree) {
  const list = findList(tree);
  let header;
  act(() => { header = create(list.props.ListHeaderComponent); });
  return header;
}

async function mount(params) {
  const navigation = { navigate: jest.fn() };
  let tree;
  await act(async () => {
    tree = create(<CommunityPeopleListScreen navigation={navigation} route={{ params }} />);
  });
  await flush();
  return { tree, navigation };
}

async function press(tree, label) {
  const node = tree.root.findAll(
    (n) => n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function',
  )[0];
  expect(node).toBeTruthy();
  await act(async () => { node.props.onPress(); });
  await flush();
}

beforeEach(() => {
  jest.clearAllMocks();
  useCommunityMe.mockReturnValue({ me: ME });
  findPeople.mockResolvedValue({ people: [], cursor: null, count: null, count_truncated: false });
});

describe('normaliseRow: the fallback flag threads through', () => {
  test('a scored row is not fallback', () => {
    expect(normaliseRow({ card: { user_id: 'u2' }, reasons: ['Trains at PureGym Leeds'] }).fallback).toBe(false);
  });

  test('an SD-28 fallback row is flagged', () => {
    expect(normaliseRow({ card: { user_id: 'u3' }, reasons: [], fallback: true }).fallback).toBe(true);
  });

  test('a bare card is never fallback', () => {
    expect(normaliseRow({ user_id: 'u4' }).fallback).toBe(false);
  });
});

describe('withFallbackDivider: one divider, directly before the fallback block', () => {
  function row(id, fallback = false) {
    return { card: { user_id: id }, reasons: fallback ? [] : ['x'], fallback };
  }

  test('no fallback rows: no divider', () => {
    const items = withFallbackDivider([row('a'), row('b')]);
    expect(items.map((i) => i.type)).toEqual(['person', 'person']);
  });

  test('a divider sits directly before the first fallback row', () => {
    const items = withFallbackDivider([row('a'), row('b'), row('c', true), row('d', true)]);
    expect(items.map((i) => i.type)).toEqual(['person', 'person', 'divider', 'person', 'person']);
    expect(items[3].row.card.user_id).toBe('c');
  });

  test('every row fallback: the divider still leads (nothing scored precedes it, still meaningful)', () => {
    const items = withFallbackDivider([row('a', true), row('b', true)]);
    expect(items.map((i) => i.type)).toEqual(['divider', 'person', 'person']);
  });

  test('an empty page: no items, no divider', () => {
    expect(withFallbackDivider([])).toEqual([]);
  });
});

describe('the filter control', () => {
  test('a door list shows the filter button', async () => {
    const { tree } = await mount({ mode: 'like_me', label: 'Train like me' });
    expect(tree.root.findAll((n) => n.props?.accessibilityLabel === 'Filters')[0]).toBeTruthy();
  });
});

describe('applying and removing a filter', () => {
  test('every existing door call starts with no _filters (filters defaults null)', async () => {
    await mount({ mode: 'gym', label: 'At my gym' });
    expect(findPeople).toHaveBeenCalledWith('gym', { limit: 20, filters: null });
  });

  test('applying a filter re-reads with it, and shows it as a removable chip', async () => {
    const { tree } = await mount({ mode: 'like_me', label: 'Train like me' });
    await press(tree, 'Filters');
    await press(tree, 'apply-gym-filter');

    expect(findPeople).toHaveBeenLastCalledWith('like_me', { limit: 20, filters: { scope: 'gym' } });
    expect(flattenText(renderHeader(tree).toJSON())).toContain('My gym');
  });

  test('removing the applied chip clears it and re-reads with no filters', async () => {
    const { tree } = await mount({ mode: 'like_me', label: 'Train like me' });
    await press(tree, 'Filters');
    await press(tree, 'apply-gym-filter');

    const header = renderHeader(tree);
    const removeChip = header.root.findAll(
      (n) => n.props?.accessibilityLabel === 'Remove filter: My gym' && typeof n.props?.onPress === 'function',
    )[0];
    expect(removeChip).toBeTruthy();
    await act(async () => { removeChip.props.onPress(); });
    await flush();

    expect(findPeople).toHaveBeenLastCalledWith('like_me', { limit: 20, filters: null });
  });
});

describe('the count line (spec 1.3)', () => {
  test('an exact count reads "N people"', async () => {
    findPeople.mockResolvedValue({ people: [], cursor: null, count: 6, count_truncated: false });
    const { tree } = await mount({ mode: 'like_me', label: 'Train like me' });
    expect(flattenText(renderHeader(tree).toJSON())).toContain('6 people');
  });

  test('a truncated scan reads "N+ people"', async () => {
    findPeople.mockResolvedValue({ people: [], cursor: null, count: 1000, count_truncated: true });
    const { tree } = await mount({ mode: 'like_me', label: 'Train like me' });
    expect(flattenText(renderHeader(tree).toJSON())).toContain('1000+ people');
  });

  test('an unread count (null) shows no count line at all', async () => {
    const { tree } = await mount({ mode: 'like_me', label: 'Train like me' });
    // No chips and no count line at all: the screen renders no header.
    expect(findList(tree).props.ListHeaderComponent).toBeFalsy();
  });
});

describe('rows carry through to the list, fallback flagged', () => {
  test('a fallback row from the server reaches the list data flagged', async () => {
    findPeople.mockResolvedValue({
      people: [
        { card: { user_id: 'u2', handle: 'sam' }, reasons: ['Trains at PureGym Leeds'], fallback: false },
        { card: { user_id: 'u3', handle: 'alex' }, reasons: [], fallback: true },
      ],
      cursor: null,
      count: 1,
      count_truncated: false,
    });
    const { tree } = await mount({ mode: 'gym', label: 'At my gym' });

    const list = findList(tree);
    const items = list.props.data;
    expect(items.map((i) => i.type)).toEqual(['person', 'divider', 'person']);
  });
});
