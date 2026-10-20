/**
 * Transport unit tests. The transport owns persist + push: validates
 * against the allow-list, writes the event locally first, then
 * schedules a debounced push to Supabase.
 *
 * Mocks the SQLite + Supabase + errorLog layers so the test stays
 * synchronous and pure.
 */

jest.mock('../../database', () => ({
  recordEngineTelemetry: jest.fn(),
  getUnpushedEngineTelemetry: jest.fn(),
  markEngineTelemetryPushed: jest.fn(),
}));

jest.mock('../../supabase', () => ({
  getSupabaseClient: jest.fn(),
}));

jest.mock('../../errorLog', () => ({
  logWarn: jest.fn(),
  logInfo: jest.fn(),
}));

// Telemetry brief 2026-10-19: the transport reads Article 9 consent from the
// store. Consented unless a test says otherwise.
const mockStoreState = { healthConsent: true };
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => mockStoreState },
}));
jest.mock('expo-application', () => ({ nativeApplicationVersion: '3.2.0' }));

// Adversarial review M2: the growth events wait for migrate_200
// (GROWTH_TELEMETRY, src/lib/sync/featureFlags.js, shipped OFF). Most tests
// below exercise the transport with the growth events switched on; the M2
// tests switch them off. The real flag's shipped value is pinned separately.
let mockGrowthOn = true;
jest.mock('../../sync/featureFlags', () => {
  const mod = { ...jest.requireActual('../../sync/featureFlags') };
  // A live read, so a test can flip it (an object spread would freeze the value).
  Object.defineProperty(mod, 'GROWTH_TELEMETRY', { enumerable: true, get: () => mockGrowthOn });
  return mod;
});

const db = require('../../database');
const sb = require('../../supabase');
const errorLog = require('../../errorLog');
const { postEvent, flushPending, setTelemetryEnabled, isTelemetryEnabled, __resetBatchProbe } = require('../transport');

// The per-row tests below describe the path used until migrate_200 is
// applied: the batch function answers "does not exist" once, and the session
// falls back to one row per call.
const MISSING_BATCH = { error: { code: 'PGRST202', message: 'Could not find the function public.record_engine_telemetry_batch' } };

beforeEach(() => {
  jest.useFakeTimers();
  db.recordEngineTelemetry.mockReset().mockResolvedValue('local-row-id-1');
  db.getUnpushedEngineTelemetry.mockReset().mockResolvedValue([]);
  db.markEngineTelemetryPushed.mockReset().mockResolvedValue(undefined);
  sb.getSupabaseClient.mockReset().mockReturnValue(null);
  errorLog.logWarn.mockReset();
  mockStoreState.healthConsent = true;
  mockGrowthOn = true;
  __resetBatchProbe();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  // The enable flag is module-level; reset it so the opt-out tests can't
  // leak a disabled state into the rest of the suite.
  setTelemetryEnabled(true);
});

describe('telemetry/transport opt-out gate (LB-9)', () => {
  test('defaults to enabled', () => {
    expect(isTelemetryEnabled()).toBe(true);
  });

  test('when opted out, postEvent drops the event without persisting', async () => {
    setTelemetryEnabled(false);
    const id = await postEvent('user-1', 'sign_in', { tier: 'pro' });
    expect(id).toBeNull();
    expect(db.recordEngineTelemetry).not.toHaveBeenCalled();
  });

  test('when opted out, flushPending sends nothing and reports opted_out', async () => {
    setTelemetryEnabled(false);
    const result = await flushPending();
    expect(result).toEqual({ pushed: 0, skipped: 'opted_out' });
    expect(sb.getSupabaseClient).not.toHaveBeenCalled();
    expect(db.getUnpushedEngineTelemetry).not.toHaveBeenCalled();
  });

  test('re-enabling restores normal persistence', async () => {
    setTelemetryEnabled(false);
    setTelemetryEnabled(true);
    const id = await postEvent('user-1', 'sign_in', null);
    expect(id).toBe('local-row-id-1');
    expect(db.recordEngineTelemetry).toHaveBeenCalled();
  });
});

