/**
 * sync_queue CRUD + compaction tests. Mocks the SQLite client so
 * tests don't touch real storage.
 */

const mockState = { rows: [], nextId: 1 };

jest.mock('../../database', () => ({
  // Mirror the real serialiser: run the task inside the mock's transaction.
  runInTransaction: async (d, task) => (d.withTransactionAsync ? d.withTransactionAsync(task) : task()),
  db: jest.fn(async () => ({
    async execAsync() {},
    async withTransactionAsync(fn) { await fn(); },
    async runAsync(sql, params = []) {
      const trimmed = sql.trim();
      if (/^DELETE FROM sync_queue WHERE table_name = \? AND record_id = \?$/i.test(trimmed)) {
        const [table, recordId] = params;
        mockState.rows = mockState.rows.filter(r => !(r.table_name === table && r.record_id === recordId));
        return;
      }
      if (/^DELETE FROM sync_queue WHERE table_name = \? AND record_id = \? AND operation IN/i.test(trimmed)) {
        const [table, recordId] = params;
        mockState.rows = mockState.rows.filter(r => !(
          r.table_name === table
          && r.record_id === recordId
          && ['insert','update'].includes(r.operation)
        ));
        return;
      }
      if (/^DELETE FROM sync_queue WHERE table_name = \?$/i.test(trimmed)) {
        const [table] = params;
        mockState.rows = mockState.rows.filter(r => r.table_name !== table);
        return;
      }
      if (/^INSERT INTO sync_queue/i.test(trimmed)) {
        const [table_name, operation, record_id, payload_json, queued_at] = params;
        mockState.rows.push({
          id: mockState.nextId++,
          table_name, operation, record_id, payload_json, queued_at,
          attempt_count: 0,
          last_error: null,
        });
        return;
      }
      if (/^DELETE FROM sync_queue WHERE id IN/i.test(trimmed)) {
        const ids = new Set(params);
        mockState.rows = mockState.rows.filter(r => !ids.has(r.id));
        return;
      }
      if (/^DELETE FROM sync_queue$/i.test(trimmed)) {
        mockState.rows = [];
        return;
      }
      if (/^UPDATE sync_queue\s+SET attempt_count = attempt_count \+ 1/i.test(trimmed)) {
        const [errMsg, id] = params;
        const row = mockState.rows.find(r => r.id === id);
        if (row) {
          row.attempt_count += 1;
          row.last_error = errMsg;
        }
        return;
      }
    },
    async getAllAsync() {
      return [...mockState.rows].sort((a, b) => a.queued_at.localeCompare(b.queued_at));
    },
    async getFirstAsync() {
      return { n: mockState.rows.length };
    },
  })),
}));

import {
  ensureSyncQueueTable,
  enqueue,
  listPending,
  getQueueDepth,
  markSucceeded,
  markFailed,
  clearQueue,
  purgeQueuedTable,
} from '../queue';

beforeEach(() => {
  mockState.rows = [];
  mockState.nextId = 1;
});

describe('sync_queue basic CRUD', () => {
  test('ensureSyncQueueTable runs without throwing', async () => {
    await expect(ensureSyncQueueTable()).resolves.toBeUndefined();
  });

  test('enqueue + getQueueDepth round-trip', async () => {
    await enqueue({ table: 'food_entries', operation: 'insert', recordId: 'r1', payload: { x: 1 } });
    expect(await getQueueDepth()).toBe(1);
  });

  test('listPending returns rows in queued_at order', async () => {
    await enqueue({ table: 'food_entries', operation: 'insert', recordId: 'r1', payload: {} });
    await new Promise(r => setTimeout(r, 5));
    await enqueue({ table: 'food_entries', operation: 'insert', recordId: 'r2', payload: {} });
    const pending = await listPending();
    expect(pending.map(r => r.record_id)).toEqual(['r1', 'r2']);
  });

  test('markSucceeded removes rows', async () => {
    await enqueue({ table: 'food_entries', operation: 'insert', recordId: 'r1', payload: {} });
    const pending = await listPending();
    await markSucceeded([pending[0].id]);
    expect(await getQueueDepth()).toBe(0);
  });

  test('markFailed increments attempt_count + sets last_error', async () => {
    await enqueue({ table: 'food_entries', operation: 'insert', recordId: 'r1', payload: {} });
    const [row] = await listPending();
    await markFailed(row.id, 'rls denied');
    expect(mockState.rows[0].attempt_count).toBe(1);
    expect(mockState.rows[0].last_error).toBe('rls denied');
  });

  test('clearQueue empties the table', async () => {
    await enqueue({ table: 'food_entries', operation: 'insert', recordId: 'r1', payload: {} });
    await enqueue({ table: 'custom_foods', operation: 'update', recordId: 'r2', payload: {} });
    await clearQueue();
    expect(await getQueueDepth()).toBe(0);
  });

  test('purgeQueuedTable drops only the named table, leaving others', async () => {
    await enqueue({ table: 'notification_preferences', operation: 'update', recordId: 'u1::a', payload: {} });
    await enqueue({ table: 'notification_preferences', operation: 'update', recordId: 'u1::b', payload: {} });
    await enqueue({ table: 'food_entries', operation: 'insert', recordId: 'r1', payload: {} });
    await purgeQueuedTable('notification_preferences');
    const remaining = await listPending();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].table_name).toBe('food_entries');
  });
});

describe('sync_queue compaction', () => {
  test('two updates to the same record collapse to one row', async () => {
    await enqueue({ table: 'food_entries', operation: 'update', recordId: 'r1', payload: { v: 1 } });
    await enqueue({ table: 'food_entries', operation: 'update', recordId: 'r1', payload: { v: 2 } });
    expect(mockState.rows.filter(r => r.record_id === 'r1')).toHaveLength(1);
    const stored = JSON.parse(mockState.rows[0].payload_json);
    expect(stored.v).toBe(2);
  });

  test('delete supersedes prior updates for the same record', async () => {
    await enqueue({ table: 'food_entries', operation: 'update', recordId: 'r1', payload: { v: 1 } });
    await enqueue({ table: 'food_entries', operation: 'delete', recordId: 'r1', payload: null });
    expect(mockState.rows.filter(r => r.record_id === 'r1')).toHaveLength(1);
    expect(mockState.rows[0].operation).toBe('delete');
  });

  test('updates on different records do NOT collapse', async () => {
    await enqueue({ table: 'food_entries', operation: 'update', recordId: 'r1', payload: {} });
    await enqueue({ table: 'food_entries', operation: 'update', recordId: 'r2', payload: {} });
    expect(mockState.rows).toHaveLength(2);
  });
});

describe('sync_queue backoff', () => {
  test('listPending withholds rows whose backoff has not elapsed', async () => {
    await enqueue({ table: 'food_entries', operation: 'insert', recordId: 'r1', payload: {} });
    const [row] = await listPending();
    await markFailed(row.id, 'transient');
    const pending = await listPending();
    expect(pending).toHaveLength(0);
  });
});
