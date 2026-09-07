/**
 * index.test.js (gym database blueprint `docs/gym-database-2026-09-06/
 * 20-BLUEPRINT.md`; migrate_162_gym_directory.sql; community product
 * audit 2026-09-07, `30-IMPLEMENTATION.md` sections 1.1 A, 1.2).
 *
 * The small pure helpers `venueLine`, `distanceLabel` and `isPendingVenue`
 * over the migration's own contract: `verification_status` starts
 * `user_submitted_pending` while a submission awaits its second
 * confirmation, and moves to `user_submitted_verified` (no longer
 * pending) the moment it gets one. A badge that stayed lit for a
 * VERIFIED venue would tell a person to double-check something the
 * directory already settled.
 *
 * `distanceLabel` is one decimal ALWAYS now (30-IMPLEMENTATION.md 1.2:
 * "distance only when known, one decimal, miles"), not the old
 * whole-mile-at-10+ shape.
 */

jest.mock('../transport', () => ({
  ...jest.requireActual('../transport'),
  callGyms: jest.fn(),
}));

import {
  venueLine, distanceLabel, isPendingVenue, milesToMetres, METRES_PER_MILE,
  search, near, placeCentroid, get,
} from '../index';
import { callGyms } from '../transport';

describe('distanceLabel', () => {
  test('one decimal, always, whatever the distance', () => {
    expect(distanceLabel(1609.344)).toBe('1.0 miles');
    expect(distanceLabel(1200)).toBe('0.7 miles');
    expect(distanceLabel(16093.44)).toBe('10.0 miles');
    expect(distanceLabel(40233.6)).toBe('25.0 miles');
  });

  test('null when there is nothing to show', () => {
    expect(distanceLabel(null)).toBeNull();
    expect(distanceLabel(undefined)).toBeNull();
    expect(distanceLabel('not a number')).toBeNull();
  });
});

describe('milesToMetres', () => {
  test('converts miles to whole metres', () => {
    expect(milesToMetres(5)).toBe(Math.round(5 * METRES_PER_MILE));
    expect(milesToMetres(50)).toBe(80467); // 50 miles, to the metre (the server's own clamp is 80,468 m)
  });
});

describe('venueLine', () => {
  test('the secondary line omits distance when it is null', () => {
    const out = venueLine({ display_name: 'Volt Gym', town: 'Burscough', outward: 'L40', distance_m: null });
    expect(out).toEqual({ primary: 'Volt Gym', secondary: 'Burscough · L40' });
  });

  test('the secondary line carries distance when it is known', () => {
    const out = venueLine({ display_name: 'PureGym Motherwell', town: 'Motherwell', outward: 'ML1', distance_m: 1200 });
    expect(out.secondary).toBe('Motherwell · ML1 · 0.7 miles');
  });

  test('falls back to name and an empty secondary when nothing else is known', () => {
    expect(venueLine({ name: 'Volt Gym' })).toEqual({ primary: 'Volt Gym', secondary: '' });
    expect(venueLine(null)).toEqual({ primary: '', secondary: '' });
  });

  // Founder brief (gym finder): "brand only when not redundant with the
  // name", and brand is the LAST part of the secondary line.
  test('brand is omitted when the display name already names it', () => {
    const out = venueLine({
      display_name: 'PureGym Motherwell', brand: 'PureGym', town: 'Motherwell', outward: 'ML1', distance_m: 1200,
    });
    expect(out.secondary).toBe('Motherwell · ML1 · 0.7 miles');
  });

  test('brand appears, last, when the display name does not carry it', () => {
    const out = venueLine({
      display_name: 'The Warehouse Gym', brand: 'Anytime Fitness', town: 'Leeds', outward: 'LS1', distance_m: null,
    });
    expect(out.secondary).toBe('Leeds · LS1 · Anytime Fitness');
  });

  test('brand redundancy check is case- and punctuation-insensitive', () => {
    const out = venueLine({ display_name: "Pure Gym - Motherwell", brand: 'PureGym', town: 'Motherwell' });
    expect(out.secondary).toBe('Motherwell');
  });
});

