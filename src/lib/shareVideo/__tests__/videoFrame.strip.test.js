/**
 * videoFrameBase64 and videoStripBase64 (D229 addendum 17): the trim bar's
 * strip of frames, decoded offscreen. Pinned: the centre-crop to the asked
 * box for portrait and landscape frames, the frame released afterwards,
 * null (never a throw) on failure, and the strip's evenly spaced moments.
 */
const { videoFrameBase64, videoStripBase64 } = require('../videoFrame');

function makeSkia({ frame = { w: 1080, h: 1920 }, surface = true, failAt = null } = {}) {
  const calls = { drawn: [], disposed: 0, seeks: [] };
  const image = { width: () => frame.w, height: () => frame.h, dispose: () => { calls.disposed += 1; } };
  let lastSeek = 0;
  const Skia = {
    Video: () => ({
      duration: () => 60000, size: () => ({ width: frame.w, height: frame.h }), rotation: () => 0,
      seek: (ms) => { lastSeek = ms; calls.seeks.push(ms); },
      nextImage: () => (failAt !== null && lastSeek === failAt ? null : image), dispose: () => {},
    }),
    Surface: {
      MakeOffscreen: () => (surface ? {
        getCanvas: () => ({ drawImageRect: (img, src, dst) => calls.drawn.push({ src, dst }) }),
        flush: () => {},
        makeImageSnapshot: () => ({ encodeToBase64: () => 'FRAME' }),
      } : null),
    },
    Paint: () => ({ setAntiAlias: () => {} }),
    XYWHRect: (x, y, w, h) => ({ x, y, w, h }),
  };
  return { Skia, calls };
}

test('portrait frame centre-cropped to a 48:56 box and released', () => {
  const { Skia, calls } = makeSkia();
  expect(videoFrameBase64(Skia, 'file:///v.mp4', 5000, 48, 56)).toBe('FRAME');
  expect(calls.seeks).toEqual([5000]);
  expect(calls.drawn[0].src).toEqual({ x: 0, y: 330, w: 1080, h: 1260 });
  expect(calls.drawn[0].dst).toEqual({ x: 0, y: 0, w: 48, h: 56 });
  expect(calls.disposed).toBe(1);
});

test('landscape frame crops its sides', () => {
  const { Skia, calls } = makeSkia({ frame: { w: 1920, h: 1080 } });
  videoFrameBase64(Skia, 'file:///v.mp4', 0, 48, 56);
  const src = calls.drawn[0].src;
  expect(src.y).toBe(0);
  expect(src.h).toBe(1080);
  expect(src.w).toBeCloseTo(1080 * (48 / 56), 6);
  expect(src.x).toBeCloseTo((1920 - src.w) / 2, 6);
});

test('null, never a throw, on failure', () => {
  expect(videoFrameBase64({ Video: () => { throw new Error('bad'); } }, 'file:///v.mp4', 0, 48, 56)).toBeNull();
  expect(videoFrameBase64(null, 'file:///v.mp4', 0, 48, 56)).toBeNull();
  const { Skia, calls } = makeSkia({ surface: false });
  expect(videoFrameBase64(Skia, 'file:///v.mp4', 0, 48, 56)).toBeNull();
  expect(calls.disposed).toBe(1);
});

test('strip: count frames, evenly spaced from 0 to durationMs - 1', () => {
  const { Skia, calls } = makeSkia();
  const out = videoStripBase64(Skia, 'file:///v.mp4', 60000, 5, 48, 56);
  expect(out).toEqual(['FRAME', 'FRAME', 'FRAME', 'FRAME', 'FRAME']);
  expect(calls.seeks).toEqual([0, 15000, 29999.5, 44999, 59999].map(Math.round));
});

test('strip: a frame that fails is null, the rest still decode', () => {
  const { Skia } = makeSkia({ failAt: 15000 });
  expect(videoStripBase64(Skia, 'file:///v.mp4', 60000, 5, 48, 56)).toEqual(['FRAME', null, 'FRAME', 'FRAME', 'FRAME']);
  expect(videoStripBase64(null, 'file:///v.mp4', 60000, 3, 48, 56)).toEqual([null, null, null]);
});
