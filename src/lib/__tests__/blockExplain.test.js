
describe('C6 closeout B2 (founder ruling): the protective non-change is visible, its cause is not', () => {
  const { buildLedgerReflectionRows } = require('../blockExplain');
  const entry = (over = {}) => ({
    muscle: 'chest', classification: 'RESPONSIVE',
    rationale: 'Chest responded well at this dose, so the starting volume carries over unchanged.',
    ...over,
  });

  test('a prevented climb gains the one fixed cause-agnostic clause', () => {
    const rows = buildLedgerReflectionRows({ entries: [entry({ upwardCarryPrevented: true })] });
    expect(rows[0].rationale).toMatch(/This one is deliberately kept steady rather than increased this block\.$/);
  });

  test('the clause NEVER names or hints at the cause - no detector words on any row', () => {
    const rows = buildLedgerReflectionRows({
      entries: [entry({ upwardCarryPrevented: true }), entry({ muscle: 'quads', upwardCarryPrevented: true })],
    });
    for (const r of rows) {
      expect(r.rationale).not.toMatch(/\bED\b/); // the acronym, case-sensitive
      expect(r.rationale).not.toMatch(/eating|calm|wellbeing|safety|flag|suppress|protect|stale/i);
    }
    // One fixed clause for every cause: identical wording on both rows,
    // so the copy cannot become a side channel into the classification.
    const clause = (s) => s.slice(s.indexOf('This one is'));
    expect(clause(rows[0].rationale)).toBe(clause(rows[1].rationale));
  });

  test('an ordinary entry is untouched (no clause without a recorded prevention)', () => {
    const rows = buildLedgerReflectionRows({ entries: [entry()] });
    expect(rows[0].rationale).not.toMatch(/deliberately kept steady/);
  });
});
