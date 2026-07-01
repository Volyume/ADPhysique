/**
 * U6 iron / micronutrient awareness for female athletes (founder 2026-07-01).
 * Invariants: female-only, awareness-only (never tracking/avoidance framing),
 * always signposts symptoms to a GP, and never throws.
 */
import { femaleNutritionAwareness } from '../femaleNutritionAwareness';

describe('femaleNutritionAwareness', () => {
  test('returns null for any non-female user (never surfaces for men)', () => {
    expect(femaleNutritionAwareness('male')).toBeNull();
    expect(femaleNutritionAwareness(null)).toBeNull();
    expect(femaleNutritionAwareness(undefined)).toBeNull();
    expect(femaleNutritionAwareness('other')).toBeNull();
  });

  test('returns structured awareness content for a female user', () => {
    const a = femaleNutritionAwareness('female');
    expect(a).not.toBeNull();
    expect(typeof a.title).toBe('string');
    expect(typeof a.intro).toBe('string');
    expect(Array.isArray(a.nutrients)).toBe(true);
    expect(a.nutrients.length).toBeGreaterThanOrEqual(3);
    a.nutrients.forEach(n => {
      expect(typeof n.key).toBe('string');
      expect(typeof n.name).toBe('string');
      expect(typeof n.why).toBe('string');
      expect(typeof n.foods).toBe('string');
    });
  });

  test('leads with iron and signposts symptoms to a GP', () => {
    const a = femaleNutritionAwareness('female');
    const iron = a.nutrients.find(n => n.key === 'iron');
    expect(iron).toBeTruthy();
    expect(iron.name.toLowerCase()).toContain('iron');
    expect(a.footnote.toLowerCase()).toContain('gp');
  });

  test('is encouraging, not restrictive: no "avoid"/"cut out"/"count" framing', () => {
    const a = femaleNutritionAwareness('female');
    const blob = JSON.stringify(a).toLowerCase();
    expect(blob).not.toContain('avoid');
    expect(blob).not.toContain('cut out');
    expect(blob).not.toContain('count every');
    // Explicitly tells the user they do not need to count.
    expect(a.intro.toLowerCase()).toContain('not need to count');
  });

  test('never throws on odd input', () => {
    expect(() => femaleNutritionAwareness(123)).not.toThrow();
    expect(() => femaleNutritionAwareness({})).not.toThrow();
    expect(femaleNutritionAwareness(123)).toBeNull();
  });
});
