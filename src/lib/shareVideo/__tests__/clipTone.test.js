/**
 * clipTone (D229 addendum 4): the scrim under a clip is set from the
 * brightest sampled frame per band and never below the bright tier.
 */
jest.mock('@shopify/react-native-skia', () => ({ Skia: {} }));
const mockSample = jest.fn();
jest.mock('../../shareCard/drawShareCard', () => ({ sampleAverageTone: (...args) => mockSample(...args) }));

const { brightestTone, videoTier, sampleClipTone, VIDEO_SCRIM_TIER_LUMINANCE } = require('../clipTone');

describe('brightestTone', () => {
  test('takes the brightest overall reading and the brightest top band across frames', () => {
    const out = brightestTone([
      { r: 10, g: 10, b: 10, luminance: 20, topLuminance: 200 },
      { r: 200, g: 190, b: 180, luminance: 180, topLuminance: 40 },
      null,
      { r: 50, g: 50, b: 50, luminance: 90 },
    ]);
    expect(out).toEqual({ r: 200, g: 190, b: 180, luminance: 180, topLuminance: 200 });
  });
  test('nothing readable gives null', () => {
    expect(brightestTone([])).toBe(null);
    expect(brightestTone([null, { luminance: NaN }])).toBe(null);
  });
});

describe('videoTier', () => {
  test('a dark clip is lifted to the bright tier; a bright one keeps its own reading', () => {
    expect(videoTier({ r: 5, g: 5, b: 5, luminance: 8, topLuminance: 8 })).toEqual({ r: 5, g: 5, b: 5, luminance: VIDEO_SCRIM_TIER_LUMINANCE, topLuminance: VIDEO_SCRIM_TIER_LUMINANCE });
    expect(videoTier({ r: 220, g: 220, b: 220, luminance: 230, topLuminance: 240 })).toEqual({ r: 220, g: 220, b: 220, luminance: 230, topLuminance: 240 });
    expect(videoTier(null).luminance).toBe(VIDEO_SCRIM_TIER_LUMINANCE);
    expect(VIDEO_SCRIM_TIER_LUMINANCE).toBeGreaterThan(130);
  });
});

describe('sampleClipTone', () => {
  beforeEach(() => mockSample.mockReset());
  test('samples every frame the photo way with the same framing, keeps the brightest, lifts to the tier', () => {
    mockSample
      .mockReturnValueOnce({ r: 1, g: 1, b: 1, luminance: 10, topLuminance: 10 })
      .mockReturnValueOnce({ r: 240, g: 230, b: 220, luminance: 200, topLuminance: 90 })
      .mockImplementationOnce(() => { throw new Error('bad frame'); })
      .mockReturnValueOnce(null);
    const crop = { zoom: 1.2, cx: 0.4, cy: 0.6 };
    const out = sampleClipTone({}, [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }], 1080, 1920, crop);
    expect(mockSample).toHaveBeenCalledTimes(4);
    expect(mockSample.mock.calls[0][4]).toBe(crop);
    expect(out).toEqual({ r: 240, g: 230, b: 220, luminance: 200, topLuminance: VIDEO_SCRIM_TIER_LUMINANCE });
  });
  test('no frames: the bright tier default', () => {
    expect(sampleClipTone({}, [], 1080, 1920, null).luminance).toBe(VIDEO_SCRIM_TIER_LUMINANCE);
  });
});