describe('isPendingVenue (migrate_162: verification_status)', () => {
  test('user_submitted_pending is pending', () => {
    expect(isPendingVenue({ verification_status: 'user_submitted_pending' })).toBe(true);
  });

  test('user_submitted_verified (a second confirmation landed) is NOT pending', () => {
    expect(isPendingVenue({ verification_status: 'user_submitted_verified' })).toBe(false);
  });

  test('a source-verified venue is not pending', () => {
    expect(isPendingVenue({ verification_status: 'source_verified' })).toBe(false);
    expect(isPendingVenue({ verification_status: 'verified' })).toBe(false);
  });

  test('no status at all is not pending', () => {
    expect(isPendingVenue({})).toBe(false);
    expect(isPendingVenue(null)).toBe(false);
  });
});

// ─── 30-IMPLEMENTATION.md 1.1 A / 1.2: search's centroid, near's
// truncated, placeCentroid, and the operator_unconfirmed passthrough. ──
describe('search, near and placeCentroid (30-IMPLEMENTATION.md 1.1 A)', () => {
  beforeEach(() => { callGyms.mockReset(); });

  test('search passes _radius_m through and normalises the response centroid', async () => {
    callGyms.mockResolvedValue({
      venues: [{ id: 'v1', display_name: 'PureGym Motherwell', operator_unconfirmed: true }],
      recognised_postcode: 'ML1 1AA',
      centroid: { kind: 'postcode', label: 'ML1 1AA', lat: 55.79, lng: -3.99 },
    });
    const out = await search('ML1 1AA', { radiusM: 16093 });
    expect(callGyms).toHaveBeenCalledWith('gyms_search', expect.objectContaining({
      _q: 'ML1 1AA', _radius_m: 16093,
    }));
    expect(out.centroid).toEqual({ kind: 'postcode', label: 'ML1 1AA', lat: 55.79, lng: -3.99 });
    // The operator_unconfirmed flag survives normalisation, for rank.js's penalty.
    expect(out.venues[0].operator_unconfirmed).toBe(true);
  });

  test('search with no centroid in the response normalises to null', async () => {
    callGyms.mockResolvedValue({ venues: [], recognised_postcode: null });
    const out = await search('Nonexistent');
    expect(out.centroid).toBeNull();
  });

  test('near reports truncated from the server, and also when the cap is hit', async () => {
    callGyms.mockResolvedValueOnce({ venues: [{ id: 'v1' }], truncated: true });
    const a = await near(55.79, -3.99, { radiusM: 8047, limit: 40 });
    expect(a.truncated).toBe(true);

    const forty = Array.from({ length: 40 }, (_, i) => ({ id: `v${i}` }));
    callGyms.mockResolvedValueOnce({ venues: forty, truncated: false });
    const b = await near(55.79, -3.99, { radiusM: 80467, limit: 40 });
    expect(b.truncated).toBe(true); // hit the candidate limit even though the server said false
    expect(b.venues).toHaveLength(40);
  });

  test('near is never truncated under the cap with the server saying so', async () => {
    callGyms.mockResolvedValueOnce({ venues: [{ id: 'v1' }], truncated: false });
    const out = await near(55.79, -3.99, {});
    expect(out.truncated).toBe(false);
  });

  test('placeCentroid resolves a town or postcode centroid', async () => {
    callGyms.mockResolvedValue({ kind: 'town', label: 'Motherwell', lat: 55.79, lng: -3.99 });
    const out = await placeCentroid('Motherwell');
    expect(callGyms).toHaveBeenCalledWith('gyms_place_centroid', { _q: 'Motherwell' });
    expect(out).toEqual({ kind: 'town', label: 'Motherwell', lat: 55.79, lng: -3.99 });
  });

  test('placeCentroid never calls the network for an empty query', async () => {
    const out = await placeCentroid('   ');
    expect(callGyms).not.toHaveBeenCalled();
    expect(out).toEqual({ kind: 'none', label: null, lat: null, lng: null });
  });

  // GymDetailSheet reads address_line and website off get()'s result
  // (30-IMPLEMENTATION.md's gyms_get already returns both; normaliseVenue
  // must carry them through, not drop them).
  test('get() normalises address_line and website through', async () => {
    callGyms.mockResolvedValue({
      id: 'v1', display_name: 'PureGym Motherwell', town: 'Motherwell', outward: 'ML1',
      postcode: 'ML1 1AA', address_line: '1 Windmillhill Street', website: 'https://www.puregym.com',
      verification_status: 'verified', source_names: ['PureGym'],
    });
    const out = await get('v1');
    expect(out.address_line).toBe('1 Windmillhill Street');
    expect(out.website).toBe('https://www.puregym.com');
    expect(out.postcode).toBe('ML1 1AA');
    expect(out.source_names).toEqual(['PureGym']);
  });
});
