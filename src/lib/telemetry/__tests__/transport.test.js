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
}));

const db = require('../../database');
const sb = require('../../supabase');
const errorLog = require('../../errorLog');
const { postEvent, flushPending, setTelemetryEnabled, isTelemetryEnabled } = require('../transport');

beforeEach(() => {
  jest.useFakeTimers();
  db.recordEngineTelemetry.mockReset().mockResolvedValue('local-row-id-1');
  db.getUnpushedEngineTelemetry.mockReset().mockResolvedValue([]);
  db.markEngineTelemetryPushed.mockReset().mockResolvedValue(undefined);
  sb.getSupabaseClient.mockReset().mockReturnValue(null);
  errorLog.logWarn.mockReset();
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
    expect(db.recordEngineTelemetry).toHaveBeenCalledWith(
      'user-1',
      'sign_in',
      { tier: 'pro' },
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
    const rpc = jest.fn().mockResolvedValue({ error: null });
    sb.getSupabaseClient.mockReturnValueOnce(clientWith(rpc));
    db.getUnpushedEngineTelemetry.mockResolvedValueOnce([
      { id: 'r1', event: 'sign_in', payload_json: '{"tier":"pro"}', occurred_at: 1234 },
      { id: 'r2', event: 'sign_out', payload_json: null, occurred_at: 5678 },
    ]);

    const result = await flushPending();

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenNthCalledWith(1, 'record_engine_telemetry', expect.objectContaining({
      _event: 'sign_in',
      _payload: { tier: 'pro' },
    }));
    expect(rpc).toHaveBeenNthCalledWith(2, 'record_engine_telemetry', expect.objectContaining({
      _event: 'sign_out',
      _payload: null,
    }));
    expect(db.markEngineTelemetryPushed).toHaveBeenCalledWith(['r1', 'r2']);
    expect(result).toEqual({ pushed: 2, total: 2 });
  });

  test('skips a bad row and continues with the rest', async () => {
    const rpc = jest.fn()
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
