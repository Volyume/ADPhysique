/**
 * What this suite pins (D221 ruling 4, Stage 3 spec 3a; server migrate_191
 * Part 2): the two presence wrappers send exactly the declared parameter
 * (`_on`) to the exact RPC names, refuse a non-boolean before the network,
 * and surface the server's `forbidden` for a minor untouched;
 * `normaliseTrainingNow` turns the server's withheld (null) and any
 * malformed value into null so the strip hides, caps names at three, and
 * never invents a count.
 */

jest.mock('../transport', () => {
  class CommunityError extends Error {
    constructor(code) { super(code); this.name = 'CommunityError'; this.code = code; }
  }
  return { callCommunity: jest.fn(async () => ({})), CommunityError };
});

const { callCommunity } = require('../transport');

beforeEach(() => { jest.clearAllMocks(); callCommunity.mockResolvedValue({}); });

const {
  setTrainingNow, setShowTrainingNow, normaliseTrainingNow, TRAINING_NOW_STALE_MS,
} = require('../presence');

test('setTrainingNow calls community_set_training_now with _on', async () => {
  callCommunity.mockResolvedValueOnce({ training: true });
  expect(await setTrainingNow(true)).toEqual({ training: true });
  expect(callCommunity).toHaveBeenCalledWith('community_set_training_now', { _on: true });
  callCommunity.mockResolvedValueOnce({ training: false });
  expect(await setTrainingNow(false)).toEqual({ training: false });
  expect(callCommunity).toHaveBeenLastCalledWith('community_set_training_now', { _on: false });
});

test('setShowTrainingNow calls community_set_show_training_now with _on', async () => {
  callCommunity.mockResolvedValueOnce({ show_training_now: true });
  expect(await setShowTrainingNow(true)).toEqual({ showTrainingNow: true });
  expect(callCommunity).toHaveBeenCalledWith('community_set_show_training_now', { _on: true });
});

test('a non-boolean is refused before the network', async () => {
  await expect(setTrainingNow('yes')).rejects.toMatchObject({ code: 'invalid_input' });
  await expect(setShowTrainingNow(undefined)).rejects.toMatchObject({ code: 'invalid_input' });
  expect(callCommunity).not.toHaveBeenCalled();
});

test('the minor refusal from the server is not swallowed', async () => {
  callCommunity.mockRejectedValueOnce(Object.assign(new Error('forbidden'), { code: 'forbidden' }));
  await expect(setShowTrainingNow(true)).rejects.toMatchObject({ code: 'forbidden' });
});

test('normaliseTrainingNow: null, malformed and withheld all read as null', () => {
  expect(normaliseTrainingNow(null)).toBeNull();
  expect(normaliseTrainingNow(undefined)).toBeNull();
  expect(normaliseTrainingNow('x')).toBeNull();
  expect(normaliseTrainingNow({ count: 'many' })).toBeNull();
  expect(normaliseTrainingNow({ count: -1 })).toBeNull();
});

test('normaliseTrainingNow keeps count and at most three string names', () => {
  expect(normaliseTrainingNow({ count: 5, names: ['A', 'B', 'C', 'D', 7, ''] }))
    .toEqual({ count: 5, names: ['A', 'B', 'C'], trainedToday: null });
  expect(normaliseTrainingNow({ count: 0, names: [] })).toEqual({ count: 0, names: [], trainedToday: null });
  expect(normaliseTrainingNow({ count: 2 })).toEqual({ count: 2, names: [], trainedToday: null });
});

test('the stale window matches the server: 3 hours', () => {
  expect(TRAINING_NOW_STALE_MS).toBe(3 * 60 * 60 * 1000);
});

test('normaliseTrainingNow carries the hub trained_today count (round 3R, S6) and never a name list for it', () => {
  expect(normaliseTrainingNow({ count: 1, names: ['A'], trained_today: 4 })).toEqual({ count: 1, names: ['A'], trainedToday: 4 });
  expect(normaliseTrainingNow({ count: 0, names: [], trained_today: -1 }).trainedToday).toBeNull();
  expect(normaliseTrainingNow({ count: 0, names: [] }).trainedToday).toBeNull();
});
