/**
 * CommunityComposeScreen: posting and "Add a note" (communities revamp
 * 2026-09-10, `docs/communities-revamp-2026-09-10/23-PHASE3-SPEC.md`
 * sections 2 and 3).
 *
 * What this suite pins:
 *  - a manual post's audience chooser offers Followers / Everyone (radio)
 *    plus the caller's own groups (checkboxes); picking a group sets
 *    `visibility: 'groups'` and sends exactly that group's id, clearing
 *    the radio; picking Followers/Everyone clears any chosen group;
 *  - "Add a note" (`route.params.postId` present) shows no audience
 *    chooser at all, previews the item's own payload without a network
 *    read, and Save calls `setPostNote`, never `createPost`.
 */

import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../components/BackHeader', () => (props) => props?.title ?? null);
jest.mock('../../components/community/PostCard', () => () => null);
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, units: 'metric' }),
}));

jest.mock('../../lib/community', () => ({
  loadMe: jest.fn(),
  hasProfile: (me) => !!me?.profile?.handle,
  createPost: jest.fn(),
  setPostNote: jest.fn(),
  listMyGroups: jest.fn(),
  buildPrPayload: jest.fn(() => ({ exerciseName: 'Squat' })),
  buildSessionPayload: jest.fn(() => ({ sessionName: 'Upper A' })),
  buildBlockPayload: jest.fn(() => ({ weeks: 4 })),
  buildMilestonePayload: jest.fn(() => ({ kind: 'streak' })),
  CAPTION_MAX: 280,
}));

const {
  loadMe, createPost, setPostNote, listMyGroups,
} = require('../../lib/community');
import CommunityComposeScreen from '../CommunityComposeScreen';

async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
  });
}

async function mount(params) {
  const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };
  let tree = null;
  await act(async () => {
    tree = create(<CommunityComposeScreen navigation={navigation} route={{ params }} />);
  });
  await flush();
  return { tree, navigation };
}

function chip(tree, label) {
  return tree.root.findAll((n) => typeof n.type === 'function' && n.props?.label === label && n.props?.onPress)[0];
}

beforeEach(() => {
  jest.clearAllMocks();
  loadMe.mockResolvedValue({ me: { profile: { user_id: 'u1', handle: 'rowan_lifts' } } });
  listMyGroups.mockResolvedValue([]);
});

