/**
 * What this suite pins (discovery blueprint sections 4, 5, 7, 8, 9;
 * SD-23, SD-24, SD-27, SD-28):
 *
 *  - the five doors exist, in order, and a door that cannot work yet says
 *    what would make it work rather than disappearing. SD-28: a door that
 *    hides itself when the network is small is a door nobody can be the
 *    first through, and the honest zero state is the whole density
 *    strategy;
 *  - a count of null is "not read yet", not zero. Rendering "· 0" before
 *    the read lands would tell somebody they are alone when nothing has
 *    been counted;
 *  - `community_find_people` is called with the mode, a cursor and a
 *    limit ONLY. There is no key parameter, deliberately: a client that
 *    could name a gym could list its members without listing itself
 *    (blueprint section 11);
 *  - every row carries its reasons, and the score is transport. SD-24:
 *    no surface turns a score into a percentage, so what the module hands
 *    a screen is the reasons array and an integer that only orders.
 */

jest.mock('../transport', () => {
  class CommunityError extends Error {
    constructor(code) { super(code); this.name = 'CommunityError'; this.code = code; }
  }
  return { callCommunity: jest.fn(async () => ({})), CommunityError };
});

const { callCommunity } = require('../transport');
const {
  FIND_MODES, FIND_MODE_ORDER, doorsFor, doorLine, doorZeroState,
  findPeople, gymSummary, gymSuggest,
  normaliseFilters, filterChips, removeFilterChip, peopleCountLine,
} = require('../findPeople');

const ME_FULL = {
  profile: { handle: 'jamie', gym_label: 'PureGym Leeds', area_label: 'Leeds' },
};

const ME_BARE = { profile: { handle: 'jamie' } };

beforeEach(() => {
  jest.clearAllMocks();
  callCommunity.mockResolvedValue({});
});

describe('the five doors', () => {
  test('they are the five the blueprint names, in the blueprint order', () => {
    expect(FIND_MODE_ORDER).toEqual([
      'gym', 'area', 'like_me', 'partners', 'might_know',
    ]);
    expect(doorsFor(ME_FULL).map((d) => d.mode)).toEqual(FIND_MODE_ORDER);
  });

  test('there is no programme door (communities revamp, 2026-09-10)', () => {
    expect(FIND_MODES.programme).toBeUndefined();
    expect(doorsFor(ME_FULL).some((d) => d.mode === 'programme')).toBe(false);
  });

  test('the labels read as the blueprint writes them', () => {
    expect(FIND_MODES.gym.label).toBe('At my gym');
    expect(FIND_MODES.area.label).toBe('Near me');
    expect(FIND_MODES.like_me.label).toBe('Train like me');
    expect(FIND_MODES.partners.label).toBe('Open to training together');
    expect(FIND_MODES.might_know.label).toBe('People you might know');
  });

  test('a profile with everything opens every door', () => {
    for (const door of doorsFor(ME_FULL)) {
      expect({ mode: door.mode, available: door.available })
        .toEqual({ mode: door.mode, available: true });
      expect(door.requirement).toBeNull();
    }
  });

  test('a profile with no gym still SHOWS the door, and says what it needs', () => {
    const gym = doorsFor(ME_BARE).find((d) => d.mode === 'gym');
    expect(gym.available).toBe(false);
    expect(gym.requirement).toBe('Add your gym to see who trains there');
    expect(doorLine(gym)).toBe('Add your gym to see who trains there');
  });

  test('the area door follows the same pattern', () => {
    const doors = doorsFor(ME_BARE);
    expect(doors.find((d) => d.mode === 'area').requirement)
      .toBe('Add your area to see who trains near you');
  });

  test('the three doors that need nothing are open the moment a profile exists', () => {
    const doors = doorsFor(ME_BARE);
    for (const mode of ['like_me', 'partners', 'might_know']) {
      expect({ mode, available: doors.find((d) => d.mode === mode).available })
        .toEqual({ mode, available: true });
    }
  });

  test('an available door carries the key its count is about', () => {
    const doors = doorsFor(ME_FULL);
    expect(doors.find((d) => d.mode === 'gym').key).toBe('PureGym Leeds');
    expect(doors.find((d) => d.mode === 'area').key).toBe('Leeds');
  });
});

