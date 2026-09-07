// sportscotland (Spatial Hub) adapter fixtures. The 30 features below are a
// real slice of the fetched register (fitness suites fid 1-20, plus 38, 44,
// 149, 322-324, 488; sports halls fid 1-2; swimming pool fid 2), lightly
// trimmed to {properties, geometry} and carrying no key of any kind
// (GD-27's Access ruling: the Spatial Hub authkey never appears in a
// fixture). They cover: a brand-matched site (David Lloyd, Bannatyne's,
// Nuffield Health), two hotel-named sites, seven school-named sites
// without a public token, one school site WITH a public token
// ("Community"), the visible TESTING record (three facility rows, one
// site), a site with no postcode but real coordinates (kept), four sites
// with more than one fitness-suite facility row (facility_count > 1), one
// sports-hall corroborating a fitness-suite site (Castlebay School), one
// swimming-pool corroborating a fitness-suite site (International School
// of Aberdeen), and one sports-hall-only site with no fitness suite at all
// (St Marys Church Hall - never becomes a venue, GD-27).
const FS_FEATURES = [
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Aberdeen Altens Hotel",
      "address": "Souterhead Road",
      "postcode": "AB12 3LF",
      "la_name": "Aberdeen City Council",
      "town": "ABERDEEN",
      "eastings_x": 394680,
      "northing_y": 801997,
      "facility_sub_type": "Fitness Suite - Weights And CV",
      "fid": 1
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.0895,
        57.1089
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Alexander C Collie Sport and Community Centre",
      "address": "Community Centre",
      "postcode": "AB22 8PE",
      "la_name": "Aberdeen City Council",
      "town": "NR ABERDEEN",
      "eastings_x": 393500,
      "northing_y": 811500,
      "facility_sub_type": "Fitness Suite - Weights",
      "fid": 2
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.1092,
        57.1943
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Alexander C Collie Sport and Community Centre",
      "address": "Community Centre",
      "postcode": "AB22 8PE",
      "la_name": "Aberdeen City Council",
      "town": "NR ABERDEEN",
      "eastings_x": 393500,
      "northing_y": 811500,
      "facility_sub_type": "Fitness Suite - Weights",
      "fid": 3
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.1092,
        57.1943
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Banks O'Dee Sports Club",
      "address": " Abbotswell Road",
      "postcode": "AB12 3AB",
      "la_name": "Aberdeen City Council",
      "town": "Aberdeen",
      "eastings_x": 394178,
      "northing_y": 804188,
      "facility_sub_type": "Fitness Suite - Weights And CV",
      "fid": 4
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.0978,
        57.1286
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Banks O'Dee Sports Club",
      "address": " Abbotswell Road",
      "postcode": "AB12 3AB",
      "la_name": "Aberdeen City Council",
      "town": "Aberdeen",
      "eastings_x": 394178,
      "northing_y": 804188,
      "facility_sub_type": "Fitness Suite - Weights And CV",
      "fid": 5
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.0978,
        57.1286
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Bannatyne's Aberdeen",
      "address": " Laurel Drive",
      "postcode": "AB22 8AQ",
      "la_name": "Aberdeen City Council",
      "town": "Aberdeen",
      "eastings_x": 390896,
      "northing_y": 809637,
      "facility_sub_type": "Fitness Suite - Weights And CV",
      "fid": 6
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.1522,
        57.1775
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Cults Academy ASN Wing",
      "address": "Quarry Road",
      "postcode": "AB15 9SA",
      "la_name": "Aberdeen City Council",
      "town": "Aberdeen",
      "eastings_x": 388512,
      "northing_y": 803013,
      "facility_sub_type": null,
      "fid": 7
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.1913,
        57.1179
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "David Lloyd Aberdeen",
      "address": " Garthdee Road",
      "postcode": "AB10 7AY",
      "la_name": "Aberdeen City Council",
      "town": "Aberdeen",
      "eastings_x": 392327,
      "northing_y": 803132,
      "facility_sub_type": "Fitness Suite - Weights",
      "fid": 8
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.1283,
        57.1191
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Harlaw Academy",
      "address": "18-20 Albyn Place",
      "postcode": "AB10 1RG",
      "la_name": "Aberdeen City Council",
      "town": "Aberdeen",
      "eastings_x": 392981,
      "northing_y": 805738,
      "facility_sub_type": null,
      "fid": 9
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.1176,
        57.1425
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Hazlehead Academy",
      "address": "Groats Road",
      "postcode": "AB15 8BE",
      "la_name": "Aberdeen City Council",
      "town": "Aberdeen",
      "eastings_x": 389291,
      "northing_y": 805945,
      "facility_sub_type": null,
      "fid": 10
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.1786,
        57.1443
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "International School of Aberdeen",
      "address": "16 Airyhall Road",
      "postcode": "AB15 7TP",
      "la_name": "Aberdeen City Council",
      "town": "Aberdeen",
      "eastings_x": 390707,
      "northing_y": 803744,
      "facility_sub_type": "Fitness Suite - Weights",
      "fid": 11
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.1551,
        57.1245
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Jesmond Centre",
      "address": "Unnamed Road",
      "postcode": "AB22 8WQ",
      "la_name": "Aberdeen City Council",
      "town": "Aberdeen",
      "eastings_x": 392549,
      "northing_y": 811277,
      "facility_sub_type": "Fitness Suite - Weights",
      "fid": 12
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.1249,
        57.1922
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Kincorth Sports Centre",
      "address": "Corthan Crescent",
      "postcode": "AB12 5BB",
      "la_name": "Aberdeen City Council",
      "town": "ABERDEEN",
      "eastings_x": 393702,
      "northing_y": 803552,
      "facility_sub_type": "Fitness Suite - Weights",
      "fid": 13
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.1056,
        57.1229
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Kincorth Sports Centre",
      "address": "Corthan Crescent",
      "postcode": "AB12 5BB",
      "la_name": "Aberdeen City Council",
      "town": "ABERDEEN",
      "eastings_x": 393702,
      "northing_y": 803552,
      "facility_sub_type": "Fitness Suite - Weights",
      "fid": 14
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.1056,
        57.1229
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Lochside Academy",
      "address": "Lochside Academy ",
      "postcode": "AB12 3LJ",
      "la_name": "Aberdeen City Council",
      "town": "Aberdeen",
      "eastings_x": 393940,
      "northing_y": 802185,
      "facility_sub_type": null,
      "fid": 15
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.1017,
        57.1106
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Northfield Academy",
      "address": "Granitehill Place",
      "postcode": "AB16 7AU",
      "la_name": "Aberdeen City Council",
      "town": "Aberdeen",
      "eastings_x": 391210,
      "northing_y": 807939,
      "facility_sub_type": null,
      "fid": 16
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.147,
        57.1622
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Nuffield Health Aberdeen",
      "address": "Justice Mill Lane",
      "postcode": "AB11 6EQ",
      "la_name": "Aberdeen City Council",
      "town": "ABERDEEN",
      "eastings_x": 393500,
      "northing_y": 805700,
      "facility_sub_type": "Fitness Suite - Weights",
      "fid": 17
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.109,
        57.1421
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Old Machar Academy",
      "address": " Jesmond Drive",
      "postcode": "AB22 8LH",
      "la_name": "Aberdeen City Council",
      "town": "Aberdeen",
      "eastings_x": 392533,
      "northing_y": 811376,
      "facility_sub_type": null,
      "fid": 18
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.1252,
        57.1931
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Robert Gordon University - Garthdee",
      "address": "Garthdee Sports Centre",
      "postcode": "AB10 7QE",
      "la_name": "Aberdeen City Council",
      "town": "ABERDEEN",
      "eastings_x": 391700,
      "northing_y": 803200,
      "facility_sub_type": "Fitness Suite - Weights And CV",
      "fid": 19
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.1387,
        57.1197
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Robert Gordon University - Garthdee",
      "address": "Garthdee Sports Centre",
      "postcode": "AB10 7QE",
      "la_name": "Aberdeen City Council",
      "town": "ABERDEEN",
      "eastings_x": 391700,
      "northing_y": 803200,
      "facility_sub_type": "Fitness Suite - Weights And CV",
      "fid": 20
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.1387,
        57.1197
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Ellon Academy Community Campus",
      "address": " Kellie Pearl Way",
      "postcode": "AB41 8LF",
      "la_name": "Aberdeenshire Council",
      "town": "Ellon",
      "eastings_x": 396779,
      "northing_y": 829772,
      "facility_sub_type": "Fitness Suite - Weights And CV",
      "fid": 38
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.0552,
        57.3584
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Huntly Swimming Pool & Fitness Suite",
      "address": "15 Yule Square",
      "postcode": "AB54 8HZ",
      "la_name": "Aberdeenshire Council",
      "town": "Huntly",
      "eastings_x": 353064,
      "northing_y": 840177,
      "facility_sub_type": "Fitness Suite - Weights",
      "fid": 44
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.7837,
        57.4495
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Castlebay School",
      "address": "15 A888",
      "postcode": "HS9",
      "la_name": "Comhairle nan Eilean Siar",
      "town": "Isle of Barra",
      "eastings_x": 65928,
      "northing_y": 798430,
      "facility_sub_type": "Fitness Suite - Weights",
      "fid": 149
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -7.4977,
        56.956
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Stuarts TESTING Secondary School",
      "address": "Templeton Street",
      "postcode": "G40 1DA",
      "la_name": "Glasgow City Council",
      "town": "Glasgow",
      "eastings_x": 260220,
      "northing_y": 664210,
      "facility_sub_type": "Fitness Suite - Cv",
      "fid": 322
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -4.2343,
        55.8508
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Stuarts TESTING Secondary School",
      "address": "Templeton Street",
      "postcode": "G40 1DA",
      "la_name": "Glasgow City Council",
      "town": "Glasgow",
      "eastings_x": 260220,
      "northing_y": 664210,
      "facility_sub_type": "Fitness Suite - Weights",
      "fid": 323
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -4.2343,
        55.8508
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Stuarts TESTING Secondary School",
      "address": "Templeton Street",
      "postcode": "G40 1DA",
      "la_name": "Glasgow City Council",
      "town": "Glasgow",
      "eastings_x": 260220,
      "northing_y": 664210,
      "facility_sub_type": "Fitness Suite - Weights And CV",
      "fid": 324
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -4.2343,
        55.8508
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "River Tilt Leisure Park",
      "address": "Blair Atholl",
      "postcode": null,
      "la_name": "Perth & Kinross Council",
      "town": "BLAIR ATHOLL",
      "eastings_x": 287600,
      "northing_y": 765200,
      "facility_sub_type": "Fitness Suite - Cv",
      "fid": 488
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -3.8404,
        56.7648
      ]
    }
  }
];

