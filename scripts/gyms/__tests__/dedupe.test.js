// GD-06 scoring/threshold fixtures: same brand within 100m merges,
// different brands 20m apart stay distinct, and a leisure centre
// containing a branded gym is linked as parent/child (never merged).
// GD-19/GD-22 fixtures: the hard brand veto is distance-independent, a
// single shared token never earns name points alone, brand tokens are
// stripped only when both sides carry the same brand, and the town token
// never contributes to the name Jaccard.
const { scorePair, decide, reviewTier, MERGE_THRESHOLD, REVIEW_THRESHOLD } = require('../lib/dedupe');

function rec(overrides) {
  return {
    name: 'Gym',
    address_line: null,
    postcode: null,
    lat: null,
    lng: null,
    phone: null,
    website: null,
    brand: null,
    ...overrides,
  };
}

describe('scorePair / decide', () => {
  it('same brand within 100m merges', () => {
    const a = rec({
      name: 'PureGym Cardiff',
      brand: { key: 'puregym', name: 'PureGym' },
      lat: 51.481,
      lng: -3.179,
      postcode: 'CF10 1AA',
    });
    const b = rec({
      name: 'PureGym Cardiff Central',
      brand: { key: 'puregym', name: 'PureGym' },
      lat: 51.4815, // ~60m away
      lng: -3.1795,
      postcode: 'CF10 1AA',
    });
    const scored = scorePair(a, b);
    expect(scored.score).toBeGreaterThanOrEqual(MERGE_THRESHOLD);
    expect(decide(scored)).toBe('merge');
  });

  it('different brands 20m apart, different addresses, stay distinct', () => {
    const a = rec({
      name: 'PureGym Leeds',
      brand: { key: 'puregym', name: 'PureGym' },
      address_line: '10 Main Street',
      lat: 53.8, lng: -1.55,
    });
    const b = rec({
      name: 'The Gym Group Leeds',
      brand: { key: 'the-gym-group', name: 'The Gym Group' },
      address_line: '12 Main Street',
      lat: 53.80018, lng: -1.55, // ~20m away
    });
    const scored = scorePair(a, b);
    expect(scored.forceDistinct).toBe(true);
    expect(decide(scored)).toBe('distinct');
  });

  it('two unrelated independent gyms with nothing in common are distinct', () => {
    const a = rec({ name: 'Iron Temple Gym', postcode: 'M1 1AA', lat: 53.48, lng: -2.24 });
    const b = rec({ name: 'Zen Studio Fitness', postcode: 'EH1 1AA', lat: 55.95, lng: -3.19 });
    const scored = scorePair(a, b);
    expect(decide(scored)).toBe('distinct');
    expect(scored.score).toBeLessThan(REVIEW_THRESHOLD);
  });

  it('a leisure centre and a branded gym at an identical address are a parent/child case, not a merge', () => {
    // scorePair itself doesn't decide the parent/child rule (that lives in
    // dedupe.mjs, which special-cases sameAddress + different brands before
    // ever calling decide()) — this pins the sameAddress signal it relies on.
    const parent = rec({
      name: 'Ormskirk Leisure Centre',
      venue_type: 'leisure_centre',
      address_line: '1 Sports Way',
      postcode: 'L39 1AA',
    });
    const child = rec({
      name: 'Better Gym Ormskirk',
      brand: { key: 'better', name: 'Better' },
      venue_type: 'commercial_gym',
      address_line: '1 Sports Way',
      postcode: 'L39 1AA',
    });
    const scored = scorePair(parent, child);
    expect(scored.sameAddress).toBe(true);
  });

  it('same phone number contributes +2 even with different names', () => {
    const a = rec({ name: 'Volt Gym', phone: '01704 893666' });
    const b = rec({ name: 'VOLT GYM', phone: '+441704893666' });
    const scored = scorePair(a, b);
    expect(scored.reasons).toEqual(expect.arrayContaining([expect.stringContaining('same_phone')]));
  });

  it('same website host contributes +2', () => {
    const a = rec({ name: 'Volt Gym', website: 'http://www.voltgym.co.uk' });
    const b = rec({ name: 'VOLT GYM', website: 'https://voltgym.co.uk/find-us' });
    const scored = scorePair(a, b);
    expect(scored.reasons).toEqual(expect.arrayContaining([expect.stringContaining('same_website_host')]));
  });

  it('GD-19: different known brands never merge, even well beyond 30m (hard veto)', () => {
    const a = rec({
      name: 'PureGym Leeds',
      brand: { key: 'puregym', name: 'PureGym' },
      postcode: 'LS1 1AA',
      lat: 53.8, lng: -1.55,
    });
    const b = rec({
      name: 'The Gym Group Leeds',
      brand: { key: 'the-gym-group', name: 'The Gym Group' },
      postcode: 'LS1 1AA', // same postcode unit -> +2
      lat: 53.85, lng: -1.6, // several km away, well past the old 30m radius
    });
    const scored = scorePair(a, b);
    expect(scored.forceDistinct).toBe(true);
    expect(decide(scored)).toBe('distinct');
  });

  it('GD-22: a single shared token never earns name points alone ("Moorgate" vs "Third Space Moorgate")', () => {
    const a = rec({ name: 'Moorgate', postcode: 'EC2R 6DA', lat: 51.518, lng: -0.088 });
    const b = rec({
      name: 'Third Space Moorgate',
      brand: { key: 'third-space', name: 'Third Space' },
      postcode: 'EC2R 6DA',
      lat: 51.5181, lng: -0.0881,
    });
    const scored = scorePair(a, b);
    expect(scored.reasons.some((r) => r.startsWith('name_jaccard'))).toBe(false);
    // Still nowhere near merge on postcode + distance alone.
    expect(decide(scored)).not.toBe('merge');
  });

  it('GD-22: brand tokens are stripped only when both sides share the same brand', () => {
    const a = rec({ name: 'PureGym', brand: { key: 'puregym', name: 'PureGym' }, postcode: 'ML1 1AA' });
    const b = rec({ name: 'Motherwell Gym', brand: null, postcode: 'ML1 1AA' });
    // "PureGym" is NOT stripped from `a` here (b carries no brand at all),
    // so the two token sets ({puregym} vs {motherwell, gym}) share nothing.
    const scored = scorePair(a, b);
    expect(scored.reasons.some((r) => r.startsWith('name_jaccard'))).toBe(false);
  });

  it('GD-22: the town token never contributes to the name Jaccard', () => {
    const a = rec({ name: 'Iron Temple Gym Motherwell', town: 'Motherwell', postcode: 'ML1 1AA' });
    const b = rec({ name: 'Zen Studio Motherwell', town: 'Motherwell', postcode: 'ML2 2BB' });
    const scored = scorePair(a, b);
    // Sharing only the town word ("Motherwell") must not read as a name match.
    expect(scored.reasons.some((r) => r.startsWith('name_jaccard'))).toBe(false);
  });
});

describe('reviewTier (GD-23)', () => {
  it('a name/phone/website signal is the moderator ("likely") queue', () => {
    expect(reviewTier(['name_jaccard_mid(0.70):+1', 'same_postcode_unit:+2'])).toBe('likely');
    expect(reviewTier(['same_phone:+2'])).toBe('likely');
    expect(reviewTier(['same_website_host:+2'])).toBe('likely');
  });

  it('proximity-only signals (postcode/street/distance) go to the "weak" queue', () => {
    expect(reviewTier(['same_postcode_unit:+2', 'within_100m(40m):+2'])).toBe('weak');
    expect(reviewTier(['same_street_number_and_name:+2'])).toBe('weak');
  });
});