describe('telemetry/transport.postEvent', () => {
  test('rejects unknown events without touching the database', async () => {
    const id = await postEvent('user-1', 'not_a_real_event', { x: 1 });
    expect(id).toBeNull();
    expect(db.recordEngineTelemetry).not.toHaveBeenCalled();
    expect(errorLog.logWarn).toHaveBeenCalledWith(
      'telemetry.transport.unknownEvent',
      expect.stringContaining('not_a_real_event'),
      { event: 'not_a_real_event' },
    );
  });

  test('rejects calls with missing userId or event', async () => {
    expect(await postEvent(null, 'sign_in')).toBeNull();
    expect(await postEvent('user-1', null)).toBeNull();
    expect(await postEvent('user-1', '')).toBeNull();
    expect(db.recordEngineTelemetry).not.toHaveBeenCalled();
  });

  test('persists a known event and returns the local row id', async () => {
    const id = await postEvent('user-1', 'sign_in', { tier: 'pro' });
    expect(id).toBe('local-row-id-1');
    // The app version and platform are stamped on every event.
    expect(db.recordEngineTelemetry).toHaveBeenCalledWith(
      'user-1',
      'sign_in',
      expect.objectContaining({ tier: 'pro', app_version: '3.2.0' }),
    );
  });

  test('survives a persist failure without throwing', async () => {
    db.recordEngineTelemetry.mockRejectedValueOnce(new Error('disk full'));
    const id = await postEvent('user-1', 'sign_in', null);
    expect(id).toBeNull();
    expect(errorLog.logWarn).toHaveBeenCalledWith(
      'telemetry.transport.persist',
      'disk full',
      { event: 'sign_in' },
    );
  });
});

// Build a mock Supabase client whose session resolves to `uid` (the signed-in
// user). flushPending derives the uid from this to scope the telemetry read,
// so every flush test needs a session unless it is specifically testing the
// no-session path.
function clientWith(rpc, uid = 'user-1') {
  return {
    rpc,
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session: uid ? { user: { id: uid } } : null } }) },
  };
}