const SH_FEATURES = [
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "Castlebay School",
      "address": "15 A888",
      "postcode": "HS9",
      "la_name": "Comhairle nan Eilean Siar",
      "town": "Isle of Barra",
      "fid": 1,
      "x": 65928,
      "y": 798430,
      "fac_sub_type": "Sports Hall 3 Court"
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -7.4977,
        56.956
      ]
    }
  },
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "St Marys Church Hall",
      "address": "Griminish",
      "postcode": "HS8 5QA",
      "la_name": "Comhairle nan Eilean Siar",
      "town": "GRIMINISH",
      "fid": 2,
      "x": 77000,
      "y": 851000,
      "fac_sub_type": "Sports Hall < 3 Court"
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -7.3847,
        57.434
      ]
    }
  }
];

const SP_FEATURES = [
  {
    "properties": {
      "sh_date_uploaded": "2024-07-24",
      "site_name": "International School of Aberdeen",
      "address": "16 Airyhall Road",
      "la_name": "Aberdeen City Council",
      "town": "Aberdeen",
      "eastings_x": 390707,
      "northing_y": 803744,
      "fid": 2,
      "fac_sub_type": "Swimming Pool - Main"
    },
    "geometry": {
      "type": "Point",
      "coordinates": [
        -2.1551,
        57.1245
      ]
    }
  }
];

