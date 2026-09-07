/**
 * postcode.test.js (gym database blueprint `docs/gym-database-2026-09-06/
 * 20-BLUEPRINT.md`, "## Tests and records").
 *
 * Pins the UK postcode recognition every search bar, chip and submission
 * form in this campaign leans on: a full postcode normalises to
 * "OUTWARD INWARD" uppercase; a still-typing outward-only fragment
 * ("ML1") is recognised on its own; and a postcode embedded in a longer
 * phrase ("gym near ML1") is still found.
 */

import {
  recognisePostcode, isPostcodeLike, isFullPostcode, normalisePostcode,
  outwardOf, extractPostcode,
} from '../postcode';

describe('recognisePostcode', () => {
  test.each([
    ['ml1 1aa', 'ML1 1AA', 'ML1'],
    ['ML11AA', 'ML1 1AA', 'ML1'],
    ['  ml1   1aa  ', 'ML1 1AA', 'ML1'],
    ['sw1a 1aa', 'SW1A 1AA', 'SW1A'],
    ['ec1a 1bb', 'EC1A 1BB', 'EC1A'],
  ])('%s is a full postcode, normalised to %s', (input, normalised, outward) => {
    const hit = recognisePostcode(input);
    expect(hit.kind).toBe('full');
    expect(hit.normalised).toBe(normalised);
    expect(hit.outward).toBe(outward);
  });

  test.each(['ML1', 'ml1', 'SW1A', 'B1', 'CR2', 'DN55'])(
    '%s (still typing) is recognised as an outward code only',
    (input) => {
      const hit = recognisePostcode(input);
      expect(hit.kind).toBe('outward');
      expect(hit.normalised).toBeNull();
      expect(hit.outward).toBe(input.toUpperCase());
    },
  );

  test.each(['', '   ', 'Motherwell', 'PureGym', 'the gym', '12345', 'ML'])(
    '%s is not postcode-like at all',
    (input) => {
      expect(recognisePostcode(input)).toEqual({ kind: 'none', normalised: null, outward: null });
    },
  );
});

describe('the small helpers agree with recognisePostcode', () => {
  test('isPostcodeLike is true for full and outward, false otherwise', () => {
    expect(isPostcodeLike('ML1 1AA')).toBe(true);
    expect(isPostcodeLike('ML1')).toBe(true);
    expect(isPostcodeLike('Motherwell')).toBe(false);
  });

  test('isFullPostcode is true only for a complete postcode', () => {
    expect(isFullPostcode('ML1 1AA')).toBe(true);
    expect(isFullPostcode('ML1')).toBe(false);
  });

  test('normalisePostcode answers null for anything short of a full postcode', () => {
    expect(normalisePostcode('ml1 1aa')).toBe('ML1 1AA');
    expect(normalisePostcode('ML1')).toBeNull();
    expect(normalisePostcode('Motherwell')).toBeNull();
  });

  test('outwardOf reads the district from either shape', () => {
    expect(outwardOf('ML1 1AA')).toBe('ML1');
    expect(outwardOf('ML1')).toBe('ML1');
    expect(outwardOf('Motherwell')).toBeNull();
  });
});

describe('extractPostcode finds a postcode inside a longer phrase', () => {
  test('"gym near ML1" finds the outward code at the end', () => {
    const hit = extractPostcode('gym near ML1');
    expect(hit.kind).toBe('outward');
    expect(hit.outward).toBe('ML1');
  });

  test('"ML1 1AA" on its own is a full postcode', () => {
    const hit = extractPostcode('ML1 1AA');
    expect(hit.kind).toBe('full');
    expect(hit.normalised).toBe('ML1 1AA');
  });

  test('a phrase with nothing postcode-like finds nothing', () => {
    expect(extractPostcode('Motherwell gym')).toEqual({ kind: 'none', normalised: null, outward: null });
  });
});
