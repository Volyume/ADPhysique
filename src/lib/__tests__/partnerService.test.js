/**
 * partnerService.test.js
 *
 * Training Partners service layer. Critical behaviours:
 *   - Gating is airtight: unconfigured / not-Pro / flag-off all resolve to the
 *     graceful fallback and make ZERO cloud calls (a dark feature can't leak).
 *   - getCircleSignals writes through to the offline cache, and on network
 *     failure returns the last cache marked fromCache (never spins).
 *   - acceptInvite enforces the 7-day onboarding lock client-side BEFORE the
 *     RPC is ever called.
 *   - publishWeeklySignal auto-pauses (and does NOT publish) during contest
 *     prep / aggressive cut.
 */

const mockStorage = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn((k, v) => { mockStorage[k] = v; return Promise.resolve(); }),
  getItem: jest.fn((k) => Promise.resolve(mockStorage[k] ?? null)),
  removeItem: jest.fn((k) => { delete mockStorage[k]; return Promise.resolve(); }),
}));

const mockSb = { value: null };
const mockConfigured = { value: true };
const mockUser = { value: { id: 'me', created_at: '2020-01-01T00:00:00Z' } };
jest.mock('../supabase', () => ({
  getSupabaseClient: jest.fn(() => mockSb.value),
  isSupabaseConfigured: jest.fn(() => mockConfigured.value),
  getCurrentUser: jest.fn(() => Promise.resolve(mockUser.value)),
}));

jest.mock('../observability', () => ({
  track: { event: jest.fn(), warn: jest.fn() },
}));

const mockTier = { value: 'pro' };
jest.mock('../../store/useAppStore', () => ({
  useAppStore: { getState: () => ({ tier: mockTier.value }) },
}));

const svc = require('../partners/partnerService');

// A chainable Supabase query-builder mock. Each .from() returns a builder whose
// terminal value is resolved from `responses[table]`. rpc() reads `rpcs[name]`.
function makeClient({ responses = {}, rpcs = {}, captureInsert } = {}) {
  const calls = { from: [], rpc: [] };
  const builder = (table) => {
    const b = {
      _table: table,
      select() { return b; },
      eq() { return b; },
      neq() { return b; },
      in() { return b; },
      order() { return b; },
      update(v) { b._update = v; return b; },
      insert(v) { if (captureInsert) captureInsert(table, v); b._insert = v; return b; },
      single() { return Promise.resolve(responses[table] ?? { data: null, error: null }); },
      then(resolve) { return Promise.resolve(responses[table] ?? { data: [], error: null }).then(resolve); },
    };
    return b;
  };
  return {
    from: jest.fn((t) => { calls.from.push(t); return builder(t); }),
    rpc: jest.fn((name, args) => {
      calls.rpc.push({ name, args });
      const r = rpcs[name];
      return Promise.resolve(typeof r === 'function' ? r(args) : (r ?? { data: null, error: null }));
    }),
    _calls: calls,
  };
}

beforeEach(() => {
  for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  mockConfigured.value = true;
  mockTier.value = 'pro';
  mockUser.value = { id: 'me', created_at: '2020-01-01T00:00:00Z' };
  // Default client: feature flag ON.
  mockSb.value = makeClient({ rpcs: { feature_enabled: { data: true, error: null } } });
});

describe('gating — Pro-only, no rollout flag', () => {
  test('unconfigured Supabase → empty, no cloud calls', async () => {
    mockConfigured.value = false;
    expect(await svc.isPartnersEnabled()).toBe(false);
    expect(await svc.getMyCircles()).toEqual([]);
    expect(await svc.createCircle('x')).toEqual({ ok: false });
  });

  test('free tier → disabled (Free/Pro boundary is the only gate)', async () => {
    mockTier.value = 'free';
    expect(await svc.isPartnersEnabled()).toBe(false);
    expect(await svc.getMyCircles()).toEqual([]);
  });

  test('configured + pro → enabled, with no feature flag consulted', async () => {
    const client = makeClient({});   // note: no feature_enabled rpc defined
    mockSb.value = client;
    expect(await svc.isPartnersEnabled()).toBe(true);
    // the removed rollout flag must not be queried any more
    expect(client._calls.rpc.find((c) => c.name === 'feature_enabled')).toBeUndefined();
  });
});

