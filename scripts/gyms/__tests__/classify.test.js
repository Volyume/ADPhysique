// GD-03 classification fixtures, one per source, plus the priority order
// and the excluded/name-token fallback cases.
const { classify, VENUE_TYPES } = require('../lib/classify');

describe('classify — priority order', () => {
  it('a resolved brand always wins, regardless of other evidence', () => {
    const result = classify({
      name: 'PureGym Motherwell',
      brand: { key: 'puregym', name: 'PureGym', kind: 'commercial_gym' },
      source: 'active_places_ni', // deliberately conflicting source evidence
      ni: { ownershipType: 'Education', fitnessFlag: true, boxingFlag: false },
    });
    expect(result.venue_type).toBe('commercial_gym');
    expect(result.reason).toBe('brand:puregym');
  });

  it('a record with no usable address is excluded ahead of everything else', () => {
    const result = classify({ name: 'Some Gym', hasAddress: false, source: 'overture' });
    expect(result.venue_type).toBe('excluded');
  });
});

describe('classify — Active Places (England) evidence', () => {
  it('commercial management -> commercial_gym', () => {
    const result = classify({
      name: 'AB SALUTE GYM (LAKESIDE)',
      source: 'active_places',
      hasAddress: true,
      activePlaces: { managementgroupstr: 'Commercial', accessibilitygroupstr: 'Public Access' },
    });
    expect(result.venue_type).toBe('commercial_gym');
  });

  it('a school site (educationphase set) is excluded', () => {
    const result = classify({
      name: 'BURSCOUGH PRIORY ACADEMY',
      source: 'active_places',
      hasAddress: true,
      activePlaces: { educationphase: 6, managementgroupstr: 'Education' },
    });
    expect(result.venue_type).toBe('excluded');
    expect(result.reason).toBe('active_places_school_site');
  });

  it('local-authority/community public management -> leisure_centre', () => {
    const result = classify({
      name: 'ORMSKIRK LEISURE CENTRE',
      source: 'active_places',
      hasAddress: true,
      activePlaces: { managementgroupstr: 'Local Authority', accessibilitygroupstr: 'Public Access' },
    });
    expect(result.venue_type).toBe('leisure_centre');
  });
});

describe('classify — Active Places NI evidence', () => {
  it('district council ownership + fitness flag -> leisure_centre', () => {
    const result = classify({
      name: 'Some Leisure Centre',
      source: 'active_places_ni',
      hasAddress: true,
      ni: { ownershipType: 'District Council', fitnessFlag: true, boxingFlag: false },
    });
    expect(result.venue_type).toBe('leisure_centre');
  });

  it('private ownership + fitness flag -> independent_gym', () => {
    const result = classify({
      name: 'Some Private Gym',
      source: 'active_places_ni',
      hasAddress: true,
      ni: { ownershipType: 'Private', fitnessFlag: true, boxingFlag: false },
    });
    expect(result.venue_type).toBe('independent_gym');
  });

  it('boxing flag without fitness flag -> martial_arts', () => {
    const result = classify({
      name: 'Abbey Boxing Club',
      source: 'active_places_ni',
      hasAddress: true,
      ni: { ownershipType: 'Club', fitnessFlag: false, boxingFlag: true },
    });
    expect(result.venue_type).toBe('martial_arts');
  });

  it('education ownership is excluded', () => {
    const result = classify({
      name: 'Some School',
      source: 'active_places_ni',
      hasAddress: true,
      ni: { ownershipType: 'Education', fitnessFlag: true, boxingFlag: false },
    });
    expect(result.venue_type).toBe('excluded');
  });
});

describe('classify — Wales (DataMapWales) evidence', () => {
  it('a Health and Fitness Suite type -> leisure_centre', () => {
    const result = classify({
      name: 'Pembroke Leisure Centre',
      source: 'datamap_wales',
      hasAddress: true,
      wales: { type: 'Sports Hall,Swimming Pool,Health and Fitness Suite', status: 'Operational' },
    });
    expect(result.venue_type).toBe('leisure_centre');
  });
});

describe('classify — name-token fallback (independents, Companies House candidates)', () => {
  it('"VOLT FITNESS UK LIMITED" (Companies House candidate) -> independent_gym', () => {
    const result = classify({ name: 'VOLT FITNESS UK LIMITED', source: 'companies_house', hasAddress: true });
    expect(result.venue_type).toBe('independent_gym');
    expect(result.reason).toBe('name_token:gym_or_fitness');
  });

  it('a crossfit box name -> crossfit_functional', () => {
    const result = classify({ name: 'CrossFit Riverside', source: 'overture', hasAddress: true });
    expect(result.venue_type).toBe('crossfit_functional');
  });

  it('a karate club name -> martial_arts', () => {
    const result = classify({ name: 'McKinstry Family Karate', source: 'overture', hasAddress: true });
    expect(result.venue_type).toBe('martial_arts');
  });

  it('an unrecognised name with no signal -> other_fitness', () => {
    const result = classify({ name: 'Zzyx Studios Ltd', source: 'overture', hasAddress: true });
    expect(result.venue_type).toBe('other_fitness');
  });

  it('every returned venue_type is one of the GD-03 enumerated types', () => {
    const fixtures = [
      { name: 'PureGym Cardiff', source: 'overture', hasAddress: true },
      { name: 'A Womens Gym', source: 'overture', hasAddress: true },
      { name: 'University of Leeds Sports Centre', source: 'overture', hasAddress: true },
      { name: 'Hilton Hotel Gym', source: 'overture', hasAddress: true },
    ];
    for (const f of fixtures) {
      expect(VENUE_TYPES).toContain(classify(f).venue_type);
    }
  });
});