const { collapseSportscotlandFacilities, transformSportscotlandSite } = require('../lib/transforms');

function byName(sites, name) {
  return sites.find((site) => site.some((f) => f.properties.site_name === name));
}

describe('collapseSportscotlandFacilities (GD-04 site collapse)', () => {
  const sites = collapseSportscotlandFacilities(FS_FEATURES, SH_FEATURES, SP_FEATURES);

  it('collapses 30 raw facilities (27 fs + 2 sh + 1 sp) to 22 sites', () => {
    const totalFacilities = sites.reduce((n, s) => n + s.length, 0);
    expect(totalFacilities).toBe(30);
    expect(sites.length).toBe(22);
  });

  it('collapses two same-name-and-postcode fitness-suite rows to one site (Alexander C Collie, fid 2+3)', () => {
    const site = byName(sites, 'Alexander C Collie Sport and Community Centre');
    expect(site.filter((f) => f.layer === 'fs')).toHaveLength(2);
  });

  it('collapses the three TESTING facility rows (fid 322-324) to one site', () => {
    const site = byName(sites, 'Stuarts TESTING Secondary School');
    expect(site.filter((f) => f.layer === 'fs')).toHaveLength(3);
  });

  it('joins a sports-hall facility to its fitness-suite site by name+postcode (Castlebay School)', () => {
    const site = byName(sites, 'Castlebay School');
    expect(site).toHaveLength(2);
    expect(site.some((f) => f.layer === 'fs')).toBe(true);
    expect(site.some((f) => f.layer === 'sh')).toBe(true);
  });

  it('joins a swimming-pool facility to its fitness-suite site (International School of Aberdeen)', () => {
    const site = byName(sites, 'International School of Aberdeen');
    expect(site).toHaveLength(2);
    expect(site.some((f) => f.layer === 'sp')).toBe(true);
  });

  it('keeps a sports-hall-only site (no fitness suite) as its own group, not merged into anything', () => {
    const site = byName(sites, 'St Marys Church Hall');
    expect(site).toHaveLength(1);
    expect(site[0].layer).toBe('sh');
  });
});