describe('telemetry/transport.flushPending', () => {
  test('no-ops when there is no Supabase client', async () => {
    sb.getSupabaseClient.mockReturnValueOnce(null);
    const result = await flushPending();
    expect(result).toEqual({ pushed: 0, skipped: 'no_client' });
    expect(db.getUnpushedEngineTelemetry).not.toHaveBeenCalled();
  });

  test('skips the flush when there is no signed-in session', async () => {
    // No session means no uid to scope to. Pushing here would let leftover
    // rows ship under whoever signs in next, so the flush must do nothing.
    sb.getSupabaseClient.mockReturnValueOnce(clientWith(jest.fn(), null));
    const result = await flushPending();
    expect(result).toEqual({ pushed: 0, skipped: 'no_session' });
    expect(db.getUnpushedEngineTelemetry).not.toHaveBeenCalled();
  });

  test('scopes the unpushed-rows query to the session uid', async () => {
    sb.getSupabaseClient.mockReturnValueOnce(clientWith(jest.fn().mockResolvedValue({ error: null }), 'user-42'));
    db.getUnpushedEngineTelemetry.mockResolvedValueOnce([]);
    await flushPending();
    expect(db.getUnpushedEngineTelemetry).toHaveBeenCalledWith('user-42', 200);
  });

  test('no-ops when there are no pending rows', async () => {
    sb.getSupabaseClient.mockReturnValueOnce(clientWith(jest.fn()));
    db.getUnpushedEngineTelemetry.mockResolvedValueOnce([]);
    const result = await flushPending();
    expect(result).toEqual({ pushed: 0 });
  });

  test('pushes pending rows and marks them shipped', async () => {
    const rpc = jest.fn().mockResolvedValueOnce(MISSING_BATCH).mockResolvedValue({ error: null });
    sb.getSupabaseClient.mockReturnValueOnce(clientWith(rpc));
    db.getUnpushedEngineTelemetry.mockResolvedValueOnce([
      { id: 'r1', event: 'sign_in', payload_json: '{"tier":"pro"}', occurred_at: 1234 },
      { id: 'r2', event: 'sign_out', payload_json: null, occurred_at: 5678 },
    ]);

    const result = await flushPending();

    expect(rpc).toHaveBeenCalledTimes(3);
    expect(rpc).toHaveBeenNthCalledWith(1, 'record_engine_telemetry_batch', expect.anything());
    expect(rpc).toHaveBeenNthCalledWith(2, 'record_engine_telemetry', expect.objectContaining({
      _event: 'sign_in',
      _payload: { tier: 'pro' },
    }));
    expect(rpc).toHaveBeenNthCalledWith(3, 'record_engine_telemetry', expect.objectContaining({
      _event: 'sign_out',
      _payload: null,
    }));
    expect(db.markEngineTelemetryPushed).toHaveBeenCalledWith(['r1', 'r2']);
    expect(result).toEqual({ pushed: 2, total: 2 });
  });

  test('skips a bad row and continues with the rest', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce(MISSING_BATCH)
      .mockResolvedValueOnce({ error: { message: 'bad payload' } })
      .mockResolvedValueOnce({ error: null });
    sb.getSupabaseClient.mockReturnValueOnce(clientWith(rpc));
    db.getUnpushedEngineTelemetry.mockResolvedValueOnce([
      { id: 'r1', event: 'sign_in', payload_json: null, occurred_at: 1 },
      { id: 'r2', event: 'sign_out', payload_json: null, occurred_at: 2 },
    ]);

    const result = await flushPending();

    expect(result.pushed).toBe(1);
    expect(db.markEngineTelemetryPushed).toHaveBeenCalledWith(['r2']);
    expect(errorLog.logWarn).toHaveBeenCalledWith(
      'telemetry.transport.rpc',
      'bad payload',
      { event: 'sign_in' },
    );
  });

  test('does not mark anything when every row fails', async () => {
    const rpc = jest.fn().mockResolvedValue({ error: { message: 'all bad' } });
    sb.getSupabaseClient.mockReturnValueOnce(clientWith(rpc));
    db.getUnpushedEngineTelemetry.mockResolvedValueOnce([
      { id: 'r1', event: 'sign_in', payload_json: null, occurred_at: 1 },
    ]);

    const result = await flushPending();

    expect(result.pushed).toBe(0);
    expect(db.markEngineTelemetryPushed).not.toHaveBeenCalled();
  });
});

describe('engineTelemetry shim', () => {
  test('re-exports postEvent as track and flushPending as flushPendingTelemetry', () => {
    const shim = require('../../engineTelemetry');
    const transport = require('../transport');
    expect(typeof shim.track).toBe('function');
    expect(typeof shim.flushPendingTelemetry).toBe('function');
    expect(shim.track).toBe(transport.postEvent);
    expect(shim.flushPendingTelemetry).toBe(transport.flushPending);
  });
});

