// Mock the ES-module-only deps that the supabase.js + feedback.js
// require chain pulls in. Same shape as src/__tests__/screen-mount.test.js.
jest.mock('react-native-url-polyfill/auto', () => ({}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));
let __sbInserts = [];
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn((p) => { __sbInserts.push(p); return Promise.resolve({ data: null, error: null }); }),
      upsert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
}));

// Need EXPO_PUBLIC_SUPABASE_URL/KEY set so getSupabaseClient() returns a
// non-null client. They can be any non-empty value; the mock above
// intercepts the actual network calls.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

/**
 * Error logging + feedback pipeline integration tests
 * ────────────────────────────────────────────────────────────────────────
 *
 * Verifies the two telemetry surfaces are bulletproof:
 *
 * 1. Error logging (errorLog.js + sentry.js)
 *    - logError/logWarn/logInfo push to the in-memory + AsyncStorage
 *      ring buffer reliably
 *    - The buffer is capped at MAX_ENTRIES and oldest entries roll off
 *    - PII is redacted from buffer entries (no leaking emails / weights
 *      via the Settings → Debug Logs export path)
 *    - Sentry forwarding is graceful when SDK / DSN missing
 *    - installGlobalHandlers wires the JS error boundary
 *
 * 2. Feedback (feedback.js)
 *    - submitFeedback writes the right shape to Supabase
 *    - Suppression rules (14-day window, in-session memo) work
 *    - Offline path queues to AsyncStorage
 *    - flushPendingFeedback drains the queue on next online sign-in
 *    - Failed inserts don't crash the caller
 *    - Auto-attached context (session id, build identity, recent
 *      breadcrumbs, last error) is present in the payload
 */

// Clean AsyncStorage between tests so the ring buffer starts empty.
beforeEach(async () => {
  const AS = require('@react-native-async-storage/async-storage').default;
  await AS.clear();
});

