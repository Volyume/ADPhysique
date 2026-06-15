/**
 * The nutrition-label OCR parser turns scanned text into the macros a user
 * logs, so a parsing slip becomes wrong calories in someone's diary. It shipped
 * with no direct test. This locks the extraction, the per-100g confidence
 * anchor, the kJ->kcal fallback, OCR comma-decimals, serving size, and the
 * fieldNeedsCheck flag-clearing behaviour.
 */
import { parseNutritionLabel, fieldNeedsCheck } from '../ocrParser';

const UK_LABEL = `
Typical values per 100g
Energy 1465 kJ / 350 kcal
Fat 12.5g
of which saturates 4g
Carbohydrate 45g
of which sugars 5g
Fibre 6g
Protein 10g
Salt 0.5g
`;

describe('parseNutritionLabel', () => {
  test('extracts every macro from a per-100g UK label at high confidence', () => {
    const { fields, confidence, hasAnchor } = parseNutritionLabel(UK_LABEL);
    expect(hasAnchor).toBe(true);
    expect(fields.kcal100g).toBe(350);
    expect(fields.fat100g).toBe(12.5);
    expect(fields.carbs100g).toBe(45);
    expect(fields.fibre100g).toBe(6);
    expect(fields.protein100g).toBe(10);
    expect(confidence.kcal100g).toBe('high');
    expect(confidence.protein100g).toBe('high');
  });

  test('prefers the kcal figure over kJ when both are present', () => {
    expect(parseNutritionLabel('per 100g energy 1465 kJ 350 kcal').fields.kcal100g).toBe(350);
  });

  test('falls back to kJ -> kcal when no kcal is printed', () => {
    // 1465 / 4.184 = 350.1 -> 350
    const { fields } = parseNutritionLabel('per 100g Energy 1465 kJ');
    expect(fields.kcal100g).toBe(350);
  });

  test('without a per-100g anchor, values still extract but are low confidence', () => {
    const { fields, confidence, hasAnchor } = parseNutritionLabel('Protein 10g Fat 5g');
    expect(hasAnchor).toBe(false);
    expect(fields.protein100g).toBe(10);
    expect(confidence.protein100g).toBe('low');
    expect(confidence.fat100g).toBe('low');
  });

  test('normalises comma decimals from OCR ("12,5" -> 12.5)', () => {
    expect(parseNutritionLabel('per 100g Fat 12,5 g').fields.fat100g).toBe(12.5);
  });

  test('two-column label (per 100g first) takes the per-100g column', () => {
    // UK convention prints the per-100g column first, per-serving second.
    const label = 'Per 100g Per serving (30g) Energy 350 kcal 105 kcal Fat 12.5g 3.8g Protein 10g 3g';
    const { fields } = parseNutritionLabel(label);
    expect(fields.kcal100g).toBe(350);
    expect(fields.fat100g).toBe(12.5);
    expect(fields.protein100g).toBe(10);
  });

  test('skips an explicit per-serving column to the per-100g value (food review D-M4)', () => {
    // Some labels name the per-serving figure first: "Protein per serving 3g 10g".
    const { fields } = parseNutritionLabel('per 100g Protein per serving 3g 10g');
    expect(fields.protein100g).toBe(10);
  });

  test('reads a serving size in grams; missing serving is flagged missing', () => {
    expect(parseNutritionLabel('per 100g Serving size 30g Protein 10g').fields.servingG).toBe(30);
    expect(parseNutritionLabel('per 100g Protein 10g').confidence.servingG).toBe('missing');
  });

  test('carbs keyword falls back from "carbohydrate" to "carbs"', () => {
    expect(parseNutritionLabel('per 100g Carbs 45g').fields.carbs100g).toBe(45);
  });

  test('absent fields are null + missing, never NaN', () => {
    const { fields, confidence } = parseNutritionLabel('per 100g Protein 10g');
    expect(fields.fat100g).toBeNull();
    expect(fields.carbs100g).toBeNull();
    expect(confidence.fat100g).toBe('missing');
  });

  test('tolerates empty / junk input without throwing', () => {
    expect(() => parseNutritionLabel('')).not.toThrow();
    expect(() => parseNutritionLabel(null)).not.toThrow();
    expect(parseNutritionLabel('').fields.kcal100g).toBeNull();
  });
});

describe('fieldNeedsCheck', () => {
  test('flags a low-confidence field while it still holds the prefilled value', () => {
    expect(fieldNeedsCheck('low', 12.5, '12.5')).toBe(true);
  });

  test('clears the flag the moment the user edits the value', () => {
    expect(fieldNeedsCheck('low', 12.5, '13')).toBe(false);
  });

  test('never flags a high-confidence field, or an empty input', () => {
    expect(fieldNeedsCheck('high', 12.5, '12.5')).toBe(false);
    expect(fieldNeedsCheck('low', 12.5, '')).toBe(false);
    expect(fieldNeedsCheck('missing', null, '')).toBe(false);
  });
});
