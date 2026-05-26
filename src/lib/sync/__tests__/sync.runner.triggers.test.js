/**
 * Asserts the spec'd triggers (foreground, network, write, periodic,
 * manual) are valid triggeredBy values the runner accepts and that
 * concurrent syncAll calls dedupe via the internal lock.
 *
 * Trigger wiring at the App.js layer is verified by source-grep
 * below so future PRs cannot silently drop one of the three
 * non-write triggers (foreground, network reconnect, periodic).
 */

jest.mock('../queue', () => ({
  ensureSyncQueueTable: jest.fn(async () => {}),
  getQueueDepth: jest.fn(async () => 0),
}));

jest.mock('../telemetry', () => ({
  trackSyncRun: jest.fn(async () => {}),
  trackSyncConflictResolved: jest.fn(async () => {}),
}));

jest.mock('../../sync', () => ({
  bulkUploadLocalData: jest.fn(async () => ({})),
  pullFromCloud: jest.fn(async () => ({})),
}));

import { syncAll, _resetRunnerForTests } from '../runner';
import { trackSyncRun } from '../telemetry';

beforeEach(() => {
  _resetRunnerForTests();
  trackSyncRun.mockClear();
});

describe('runner accepts every spec\'d triggeredBy', () => {
  test.each(['foreground', 'network', 'write', 'periodic', 'manual'])(
    'triggeredBy=%s reaches trackSyncRun',
    async (triggeredBy) => {
      await syncAll({ userId: 'u1', localUserId: 'u1', triggeredBy });
      expect(trackSyncRun).toHaveBeenCalledWith('u1', expect.objectContaining({ triggered_by: triggeredBy }));
    }
  );
});

describe('runner concurrent calls dedupe', () => {
  test('second call while first is in flight returns skipped', async () => {
    // Make bulkUploadLocalData take a tick so the second call lands
    // while the lock is held.
    const sync = require('../../sync');
    sync.bulkUploadLocalData.mockImplementationOnce(() => new Promise(r => setTimeout(() => r({}), 20)));
    const [a, b] = await Promise.all([
      syncAll({ userId: 'u1', localUserId: 'u1', triggeredBy: 'periodic' }),
      syncAll({ userId: 'u1', localUserId: 'u1', triggeredBy: 'foreground' }),
    ]);
    const skipped = [a, b].filter(r => r.status === 'skipped');
    expect(skipped).toHaveLength(1);
  });
});

describe('App.js wires the three non-write triggers', () => {
  // Source-grep regression guard: SYNC_ARCHITECTURE_LOCKED.md lines
  // 161-169 require foreground / network / periodic / write to all
  // reach syncAll. write is covered by scheduleSync; this guards
  // the other three.
  const fs = require('fs');
  const path = require('path');
  const APP = fs.readFileSync(path.resolve(__dirname, '../../../../App.js'), 'utf8');

  test('foreground trigger calls callSyncAll', () => {
    expect(APP).toMatch(/callSyncAll\(\s*['"]foreground['"]\s*\)/);
  });

  test('network reconnect trigger calls callSyncAll', () => {
    expect(APP).toMatch(/callSyncAll\(\s*['"]network['"]\s*\)/);
  });

  test('periodic trigger calls callSyncAll', () => {
    expect(APP).toMatch(/callSyncAll\(\s*['"]periodic['"]\s*\)/);
  });

  test('NetInfo addEventListener wired', () => {
    expect(APP).toMatch(/NetInfo\.addEventListener/);
  });

  test('15-minute periodic interval', () => {
    expect(APP).toMatch(/setInterval\([^,]+,\s*15\s*\*\s*60\s*\*\s*1000\s*\)/);
  });
});