describe('the count line is honest about what it knows', () => {
  const doors = doorsFor(ME_FULL);
  const door = (mode) => doors.find((d) => d.mode === mode);

  test('a gym with six others reads as the blueprint writes it', () => {
    expect(doorLine(door('gym'), 6)).toBe('Trains at PureGym Leeds · 6 others');
  });

  test('one other is not "1 others"', () => {
    expect(doorLine(door('gym'), 1)).toBe('Trains at PureGym Leeds · 1 other');
  });

  test('an area count reads as the blueprint writes it', () => {
    expect(doorLine(door('area'), 12)).toBe('Lifters in Leeds · 12');
  });

  test('a count of zero is stated, not hidden', () => {
    expect(doorLine(door('gym'), 0)).toBe('Trains at PureGym Leeds · 0 others');
  });

  test('a count not read yet shows the plain subtitle, never a zero', () => {
    expect(doorLine(door('gym'))).toBe(FIND_MODES.gym.subtitle);
    expect(doorLine(door('area'), null)).toBe(FIND_MODES.area.subtitle);
  });

  test('the partner door counts people, not places', () => {
    expect(doorLine(door('partners'), 3)).toBe('3 in your area');
  });
});

describe('the zero states never pretend', () => {
  test('the gym zero state is the blueprint sentence', () => {
    const gym = doorsFor(ME_FULL).find((d) => d.mode === 'gym');
    expect(doorZeroState(gym)).toBe(
      'No one else lists PureGym Leeds yet. You are the first here; anyone who adds it will see you.',
    );
  });

  test('a door that is not available says its requirement instead', () => {
    const gym = doorsFor(ME_BARE).find((d) => d.mode === 'gym');
    expect(doorZeroState(gym)).toBe('Add your gym to see who trains there');
  });

  test('every zero state offers the one thing that changes it', () => {
    for (const door of doorsFor(ME_FULL)) {
      expect({ mode: door.mode, empty: doorZeroState(door) === '' })
        .toEqual({ mode: door.mode, empty: false });
    }
  });
});

describe('the scored list', () => {
  test('the RPC takes the mode, a cursor and a limit, and no key', async () => {
    await findPeople('gym', { cursor: 'c0', limit: 20, key: 'PureGym Leeds' });
    expect(callCommunity).toHaveBeenCalledWith('community_find_people', {
      _mode: 'gym', _cursor: 'c0', _limit: 20,
    });
    const [, params] = callCommunity.mock.calls[0];
    expect('_key' in params).toBe(false);
  });

  test('every row keeps its reasons, and the score only orders', async () => {
    callCommunity.mockResolvedValue({
      people: [
        { card: { handle: 'jamie' }, reasons: ['Trains at PureGym Leeds', 'Similar experience'], score: 4 },
        { card: { handle: 'sam' }, reasons: ['Lists Leeds'], score: 2 },
      ],
      cursor: 'ts|uuid',
      count: 6,
    });
    const page = await findPeople('gym');
    expect(page.people[0].reasons).toEqual(['Trains at PureGym Leeds', 'Similar experience']);
    expect(page.people[0].score).toBe(4);
    expect(page.cursor).toBe('ts|uuid');
    expect(page.count).toBe(6);
  });

  test('a row with no reasons is an empty array, never undefined', async () => {
    callCommunity.mockResolvedValue({ people: [{ card: { handle: 'sam' } }] });
    const page = await findPeople('like_me');
    expect(page.people[0].reasons).toEqual([]);
    expect(page.people[0].score).toBe(0);
  });

  test('an unread count is null, not zero', async () => {
    callCommunity.mockResolvedValue({ people: [] });
    expect((await findPeople('like_me')).count).toBeNull();
  });

  test('an unknown mode is refused before the network', async () => {
    await expect(findPeople('nearby_now')).rejects.toMatchObject({ code: 'invalid_input' });
    expect(callCommunity).not.toHaveBeenCalled();
  });

  test('every mode the doors offer is a mode the list accepts', async () => {
    for (const mode of FIND_MODE_ORDER) {
      // eslint-disable-next-line no-await-in-loop
      await findPeople(mode);
    }
    expect(callCommunity.mock.calls.map(([, p]) => p._mode)).toEqual(FIND_MODE_ORDER);
  });
});

