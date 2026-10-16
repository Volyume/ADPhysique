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

// Food data-layer audit 2026-10-16, item 8, the auditor's cases P5, P5b and
// P5c plus a normal per-100g-first label. Each failed before the fix: P5 read
// the per-bar column as per 100 g at high confidence, P5b took the protein
// figure from the ingredients list, P5c read "1 046 kJ" as 46 kJ (11 kcal).
describe('parseNutritionLabel: column order, where the table starts, spaced thousands (audit item 8)', () => {
  test('P5: "Per bar" before "Per 100g" takes the second figure of each nutrient, at high confidence', () => {
    const text = 'Nutrition Information Per bar (60g) Per 100g Energy 1050kJ 250kcal 1750kJ 417kcal '
      + 'Fat 9.0g 15g of which saturates 3.0g 5.0g Carbohydrate 30g 50g of which sugars 3.0g 5.0g Protein 12g 20g Salt 0.3g 0.5g';
    const { fields, confidence } = parseNutritionLabel(text);
    expect(fields.kcal100g).toBe(417);
    expect(fields.fat100g).toBe(15);
    expect(fields.carbs100g).toBe(50);
    expect(fields.protein100g).toBe(20);
    expect(confidence.kcal100g).toBe('high');
    expect(confidence.protein100g).toBe('high');
  });

  test('"per serving" and "per portion" headers before "per 100g" work the same way', () => {
    expect(parseNutritionLabel('Typical values per serving (30g) per 100g Energy 105 kcal 350 kcal Protein 3g 10g')
      .fields).toMatchObject({ kcal100g: 350, protein100g: 10 });
    expect(parseNutritionLabel('Nutrition per portion per 100g Fat 2g 8g').fields.fat100g).toBe(8);
  });

  test('P5b: an ingredients list before "Typical values" no longer feeds the protein figure', () => {
    const r = parseNutritionLabel('Ingredients: oats, milk protein 12%, sugar. Typical values per 100g Energy 1600kJ 380kcal Fat 7g Carbohydrate 60g Protein 13g');
    expect(r.fields.protein100g).toBe(13);
    expect(r.fields.kcal100g).toBe(380);
    expect(r.confidence.protein100g).toBe('high');
  });

  test('P5c: a kJ-only label with a space thousands separator reads 1046 kJ (250 kcal)', () => {
    const r = parseNutritionLabel('Energy 1 046 kJ Fat 3g Carbohydrate 40g Protein 8g per 100g');
    expect(r.fields.kcal100g).toBe(250);
    expect(r.fields.fat100g).toBe(3);
  });

  test('two columns side by side without both headers: the figures are kept but every one is low confidence', () => {
    const r = parseNutritionLabel('Typical values per 100g Energy 1465 kJ / 350 kcal Fat 9.0g 15g Protein 10g 3g');
    expect(r.fields.fat100g).toBe(9);
    expect(r.confidence.fat100g).toBe('low');
    expect(r.confidence.kcal100g).toBe('low');
  });

  test('a normal per-100g-first label is read exactly as before, at high confidence', () => {
    const r = parseNutritionLabel('Per 100g Per serving (30g) Energy 350 kcal 105 kcal Fat 12.5g 3.8g Carbohydrate 45g 13.5g Protein 10g 3g');
    expect(r.fields).toMatchObject({ kcal100g: 350, fat100g: 12.5, carbs100g: 45, protein100g: 10 });
    expect(r.confidence.kcal100g).toBe('high');
    expect(r.confidence.carbs100g).toBe('high');
    // And the single-column label at the top of this file is unchanged.
    expect(parseNutritionLabel(UK_LABEL).confidence.protein100g).toBe('high');
  });

  test('a percentage column (reference intake) is not read as a second figure', () => {
    const r = parseNutritionLabel('Typical values per 100g Fat 9g 13% Protein 10g 20%');
    expect(r.fields.fat100g).toBe(9);
    expect(r.confidence.fat100g).toBe('high');
  });

  test('two separate figures are never merged by the thousands join', () => {
    expect(parseNutritionLabel('per 100g Fat 9.0g 15g').fields.fat100g).toBe(9);
    expect(parseNutritionLabel('per 100g Energy 1465 kJ 350 kcal').fields.kcal100g).toBe(350);
  });
});
