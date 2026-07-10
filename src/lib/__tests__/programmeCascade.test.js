jest.mock('expo-sqlite');
jest.mock('../sync', () => ({ scheduleSync: jest.fn() }));

const database = require('../database');
const { scheduleSync } = require('../sync');

describe('deleteProgrammeCascade', () => {
  let connection;

  beforeAll(async () => {
    connection = await database.db();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deletes children before parents in one transaction without scheduling cleanup sync', async () => {
    await database.deleteProgrammeCascade('programme-1', { scheduleSync: false });

    expect(connection.withTransactionAsync).toHaveBeenCalledTimes(1);
    const deletes = connection.runAsync.mock.calls
      .filter(([sql]) => sql.includes('DELETE FROM'))
      .map(([sql, params]) => ({ sql: sql.replace(/\s+/g, ' ').trim(), params }));
    expect(deletes).toEqual([
      {
        sql: 'DELETE FROM routine_exercises WHERE routine_id IN (SELECT id FROM routines WHERE programme_id = ?)',
        params: ['programme-1'],
      },
      { sql: 'DELETE FROM routines WHERE programme_id = ?', params: ['programme-1'] },
      { sql: 'DELETE FROM programmes WHERE id = ?', params: ['programme-1'] },
    ]);
    expect(scheduleSync).not.toHaveBeenCalled();
  });
});