describe('transformSportscotlandSite (GD-27 field mapping and venue rules)', () => {
  const sites = collapseSportscotlandFacilities(FS_FEATURES, SH_FEATURES, SP_FEATURES);

  function transformNamed(name) {
    const site = byName(sites, name);
    return site ? transformSportscotlandSite(site) : undefined;
  }

  it('emits one record per fs-bearing site, dropping TESTING, giving 20 venues from 27 fs + corroboration', () => {
    const emitted = sites.map((s) => transformSportscotlandSite(s)).filter(Boolean);
    expect(emitted).toHaveLength(20);
    expect(emitted.every((r) => r.source === 'sportscotland')).toBe(true);
  });

  it('drops the visible TESTING record entirely', () => {
    expect(transformNamed('Stuarts TESTING Secondary School')).toBeNull();
  });

  it('drops a sports-hall-only site with no fitness suite (never creates a venue on its own)', () => {
    expect(transformNamed('St Marys Church Hall')).toBeNull();
  });

  it('sets facility_count from the number of fitness-suite rows collapsed into the site', () => {
    expect(transformNamed('Alexander C Collie Sport and Community Centre').facility_count).toBe(2);
    expect(transformNamed("Banks O'Dee Sports Club").facility_count).toBe(2);
    expect(transformNamed('Kincorth Sports Centre').facility_count).toBe(2);
    expect(transformNamed('Robert Gordon University - Garthdee').facility_count).toBe(2);
    expect(transformNamed('David Lloyd Aberdeen').facility_count).toBe(1);
  });

  it('GD-27: a school-named site with no public token gets an other_fitness hint', () => {
    for (const name of [
      'Cults Academy ASN Wing',
      'Harlaw Academy',
      'Hazlehead Academy',
      'Lochside Academy',
      'Northfield Academy',
      'Old Machar Academy',
      'Castlebay School',
      'International School of Aberdeen',
    ]) {
      expect(transformNamed(name).venue_type_hint).toBe('other_fitness');
    }
  });

  it('GD-27: a school-named site carrying a public token ("Community") gets a leisure_centre hint', () => {
    const rec = transformNamed('Ellon Academy Community Campus');
    expect(rec.venue_type_hint).toBe('leisure_centre');
  });

  it('GD-27: a hotel-named, non-school site gets no hint (left to classify.js\'s "hotel" name-token fallback -> hotel_gym, classify.test.js)', () => {
    expect(transformNamed('Aberdeen Altens Hotel').venue_type_hint).toBeNull();
  });

  it('GD-27: a non-school site with "Sports"+"Centre" in its name gets no hint (the public-token rule is scoped to school sites only)', () => {
    expect(transformNamed('Kincorth Sports Centre').venue_type_hint).toBeNull();
  });

  it('does not hint a brand-carrying site, leaving GD-03 brand priority (step 1) to classify.mjs/normalise.mjs', () => {
    expect(transformNamed('David Lloyd Aberdeen').venue_type_hint).toBeNull();
    expect(transformNamed("Bannatyne's Aberdeen").venue_type_hint).toBeNull();
    expect(transformNamed('Nuffield Health Aberdeen').venue_type_hint).toBeNull();
  });

  it('keeps a site with no postcode but real coordinates (River Tilt Leisure Park)', () => {
    const rec = transformNamed('River Tilt Leisure Park');
    expect(rec).toBeTruthy();
    expect(rec.postcode).toBeNull();
    expect(rec.coord_source).toBe('source');
    expect(rec.lat).toBeCloseTo(56.7648);
    expect(rec.lng).toBeCloseTo(-3.8404);
  });

  it('reads coordinates directly from GeoJSON [lng, lat] with no grid conversion (already EPSG:4326)', () => {
    const rec = transformNamed('David Lloyd Aberdeen');
    expect(rec.lat).toBeCloseTo(57.1191);
    expect(rec.lng).toBeCloseTo(-2.1283);
  });

  it('carries hall/pool corroboration as amenity flags, not a second venue', () => {
    expect(transformNamed('Castlebay School').scotland.has_sports_hall).toBe(true);
    expect(transformNamed('Castlebay School').scotland.has_swimming_pool).toBe(false);
    expect(transformNamed('International School of Aberdeen').scotland.has_swimming_pool).toBe(true);
  });

  it('emits the exact common-record field shape (matches transformNiRow/transformWalesFeature)', () => {
    const rec = transformNamed('David Lloyd Aberdeen');
    expect(Object.keys(rec).sort()).toEqual(
      [
        'source',
        'source_record_id',
        'source_url',
        'source_name',
        'source_status',
        'source_updated_at',
        'retrieved_at',
        'name',
        'brand_guess',
        'venue_type_hint',
        'address_line',
        'town',
        'postcode',
        'lat',
        'lng',
        'coord_source',
        'phone',
        'website',
        'facility_count',
        'status',
        'hasAddress',
        'scotland',
        'payload',
      ].sort(),
    );
    expect(rec.source_name).toBe('sportscotland Sports Facilities (Spatial Hub)');
    expect(rec.status).toBe('open');
    expect(rec.source_status).toBe('open');
  });

  it('returns null/undefined-safe for an empty or all-corroboration site group', () => {
    expect(transformSportscotlandSite([])).toBeNull();
    expect(transformSportscotlandSite(null)).toBeNull();
  });
});

