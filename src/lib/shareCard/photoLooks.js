/**
 * photoLooks.js: the photo looks for the share image, and how strong each is.
 *
 * Founder, 2026-09-27: "Can we add an option of a tint or filter to the images
 * added as well with options that fit in well to enhance bodybuilding gym
 * pictures and look well with our theme? ... So the photos can look better
 * without messing about", then "Almost like Instagram filters but a select
 * group of them that enhance the look ... Maybe even the option to up and
 * down the filter", then "label them gym like ones ... black and white and
 * such ones as well".
 *
 * Seven looks and None, researched and tuned on a real gym photo (the lead's
 * research lane, 2026-09-27): two black and white (Iron, Chalk), one that
 * brings out definition the way neutral competition lighting does (Stage),
 * warm and cool moods (Forge, Steel), a golden look that sits with the app's
 * amber (Gold) and a vivid one (Pump). Colour, tone and contrast only: a 4x5
 * colour matrix can only remap colour, never change a body's shape, and
 * nothing here smooths skin. No name judges a body.
 *
 * Strength runs from 0 to 1: 0.8 to start with, except the two black and white
 * looks, which start at 1 so they are fully black and white from the first
 * tap (founder, 2026-09-27: "Ok what about a B&w one?"; at 0.8 a mono look
 * still shows a fifth of the colour). Every look is one colour matrix, so
 * a look at strength t is exactly the identity matrix moved t of the way to the
 * full look, and its vignette is t of the full vignette. The translation column
 * (indices 4, 9, 14, 19) is in 0..1, verified in CanvasKit and in the React
 * Native Skia 2.2.12 binding (both pass the array straight to
 * SkColorFilters::Matrix). Pure data and maths, plus one Paint helper.
 */

export const DEFAULT_LOOK_STRENGTH = 0.8;

const IDENTITY = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

export const PHOTO_LOOKS = [
  { key: 'none', name: 'None', description: 'Your photo as it is' },
  {
    key: 'iron',
    name: 'Iron',
    description: 'Black and white with strong contrast',
    matrix: [0.2599, 0.8723, 0.0878, 0, -0.06, 0.2599, 0.8723, 0.0878, 0, -0.06, 0.2599, 0.8723, 0.0878, 0, -0.06, 0, 0, 0, 1, 0],
    vignette: 0.22,
    startStrength: 1,
  },
  {
    key: 'chalk',
    name: 'Chalk',
    description: 'Soft, warm black and white',
    matrix: [0.281, 0.7259, 0.0731, 0, -0.005, 0.2162, 0.7907, 0.0731, 0, -0.022, 0.2162, 0.7259, 0.1379, 0, -0.05, 0, 0, 0, 1, 0],
    vignette: 0.14,
    startStrength: 1,
  },
  {
    key: 'stage',
    name: 'Stage',
    description: 'Crisp contrast in neutral light, like on stage',
    matrix: [1.3102, -0.0275, -0.0028, 0, -0.065, -0.0082, 1.2909, -0.0028, 0, -0.055, -0.0082, -0.0275, 1.3156, 0, -0.04, 0, 0, 0, 1, 0],
    vignette: 0.26,
  },
  {
    key: 'forge',
    name: 'Forge',
    description: 'Warm and moody',
    matrix: [1.233, -0.0664, -0.0067, 0, -0.042, -0.0198, 1.1864, -0.0067, 0, -0.084, -0.0198, -0.0664, 1.2461, 0, -0.132, 0, 0, 0, 1, 0],
    vignette: 0.22,
  },
  {
    key: 'steel',
    name: 'Steel',
    description: 'Cool and moody',
    matrix: [0.8888, 0.2282, 0.023, 0, -0.102, 0.068, 1.049, 0.023, 0, -0.07, 0.068, 0.2282, 0.8438, 0, -0.025, 0, 0, 0, 1, 0],
    vignette: 0.2,
  },
  {
    key: 'gold',
    name: 'Gold',
    description: 'Warm golden tones',
    matrix: [1.2318, -0.1652, -0.0166, 0, 0.025, -0.0492, 1.1158, -0.0166, 0, 0.007, -0.0492, -0.1652, 1.2644, 0, -0.083, 0, 0, 0, 1, 0],
    vignette: 0.24,
  },
  {
    key: 'pump',
    name: 'Pump',
    description: 'Bold, vivid colour',
    matrix: [1.429, -0.2989, -0.0301, 0, -0.08, -0.089, 1.2191, -0.0301, 0, -0.05, -0.089, -0.2989, 1.4879, 0, -0.015, 0, 0, 0, 1, 0],
    vignette: 0.16,
  },
];

const BY_KEY = Object.fromEntries(PHOTO_LOOKS.map((l) => [l.key, l]));

export function lookByKey(key) {
  return BY_KEY[key] || BY_KEY.none;
}

/** The strength a look starts at when it is chosen. */
export function startStrengthFor(key) {
  const look = lookByKey(key);
  return look.startStrength != null ? look.startStrength : DEFAULT_LOOK_STRENGTH;
}

// 0 to 1; anything else (missing, not a number) is the default.
export function clampStrength(strength) {
  const n = Number(strength);
  if (strength == null || !Number.isFinite(n)) return DEFAULT_LOOK_STRENGTH;
  return Math.min(1, Math.max(0, n));
}

/**
 * The look's colour matrix at a strength, or null when nothing changes (None,
 * or strength 0).
 */
export function lookMatrix(key, strength) {
  const look = lookByKey(key);
  const t = clampStrength(strength);
  if (!look.matrix || t === 0) return null;
  return look.matrix.map((v, i) => IDENTITY[i] + (v - IDENTITY[i]) * t);
}

/** How dark the look's vignette is at a strength, 0 to 1. */
export function lookVignette(key, strength) {
  const look = lookByKey(key);
  return look.vignette ? look.vignette * clampStrength(strength) : 0;
}

/**
 * A Paint that draws an image in the look, or null when there is no look to
 * apply (draw with a plain Paint then).
 */
export function lookPaint(Skia, key, strength) {
  const m = lookMatrix(key, strength);
  if (!m || !Skia || !Skia.ColorFilter || typeof Skia.ColorFilter.MakeMatrix !== 'function') return null;
  const paint = Skia.Paint();
  if (paint.setAntiAlias) paint.setAntiAlias(true);
  paint.setColorFilter(Skia.ColorFilter.MakeMatrix(m));
  return paint;
}
