/**
 * The ED-pattern flag cloud PUSH (founder decision B, 2026-09-23, register
 * D196; answers D92-11): src/lib/sync/tables/edPatternFlags.js
 * `edFlagPushArgs` / `pushEdPatternFlags` / `pushEdPatternFlagsNow`, the
 * database read helper behind it, and the two call sites.
 *
 * WHAT THIS SUITE PINS, and why it is written to FAIL:
 *  - the payload shape is EXACTLY {_id, _raised_at, _cleared_at, _reason}:
 *    no key for the signals can ever be added by accident, because the
 *    args builder is the one place the payload is shaped and the row read
 *    for it never selects `signals_json` (source guard); the fixture rows
 *    carry `signals_json` to prove it is dropped, not merely absent;
 *  - timestamps go as ISO strings from the row's epoch-ms columns, a null
 *    cleared_at stays null, the reason is trimmed and bounded, and a row
 *    with no id or no raised_at is skipped rather than sent broken;
 *  - one RPC call per row, named `ed_flag_push`, counted, with a failing
 *    row logged under a NEUTRAL scope with no row id (review H2) and the
 *    rest still pushed (never throws); a deleted-account FK rejection is
 *    benign, neither logged nor counted as an error; a server without
 *    migrate_182 (PostgREST PGRST202) is a quiet, uncounted skip that
 *    stops the loop, never a Sentry error;
 *  - the immediate push refuses during a sign-out wipe, without Article 9
 *    consent, without a live session, and when the signed-in user is not
 *    the row owner; and never throws;
 *  - the call sites: `bulkUploadLocalData` pushes FIRST in the push phase
 *    (before the exercise push and the pull) and folds real failures into
 *    the bulk error count; `CoachOutputScreen` pushes right after BOTH the
 *    raise and the clear, never awaited;
 *  - the registry entry STAYS pull_only (the generic engine must never own
 *    this row); the state contract pins the same from its side.
 */

jest.mock('../telemetry', () => ({
  logSyncError: jest.fn(),
  isDeletedAccountFkError: jest.fn(() => false),
}));
jest.mock('../../errorLog', () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const mockRows = [];
jest.mock('../../database', () => ({
  getEdPatternFlagsForCloudPush: jest.fn(async () => mockRows),
}));

const mockSupabase = { hasLiveSession: jest.fn(async () => true), getSupabaseClient: jest.fn() };
jest.mock('../../supabase', () => mockSupabase);

const mockGuard = { isSignOutWiping: jest.fn(() => false) };
jest.mock('../signOutGuard', () => mockGuard);

const mockStore = { healthConsent: true };
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => mockStore },
}));

const {
  edFlagPushArgs, pushEdPatternFlags, pushEdPatternFlagsNow, isRpcMissingError,
  ED_FLAG_PUSH_LIMIT, PUSH_SCOPE,
} = require('../tables/edPatternFlags');
const telemetry = require('../telemetry');
const errorLog = require('../../errorLog');
const db = require('../../database');

function client(rpcImpl, sessionUserId = 'u1') {
  return {
    rpc: jest.fn(rpcImpl ?? (async () => ({ data: { state: 'raised' }, error: null }))),
    auth: { getSession: jest.fn(async () => ({ data: { session: sessionUserId ? { user: { id: sessionUserId } } : null } })) },
  };
}

beforeEach(() => {
  mockRows.length = 0;
  jest.clearAllMocks();
  telemetry.isDeletedAccountFkError.mockImplementation(() => false);
  mockSupabase.hasLiveSession.mockImplementation(async () => true);
  mockGuard.isSignOutWiping.mockImplementation(() => false);
  mockStore.healthConsent = true;
});