describe('combinable filters (spec 1.1 C / 1.3, migration 163)', () => {
  test('a filters object is sent as _filters, alongside the mode/cursor/limit', async () => {
    await findPeople('like_me', { filters: { scope: 'gym' } });
    expect(callCommunity).toHaveBeenCalledWith('community_find_people', {
      _mode: 'like_me', _cursor: null, _limit: 20, _filters: { scope: 'gym' },
    });
  });

  test('no filters given: _filters is not sent at all (the exact old call, every existing door)', async () => {
    await findPeople('like_me');
    const [, params] = callCommunity.mock.calls[0];
    expect('_filters' in params).toBe(false);
  });

  test('a fallback row (SD-28) is flagged, a scored row is not', async () => {
    callCommunity.mockResolvedValue({
      people: [
        { card: { handle: 'jamie' }, reasons: ['Trains at PureGym Leeds'], score: 3 },
        { card: { handle: 'sam' }, reasons: [], score: 0, fallback: true },
      ],
      count: 1,
      count_truncated: false,
    });
    const page = await findPeople('gym');
    expect(page.people[0].fallback).toBe(false);
    expect(page.people[1].fallback).toBe(true);
  });

  test('count_truncated carries through, and defaults false', async () => {
    callCommunity.mockResolvedValue({ people: [], count: 1000, count_truncated: true });
    expect((await findPeople('like_me')).count_truncated).toBe(true);

    callCommunity.mockResolvedValue({ people: [] });
    expect((await findPeople('like_me')).count_truncated).toBe(false);
  });
});

describe('normaliseFilters: only what is actually set, or null', () => {
  test('an empty or missing draft answers null, never {}', () => {
    expect(normaliseFilters(null)).toBeNull();
    expect(normaliseFilters({})).toBeNull();
    expect(normaliseFilters({ scope: null, days: [] })).toBeNull();
  });

  test('an unknown scope is dropped, not sent as invalid_input bait', () => {
    expect(normaliseFilters({ scope: 'nearby_now' })).toBeNull();
  });

  test('place_band_miles only survives with scope place, and only a real band', () => {
    expect(normaliseFilters({ scope: 'gym', place_band_miles: '5' })).toEqual({ scope: 'gym' });
    expect(normaliseFilters({ scope: 'place', place_band_miles: '7' })).toEqual({ scope: 'place' });
    expect(normaliseFilters({ scope: 'place', place_band_miles: '5' }))
      .toEqual({ scope: 'place', place_band_miles: '5' });
  });

  test('every other field: arrays only survive non-empty, scalars only survive truthy', () => {
    expect(normaliseFilters({
      partner_only: true, days: ['mon', 'wed'], time_bands: [], styles: ['strength'],
      goal: 'get_stronger', experience_band: '', age_band: '18_24',
    })).toEqual({
      partner_only: true, days: ['mon', 'wed'], styles: ['strength'], goal: 'get_stronger', age_band: '18_24',
    });
  });
});

describe('filterChips: the applied-filter row', () => {
  const labels = {
    days: { mon: 'Mon' },
    timeBands: { evening: 'Evenings' },
    styles: { strength: 'Strength' },
    goals: { get_stronger: 'Get stronger' },
    experience: { intermediate: 'Intermediate' },
    ageBand: { '18_24': '18 to 24' },
  };

  test('no filters: no chips', () => {
    expect(filterChips(null, labels)).toEqual([]);
  });

  test('scope gym reads "My gym"; scope place reads the band label; scope any reads "Anywhere"', () => {
    expect(filterChips({ scope: 'gym' }, labels)).toEqual([{ key: 'scope', label: 'My gym' }]);
    expect(filterChips({ scope: 'place', place_band_miles: '10' }, labels))
      .toEqual([{ key: 'scope', label: 'Within 10 miles' }]);
    expect(filterChips({ scope: 'place' }, labels)).toEqual([{ key: 'scope', label: 'Same place' }]);
    expect(filterChips({ scope: 'any' }, labels)).toEqual([{ key: 'scope', label: 'Anywhere' }]);
  });

  test('every other field becomes its own chip, in order, keyed for removal', () => {
    expect(filterChips({
      partner_only: true, days: ['mon'], time_bands: ['evening'], styles: ['strength'],
      goal: 'get_stronger', experience_band: 'intermediate', age_band: '18_24',
    }, labels)).toEqual([
      { key: 'partner_only', label: 'Open to training together' },
      { key: 'days:mon', label: 'Mon' },
      { key: 'time_bands:evening', label: 'Evenings' },
      { key: 'styles:strength', label: 'Strength' },
      { key: 'goal', label: 'Get stronger' },
      { key: 'experience_band', label: 'Intermediate' },
      { key: 'age_band', label: '18 to 24' },
    ]);
  });

  test('a value with no known label is silently skipped, never a raw key on screen', () => {
    expect(filterChips({ days: ['sun'] }, labels)).toEqual([]);
  });
});

