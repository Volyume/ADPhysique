/**
 * NEW-002 pair-scoped sync handler (sync.regressionMatrix coverage for
 * partner_signals). The pair shape breaks the user-scoped assumption every
 * other handler relies on, so it gets its own invariants:
 *
 *   - push uploads only MY own week signals for ACTIVE pairs
 *   - pull restores both members' signals + cheers and my partnerships
 *   - PRUNE: a partnership the cloud no longer returns as mine (the other side
 *     unpaired while I was offline) is forced to 'ended' locally
 *   - a missing cloud table (081 not applied) is a benign skip, never an error
 */

jest.mock('../telemetry', () => ({ logSyncError: jest.fn() }));

jest.mock('../../database', () => ({
  getPartnershipsLocal: jest.fn(),
  getPartnerWeekSignal: jest.fn(),
  getLocalPartnershipIds: jest.fn(),
  upsertPartnershipFromCloud: jest.fn(),
  upsertPartnerWeekSignalFromCloud: jest.fn(),
  upsertPartnerCheerFromCloud: jest.fn(),
  deleteLocalPairSharedData: jest.fn(),
  upsertPartnerSharedBlockFromCloud: jest.fn(),
  deleteLocalPartnerSharedBlock: jest.fn(),
}));

const dbMock = require('../../database');
const { pushPartners, pullPartners } = require('../tables/partners');

beforeEach(() => {
  jest.clearAllMocks();
  dbMock.getLocalPartnershipIds.mockResolvedValue([]);
  dbMock.upsertPartnershipFromCloud.mockResolvedValue(undefined);
  dbMock.upsertPartnerWeekSignalFromCloud.mockResolvedValue(undefined);
  dbMock.upsertPartnerCheerFromCloud.mockResolvedValue(undefined);
  dbMock.deleteLocalPairSharedData.mockResolvedValue(undefined);
  dbMock.upsertPartnerSharedBlockFromCloud.mockResolvedValue(undefined);
  dbMock.deleteLocalPartnerSharedBlock.mockResolvedValue(undefined);
});

describe('pushPartners', () => {
  test('uploads my own week signal for an active pair', async () => {
    dbMock.getPartnershipsLocal.mockResolvedValue([
      { id: 'pair1', status: 'active' },
      { id: 'pair2', status: 'invited' }, // not active -> not pushed
    ]);
    dbMock.getPartnerWeekSignal.mockResolvedValue({
      weekStart: '1700000000000', plannedCount: 4, doneCount: 3, weekMet: false,
      state: 'training', updatedAt: 1700000001000,
    });
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const sb = { from: jest.fn(() => ({ upsert })) };

    const r = await pushPartners(sb, { userId: 'me', localUserId: 'me' });
    expect(r.count).toBe(1);
    expect(sb.from).toHaveBeenCalledWith('partner_week_signals');
    const [rows, opts] = upsert.mock.calls[0];
    expect(rows[0]).toMatchObject({ pair_id: 'pair1', user_id: 'me', done_count: 3, week_met: false });
    expect(opts).toEqual({ onConflict: 'pair_id,user_id,week_start' });
    // Only the active pair was queried for a signal.
    expect(dbMock.getPartnerWeekSignal).toHaveBeenCalledTimes(1);
  });

  test('no active pairs -> nothing pushed', async () => {
    dbMock.getPartnershipsLocal.mockResolvedValue([{ id: 'p', status: 'ended' }]);
    const sb = { from: jest.fn() };
    expect(await pushPartners(sb, { userId: 'me' })).toEqual({ count: 0, errors: 0 });
    expect(sb.from).not.toHaveBeenCalled();
  });

  test('a missing cloud table is a benign skip', async () => {
    dbMock.getPartnershipsLocal.mockResolvedValue([{ id: 'pair1', status: 'active' }]);
    dbMock.getPartnerWeekSignal.mockResolvedValue({ weekStart: '1', plannedCount: 4, doneCount: 4, weekMet: true, state: 'training', updatedAt: 1 });
    const sb = { from: jest.fn(() => ({ upsert: jest.fn().mockResolvedValue({ error: { code: 'PGRST205', message: 'partner_week_signals not found' } }) })) };
    const r = await pushPartners(sb, { userId: 'me' });
    expect(r.skipped).toBe('cloud_table_missing');
    expect(r.errors).toBe(0);
  });
});