describe('growth telemetry rules (founder brief 2026-10-19)', () => {
  test('before Article 9 consent, health-touching events are dropped; failure and performance events go', async () => {
    mockStoreState.healthConsent = null;
    expect(await postEvent('user-1', 'food_logged', { food_ref_source: 'off' })).toBeNull();
    expect(await postEvent('user-1', 'workout_discarded', { sets: '1' })).toBeNull();
    expect(db.recordEngineTelemetry).not.toHaveBeenCalled();
    expect(await postEvent('user-1', 'error_shown', { screen: 'Article9Consent', kind: 'toast' })).toBe('local-row-id-1');
    expect(await postEvent('user-1', 'screen_ready', { screen: 'AppStart', ms: '1-2s' })).toBe('local-row-id-1');
    expect(await postEvent('user-1', 'account_created', null)).toBe('local-row-id-1');
  });

  test('an unreadable consent state counts as not given', async () => {
    mockStoreState.healthConsent = undefined;
    expect(await postEvent('user-1', 'checkin_completed', { first: true, duration: '1-5m' })).toBeNull();
  });

  test('a declared event keeps only its declared, valid fields', async () => {
    await postEvent('user-1', 'workout_discarded', { sets: '2-3', duration: '5-15m', weightKg: 82, note: 'sore knee', sets_raw: 3 });
    const payload = db.recordEngineTelemetry.mock.calls[0][2];
    expect(payload).toEqual({ sets: '2-3', duration: '5-15m', app_version: '3.2.0', platform: expect.any(String) });
    expect(errorLog.logWarn).toHaveBeenCalledWith('telemetry.transport.droppedFields', expect.stringContaining('weightKg'), { event: 'workout_discarded' });
  });

  test('an invalid value is dropped, never sent', async () => {
    await postEvent('user-1', 'screen_viewed', { screen: 'john@example.com', from_screen: 'Home' });
    expect(db.recordEngineTelemetry.mock.calls[0][2]).not.toHaveProperty('screen');
  });

  test('a batch goes in one call; rows the server rejected are marked handled with the rest (M2)', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { inserted: 1, rejected: [1] }, error: null });
    sb.getSupabaseClient.mockReturnValueOnce(clientWith(rpc));
    db.getUnpushedEngineTelemetry.mockResolvedValueOnce([
      { id: 'r1', event: 'sign_in', payload_json: '{"a":"b"}', occurred_at: 1 },
      { id: 'r2', event: 'from_a_newer_build', payload_json: null, occurred_at: 2 },
    ]);
    const result = await flushPending();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('record_engine_telemetry_batch', { _events: [
      { event: 'sign_in', payload: { a: 'b' }, occurred_at: new Date(1).toISOString() },
      { event: 'from_a_newer_build', payload: null, occurred_at: new Date(2).toISOString() },
    ] });
    // The refused row can never succeed on a retry, so it must not block the queue.
    expect(db.markEngineTelemetryPushed).toHaveBeenCalledWith(['r1', 'r2']);
    expect(result).toEqual({ pushed: 1, rejected: 1, total: 2, batched: true });
  });

  test('a failed batch keeps every row queued', async () => {
    const rpc = jest.fn().mockResolvedValue({ error: { message: 'timeout' } });
    sb.getSupabaseClient.mockReturnValueOnce(clientWith(rpc));
    db.getUnpushedEngineTelemetry.mockResolvedValueOnce([{ id: 'r1', event: 'sign_in', payload_json: null, occurred_at: 1 }]);
    const result = await flushPending();
    expect(db.markEngineTelemetryPushed).not.toHaveBeenCalled();
    expect(result).toEqual({ pushed: 0, total: 1 });
  });
});


