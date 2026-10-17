/**
 * The share video engine wrapper (D229; research report section 6.2).
 *
 * Pins the contract the share screen relies on:
 *   - without the native module (Expo Go, an older build) isAvailable() is
 *     false and every call rejects E_UNAVAILABLE, so video is hidden, never
 *     half-offered;
 *   - progress is subscribed BEFORE the native call and removed in finally,
 *     whether the export resolves, fails or is cancelled (a leaked listener
 *     would keep firing into a closed screen);
 *   - one export at a time: a second call rejects E_BUSY and never reaches
 *     native;
 *   - only the documented keys cross, with the look as the final 20 numbers
 *     and the placement rect; `strength` and `crop` never do (addendum 5,
 *     ruling 11), and the outline draw-on is gone (founder correction
 *     2026-10-15: the card is completely still on the video);
 *   - every failure carries a calm message, the founder's copy, never native
 *     text.
 */

const mockState = { native: null };

jest.mock('expo-modules-core', () => ({
  requireNativeModule: jest.fn((name) => {
    if (!mockState.native) throw new Error(`Cannot find native module '${name}'`);
    return mockState.native;
  }),
}));

function loadEngine() {
  let engine;
  jest.isolateModules(() => {
    // eslint-disable-next-line global-require
    engine = require('../engine');
  });
  return engine;
}