describe('removeFilterChip: clears exactly one applied choice', () => {
  test('removing scope clears the band with it', () => {
    expect(removeFilterChip({ scope: 'place', place_band_miles: '10', partner_only: true }, 'scope'))
      .toEqual({ partner_only: true });
  });

  test('removing one day leaves the others', () => {
    expect(removeFilterChip({ days: ['mon', 'wed'] }, 'days:mon')).toEqual({ days: ['wed'] });
  });

  test('removing the last day clears the field entirely', () => {
    expect(removeFilterChip({ days: ['mon'] }, 'days:mon')).toBeNull();
  });

  test('clearing the only applied filter answers null, matching normaliseFilters', () => {
    expect(removeFilterChip({ partner_only: true }, 'partner_only')).toBeNull();
  });

  test('an unknown key is a no-op', () => {
    expect(removeFilterChip({ goal: 'get_stronger' }, 'nonsense')).toEqual({ goal: 'get_stronger' });
  });
});

describe('peopleCountLine: "N people" / "N+ people" (spec 1.3)', () => {
  test('an exact count', () => {
    expect(peopleCountLine(6, false)).toBe('6 people');
  });

  test('a truncated count reads N+', () => {
    expect(peopleCountLine(1000, true)).toBe('1000+ people');
  });

  test('a count not read yet (null) answers the empty string, never "null people"', () => {
    expect(peopleCountLine(null)).toBe('');
    expect(peopleCountLine(undefined)).toBe('');
  });
});

describe('the gym surfaces', () => {
  test('the gym summary counts and never says who is there now', async () => {
    callCommunity.mockResolvedValue({
      label: 'PureGym Leeds',
      count: 6,
      following_count: 2,
      open_to_partner_count: 1,
      by_style: [{ key: 'strength', count: 3 }],
      by_time_band: [{ band: 'evening', count: 6 }],
    });
    const summary = await gymSummary('puregym-leeds');
    expect(callCommunity).toHaveBeenCalledWith('community_gym_summary', { _key: 'puregym-leeds' });
    expect(summary.count).toBe(6);
    expect(summary.by_time_band).toEqual([{ band: 'evening', count: 6 }]);
    expect('last_active_at' in summary).toBe(false);
    expect('present_now' in summary).toBe(false);
  });

  test('a summary of the wrong shape leaves zeroes and arrays behind', async () => {
    callCommunity.mockResolvedValue(null);
    expect(await gymSummary('k')).toEqual({
      label: null, count: 0, following_count: 0, open_to_partner_count: 0,
      by_style: [], by_time_band: [],
    });
  });

  test('the gym typeahead asks for nothing until there is something to match', async () => {
    expect(await gymSuggest('leeds', '  ')).toEqual([]);
    expect(await gymSuggest(null, 'pure')).toEqual([]);
    expect(callCommunity).not.toHaveBeenCalled();
  });

  test('the typeahead answers labels already used in the same area', async () => {
    callCommunity.mockResolvedValue({ gyms: [{ label: 'PureGym Leeds', count: 6 }] });
    const out = await gymSuggest('leeds', 'pure');
    expect(callCommunity).toHaveBeenCalledWith('community_gym_suggest', {
      _area_key: 'leeds', _prefix: 'pure',
    });
    expect(out).toEqual([{ label: 'PureGym Leeds', count: 6 }]);
  });

  test('a bare string list still resolves to labels', async () => {
    callCommunity.mockResolvedValue(['PureGym Leeds', null]);
    expect(await gymSuggest('leeds', 'pure')).toEqual([{ label: 'PureGym Leeds', count: 0 }]);
  });

  test('an empty gym id is refused before the network', async () => {
    await expect(gymSummary('')).rejects.toMatchObject({ code: 'invalid_input' });
  });
});