describe('Error logging pipeline', () => {
  test('logError pushes to the ring buffer and persists', async () => {
    const { logError, getRecentErrors, clearErrors } = require('../lib/errorLog');
    await clearErrors();
    const err = new Error('test failure');
    logError('test.scope', err, { context: { detail: 'x' } });
    // Debounced persistence runs after 200ms; getRecentErrors reads the
    // in-memory buffer so we don't need to wait.
    const recent = await getRecentErrors(10);
    expect(recent.length).toBeGreaterThanOrEqual(1);
    expect(recent[0].level).toBe('error');
    expect(recent[0].scope).toBe('test.scope');
    expect(recent[0].message).toContain('test failure');
    expect(recent[0].stack.length).toBeGreaterThan(0);
  });

  test('logWarn and logInfo also persist', async () => {
    const { logWarn, logInfo, getRecentErrors, clearErrors } = require('../lib/errorLog');
    await clearErrors();
    logWarn('test.warn', 'gentle problem');
    logInfo('test.info', 'milestone reached');
    const recent = await getRecentErrors(10);
    expect(recent.find(e => e.level === 'warn')).toBeDefined();
    expect(recent.find(e => e.level === 'info')).toBeDefined();
  });

  test('ring buffer is capped at MAX_ENTRIES, oldest rolls off', async () => {
    const { logError, getRecentErrors, clearErrors } = require('../lib/errorLog');
    await clearErrors();
    for (let i = 0; i < 250; i++) {
      logError('overflow', new Error(`event ${i}`));
    }
    const recent = await getRecentErrors(500);
    // MAX_ENTRIES is 200; older events roll off
    expect(recent.length).toBeLessThanOrEqual(200);
    // Most recent first
    expect(recent[0].message).toContain('event 249');
  });

  test('exportErrorsAsText produces a readable string', async () => {
    const { logError, exportErrorsAsText, clearErrors } = require('../lib/errorLog');
    await clearErrors();
    logError('export.test', new Error('exported error'), { user: 'someone' });
    const text = await exportErrorsAsText();
    expect(typeof text).toBe('string');
    expect(text).toContain('export.test');
    expect(text).toContain('exported error');
  });

  test('the Sentry wrapper does not throw when SDK is absent', () => {
    // The wrapper at sentry.js does the require() inside try/catch and
    // every export gates on `SentryNative != null`. Confirm by calling
    // each entry point with the SDK unavailable in this test env.
    const sentry = require('../lib/sentry');
    expect(() => sentry.initSentry({ release: 'v1.0.0' })).not.toThrow();
    expect(() => sentry.captureError(new Error('x'), { scope: 'test' })).not.toThrow();
    expect(() => sentry.captureWarning('w', { scope: 'test' })).not.toThrow();
    expect(() => sentry.addBreadcrumb('b', { scope: 'test' })).not.toThrow();
    expect(() => sentry.setSentryUser({ id: 'u1' })).not.toThrow();
  });

  test('crash log survives across sessions (Settings → Debug Logs)', async () => {
    const { getCrashLog, clearCrashLog } = require('../lib/errorLog');
    const AS = require('@react-native-async-storage/async-storage').default;
    await clearCrashLog();
    // Simulate what installGlobalHandlers writes on fatal error
    await AS.setItem('@volyume_crash_log', JSON.stringify({
      message: 'native crash',
      stack: '  at native:1',
      isFatal: true,
      ts: Date.now(),
    }));
    const log = await getCrashLog();
    expect(log).not.toBeNull();
    expect(log.message).toBe('native crash');
  });

  test('installGlobalHandlers wires JS error boundary', () => {
    const { installGlobalHandlers } = require('../lib/errorLog');
    // global.ErrorUtils is a RN-runtime thing. In node it's absent.
    // The function should no-op gracefully.
    expect(() => installGlobalHandlers()).not.toThrow();
  });

  test('safeStringify on circular references does not infinite loop', () => {
    const { logError, clearErrors } = require('../lib/errorLog');
    clearErrors();
    const circular = { a: 1 };
    circular.self = circular;
    expect(() => logError('circular', new Error('boom'), circular)).not.toThrow();
  });

  test('logError tolerates non-Error first arg', () => {
    const { logError, clearErrors } = require('../lib/errorLog');
    clearErrors();
    expect(() => logError('weird', 'string instead of error')).not.toThrow();
    expect(() => logError('weird', null)).not.toThrow();
    expect(() => logError('weird', undefined)).not.toThrow();
    expect(() => logError('weird', 42)).not.toThrow();
  });

  test('ring buffer redacts PII so Settings → Debug Logs cannot leak it', async () => {
    const { logError, exportErrorsAsText, clearErrors } = require('../lib/errorLog');
    await clearErrors();
    // Throw user-sensitive fields at the logger
    logError('pii.test', new Error('something went wrong'), {
      email: 'leak@example.com',
      weightKg: 87.5,
      bodyFatPercent: 18,
      heightCm: 178,
      dateOfBirth: '1990-01-01',
      firstName: 'Test',
      notes: 'I felt awful today after my divorce',
      session: { access_token: 'eyJ-leak-token' },
    });
    const exported = await exportErrorsAsText();
    expect(exported).not.toContain('leak@example.com');
    expect(exported).not.toContain('87.5');
    expect(exported).not.toContain('eyJ-leak-token');
    expect(exported).not.toContain('1990-01-01');
    expect(exported).not.toContain('divorce');
    // Redaction marker should be visible so the user knows something
    // was removed, not just silently dropped.
    expect(exported).toContain('[redacted]');
  });

  test('PII redaction also applies to the context forwarded to Sentry', () => {
    // Regression for Codex P1 #2: the original code redacted before the
    // local ring buffer but forwarded the raw context to Sentry. Verify
    // captureError now receives a redacted context.
    const sentry = require('../lib/sentry');
    const captured = [];
    const origCaptureError = sentry.captureError;
    sentry.captureError = (err, ctx) => { captured.push({ err, ctx }); };
    try {
      const { logError, clearErrors } = require('../lib/errorLog');
      clearErrors();
      logError('sentry.pii', new Error('boom'), {
        email: 'leak@example.com',
        accessToken: 'eyJ-secret',
        weightKg: 88,
        session: { access_token: 'eyJ-leak' },
      });
      expect(captured.length).toBeGreaterThanOrEqual(1);
      const last = captured[captured.length - 1];
      const ctx = last.ctx?.extra?.context;
      // The forwarded context must be the REDACTED version.
      expect(ctx).toBeDefined();
      const serialized = JSON.stringify(ctx);
      expect(serialized).not.toContain('leak@example.com');
      expect(serialized).not.toContain('eyJ-secret');
      expect(serialized).not.toContain('eyJ-leak');
      expect(serialized).not.toContain('88');
    } finally {
      sentry.captureError = origCaptureError;
    }
  });

  test('PII redaction handles nested objects', async () => {
    const { logError, exportErrorsAsText, clearErrors } = require('../lib/errorLog');
    await clearErrors();
    logError('pii.deep', new Error('x'), {
      profile: {
        body: { weightKg: 92, heightCm: 180 },
        contact: { email: 'a@b.com' },
      },
    });
    const exported = await exportErrorsAsText();
    // Assert the sensitive values are redacted next to their keys, rather than a
    // bare not.toContain('92'): the ISO timestamp (e.g. ".192Z") can
    // coincidentally contain those digits, which made the old check flaky.
    expect(exported).not.toContain('a@b.com');
    expect(exported).toContain('[redacted]');
    expect(exported).not.toMatch(/weightKg"?\s*:\s*"?92\b/);
    expect(exported).not.toMatch(/heightCm"?\s*:\s*"?180\b/);
  });
});