function makeNative() {
  const subscriptions = [];
  return {
    subscriptions,
    addListener: jest.fn((eventName, listener) => {
      const sub = { eventName, listener, remove: jest.fn() };
      subscriptions.push(sub);
      return sub;
    }),
    exportShareVideo: jest.fn(),
    cancelExport: jest.fn(async () => undefined),
    probeVideo: jest.fn(async () => null),
    setLockScreenWallpaper: jest.fn(async () => true),
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const LOOK = [1.2, -0.1, 0, 0, -0.05, 0, 1.1, 0, 0, -0.02, 0, 0, 1.3, 0, -0.04, 0, 0, 0, 1, 0];

const OPTIONS = {
  sourceUri: 'file:///cache/clip.mp4',
  startMs: 2000,
  durationMs: 15000,
  matrix: LOOK,
  rect: { x: -1166.6666666666667, y: 0, w: 3413.3333333333335, h: 1920 },
  overlayPngUri: 'file:///cache/card.png',
  outWidth: 1080,
  outHeight: 1920,
};

const RESULT = {
  uri: 'file:///cache/share-video/volyume-share-1.mp4',
  width: 1080,
  height: 1920,
  durationMs: 15000,
  fileSizeBytes: 15000000,
};

const nativeError = (code, message = 'native detail') => Object.assign(new Error(message), { code });

afterEach(() => {
  mockState.native = null;
});

describe('without the native module', () => {
  test('isAvailable is false and every call rejects E_UNAVAILABLE', async () => {
    const engine = loadEngine();
    expect(engine.isAvailable()).toBe(false);
    await expect(engine.probeVideo('file:///cache/clip.mp4')).rejects.toMatchObject({ code: 'E_UNAVAILABLE' });
    await expect(engine.exportShareVideo(OPTIONS, () => {})).rejects.toMatchObject({ code: 'E_UNAVAILABLE' });
    await expect(engine.cancelExport()).rejects.toMatchObject({ code: 'E_UNAVAILABLE' });
    await expect(engine.setLockScreenWallpaper('file:///cache/card.png')).rejects.toMatchObject({ code: 'E_UNAVAILABLE' });
  });

  test('the rejection still carries a calm line, not native text', async () => {
    const engine = loadEngine();
    const err = await engine.exportShareVideo(OPTIONS).catch((e) => e);
    expect(err.message).toBe(engine.lineForExportError('E_UNAVAILABLE'));
  });
});

describe('progress subscription', () => {
  test('subscribes before the native call, forwards progress, removes after success', async () => {
    const native = makeNative();
    mockState.native = native;
    const engine = loadEngine();
    expect(engine.isAvailable()).toBe(true);
    const seen = [];
    native.exportShareVideo.mockImplementation(async () => {
      expect(native.subscriptions).toHaveLength(1);
      expect(native.subscriptions[0].remove).not.toHaveBeenCalled();
      native.subscriptions[0].listener({ progress: 0.5 });
      native.subscriptions[0].listener({ progress: 7 });
      native.subscriptions[0].listener({ progress: Number.NaN });
      return RESULT;
    });

    const out = await engine.exportShareVideo(OPTIONS, (p) => seen.push(p));

    expect(native.addListener).toHaveBeenCalledWith('onExportProgress', expect.any(Function));
    expect(native.addListener.mock.invocationCallOrder[0])
      .toBeLessThan(native.exportShareVideo.mock.invocationCallOrder[0]);
    expect(seen).toEqual([0.5, 1]);
    expect(native.subscriptions[0].remove).toHaveBeenCalledTimes(1);
    expect(out).toEqual(RESULT);
  });

  test('removes the subscription when native fails', async () => {
    const native = makeNative();
    mockState.native = native;
    const engine = loadEngine();
    native.exportShareVideo.mockRejectedValue(nativeError('E_DECODE'));
    await expect(engine.exportShareVideo(OPTIONS, () => {})).rejects.toMatchObject({ code: 'E_DECODE' });
    expect(native.subscriptions[0].remove).toHaveBeenCalledTimes(1);
  });

  test('removes the subscription when the export is cancelled', async () => {
    const native = makeNative();
    mockState.native = native;
    const engine = loadEngine();
    native.exportShareVideo.mockRejectedValue(nativeError('E_CANCELLED'));
    await expect(engine.exportShareVideo(OPTIONS, () => {})).rejects.toMatchObject({ code: 'E_CANCELLED' });
    expect(native.subscriptions[0].remove).toHaveBeenCalledTimes(1);
  });

  test('a throwing progress callback does not stop the export', async () => {
    const native = makeNative();
    mockState.native = native;
    const engine = loadEngine();
    native.exportShareVideo.mockImplementation(async () => {
      native.subscriptions[0].listener({ progress: 0.2 });
      return RESULT;
    });
    await expect(engine.exportShareVideo(OPTIONS, () => { throw new Error('screen gone'); })).resolves.toEqual(RESULT);
  });
});

describe('one export at a time', () => {
  test('a second call while one runs rejects E_BUSY and never reaches native', async () => {
    const native = makeNative();
    mockState.native = native;
    const engine = loadEngine();
    const first = deferred();
    native.exportShareVideo.mockReturnValueOnce(first.promise);

    const running = engine.exportShareVideo(OPTIONS, () => {});
    await expect(engine.exportShareVideo(OPTIONS, () => {})).rejects.toMatchObject({ code: 'E_BUSY' });
    expect(native.exportShareVideo).toHaveBeenCalledTimes(1);

    first.resolve(RESULT);
    await expect(running).resolves.toEqual(RESULT);

    native.exportShareVideo.mockResolvedValueOnce(RESULT);
    await expect(engine.exportShareVideo(OPTIONS, () => {})).resolves.toEqual(RESULT);
    expect(native.exportShareVideo).toHaveBeenCalledTimes(2);
  });

  test('the guard is released after a failure', async () => {
    const native = makeNative();
    mockState.native = native;
    const engine = loadEngine();
    native.exportShareVideo.mockRejectedValueOnce(nativeError('E_SPACE'));
    await expect(engine.exportShareVideo(OPTIONS)).rejects.toMatchObject({ code: 'E_SPACE' });
    native.exportShareVideo.mockResolvedValueOnce(RESULT);
    await expect(engine.exportShareVideo(OPTIONS)).resolves.toEqual(RESULT);
  });

  test('native E_BUSY passes through', async () => {
    const native = makeNative();
    mockState.native = native;
    const engine = loadEngine();
    native.exportShareVideo.mockRejectedValueOnce(nativeError('E_BUSY'));
    await expect(engine.exportShareVideo(OPTIONS)).rejects.toMatchObject({ code: 'E_BUSY' });
  });
});

describe('what crosses to native', () => {
  test('exactly the documented keys, with the default bitrate; strength, crop and outline never cross', async () => {
    const native = makeNative();
    mockState.native = native;
    const engine = loadEngine();
    native.exportShareVideo.mockResolvedValue(RESULT);
    await engine.exportShareVideo({
      ...OPTIONS,
      strength: 0.8,
      crop: { zoom: 1, cx: 0.5, cy: 0.5 },
      outline: { x: 0, y: 0, w: 10, h: 10 },
    });
    const sent = native.exportShareVideo.mock.calls[0][0];
    expect(Object.keys(sent).sort()).toEqual([
      'bitrate', 'durationMs', 'matrix', 'outHeight', 'outWidth', 'overlayPngUri', 'rect', 'sourceUri', 'startMs',
    ]);
    expect(sent.bitrate).toBe(8000000);
    expect(sent.matrix).toEqual(LOOK);
    expect(sent.rect).toEqual(OPTIONS.rect);
  });

  // Sentry VOLYUME-3N: Expo's iOS bridge stores a JS null inside the options
  // object as a boxed nil (expo-modules-core AnyDynamicType.swift,
  // `getRaw() as Any`), which ExportSpec.parse did not read as NSNull and so
  // refused as a malformed matrix (E_INVALID). No look must leave the key out.
  test.each([['null', null], ['undefined', undefined]])('no look (%s) leaves the matrix key out entirely', async (_label, value) => {
    const native = makeNative();
    mockState.native = native;
    const engine = loadEngine();
    native.exportShareVideo.mockResolvedValue(RESULT);
    await engine.exportShareVideo({ ...OPTIONS, matrix: value });
    const sent = native.exportShareVideo.mock.calls[0][0];
    expect(Object.prototype.hasOwnProperty.call(sent, 'matrix')).toBe(false);
    expect(Object.values(sent).some((v) => v === null || v === undefined)).toBe(false);
  });

  test.each([
    ['a clip over 15 seconds', { durationMs: 15001 }],
    ['a zero-length window', { durationMs: 0 }],
    ['a negative start', { startMs: -1 }],
    ['a NaN start', { startMs: Number.NaN }],
    ['a 19-number matrix', { matrix: LOOK.slice(0, 19) }],
    ['a matrix with Infinity', { matrix: [...LOOK.slice(0, 19), Infinity] }],
    ['a rect with NaN', { rect: { x: Number.NaN, y: 0, w: 1, h: 1 } }],
    ['a rect with no width', { rect: { x: 0, y: 0, w: 0, h: 1 } }],
    ['an odd width', { outWidth: 1081 }],
    ['a fractional height', { outHeight: 1919.5 }],
    ['a bitrate out of range', { bitrate: 100 }],
    ['no source', { sourceUri: '' }],
    ['no card picture', { overlayPngUri: undefined }],
  ])('%s rejects E_INVALID before native and leaves the guard free', async (_label, patch) => {
    const native = makeNative();
    mockState.native = native;
    const engine = loadEngine();
    await expect(engine.exportShareVideo({ ...OPTIONS, ...patch })).rejects.toMatchObject({ code: 'E_INVALID' });
    expect(native.exportShareVideo).not.toHaveBeenCalled();
    expect(native.addListener).not.toHaveBeenCalled();
    native.exportShareVideo.mockResolvedValue(RESULT);
    await expect(engine.exportShareVideo(OPTIONS)).resolves.toEqual(RESULT);
  });

  test('an unknown native code reads as could not be made, with the native text kept for logs only', async () => {
    const native = makeNative();
    mockState.native = native;
    const engine = loadEngine();
    native.exportShareVideo.mockRejectedValue(nativeError('ERR_SOMETHING', 'MediaCodec exploded'));
    const err = await engine.exportShareVideo(OPTIONS).catch((e) => e);
    expect(err.code).toBe('E_ENCODE');
    expect(err.message).toBe(engine.lineForExportError('E_ENCODE'));
    expect(err.detail).toMatch(/MediaCodec exploded/);
  });

  test('a result without a file is a failure, and missing sizes fall back to the request', async () => {
    const native = makeNative();
    mockState.native = native;
    const engine = loadEngine();
    native.exportShareVideo.mockResolvedValueOnce({});
    await expect(engine.exportShareVideo(OPTIONS)).rejects.toMatchObject({ code: 'E_ENCODE' });
    native.exportShareVideo.mockResolvedValueOnce({ uri: RESULT.uri });
    await expect(engine.exportShareVideo(OPTIONS)).resolves.toEqual({
      uri: RESULT.uri, width: 1080, height: 1920, durationMs: 15000, fileSizeBytes: 0,
    });
  });
});

describe('cancel, probe and wallpaper', () => {
  test('cancelExport calls native', async () => {
    const native = makeNative();
    mockState.native = native;
    const engine = loadEngine();
    await engine.cancelExport();
    expect(native.cancelExport).toHaveBeenCalledTimes(1);
  });

  test('probeVideo normalises what native reports and returns null when it cannot read', async () => {
    const native = makeNative();
    mockState.native = native;
    const engine = loadEngine();
    native.probeVideo.mockResolvedValueOnce({
      width: 1080, height: 1920, rotation: 90, durationMs: 31000, fps: 0, codec: 'hevc', hdr: true, hasAudio: true, fileSizeBytes: null,
    });
    await expect(engine.probeVideo('file:///cache/clip.mov')).resolves.toEqual({
      width: 1080, height: 1920, rotation: 90, durationMs: 31000, fps: null, codec: 'hevc', hdr: true, hasAudio: true, fileSizeBytes: null,
    });
    native.probeVideo.mockResolvedValueOnce({ width: 1920, height: 1080, rotation: 45, durationMs: 5000, fps: 29.97 });
    await expect(engine.probeVideo('file:///cache/clip.mp4')).resolves.toMatchObject({ rotation: 0, fps: 29.97, codec: null, hdr: false });
    native.probeVideo.mockResolvedValueOnce({ width: 0, height: 1080, durationMs: 1000 });
    await expect(engine.probeVideo('file:///cache/clip.mp4')).resolves.toBeNull();
    native.probeVideo.mockRejectedValueOnce(new Error('boom'));
    await expect(engine.probeVideo('file:///cache/clip.mp4')).resolves.toBeNull();
    await expect(engine.probeVideo('')).resolves.toBeNull();
  });

  test('setLockScreenWallpaper resolves true, and iOS rejects E_UNSUPPORTED', async () => {
    const native = makeNative();
    mockState.native = native;
    const engine = loadEngine();
    await expect(engine.setLockScreenWallpaper('file:///cache/card.png')).resolves.toBe(true);
    native.setLockScreenWallpaper.mockRejectedValueOnce(nativeError('E_UNSUPPORTED'));
    await expect(engine.setLockScreenWallpaper('file:///cache/card.png')).rejects.toMatchObject({ code: 'E_UNSUPPORTED' });
    native.setLockScreenWallpaper.mockRejectedValueOnce(nativeError('ERR_ODD'));
    await expect(engine.setLockScreenWallpaper('file:///cache/card.png')).rejects.toMatchObject({ code: 'E_WALLPAPER' });
  });
});

describe('what a log may say about a failure (Sentry VOLYUME-3N)', () => {
  test('the native message rides on the error, with paths reduced to folder kind and extension', async () => {
    const native = makeNative();
    mockState.native = native;
    const engine = loadEngine();
    const e = new Error('Cannot open file:///var/mobile/Containers/Data/Application/ABC/Documents/clips/x1y2.mov now');
    e.code = 'E_INVALID';
    native.exportShareVideo.mockRejectedValue(e);
    let caught = null;
    try { await engine.exportShareVideo(OPTIONS); } catch (err) { caught = err; }
    const ctx = engine.errorContext(caught);
    expect(ctx.code).toBe('E_INVALID');
    expect(ctx.detail).toBe('E_INVALID: Cannot open documents/*.mov now');
    expect(ctx.detail).not.toMatch(/var|mobile|Application|x1y2/);
  });

  test('a JS validation failure names the field', async () => {
    const native = makeNative();
    mockState.native = native;
    const engine = loadEngine();
    let caught = null;
    try { await engine.exportShareVideo({ ...OPTIONS, outWidth: 1081 }); } catch (err) { caught = err; }
    expect(engine.errorContext(caught)).toEqual({ code: 'E_INVALID', detail: 'invalid outWidth' });
  });

  test.each([
    ['/private/var/mobile/Containers/Data/Application/A/Library/Caches/volyume-overlay-540-1.png', 'caches/*.png'],
    ['file:///var/mobile/Containers/Data/Application/A/tmp/clip', 'tmp/*'],
    ['content://media/external/video/media/12', 'other/*'],
  ])('scrubDetail(%s)', (input, out) => {
    const engine = loadEngine();
    expect(engine.scrubDetail(`at ${input}.`)).toBe(`at ${out}.`);
  });

  test('nothing to say is null, and a non-error is safe', () => {
    const engine = loadEngine();
    expect(engine.errorContext(null)).toEqual({ code: null, detail: null });
    expect(engine.scrubDetail(null)).toBeNull();
  });
});
