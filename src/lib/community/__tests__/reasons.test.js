/**
 * What this suite pins (SD-24; migration 163 spec 1.1 C):
 *
 *  - the four fixed-token reasons `community_find_people` now sends
 *    (`same_place`, `near_place`, `within_25_miles`, `same_age_band`) turn
 *    into their exact copy;
 *  - `same_place` reads the ROW's own place_label, falling back to
 *    area_label, never a raw distance or a percentage;
 *  - every OTHER reason (the server's own pre-built sentences) passes
 *    through completely unchanged, so this is safe to run over any
 *    reasons array without knowing in advance which are tokens.
 */

const { REASON_TOKENS, reasonCopy, reasonLines } = require('../reasons');

describe('reasonCopy', () => {
  test('the three fixed-wording tokens read as their exact copy', () => {
    expect(reasonCopy('same_age_band')).toBe('Same age band');
    expect(reasonCopy('near_place')).toBe('Near you');
    expect(reasonCopy('within_25_miles')).toBe('Within 25 miles');
  });

  test('same_place reads the row\'s place_label', () => {
    expect(reasonCopy('same_place', { place_label: 'Motherwell' })).toBe('In Motherwell');
  });

  test('same_place falls back to area_label for a pre-163 card', () => {
    expect(reasonCopy('same_place', { area_label: 'Leeds' })).toBe('In Leeds');
  });

  test('same_place with neither still answers something, never a crash', () => {
    expect(reasonCopy('same_place', {})).toBe('In your place');
    expect(reasonCopy('same_place')).toBe('In your place');
  });

  test('an already-rendered server sentence passes through unchanged', () => {
    expect(reasonCopy('Trains at PureGym Leeds')).toBe('Trains at PureGym Leeds');
    expect(reasonCopy('Also trains powerlifting')).toBe('Also trains powerlifting');
  });

  test('REASON_TOKENS names exactly the three fixed-wording tokens (same_place is not one: it needs a value)', () => {
    expect(Object.keys(REASON_TOKENS).sort()).toEqual(['near_place', 'same_age_band', 'within_25_miles']);
  });
});

describe('reasonLines', () => {
  test('a whole row of reasons, tokens and copy mixed, in order', () => {
    const card = { place_label: 'Motherwell' };
    expect(reasonLines(['Trains at PureGym Leeds', 'same_place', 'same_age_band'], card)).toEqual([
      'Trains at PureGym Leeds', 'In Motherwell', 'Same age band',
    ]);
  });

  test('near_place carries no distance at all -- only within_25_miles names a fixed band the spec itself gives', () => {
    expect(reasonLines(['near_place'], {})).toEqual(['Near you']);
  });

  test('a non-array answers an empty array, never a crash', () => {
    expect(reasonLines(null)).toEqual([]);
    expect(reasonLines(undefined)).toEqual([]);
  });
});
