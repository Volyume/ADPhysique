/**
 * bodyFatEstimate.js
 * Sex-aware visual body-fat bands for the optional onboarding estimate path.
 *
 * Pure, deterministic. Lets a user who has no measured figure pick a rough
 * description rather than skipping the field entirely, which sharpens the
 * initial calorie targets. A picked band is always flagged source = 'visual'
 * so the nutrition engine and check-in treat it as the rough estimate it is.
 *
 * The representative percentages are conservative midpoints of common visual
 * ranges. British English; no jargon in the labels.
 */

const MALE_BANDS = [
  { key: 'lean',     label: 'Lean',     pct: 10, hint: 'Abs visible, vascular' },
  { key: 'athletic', label: 'Athletic', pct: 15, hint: 'Some definition, flat stomach' },
  { key: 'average',  label: 'Average',  pct: 20, hint: 'Little definition, soft midsection' },
  { key: 'higher',   label: 'Higher',   pct: 28, hint: 'Noticeable belly, no definition' },
];

const FEMALE_BANDS = [
  { key: 'lean',     label: 'Lean',     pct: 18, hint: 'Athletic, some definition' },
  { key: 'athletic', label: 'Athletic', pct: 23, hint: 'Toned, curves with shape' },
  { key: 'average',  label: 'Average',  pct: 30, hint: 'Soft, little definition' },
  { key: 'higher',   label: 'Higher',   pct: 37, hint: 'Fuller figure throughout' },
];

/**
 * @param {string} sex 'male' | 'female' (anything else falls back to male bands)
 * @returns {Array<{key,label,pct,hint}>}
 */
export function getBodyFatBands(sex) {
  return sex === 'female' ? FEMALE_BANDS : MALE_BANDS;
}
