/**
 * SyncStatusBadge mount-safety + status-rendering tests.
 * Covers all four spec'd statuses from SYNC_ARCHITECTURE_LOCKED.md
 * lines 266-276.
 */
import React from 'react';
import { act, create } from 'react-test-renderer';

jest.mock('../../lib/sync', () => ({
  getStatus: jest.fn(),
  syncAll: jest.fn(async () => ({ status: 'synced' })),
}));

import SyncStatusBadge from '../SyncStatusBadge';
import { getStatus } from '../../lib/sync';

beforeEach(() => {
  getStatus.mockReset();
});

async function mountWith(status, queue = 0, lastError = null) {
  getStatus.mockResolvedValue({
    status,
    queue_depth: queue,
    last_run_at: Date.now() - 60_000,
    last_error: lastError,
  });
  let tree;
  await act(async () => {
    tree = create(<SyncStatusBadge />);
    // let the initial useEffect refresh resolve
    await Promise.resolve();
    await Promise.resolve();
  });
  return tree;
}

describe('SyncStatusBadge renders all spec statuses', () => {
  test('synced', async () => {
    const tree = await mountWith('synced');
    const txt = JSON.stringify(tree.toJSON());
    expect(txt).toMatch(/Synced/);
    tree.unmount();
  });

  test('pending shows queue count', async () => {
    const tree = await mountWith('pending', 3);
    const txt = JSON.stringify(tree.toJSON());
    expect(txt).toMatch(/Pending/);
    expect(txt).toMatch(/"3"/);
    tree.unmount();
  });

  test('offline', async () => {
    const tree = await mountWith('offline');
    const txt = JSON.stringify(tree.toJSON());
    expect(txt).toMatch(/Offline/);
    tree.unmount();
  });

  test('error', async () => {
    const tree = await mountWith('error', 0, 'boom');
    const txt = JSON.stringify(tree.toJSON());
    expect(txt).toMatch(/Sync error/);
    tree.unmount();
  });

  test('does not throw on null status (unknown)', async () => {
    const tree = await mountWith('unknown');
    const txt = JSON.stringify(tree.toJSON());
    expect(txt).toMatch(/Sync/);
    tree.unmount();
  });
});
