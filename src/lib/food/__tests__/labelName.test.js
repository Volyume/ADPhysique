/**
 * pickProductName: front-of-pack name extraction from OCR output, the
 * Cronometer-style "name the food from the label" step. Pure, so tested
 * against both MLKit block output (text + frame) and plain text.
 */
import { pickProductName } from '../labelName';

describe('pickProductName, flat text', () => {
  test('returns null for empty / missing input', () => {
    expect(pickProductName(null)).toBeNull();
    expect(pickProductName('')).toBeNull();
    expect(pickProductName('   ')).toBeNull();
  });

  test('takes the first sensible line as the name', () => {
    const text = 'Granola\nCrunchy Oat Clusters\nNutritional Information';
    expect(pickProductName(text)).toBe('Granola');
  });

  test('skips nutrition, energy and legal lines', () => {
    const text = [
      'Nutritional Information',
      'Energy 1465kJ / 350kcal',
      'Protein 12g',
      'Sea Salt Crisps',
      'Best before: see base',
    ].join('\n');
    expect(pickProductName(text)).toBe('Sea Salt Crisps');
  });

  test('keeps a name that contains a macro word', () => {
    expect(pickProductName('High Protein Granola\nProtein 20g')).toBe('High Protein Granola');
  });

  test('drops a bare macro table row', () => {
    expect(pickProductName('Protein 20g\nFat 5g')).toBeNull();
  });

  test('strips a trailing pack size from the name', () => {
    expect(pickProductName('Greek Yogurt 500g')).toBe('Greek Yogurt');
    expect(pickProductName('Sparkling Water 6 x 330ml')).toBe('Sparkling Water');
  });

  test('skips a lone pack size or number line', () => {
    expect(pickProductName('500g\n330ml\n1.5L')).toBeNull();
    expect(pickProductName('250\n%\nOaty Bar')).toBe('Oaty Bar');
  });

  test('reads the .text field of an OCR object when blocks are absent', () => {
    expect(pickProductName({ text: 'Almond Butter\nSmooth', blocks: [] })).toBe('Almond Butter');
  });
});

describe('pickProductName, MLKit blocks', () => {
  const block = (text, height, top) => ({ text, frame: { left: 0, top, width: 100, height } });

  test('picks the largest block (front-of-pack name) over small ones', () => {
    const ocr = {
      text: 'ignored',
      blocks: [
        block('Tesco', 18, 20),
        block('Protein Flapjack', 44, 60),     // biggest = the name
        block('Oats & Honey', 16, 120),
        block('500g', 14, 10),
      ],
    };
    expect(pickProductName(ocr)).toBe('Protein Flapjack');
  });

  test('breaks a font-size tie by which block sits higher up', () => {
    const ocr = {
      text: '',
      blocks: [
        block('Lower Line', 30, 200),
        block('Upper Line', 30, 40),
      ],
    };
    expect(pickProductName(ocr)).toBe('Upper Line');
  });

  test('excludes pack-size and nutrition blocks even when they are large', () => {
    const ocr = {
      text: '',
      blocks: [
        block('1kg', 50, 10),
        block('Energy 2000kJ', 48, 20),
        block('Rolled Oats', 30, 60),
      ],
    };
    expect(pickProductName(ocr)).toBe('Rolled Oats');
  });

  test('falls back to text when no block yields a candidate', () => {
    const ocr = { text: 'Mystery Snack', blocks: [block('500g', 40, 10), block('99p', 20, 30)] };
    expect(pickProductName(ocr)).toBe('Mystery Snack');
  });

  test('degrades to first-acceptable order when frames are missing', () => {
    const ocr = {
      text: '',
      blocks: [
        { text: 'Energy 500kJ' },
        { text: 'Coconut Water' },
        { text: 'Hydrating Drink' },
      ],
    };
    expect(pickProductName(ocr)).toBe('Coconut Water');
  });

  test('caps an overly long name at 50 characters', () => {
    const long = 'Super Deluxe Extra Large Family Size Value Pack Granola Clusters';
    const out = pickProductName(long);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out.startsWith('Super Deluxe')).toBe(true);
  });
});
