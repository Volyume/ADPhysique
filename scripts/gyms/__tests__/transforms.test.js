// Source-adapter transform fixtures (5-line-scale fixtures per source).
// Jest in this repo cannot dynamic-import the real ESM .mjs adapters
// (no --experimental-vm-modules in the jest config), so each adapter's
// per-row transform is factored into lib/transforms.js and tested here
// directly; the .mjs files in sources/ are thin file-streaming wrappers
// around these same functions (see each adapter's own header comment).
const {
  transformActivePlacesSite,
  transformNiRow,
  transformWalesFeature,
  transformOperatorBranch,
  transformOvertureRow,
  transformCompaniesHouseRow,
} = require('../lib/transforms');

describe('transformActivePlacesSite (England)', () => {
  const site = {
    siteid: 1000021,
    sitename: 'EXAMPLE LEISURE CENTRE',
    posttown: 'READING',
    postcode: 'RG1 1AA',
    thoroughfarename: 'HIGH STREET',
    buildingnumber: '10',
    telnumber: '01189 000000',
    website: 'https://example.org',
    lat: 51.45,
    long: -0.97,
    reclastchkddate: 1700000000000,
    managementgroupstr: 'Commercial',
    ownertypestr: 'Commercial',
  };
  const facilities = [
    { siteid: 1000021, facilityid: 1, facilitytype: 'Health and Fitness Gym', facstatus: 'Operational', stations: 120 },
  ];

  it('joins site + facilities into one venue record with facility_count', () => {
    const rec = transformActivePlacesSite(site, facilities);
    expect(rec.source).toBe('active_places');
    expect(rec.source_record_id).toBe('1000021');
    expect(rec.name).toBe('EXAMPLE LEISURE CENTRE');
    expect(rec.postcode).toBe('RG1 1AA');
    expect(rec.facility_count).toBe(1);
    expect(rec.status).toBe('open');
    expect(rec.activePlaces.managementgroupstr).toBe('Commercial');
  });

  it('returns null when there are no facilities for the site', () => {
    expect(transformActivePlacesSite(site, [])).toBeNull();
    expect(transformActivePlacesSite(site, null)).toBeNull();
  });

  it('treats a dummy "00000000000" phone number as absent', () => {
    const rec = transformActivePlacesSite({ ...site, telnumber: '00000000000' }, facilities);
    expect(rec.phone).toBeNull();
  });

  it('marks status closed when no facility is Operational', () => {
    const rec = transformActivePlacesSite(site, [{ ...facilities[0], facstatus: 'Closed' }]);
    expect(rec.status).toBe('closed');
  });
});

describe('transformNiRow (Northern Ireland)', () => {
  const row = {
    VENUE_NAME: 'Abbey Boxing Club',
    ADDRESS_LINE_1: 'Banks Lane',
    POST_TOWN: 'Bangor',
    POST_CODE: 'BT20 5EJ',
    TELEPHONE: '',
    OWNERSHIP_TYPE: 'Club',
    FITNESS: 'No',
    BOXING: 'Yes',
  };

  it('skips a row with FITNESS=No', () => {
    expect(transformNiRow(row)).toBeNull();
  });

  it('emits a record for FITNESS=Yes with ownership/flags for classify.js', () => {
    const rec = transformNiRow({ ...row, FITNESS: 'Yes' });
    expect(rec.source).toBe('active_places_ni');
    expect(rec.ni.ownershipType).toBe('Club');
    expect(rec.ni.boxingFlag).toBe(true);
    expect(rec.postcode).toBe('BT20 5EJ');
    // Coordinates are filled by the .mjs adapter (Irish Grid conversion), not here.
    expect(rec.coord_source).toBe('none');
  });
});

describe('transformWalesFeature (DataMapWales)', () => {
  const feature = {
    id: 'leisure_centres_wales.2',
    geometry: { coordinates: [[197701, 202526]] },
    properties: {
      uprn: 200003248363,
      name: 'Pembroke Leisure Centre',
      type: 'Sports Hall,Swimming Pool,Health and Fitness Suite',
      street: 'BUSH HILL',
      town: 'PEMBROKE',
      postcode: 'SA71 4RJ',
      status: 'Operational',
    },
  };

  it('builds a record with the properties mapped through', () => {
    const rec = transformWalesFeature(feature);
    expect(rec.source).toBe('datamap_wales');
    expect(rec.name).toBe('Pembroke Leisure Centre');
    expect(rec.postcode).toBe('SA71 4RJ');
    expect(rec.status).toBe('open');
    expect(rec.wales.type).toContain('Health and Fitness Suite');
  });

  it('marks a Closed status venue as closed', () => {
    const rec = transformWalesFeature({ ...feature, properties: { ...feature.properties, status: 'Closed' } });
    expect(rec.status).toBe('closed');
  });

  it('returns null for a feature with no name', () => {
    expect(transformWalesFeature({ ...feature, properties: { ...feature.properties, name: '' } })).toBeNull();
  });
});

