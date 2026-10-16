/**
 * engine.extractFrames and engine.deleteFrames (lead ruling 2026-10-16, after
 * Sentry VOLYUME-3M: frames come from the app's native module, never from
 * Skia's video object).
 *
 * Pins the wrapper's contract:
 *   - a build without the native function resolves one null per time (the
 *     screen shows its empty state) and isAvailable() is unchanged by it;
 *   - options are checked before they cross (a NaN that reaches Kotlin
 *     saturates, one that reaches Swift traps): uri, at most 64 finite times,
 *     maxEdge 16 to 4096; negative times cross as 0; maxEdge crosses rounded;
 *   - a slot-level null stays null in its slot, and a malformed slot reads
 *     as null, so one bad frame never loses the others;
 *   - native's width and height cross as given (native turns frames upright;
 *     JS never rotates or swaps them);
 *   - a native rejection carries a known code and the calm line; an unknown
 *     code reads as E_DECODE;
 *   - deleteFrames never rejects.
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

function makeNative(overrides = {}) {
  return {
    exportShareVideo: jest.fn(),
    extractFrames: jest.fn(async (uri, times) => times.map((t, i) => ({
      uri: `file:///cache/share-frames/${i}.jpg`, width: 810, height: 1440, timeMs: t,
    }))),
    deleteFrames: jest.fn(async () => undefined),
    ...overrides,
  };
}

afterEach(() => { mockState.native = null; });

describe('without the native function', () => {
  test('no module: one null per time, no throw', async () => {
    const engine = loadEngine();
    expect(engine.isAvailable()).toBe(false);
    await expect(engine.extractFrames('file:///v.mp4', [0, 1000, 2000])).resolves.toEqual([null, null, null]);
    await expect(engine.extractFrames('file:///v.mp4', 'nonsense')).resolves.toEqual([]);
    await expect(engine.deleteFrames()).resolves.toBeUndefined();
  });

  test('an older build with the module but not the function: nulls, and video stays available', async () => {
    mockState.native = { exportShareVideo: jest.fn() };
    const engine = loadEngine();
    expect(engine.isAvailable()).toBe(true);
    await expect(engine.extractFrames('file:///v.mp4', [0, 500])).resolves.toEqual([null, null]);
    await expect(engine.deleteFrames()).resolves.toBeUndefined();
  });
});

describe('what crosses', () => {
  test('uri, the times (negatives as 0) and maxEdge rounded; the default edge is 1440', async () => {
    mockState.native = makeNative();
    const engine = loadEngine();
    await engine.extractFrames('file:///v.mp4', [0, -20, 1500.5], { maxEdge: 111.6 });
    expect(mockState.native.extractFrames).toHaveBeenCalledWith('file:///v.mp4', [0, 0, 1500.5], 112);
    await engine.extractFrames('file:///v.mp4', [0]);
    expect(mockState.native.extractFrames).toHaveBeenLastCalledWith('file:///v.mp4', [0], 1440);
  });

  test('native\'s upright size crosses as given: JS never swaps it', async () => {
    mockState.native = makeNative();
    const engine = loadEngine();
    const [f] = await engine.extractFrames('file:///v.mp4', [3000]);
    expect(f).toEqual({ uri: 'file:///cache/share-frames/0.jpg', width: 810, height: 1440, timeMs: 3000 });
  });

  test.each([
    ['an empty uri', '', [0], {}, 'E_SOURCE'],
    ['a NaN time', 'file:///v.mp4', [0, NaN], {}, 'E_INVALID'],
    ['an infinite time', 'file:///v.mp4', [Infinity], {}, 'E_INVALID'],
    ['a string time', 'file:///v.mp4', ['5'], {}, 'E_INVALID'],
    ['65 times', 'file:///v.mp4', new Array(65).fill(0), {}, 'E_INVALID'],
    ['an edge under 16', 'file:///v.mp4', [0], { maxEdge: 8 }, 'E_INVALID'],
    ['an edge over 4096', 'file:///v.mp4', [0], { maxEdge: 5000 }, 'E_INVALID'],
    ['a NaN edge', 'file:///v.mp4', [0], { maxEdge: NaN }, 'E_INVALID'],
  ])('%s is refused before native', async (_name, uri, times, opts, code) => {
    mockState.native = makeNative();
    const engine = loadEngine();
    await expect(engine.extractFrames(uri, times, opts)).rejects.toMatchObject({ code });
    expect(mockState.native.extractFrames).not.toHaveBeenCalled();
  });

  test('no times is an empty answer without a native call', async () => {
    mockState.native = makeNative();
    const engine = loadEngine();
    await expect(engine.extractFrames('file:///v.mp4', [])).resolves.toEqual([]);
    expect(mockState.native.extractFrames).not.toHaveBeenCalled();
  });
});

describe('what comes back', () => {
  test('a null slot stays null in its place, and a malformed slot reads as null', async () => {
    mockState.native = makeNative({
      extractFrames: jest.fn(async () => [
        { uri: 'file:///a.jpg', width: 63, height: 112, timeMs: 0 },
        null,
        { uri: '', width: 63, height: 112, timeMs: 2000 },
        { uri: 'file:///d.jpg', width: 0, height: 112, timeMs: 3000 },
        { uri: 'file:///e.jpg', width: 63.4, height: 111.6, timeMs: NaN },
      ]),
    });
    const engine = loadEngine();
    const out = await engine.extractFrames('file:///v.mp4', [0, 1000, 2000, 3000, 4000]);
    expect(out).toEqual([
      { uri: 'file:///a.jpg', width: 63, height: 112, timeMs: 0 },
      null,
      null,
      null,
      { uri: 'file:///e.jpg', width: 63, height: 112, timeMs: 0 },
    ]);
  });

  test('a short or missing native answer pads with nulls', async () => {
    mockState.native = makeNative({ extractFrames: jest.fn(async () => [{ uri: 'file:///a.jpg', width: 2, height: 2, timeMs: 0 }]) });
    let engine = loadEngine();
    expect(await engine.extractFrames('file:///v.mp4', [0, 1])).toEqual([{ uri: 'file:///a.jpg', width: 2, height: 2, timeMs: 0 }, null]);
    mockState.native = makeNative({ extractFrames: jest.fn(async () => null) });
    engine = loadEngine();
    expect(await engine.extractFrames('file:///v.mp4', [0, 1])).toEqual([null, null]);
  });

  test('a native rejection keeps a known code with the calm line; an unknown code reads as E_DECODE', async () => {
    mockState.native = makeNative({
      extractFrames: jest.fn()
        .mockRejectedValueOnce(Object.assign(new Error('The file has no video track.'), { code: 'E_SOURCE' }))
        .mockRejectedValueOnce(Object.assign(new Error('weird'), { code: 'ERR_SOMETHING' })),
    });
    const engine = loadEngine();
    const first = await engine.extractFrames('file:///v.mp4', [0]).catch((e) => e);
    expect(first.code).toBe('E_SOURCE');
    expect(first.message).toBe(engine.lineForExportError('E_SOURCE'));
    expect(first.detail).toMatch(/no video track/);
    const second = await engine.extractFrames('file:///v.mp4', [0]).catch((e) => e);
    expect(second.code).toBe('E_DECODE');
  });
});

describe('deleteFrames', () => {
  test('calls native and never rejects', async () => {
    mockState.native = makeNative();
    let engine = loadEngine();
    await engine.deleteFrames();
    expect(mockState.native.deleteFrames).toHaveBeenCalledTimes(1);
    mockState.native = makeNative({ deleteFrames: jest.fn(async () => { throw new Error('busy'); }) });
    engine = loadEngine();
    await expect(engine.deleteFrames()).resolves.toBeUndefined();
  });
});
