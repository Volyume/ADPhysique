// Pins UK postcode recognition/normalisation, including the GIR 0AA
// special case and the BFPO shape, and the "human inputs" list from the
// blueprint's Tests and records section (ML1 1AA among them).
const { isValidPostcode, normalisePostcode, outwardCode, sectorCode, postcodeUnit } = require('../lib/postcode');

describe('normalisePostcode', () => {
  it('normalises spacing and case for standard postcodes', () => {
    expect(normalisePostcode('ml1 1aa').normalised).toBe('ML1 1AA');
    expect(normalisePostcode('ML11AA').normalised).toBe('ML1 1AA');
    expect(normalisePostcode('  sw1a1aa  ').normalised).toBe('SW1A 1AA');
    expect(normalisePostcode('EC1A 1BB').normalised).toBe('EC1A 1BB');
  });

  it('accepts the GIR 0AA special case', () => {
    const parsed = normalisePostcode('gir 0aa');
    expect(parsed).not.toBeNull();
    expect(parsed.normalised).toBe('GIR 0AA');
    expect(parsed.outward).toBe('GIR');
  });

  it('accepts the legacy BFPO shape', () => {
    const parsed = normalisePostcode('bfpo801');
    expect(parsed).not.toBeNull();
    expect(parsed.isBfpo).toBe(true);
    expect(parsed.normalised).toBe('BFPO 801');
  });

  it('accepts a BF-prefixed standard-shaped postcode', () => {
    expect(isValidPostcode('BF1 1AA')).toBe(true);
  });

  it('rejects non-postcode text', () => {
    expect(normalisePostcode('not a postcode')).toBeNull();
    expect(normalisePostcode('Motherwell')).toBeNull();
    expect(normalisePostcode('')).toBeNull();
    expect(normalisePostcode(null)).toBeNull();
  });

  it('rejects a structurally invalid postcode (disallowed second letter)', () => {
    expect(normalisePostcode('QI1 1AA')).toBeNull(); // "I" is never a valid second outward letter
  });
});

describe('outwardCode / sectorCode / postcodeUnit', () => {
  it('extracts the outward code for the near-me/search use case', () => {
    expect(outwardCode('ML1 1AA')).toBe('ML1');
    expect(outwardCode('gym near ML1')).toBeNull(); // free text, not a bare postcode
  });

  it('extracts the sector (outward + first inward digit)', () => {
    expect(sectorCode('ML1 1AA')).toBe('ML1 1');
    expect(sectorCode('EC1A 1BB')).toBe('EC1A 1');
    expect(sectorCode('BFPO 801')).toBeNull();
  });

  it('returns a stable postcode-unit key for dedupe blocking', () => {
    expect(postcodeUnit('ml1   1aa')).toBe(postcodeUnit('ML11AA'));
  });
});
