/**
 * rank.test.js (gym database blueprint `docs/gym-database-2026-09-06/
 * 20-BLUEPRINT.md`, "## Tests and records").
 *
 * Ranks a small fixture set against every human input the brief names:
 * "PureGym Motherwell", "Puregym", "Pure Gym", "Motherwell PureGym",
 * "the gym motherwell", "JD", "J D Gyms", "Motherwell gym", "gym near
 * ML1", "ML1 1AA", "Hamilton", "Glasgow", "Bannatyne Hamilton", "David
 * Lloyd Glasgow", and the misspellings "puregm" and "bannatynes" -
 * including a Volt Gym, Burscough independent (no brand) so a query never
 * accidentally surfaces it over a matching chain venue.
 */

import { rankVenues } from '../rank';

const PUREGYM_MOTHERWELL = {
  id: 'v1', display_name: 'PureGym Motherwell', name: 'PureGym Motherwell',
  brand: 'PureGym', town: 'Motherwell', outward: 'ML1', distance_m: null,
};
const THE_GYM_MOTHERWELL = {
  id: 'v2', display_name: 'The Gym Motherwell', name: 'The Gym Motherwell',
  brand: 'The Gym Group', town: 'Motherwell', outward: 'ML1', distance_m: null,
};
const JD_GYMS_MOTHERWELL = {
  id: 'v3', display_name: 'JD Gyms Motherwell', name: 'JD Gyms Motherwell',
  brand: 'JD Gyms', town: 'Motherwell', outward: 'ML1', distance_m: null,
};
const BANNATYNE_HAMILTON = {
  id: 'v4', display_name: 'Bannatyne Hamilton', name: 'Bannatyne Hamilton',
  brand: 'Bannatyne', town: 'Hamilton', outward: 'ML3', distance_m: null,
};
const DAVID_LLOYD_GLASGOW = {
  id: 'v5', display_name: 'David Lloyd Glasgow', name: 'David Lloyd Glasgow',
  brand: 'David Lloyd', town: 'Glasgow', outward: 'G2', distance_m: null,
};
const PUREGYM_GLASGOW_CITY = {
  id: 'v6', display_name: 'PureGym Glasgow City', name: 'PureGym Glasgow City',
  brand: 'PureGym', town: 'Glasgow', outward: 'G1', distance_m: null,
};
const VOLT_GYM_BURSCOUGH = {
  id: 'v7', display_name: 'Volt Gym', name: 'Volt Gym',
  brand: null, town: 'Burscough', outward: 'L40', distance_m: null,
};

const FIXTURES = [
  PUREGYM_MOTHERWELL, THE_GYM_MOTHERWELL, JD_GYMS_MOTHERWELL, BANNATYNE_HAMILTON,
  DAVID_LLOYD_GLASGOW, PUREGYM_GLASGOW_CITY, VOLT_GYM_BURSCOUGH,
];

function ids(rows) {
  return rows.map((r) => r.id);
}

describe('exact brand + town beats everything else', () => {
  test('"PureGym Motherwell" puts the exact venue first', () => {
    const out = rankVenues(FIXTURES, 'PureGym Motherwell');
    expect(out[0].id).toBe('v1');
  });

  test('"Motherwell PureGym" (reversed order) still puts it first', () => {
    const out = rankVenues(FIXTURES, 'Motherwell PureGym');
    expect(out[0].id).toBe('v1');
  });

  test('"Bannatyne Hamilton" puts the exact venue first', () => {
    const out = rankVenues(FIXTURES, 'Bannatyne Hamilton');
    expect(out[0].id).toBe('v4');
  });

  test('"David Lloyd Glasgow" puts the exact venue first', () => {
    const out = rankVenues(FIXTURES, 'David Lloyd Glasgow');
    expect(out[0].id).toBe('v5');
  });

  test('"the gym motherwell" puts The Gym Group\'s Motherwell venue first', () => {
    const out = rankVenues(FIXTURES, 'the gym motherwell');
    expect(out[0].id).toBe('v2');
  });
});