describe('manual post: the audience chooser', () => {
  test('offers Followers and Everyone with no groups when the caller is in none', async () => {
    const { tree } = await mount({ kind: 'session', workoutId: 'w1' });
    expect(chip(tree, 'Followers')).toBeTruthy();
    expect(chip(tree, 'Everyone')).toBeTruthy();
    expect(chip(tree, 'Followers').props.selected).toBe(true);
  });

  // F13 (fresh-eyes review): a minor never gets "Everyone" as a post
  // audience, same posture as the Training profile audience row.
  test('F13: a minor sees Followers but never Everyone', async () => {
    loadMe.mockResolvedValue({ me: { profile: { user_id: 'u1', handle: 'rowan_lifts' }, is_minor: true } });
    const { tree } = await mount({ kind: 'session', workoutId: 'w1' });
    expect(chip(tree, 'Followers')).toBeTruthy();
    expect(chip(tree, 'Everyone')).toBeFalsy();
  });

  test('F13: an adult still sees Everyone', async () => {
    loadMe.mockResolvedValue({ me: { profile: { user_id: 'u1', handle: 'rowan_lifts' }, is_minor: false } });
    const { tree } = await mount({ kind: 'session', workoutId: 'w1' });
    expect(chip(tree, 'Everyone')).toBeTruthy();
  });

  test('the caller\'s own groups render as additional chips', async () => {
    listMyGroups.mockResolvedValue([
      { group: { id: 'g1', name: 'Iron Collective' } },
      { group: { id: 'g2', name: 'Leeds crew' } },
    ]);
    const { tree } = await mount({ kind: 'session', workoutId: 'w1' });
    expect(chip(tree, 'Iron Collective')).toBeTruthy();
    expect(chip(tree, 'Leeds crew')).toBeTruthy();
  });

  // Phase 3, lead ruling: CommunityGroupScreen's "Share a workout with
  // the group" hands over presetGroupId.
  test('presetGroupId preselects that group when the caller is still a member of it', async () => {
    listMyGroups.mockResolvedValue([
      { group: { id: 'g1', name: 'Iron Collective' } },
      { group: { id: 'g2', name: 'Leeds crew' } },
    ]);
    const { tree } = await mount({ kind: 'session', workoutId: 'w1', presetGroupId: 'g2' });
    expect(chip(tree, 'Leeds crew').props.selected).toBe(true);
    expect(chip(tree, 'Iron Collective').props.selected).toBe(false);
    expect(chip(tree, 'Followers').props.selected).toBe(false);
  });

  test('a presetGroupId the caller is no longer a member of is ignored, never taken on faith', async () => {
    listMyGroups.mockResolvedValue([{ group: { id: 'g1', name: 'Iron Collective' } }]);
    const { tree } = await mount({ kind: 'session', workoutId: 'w1', presetGroupId: 'stale-group' });
    expect(chip(tree, 'Followers').props.selected).toBe(true);
  });

  test('picking a group sets visibility to groups and clears the radio; posting sends that group id', async () => {
    listMyGroups.mockResolvedValue([{ group: { id: 'g1', name: 'Iron Collective' } }]);
    createPost.mockResolvedValue({ id: 'p1' });
    const { tree } = await mount({ kind: 'session', workoutId: 'w1' });

    await act(async () => { chip(tree, 'Iron Collective').props.onPress(); });
    await flush();
    expect(chip(tree, 'Iron Collective').props.selected).toBe(true);
    expect(chip(tree, 'Followers').props.selected).toBe(false);

    const post = tree.root.findAll((n) => n.props?.title === 'Post' && n.props?.onPress)[0];
    await act(async () => { post.props.onPress(); });
    await flush();

    expect(createPost).toHaveBeenCalledWith(expect.objectContaining({
      visibility: 'groups', groupIds: ['g1'],
    }));
  });

  test('picking Everyone after a group clears the group selection', async () => {
    listMyGroups.mockResolvedValue([{ group: { id: 'g1', name: 'Iron Collective' } }]);
    createPost.mockResolvedValue({ id: 'p1' });
    const { tree } = await mount({ kind: 'session', workoutId: 'w1' });

    await act(async () => { chip(tree, 'Iron Collective').props.onPress(); });
    await act(async () => { chip(tree, 'Everyone').props.onPress(); });
    await flush();

    const post = tree.root.findAll((n) => n.props?.title === 'Post' && n.props?.onPress)[0];
    await act(async () => { post.props.onPress(); });
    await flush();

    expect(createPost).toHaveBeenCalledWith(expect.objectContaining({
      visibility: 'public', groupIds: null,
    }));
  });
});

describe('"Add a note" (postId present)', () => {
  test('no audience chooser, and the payload comes from params without a fresh read', async () => {
    const { tree } = await mount({
      postId: 'p1', kind: 'session', payload: { sessionName: 'Upper A' },
    });
    expect(chip(tree, 'Followers')).toBeFalsy();
    expect(chip(tree, 'Everyone')).toBeFalsy();
    expect(tree.root.findAll((n) => n.props?.title === 'Save')).toHaveLength(1);
  });

  test('Save calls setPostNote, never createPost', async () => {
    setPostNote.mockResolvedValue({ id: 'p1', caption: 'Great session' });
    const { tree, navigation } = await mount({
      postId: 'p1', kind: 'session', payload: { sessionName: 'Upper A' },
    });
    const field = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Caption' && n.props?.onChangeText)[0];
    await act(async () => { field.props.onChangeText('Great session'); });

    const save = tree.root.findAll((n) => n.props?.title === 'Save' && n.props?.onPress)[0];
    await act(async () => { save.props.onPress(); });
    await flush();

    expect(setPostNote).toHaveBeenCalledWith('p1', 'Great session');
    expect(createPost).not.toHaveBeenCalled();
    expect(navigation.replace).toHaveBeenCalledWith('CommunityPost', { id: 'p1' });
  });

  test('an empty note is sent as null, clearing it', async () => {
    setPostNote.mockResolvedValue({ id: 'p1', caption: null });
    const { tree } = await mount({ postId: 'p1', kind: 'session', payload: { sessionName: 'Upper A' } });
    const save = tree.root.findAll((n) => n.props?.title === 'Save' && n.props?.onPress)[0];
    await act(async () => { save.props.onPress(); });
    await flush();
    expect(setPostNote).toHaveBeenCalledWith('p1', null);
  });
});
