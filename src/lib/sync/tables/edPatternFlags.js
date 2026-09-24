/**
 * ed_pattern_flags: the per-table pull, and (since founder decision B,
 * 2026-09-23, register D196, answering D92-11) the dedicated cloud PUSH.
 *
 * Registry entry: pull_only + server_wins + serverAuthoritative, and it
 * STAYS pull_only for the generic engine: its upsert/delete semantics are
 * wrong for a forward-only safety row. The push below is a separate,
 * narrow path through the `ed_flag_push` RPC (migrate_182).
 *
 * CORRECTED RECORD (2026-09-23): the earlier header here claimed the cloud
 * table was "written by the engine (and the upgrade_tier RPC)". Neither
 * was true. The engine writes the device's SQLite only
 * (`raiseEdPatternFlag` / `clearEdPatternFlag` in database.js), no
 * migration writes the table and `upgrade_tier` never touched it, so
 * nothing reached the cloud and every server-side ED gate (partner-cheer,
 * community-notify, migrate_180) was dormant for an engine-raised flag.
 *
 * Pull: select all rows for the user, route each through
 *       upsertEdPatternFlagFromCloud, which is server-wins for everything
 *       EXCEPT a clear: a pulled clear never closes a local OPEN row (the
 *       device's own engine clears its own flag; D196 item 8).
 *
 * Push: `pushEdPatternFlags(sb, { userId })` re-reads the local rows
 *       (`getEdPatternFlagsForCloudPush`: every open row plus rows cleared
 *       in the last 30 days, so a clear reaches the cloud even when the
 *       immediate push missed it) and calls `ed_flag_push` once per row
 *       with the id, raised_at, cleared_at and the short reason code.
 *       NEVER the signals: the detector's health-derived indicators stay
 *       on the device (the RPC has no parameter for them, and nothing on a
 *       second device reads them). The RPC is idempotent and forward only,
 *       so pushing every row on every cycle is safe and cheap (a person
 *       has a handful of flags at most): a re-push of an unchanged row is
 *       a server-side no-op, a clear only ever moves cleared_at forward,
 *       and a stale device can never un-clear a flag. Called FIRST in the
 *       push phase of `bulkUploadLocalData` (so a workout backlog can never
 *       starve the safety row, and it lands before the pull) and, for
 *       latency, right after a raise or a clear via `pushEdPatternFlagsNow`.
 *       Failures are logged and left for the next cycle; no queue row is
 *       needed because every cycle re-pushes.
 *
 * TELEMETRY (review H2): the scope names below are deliberately neutral.
 * The row is Article 9 special-category data, so a Sentry scope tag,
 * breadcrumb or message must never name the flag, its table or the RPC,
 * and no row id ever travels as context. The scrubber
 * (`observability/sentryScrub.js`) also redacts the table and RPC names
 * from any message that carries them, as the second wall.
 */

import { logSyncError, isDeletedAccountFkError } from '../telemetry';
import { isoFromMs } from '../watermark';

/** The most rows one push considers; a person never has more real flags. */
export const ED_FLAG_PUSH_LIMIT = 20;

/** Neutral telemetry scope for the push (see TELEMETRY in the header). */
export const PUSH_SCOPE = 'sync.flagPush';

/**
 * PostgREST's "function not in the schema cache": migrate_182 is not applied
 * on this server yet, so there is nothing to push to. Quiet and uncounted: a
 * counted error every cycle would make every sync look failed and the
 * sign-out push-first safety refuse to wipe the device.
 */
export function isRpcMissingError(err) {
  return (err?.code ?? err?.cause?.code ?? null) === 'PGRST202';
}

export async function pullEdPatternFlags(sb, { userId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    const { data, error } = await sb
      .from('ed_pattern_flags')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      logSyncError('sync.tables.edPatternFlags.pull', error);
      return { count: 0, errors: 1 };
    }
    if (!data?.length) return { count: 0, errors: 0 };

    // eslint-disable-next-line global-require
    const { upsertEdPatternFlagFromCloud } = require('../../database');
    let applied = 0;
    let errors = 0;
    for (const row of data) {
      try {
        await upsertEdPatternFlagFromCloud(userId, row);
        applied += 1;
      } catch (e) {
        errors += 1;
        logSyncError('sync.tables.edPatternFlags.pullRow', e);
      }
    }
    return { count: applied, errors };
  } catch (e) {
    logSyncError('sync.tables.edPatternFlags.pull', e);
    return { count: 0, errors: 1 };
  }
}

/**
 * The RPC arguments for one local row: the id, the timestamps and the short
 * reason code. Exported for the tests, and the ONE place the payload is
 * shaped, so nothing else can ever add a key to it. `signals_json` is never
 * selected by the row read behind the push, and would be dropped here if
 * it were.
 */
