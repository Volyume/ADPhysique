/**
 * CommunityUnseenSync - D231 (app layout rework, batch 1).
 *
 * The Community tab's dot is published by useCommunityMe (the hook the Today
 * header's Community button used to mount). With that button gone, this null
 * component keeps the hook alive on Today. Pins: it mounts the hook, renders
 * nothing, and the chain the dot depends on still lights it for UNREAD
 * MESSAGES (hasUnseen covers unseen_messages) and clears it when there is
 * nothing new; and the tab bar reads that same slice.
 */
import { create, act } from 'react-test-renderer';
import fs from 'fs';
import path from 'path';

const mockUseCommunityMe = jest.fn(() => ({ me: {}, loading: false, error: null, refresh: async () => {} }));
jest.mock('../../../hooks/useCommunityMe', () => ({
  __esModule: true,
  default: (...args) => mockUseCommunityMe(...args),
}));

import CommunityUnseenSync from '../CommunityUnseenSync';
import { publishCommunityUnseenFromMe } from '../../../lib/community/unseen';
import useAppStore from '../../../store/useAppStore';

beforeEach(() => { mockUseCommunityMe.mockClear(); });

describe('CommunityUnseenSync', () => {
  it('mounts useCommunityMe and renders nothing', () => {
    let tree;
    act(() => { tree = create(<CommunityUnseenSync />); });
    expect(mockUseCommunityMe).toHaveBeenCalledTimes(1);
    expect(tree.toJSON()).toBeNull();
  });
});

describe('the Community tab dot still lights for unread messages (Today header button gone)', () => {
  afterEach(() => { useAppStore.getState().setCommunityUnseen(false); });

  it('unread messages alone light the dot', () => {
    publishCommunityUnseenFromMe({ unseen_activity: 0, pending_requests: 0, pending_connect_requests: 0, unseen_messages: 3 });
    expect(useAppStore.getState().community.unseen).toBe(true);
  });

  it('unseen activity alone lights it', () => {
    publishCommunityUnseenFromMe({ unseen_activity: 2, unseen_messages: 0 });
    expect(useAppStore.getState().community.unseen).toBe(true);
  });

  it('nothing new clears it', () => {
    publishCommunityUnseenFromMe({ unseen_activity: 1, unseen_messages: 1 });
    publishCommunityUnseenFromMe({ unseen_activity: 0, pending_requests: 0, pending_connect_requests: 0, unseen_messages: 0 });
    expect(useAppStore.getState().community.unseen).toBe(false);
  });

  it('the tab bar reads that same slice, and Today mounts the sync component', () => {
    const bar = fs.readFileSync(path.join(__dirname, '..', '..', 'VolyumeTabBar.js'), 'utf8');
    expect(bar).toMatch(/useAppStore\(\(s\) => !!s\.community\?\.unseen\)/);
    const home = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'screens', 'HomeScreen.js'), 'utf8');
    expect(home).toMatch(/<CommunityUnseenSync \/>/);
  });
});
