/**
 * Growth helpers (growth brief 2026-10-19). Pins: events go out for the
 * signed-in person; signed out, only preConsent events (performance,
 * failure, lifecycle) are held on the phone, capped, and sent in order at
 * the next signed-in event, while anything else is dropped; first
 * sightings and daily events are sent once; experiment arms are stable and
 * exposure is recorded once; error and help events carry the current screen.
 *
 * Adversarial review M5 additions: every hold write goes through one promise
 * chain (two holds in the same tick are both kept); a full hold lets a stall
 * or an error replace the oldest screen view; nothing is held while the person
 * has turned usage data off; and a signed-in event does not read AsyncStorage
 * once the hold is known to be empty. B1, B2: a private screen is reported as
 * 'Private' in error_shown and help_opened.
 */
const mockTrack = jest.fn(async () => ({ ok: true }));
jest.mock('../../engineTelemetry', () => ({ track: (...a) => mockTrack(...a) }));
const mockStore = { user: null };
jest.mock('../../../store/useAppStore', () => ({ __esModule: true, default: { getState: () => mockStore } }));
let mockUsageDataOn = true;
jest.mock('../transport', () => ({ isTelemetryEnabled: () => mockUsageDataOn }));
const mockMem = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k) => (mockMem.has(k) ? mockMem.get(k) : null)),
  setItem: jest.fn(async (k, v) => { mockMem.set(k, v); }),
  removeItem: jest.fn(async (k) => { mockMem.delete(k); }),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const growth = require('../growth');
const session = require('../session');

