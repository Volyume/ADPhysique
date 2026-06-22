import { TONNAGE_MILESTONES, pendingTonnageMilestone, formatTonnage } from '../tonnageMilestone';

describe('tonnageMilestone: pendingTonnageMilestone', () => {
  test('returns the highest landmark reached and not yet seen', () => {
    expect(pendingTonnageMilestone(120000, [])).toBe(100000);
    expect(pendingTonnageMilestone(600000, [100000, 250000])).toBe(500000);
    // A big jump past several unseen thresholds offers only the highest.
    expect(pendingTonnageMilestone(1200000, [])).toBe(1000000);
  });

  test('null below the first landmark or when all reached are seen', () => {
    expect(pendingTonnageMilestone(99999, [])).toBeNull();
    expect(pendingTonnageMilestone(120000, [100000])).toBeNull();
    expect(pendingTonnageMilestone(null, [])).toBeNull();
    expect(pendingTonnageMilestone(NaN, [])).toBeNull();
  });

  test('landmarks are ascending, in round figures', () => {
    expect(TONNAGE_MILESTONES[0]).toBe(100000);
    const sorted = [...TONNAGE_MILESTONES].sort((a, b) => a - b);
    expect([...TONNAGE_MILESTONES]).toEqual(sorted);
  });
});

describe('tonnageMilestone: formatTonnage', () => {
  test('groups digits with commas', () => {
    expect(formatTonnage(100000)).toBe('100,000');
    expect(formatTonnage(1000000)).toBe('1,000,000');
    expect(formatTonnage(950)).toBe('950');
    expect(formatTonnage(0)).toBe('0');
  });
});