describe('transformOperatorBranch', () => {
  const branch = {
    source_url: 'https://www.jdgyms.co.uk/gym/york/',
    retrieved_at: '2026-09-06T17:50:56.197Z',
    name: 'JD Gyms York',
    street_address: 'Unit 4 Clifton Moor Retail Park',
    town: 'York',
    postcode: 'YO30 4XU',
    coords: null,
    phone: '01904 230370',
    status: 'coming_soon',
    hours_24: true,
  };

  it('resolves the brand from the branch name and slug', () => {
    const rec = transformOperatorBranch(branch, 'jd-gyms', 1);
    expect(rec.source).toBe('operator:jd-gyms');
    expect(rec.brand.key).toBe('jd-gyms');
    expect(rec.status).toBe('pending'); // coming_soon -> pending
  });

  it('returns null for a branch with no name', () => {
    expect(transformOperatorBranch({ ...branch, name: '' }, 'jd-gyms', 1)).toBeNull();
  });

  it('GD-22: composes brand + branch at normalisation when the branch name is bare', () => {
    const rec = transformOperatorBranch(
      { ...branch, name: 'Aberdare Gym', source_url: 'https://www.puregym.com/gyms/aberdare/' },
      'puregym',
      1,
    );
    expect(rec.brand.key).toBe('puregym');
    expect(rec.name).toBe('PureGym Aberdare');
  });

  it('GD-22: leaves a branch name that already carries the brand alone (bar GD-18 cleanup)', () => {
    const rec = transformOperatorBranch(branch, 'jd-gyms', 1);
    expect(rec.name).toBe('JD Gyms York');
  });
});

describe('transformOvertureRow', () => {
  const baseRow = {
    id: 'd7afaae6-6df3-45e7-a320-f5ba9a7f7b70',
    name_primary: 'Volt Gym',
    categories: { primary: 'gym', alternate: null },
    addresses: [{ freeform: '4 Osprey Pl', locality: 'Burscough', postcode: 'L40 8TG', country: 'GB' }],
    phones: ['01704 893666'],
    websites: ['http://www.voltgym.co.uk'],
    brand: { wikidata: null, names: { primary: null } },
    confidence: 0.77,
    sources: [{ dataset: 'Foursquare', record_id: '210b785d98b54653785e09ac' }],
    lat: 53.5889,
    lng: -2.8655,
  };

  it('builds a record and preserves per-dataset provenance/licence', () => {
    const rec = transformOvertureRow(baseRow, true);
    expect(rec.source).toBe('overture');
    expect(rec.postcode).toBe('L40 8TG');
    expect(rec.town).toBe('Burscough');
    expect(rec.payload.overture_sources).toEqual([
      { dataset: 'Foursquare', record_id: '210b785d98b54653785e09ac', licence: 'Apache-2.0' },
    ]);
  });

  it('rewrites the "PureGym US" mislabel to "PureGym"', () => {
    const row = { ...baseRow, brand: { names: { primary: 'PureGym US' } } };
    const rec = transformOvertureRow(row, true);
    expect(rec.brand_guess).toBe('PureGym');
  });

  it('excludes fitness_trainer (people, not venues)', () => {
    const row = { ...baseRow, categories: { primary: 'fitness_trainer' } };
    expect(transformOvertureRow(row, true)).toBeNull();
  });

  it('excludes an equipment retailer category', () => {
    const row = { ...baseRow, categories: { primary: 'fitness_exercise_equipment' } };
    expect(transformOvertureRow(row, true)).toBeNull();
  });

  it('flags low confidence below 0.3', () => {
    const row = { ...baseRow, confidence: 0.2 };
    expect(transformOvertureRow(row, true).low_confidence).toBe(true);
  });

  it('returns null when the caller has already excluded the row on country/bounds', () => {
    expect(transformOvertureRow(baseRow, false)).toBeNull();
  });

  it('maps martial_arts_club to a martial_arts venue_type_hint', () => {
    const row = { ...baseRow, categories: { primary: 'martial_arts_club' } };
    expect(transformOvertureRow(row, true).venue_type_hint).toBe('martial_arts');
  });
});

describe('transformCompaniesHouseRow', () => {
  const row = {
    CompanyName: 'VOLT FITNESS UK LIMITED',
    CompanyNumber: '10119606',
    'RegAddress.AddressLine1': '2A Swordfish Business Park',
    'RegAddress.AddressLine2': 'Swordfish Close, Higgins Lane',
    'RegAddress.PostTown': 'BURSCOUGH',
    'RegAddress.PostCode': 'L40 8JW',
    CompanyStatus: 'Active',
    IncorporationDate: '01/01/2016',
    'SICCode.SicText_1': '93130 - Fitness facilities',
  };

  it('flags a premises-like registered address', () => {
    const rec = transformCompaniesHouseRow(row);
    expect(rec.premises_like).toBe(true);
    expect(rec.venue_type_hint).toBe('candidate');
  });

  it('does not flag a plain accountant/formation-agent office address', () => {
    const rec = transformCompaniesHouseRow({
      ...row,
      'RegAddress.AddressLine1': 'Town Centre House',
      'RegAddress.AddressLine2': 'Merrion Centre',
    });
    expect(rec.premises_like).toBe(false);
  });

  it('skips a non-Active company', () => {
    expect(transformCompaniesHouseRow({ ...row, CompanyStatus: 'Dissolved' })).toBeNull();
  });
});
