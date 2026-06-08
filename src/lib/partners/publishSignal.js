/**
 * publishSignal.js
 *
 * Thin orchestrator that gathers the read-only context a weekly-signal publish
 * needs (planned sessions from the active plan, current goal phase from the
 * latest coach output) and hands it to partnerService.publishWeeklySignal.
 *
 * Kept separate from partnerService so the service stays decoupled from the
 * local database + coaching engine: this is the ONE place that reads them, and
 * it only ever READS (the coaching engine is never modified). Fire-and-forget;
 * every path is swallowed so a call site (workout completion, app foreground)
 * is never blocked or made to throw. No-ops entirely when Training Partners is
 * not enabled for the user (the service's own gate).
 */
import { getWeeklySessionStats, getLatestCoachOutput } from '../database';
import { localWeekStartMs } from '../dayKey';
import { publishWeeklySignal } from './partnerService';

export async function publishMyWeeklySignal(userId) {
  if (!userId) return;
  try {
    const weekStartMs = localWeekStartMs();
    const [stats, coach] = await Promise.all([
      getWeeklySessionStats(userId, weekStartMs).catch(() => ({ completed: 0, planned: 0 })),
      getLatestCoachOutput(userId).catch(() => null),
    ]);
    await publishWeeklySignal({
      sessionsPlanned: stats?.planned ?? 0,
      goalPhase: coach?.goalPhase ?? null,
    });
  } catch (_) { /* fire-and-forget */ }
}