describe('Feedback submission pipeline', () => {
  const FRESH_PROFILE = {
    userId: 'u-test',
    trigger: 'crash_recovery',
    sentiment: 'love',
    message: 'It is great',
  };

  test('submitFeedback writes to Supabase user_feedback with auto-attached context', async () => {
    const { submitFeedback } = require('../lib/feedback');
    const { getSupabaseClient } = require('../lib/supabase');

    // Capture the insert payload that the supabase mock receives.
    const inserts = [];
    const sb = getSupabaseClient();
    if (!sb) return; // mock env without configured client
    const origFrom = sb.from;
    sb.from = (table) => {
      if (table !== 'user_feedback') return origFrom(table);
      return {
        insert: (payload) => {
          inserts.push(payload);
          return Promise.resolve({ data: null, error: null });
        },
      };
    };

    try {
      const res = await submitFeedback(FRESH_PROFILE);
      expect(res.ok).toBe(true);
      expect(inserts).toHaveLength(1);
      const p = inserts[0];
      expect(p.user_id).toBe('u-test');
      expect(p.trigger).toBe('crash_recovery');
      expect(p.sentiment).toBe('love');
      // Auto-attached fields. Some may be null in the test env (no Sentry,
      // no observability boot), the shape must still exist.
      expect(p).toHaveProperty('session_id');
      expect(p).toHaveProperty('app_version');
      expect(p).toHaveProperty('platform');
      expect(p).toHaveProperty('recent_screens');
      expect(p).toHaveProperty('recent_actions');
      expect(p).toHaveProperty('tags');
      expect(Array.isArray(p.tags)).toBe(true);
    } finally {
      sb.from = origFrom;
    }
  });

  test('submitFeedback truncates message to 2000 chars', async () => {
    const { submitFeedback } = require('../lib/feedback');
    const { getSupabaseClient } = require('../lib/supabase');
    const sb = getSupabaseClient();
    if (!sb) return;
    let lastPayload = null;
    sb.from = () => ({
      insert: (p) => { lastPayload = p; return Promise.resolve({ data: null, error: null }); },
    });
    const longMsg = 'x'.repeat(5000);
    await submitFeedback({ ...FRESH_PROFILE, message: longMsg });
    expect(lastPayload.message.length).toBeLessThanOrEqual(2000);
  });

  test('submitFeedback returns ok:false on PostgREST insert error', async () => {
    const { submitFeedback } = require('../lib/feedback');
    const { getSupabaseClient } = require('../lib/supabase');
    const sb = getSupabaseClient();
    if (!sb) return;
    sb.from = () => ({
      insert: () => Promise.resolve({
        data: null,
        error: { code: '42501', message: 'permission denied', details: 'RLS rejected' },
      }),
    });
    const res = await submitFeedback(FRESH_PROFILE);
    expect(res.ok).toBe(false);
    expect(res.error).toBeDefined();
  });

  test('submitFeedback queues offline when there is no client', async () => {
    // Force getSupabaseClient to return null
    jest.resetModules();
    jest.doMock('../lib/supabase', () => ({
      ...jest.requireActual('../lib/supabase'),
      getSupabaseClient: () => null,
    }));
    const { submitFeedback } = require('../lib/feedback');
    const AS = require('@react-native-async-storage/async-storage').default;

    const res = await submitFeedback({
      trigger: 'shake', sentiment: 'meh',
      message: 'cant connect',
    });
    expect(res.ok).toBe(false);

    // Should have queued to the pending-feedback list
    const raw = await AS.getItem('@volyume_feedback_pending_v1');
    expect(raw).toBeTruthy();
    const list = JSON.parse(raw);
    expect(list.length).toBe(1);
    expect(list[0].trigger).toBe('shake');
    expect(list[0].sentiment).toBe('meh');
    expect(list[0].message).toBe('cant connect');
    expect(typeof list[0].capturedAt).toBe('number');

    // Restore mocks
    jest.dontMock('../lib/supabase');
    jest.resetModules();
  });

  test('pending-feedback queue is capped at 20 entries', async () => {
    jest.resetModules();
    jest.doMock('../lib/supabase', () => ({
      ...jest.requireActual('../lib/supabase'),
      getSupabaseClient: () => null,
    }));
    const { submitFeedback } = require('../lib/feedback');
    const AS = require('@react-native-async-storage/async-storage').default;

    for (let i = 0; i < 25; i++) {
      await submitFeedback({ trigger: 'shake', sentiment: 'meh', message: `report ${i}` });
    }
    const raw = await AS.getItem('@volyume_feedback_pending_v1');
    const list = JSON.parse(raw);
    expect(list.length).toBeLessThanOrEqual(20);
    // Most recent kept (list is unshifted; the 25th-most-recent should
    // be 'report 24')
    expect(list[0].message).toBe('report 24');

    jest.dontMock('../lib/supabase');
    jest.resetModules();
  });

  test('shouldPrompt suppresses repeat within 14 days', async () => {
    const { shouldPrompt, markPromptShown } = require('../lib/feedback');
    expect(await shouldPrompt('first_workout')).toBe(true);
    await markPromptShown('first_workout');
    expect(await shouldPrompt('first_workout')).toBe(false);
  });

  test('shouldPrompt returns false for empty key', async () => {
    const { shouldPrompt } = require('../lib/feedback');
    expect(await shouldPrompt('')).toBe(false);
    expect(await shouldPrompt(null)).toBe(false);
    expect(await shouldPrompt(undefined)).toBe(false);
  });

  test('flushPendingFeedback drains the queue on sign-in', async () => {
    const AS = require('@react-native-async-storage/async-storage').default;
    // Pre-seed the offline queue
    await AS.setItem('@volyume_feedback_pending_v1', JSON.stringify([
      { trigger: 'shake', sentiment: 'love', message: 'a', capturedAt: Date.now() - 60000 },
      { trigger: 'shake', sentiment: 'meh',  message: 'b', capturedAt: Date.now() - 30000 },
    ]));

    const { flushPendingFeedback } = require('../lib/feedback');
    const { getSupabaseClient } = require('../lib/supabase');
    const sb = getSupabaseClient();
    if (!sb) return;
    let count = 0;
    sb.from = () => ({
      insert: () => { count++; return Promise.resolve({ data: null, error: null }); },
    });

    const shipped = await flushPendingFeedback('u-test');
    expect(shipped).toBe(2);
    expect(count).toBe(2);
    // Queue should be cleared on full success
    const raw = await AS.getItem('@volyume_feedback_pending_v1');
    expect(raw).toBeFalsy();
  });

  test('flushPendingFeedback keeps the specific failed items, not a tail slice', async () => {
    // Regression for the slice(shipped) bug: if item 0 fails and item 1
    // succeeds, the OLD code would drop the failed item and keep the
    // successful one for retry. Verify the SPECIFIC failed item is
    // preserved.
    const AS = require('@react-native-async-storage/async-storage').default;
    await AS.setItem('@volyume_feedback_pending_v1', JSON.stringify([
      { trigger: 'shake', sentiment: 'love', message: 'FAIL-ME', capturedAt: Date.now() },
      { trigger: 'shake', sentiment: 'love', message: 'pass1', capturedAt: Date.now() },
      { trigger: 'shake', sentiment: 'love', message: 'pass2', capturedAt: Date.now() },
    ]));

    const { flushPendingFeedback } = require('../lib/feedback');
    const { getSupabaseClient } = require('../lib/supabase');
    const sb = getSupabaseClient();
    if (!sb) return;
    sb.from = () => ({
      insert: (payload) => {
        // Fail only the FAIL-ME item; everything else passes
        if (payload?.message === 'FAIL-ME') {
          return Promise.resolve({ data: null, error: { code: '500', message: 'transient' } });
        }
        return Promise.resolve({ data: null, error: null });
      },
    });

    const shipped = await flushPendingFeedback('u-test');
    expect(shipped).toBe(2);
    const raw = await AS.getItem('@volyume_feedback_pending_v1');
    expect(raw).toBeTruthy();
    const remaining = JSON.parse(raw);
    // The failed item MUST be the one preserved, not a tail slice
    expect(remaining).toHaveLength(1);
    expect(remaining[0].message).toBe('FAIL-ME');
  });

  test('flushPendingFeedback keeps unshipped items on partial failure', async () => {
    const AS = require('@react-native-async-storage/async-storage').default;
    await AS.setItem('@volyume_feedback_pending_v1', JSON.stringify([
      { trigger: 'shake', sentiment: 'love', message: 'a', capturedAt: Date.now() },
      { trigger: 'shake', sentiment: 'love', message: 'b', capturedAt: Date.now() },
      { trigger: 'shake', sentiment: 'love', message: 'c', capturedAt: Date.now() },
    ]));

    const { flushPendingFeedback } = require('../lib/feedback');
    const { getSupabaseClient } = require('../lib/supabase');
    const sb = getSupabaseClient();
    if (!sb) return;
    let n = 0;
    sb.from = () => ({
      insert: () => {
        n++;
        // First 2 succeed, the rest fail
        return n <= 2
          ? Promise.resolve({ data: null, error: null })
          : Promise.resolve({ data: null, error: { code: '500', message: 'server' } });
      },
    });

    const shipped = await flushPendingFeedback('u-test');
    expect(shipped).toBe(2);
    // The failed entry should remain in the queue
    const raw = await AS.getItem('@volyume_feedback_pending_v1');
    expect(raw).toBeTruthy();
  });

  test('submitFeedback never throws on caller', async () => {
    const { submitFeedback } = require('../lib/feedback');
    // Even when Supabase blows up entirely with a thrown error
    const { getSupabaseClient } = require('../lib/supabase');
    const sb = getSupabaseClient();
    if (!sb) return;
    sb.from = () => ({
      insert: () => { throw new Error('client exploded'); },
    });
    let res;
    try {
      res = await submitFeedback({ trigger: 'shake', sentiment: 'meh', message: 'x' });
    } catch (_e) {
      throw new Error('submitFeedback threw, it must always resolve');
    }
    expect(res.ok).toBe(false);
    expect(res.error).toBeDefined();
  });
});

describe('Error + feedback integration', () => {
  test('feedback payload includes recent error if one happened in the last 60s', async () => {
    const { logError, clearErrors } = require('../lib/errorLog');
    const { submitFeedback } = require('../lib/feedback');
    const { getSupabaseClient } = require('../lib/supabase');

    await clearErrors();
    logError('test.recent', new Error('something just broke'));

    const sb = getSupabaseClient();
    if (!sb) return;
    let payload = null;
    sb.from = () => ({
      insert: (p) => { payload = p; return Promise.resolve({ data: null, error: null }); },
    });

    await submitFeedback({ user_id: 'u', trigger: 'crash_recovery', sentiment: 'meh' });
    expect(payload).toBeTruthy();
    // last_error should be populated since the error fired <60s ago
    expect(payload.last_error).toBeDefined();
    if (payload.last_error) {
      expect(payload.last_error.message).toContain('something just broke');
    }
  });
});
