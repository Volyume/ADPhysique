/**
 * Sentry triage 2026-09-13, source-level regression guards.
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL: three
 * mechanisms were built to stop three families of expected conditions
 * reaching Sentry as defects, and each is the kind of thing a tidy-up could
 * quietly undo without a behavioural test noticing.
 *
 *  VOLYUME-36  A Community RPC refusal the client handles in copy (a visitor
 *              with no profile asking for their groups) reached Sentry from
 *              the Supabase instrumentation. The instrumentation now consults
 *              the transport's own refusal catalogue, under P0001 only, and
 *              the Join screen no longer asks a member-only question for a
 *              visitor who has no profile yet.
 *  VOLYUME-2G  A background wake before the device's first unlock since boot
 *  VOLYUME-2J  cannot read the SQLCipher key. dbCrypto MARKS that deferral,
 *              the database records it, the runner re-probes and stands the
 *              cycle down, and logSyncError files it as information.
 *  VOLYUME-2P  The per-workout upload warning recorded its own headline as
 *              the bulk window's cause, so an offline cycle never read as
 *              all-network. The chunk cause now rides with the throw.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/** The body from `startMarker` to the next top-level declaration after it. */
function fnSpan(text, startMarker) {
  const start = text.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const rest = text.slice(start + startMarker.length);
  const next = rest.search(/\n(?:export |async function |function |const |let )/);
  return next === -1 ? text.slice(start) : text.slice(start, start + startMarker.length + next);
}

