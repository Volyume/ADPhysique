/**
 * CommunityBoardScreen: the scope chips gain the arriving cohort
 * (communities revamp 2026-09-10, task 7). `scope`/`scopeKey` already
 * travelled generically to `loadBoard` (it forwards whatever it is
 * given), so what this suite pins is the CHIP row: the three universal
 * boards (My gym, Following, Everyone) always show, and a cohort the
 * screen was opened FOR (area/style/discipline/age_band) shows as one
 * more chip alongside them, selected on arrival, and still tappable back
 * to after the reader taps one of the three universal chips.
 *
 * The screen's list is a FlashList (E8), which the jest moduleNameMapper
 * points at the react-native manual mock's FlatList passthrough host. Its
 * ListHeaderComponent (where every chip lives) stays an unrendered
 * ELEMENT in props, so it is rendered for real here -- the same
 * convention `CommunityHub.states.test.js` and
 * `CommunityDimension.gymConfirm.test.js` both use.
 */

import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../components/BackHeader', () => () => null);
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

jest.mock('../../hooks/useCommunityMe', () => ({
  __esModule: true,
  default: jest.fn(() => ({ me: { profile: { user_id: 'u1' } } })),
}));

jest.mock('../../lib/community', () => ({
  loadBoard: jest.fn(() => Promise.resolve({
    rows: [], you: null, count: 0, thresholdMet: true, cursor: null,
  })),
  metricLabel: (window, n) => `${Number(n) || 0} sessions`,
  BOARD_SCOPES: {
    gym: 'My gym', following: 'Following', everyone: 'Everyone', group: 'Group',
  },
  BOARD_SCOPE_ORDER: ['gym', 'following', 'everyone'],
  BOARD_WINDOWS: { week: 'This week', month: 'This month', consistency: 'Consistency' },
  BOARD_WINDOW_ORDER: ['week', 'month', 'consistency'],
  readShareSettings: jest.fn(() => Promise.resolve({ consistency: true })),
}));

const { loadBoard } = require('../../lib/community');
const CommunityBoardScreen = require('../CommunityBoardScreen').default;

async function flush() {
  await act(async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); });
}

function renderHeader(tree) {
  const list = tree.root.findAll((n) => n.type === 'FlatList')[0];
  let part = null;
  act(() => { part = create(list.props.ListHeaderComponent); });
  return part;
}

/** Just the SCOPE row's chips (accessibilityLabel="Scope"), never the
 * Window row, which is also a `radio`-labelled chip group on the same
 * header. */
function scopeChips(headerTree) {
  const scopeGroup = headerTree.root.findAll((n) => n.props?.accessibilityLabel === 'Scope')[0];
  if (!scopeGroup) return [];
  return scopeGroup.findAll(
    (n) => typeof n.type === 'function' && n.props?.accessibilityRole === 'radio' && 'label' in n.props,
  );
}

async function mount(params) {
  const navigation = { navigate: jest.fn(), setParams: jest.fn() };
  let tree;
  await act(async () => {
    tree = create(<CommunityBoardScreen navigation={navigation} route={{ params }} />);
  });
  await flush();
  return { tree, navigation, header: renderHeader(tree) };
}

beforeEach(() => {
  jest.clearAllMocks();
  loadBoard.mockResolvedValue({ rows: [], you: null, count: 0, thresholdMet: true, cursor: null });
});

describe('the three universal boards always show', () => {
  test('with no arriving cohort (the ordinary gym board), exactly three scope chips', async () => {
    const { header } = await mount({ scope: 'gym' });
    const labels = scopeChips(header).map((c) => c.props.label);
    expect(labels).toEqual(['My gym', 'Following', 'Everyone']);
  });

  test('group boards show no scope chips at all', async () => {
    const { header } = await mount({ scope: 'group', scopeKey: 'g1', label: 'Iron Collective' });
    expect(scopeChips(header)).toHaveLength(0);
  });
});

describe('the arriving cohort joins the three as a fourth chip (task 7)', () => {
  test('a discipline board adds one chip, labelled and selected', async () => {
    const { header } = await mount({ scope: 'discipline', scopeKey: 'bodybuilding', label: 'Bodybuilding' });
    const labels = scopeChips(header).map((c) => c.props.label);
    expect(labels).toEqual(['My gym', 'Following', 'Everyone', 'Bodybuilding']);
    const cohortChip = scopeChips(header).find((c) => c.props.label === 'Bodybuilding');
    expect(cohortChip.props.selected).toBe(true);
    expect(loadBoard).toHaveBeenCalledWith(expect.objectContaining({ scope: 'discipline', scopeKey: 'bodybuilding' }));
  });

  test('an age_band board adds its own chip too', async () => {
    const { header } = await mount({ scope: 'age_band', scopeKey: null, label: '25 to 34' });
    const labels = scopeChips(header).map((c) => c.props.label);
    expect(labels).toEqual(['My gym', 'Following', 'Everyone', '25 to 34']);
  });

  test('area and style boards add their own chip too', async () => {
    let out = await mount({ scope: 'area', scopeKey: 'leeds', label: 'Leeds' });
    expect(scopeChips(out.header).map((c) => c.props.label)).toEqual(['My gym', 'Following', 'Everyone', 'Leeds']);

    jest.clearAllMocks();
    loadBoard.mockResolvedValue({ rows: [], you: null, count: 0, thresholdMet: true, cursor: null });
    out = await mount({ scope: 'style', scopeKey: 'strength', label: 'Strength' });
    expect(scopeChips(out.header).map((c) => c.props.label)).toEqual(['My gym', 'Following', 'Everyone', 'Strength']);
  });

  test('tapping "Following" navigates away; the cohort chip is still there to tap back to', async () => {
    const { header, navigation } = await mount({ scope: 'discipline', scopeKey: 'bodybuilding', label: 'Bodybuilding' });

    const followingChip = scopeChips(header).find((c) => c.props.label === 'Following');
    act(() => { followingChip.props.onPress(); });
    expect(navigation.setParams).toHaveBeenCalledWith({ scope: 'following', scopeKey: null, label: null });

    // The chip stays offered (captured once, on arrival, the whole point
    // of task 7's "as a chip when one is given") -- it is still there to
    // tap back to even though the reader has just tapped away from it.
    const cohortChip = scopeChips(header).find((c) => c.props.label === 'Bodybuilding');
    expect(cohortChip).toBeTruthy();
    act(() => { cohortChip.props.onPress(); });
    expect(navigation.setParams).toHaveBeenCalledWith({
      scope: 'discipline', scopeKey: 'bodybuilding', label: 'Bodybuilding',
    });
  });

  test('a cohort with no label falls back to BOARD_SCOPES, never a blank chip', async () => {
    const { header } = await mount({ scope: 'discipline', scopeKey: 'bodybuilding' });
    const labels = scopeChips(header).map((c) => c.props.label);
    expect(labels[3]).toBeTruthy();
    expect(labels[3]).not.toBe('');
  });
});