export function edFlagPushArgs(row) {
  const raisedMs = Number(row?.raised_at);
  if (!row?.id || !Number.isFinite(raisedMs) || raisedMs <= 0) return null;
  const clearedMs = row.cleared_at == null ? null : Number(row.cleared_at);
  return {
    _id: String(row.id),
    _raised_at: isoFromMs(raisedMs),
    _cleared_at: Number.isFinite(clearedMs) && clearedMs > 0 ? isoFromMs(clearedMs) : null,
    _reason: typeof row.reason === 'string' && row.reason.trim() ? row.reason.trim().slice(0, 80) : null,
  };
}

/**
 * Push every local flag row for `userId` through `ed_flag_push`. Idempotent
 * and forward-only server-side, so this is safe to call on every cycle.
 * Returns { count, errors } like the pull, plus `skipped: 'rpc_missing'`
 * when the server does not carry migrate_182 yet, and `benign` for a
 * deleted-account FK rejection (the server is right; not an app fault and
 * not counted as an error, matching sync.js `logPgErr`). Never throws.
 */
export async function pushEdPatternFlags(sb, { userId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    // eslint-disable-next-line global-require
    const { getEdPatternFlagsForCloudPush } = require('../../database');
    const rows = await getEdPatternFlagsForCloudPush(userId, ED_FLAG_PUSH_LIMIT);
    if (!rows?.length) return { count: 0, errors: 0 };
    let pushed = 0;
    let errors = 0;
    let benign = 0;
    for (const row of rows) {
      // Everything for one row, the args included, inside its own try: a
      // malformed row can never take the rest of the loop down with it.
      try {
        const args = edFlagPushArgs(row);
        if (!args) continue;
        const { error } = await sb.rpc('ed_flag_push', args);
        if (!error) {
          pushed += 1;
          continue;
        }
        if (isRpcMissingError(error)) {
          // eslint-disable-next-line global-require
          require('../../errorLog').logInfo(`${PUSH_SCOPE}.rpcMissing`, 'server function not deployed yet; skipped until it is');
          return { count: pushed, errors, benign, skipped: 'rpc_missing' };
        }
        if (isDeletedAccountFkError(error)) {
          // A deleted account's device holding a live JWT: the server is
          // right to refuse; the session clears itself. Not an app fault.
          benign += 1;
          continue;
        }
        errors += 1;
        logSyncError(PUSH_SCOPE, error);
      } catch (e) {
        errors += 1;
        logSyncError(PUSH_SCOPE, e);
      }
    }
    return { count: pushed, errors, benign };
  } catch (e) {
    logSyncError(PUSH_SCOPE, e);
    return { count: 0, errors: 1 };
  }
}

/**
 * Best-effort immediate push right after a raise or a clear on this device,
 * so the cloud (and every server-side ED gate) learns within seconds rather
 * than at the next sync cycle. Carries the same guards as the sync runner
 * (never during a sign-out wipe, never without Article 9 consent, never
 * without a usable session) plus one of its own: the signed-in user must
 * be the row owner, so a stale closure across a sign-out and sign-in can
 * never push one account's flag under another's session. Never throws;
 * the next cycle's `bulkUploadLocalData` re-pushes whatever this missed.
 */
export async function pushEdPatternFlagsNow(userId) {
  try {
    if (!userId) return { count: 0, errors: 0, skipped: 'no_user' };
    // eslint-disable-next-line global-require
    const { isSignOutWiping } = require('../signOutGuard');
    if (isSignOutWiping()) return { count: 0, errors: 0, skipped: 'signing_out' };
    let healthConsent = null;
    try {
      // eslint-disable-next-line global-require
      healthConsent = require('../../../store/useAppStore').default.getState()?.healthConsent;
    } catch (_) { healthConsent = null; }
    if (healthConsent !== true) return { count: 0, errors: 0, skipped: 'no_consent' };
    // eslint-disable-next-line global-require
    const { getSupabaseClient, hasLiveSession } = require('../../supabase');
    if ((await hasLiveSession()) === false) return { count: 0, errors: 0, skipped: 'no_session' };
    const sb = getSupabaseClient();
    if (!sb) return { count: 0, errors: 0, skipped: 'no_client' };
    let sessionUid = null;
    try {
      const { data } = await sb.auth.getSession();
      sessionUid = data?.session?.user?.id ?? null;
    } catch (_) { sessionUid = null; }
    if (sessionUid !== null && sessionUid !== userId) {
      return { count: 0, errors: 0, skipped: 'session_mismatch' };
    }
    return await pushEdPatternFlags(sb, { userId });
  } catch (e) {
    logSyncError(`${PUSH_SCOPE}.now`, e);
    return { count: 0, errors: 1 };
  }
}
