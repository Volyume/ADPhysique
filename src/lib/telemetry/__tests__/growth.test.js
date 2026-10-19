/**
 * Growth helpers (growth brief 2026-10-19). Pins: events go out for the
 * signed-in person; signed out, only preConsent events (performance,
 * failure, lifecycle) are held on the phone, capped, and sent in order at
 * the next signed-in event, while anything else is dropped; first
 * sightings and daily events are sent once; experiment arms are stable and
 * exposure is recorded once; error and help events carry the current screen.
 */
const mockTrack = jest.fn(async () => ({ ok: true }));
jest.mock('../../engineTelemetry', () => ({ track: (...a) => mockTrack(...a) }));
const mockStore = { user: null };
jest.mock('../../../store/useAppStore', () => ({ __esModule: true, default: { getState: () => mockStore } }));
const mockMem = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k) => (mockMem.has(k) ? mockMem.get(k) : null)),
  setItem: jest.fn(async (k, v) => { mockMem.set(k, v); }),
  removeItem: jest.fn(async (k) => { mockMem.delete(k); }),
}));

const growth = require('../growth');
const session = require('../session');

const flush = async () => { for (let i = 0; i < 10; i += 1) await Promise.resolve(); };
const sent = () => mockTrack.mock.calls.map(([, e, p]) => [e, p]);

beforeEach(() => {
  mockTrack.mockClear();
  mockMem.clear();
  mockStore.user = null;
  session.endSession(0);
});

describe('trackNow', () => {
  it('sends for the signed-in person', async () => {
    mockStore.user = { id: 'u1' };
    growth.trackNow('food_search_empty', { query_length: '2-3' });
    await flush();
    expect(mockTrack).toHaveBeenCalledWith('u1', 'food_search_empty', { query_length: '2-3' });
  });

  it('signed out: holds a preConsent event, drops anything else', async () => {
    growth.trackNow('setup_stage_stalled', { stage: 'boot_auth' });
    growth.trackNow('food_search_empty', { query_length: '1' });
    await flush();
    expect(mockTrack).not.toHaveBeenCalled();
    const held = JSON.parse(mockMem.get(growth.__test.SIGNED_OUT_KEY));
    expect(held).toEqual([{ event: 'setup_stage_stalled', payload: { stage: 'boot_auth' } }]);
  });

  it('held events go out in order at the next signed-in event, then the hold is cleared', async () => {
    growth.trackNow('screen_ready', { screen: 'Welcome', ms: '1-2s' });
    await flush();
    growth.trackNow('error_shown', { screen: 'Welcome', kind: 'toast' });
    await flush();
    mockStore.user = { id: 'u1' };
    growth.trackNow('screen_viewed', { screen: 'Home', from_screen: 'None' });
    await flush();
    expect(sent()).toEqual([
      ['screen_ready', { screen: 'Welcome', ms: '1-2s' }],
      ['error_shown', { screen: 'Welcome', kind: 'toast' }],
      ['screen_viewed', { screen: 'Home', from_screen: 'None' }],
    ]);
    expect(mockMem.has(growth.__test.SIGNED_OUT_KEY)).toBe(false);
  });

  it('the hold is capped', async () => {
    for (let i = 0; i < growth.__test.SIGNED_OUT_CAP + 5; i += 1) {
      growth.trackNow('screen_ready', { screen: 'Welcome', ms: '<250ms' });
      // eslint-disable-next-line no-await-in-loop
      await flush();
    }
    expect(JSON.parse(mockMem.get(growth.__test.SIGNED_OUT_KEY))).toHaveLength(growth.__test.SIGNED_OUT_CAP);
  });
});

describe('once-only helpers', () => {
  it('a feature is seen once per person', async () => {
    mockStore.user = { id: 'u1' };
    growth.trackFeatureSeen('warmup_chip');
    await flush();
    growth.trackFeatureSeen('warmup_chip');
    await flush();
    expect(sent()).toEqual([['feature_seen', { feature: 'warmup_chip' }]]);
    mockStore.user = { id: 'u2' };
    growth.trackFeatureSeen('warmup_chip');
    await flush();
    expect(mockTrack).toHaveBeenCalledTimes(2);
  });

  it('nothing is seen signed out', async () => {
    growth.trackFeatureSeen('warmup_chip');
    await flush();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('a daily event goes once per key per day', async () => {
    mockStore.user = { id: 'u1' };
    growth.trackOncePerDay('coaching_setup_card_shown', { surface: 'home' }, 'home');
    await flush();
    growth.trackOncePerDay('coaching_setup_card_shown', { surface: 'home' }, 'home');
    await flush();
    growth.trackOncePerDay('coaching_setup_card_shown', { surface: 'nutrition' }, 'nutrition');
    await flush();
    expect(mockTrack).toHaveBeenCalledTimes(2);
  });
});

describe('experiments', () => {
  it('the same person always lands in the same arm, within the requested arms', () => {
    const a = growth.experimentVariant('start_copy', 3, 'user-1');
    expect(growth.experimentVariant('start_copy', 3, 'user-1')).toBe(a);
    expect(['a', 'b', 'c']).toContain(a);
    for (let i = 0; i < 50; i += 1) expect(['a', 'b']).toContain(growth.experimentVariant('x', 2, `u${i}`));
  });

  it('signed out is arm a, recorded nowhere', async () => {
    expect(growth.experimentVariant('start_copy', 2, null)).toBe('a');
    await flush();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('exposure is recorded once', async () => {
    mockStore.user = { id: 'u1' };
    growth.experimentVariant('start_copy', 2, 'u1');
    await flush();
    growth.experimentVariant('start_copy', 2, 'u1');
    await flush();
    expect(sent().filter(([e]) => e === 'experiment_exposed')).toHaveLength(1);
  });
});

describe('friction and confusion carry the screen', () => {
  it('error and help events name the current screen', async () => {
    mockStore.user = { id: 'u1' };
    session.startSession(0);
    session.noteScreen('Diary', 0);
    growth.errorShown('toast');
    growth.helpOpened('est_max');
    await flush();
    expect(sent()).toEqual([
      ['error_shown', { screen: 'Diary', kind: 'toast' }],
      ['help_opened', { topic: 'est_max', screen: 'Diary' }],
    ]);
  });
});
