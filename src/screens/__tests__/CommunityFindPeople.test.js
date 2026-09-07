/**
 * CommunityFindPeopleScreen (discovery blueprint
 * `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` sections 4,
 * 5, 9; SD-23, SD-24, SD-28).
 *
 * Three things pinned here:
 *
 *   1. `lineFor` (the screen's own honesty rule, SD-28): a door that
 *      cannot work yet says its requirement, never a count; an available
 *      door with nobody behind it yet says the zero state, never "0";
 *      an available door with people behind it says the plain count
 *      line. These three answers must never blur into each other.
 *   2. A door that cannot work opens the screen that fixes it (Edit
 *      profile for gym/area, Training profile for programme).
 *   3. An available door opens the scored list with the mode, key and
 *      label it was reached with, and nothing else: `community_find_people`
 *      reads the caller's own profile server-side (blueprint section 9),
 *      so a client-supplied key would only ever be for the label.
 *
 * The client library is mocked: this is about what the screen does with
 * the doors and counts, not about the RPC.
 */

import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../components/BackHeader', () => () => null);

jest.mock('../../hooks/useCommunityMe', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../lib/community', () => ({
  doorsFor: jest.fn(),
  doorLine: jest.fn((door, count) => `${door.mode}-line-${count}`),
  doorZeroState: jest.fn((door) => `${door.mode}-zero`),
  findPeople: jest.fn(),
  hasProfile: (me) => !!me?.profile?.handle,
}));

import {
  doorsFor, doorLine, doorZeroState, findPeople,
} from '../../lib/community';
import useCommunityMe from '../../hooks/useCommunityMe';
import CommunityFindPeopleScreen, { lineFor } from '../CommunityFindPeopleScreen';

const ME = { profile: { user_id: 'u1', handle: 'rowan_lifts' }, is_minor: false };

function gymDoor(over = {}) {
  return {
    mode: 'gym',
    label: 'At my gym',
    subtitle: 'Lifters at your gym',
    available: true,
    requirement: null,
    key: 'PureGym Leeds',
    ...over,
  };
}

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

async function flush() {
  await act(async () => { for (let i = 0; i < 12; i += 1) await Promise.resolve(); });
}

function findList(tree) {
  return tree.root.findAll((n) => n.type === 'FlatList')[0];
}

async function mount() {
  const navigation = { navigate: jest.fn() };
  let tree;
  await act(async () => {
    tree = create(<CommunityFindPeopleScreen navigation={navigation} route={{ params: {} }} />);
  });
  await flush();
  return { tree, navigation };
}

beforeEach(() => {
  jest.clearAllMocks();
  findPeople.mockResolvedValue({ people: [], cursor: null, count: 3 });
  useCommunityMe.mockReturnValue({ me: ME, loading: false, error: null, refresh: jest.fn() });
});

describe('lineFor: the three honest answers a door can give (SD-28)', () => {
  test('a door that cannot work yet says its requirement, never a count', () => {
    const door = gymDoor({ available: false, key: null, requirement: 'Add your gym to see who trains there' });
    expect(lineFor(door, 6)).toBe('Add your gym to see who trains there');
    expect(doorZeroState).not.toHaveBeenCalled();
    expect(doorLine).not.toHaveBeenCalled();
  });

  test('an available door with nobody behind it yet answers the zero state, never "0"', () => {
    const door = gymDoor();
    expect(lineFor(door, 0)).toBe('gym-zero');
    expect(doorZeroState).toHaveBeenCalledWith(door);
    expect(doorLine).not.toHaveBeenCalled();
  });

  test('an available door with people behind it answers the plain count line', () => {
    const door = gymDoor();
    expect(lineFor(door, 6)).toBe('gym-line-6');
    // The third argument is the server's scope for the partners door; a
    // plain count carries none.
    expect(doorLine).toHaveBeenCalledWith(door, 6, null);
  });

  test('a count that has not been read yet (null) is not read as a zero', () => {
    const door = gymDoor();
    expect(lineFor(door, null)).toBe('gym-line-null');
    expect(doorLine).toHaveBeenCalledWith(door, null, null);
    expect(doorZeroState).not.toHaveBeenCalled();
  });

  test('the partners door carries the server scope so the line never guesses where the count applies', () => {
    const door = { ...gymDoor(), mode: 'partners', label: 'Open to training together', subtitle: 'Lifters open to training together' };
    lineFor(door, { count: 3, scope: 'at your gym' });
    expect(doorLine).toHaveBeenCalledWith(door, 3, 'at your gym');
  });
});

describe('the six doors, mounted', () => {
  test('a door that cannot work opens the screen that fixes it', async () => {
    doorsFor.mockReturnValue([
      gymDoor({ available: false, key: null, requirement: 'Add your gym to see who trains there' }),
    ]);

    const { tree, navigation } = await mount();
    const list = findList(tree);
    expect(list.props.data).toHaveLength(1);

    let rowTree;
    await act(async () => { rowTree = create(list.props.renderItem({ item: list.props.data[0] })); });
    const card = rowTree.root.findAll(
      (n) => typeof n.type === 'function' && 'onPress' in (n.props ?? {}) && n.props.onPress,
    )[0];
    await act(async () => { card.props.onPress(); });

    expect(navigation.navigate).toHaveBeenCalledWith('CommunityEditProfile');
  });

  test('an available door opens the scored list with its mode, key and label', async () => {
    doorsFor.mockReturnValue([gymDoor()]);
    findPeople.mockResolvedValue({ people: [], cursor: null, count: 6 });

    const { tree, navigation } = await mount();
    const list = findList(tree);

    let rowTree;
    await act(async () => { rowTree = create(list.props.renderItem({ item: list.props.data[0] })); });
    const card = rowTree.root.findAll(
      (n) => typeof n.type === 'function' && 'onPress' in (n.props ?? {}) && n.props.onPress,
    )[0];
    await act(async () => { card.props.onPress(); });

    expect(navigation.navigate).toHaveBeenCalledWith('CommunityPeopleList', {
      mode: 'gym', key: 'PureGym Leeds', label: 'At my gym',
    });
  });

  test('without a profile, the screen offers Create my profile rather than any door', async () => {
    useCommunityMe.mockReturnValue({
      me: { profile: null, is_minor: false }, loading: false, error: null, refresh: jest.fn(),
    });
    doorsFor.mockReturnValue([gymDoor()]);

    const { tree } = await mount();
    const list = findList(tree);
    expect(list.props.data).toEqual([]);
    expect(findPeople).not.toHaveBeenCalled();

    let emptyTree;
    await act(async () => { emptyTree = create(list.props.ListEmptyComponent); });
    expect(flattenText(emptyTree.toJSON())).toContain('Create your profile first');
  });
});
