// GD-18 display-name cleanup fixtures, against the defects the first full
// pipeline run turned up (entities, baked-in status, all-caps, bracket
// qualifiers) plus the GD-18/GD-22 brand+branch composition.
const {
  decodeEntities,
  stripStatusSuffix,
  isAllCaps,
  toTitleCase,
  bracketQualifierToSuffix,
  composeBrandBranch,
  cleanDisplayName,
  buildExceptionsMap,
  brandCasingExceptions,
} = require('../lib/names');

describe('decodeEntities', () => {
  it('decodes &amp; and other named entities', () => {
    expect(decodeEntities('Fit &amp; Well Gym')).toBe('Fit & Well Gym');
    expect(decodeEntities('Rock &amp; Ride')).toBe('Rock & Ride');
  });

  it('decodes numeric entities', () => {
    expect(decodeEntities('Caf&#233;')).toBe('Café');
  });

  it('leaves plain text untouched', () => {
    expect(decodeEntities('PureGym Cardiff')).toBe('PureGym Cardiff');
  });
});

describe('stripStatusSuffix', () => {
  it('strips "(CLOSED)"', () => {
    const r = stripStatusSuffix('AB SALUTE GYM (CLOSED)');
    expect(r.name).toBe('AB SALUTE GYM');
    expect(r.statusHint).toBe('closed');
  });

  it('strips "- CLOSED"', () => {
    const r = stripStatusSuffix('Riverside Gym - CLOSED');
    expect(r.name).toBe('Riverside Gym');
    expect(r.statusHint).toBe('closed');
  });

  it('strips "(TEMPORARILY CLOSED)" ahead of the plainer CLOSED pattern', () => {
    const r = stripStatusSuffix('Some Gym (TEMPORARILY CLOSED)');
    expect(r.name).toBe('Some Gym');
    expect(r.statusHint).toBe('closed');
  });

  it('is case-insensitive', () => {
    const r = stripStatusSuffix('Some Gym (closed)');
    expect(r.name).toBe('Some Gym');
  });

  it('leaves a name with no status suffix untouched', () => {
    const r = stripStatusSuffix('PureGym Motherwell');
    expect(r.name).toBe('PureGym Motherwell');
    expect(r.statusHint).toBeNull();
  });

  it('strips a doubled-up status suffix in full ("DEIGHTON SPORTS ARENA (CLOSED) (CLOSED)")', () => {
    const r = stripStatusSuffix('DEIGHTON SPORTS ARENA (CLOSED) (CLOSED)');
    expect(r.name).toBe('DEIGHTON SPORTS ARENA');
    expect(r.statusHint).toBe('closed');
  });

  it('does not strip "closed" when it is not a trailing suffix (a real name starting with the word)', () => {
    const r = stripStatusSuffix('Closed Combat Arena');
    expect(r.name).toBe('Closed Combat Arena');
    expect(r.statusHint).toBeNull();
  });
});

describe('isAllCaps / toTitleCase', () => {
  it('detects an all-caps name', () => {
    expect(isAllCaps('ORMSKIRK LEISURE CENTRE')).toBe(true);
    expect(isAllCaps('PureGym Motherwell')).toBe(false);
  });

  it('title-cases an all-caps name', () => {
    expect(toTitleCase('ORMSKIRK LEISURE CENTRE')).toBe('Ormskirk Leisure Centre');
  });

  it('keeps exceptions list words as authored (YMCA, JD, DW, LA, F45, UK, PT)', () => {
    const map = buildExceptionsMap();
    expect(toTitleCase('YMCA CENTRAL', map)).toBe('YMCA Central');
    expect(toTitleCase('JD GYMS YORK', map)).toBe('JD Gyms York');
    expect(toTitleCase('DW FITNESS FIRST', map)).toBe('DW Fitness First');
    expect(toTitleCase('LA FITNESS', map)).toBe('LA Fitness');
    expect(toTitleCase('F45 TRAINING', map)).toBe('F45 Training');
    expect(toTitleCase('UK GYM GROUP', map)).toBe('UK Gym Group');
    expect(toTitleCase('PT STUDIO', map)).toBe('PT Studio');
  });

  it('keeps a roman numeral upper case', () => {
    expect(toTitleCase('PHASE II GYM')).toBe('Phase II Gym');
    expect(toTitleCase('UNIT IV FITNESS')).toBe('Unit IV Fitness');
  });

  it('honours brand casing exceptions (PureGym, not Puregym)', () => {
    const map = buildExceptionsMap(brandCasingExceptions([{ name: 'PureGym' }, { name: '1Rebel' }]));
    expect(toTitleCase('PUREGYM CARDIFF', map)).toBe('PureGym Cardiff');
    expect(toTitleCase('1REBEL SOHO', map)).toBe('1Rebel Soho');
  });
});

describe('bracketQualifierToSuffix', () => {
  it('turns a trailing bracket qualifier into a plain suffix', () => {
    expect(bracketQualifierToSuffix('Third Space (Moorgate)')).toBe('Third Space Moorgate');
    expect(bracketQualifierToSuffix('AB Salute Gym (Lakeside)')).toBe('AB Salute Gym Lakeside');
  });

  it('leaves a name with no trailing bracket alone', () => {
    expect(bracketQualifierToSuffix('PureGym Motherwell')).toBe('PureGym Motherwell');
  });

  it('does not touch a bracket that is not at the very end', () => {
    expect(bracketQualifierToSuffix('The (Old) Gym Building')).toBe('The (Old) Gym Building');
  });
});

describe('composeBrandBranch', () => {
  it('composes brand + branch when the name is bare (town only)', () => {
    expect(composeBrandBranch('Motherwell', 'PureGym')).toBe('PureGym Motherwell');
  });

  it('strips a trailing generic word before composing', () => {
    expect(composeBrandBranch('Aberdare Gym', 'PureGym')).toBe('PureGym Aberdare');
  });

  it('leaves a name that already carries the brand alone', () => {
    expect(composeBrandBranch('JD Gyms York', 'JD Gyms')).toBe('JD Gyms York');
  });

  it('returns the bare name when there is no brand', () => {
    expect(composeBrandBranch('Iron Temple Gym', null)).toBe('Iron Temple Gym');
  });
});

describe('cleanDisplayName — full pipeline', () => {
  it('fixes the first-run defect case: entities + all-caps + closed suffix', () => {
    const r = cleanDisplayName('RIVERSIDE GYM &amp; FITNESS (CLOSED)');
    expect(r.name).toBe('Riverside Gym & Fitness');
    expect(r.statusHint).toBe('closed');
  });

  it('fixes the Third Space Moorgate case end to end', () => {
    const r = cleanDisplayName('THIRD SPACE (MOORGATE)', {
      exceptionsMap: buildExceptionsMap(brandCasingExceptions([{ name: 'Third Space' }])),
    });
    expect(r.name).toBe('Third Space Moorgate');
  });

  it('leaves an already mixed-case name untouched (bar status/entity cleanup)', () => {
    const r = cleanDisplayName('PureGym Motherwell');
    expect(r.name).toBe('PureGym Motherwell');
  });
});
