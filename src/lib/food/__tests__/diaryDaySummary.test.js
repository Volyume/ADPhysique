import { buildDiaryDaySummary, formatDiaryDaySummary } from '../diaryDaySummary';

describe('diary day summary model', () => {
  test('formats a targeted day with remaining energy and macro chips', () => {
    const model = buildDiaryDaySummary({
      rollup: { kcal_total: 1840, protein_g: 120, carbs_g: 180, fat_g: 60 },
      targets: { targetKcal: 2100, proteinG: 160, carbsG: 220, fatG: 70 },
      planned: { kcal: 300 },
      entriesCount: 4,
      dayTypeLabel: 'Training day',
    });
    expect(model.remainingKcal).toBe(260);

    const copy = formatDiaryDaySummary(model, 'kcal');
    expect(copy.primary).toBe('260 kcal left today');
    expect(copy.secondary).toBe('4 entries logged so far.');
    expect(copy.chips.map((chip) => chip.value)).toEqual([
      '1840 kcal',
      '260 kcal left',
      '40g left',
      '40g left',
      '10g left',
      '+300 kcal planned',
      'Training day',
    ]);
  });

  test('keeps no-target days useful instead of empty', () => {
    const copy = formatDiaryDaySummary(buildDiaryDaySummary({
      rollup: { kcal_total: 500, protein_g: 35, carbs_g: 50, fat_g: 10 },
      targets: null,
      entriesCount: 1,
    }));
    expect(copy.primary).toBe('500 kcal logged');
    expect(copy.chips.map((chip) => chip.value)).toContain('35g logged');
    expect(copy.chips.map((chip) => chip.value)).not.toContain('Remaining');
  });

  test('formats over-target values factually', () => {
    const copy = formatDiaryDaySummary(buildDiaryDaySummary({
      rollup: { kcal_total: 2300, protein_g: 170, carbs_g: 240, fat_g: 80 },
      targets: { targetKcal: 2100, proteinG: 160, carbsG: 220, fatG: 70 },
      entriesCount: 3,
    }));
    expect(copy.primary).toBe('200 kcal over today');
    expect(copy.chips.map((chip) => chip.value)).toContain('10g over');
  });
});
