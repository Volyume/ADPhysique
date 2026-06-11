/**
 * COMP-009 — dbSnapshot pure helpers (filename round-trip, sort, label).
 * The FS operations are thin wrappers over expo-file-system and are exercised
 * in-app; the parsing/sorting logic is what carries the risk, so it is pinned.
 */
import { snapshotName, parseSnapshotName, sortSnapshotNames, labelForSnapshot } from '../dbSnapshot';

describe('snapshotName / parseSnapshotName round-trip', () => {
  test('migration name round-trips', () => {
    const name = snapshotName('migration', { fromVersion: 70, toVersion: 71, at: 1718100000000 });
    expect(name).toBe('volyume_v70_to_v71_1718100000000.db');
    expect(parseSnapshotName(name)).toEqual({ kind: 'migration', fromVersion: 70, toVersion: 71, createdAt: 1718100000000 });
  });

  test('account-switch name round-trips', () => {
    const name = snapshotName('accountswitch', { at: 1718100000001 });
    expect(name).toBe('volyume_accountswitch_1718100000001.db');
    expect(parseSnapshotName(name)).toEqual({ kind: 'accountswitch', createdAt: 1718100000001 });
  });

  test('rejects non-snapshot names', () => {
    expect(parseSnapshotName('volyume.db')).toBeNull();
    expect(parseSnapshotName('random.txt')).toBeNull();
    expect(parseSnapshotName(null)).toBeNull();
  });
});

describe('sortSnapshotNames', () => {
  test('newest first; unparseable names dropped', () => {
    const names = [
      'volyume_v70_to_v71_1000.db',
      'volyume_accountswitch_3000.db',
      'not-a-snapshot.db',
      'volyume_v69_to_v70_2000.db',
    ];
    expect(sortSnapshotNames(names)).toEqual([
      'volyume_accountswitch_3000.db',
      'volyume_v69_to_v70_2000.db',
      'volyume_v70_to_v71_1000.db',
    ]);
  });
});

describe('labelForSnapshot', () => {
  test('migration label names the target version and is marked automatic', () => {
    const label = labelForSnapshot({ kind: 'migration', fromVersion: 70, toVersion: 71, createdAt: Date.UTC(2026, 5, 11) });
    expect(label).toMatch(/^Before update to v71 · /);
    expect(label).toMatch(/automatic$/);
  });

  test('account-switch label', () => {
    const label = labelForSnapshot({ kind: 'accountswitch', createdAt: Date.UTC(2026, 5, 11) });
    expect(label).toMatch(/^Before account switch · /);
  });

  test('null meta is safe', () => {
    expect(labelForSnapshot(null)).toBe('Snapshot');
  });
});
