jest.mock('expo-sqlite');

const SHARED_TABLES = [
  'partner_cheers',
  'partner_week_signals',
  'partner_shared_blocks',
  'partner_weekly_intentions',
  'partner_win_cards',
];

const database = require('../database');

describe('deleteLocalPairSharedData transaction', () => {
  let connection;
  let remaining;
  let deleteCount;
  let failAt;

  beforeAll(async () => {
    connection = await database.db();
  });

  beforeEach(() => {
    remaining = new Set(SHARED_TABLES);
    deleteCount = 0;
    failAt = null;
    connection.withTransactionAsync.mockClear();
    connection.isInTransactionSync.mockReturnValue(false);
    connection.runAsync.mockImplementation(async (sql) => {
      const table = SHARED_TABLES.find((name) => sql.includes(`DELETE FROM ${name}`));
      if (!table) return { changes: 0 };
      deleteCount += 1;
      if (deleteCount === failAt) throw new Error(`injected failure at ${table}`);
      remaining.delete(table);
      return { changes: 1 };
    });
    connection.withTransactionAsync.mockImplementation(async (task) => {
      const snapshot = new Set(remaining);
      try {
        await task();
      } catch (e) {
        remaining = snapshot;
        throw e;
      }
    });
  });

  test.each([1, 2, 3, 4, 5])('failure at delete %i rolls every shared table back', async (position) => {
    failAt = position;

    await expect(database.deleteLocalPairSharedData('pair-1')).rejects.toThrow('injected failure');

    expect([...remaining]).toEqual(SHARED_TABLES);
    expect(connection.withTransactionAsync).toHaveBeenCalledTimes(1);
  });

  test('successful unpair purge removes every shared table row', async () => {
    await database.deleteLocalPairSharedData('pair-1');

    expect([...remaining]).toEqual([]);
    expect(deleteCount).toBe(SHARED_TABLES.length);
  });
});