describe('edFlagPushArgs: the one payload shape', () => {
  test('carries exactly the four keys, ISO timestamps, no signals', () => {
    const args = edFlagPushArgs({
      id: 'f1', reason: '  multi-signal harm check  ', signals_json: '{"s1":true}',
      raised_at: 1758600000000, cleared_at: 1758700000000,
    });
    expect(Object.keys(args).sort()).toEqual(['_cleared_at', '_id', '_raised_at', '_reason']);
    expect(args).toEqual({
      _id: 'f1',
      _raised_at: new Date(1758600000000).toISOString(),
      _cleared_at: new Date(1758700000000).toISOString(),
      _reason: 'multi-signal harm check',
    });
    // The reason code itself may contain the word (it does: 'multi-signal harm check'); what must never appear is a KEY for the signals.
    expect(Object.keys(args).join(',')).not.toMatch(/signal/i);
  });

  test('an open flag sends cleared_at null; a missing or blank reason sends null; a long reason is bounded to 80', () => {
    expect(edFlagPushArgs({ id: 'f1', raised_at: 5, cleared_at: null })).toMatchObject({ _cleared_at: null, _reason: null });
    expect(edFlagPushArgs({ id: 'f1', raised_at: 5, reason: '   ' })._reason).toBeNull();
    expect(edFlagPushArgs({ id: 'f1', raised_at: 5, reason: 'x'.repeat(200) })._reason).toHaveLength(80);
  });

  test('a row with no id or no usable raised_at is not sendable', () => {
    expect(edFlagPushArgs({ raised_at: 5 })).toBeNull();
    expect(edFlagPushArgs({ id: 'f1' })).toBeNull();
    expect(edFlagPushArgs({ id: 'f1', raised_at: 'soon' })).toBeNull();
    expect(edFlagPushArgs({ id: 'f1', raised_at: 0 })).toBeNull();
    expect(edFlagPushArgs(null)).toBeNull();
  });
});