describe('reads', () => {
  test('getMyCircles returns rows', async () => {
    mockSb.value = makeClient({
      rpcs: { feature_enabled: { data: true } },
      responses: { partner_circles: { data: [{ id: 'c1', name: 'A' }], error: null } },
    });
    expect(await svc.getMyCircles()).toEqual([{ id: 'c1', name: 'A' }]);
  });

  test('getCircleSignals writes through to cache', async () => {
    mockSb.value = makeClient({
      rpcs: { feature_enabled: { data: true } },
      responses: {
        partner_members: { data: [{ user_id: 'u1', display_name: 'Sam', status: 'active' }], error: null },
        partner_weekly_signal: { data: [{ user_id: 'u1', sessions_done: 3 }], error: null },
      },
    });
    const res = await svc.getCircleSignals('c1');
    expect(res.fromCache).toBe(false);
    expect(res.members).toHaveLength(1);
    expect(res.signals).toHaveLength(1);
    // cache populated
    expect(mockStorage['@volyume_partner_signal_cache_v1']).toContain('Sam');
  });

  test('getCircleSignals falls back to cache on network failure', async () => {
    // First, a good read to seed the cache.
    mockSb.value = makeClient({
      rpcs: { feature_enabled: { data: true } },
      responses: {
        partner_members: { data: [{ user_id: 'u1', display_name: 'Sam', status: 'active' }], error: null },
        partner_weekly_signal: { data: [{ user_id: 'u1', sessions_done: 3 }], error: null },
      },
    });
    await svc.getCircleSignals('c1');
    // Now a failing read.
    mockSb.value = makeClient({
      rpcs: { feature_enabled: { data: true } },
      responses: { partner_members: { data: null, error: { message: 'offline' } } },
    });
    const res = await svc.getCircleSignals('c1');
    expect(res.fromCache).toBe(true);
    expect(res.members).toHaveLength(1);
  });
});

describe('mutations', () => {
  test('createCircle inserts circle + owner member row', async () => {
    const inserts = [];
    mockSb.value = makeClient({
      rpcs: { feature_enabled: { data: true } },
      responses: { partner_circles: { data: { id: 'c9' }, error: null } },
      captureInsert: (t, v) => inserts.push({ t, v }),
    });
    const res = await svc.createCircle('Lifts');
    expect(res).toEqual({ ok: true, circleId: 'c9' });
    const memberInsert = inserts.find((i) => i.t === 'partner_members');
    expect(memberInsert.v.role).toBe('owner');
    expect(memberInsert.v.user_id).toBe('me');
  });

  test('createInvite returns link + british share text', async () => {
    mockSb.value = makeClient({
      rpcs: { feature_enabled: { data: true }, create_partner_invite: { data: 'TOK123', error: null } },
    });
    const res = await svc.createInvite('c1');
    expect(res.ok).toBe(true);
    expect(res.link).toBe('https://volyume.app/partner/TOK123');
    expect(res.shareText).toContain('keep each other honest');
  });

  test('acceptInvite blocks within the 7-day onboarding lock (no RPC call)', async () => {
    mockUser.value = { id: 'me', created_at: new Date(Date.now() - 2 * 86400000).toISOString() };
    const client = makeClient({ rpcs: { feature_enabled: { data: true }, accept_partner_invite: { data: 'c1' } } });
    mockSb.value = client;
    const res = await svc.acceptInvite('TOK', 'Sam');
    expect(res.ok).toBe(false);
    expect(res.code).toBe('onboarding_lock');
    expect(client._calls.rpc.find((c) => c.name === 'accept_partner_invite')).toBeUndefined();
  });

  test('acceptInvite succeeds for an established account', async () => {
    mockSb.value = makeClient({
      rpcs: { feature_enabled: { data: true }, accept_partner_invite: { data: 'c1', error: null } },
    });
    const res = await svc.acceptInvite('TOK', 'Sam');
    expect(res).toEqual({ ok: true, circleId: 'c1' });
  });

  test('setSharing + leaveCircle resolve ok', async () => {
    mockSb.value = makeClient({ rpcs: { feature_enabled: { data: true } } });
    expect(await svc.setSharing('c1', false)).toEqual({ ok: true });
    expect(await svc.leaveCircle('c1')).toEqual({ ok: true });
  });
});

describe('nudges', () => {
  test('sendNudge reports sent=true on success', async () => {
    mockSb.value = makeClient({
      rpcs: { feature_enabled: { data: true }, send_partner_nudge: { data: true, error: null } },
    });
    const res = await svc.sendNudge('c1', 'u2', 'fire');
    expect(res).toEqual({ ok: true, sent: true });
  });

  test('sendNudge reports sent=false when rate-limited', async () => {
    mockSb.value = makeClient({
      rpcs: { feature_enabled: { data: true }, send_partner_nudge: { data: false, error: null } },
    });
    const res = await svc.sendNudge('c1', 'u2', 'fire');
    expect(res).toEqual({ ok: true, sent: false });
  });

  test('sendNudge rejects an unknown emoji without a cloud call', async () => {
    const client = makeClient({ rpcs: { feature_enabled: { data: true } } });
    mockSb.value = client;
    const res = await svc.sendNudge('c1', 'u2', 'rocket');
    expect(res).toEqual({ ok: false });
    expect(client._calls.rpc.find((c) => c.name === 'send_partner_nudge')).toBeUndefined();
  });

  test('getMyNudges returns unseen nudges', async () => {
    mockSb.value = makeClient({
      rpcs: { feature_enabled: { data: true } },
      responses: { partner_nudges: { data: [{ id: 'n1', emoji: 'fire' }], error: null } },
    });
    expect(await svc.getMyNudges()).toEqual([{ id: 'n1', emoji: 'fire' }]);
  });
});

