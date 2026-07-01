/**
 * femaleNutritionAwareness.js — U6 iron / micronutrient awareness for female
 * athletes (founder 2026-07-01, from the male/female athlete tailoring audit).
 *
 * SCOPE (deliberately narrow, and safe):
 *  - This is AWARENESS content only. It does NOT track, total, or score any
 *    micronutrient, and it changes no food data, schema, or target. Per-food
 *    micronutrient tracking vs NRV is the separate, gated Ultimate-Audit item
 *    #16 (MN-1), which requires a food-schema migration and a founder decision
 *    and is NOT started here.
 *  - Female-specific: returns null for any non-female user, so it never surfaces
 *    for men.
 *  - Encouraging, not restrictive: it prioritises foods to include, never foods
 *    to avoid, and signposts symptoms to a GP rather than giving medical or
 *    dosing advice.
 *
 * British English throughout; no em-dash (lint rule).
 */

/**
 * @param {string|null} sex  'male' | 'female' | null
 * @returns {{ title: string, intro: string, nutrients: Array<{
 *   key: string, name: string, why: string, foods: string }>, footnote: string
 * } | null}
 */
export function femaleNutritionAwareness(sex) {
  if (sex !== 'female') return null;
  return {
    title: 'Worth prioritising for you',
    intro: 'Training hard as a woman raises the demand for a few key nutrients. '
      + 'You do not need to count them. Just leaning on these foods regularly '
      + 'covers most of it.',
    nutrients: [
      {
        key: 'iron',
        name: 'Iron',
        why: 'Monthly losses mean women need more iron than men. Low iron shows '
          + 'up as tiredness, breathlessness, and slow recovery.',
        foods: 'Red meat, liver, eggs, lentils, beans, tofu, spinach, and '
          + 'fortified cereals. Pairing plant sources with vitamin C (peppers, '
          + 'citrus, tomatoes) helps you absorb more.',
      },
      {
        key: 'calcium_vitd',
        name: 'Calcium and vitamin D',
        why: 'Both protect bone strength, which matters most when you are '
          + 'training hard or in a longer cut.',
        foods: 'Dairy or fortified plant milks, yoghurt, tinned fish with bones, '
          + 'and leafy greens. A vitamin D supplement is sensible in the UK '
          + 'winter.',
      },
      {
        key: 'b12',
        name: 'Vitamin B12',
        why: 'Supports energy and red blood cells. It can run low on a mostly '
          + 'plant-based diet.',
        foods: 'Meat, fish, eggs, and dairy, or fortified foods and a supplement '
          + 'if you eat little or no animal produce.',
      },
    ],
    footnote: 'If you often feel drained, breathless, or your periods are heavy, '
      + 'it is worth asking your GP for a simple iron (ferritin) test. This is '
      + 'general guidance, not medical advice.',
  };
}