// Adversarial review M2.
describe('growth events wait for the server (GROWTH_TELEMETRY)', () => {
  const fs = require('fs');
  const path = require('path');
  const { EVENT_SCHEMAS } = require('../schema');

  test('the flag ships OFF, until migrate_200 is applied', () => {
    expect(jest.requireActual('../../sync/featureFlags').GROWTH_TELEMETRY).toBe(false);
  });

  test('every schema event is new with migrate_200: none is in migrate_001 to migrate_199', () => {
    // This is the derivation the drop rule rests on: "in the schema catalogue"
    // is exactly "not accepted by the server before migrate_200". If a schema
    // event were ever added that an earlier migration already allow-listed,
    // this fails and the rule must name it.
    const dir = path.resolve(__dirname, '../../../../supabase');
    const before = fs.readdirSync(dir)
      .filter((f) => /^migrate_\d+.*\.sql$/.test(f) && Number(f.match(/^migrate_(\d+)/)[1]) < 200)
      .map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
    expect(before.length).toBeGreaterThan(1000);
    EVENT_SCHEMAS.forEach((e) => expect({ event: e.name, acceptedBefore200: before.includes(`'${e.name}'`) })
      .toEqual({ event: e.name, acceptedBefore200: false }));
  });

  test('off: a schema event is dropped, not persisted and not queued', async () => {
    mockGrowthOn = false;
    for (const [event, payload] of [
      ['screen_viewed', { screen: 'Home', from_screen: 'None' }],
      ['error_shown', { screen: 'Home', kind: 'toast' }],
      ['workout_discarded', { sets: '2-3', duration: '5-15m' }],
      ['checkin_completed', { first: true }],
    ]) {
      // eslint-disable-next-line no-await-in-loop
      expect(await postEvent('user-1', event, payload)).toBeNull();
    }
    expect(db.recordEngineTelemetry).not.toHaveBeenCalled();
    // Nothing was scheduled to flush either.
    expect(jest.getTimerCount()).toBe(0);
  });

  test('off: a legacy event the server already accepts still flows', async () => {
    mockGrowthOn = false;
    for (const event of ['sign_in', 'workout_completed', 'food_logged', 'structure_refused', 'sync_run', 'app_backgrounded']) {
      // eslint-disable-next-line no-await-in-loop
      expect(await postEvent('user-1', event, null)).toBe('local-row-id-1');
    }
    expect(db.recordEngineTelemetry).toHaveBeenCalledTimes(6);
  });

  test('on: a schema event is persisted', async () => {
    mockGrowthOn = true;
    expect(await postEvent('user-1', 'screen_viewed', { screen: 'Home', from_screen: 'None' })).toBe('local-row-id-1');
  });

  test('the transport reads the flag from featureFlags', () => {
    const src = fs.readFileSync(path.join(__dirname, '../transport.js'), 'utf8');
    expect(src).toContain("import { GROWTH_TELEMETRY } from '../sync/featureFlags'");
    expect(src).toContain('if (!GROWTH_TELEMETRY && SCHEMA_BY_NAME[event]) return null;');
  });
});

