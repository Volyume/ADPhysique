/**
 * Nutrition-label OCR parser tests.
 * The parser is deterministic; tests pass raw OCR-style strings and
 * assert the extracted fields + confidence map.
 */
import { parseNutritionLabel } from '../food/ocrParser';

describe('parseNutritionLabel', () => {
  test('returns null fields for empty input', () => {
    const r = parseNutritionLabel('');
    expect(r.fields.kcal100g).toBeNull();
    expect(r.fields.protein100g).toBeNull();
  });

  test('extracts macros from a typical UK label (per 100g anchor)', () => {
    const text = `
      Nutrition  per 100g  per serving (30g)
      Energy  1465 kJ  / 350 kcal   105 kcal
      Fat   1.5g   0.5g
      of which saturates 0.3g
      Carbohydrate 72g  21.6g
      of which sugars 4g
      Fibre  7g  2.1g
      Protein  10g  3g
      Salt  0.05g
    `;
    const r = parseNutritionLabel(text);
    expect(r.fields.kcal100g).toBe(350);
    expect(r.fields.protein100g).toBe(10);
    expect(r.fields.carbs100g).toBe(72);
    expect(r.fields.fat100g).toBe(1.5);
    expect(r.fields.fibre100g).toBe(7);
    expect(r.hasAnchor).toBe(true);
    expect(r.confidence.kcal100g).toBe('high');
  });

  test('falls back to kJ when kcal not present', () => {
    const text = 'Energy per 100g 836 kJ. Protein 5g. Carbohydrate 20g. Fat 1g.';
    const r = parseNutritionLabel(text);
    // 836 / 4.184 = 199.8... rounded to 200
    expect(r.fields.kcal100g).toBe(200);
  });

  test('flags low confidence when per-100g anchor is missing', () => {
    const text = 'Energy 350 kcal. Protein 10g. Carbohydrate 72g. Fat 1.5g.';
    const r = parseNutritionLabel(text);
    expect(r.fields.kcal100g).toBe(350);
    expect(r.hasAnchor).toBe(false);
    expect(r.confidence.kcal100g).toBe('low');
    expect(r.confidence.protein100g).toBe('low');
  });

  test('handles comma-as-decimal locale variants', () => {
    const text = 'per 100g Protein 10,5g Carbohydrate 72,3g Fat 1,5g Energy 350 kcal';
    const r = parseNutritionLabel(text);
    expect(r.fields.protein100g).toBe(10.5);
    expect(r.fields.carbs100g).toBe(72.3);
    expect(r.fields.fat100g).toBe(1.5);
  });

  test('extracts serving size when present', () => {
    const text = 'per 100g Energy 350 kcal Protein 10g Fat 1g Carbohydrate 70g. Serving size 30g.';
    const r = parseNutritionLabel(text);
    expect(r.fields.servingG).toBe(30);
    expect(r.confidence.servingG).toBe('high');
  });
});