// Waits for the hold's promise chain to go quiet as well as a few ticks, so
// no write from one test leaks into the next.
const flush = async () => {
  for (let i = 0; i < 10; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await growth.__test.idle();
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};
const sent = () => mockTrack.mock.calls.map(([, e, p]) => [e, p]);

beforeEach(() => {
  mockTrack.mockClear();
  mockMem.clear();
  AsyncStorage.getItem.mockClear();
  AsyncStorage.setItem.mockClear();
  mockStore.user = null;
  mockUsageDataOn = true;
  growth.__test.reset();
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

describe('the signed-out hold (M5)', () => {
  const heldNow = () => JSON.parse(mockMem.get(growth.__test.SIGNED_OUT_KEY) || '[]');

  it('two holds in the same tick are both kept', async () => {
    growth.trackNow('setup_stage_stalled', { stage: 'boot_auth' });
    growth.trackNow('error_shown', { screen: 'Welcome', kind: 'toast' });
    growth.trackNow('screen_ready', { screen: 'Welcome', ms: '1-2s' });
    await flush();
    expect(heldNow()).toEqual([
      { event: 'setup_stage_stalled', payload: { stage: 'boot_auth' } },
      { event: 'error_shown', payload: { screen: 'Welcome', kind: 'toast' } },
      { event: 'screen_ready', payload: { screen: 'Welcome', ms: '1-2s' } },
    ]);
  });

  it('a burst far over the cap in one tick never exceeds it and never throws', async () => {
    for (let i = 0; i < growth.__test.SIGNED_OUT_CAP + 15; i += 1) {
      growth.trackNow('screen_viewed', { screen: 'Welcome', from_screen: 'None' });
    }
    await flush();
    expect(heldNow()).toHaveLength(growth.__test.SIGNED_OUT_CAP);
  });

  it('at the cap a new stall replaces the oldest screen view', async () => {
    const cap = growth.__test.SIGNED_OUT_CAP;
    growth.trackNow('error_shown', { screen: 'Welcome', kind: 'toast' });
    for (let i = 0; i < cap - 1; i += 1) {
      growth.trackNow('screen_viewed', { screen: i === 0 ? 'Oldest' : 'Welcome', from_screen: 'None' });
    }
    await flush();
    expect(heldNow()).toHaveLength(cap);
    growth.trackNow('setup_stage_stalled', { stage: 'boot_consent' });
    await flush();
    const held = heldNow();
    expect(held).toHaveLength(cap);
    expect(held[held.length - 1]).toEqual({ event: 'setup_stage_stalled', payload: { stage: 'boot_consent' } });
    // The oldest screen view went; the earlier error stayed.
    expect(held.some((h) => h.payload.screen === 'Oldest')).toBe(false);
    expect(held[0].event).toBe('error_shown');
  });

  it('at the cap a new error replaces the oldest screen_ready when no screen_viewed is held', async () => {
    const cap = growth.__test.SIGNED_OUT_CAP;
    growth.trackNow('screen_ready', { screen: 'Oldest', ms: '1-2s' });
    for (let i = 0; i < cap - 1; i += 1) growth.trackNow('screen_ready', { screen: 'Welcome', ms: '1-2s' });
    await flush();
    growth.trackNow('error_shown', { screen: 'Welcome', kind: 'alert' });
    await flush();
    const held = heldNow();
    expect(held).toHaveLength(cap);
    expect(held.some((h) => h.payload.screen === 'Oldest')).toBe(false);
    expect(held[held.length - 1].event).toBe('error_shown');
  });

  it('at the cap a screen view or screen_ready is dropped, not a swap', async () => {
    const cap = growth.__test.SIGNED_OUT_CAP;
    for (let i = 0; i < cap; i += 1) growth.trackNow('screen_viewed', { screen: 'Welcome', from_screen: 'None' });
    await flush();
    growth.trackNow('screen_ready', { screen: 'Late', ms: '1-2s' });
    await flush();
    expect(heldNow().some((h) => h.payload.screen === 'Late')).toBe(false);
  });

  it('at the cap with only stalls and errors held, a newcomer is dropped (nothing replaceable)', async () => {
    const cap = growth.__test.SIGNED_OUT_CAP;
    for (let i = 0; i < cap; i += 1) growth.trackNow('error_shown', { screen: 'Welcome', kind: 'toast' });
    await flush();
    growth.trackNow('setup_stage_stalled', { stage: 'boot_tier' });
    await flush();
    expect(heldNow()).toHaveLength(cap);
    expect(heldNow().some((h) => h.event === 'setup_stage_stalled')).toBe(false);
  });

  it('nothing is held while the person has turned usage data off (LB-9)', async () => {
    mockUsageDataOn = false;
    growth.trackNow('setup_stage_stalled', { stage: 'boot_auth' });
    growth.trackNow('error_shown', { screen: 'Welcome', kind: 'toast' });
    await flush();
    expect(mockMem.has(growth.__test.SIGNED_OUT_KEY)).toBe(false);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    // And turning it back on resumes holding.
    mockUsageDataOn = true;
    growth.trackNow('setup_stage_stalled', { stage: 'boot_auth' });
    await flush();
    expect(heldNow()).toHaveLength(1);
  });

  it('a signed-in event does not read AsyncStorage once the hold is known empty', async () => {
    mockStore.user = { id: 'u1' };
    // First check (true at start-up): reads once, finds nothing.
    growth.trackNow('food_search_empty', { query_length: '2-3' });
    await flush();
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
    expect(growth.__test.mayHold()).toBe(false);
    AsyncStorage.getItem.mockClear();
    growth.trackNow('food_search_empty', { query_length: '2-3' });
    growth.trackNow('food_search_empty', { query_length: '4-6' });
    await flush();
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(mockTrack).toHaveBeenCalledTimes(3);
  });

  it('a hold after the hold was known empty is found and sent at the next signed-in event, in order', async () => {
    mockStore.user = { id: 'u1' };
    growth.trackNow('food_search_empty', { query_length: '1' });
    await flush();
    expect(growth.__test.mayHold()).toBe(false);
    mockStore.user = null;
    growth.trackNow('setup_stage_stalled', { stage: 'boot_auth' });
    await flush();
    expect(growth.__test.mayHold()).toBe(true);
    mockTrack.mockClear();
    mockStore.user = { id: 'u1' };
    growth.trackNow('screen_viewed', { screen: 'Home', from_screen: 'None' });
    await flush();
    expect(sent()).toEqual([
      ['setup_stage_stalled', { stage: 'boot_auth' }],
      ['screen_viewed', { screen: 'Home', from_screen: 'None' }],
    ]);
    expect(growth.__test.mayHold()).toBe(false);
  });

  it('a hold queued in the same tick as the first signed-in check is not lost', async () => {
    growth.trackNow('setup_stage_stalled', { stage: 'boot_auth' });
    await flush();
    // Sign-in boundary: a signed-in event starts the send, and a signed-out
    // hold lands in the very same tick, behind it.
    mockStore.user = { id: 'u1' };
    growth.trackNow('screen_viewed', { screen: 'Home', from_screen: 'None' });
    mockStore.user = null;
    growth.trackNow('error_shown', { screen: 'Welcome', kind: 'toast' });
    await flush();
    // The late hold is on the phone and the flag says so.
    expect(heldNow()).toEqual([{ event: 'error_shown', payload: { screen: 'Welcome', kind: 'toast' } }]);
    expect(growth.__test.mayHold()).toBe(true);
  });
});

describe('private screens are reported as Private (B1, B2)', () => {
  it.each(session.PRIVATE_ROUTES)('error_shown and help_opened on %s name Private', async (route) => {
    mockStore.user = { id: 'u1' };
    session.startSession(0);
    session.noteScreen(route, 0);
    growth.errorShown('toast');
    growth.helpOpened('est_max');
    await flush();
    expect(sent()).toEqual([
      ['error_shown', { screen: 'Private', kind: 'toast' }],
      ['help_opened', { topic: 'est_max', screen: 'Private' }],
    ]);
  });
});
