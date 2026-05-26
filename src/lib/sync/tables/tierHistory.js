/**
 * tier_history per-table pull (no push — pull_only,
 * server-authoritative).
 *
 * The cloud tier_history table is the audit log of every tier
 * transition (free → pro, pro → free, refund, expiry, etc.). It
 * is written exclusively by the upgrade_tier RPC + the
 * play-billing-rtdn webhook. The client previously did not pull
 * it; this handler adds that path so SubscriptionScreen and the
 * paywall analytics can render history without round-tripping
 * to the cloud on every open.
 *
 * Local mirror: tier_history table created in database.js (id,
 * user_id, from_tier, to_tier, event_type, occurred_at,
 * payload_json, created_at). The upsert helper does INSERT OR
 * REPLACE because the cloud row is canonical.
 */

import { logSyncError } from '../telemetry';

export async function pullTierHistory(sb, { userId } = {}) {
  if (!sb || !userId) return { count: 0, errors: 0 };
  try {
    const { data, error } = await sb
      .from('tier_history')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      logSyncError('sync.tables.tierHistory.pull', error);
      return { count: 0, errors: 1 };
    }
    if (!data?.length) return { count: 0, errors: 0 };

    // eslint-disable-next-line global-require
    const { upsertTierHistoryFromCloud } = require('../../database');
    let applied = 0;
    let errors = 0;
    for (const row of data) {
      try {
        await upsertTierHistoryFromCloud(userId, row);
        applied += 1;
      } catch (e) {
        errors += 1;
        logSyncError('sync.tables.tierHistory.pullRow', e);
      }
    }
    return { count: applied, errors };
  } catch (e) {
    logSyncError('sync.tables.tierHistory.pull', e);
    return { count: 0, errors: 1 };
  }
}
