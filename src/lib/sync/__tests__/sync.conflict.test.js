/**
 * Conflict resolver dispatch tests. Each strategy from
 * SYNC_ARCHITECTURE_LOCKED.md lines 172-195 has its own case.
 */

jest.mock('../telemetry', () => ({
  trackSyncConflictResolved: jest.fn(async () => {}),
}));

import { resolve } from '../conflict';
import { trackSyncConflictResolved } from '../telemetry';

beforeEach(() => {
  trackSyncConflictResolved.mockClear();
});

describe('resolve() last_write_wins', () => {
  test('newer client beats older server', async () => {
    const out = await resolve({
      table: 'weight_log',
      recordId: 'r1',
      local:  { id: 'r1', value: 'NEW', updated_at: '2026-05-26T12:00:00Z' },
      server: { id: 'r1', value: 'OLD', updated_at: '2026-05-26T10:00:00Z' },
    });
    expect(out.winner).toBe('client');
    expect(out.row.value).toBe('NEW');
    expect(out.strategy).toBe('last_write_wins');
  });

  test('newer server beats older client', async () => {
    const out = await resolve({
      table: 'weight_log',
      recordId: 'r1',
      local:  { id: 'r1', value: 'OLD', updated_at: '2026-05-26T08:00:00Z' },
      server: { id: 'r1', value: 'NEW', updated_at: '2026-05-26T12:00:00Z' },
    });
    expect(out.winner).toBe('server');
    expect(out.row.value).toBe('NEW');
  });

  test('missing server falls back to client', async () => {
    const out = await resolve({
      table: 'weight_log',
      recordId: 'r1',
      local:  { id: 'r1', value: 'LOCAL', updated_at: '2026-05-26T08:00:00Z' },
      server: null,
    });
    expect(out.winner).toBe('client');
    expect(out.row.value).toBe('LOCAL');
  });
});

describe('resolve() server_wins (pull_only tables)', () => {
  test('rollup table: server always wins even if local is newer', async () => {
    const out = await resolve({
      table: 'daily_intake_rollups',
      recordId: 'u1:2026-05-26',
      local:  { user_id: 'u1', kcal_total: 999, updated_at: '2026-05-26T20:00:00Z' },
      server: { user_id: 'u1', kcal_total: 2400, updated_at: '2026-05-26T10:00:00Z' },
    });
    expect(out.winner).toBe('server');
    expect(out.row.kcal_total).toBe(2400);
    expect(out.strategy).toBe('server_wins');
  });
});

describe('resolve() merge (profiles)', () => {
  test('merges per-column based on column_updates_at', async () => {
    const out = await resolve({
      table: 'profiles',
      recordId: 'u1',
      local: {
        id: 'u1',
        name: 'Alice (updated phone-side)',
        notification_pref: 'all',
        updated_at: '2026-05-26T12:00:00Z',
        column_updates_at: { name: '2026-05-26T12:00:00Z' },
      },
      server: {
        id: 'u1',
        name: 'Alice',
        notification_pref: 'daily',
        updated_at: '2026-05-26T11:00:00Z',
        column_updates_at: { notification_pref: '2026-05-26T11:00:00Z' },
      },
    });
    expect(out.winner).toBe('merged');
    expect(out.row.name).toBe('Alice (updated phone-side)');
    expect(out.row.notification_pref).toBe('daily');
  });
});

describe('telemetry side effect', () => {
  test('fires sync_conflict_resolved with attribution', async () => {
    await resolve({
      table: 'food_entries',
      recordId: 'r1',
      local:  { id: 'r1', updated_at: '2026-05-26T12:00:00Z' },
      server: { id: 'r1', updated_at: '2026-05-26T10:00:00Z' },
      userId: 'u_test',
    });
    expect(trackSyncConflictResolved).toHaveBeenCalledTimes(1);
    expect(trackSyncConflictResolved).toHaveBeenCalledWith(
      'u_test',
      expect.objectContaining({
        table: 'food_entries',
        record_id: 'r1',
        strategy: 'last_write_wins',
        winner: 'client',
      }),
    );
  });
});
