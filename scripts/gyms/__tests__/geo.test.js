const { haversineMetres, gridCellKey, gridCellNeighbourKeys, boundingBox, isWithinGbNiBounds } = require('../lib/geo');

describe('haversineMetres', () => {
  it('is 0 for the same point', () => {
    expect(haversineMetres(51.5, -0.1, 51.5, -0.1)).toBe(0);
  });

  it('matches a known distance (roughly) for two London points ~1km apart', () => {
    // Trafalgar Square to Covent Garden, approx 1.1km.
    const d = haversineMetres(51.508, -0.1281, 51.5117, -0.1226);
    expect(d).toBeGreaterThan(400);
    expect(d).toBeLessThan(700);
  });
});

describe('gridCellKey / gridCellNeighbourKeys', () => {
  it('gives the same key to two points a few metres apart', () => {
    const a = gridCellKey(51.5, -0.1);
    const b = gridCellKey(51.50001, -0.10001);
    expect(a).toBe(b);
  });

  it('gives a different key to points ~1km apart', () => {
    const a = gridCellKey(51.5, -0.1);
    const b = gridCellKey(51.51, -0.1);
    expect(a).not.toBe(b);
  });

  it('neighbour keys include the point\'s own cell', () => {
    const own = gridCellKey(51.5, -0.1);
    const neighbours = gridCellNeighbourKeys(51.5, -0.1);
    expect(neighbours).toContain(own);
    expect(neighbours.length).toBe(9);
  });
});

describe('boundingBox', () => {
  it('produces a box that contains the centre point', () => {
    const box = boundingBox(51.5, -0.1, 1000);
    expect(box.minLat).toBeLessThan(51.5);
    expect(box.maxLat).toBeGreaterThan(51.5);
    expect(box.minLng).toBeLessThan(-0.1);
    expect(box.maxLng).toBeGreaterThan(-0.1);
  });
});

describe('isWithinGbNiBounds', () => {
  it('accepts a London point', () => {
    expect(isWithinGbNiBounds(51.5, -0.1)).toBe(true);
  });

  it('accepts a Belfast point', () => {
    expect(isWithinGbNiBounds(54.6, -5.93)).toBe(true);
  });

  it('rejects a point clearly outside the extract (mainland France)', () => {
    expect(isWithinGbNiBounds(48.85, 2.35)).toBe(false);
  });

  it('rejects non-finite input', () => {
    expect(isWithinGbNiBounds(NaN, -0.1)).toBe(false);
  });
});