describe('deriveSignalView (pure)', () => {
  test('on_track with 4 of 4 → all pips done', () => {
    const v = svc.deriveSignalView({ sessions_done: 4, sessions_planned: 4, status: 'on_track' });
    expect(v.label).toBe('on track');
    expect(v.pips).toEqual(['done', 'done', 'done', 'done']);
  });

  test('partial week → mix of done/todo, never a missed label', () => {
    const v = svc.deriveSignalView({ sessions_done: 1, sessions_planned: 4, status: 'in_progress' });
    expect(v.label).toBe('this week');
    expect(v.pips).toEqual(['done', 'todo', 'todo', 'todo']);
  });

  test('absent signal reads as neutral this-week with a single todo pip', () => {
    const v = svc.deriveSignalView(null);
    expect(v.label).toBe('this week');
    expect(v.done).toBe(0);
    expect(v.pips).toEqual(['todo']);
  });

  test('caps pips at 7 even for a huge plan', () => {
    const v = svc.deriveSignalView({ sessions_done: 9, sessions_planned: 12, status: 'on_track' });
    expect(v.pips).toHaveLength(7);
  });
});

describe('contest-prep auto-pause', () => {
  test('shouldPauseForPhase is true for prep phases only', () => {
    expect(svc.shouldPauseForPhase('contest_prep')).toBe(true);
    expect(svc.shouldPauseForPhase('aggressive_cut')).toBe(true);
    expect(svc.shouldPauseForPhase('build')).toBe(false);
    expect(svc.shouldPauseForPhase(null)).toBe(false);
  });

  test('publishWeeklySignal pauses and does NOT publish during contest prep', async () => {
    const client = makeClient({ rpcs: { feature_enabled: { data: true } } });
    mockSb.value = client;
    const res = await svc.publishWeeklySignal({ sessionsPlanned: 4, goalPhase: 'contest_prep' });
    expect(res).toEqual({ ok: true, paused: true });
    expect(client._calls.rpc.find((c) => c.name === 'publish_my_weekly_signal')).toBeUndefined();
  });

  test('publishWeeklySignal publishes normally outside prep', async () => {
    const client = makeClient({
      rpcs: { feature_enabled: { data: true }, publish_my_weekly_signal: { data: null, error: null } },
    });
    mockSb.value = client;
    const res = await svc.publishWeeklySignal({ sessionsPlanned: 4, goalPhase: 'build' });
    expect(res).toEqual({ ok: true });
    const call = client._calls.rpc.find((c) => c.name === 'publish_my_weekly_signal');
    expect(call.args).toEqual({ p_sessions_planned: 4, p_rest_week: false });
  });

  test('publishWeeklySignal marks a coach-prescribed rest week', async () => {
    const client = makeClient({
      rpcs: { publish_my_weekly_signal: { data: null, error: null } },
    });
    mockSb.value = client;
    const res = await svc.publishWeeklySignal({ sessionsPlanned: 3, goalPhase: 'build', restWeek: true });
    expect(res).toEqual({ ok: true });
    const call = client._calls.rpc.find((c) => c.name === 'publish_my_weekly_signal');
    expect(call.args).toEqual({ p_sessions_planned: 3, p_rest_week: true });
  });
});

describe('shared weekly pact + kind statuses', () => {
  test('setCirclePact clamps to 1-7 and calls the RPC', async () => {
    const client = makeClient({ rpcs: { set_circle_pact: { data: null, error: null } } });
    mockSb.value = client;
    const res = await svc.setCirclePact('c1', 9);
    expect(res).toEqual({ ok: true });
    const call = client._calls.rpc.find((c) => c.name === 'set_circle_pact');
    expect(call.args).toEqual({ p_circle: 'c1', p_sessions: 7 });
  });

  test('setCirclePact null clears the pact', async () => {
    const client = makeClient({ rpcs: { set_circle_pact: { data: null, error: null } } });
    mockSb.value = client;
    await svc.setCirclePact('c1', null);
    const call = client._calls.rpc.find((c) => c.name === 'set_circle_pact');
    expect(call.args).toEqual({ p_circle: 'c1', p_sessions: null });
  });

  test('a rest week reads as "resting well", never quiet', () => {
    const view = svc.deriveSignalView({ sessions_done: 0, sessions_planned: 3, status: 'rest' });
    expect(view.label).toBe('resting well');
  });

  test('a return after a quiet week reads as "back this week"', () => {
    const view = svc.deriveSignalView(
      { sessions_done: 1, sessions_planned: 3, status: 'in_progress' },
      { sessions_done: 0, status: 'quiet' },
    );
    expect(view.label).toBe('back this week');
  });
});
