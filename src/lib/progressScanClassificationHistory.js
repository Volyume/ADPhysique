/**
 * Progress-scan classification history (D18, founder decision 2026-07-09;
 * plan-F §4.3, docs/exercise-planning-2026-07-09/plan-F-photo-corroboration.md).
 *
 * A device-local log of the deterministic v2 classification that
 * `progressScanCheckInEvidence.js` already computes for a scan alongside a
 * check-in. It persists ONLY the two enum labels (`assessment` + `status`) and
 * the moment they were recorded, so a future receipt can surface calm
 * historical context ("supports has held for 3 of your last 4 check-ins")
 * without ever re-reading a photo, a raw score, a body-fat value, or any free
 * text — none of which is stored here.
 *
 * ── Invariants (guard-tested in progressScanClassificationHistory.test.js) ──
 *  - LOCAL ONLY. This table is deliberately absent from the sync layer
 *    (src/lib/sync/registry.js, src/lib/sync.js): progress-photo scans and
 *    every value derived from them stay on the device by constraint and never
 *    leave the phone (safety-privacy-blueprint.md §6.1). This module performs
 *    no network or cloud transfer of any kind.
 *  - NEVER read by the coaching engine. `recordScanClassification` is written
 *    AFTER `runWeeklyCoach` has produced its output; no engine module
 *    (weeklyCoach / coachApply / nutritionEngine / planEngine) imports this
 *    module, so the persisted history can never feed a coaching decision.
 *  - Enum-only shape. Only an `assessment` from PROGRESS_SCAN_ASSESSMENT and a
 *    `status` from PROGRESS_SCAN_EVIDENCE_STATUS are accepted; anything else is
 *    rejected (write is a no-op) so a stray score/photo/free-text value can
 *    never reach the row.
 *  - Suppression parity. The caller only ever composes a packet (and therefore
 *    only ever calls this) when photo surfaces are unsuppressed; under calm
 *    mode / an open ED flag the packet is null, so nothing is recorded.
 */
import { db } from './database';
import { generateUUID } from './uuid';
import { logError } from './errorLog';
import {
  PROGRESS_SCAN_ASSESSMENT,
  PROGRESS_SCAN_EVIDENCE_STATUS,
} from './progressScanCheckInEvidence';

const ASSESSMENT_SET = new Set(PROGRESS_SCAN_ASSESSMENT);
const STATUS_SET = new Set(PROGRESS_SCAN_EVIDENCE_STATUS);

/**
 * Records one classification entry. Best-effort and fail-quiet: a write
 * failure never blocks the check-in that triggered it. Returns the created
 * row id, or null when nothing was written (missing user, invalid enums).
 *
 * @param {string} userId
 * @param {object} entry
 * @param {string} entry.assessment - a PROGRESS_SCAN_ASSESSMENT value.
 * @param {string} entry.status - a PROGRESS_SCAN_EVIDENCE_STATUS value.
 * @param {number} [entry.nowMs] - explicit clock (epoch ms); defaults to now.
 * @returns {Promise<string|null>}
 */
export async function recordScanClassification(userId, { assessment, status, nowMs } = {}) {
  if (!userId) return null;
  // Enum allow-list: never persist anything that is not one of the two closed
  // vocabularies. A value outside them is dropped rather than stored.
  if (!ASSESSMENT_SET.has(assessment) || !STATUS_SET.has(status)) return null;
  try {
    const d = await db();
    const id = generateUUID();
    const t = Number.isFinite(nowMs) ? nowMs : Date.now();
    await d.runAsync(
      `INSERT INTO progress_scan_classification_history
         (id, user_id, assessment, status, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, userId, assessment, status, t],
    );
    return id;
  } catch (e) {
    logError('progressScanClassificationHistory.record', e, { userId });
    return null;
  }
}

/**
 * Reads back the most recent classification entries for a user, newest first.
 * Display-only context; never consumed by any engine.
 *
 * @param {string} userId
 * @param {number} [limit=8]
 * @returns {Promise<Array<{id: string, assessment: string, status: string, createdAt: number}>>}
 */
export async function listScanClassificationHistory(userId, limit = 8) {
  if (!userId) return [];
  try {
    const d = await db();
    const rows = await d.getAllAsync(
      `SELECT id, assessment, status, created_at
         FROM progress_scan_classification_history
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?`,
      [userId, Math.max(1, Math.min(52, Number(limit) || 8))],
    ).catch(() => []);
    return (rows || []).map((row) => ({
      id: row.id,
      assessment: row.assessment,
      status: row.status,
      createdAt: row.created_at,
    }));
  } catch (e) {
    logError('progressScanClassificationHistory.list', e, { userId });
    return [];
  }
}
