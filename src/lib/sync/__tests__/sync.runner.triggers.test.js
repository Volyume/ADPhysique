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
import { bulkUploadLocalData, pullFromCloud } from '../../sync';

beforeEach(() => {
  _resetRunnerForTests();
  trackSyncRun.mockClear();
  bulkUploadLocalData.mockClear();
  pullFromCloud.mockClear();
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

describe('runner delegation: legacy sync.js helpers actually fire', () => {
  // Codex audit F2: prove the require('../sync.js') in runner.js
  // resolves to the legacy file (not the directory's index.js) so
  // bulkUploadLocalData + pullFromCloud are genuinely invoked when
  // syncAll runs. If a future bundler change re-introduced the
  // circular self-import, both call counts would be 0 and this
  // test would fail.
  test('bulkUploadLocalData is invoked when userId + localUserId present', async () => {
    await syncAll({ userId: 'u1', localUserId: 'u1', triggeredBy: 'manual' });
    expect(bulkUploadLocalData).toHaveBeenCalledTimes(1);
    expect(bulkUploadLocalData).toHaveBeenCalledWith('u1', 'u1');
  });

  test('pullFromCloud is invoked when userId present', async () => {
    await syncAll({ userId: 'u1', localUserId: 'u1', triggeredBy: 'foreground' });
    expect(pullFromCloud).toHaveBeenCalledTimes(1);
    expect(pullFromCloud).toHaveBeenCalledWith('u1');
  });

  test('neither legacy helper is called when userId is null', async () => {
    await syncAll({ userId: null, localUserId: null, triggeredBy: 'manual' });
    expect(bulkUploadLocalData).not.toHaveBeenCalled();
    expect(pullFromCloud).not.toHaveBeenCalled();
  });
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
