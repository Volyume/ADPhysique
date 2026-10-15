/**
 * clipThumbnails: the times the trim strip's frames are taken at (D229).
 * Pins: the first frame is the window's start, the last sits two frames
 * short of the end (the Android seek defect, 01-NATIVE-RESEARCH.md 7.3),
 * the window is clamped to the clip, and a count of one gives the start.
 */
jest.mock('@shopify/react-native-skia', () => ({ Skia: {} }));

const { thumbnailTimes } = require('../clipThumbnails');

describe('thumbnailTimes', () => {
  test('spaces frames from the start to two frames short of the end', () => {
    const t = thumbnailTimes(10000, 5, { frameMs: 100 });
    expect(t[0]).toBe(0);
    expect(t[t.length - 1]).toBe(9800);
    expect(t).toHaveLength(5);
    for (let i = 1; i < t.length; i += 1) expect(t[i]).toBeGreaterThan(t[i - 1]);
  });
  test('a window inside the clip is honoured, and never runs past the clip', () => {
    const t = thumbnailTimes(42000, 4, { fromMs: 10000, toMs: 25000, frameMs: 33.3 });
    expect(t[0]).toBe(10000);
    expect(t[3]).toBe(25000);
    const late = thumbnailTimes(42000, 3, { fromMs: 41990, toMs: 60000, frameMs: 33.3 });
    expect(late[late.length - 1]).toBeLessThanOrEqual(42000 - 66);
    expect(late[0]).toBeLessThanOrEqual(late[late.length - 1]);
  });
  test('one frame is the start; a bad count is treated as one', () => {
    expect(thumbnailTimes(5000, 1, { fromMs: 1200 })).toEqual([1200]);
    expect(thumbnailTimes(5000, 0)).toEqual([0]);
  });
});