describe('a bare brand alias, punctuated every which way', () => {
  test.each(['Puregym', 'Pure Gym', 'puregym'])('"%s" puts both PureGym venues on top', (q) => {
    const out = rankVenues(FIXTURES, q);
    expect(ids(out.slice(0, 2)).sort()).toEqual(['v1', 'v6']);
  });

  test.each(['JD', 'J D Gyms'])('"%s" puts the one JD Gyms venue first', (q) => {
    const out = rankVenues(FIXTURES, q);
    expect(out[0].id).toBe('v3');
  });
});

describe('misspellings still find the brand', () => {
  test('"puregm" (missing a letter) still surfaces a PureGym venue first', () => {
    const out = rankVenues(FIXTURES, 'puregm');
    expect(['v1', 'v6']).toContain(out[0].id);
    expect(out[0].reasons.join(' ')).toMatch(/PureGym/);
  });

  test('"bannatynes" (an extra letter) still surfaces Bannatyne Hamilton first', () => {
    const out = rankVenues(FIXTURES, 'bannatynes');
    expect(out[0].id).toBe('v4');
  });
});

describe('a town name alone', () => {
  test('"Hamilton" puts the one Hamilton venue first', () => {
    const out = rankVenues(FIXTURES, 'Hamilton');
    expect(out[0].id).toBe('v4');
  });

  test('"Glasgow" puts both Glasgow venues ahead of everything else', () => {
    const out = rankVenues(FIXTURES, 'Glasgow');
    expect(ids(out.slice(0, 2)).sort()).toEqual(['v5', 'v6']);
  });

  test('"Motherwell gym" puts all three Motherwell venues ahead of everything else', () => {
    const out = rankVenues(FIXTURES, 'Motherwell gym');
    expect(ids(out.slice(0, 3)).sort()).toEqual(['v1', 'v2', 'v3']);
  });
});

describe('a postcode, full or embedded in a phrase', () => {
  test('"ML1 1AA" puts every ML1 venue ahead of everything else', () => {
    const out = rankVenues(FIXTURES, 'ML1 1AA');
    expect(ids(out.slice(0, 3)).sort()).toEqual(['v1', 'v2', 'v3']);
  });

  test('"gym near ML1" does the same', () => {
    const out = rankVenues(FIXTURES, 'gym near ML1');
    expect(ids(out.slice(0, 3)).sort()).toEqual(['v1', 'v2', 'v3']);
  });
});

describe('an independent gym is never buried by an unrelated chain match', () => {
  test('"Volt" finds the independent on its own name, not a brand', () => {
    const out = rankVenues(FIXTURES, 'Volt');
    expect(out[0].id).toBe('v7');
  });

  test('a query for a chain never ranks Volt Gym, Burscough above it', () => {
    const out = rankVenues(FIXTURES, 'PureGym Motherwell');
    const voltIndex = out.findIndex((v) => v.id === 'v7');
    expect(voltIndex).toBeGreaterThan(0);
  });
});

describe('reasons, never a score or a percentage', () => {
  test('every ranked venue keeps a reasons array, and no numeric score leaks out', () => {
    const out = rankVenues(FIXTURES, 'PureGym Motherwell');
    for (const row of out) {
      expect(Array.isArray(row.reasons)).toBe(true);
      expect(row).not.toHaveProperty('score');
      expect(row).not.toHaveProperty('percentage');
    }
    expect(out.find((r) => r.id === 'v1').reasons.length).toBeGreaterThan(0);
  });
});

describe('an empty candidate list or query never throws', () => {
  test('empty candidates', () => {
    expect(rankVenues([], 'PureGym')).toEqual([]);
  });

  test('empty query keeps every candidate, unranked by relevance', () => {
    const out = rankVenues(FIXTURES, '');
    expect(out).toHaveLength(FIXTURES.length);
  });

  test('non-array candidates does not throw', () => {
    expect(rankVenues(null, 'PureGym')).toEqual([]);
  });
});
