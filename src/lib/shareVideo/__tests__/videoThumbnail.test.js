/**
 * videoThumbnailBase64 (D229 addendum 17): the share screen's strip of this
 * workout's videos shows one offscreen-decoded still per video as a plain
 * Image. Pinned: centre-crop of the first frame at the asked size, the
 * frame released afterwards, and null (never a throw) when the video will
 * not decode or the surface cannot be made.
 */
const { videoThumbnailBase64 } = require('../videoFrame');

function makeSkia({ frame = { w: 1080, h: 1920 }, surface = true } = {}) {
  const calls = { drawn: [], disposed: 0 };
  const image = {
    width: () => frame.w, height: () => frame.h, dispose: () => { calls.disposed += 1; },
  };
  const Skia = {
    Video: () => ({
      duration: () => 12000, size: () => ({ width: frame.w, height: frame.h }), rotation: () => 0,
      seek: () => {}, nextImage: () => image, dispose: () => {},
    }),
    Surface: {
      MakeOffscreen: () => (surface ? {
        getCanvas: () => ({ drawImageRect: (img, src, dst) => calls.drawn.push({ src, dst }) }),
        flush: () => {},
        makeImageSnapshot: () => ({ encodeToBase64: () => 'THUMB' }),
      } : null),
    },
    Paint: () => ({ setAntiAlias: () => {} }),
    XYWHRect: (x, y, w, h) => ({ x, y, w, h }),
  };
  return { Skia, calls };
}

test('a portrait frame is centre-cropped to a square at the asked size and the frame is released', () => {
  const { Skia, calls } = makeSkia();
  expect(videoThumbnailBase64(Skia, 'file:///v.mp4', 160)).toBe('THUMB');
  expect(calls.drawn).toEqual([{ src: { x: 0, y: 420, w: 1080, h: 1080 }, dst: { x: 0, y: 0, w: 160, h: 160 } }]);
  expect(calls.disposed).toBe(1);
});

test('a landscape frame crops its sides', () => {
  const { Skia, calls } = makeSkia({ frame: { w: 1920, h: 1080 } });
  videoThumbnailBase64(Skia, 'file:///v.mp4');
  expect(calls.drawn[0].src).toEqual({ x: 420, y: 0, w: 1080, h: 1080 });
  expect(calls.drawn[0].dst).toEqual({ x: 0, y: 0, w: 192, h: 192 });
});

test('null, never a throw, when the video will not decode or no surface can be made', () => {
  expect(videoThumbnailBase64({ Video: () => { throw new Error('bad'); } }, 'file:///v.mp4')).toBeNull();
  expect(videoThumbnailBase64(null, 'file:///v.mp4')).toBeNull();
  const { Skia, calls } = makeSkia({ surface: false });
  expect(videoThumbnailBase64(Skia, 'file:///v.mp4')).toBeNull();
  expect(calls.disposed).toBe(1);
});
