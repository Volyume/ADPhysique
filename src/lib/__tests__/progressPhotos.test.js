/**
 * Progress-photos pure helpers (gap #9). The filename<->timestamp parse and the
 * newest-first ordering are the logic worth locking; the FileSystem wrappers are
 * thin. documentDirectory is mocked so the module imports under node.
 */
jest.mock('expo-file-system/legacy', () => ({ documentDirectory: '/doc/' }));

import { timestampFromName, orderPhotos, photoDir } from '../progressPhotos';

describe('timestampFromName', () => {
  test('parses <ms>.jpg, rejects anything else', () => {
    expect(timestampFromName('1717000000000.jpg')).toBe(1717000000000);
    expect(timestampFromName('IMG_0001.jpg')).toBeNull();
    expect(timestampFromName('1717.png')).toBeNull();
    expect(timestampFromName('')).toBeNull();
    expect(timestampFromName(null)).toBeNull();
  });
});

describe('orderPhotos', () => {
  test('newest first, ignores foreign files, builds the uri under the photo dir', () => {
    const rows = orderPhotos(['100.jpg', 'notes.txt', '300.jpg', '200.jpg', '.DS_Store']);
    expect(rows.map((r) => r.ts)).toEqual([300, 200, 100]);
    expect(rows[0].uri).toBe(`${photoDir()}300.jpg`);
  });
  test('empty / missing input is an empty list', () => {
    expect(orderPhotos([])).toEqual([]);
    expect(orderPhotos(undefined)).toEqual([]);
  });
});
