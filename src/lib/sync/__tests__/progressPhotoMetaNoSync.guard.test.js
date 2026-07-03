/**
 * Guard: progress photos AND their metadata NEVER leave the device.
 *
 * Progress photos are special-category (body-image) data and are device-local
 * by constraint (src/lib/progressPhotos.js header; A1 §4). The new
 * `progress_photo_meta` table (takenAt / pose / weight snapshot / note) inherits
 * exactly that posture: it must NOT be a syncable table. Adding a table to sync
 * is, by spec, adding a row to SYNC_REGISTRY — so this pins that no such row is
 * ever added for the photo-metadata table (or any photo table).
 */
import { SYNC_REGISTRY } from '../registry';

describe('progress_photo_meta is never synced', () => {
  test('SYNC_REGISTRY has no progress_photo_meta entry', () => {
    const tables = SYNC_REGISTRY.map((e) => e.table);
    expect(tables).not.toContain('progress_photo_meta');
  });

  test('SYNC_REGISTRY has no photo-related table at all', () => {
    const tables = SYNC_REGISTRY.map((e) => e.table);
    expect(tables.some((t) => /photo/i.test(t))).toBe(false);
  });
});
