/**
 * The share image's photo looks (founder, 2026-09-27: "Almost like Instagram
 * filters but a select group of them that enhance the look ... Maybe even the
 * option to up and down the filter", "label them gym like ones ... black and
 * white and such ones as well"). Pinned: a small set with None first, names
 * that never judge a body, colour and tone only (alpha untouched), and a
 * strength that moves each look smoothly from the untouched photo to the full
 * look.
 */
import {
  PHOTO_LOOKS, DEFAULT_LOOK_STRENGTH, lookByKey, lookMatrix, lookVignette, lookPaint, clampStrength,
  startStrengthFor,
} from '../photoLooks';

const IDENTITY = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

describe('the set of looks', () => {
  test('None first, then a small group, black and white included', () => {
    expect(PHOTO_LOOKS[0].key).toBe('none');
    expect(PHOTO_LOOKS.length).toBeGreaterThanOrEqual(7);
    expect(PHOTO_LOOKS.length).toBeLessThanOrEqual(9);
    expect(PHOTO_LOOKS.map((l) => l.name)).toEqual(['None', 'Iron', 'Chalk', 'Stage', 'Forge', 'Steel', 'Gold', 'Pump']);
    expect(PHOTO_LOOKS.filter((l) => /black and white/i.test(l.description))).toHaveLength(2);
  });

  test('no name or description judges a body', () => {
    const words = PHOTO_LOOKS.map((l) => `${l.name} ${l.description}`).join(' ');
    expect(words).not.toMatch(/\b(shred|ripped|lean|cut|slim|jacked|tan|muscle|enhance|skinny|fat|thin|body)/i);
  });

  test('colour and tone only: every look leaves transparency alone', () => {
    PHOTO_LOOKS.filter((l) => l.matrix).forEach((l) => {
      expect(l.matrix).toHaveLength(20);
      expect(l.matrix.slice(15)).toEqual([0, 0, 0, 1, 0]);
      l.matrix.forEach((v) => { expect(Number.isFinite(v)).toBe(true); });
    });
  });
});

describe('strength', () => {
  test('None, or strength 0, changes nothing', () => {
    expect(lookMatrix('none', 1)).toBeNull();
    PHOTO_LOOKS.forEach((l) => {
      expect(lookMatrix(l.key, 0)).toBeNull();
      expect(lookVignette(l.key, 0)).toBe(0);
    });
  });

  test('full strength is the look itself; half is exactly halfway from the untouched photo', () => {
    const iron = lookByKey('iron');
    lookMatrix('iron', 1).forEach((v, i) => { expect(v).toBeCloseTo(iron.matrix[i], 10); });
    lookMatrix('iron', 0.5).forEach((v, i) => {
      expect(v).toBeCloseTo((IDENTITY[i] + iron.matrix[i]) / 2, 10);
    });
    expect(lookVignette('iron', 0.5)).toBeCloseTo(iron.vignette / 2, 10);
  });

  test('the default is 80%, and out-of-range values are held to 0 to 1', () => {
    expect(DEFAULT_LOOK_STRENGTH).toBe(0.8);
    expect(clampStrength(undefined)).toBe(0.8);
    expect(clampStrength('x')).toBe(0.8);
    expect(clampStrength(-1)).toBe(0);
    expect(clampStrength(3)).toBe(1);
  });

  // Founder, 2026-09-27: "Ok what about a B&w one?" A black and white look
  // is fully black and white the moment it is chosen; the rest start at 80%.
  test('the black and white looks start at full strength, the rest at 80%', () => {
    expect(startStrengthFor('iron')).toBe(1);
    expect(startStrengthFor('chalk')).toBe(1);
    PHOTO_LOOKS.filter((l) => !/black and white/i.test(l.description)).forEach((l) => {
      expect(startStrengthFor(l.key)).toBe(0.8);
    });
    // At its start strength a black and white look is the whole look, with
    // none of the photo's colour left in it.
    ['iron', 'chalk'].forEach((key) => {
      lookMatrix(key, startStrengthFor(key)).forEach((v, i) => {
        expect(v).toBeCloseTo(lookByKey(key).matrix[i], 10);
      });
    });
  });

  test('an unknown look is None', () => {
    expect(lookByKey('sepia-old').key).toBe('none');
    expect(lookMatrix('sepia-old', 1)).toBeNull();
  });
});

describe('the paint', () => {
  const makeSkia = () => {
    const made = [];
    return {
      made,
      Paint: () => {
        const p = { setAntiAlias() {}, setColorFilter(cf) { p.cf = cf; } };
        return p;
      },
      ColorFilter: { MakeMatrix: (m) => { made.push(m); return { m }; } },
    };
  };

  test('a look draws through its colour matrix at the chosen strength', () => {
    const Skia = makeSkia();
    const paint = lookPaint(Skia, 'gold', 0.8);
    expect(paint.cf.m).toEqual(lookMatrix('gold', 0.8));
  });

  test('no look, no paint, and a Skia without colour filters is left alone', () => {
    expect(lookPaint(makeSkia(), 'none', 1)).toBeNull();
    expect(lookPaint({ Paint: () => ({}) }, 'iron', 1)).toBeNull();
  });
});