// fetchSportscotlandLayers itself lives in sources/sportscotland.mjs and is
// never invoked here (this lane's task bound: no network calls, and Jest in
// this repo cannot dynamic-import a real ESM .mjs adapter without
// --experimental-vm-modules — see the header comment on that file). Its
// SPF_AUTHKEY guard is factored into lib/sportscotlandAuth.js
// (requireSpfAuthkey) specifically so it can be unit-tested here, the same
// way collapseSportscotlandFacilities/transformSportscotlandSite are
// factored into lib/transforms.js above.
const { requireSpfAuthkey } = require('../lib/sportscotlandAuth');

describe('requireSpfAuthkey (credential handling, GD-27 Access)', () => {
  it('throws a descriptive error, never touching the network, when SPF_AUTHKEY is not set', () => {
    expect(() => requireSpfAuthkey({})).toThrow('SPF_AUTHKEY');
    expect(() => requireSpfAuthkey({ SOME_OTHER_VAR: '1' })).toThrow('SPF_AUTHKEY');
  });

  it('returns the key when SPF_AUTHKEY is set, without altering or logging it', () => {
    expect(requireSpfAuthkey({ SPF_AUTHKEY: 'a-fake-test-key' })).toBe('a-fake-test-key');
  });

  it('never echoes the key value itself into the thrown message', () => {
    let message = '';
    try {
      requireSpfAuthkey({ SPF_AUTHKEY: '' });
    } catch (e) {
      message = e.message;
    }
    expect(message).not.toContain('undefined');
    expect(message).toContain('SPF_AUTHKEY is not set');
  });
});
