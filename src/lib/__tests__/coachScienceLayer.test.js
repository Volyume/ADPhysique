// U-B-9 (M1): the opt-in science layer (applyScienceLayer) brackets a technical
// term after the plain one only when "Show the science" is on. The contract:
// OFF is byte-identical; ON keeps the plain term leading and the technical term
// in brackets; copy outside the brackets still passes the jargon blocklist.
import { applyScienceLayer, withScience, SCIENCE_PAIRS, checkJargonScienceOn } from '../coachRegister';

describe('applyScienceLayer (U-B-9 opt-in science layer)', () => {
  test('OFF returns the string byte-for-byte unchanged', () => {
    const s = 'A lighter week is scheduled. Cut sets roughly in half.';
    expect(applyScienceLayer(s, false)).toBe(s);
    expect(applyScienceLayer(s)).toBe(s); // default OFF
  });

  test('ON brackets the technical term after the plain one (deload)', () => {
    expect(applyScienceLayer('A lighter week is scheduled.', true))
      .toBe('A lighter week (deload) is scheduled.');
  });

  test('the plain term always leads; the technical term never appears alone', () => {
    const out = applyScienceLayer('Your next lighter week is about 3 weeks away.', true);
    expect(out).toContain('lighter week (deload)');
    expect(out).not.toMatch(/\bdeload\b(?![)])/); // no bare "deload" outside the brackets
  });

  test('a pair whose plain phrase is absent is inert (no change)', () => {
    // MEV/MRV and RIR are blocklisted and never appear in coach copy, so their
    // pairs only fire if the plain phrase is present.
    expect(applyScienceLayer('Sessions: 4 of 4. On the set rate.', true))
      .toBe('Sessions: 4 of 4. On the set rate.');
  });

  test('does not double-bracket an already-bracketed term', () => {
    const once = applyScienceLayer('A lighter week is scheduled.', true);
    expect(applyScienceLayer(once, true)).toBe(once);
  });

  test('output always passes the science-on jargon guard (no jargon outside brackets)', () => {
    for (const { plain } of SCIENCE_PAIRS) {
      const out = applyScienceLayer(`Note: ${plain} applies this week.`, true);
      expect(checkJargonScienceOn(out).clean).toBe(true);
    }
  });

  test('null/empty input is safe', () => {
    expect(applyScienceLayer(null, true)).toBe('');
    expect(applyScienceLayer('', true)).toBe('');
  });

  test('SCIENCE_PAIRS are the founder-confirmed set', () => {
    expect(SCIENCE_PAIRS.map(p => p.tech)).toEqual(['MEV to MRV', 'deload', 'RIR']);
    // sanity: the helper composes withScience exactly
    expect(withScience('lighter week', 'deload', true)).toBe('lighter week (deload)');
  });
});