describe('VOLYUME-36: expected Community refusals are breadcrumbs', () => {
  const OBS = read('src/lib/observability.js');
  const TRANSPORT = read('src/lib/community/transport.js');
  const JOIN = read('src/screens/CommunityJoinScreen.js');

  test('the transport exports the catalogue check, reading its own EXPECTED_CODES', () => {
    expect(TRANSPORT).toMatch(/export function isExpectedCommunityRefusal\(message\) \{\s*return EXPECTED_CODES\.has\(String\(message \?\? ''\)\.trim\(\)\);/);
  });

  test('the instrumentation gates on P0001 and consults the transport lazily, failing to "not expected"', () => {
    const fn = fnSpan(OBS, 'function _isExpectedRpcRefusal');
    expect(fn).toContain("if (err?.code !== 'P0001') return false;");
    expect(fn).toContain("require('./community/transport')");
    expect(fn).toMatch(/catch \(_\) \{\s*return false;/);
  });

  test('the refusal branch runs before the warning branch, for rpc only, and never on a throw', () => {
    const start = OBS.indexOf('function recordOutcome');
    const outcome = OBS.slice(start, OBS.indexOf('__volyumeInstrumented = true', start));
    const refusal = outcome.indexOf("if (op === 'rpc' && !didThrow && _isExpectedRpcRefusal(err))");
    const warning = outcome.indexOf('if (didThrow || err) {');
    expect(refusal).toBeGreaterThan(-1);
    expect(warning).toBeGreaterThan(refusal);
    expect(outcome.slice(refusal, warning)).toContain('track.breadcrumb(`db.rpc.refused supabase.${table}');
  });

  test('the Join screen asks for groups only once a profile exists', () => {
    expect(JOIN).toContain('const joined = hasProfile(me);');
    const effect = JOIN.slice(JOIN.indexOf('const joined = hasProfile(me);'), JOIN.indexOf('}, [joined]);'));
    expect(effect.indexOf('if (!joined) { setHasGroups(false); return undefined; }')).toBeGreaterThan(-1);
    expect(effect.indexOf('if (!joined)')).toBeLessThan(effect.indexOf('await listMyGroups()'));
  });
});

describe('VOLYUME-2G / 2J: a deferred database stands sync down quietly', () => {
  const CRYPTO = read('src/lib/dbCrypto.js');
  const DB = read('src/lib/database.js');
  const RUNNER = read('src/lib/sync/runner.js');
  const TELEMETRY = read('src/lib/sync/telemetry.js');

  test('dbCrypto marks the locked-device deferral, and only that one, before the throw', () => {
    const branch = CRYPTO.slice(
      CRYPTO.indexOf("const err = new Error('SQLCipher key unavailable and existing DB is not plaintext-readable');"),
    );
    const marked = branch.indexOf('err.dbCryptoDeferred = true;');
    const thrown = branch.indexOf('throw err;');
    expect(marked).toBeGreaterThan(-1);
    expect(thrown).toBeGreaterThan(marked);
    expect(branch.slice(0, thrown)).toMatch(/if \(locked\) \{\s*err\.dbCryptoDeferred = true;/);
    expect(branch.slice(0, thrown)).toMatch(/\} else \{\s*logError\('dbCrypto\.keyUnavailable', err, \{\}\);/);
  });

  test('the database records the deferral from the marker alone, and clears it on success', () => {
    expect(DB).toContain('export function isDatabaseDeferred() {\n  return _initDeferredAt != null;\n}');
    expect(DB).toContain('_initDeferredAt = e?.dbCryptoDeferred === true ? Date.now() : null;');
    expect(DB).toMatch(/_doInit\(\)\.then\(\(handle\) => \{\s*_initDeferredAt = null;\s*return handle;/);
  });

  test('the runner re-probes the open instead of trusting the flag, and fails OPEN on anything else', () => {
    const probe = fnSpan(RUNNER, 'async function _dbDeferredNow()');
    expect(probe).toContain('database.isDatabaseDeferred() !== true');
    expect(probe).toContain('await database.initDatabase();');
    expect(probe).toContain('return e?.dbCryptoDeferred === true;');
    expect(probe).toMatch(/catch \(_\) \{\s*return false;/);
  });

  test('the run guard, the loops, and both legacy tracks stand down on the deferral', () => {
    expect(RUNNER).toContain("if (userId && await _dbDeferredNow()) {\n    return { status: 'skipped', reason: 'db_deferred' };");
    expect(RUNNER).toContain("if (e?.dbCryptoDeferred === true) return { count: 0, errors: 0, skipped: 'db_deferred' };");
    expect(RUNNER.match(/if \(result\?\.skipped === 'db_deferred' \|\| await _dbDeferredNow\(\)\) \{ dbDeferred = true; break; \}/g)).toHaveLength(2);
    expect(RUNNER).toContain("if (!dbDeferred && typeof sync.bulkUploadLocalData === 'function' && localUserId)");
    expect(RUNNER).toContain("if (!dbDeferred && !isSignOutWiping() && typeof sync.pullFromCloud === 'function')");
  });

  test('the error log classifies the deferral once, for every catch site, from the marker alone', () => {
    const ERRORLOG = read('src/lib/errorLog.js');
    const fn = fnSpan(ERRORLOG, 'export function logError(scope, error, context) {');
    const demote = fn.indexOf('if (error?.dbCryptoDeferred === true) {');
    const build = fn.indexOf("buildEntry('error', scope, error, safeContext)");
    expect(demote).toBeGreaterThan(-1);
    expect(build).toBeGreaterThan(demote);
    expect(fn.slice(demote, build)).toContain('return logInfo(`${scope}.dbDeferred`');
  });

  test('the navigator treats a deferred open as not yet, never as the failure screen, and re-attempts on foreground', () => {
    const NAV = read('src/navigation/RootNavigator.js');
    expect(NAV).toMatch(/import \{ View, Text, StyleSheet, AppState \} from 'react-native';/);
    const attempt = NAV.slice(NAV.indexOf('const attemptDbInit = useCallback(async () => {'), NAV.indexOf('const attemptDbInitRef = useRef(null);'));
    const deferred = attempt.indexOf('if (e?.dbCryptoDeferred === true) {');
    const failed = attempt.indexOf('setDbInitFailed(true);');
    expect(deferred).toBeGreaterThan(-1);
    expect(failed).toBeGreaterThan(deferred);
    const branch = attempt.slice(deferred, failed);
    expect(branch).toContain("logInfo('RootNavigator.bootstrap.initDb.deferred'");
    expect(branch).toContain('armDbDeferredRetry();');
    expect(branch).toMatch(/armDbDeferredRetry\(\);\s*return false;\s*\}/);
    expect(branch).not.toContain('setDbInitFailed(true)');
    const arm = fnSpan(NAV, 'const armDbDeferredRetry = useCallback(() => {');
    expect(arm).toContain("AppState.addEventListener('change'");
    expect(arm).toContain("if (state !== 'active') return;");
    expect(arm).toContain('attemptDbInitRef.current?.();');
    expect(arm).toContain('if (dbDeferredSubRef.current) return;');
  });

  test('logSyncError files the deferral as information, before any other classification', () => {
    const fn = TELEMETRY.slice(TELEMETRY.indexOf('export function logSyncError'));
    const deferred = fn.indexOf('if (isDbDeferredError(err)) {');
    const residual = fn.indexOf('if (isDeletedAccountFkError(err)) {');
    const error = fn.indexOf('logError(scope, err, ctx);');
    expect(deferred).toBeGreaterThan(-1);
    expect(residual).toBeGreaterThan(deferred);
    expect(error).toBeGreaterThan(residual);
    expect(fn.slice(deferred, residual)).toContain('`${scope}.dbDeferred`');
  });
});

describe('VOLYUME-2P: the workout upload warning carries its cause', () => {
  const SYNC = read('src/lib/sync.js');

  test('logBulkWarn notes the cause when given one, else the message', () => {
    expect(SYNC).toContain('function logBulkWarn(scope, message, meta, cause = null) {');
    expect(SYNC).toContain("_noteBulkError(typeof cause === 'string' && cause ? cause : message);");
  });

  test('_upsertSets attaches the last chunk cause to its throw, message and code only', () => {
    const fn = fnSpan(SYNC, 'async function _upsertSets');
    expect(fn).toContain('lastChunkError = error;');
    expect(fn).toContain("err.causeMessage = typeof lastChunkError?.message === 'string' ? lastChunkError.message.slice(0, 200) : null;");
    expect(fn).toContain('err.causeCode = lastChunkError?.code ?? null;');
    expect(fn).not.toMatch(/err\.rows|err\.chunk\b|err\.payload/);
  });

  test('the per-workout warning records the cause, and judges network by the cause', () => {
    const block = SYNC.slice(SYNC.indexOf("logBulkWarn('sync.bulkUploadLocalData', 'workout upload failed', {"));
    const end = block.indexOf('}, cause);');
    expect(end).toBeGreaterThan(-1);
    const call = block.slice(0, end);
    expect(call).toContain('cause,');
    expect(call).toContain('lastError: cause,');
    expect(call).toContain('allNetwork: isNetworkNoise(cause) && _bulkPushAllNetwork,');
  });
});
