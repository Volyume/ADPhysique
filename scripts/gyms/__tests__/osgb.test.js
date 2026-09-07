// Pins the OSGB36 and Irish Grid -> WGS84 conversions against known
// control points. The OSGB36 point (E530000, N180000) is a standard
// central-London test point (Trafalgar Square area, ~51.51N -0.13W) used
// widely to sanity-check this exact transform; the Irish Grid point is
// this pipeline's own control point, derived from a real Active Places NI
// row (Bangor, Co. Down) and cross-checked against Bangor's known
// real-world coordinates (~54.66N, -5.67W).
const { osgb36ToWgs84, irishGridToWgs84 } = require('../lib/osgb');

describe('osgb36ToWgs84', () => {
  it('converts the standard central-London control point', () => {
    const { lat, lng } = osgb36ToWgs84(530000, 180000);
    expect(lat).toBeCloseTo(51.51, 1);
    expect(lng).toBeCloseTo(-0.13, 1);
  });

  it('converts a known Wrexham (Wales) control point', () => {
    // DataMapWales "Simply Gym Wrexham" feature coordinate.
    const { lat, lng } = osgb36ToWgs84(333761, 350419);
    expect(lat).toBeCloseTo(53.05, 1);
    expect(lng).toBeCloseTo(-2.99, 1);
  });

  it('returns null for non-finite input', () => {
    expect(osgb36ToWgs84(NaN, 180000)).toBeNull();
    expect(osgb36ToWgs84(530000, undefined)).toBeNull();
  });
});

describe('irishGridToWgs84', () => {
  it('converts a Bangor, Co. Down control point close to its known real-world location', () => {
    const { lat, lng } = irishGridToWgs84(350150, 381244);
    expect(lat).toBeCloseTo(54.66, 1);
    expect(lng).toBeCloseTo(-5.67, 1);
  });

  it('produces a materially different result from the OSGB36 transform for the same figures', () => {
    // The two grids/datums must not be interchangeable — this is the whole
    // reason NI needs its own conversion rather than reusing osgb36ToWgs84.
    const gb = osgb36ToWgs84(350150, 381244);
    const ni = irishGridToWgs84(350150, 381244);
    const deltaLat = Math.abs(gb.lat - ni.lat);
    expect(deltaLat).toBeGreaterThan(0.01);
  });
});