describe('pullPartners', () => {
  function makeSb({ partnerships = [], signals = [], cheers = [], blocks = [], blocksError = null } = {}) {
    return {
      from: jest.fn((table) => {
        if (table === 'partnerships') {
          return { select: () => ({ or: () => Promise.resolve({ data: partnerships, error: null }) }) };
        }
        if (table === 'partner_week_signals') {
          return { select: () => ({ in: () => Promise.resolve({ data: signals, error: null }) }) };
        }
        if (table === 'partner_cheers') {
          return { select: () => ({ in: () => Promise.resolve({ data: cheers, error: null }) }) };
        }
        if (table === 'partner_shared_blocks') {
          return { select: () => ({ in: () => Promise.resolve(blocksError ? { data: null, error: blocksError } : { data: blocks, error: null }) }) };
        }
        return { select: () => ({}) };
      }),
    };
  }

  test('restores partnerships, both members’ signals and cheers', async () => {
    const sb = makeSb({
      partnerships: [{ id: 'pair1', member_a: 'me', member_b: 'sam', status: 'active' }],
      signals: [
        { pair_id: 'pair1', user_id: 'me', week_start: '1', planned_count: 4, done_count: 4, week_met: true, state: 'training' },
        { pair_id: 'pair1', user_id: 'sam', week_start: '1', planned_count: 3, done_count: 2, week_met: false, state: 'training' },
      ],
      cheers: [{ id: 'c1', pair_id: 'pair1', sender_id: 'sam', sent_on: '2026-06-12' }],
    });
    const r = await pullPartners(sb, { userId: 'me' });
    expect(r.errors).toBe(0);
    expect(dbMock.upsertPartnershipFromCloud).toHaveBeenCalledWith(expect.objectContaining({ id: 'pair1' }));
    expect(dbMock.upsertPartnerWeekSignalFromCloud).toHaveBeenCalledTimes(2); // both members
    expect(dbMock.upsertPartnerCheerFromCloud).toHaveBeenCalledTimes(1);
  });

  test('INVARIANT unpair-while-offline: a vanished local pair is forced ended AND its shared rows purged', async () => {
    // Cloud no longer returns pair1 as mine (the other side ended + both gone),
    // but it is still in my local mirror.
    dbMock.getLocalPartnershipIds.mockResolvedValue(['pair1']);
    const sb = makeSb({ partnerships: [] });
    await pullPartners(sb, { userId: 'me' });
    expect(dbMock.upsertPartnershipFromCloud).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pair1', status: 'ended' }),
    );
    // Deletion promise (blueprint §5), other member's side: the vanished pair's
    // shared signals + cheers are purged from the local mirror.
    expect(dbMock.deleteLocalPairSharedData).toHaveBeenCalledWith('pair1');
  });

  test('INVARIANT: an ended pair returned by the cloud purges its local shared rows and keeps no signals', async () => {
    const sb = makeSb({
      partnerships: [{ id: 'pair1', member_a: 'me', member_b: 'sam', status: 'ended' }],
      // Even if the cloud somehow still returned signals, an ended pair is not in
      // activePairIds, so none are pulled; and the local copy is purged.
      signals: [],
      cheers: [],
    });
    await pullPartners(sb, { userId: 'me' });
    expect(dbMock.deleteLocalPairSharedData).toHaveBeenCalledWith('pair1');
    expect(dbMock.upsertPartnerWeekSignalFromCloud).not.toHaveBeenCalled();
    expect(dbMock.upsertPartnerCheerFromCloud).not.toHaveBeenCalled();
  });

  test('an ACTIVE pair is never purged (shared data flows normally)', async () => {
    const sb = makeSb({
      partnerships: [{ id: 'pair1', member_a: 'me', member_b: 'sam', status: 'active' }],
      signals: [{ pair_id: 'pair1', user_id: 'me', week_start: '1', planned_count: 4, done_count: 4, week_met: true, state: 'training' }],
    });
    await pullPartners(sb, { userId: 'me' });
    expect(dbMock.deleteLocalPairSharedData).not.toHaveBeenCalled();
    expect(dbMock.upsertPartnerWeekSignalFromCloud).toHaveBeenCalledTimes(1);
  });

  // ── Shared training block (Wave 5 C5 A1) ──
  test('restores the shared block row for an active pair', async () => {
    const sb = makeSb({
      partnerships: [{ id: 'pair1', member_a: 'me', member_b: 'sam', status: 'active' }],
      blocks: [{ pair_id: 'pair1', block_ref: 'ref1', block_name: 'X-Frame', proposed_by: 'sam', status: 'proposed' }],
    });
    const r = await pullPartners(sb, { userId: 'me' });
    expect(r.errors).toBe(0);
    expect(dbMock.upsertPartnerSharedBlockFromCloud).toHaveBeenCalledWith(
      expect.objectContaining({ pair_id: 'pair1', block_name: 'X-Frame' }),
    );
    expect(dbMock.deleteLocalPartnerSharedBlock).not.toHaveBeenCalled();
  });

  test('INVARIANT: an active pair with NO cloud block row clears the local mirror (partner left the block)', async () => {
    const sb = makeSb({
      partnerships: [{ id: 'pair1', member_a: 'me', member_b: 'sam', status: 'active' }],
      blocks: [],
    });
    await pullPartners(sb, { userId: 'me' });
    expect(dbMock.deleteLocalPartnerSharedBlock).toHaveBeenCalledWith('pair1');
    expect(dbMock.upsertPartnerSharedBlockFromCloud).not.toHaveBeenCalled();
  });

  test('a missing partner_shared_blocks cloud table (migrate_100 unapplied) is benign, never an error', async () => {
    const sb = makeSb({
      partnerships: [{ id: 'pair1', member_a: 'me', member_b: 'sam', status: 'active' }],
      blocksError: { code: 'PGRST205', message: 'partner_shared_blocks not found' },
    });
    const r = await pullPartners(sb, { userId: 'me' });
    expect(r.errors).toBe(0);
    // Missing table must NOT clear local rows: absence of the table is not
    // evidence the partner left the block.
    expect(dbMock.deleteLocalPartnerSharedBlock).not.toHaveBeenCalled();
  });

  test('a missing cloud partnerships table is a benign skip', async () => {
    const sb = { from: jest.fn(() => ({ select: () => ({ or: () => Promise.resolve({ data: null, error: { code: 'PGRST205', message: 'partnerships not found' } }) }) })) };
    const r = await pullPartners(sb, { userId: 'me' });
    expect(r.skipped).toBe('cloud_table_missing');
    expect(r.errors).toBe(0);
  });
});