describe('the telemetry scope is neutral (review H2)', () => {
  test('names neither the flag, its table nor the RPC, and every push log uses it', () => {
    expect(PUSH_SCOPE).toBe('sync.flagPush');
    expect(PUSH_SCOPE).not.toMatch(/ed[_.]?pattern|ed_flag|edPattern/i);
    const MODULE = read('src/lib/sync/tables/edPatternFlags.js');
    const pushPart = MODULE.slice(MODULE.indexOf('export async function pushEdPatternFlags('));
    const scopes = [...pushPart.matchAll(/log(?:SyncError|Info|Warn|Error)\(\s*(`[^`]*`|'[^']*')/g)].map((m) => m[1]);
    expect(scopes.length).toBeGreaterThan(0);
    for (const s of scopes) expect(s).toMatch(/^[`']\$\{PUSH_SCOPE\}|^'sync\.flagPush/);
    // No row id ever travels as log context.
    expect(pushPart).not.toMatch(/logSyncError\([^)]*\{\s*id\b/);
    expect(pushPart).not.toMatch(/row\.id/);
  });

  test('isRpcMissingError recognises PostgREST PGRST202 only', () => {
    expect(isRpcMissingError({ code: 'PGRST202', message: 'Could not find the function' })).toBe(true);
    expect(isRpcMissingError({ cause: { code: 'PGRST202' } })).toBe(true);
    expect(isRpcMissingError({ code: 'PGRST301' })).toBe(false);
    expect(isRpcMissingError({ code: '42501' })).toBe(false);
    expect(isRpcMissingError(null)).toBe(false);
  });
});

describe('pushEdPatternFlags', () => {
  test('one ed_flag_push call per row, with the args builder\'s payload and nothing else (signals present on the row, absent from the wire)', async () => {
    mockRows.push(
      { id: 'a', reason: 'multi-signal harm check', signals_json: '{"rapidLoss":true}', raised_at: 1000, cleared_at: null },
      { id: 'b', reason: 'multi-signal harm check', signals_json: '{"rapidLoss":true}', raised_at: 2000, cleared_at: 3000 },
    );
    const sb = client();
    const out = await pushEdPatternFlags(sb, { userId: 'u1' });
    expect(out).toEqual({ count: 2, errors: 0, benign: 0 });
    expect(db.getEdPatternFlagsForCloudPush).toHaveBeenCalledWith('u1', ED_FLAG_PUSH_LIMIT);
    expect(sb.rpc).toHaveBeenCalledTimes(2);
    expect(sb.rpc).toHaveBeenNthCalledWith(1, 'ed_flag_push', edFlagPushArgs(mockRows[0]));
    expect(sb.rpc).toHaveBeenNthCalledWith(2, 'ed_flag_push', edFlagPushArgs(mockRows[1]));
    for (const call of sb.rpc.mock.calls) {
      expect(Object.keys(call[1]).sort()).toEqual(['_cleared_at', '_id', '_raised_at', '_reason']);
    }
  });

  test('nothing to push, no client or no user: no call, no error', async () => {
    const sb = client();
    expect(await pushEdPatternFlags(sb, { userId: 'u1' })).toEqual({ count: 0, errors: 0 });
    expect(await pushEdPatternFlags(null, { userId: 'u1' })).toEqual({ count: 0, errors: 0 });
    expect(await pushEdPatternFlags(sb, {})).toEqual({ count: 0, errors: 0 });
    expect(sb.rpc).not.toHaveBeenCalled();
  });

  test('a failing row is logged under the neutral scope with no id, and counted; the rest still push; it never throws', async () => {
    mockRows.push({ id: 'a', raised_at: 1000 }, { id: 'b', raised_at: 2000 }, { id: 'c', raised_at: 3000 });
    const sb = client(async (_name, args) => (args._id === 'b'
      ? { data: null, error: { message: 'boom', code: 'XX000' } }
      : { data: {}, error: null }));
    const out = await pushEdPatternFlags(sb, { userId: 'u1' });
    expect(out).toEqual({ count: 2, errors: 1, benign: 0 });
    expect(telemetry.logSyncError).toHaveBeenCalledTimes(1);
    expect(telemetry.logSyncError).toHaveBeenCalledWith(PUSH_SCOPE, expect.objectContaining({ message: 'boom' }));
    expect(telemetry.logSyncError.mock.calls[0]).toHaveLength(2);
  });

  test('a thrown rpc is caught per row and the loop continues', async () => {
    mockRows.push({ id: 'a', raised_at: 1000 }, { id: 'b', raised_at: 2000 });
    const sb = client(async (_name, args) => { if (args._id === 'a') throw new Error('network'); return { data: {}, error: null }; });
    await expect(pushEdPatternFlags(sb, { userId: 'u1' })).resolves.toEqual({ count: 1, errors: 1, benign: 0 });
  });

  test('a row whose args cannot even be built is caught per row too', async () => {
    const poison = { id: { toString() { throw new Error('bad id'); } }, raised_at: 1000 };
    mockRows.push(poison, { id: 'b', raised_at: 2000 });
    const sb = client();
    await expect(pushEdPatternFlags(sb, { userId: 'u1' })).resolves.toEqual({ count: 1, errors: 1, benign: 0 });
    expect(sb.rpc).toHaveBeenCalledTimes(1);
  });

  test('a deleted-account FK rejection is benign: not logged, not counted as an error', async () => {
    mockRows.push({ id: 'a', raised_at: 1000 });
    telemetry.isDeletedAccountFkError.mockImplementation(() => true);
    const sb = client(async () => ({ data: null, error: { message: 'fk', code: '23503' } }));
    expect(await pushEdPatternFlags(sb, { userId: 'u1' })).toEqual({ count: 0, errors: 0, benign: 1 });
    expect(telemetry.logSyncError).not.toHaveBeenCalled();
  });

  test('a server without migrate_182 (PGRST202) is a quiet skip: the loop stops, nothing is counted, nothing reaches Sentry as an error', async () => {
    mockRows.push({ id: 'a', raised_at: 1000 }, { id: 'b', raised_at: 2000 }, { id: 'c', raised_at: 3000 });
    const sb = client(async () => ({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.ed_flag_push' } }));
    expect(await pushEdPatternFlags(sb, { userId: 'u1' })).toEqual({ count: 0, errors: 0, benign: 0, skipped: 'rpc_missing' });
    expect(sb.rpc).toHaveBeenCalledTimes(1);
    expect(telemetry.logSyncError).not.toHaveBeenCalled();
    expect(errorLog.logInfo).toHaveBeenCalledTimes(1);
    expect(errorLog.logInfo.mock.calls[0][0]).toBe(`${PUSH_SCOPE}.rpcMissing`);
    expect(errorLog.logInfo.mock.calls[0][1]).not.toMatch(/ed_flag|pattern/i);
  });

  test('a row the args builder refuses is skipped, not sent', async () => {
    mockRows.push({ id: null, raised_at: 1000 }, { id: 'b', raised_at: 2000 });
    const sb = client();
    expect(await pushEdPatternFlags(sb, { userId: 'u1' })).toEqual({ count: 1, errors: 0, benign: 0 });
    expect(sb.rpc).toHaveBeenCalledTimes(1);
  });
});

describe('pushEdPatternFlagsNow (right after a raise or a clear)', () => {
  test('refuses without a user, during a sign-out wipe, and without Article 9 consent, before touching the network', async () => {
    expect(await pushEdPatternFlagsNow(null)).toMatchObject({ count: 0, errors: 0, skipped: 'no_user' });
    mockGuard.isSignOutWiping.mockImplementation(() => true);
    expect(await pushEdPatternFlagsNow('u1')).toMatchObject({ count: 0, errors: 0, skipped: 'signing_out' });
    mockGuard.isSignOutWiping.mockImplementation(() => false);
    for (const consent of [false, null, undefined, 'true']) {
      mockStore.healthConsent = consent;
      expect(await pushEdPatternFlagsNow('u1')).toMatchObject({ count: 0, errors: 0, skipped: 'no_consent' });
    }
    expect(mockSupabase.hasLiveSession).not.toHaveBeenCalled();
    expect(mockSupabase.getSupabaseClient).not.toHaveBeenCalled();
  });

  test('refuses without a live session', async () => {
    mockSupabase.hasLiveSession.mockImplementation(async () => false);
    expect(await pushEdPatternFlagsNow('u1')).toMatchObject({ count: 0, errors: 0, skipped: 'no_session' });
    expect(mockSupabase.getSupabaseClient).not.toHaveBeenCalled();
  });

  test('refuses when the signed-in user is not the row owner (a stale closure across a sign-out and sign-in)', async () => {
    mockRows.push({ id: 'a', raised_at: 1000 });
    const sb = client(undefined, 'someone-else');
    mockSupabase.getSupabaseClient.mockImplementation(() => sb);
    expect(await pushEdPatternFlagsNow('u1')).toMatchObject({ count: 0, errors: 0, skipped: 'session_mismatch' });
    expect(sb.rpc).not.toHaveBeenCalled();
  });

  test('pushes through the live client when the session is the owner\'s (or undeterminable), and never throws', async () => {
    mockRows.push({ id: 'a', raised_at: 1000 });
    const sb = client();
    mockSupabase.getSupabaseClient.mockImplementation(() => sb);
    expect(await pushEdPatternFlagsNow('u1')).toEqual({ count: 1, errors: 0, benign: 0 });
    // An unanswerable session read fails open, like the runner: the RPC scopes by auth.uid() anyway.
    const sb2 = client(undefined, null);
    sb2.auth.getSession = jest.fn(async () => { throw new Error('no auth'); });
    mockSupabase.getSupabaseClient.mockImplementation(() => sb2);
    expect(await pushEdPatternFlagsNow('u1')).toEqual({ count: 1, errors: 0, benign: 0 });
    mockSupabase.getSupabaseClient.mockImplementation(() => { throw new Error('no client'); });
    await expect(pushEdPatternFlagsNow('u1')).resolves.toEqual({ count: 0, errors: 1 });
    expect(telemetry.logSyncError).toHaveBeenCalledWith(`${PUSH_SCOPE}.now`, expect.any(Error));
  });
});

describe('source guards: the wiring and the no-signals boundary', () => {
  const DATABASE = read('src/lib/database.js');
  const SYNC = read('src/lib/sync.js');
  const SCREEN = read('src/screens/CoachOutputScreen.js');
  const REGISTRY = read('src/lib/sync/registry.js');

  test('the row read for the push never selects signals_json, and covers open rows plus recent clears', () => {
    const start = DATABASE.indexOf('export async function getEdPatternFlagsForCloudPush');
    expect(start).toBeGreaterThan(-1);
    const body = DATABASE.slice(start, DATABASE.indexOf('\n}\n', start));
    expect(body).toContain('SELECT id, reason, raised_at, cleared_at FROM ed_pattern_flags');
    expect(body).toContain('AND (cleared_at IS NULL OR cleared_at >= ?)');
    expect(body).toContain('ED_FLAG_PUSH_CLEARED_WINDOW_MS');
    expect(body).not.toContain('signals_json');
    expect(body).not.toContain('SELECT *');
    expect(DATABASE).toContain('export const ED_FLAG_PUSH_CLEARED_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;');
  });

  test('bulkUploadLocalData pushes the flags FIRST in the push phase and folds real failures into the bulk error count', () => {
    const start = SYNC.indexOf('export async function bulkUploadLocalData');
    const end = SYNC.indexOf('\n}\n', start);
    const body = SYNC.slice(start, end);
    const flags = body.indexOf('const flagPush = await pushEdPatternFlags(sb, { userId: supabaseUserId });');
    const exercises = body.indexOf('await syncExercises(supabaseUserId);');
    const prefs = body.indexOf('await _pushAllUserPrefs(sb, supabaseUserId);');
    expect(flags).toBeGreaterThan(-1);
    expect(exercises).toBeGreaterThan(flags);
    expect(prefs).toBeGreaterThan(exercises);
    expect(body).toContain("if (flagPush?.errors > 0) {\n      logBulkWarn('sync.flagPush',");
    expect(body.split('pushEdPatternFlags(').length - 1).toBe(1);
    expect(SYNC).toContain("import { pushEdPatternFlags } from './sync/tables/edPatternFlags';");
  });

  test('CoachOutputScreen pushes right after the raise AND right after the clear, fire-and-forget', () => {
    expect(SCREEN).toContain("import { pushEdPatternFlagsNow } from '../lib/sync/tables/edPatternFlags';");
    const raise = SCREEN.indexOf('await raiseEdPatternFlag(user.id, {');
    const clear = SCREEN.indexOf('await clearEdPatternFlag(user.id);');
    expect(raise).toBeGreaterThan(-1);
    expect(clear).toBeGreaterThan(raise);
    const afterRaise = SCREEN.slice(raise, clear);
    const afterClear = SCREEN.slice(clear, clear + 600);
    expect(afterRaise).toContain('pushEdPatternFlagsNow(user.id).catch(() => {});');
    expect(afterClear).toContain('pushEdPatternFlagsNow(user.id).catch(() => {});');
    // Never awaited on the user's path.
    expect(SCREEN).not.toMatch(/await pushEdPatternFlagsNow/);
  });

  test('the registry entry stays pull_only: the generic engine never owns this row', () => {
    const entry = REGISTRY.slice(REGISTRY.indexOf("table: 'ed_pattern_flags'"));
    expect(entry.slice(0, 300)).toMatch(/direction: 'pull_only'/);
  });
});
