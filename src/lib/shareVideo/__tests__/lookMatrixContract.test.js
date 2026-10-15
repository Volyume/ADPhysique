/**
 * The look on a video matches the look on a photo (D229 addendum 5, ruling
 * 11; research report sections 1.3, 3.4 and 4).
 *
 * The share screen sends native the final 20 numbers, lookMatrix(key,
 * strength), and nothing else about the look. Each platform maps them once:
 *   Android  skiaToRgbMatrix -> Media3's column-major 4x4 RgbMatrix, applied
 *            as M * vec4(rgb, 1), so the fourth column is the bias and the
 *            alpha-to-colour terms (m3, m8, m13) are folded into it (A = 1);
 *   iOS      CIColorMatrix vectors R = (m0..m3), G = (m5..m8),
 *            B = (m10..m13), A = (m15..m18), bias = (m4, m9, m14, m19).
 * Both are exact only while every look keeps the alpha row at [0,0,0,1,0]
 * and the alpha-to-colour terms at 0. This suite pins that for every look at
 * every strength the screen offers, pins a JS copy of the Android mapping
 * against a hand-computed example and against Skia's own arithmetic, and
 * source-guards that the Kotlin and Swift copies are the same mapping.
 * Strength 0 (and None) gives no matrix: native then skips the look.
 */
import fs from 'fs';
import path from 'path';
import { PHOTO_LOOKS, lookMatrix } from '../../shareCard/photoLooks';

const ROOT = path.join(__dirname, '..', '..', '..', '..');
const MODULE = path.join(ROOT, 'modules', 'volyume-video-export');
const KOTLIN = fs.readFileSync(path.join(
  MODULE, 'android', 'src', 'main', 'java', 'expo', 'modules', 'volyumevideoexport', 'ShareVideoExporter.kt',
), 'utf8');
const SWIFT = fs.readFileSync(path.join(MODULE, 'ios', 'ExportJob.swift'), 'utf8');

/** Code lines only, so a comment cannot satisfy a guard. */
const code = (src) => src.split('\n').filter((l) => {
  const t = l.trim();
  return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('///');
}).join('\n');

/** JS copy of the Kotlin skiaToRgbMatrix (research report section 1.3). */
function skiaToRgbMatrix(m) {
  return [
    m[0], m[5], m[10], 0,
    m[1], m[6], m[11], 0,
    m[2], m[7], m[12], 0,
    m[4] + m[3], m[9] + m[8], m[14] + m[13], 1,
  ];
}

/** Skia's 4x5 on (r, g, b, a), row-major, bias in 0..1. */
function applySkia(m, [r, g, b, a]) {
  return [0, 1, 2, 3].map((row) => {
    const o = row * 5;
    return m[o] * r + m[o + 1] * g + m[o + 2] * b + m[o + 3] * a + m[o + 4];
  });
}

/** Media3: column-major 4x4 times vec4(rgb, 1). */
function applyColumnMajor(c, [r, g, b]) {
  const v = [r, g, b, 1];
  return [0, 1, 2].map((row) => [0, 1, 2, 3].reduce((sum, col) => sum + c[col * 4 + row] * v[col], 0));
}

/** CIColorMatrix: s.x = dot(s, R) and so on, then s + bias. */
function applyCi(m, [r, g, b, a]) {
  const s = [r, g, b, a];
  const vectors = [m.slice(0, 4), m.slice(5, 9), m.slice(10, 14), m.slice(15, 19)];
  const bias = [m[4], m[9], m[14], m[19]];
  return vectors.map((v, i) => v.reduce((sum, k, j) => sum + k * s[j], 0) + bias[i]);
}

const STRENGTHS = [0, 0.5, 0.8, 1];
const COLOURS = [[0, 0, 0], [1, 1, 1], [0.5, 0.25, 0.75], [0.2, 0.9, 0.4], [13 / 255, 13 / 255, 13 / 255]];