describe('rows the server refuses never block the queue (M2)', () => {
  const rows = [
    { id: 'r1', event: 'sign_in', payload_json: null, occurred_at: 1 },
    { id: 'r2', event: 'from_a_newer_build', payload_json: null, occurred_at: 2 },
    { id: 'r3', event: 'sign_out', payload_json: null, occurred_at: 3 },
  ];

  test('batch: every rejected index is marked handled; none is left to re-push', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { inserted: 1, rejected: [1, 2] }, error: null });
    sb.getSupabaseClient.mockReturnValueOnce(clientWith(rpc));
    db.getUnpushedEngineTelemetry.mockResolvedValueOnce(rows);
    const result = await flushPending();
    expect(db.markEngineTelemetryPushed).toHaveBeenCalledTimes(1);
    expect(db.markEngineTelemetryPushed).toHaveBeenCalledWith(['r1', 'r2', 'r3']);
    expect(result).toEqual({ pushed: 1, rejected: 2, total: 3, batched: true });
    expect(errorLog.logInfo).toHaveBeenCalledWith('telemetry.transport.batch.refused', expect.any(String), { refused: 2, total: 3 });
  });

  test('batch: a clean answer with no rejections marks all and reports no rejected key', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { inserted: 2, rejected: [] }, error: null });
    sb.getSupabaseClient.mockReturnValueOnce(clientWith(rpc));
    db.getUnpushedEngineTelemetry.mockResolvedValueOnce(rows.slice(0, 2));
    expect(await flushPending()).toEqual({ pushed: 2, total: 2, batched: true });
    expect(db.markEngineTelemetryPushed).toHaveBeenCalledWith(['r1', 'r2']);
  });

  test('batch: a transient failure (network, timeout) keeps every row queued', async () => {
    for (const error of [{ message: 'TypeError: Network request failed' }, { message: 'timeout', code: '57014' }]) {
      db.markEngineTelemetryPushed.mockClear();
      const rpc = jest.fn().mockResolvedValue({ error });
      sb.getSupabaseClient.mockReturnValueOnce(clientWith(rpc));
      db.getUnpushedEngineTelemetry.mockResolvedValueOnce(rows);
      // eslint-disable-next-line no-await-in-loop
      expect(await flushPending()).toEqual({ pushed: 0, total: 3 });
      expect(db.markEngineTelemetryPushed).not.toHaveBeenCalled();
    }
  });

  test('per-row: an unknown-event and an oversized-payload refusal are marked handled; a network failure stays queued', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce(MISSING_BATCH)
      .mockResolvedValueOnce({ error: { code: 'P0001', message: 'Unknown engine telemetry event: from_a_newer_build' } })
      .mockResolvedValueOnce({ error: { code: 'P0001', message: 'Engine telemetry payload too large' } })
      .mockResolvedValueOnce({ error: { message: 'TypeError: Network request failed' } })
      .mockResolvedValueOnce({ error: null });
    sb.getSupabaseClient.mockReturnValueOnce(clientWith(rpc));
    db.getUnpushedEngineTelemetry.mockResolvedValueOnce([
      { id: 'a', event: 'from_a_newer_build', payload_json: null, occurred_at: 1 },
      { id: 'b', event: 'sign_in', payload_json: '{"x":1}', occurred_at: 2 },
      { id: 'c', event: 'sign_out', payload_json: null, occurred_at: 3 },
      { id: 'd', event: 'sync_run', payload_json: null, occurred_at: 4 },
    ]);
    const result = await flushPending();
    // a (unknown) and b (too large) are handled; c (network) stays; d is pushed.
    expect(db.markEngineTelemetryPushed).toHaveBeenCalledWith(['d', 'a', 'b']);
    expect(result).toEqual({ pushed: 1, rejected: 2, total: 4 });
  });

  test('per-row: a refusal does not stop the rows after it', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce(MISSING_BATCH)
      .mockResolvedValueOnce({ error: { code: 'P0001', message: 'Unknown engine telemetry event: x' } })
      .mockResolvedValueOnce({ error: null });
    sb.getSupabaseClient.mockReturnValueOnce(clientWith(rpc));
    db.getUnpushedEngineTelemetry.mockResolvedValueOnce(rows.slice(0, 2));
    await flushPending();
    expect(rpc).toHaveBeenCalledTimes(3);
  });
});

describe('private routes never leave the transport (B1, B2)', () => {
  test.each(['HowYouTrain', 'HowYouTrainAdd', 'AvoidedMovements', 'TrainingConsiderations', 'WellbeingCheck', 'CoachHeldHistory'])(
    '%s in screen, from_screen is stored as Private for every event that carries a screen', async (route) => {
      db.recordEngineTelemetry.mockClear();
      await postEvent('user-1', 'screen_viewed', { screen: route, from_screen: route, prev_dwell: '3-30s' });
      await postEvent('user-1', 'error_shown', { screen: route, kind: 'toast' });
      await postEvent('user-1', 'help_opened', { topic: 'est_max', screen: route });
      await postEvent('user-1', 'screen_ready', { screen: route, ms: '1-2s' });
      const stored = db.recordEngineTelemetry.mock.calls.map(([, event, payload]) => [event, payload]);
      expect(stored).toHaveLength(4);
      expect(stored[0][1]).toMatchObject({ screen: 'Private', from_screen: 'Private', prev_dwell: '3-30s' });
      expect(stored[1][1]).toMatchObject({ screen: 'Private', kind: 'toast' });
      expect(stored[2][1]).toMatchObject({ topic: 'est_max', screen: 'Private' });
      expect(stored[3][1]).toMatchObject({ screen: 'Private', ms: '1-2s' });
      expect(JSON.stringify(stored)).not.toContain(route);
    });

  test('an ordinary route is stored as it is', async () => {
    await postEvent('user-1', 'screen_viewed', { screen: 'Diary', from_screen: 'Home' });
    expect(db.recordEngineTelemetry.mock.calls[0][2]).toMatchObject({ screen: 'Diary', from_screen: 'Home' });
  });
});
