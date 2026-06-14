/**
 * cancelReason.js — COMP-025-A shared reason-capture
 *
 * The one optional churn question, shared by both capture moments (the
 * pre-store-handoff sheet and the post-lapse sheet). Keeps the enum, the
 * free-text rules and the capture side-effects in one place so the two sheets
 * can't drift.
 *
 * Capture rules (blueprint §4a):
 *   - the reason enum → telemetry `cancel_reason_captured` { reason, surface }
 *     (enum only, no PII)
 *   - the optional free text (missing_feature / switching only) → the existing
 *     user_feedback table via submitFeedback, NEVER telemetry
 */

import { track } from './telemetry';
import { submitFeedback } from './feedback';

// Single-select reasons. Keys are the telemetry enum; plain, shame-free copy.
export const CANCEL_REASONS = Object.freeze([
  { key: 'price',           label: 'It costs too much' },
  { key: 'not_using',       label: "I wasn't using it enough" },
  { key: 'missing_feature', label: "It's missing something I need" },
  { key: 'switching',       label: "I'm switching to another app" },
  { key: 'temporary_break', label: "I'm taking a break from training" },
]);

// Free text appears only for these two reasons.
export const FREE_TEXT_REASONS = new Set(['missing_feature', 'switching']);
export const FREE_TEXT_PROMPT = Object.freeze({
  missing_feature: 'What was missing?',
  switching: 'Which one?',
});

/**
 * Persist a captured reason. Fire-and-forget; never throws. No-op when no
 * reason was selected (answering is always optional).
 *
 * @param {object} args
 * @param {string|null} args.reason   the enum key, or null (skipped)
 * @param {string}      args.text     optional free text
 * @param {string|null} args.userId
 * @param {string}      args.surface  'pre_store_handoff' | 'post_lapse_sheet'
 * @returns {boolean} whether a reason was captured (emitted)
 */
export function captureCancelReason({ reason, text = '', userId = null, surface }) {
  if (!reason) return false;
  try { track(userId, 'cancel_reason_captured', { reason, surface })?.catch?.(() => {}); } catch (_) {}
  const trimmed = (text || '').trim();
  if (trimmed && FREE_TEXT_REASONS.has(reason)) {
    try {
      submitFeedback({
        trigger: 'cancel_reason',
        sentiment: reason,
        message: trimmed.slice(0, 120),
        userId,
      })?.catch?.(() => {});
    } catch (_) {}
  }
  return true;
}
