/**
 * videoFrame (lead ruling 2026-10-16, after Sentry VOLYUME-3M): every still
 * frame comes from the native module's extractFrames, never from Skia's video
 * object. Pinned against the real contract of engine.extractFrames (one slot
 * per time, null where that time failed, a rejection for a bad source):
 *   - grabVideoFrame asks for ONE frame at 1440, reads that JPEG and decodes
 *     it into an offscreen Skia image, returns native's upright size as it
 *     came (JS never rotates or swaps), and deletes the file afterwards;
 *   - a null slot, a rejected call, an empty read or a failed decode is null,
 *     never a throw;
 *   - videoThumbnailUri is one frame at 192, a file URI (no base64);
 *   - videoStripUris is ONE native call for the whole strip at 112, times
 *     evenly spaced from 0 to at least 100 ms before the end, with a failed
 *     frame a null slot and a rejected call all nulls.
 */
jest.mock('../engine', () => ({
  MAX_FRAME_TIMES: 64,
  extractFrames: jest.fn(),
}));

const FileSystem = require('expo-file-system/legacy');
const { extractFrames } = require('../engine');
const {
  grabVideoFrame, videoThumbnailUri, videoStripUris, stripTimes,
  STILL_EDGE, THUMB_EDGE, STRIP_EDGE,
} = require('../videoFrame');

function makeSkia({ image = { tag: 'img' } } = {}) {
  return {
    Data: { fromBase64: jest.fn((b64) => ({ data: b64 })) },
    Image: { MakeImageFromEncoded: jest.fn(() => image) },
  };
}

const frame = (uri, width, height, timeMs = 0) => ({ uri, width, height, timeMs });

beforeEach(() => {
  extractFrames.mockReset();
  FileSystem.readAsStringAsync.mockReset();
  FileSystem.readAsStringAsync.mockResolvedValue('JPEGB64');
  FileSystem.deleteAsync.mockClear();
});

describe('grabVideoFrame', () => {
  test('one frame at 1440, decoded offscreen, with native\'s upright size, and its file deleted', async () => {
    // A portrait phone video stored landscape with a 90 degree flag: native
    // has already turned it, so it arrives 810 by 1440 and JS keeps that.
    extractFrames.mockResolvedValue([frame('file:///cache/share-frames/a.jpg', 810, 1440, 5000)]);
    const Skia = makeSkia();
    const out = await grabVideoFrame(Skia, 'file:///v.mp4', 5000);
    expect(extractFrames).toHaveBeenCalledTimes(1);
    expect(extractFrames).toHaveBeenCalledWith('file:///v.mp4', [5000], { maxEdge: STILL_EDGE });
    expect(STILL_EDGE).toBe(1440);
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('file:///cache/share-frames/a.jpg', { encoding: 'base64' });
    expect(Skia.Data.fromBase64).toHaveBeenCalledWith('JPEGB64');
    expect(Skia.Image.MakeImageFromEncoded).toHaveBeenCalledWith({ data: 'JPEGB64' });
    expect(out).toEqual({ image: { tag: 'img' }, width: 810, height: 1440 });
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/share-frames/a.jpg', { idempotent: true });
  });

  test('a negative or missing moment asks for 0', async () => {
    extractFrames.mockResolvedValue([frame('file:///f.jpg', 1440, 810)]);
    await grabVideoFrame(makeSkia(), 'file:///v.mp4', -300);
    await grabVideoFrame(makeSkia(), 'file:///v.mp4');
    expect(extractFrames.mock.calls.map((c) => c[1])).toEqual([[0], [0]]);
  });

  test('a null slot is null, and nothing is read', async () => {
    extractFrames.mockResolvedValue([null]);
    expect(await grabVideoFrame(makeSkia(), 'file:///v.mp4', 0)).toBeNull();
    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
  });

  test('a rejected call (a video that cannot be opened) is null, never a throw', async () => {
    extractFrames.mockRejectedValue(Object.assign(new Error('That video could not be opened.'), { code: 'E_SOURCE' }));
    await expect(grabVideoFrame(makeSkia(), 'file:///v.mp4', 0)).resolves.toBeNull();
  });

  test('an empty read or a failed decode is null, and the file still goes', async () => {
    extractFrames.mockResolvedValue([frame('file:///f.jpg', 1440, 810)]);
    FileSystem.readAsStringAsync.mockResolvedValueOnce('');
    expect(await grabVideoFrame(makeSkia(), 'file:///v.mp4', 0)).toBeNull();
    expect(await grabVideoFrame(makeSkia({ image: null }), 'file:///v.mp4', 0)).toBeNull();
    FileSystem.readAsStringAsync.mockRejectedValueOnce(new Error('gone'));
    expect(await grabVideoFrame(makeSkia(), 'file:///v.mp4', 0)).toBeNull();
    expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(3);
  });

  test('no Skia or no uri: null without a native call', async () => {
    expect(await grabVideoFrame(null, 'file:///v.mp4', 0)).toBeNull();
    expect(await grabVideoFrame({}, 'file:///v.mp4', 0)).toBeNull();
    expect(await grabVideoFrame(makeSkia(), '', 0)).toBeNull();
    expect(extractFrames).not.toHaveBeenCalled();
  });
});

