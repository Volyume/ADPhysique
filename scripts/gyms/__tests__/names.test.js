// GD-18 display-name cleanup fixtures, against the defects the first full
// pipeline run turned up (entities, baked-in status, all-caps, bracket
// qualifiers) plus the GD-18/GD-22 brand+branch composition. GD-25 name
// sanity bounds (saneName/boundName/stripTrailingOutward, and the widened
// alias-aware composition rule) against the defects the second full
// pipeline run turned up.
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
  saneName,
  boundName,
  stripTrailingOutward,
} = require('../lib/names');
const { aliasTokenSetsFor } = require('../lib/brands');

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

  // GD-25: the St Helens College case — a branch name built from a brand
  // ALIAS ("the gym"), not the brand's canonical name ("The Gym Group"),
  // must not be double-branded into "The Gym Group The Gym Health And
  // Fitness St Helens College". The old brand-name-only check missed this
  // because "the gym group" is not a contiguous run in the branch name.
  it('GD-25: does not double-brand a name already carrying a brand ALIAS, not just the canonical name', () => {
    const aliasTokenSets = aliasTokenSetsFor('the-gym-group');
    const result = composeBrandBranch('The Gym Health And Fitness St Helens College', 'The Gym Group', aliasTokenSets);
    expect(result).toBe('The Gym Health And Fitness St Helens College');
    expect(result.startsWith('The Gym Group The Gym')).toBe(false);
  });

  it('GD-25: still composes brand + branch when no alias is present in the name', () => {
    const aliasTokenSets = aliasTokenSetsFor('the-gym-group');
    expect(composeBrandBranch('York', 'The Gym Group', aliasTokenSets)).toBe('The Gym Group York');
  });
});

describe('saneName (GD-25)', () => {
  it('accepts an ordinary venue name', () => {
    expect(saneName('PureGym Motherwell')).toBe(true);
    expect(saneName('Third Space Chelsea')).toBe(true);
  });

  it('rejects a name over 80 characters', () => {
    expect(saneName('A'.repeat(81))).toBe(false);
    expect(saneName('A'.repeat(80))).toBe(true);
  });

  it('rejects a name with more than 8 tokens', () => {
    expect(saneName('One Two Three Four Five Six Seven Eight Nine')).toBe(false);
    expect(saneName('One Two Three Four Five Six Seven Eight')).toBe(true);
  });

  it('rejects a whole scraped club-page body (the Third Space Chelsea defect)', () => {
    const pageBody =
      'Chelsea SW3 Overview Club Facilities Classes Trainers Rates Enquire Book a Tour – Chelsea Book a Tour Overview Club Facilities Classes Rates Enquire Reformer Pilates Stretch, strengthen and tone in a luxurious space designed for focus and calm.';
    expect(saneName(pageBody)).toBe(false);
  });

  it('rejects empty/null/whitespace-only names', () => {
    expect(saneName('')).toBe(false);
    expect(saneName(null)).toBe(false);
    expect(saneName('   ')).toBe(false);
  });
});

describe('boundName (GD-25)', () => {
  it('truncates to at most 8 tokens', () => {
    expect(boundName('One Two Three Four Five Six Seven Eight Nine Ten')).toBe('One Two Three Four Five Six Seven Eight');
  });

  it('hard-caps at 80 characters', () => {
    const bounded = boundName('Word '.repeat(30).trim());
    expect(bounded.length).toBeLessThanOrEqual(80);
  });

  it('returns an empty string for no input', () => {
    expect(boundName('')).toBe('');
    expect(boundName(null)).toBe('');
  });
});

describe('stripTrailingOutward (GD-25)', () => {
  it('strips a trailing token matching the outward code (the Tower Bridge SE1 case)', () => {
    expect(stripTrailingOutward('Tower Bridge Se1', 'SE1')).toBe('Tower Bridge');
    expect(stripTrailingOutward('Third Space Tower Bridge SE1', 'SE1')).toBe('Third Space Tower Bridge');
  });

  it('is case-insensitive', () => {
    expect(stripTrailingOutward('Moorgate ec2', 'EC2')).toBe('Moorgate');
  });

  it('leaves a name alone when the trailing token does not match the outward code', () => {
    expect(stripTrailingOutward('PureGym Motherwell', 'ML1')).toBe('PureGym Motherwell');
  });

  it('leaves a name alone when no outward code is supplied', () => {
    expect(stripTrailingOutward('PureGym Motherwell', null)).toBe('PureGym Motherwell');
  });

  it('does not strip a mid-name token that happens to match', () => {
    expect(stripTrailingOutward('W1 Studio London', 'W1')).toBe('W1 Studio London');
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
