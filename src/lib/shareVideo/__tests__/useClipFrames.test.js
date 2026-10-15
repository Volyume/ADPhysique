/**
 * useClipFrames (D229): the clip wrapper's promises that Skia's own hook
 * does not make. Pins: a file reporting no frame rate plays at 30 fps;
 * the clip is silenced and positioned at the window's start on load;
 * every seek is clamped two frames short of the end; one frame is held at
 * a time; the whole thing disposes on unmount.
 */
import { act, create } from 'react-test-renderer';

const fakeFrames = [];
function makeFrame() {
  const f = { disposed: false, dispose() { this.disposed = true; }, makeNonTextureImage() { return makeFrame(); } };
  fakeFrames.push(f);
  return f;
}
const videos = [];
function mockMakeVideo({ durationMs = 20000, fps = 0 } = {}) {
  const v = {
    seeks: [], volume: null, playing: false, disposed: false,
    duration: () => durationMs, framerate: () => fps, size: () => ({ width: 1920, height: 1080 }), rotation: () => 90,
    seek(t) { this.seeks.push(t); }, nextImage: () => makeFrame(), setVolume(x) { this.volume = x; },
    play() { this.playing = true; }, pause() { this.playing = false; }, dispose() { this.disposed = true; },
  };
  videos.push(v);
  return v;
}
let mockNextVideoOpts = {};
jest.mock('@shopify/react-native-skia', () => ({ Skia: { Video: () => mockMakeVideo(mockNextVideoOpts) } }));
jest.mock('react-native', () => ({
  AppState: { addEventListener: () => ({ remove: () => {} }) },
  Platform: { OS: 'android' },
}));
// The worklet runtime's opens can be held back, to play a slow open that
// lands after the person has chosen another video.
const mockDeferredOpens = [];
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line global-require
  const manual = jest.requireActual('../../../../__mocks__/react-native-reanimated');
  return {
    ...manual,
    runOnRuntime: (_rt, fn) => (...args) => { mockDeferredOpens.push(() => fn(...args)); },
  };
});
function flushOpens() { while (mockDeferredOpens.length) mockDeferredOpens.shift()(); }

const useClipFrames = require('../useClipFrames').default;

let last = null;
function Probe(props) {
  last = useClipFrames(props.source, props.opts);
  return null;
}

describe('useClipFrames', () => {
  beforeEach(() => { videos.length = 0; fakeFrames.length = 0; last = null; mockDeferredOpens.length = 0; });

  test('a slow open of a video no longer chosen is disposed, never shown', () => {
    mockNextVideoOpts = { durationMs: 20000, fps: 25 };
    let tree;
    act(() => { tree = create(<Probe source="file:///a.mp4" opts={{}} />); });
    act(() => { tree.update(<Probe source="file:///b.mp4" opts={{}} />); });
    expect(mockDeferredOpens.length).toBe(2);
    act(() => { flushOpens(); });
    expect(videos.length).toBe(2);
    expect(videos[0].disposed).toBe(true);
    expect(videos[1].disposed).toBe(false);
    expect(last.ready).toBe(true);
    act(() => { tree.update(<Probe source={null} opts={{}} />); });
    expect(last.ready).toBe(false);
    act(() => tree.unmount());
  });

  test('a file with no frame rate plays at 30 fps; the upright size and rotation are reported', () => {
    mockNextVideoOpts = { durationMs: 20000, fps: 0 };
    let tree;
    act(() => { tree = create(<Probe source="file:///clip.mp4" opts={{ startMs: 2000, endMs: 17000 }} />); });
    act(() => { flushOpens(); });
    expect(last.ready).toBe(true);
    expect(last.meta).toEqual({ durationMs: 20000, framerate: 30, width: 1920, height: 1080, rotation: 90 });
    act(() => tree.unmount());
  });

  test('on load the clip is silent, seeks to the window start and holds one frame; unmount disposes', () => {
    mockNextVideoOpts = { durationMs: 20000, fps: 25 };
    let tree;
    act(() => { tree = create(<Probe source="file:///clip.mp4" opts={{ startMs: 2000, endMs: 17000 }} />); });
    act(() => { flushOpens(); });
    const v = videos[0];
    expect(v.volume).toBe(0);
    expect(v.seeks[0]).toBe(2000);
    expect(last.currentFrame.value).toBeTruthy();
    // Android: the decoded texture is copied and the texture disposed.
    expect(fakeFrames.filter((f) => f.disposed).length).toBeGreaterThanOrEqual(1);
    act(() => tree.unmount());
    expect(v.disposed).toBe(true);
  });

  test('scrub clamps every seek two frames short of the end of the stream', () => {
    mockNextVideoOpts = { durationMs: 10000, fps: 50 }; // 20 ms frames: the cap is 9960
    let tree;
    act(() => { tree = create(<Probe source="file:///clip.mp4" opts={{ startMs: 0, endMs: null }} />); });
    act(() => { flushOpens(); });
    const v = videos[0];
    act(() => { last.scrub(99999); });
    expect(v.seeks[v.seeks.length - 1]).toBe(9960);
    act(() => { last.scrub(-50); });
    expect(v.seeks[v.seeks.length - 1]).toBe(0);
    act(() => { last.scrub(4321); });
    expect(v.seeks[v.seeks.length - 1]).toBe(4321);
    act(() => tree.unmount());
  });

  test('no source: not ready, no video opened', () => {
    let tree;
    act(() => { tree = create(<Probe source={null} opts={{}} />); });
    expect(last.ready).toBe(false);
    expect(last.meta).toBe(null);
    expect(videos).toHaveLength(0);
    act(() => tree.unmount());
  });
});
