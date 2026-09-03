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
    const { fields, confidence } = parseNutritionLabel('per 100g Serving size 30g Protein 10g');
    expect(fields.servingG).toBe(30);
    expect(fields.servingMl).toBeNull();
    expect(fields.servingUnit).toBe('g');
    expect(confidence.servingG).toBe('high');
    expect(confidence.servingMl).toBe('missing');

    const missing = parseNutritionLabel('per 100g Protein 10g');
    expect(missing.confidence.servingG).toBe('missing');
    expect(missing.confidence.servingMl).toBe('missing');
    expect(missing.fields.servingUnit).toBeNull();
  });

  test('a drink label\'s ml serving is preserved, not dropped to null (data-loss fix)', () => {
    // Real label shape: "Serving size 330 ml", macros given per 100 ml.
    const label = 'Typical values per 100ml Serving size 330 ml Energy 42 kcal Protein 0.1g';
    const { fields, confidence } = parseNutritionLabel(label);
    expect(fields.servingMl).toBe(330);
    expect(fields.servingG).toBeNull();
    expect(fields.servingUnit).toBe('ml');
    expect(confidence.servingMl).toBe('high');
    expect(confidence.servingG).toBe('missing');
    // Everything else extracts exactly as it would for a g-based label.
    expect(fields.kcal100g).toBe(42);
    expect(fields.protein100g).toBe(0.1);
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