describe('every look at every strength keeps the matrix a pure RGB affine map', () => {
  const cases = [];
  for (const look of PHOTO_LOOKS) for (const s of STRENGTHS) cases.push([look.key, s]);

  test.each(cases)('%s at %s', (key, strength) => {
    const m = lookMatrix(key, strength);
    if (key === 'none' || strength === 0) {
      expect(m).toBeNull();
      return;
    }
    expect(m).toHaveLength(20);
    expect(m.every(Number.isFinite)).toBe(true);
    expect(m.slice(15)).toEqual([0, 0, 0, 1, 0]);
    expect(m[3]).toBe(0);
    expect(m[8]).toBe(0);
    expect(m[13]).toBe(0);
  });

  test('every look except None has a matrix to send', () => {
    expect(PHOTO_LOOKS.filter((l) => l.key !== 'none').every((l) => lookMatrix(l.key, 1) !== null)).toBe(true);
  });
});

describe('the Android mapping', () => {
  test('matches a hand-computed example, bias column included', () => {
    const m = [
      0.1, 0.2, 0.3, 0.04, 0.05,
      0.6, 0.7, 0.8, 0.09, 0.1,
      1.1, 1.2, 1.3, 0.14, 0.15,
      0, 0, 0, 1, 0,
    ];
    const expected = [
      0.1, 0.6, 1.1, 0,
      0.2, 0.7, 1.2, 0,
      0.3, 0.8, 1.3, 0,
      0.09, 0.19, 0.29, 1,
    ];
    const got = skiaToRgbMatrix(m);
    expect(got).toHaveLength(16);
    got.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 12));
  });

  test('gives the same colour as Skia for every look, as does the iOS vector form', () => {
    for (const look of PHOTO_LOOKS) {
      for (const s of [0.5, 0.8, 1]) {
        const m = lookMatrix(look.key, s);
        if (!m) continue;
        const c = skiaToRgbMatrix(m);
        for (const rgb of COLOURS) {
          const skia = applySkia(m, [...rgb, 1]);
          const media3 = applyColumnMajor(c, rgb);
          const ci = applyCi(m, [...rgb, 1]);
          for (let i = 0; i < 3; i += 1) {
            expect(media3[i]).toBeCloseTo(skia[i], 12);
            expect(ci[i]).toBeCloseTo(skia[i], 12);
          }
          expect(ci[3]).toBeCloseTo(1, 12);
        }
      }
    }
  });
});

describe('source guards: the native copies are the same mapping', () => {
  test('Kotlin skiaToRgbMatrix is the column-major form with the folded bias', () => {
    const src = code(KOTLIN);
    expect(src).toMatch(/m\[0\],\s*m\[5\],\s*m\[10\],\s*0f,/);
    expect(src).toMatch(/m\[1\],\s*m\[6\],\s*m\[11\],\s*0f,/);
    expect(src).toMatch(/m\[2\],\s*m\[7\],\s*m\[12\],\s*0f,/);
    expect(src).toMatch(/m\[4\] \+ m\[3\],\s*m\[9\] \+ m\[8\],\s*m\[14\] \+ m\[13\],\s*1f,/);
    expect(src).toMatch(/RgbMatrix \{ _, _ -> rgb \}/);
  });

  test('Swift CIColorMatrix vectors follow section 3.4', () => {
    const src = code(SWIFT);
    expect(src).toMatch(/"inputRVector": CIVector\(x: m\[0\], y: m\[1\], z: m\[2\], w: m\[3\]\)/);
    expect(src).toMatch(/"inputGVector": CIVector\(x: m\[5\], y: m\[6\], z: m\[7\], w: m\[8\]\)/);
    expect(src).toMatch(/"inputBVector": CIVector\(x: m\[10\], y: m\[11\], z: m\[12\], w: m\[13\]\)/);
    expect(src).toMatch(/"inputAVector": CIVector\(x: m\[15\], y: m\[16\], z: m\[17\], w: m\[18\]\)/);
    expect(src).toMatch(/"inputBiasVector": CIVector\(x: m\[4\], y: m\[9\], z: m\[14\], w: m\[19\]\)/);
  });

  test('iOS applies the look with colour management off, as Skia does on the photo', () => {
    const src = code(SWIFT);
    expect(src).toMatch(/CIContext\(options: \[\.workingColorSpace: NSNull\(\), \.outputColorSpace: NSNull\(\)\]\)/);
    expect(src).toMatch(/CIImage\(contentsOf: spec\.overlayURL, options: \[\.colorSpace: NSNull\(\)\]\)/);
  });

  test('strength never reaches native: the 20 numbers already carry it', () => {
    expect(code(KOTLIN)).not.toMatch(/strength/i);
    expect(code(SWIFT)).not.toMatch(/strength/i);
  });
});