describe('videoThumbnailUri', () => {
  test('one frame at 0 and 192, returned as its file URI', async () => {
    extractFrames.mockResolvedValue([frame('file:///cache/share-frames/t.jpg', 108, 192)]);
    expect(await videoThumbnailUri('file:///v.mp4')).toBe('file:///cache/share-frames/t.jpg');
    expect(extractFrames).toHaveBeenCalledWith('file:///v.mp4', [0], { maxEdge: THUMB_EDGE });
    expect(THUMB_EDGE).toBe(192);
    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
  });

  test('a null slot or a rejection is null', async () => {
    extractFrames.mockResolvedValueOnce([null]);
    expect(await videoThumbnailUri('file:///v.mp4')).toBeNull();
    extractFrames.mockRejectedValueOnce(new Error('E_DECODE'));
    expect(await videoThumbnailUri('file:///v.mp4')).toBeNull();
    expect(await videoThumbnailUri(null)).toBeNull();
  });
});

describe('videoStripUris', () => {
  test('times: evenly spaced from 0 to at least 100 ms before the end', () => {
    expect(stripTimes(60000, 5)).toEqual([0, 14975, 29950, 44925, 59900]);
    expect(stripTimes(60000, 1)).toEqual([0]);
    expect(stripTimes(50, 3)).toEqual([0, 0, 0]);
    expect(stripTimes(60000, 0)).toEqual([]);
    expect(stripTimes(60000, 500)).toHaveLength(64);
    for (const t of stripTimes(12345, 9)) expect(t).toBeLessThanOrEqual(12245);
  });

  test('ONE native call at 112 for the whole strip, file URIs back', async () => {
    extractFrames.mockImplementation(async (_uri, times) => times.map((t, i) => frame(`file:///s${i}.jpg`, 63, 112, t)));
    const out = await videoStripUris('file:///v.mp4', 60000, 5);
    expect(extractFrames).toHaveBeenCalledTimes(1);
    expect(extractFrames).toHaveBeenCalledWith('file:///v.mp4', [0, 14975, 29950, 44925, 59900], { maxEdge: STRIP_EDGE });
    expect(STRIP_EDGE).toBe(112);
    expect(out).toEqual(['file:///s0.jpg', 'file:///s1.jpg', 'file:///s2.jpg', 'file:///s3.jpg', 'file:///s4.jpg']);
  });

  test('a frame that fails is a null slot, the rest still show', async () => {
    extractFrames.mockResolvedValue([frame('file:///a.jpg', 63, 112), null, frame('file:///c.jpg', 63, 112)]);
    expect(await videoStripUris('file:///v.mp4', 30000, 3)).toEqual(['file:///a.jpg', null, 'file:///c.jpg']);
  });

  test('a rejected call is all nulls, never a throw; nothing asked is nothing back', async () => {
    extractFrames.mockRejectedValue(Object.assign(new Error('x'), { code: 'E_SOURCE' }));
    await expect(videoStripUris('file:///v.mp4', 30000, 3)).resolves.toEqual([null, null, null]);
    expect(await videoStripUris('file:///v.mp4', 30000, 0)).toEqual([]);
    expect(await videoStripUris('', 30000, 2)).toEqual([null, null]);
  });
});
