/**
 * Canonical event names per TELEMETRY_DASHBOARDS_LOCKED.md
 * Event catalogue. Source of truth for both the client-side
 * allow-list and the server-side record_engine_telemetry
 * CHECK list. Adding a new event here is the only step needed;
 * the transport.js push picks it up automatically.
 *
 * Keep this file FLAT (no imports beyond core) so static analysis
 * can read it without evaluating side-effect code.
 *
 * The TELEMETRY_EVENTS array drives:
 *   1. the client-side allow-list in transport.js
 *   2. the source-scan acceptance test
 *      (TELEMETRY_DASHBOARDS_LOCKED.md "Acceptance check": every
 *       event in the catalogue has a corresponding track() call
 *       in the codebase, verified by a test scanning the source)
 *
 * Events with `deferred: true` are catalogued for future work but
 * have no current emitter; the source-scan test allows them. Move
 * to `deferred: false` once a track() call site lands.
 */

export const TELEMETRY_EVENTS = Object.freeze([
  // Panel 2: engine health
  { name: 'ed_pattern_flag_fired',           deferred: false, panel: 2 },
  { name: 'ed_pattern_flag_cleared',         deferred: false, panel: 2 },
  { name: 'goal_lock_set',                   deferred: false, panel: 2 },
  { name: 'goal_lock_cleared',               deferred: false, panel: 2 },
  { name: 'weekly_coach_run',                deferred: false, panel: 2 },
  { name: 'ffm_floor_hold_fired',            deferred: false, panel: 2 },
  { name: 'rapid_loss_compression_triggered',deferred: false, panel: 2 },

  // Panel 3: food layer
  { name: 'food_lookup_barcode',             deferred: false, panel: 3 },
  { name: 'ocr_writeback_attempted',         deferred: false, panel: 3 },
  { name: 'food_logged',                     deferred: false, panel: 3 },
  { name: 'food_search_attempt',             deferred: false, panel: 3 },
  { name: 'custom_food_created',             deferred: false, panel: 3 },
  // Food audit D-6 + P-7: data-quality + assembly observability. Counts/flags +
  // coded reasons only, never food names or values.
  //   meal_plan_assembled       per-generate: kind, dayCount, withinTolerance,
  //                             unfilledDays, fatInBand, maxCloseOutIterations
  //   food_promote_failed       a network food never cached (source only)
  //   ocr_low_confidence_saved  a custom food saved with low-confidence OCR
  //                             fields (count of flagged fields only)
  //   food_sanity_check_failed  sanity gate tripped (coded reason + edit/override)
  // Server allow-list: supabase/migrate_085_food_quality_telemetry.sql.
  { name: 'meal_plan_assembled',             deferred: false, panel: 3 },
  { name: 'food_promote_failed',             deferred: false, panel: 3 },
  { name: 'ocr_low_confidence_saved',        deferred: false, panel: 3 },
  { name: 'food_sanity_check_failed',        deferred: false, panel: 3 },

  // Panel 4: sync health
  { name: 'sync_run',                        deferred: false, panel: 4 },
  { name: 'sync_conflict_resolved',          deferred: false, panel: 4 },

  // Panel 5: cascade + conversion
  { name: 'tier_changed',                    deferred: false, panel: 5 },
  { name: 'cascade_started',                 deferred: false, panel: 5 },
  { name: 'cascade_advanced',                deferred: false, panel: 5 },
  { name: 'cascade_skipped_ahead',           deferred: false, panel: 5 },
  { name: 'cascade_state_transition',        deferred: false, panel: 5 },
  { name: 'paid_converted',                  deferred: false, panel: 5 },
  { name: 'churn_at_gate',                   deferred: false, panel: 5 },
  { name: 'subscription_cancelled',          deferred: false, panel: 5 },
  { name: 'paywall_shown',                   deferred: false, panel: 5 },
  { name: 'paywall_tapped_cta',              deferred: false, panel: 5 },
  // COMP-025-A: cancellation-reason capture. enum reason + surface only, no
  // PII (free text routes to user_feedback, never here).
  //   reason  = price|not_using|missing_feature|switching|temporary_break
  //   surface = pre_store_handoff|post_lapse_sheet
  // Server allow-list: supabase/migrate_079_cancel_reason_telemetry.sql.
  { name: 'cancel_reason_captured',          deferred: false, panel: 5 },
  { name: 'purchase_initiated',              deferred: false, panel: 5 },
  { name: 'purchase_completed',              deferred: false, panel: 5 },
  { name: 'purchase_failed',                 deferred: false, panel: 5 },
  { name: 'restore_purchases_attempted',     deferred: false, panel: 5 },

  // Panel 6: notifications
  { name: 'notification_sent',               deferred: false, panel: 6 },
  { name: 'notification_tapped',             deferred: false, panel: 6 },
  { name: 'notification_failed',             deferred: false, panel: 6 },

  // Panel 8: privacy + consent
  { name: 'article9_consent_recorded',       deferred: false, panel: 8 },
  { name: 'article9_consent_withdrawn',      deferred: false, panel: 8 },
  { name: 'account_created',                 deferred: false, panel: 8 },
  // account_deleted: cannot fire from the client because
  // engine_telemetry.user_id has ON DELETE CASCADE; the
  // non-cascading account_deletions_log table (migration 039) is
  // the surviving audit trail. The locked catalogue lists the
  // event so the dashboard mapping is recorded; no track() call.
  { name: 'account_deleted',                 deferred: true,  panel: 8,
    deferralReason: 'cascade-deleted with auth.users; replaced by account_deletions_log per CURRENT_STATUS.md § 4' },

  // Panel 1: lifecycle
  { name: 'sign_in',                         deferred: false, panel: 1 },
  { name: 'sign_out',                        deferred: false, panel: 1 },
  { name: 'app_cold_start',                  deferred: false, panel: 1 },
  { name: 'app_foregrounded',                deferred: false, panel: 1 },
  { name: 'app_backgrounded',                deferred: false, panel: 1 },

  // Panel 1: core engagement (LB-8). The activation + retention loop:
  // started a session, finished one, activated a plan. Payloads carry
  // counts/flags only, never training content.
  { name: 'workout_started',                 deferred: false, panel: 1 },
  { name: 'workout_completed',               deferred: false, panel: 1 },
  { name: 'plan_activated',                  deferred: false, panel: 1 },

  // Held-decision umbrella per spec but unused: the per-type events
  // (ed_pattern_flag_fired, ffm_floor_hold_fired,
  // rapid_loss_compression_triggered) already populate Panel 2
  // split-by-type. CURRENT_STATUS.md § 4 confirms the umbrella adds
  // no signal.
  { name: 'held_decision_created',           deferred: true, panel: 2,
    deferralReason: 'per-type events already cover Panel 2; umbrella duplicates without adding signal' },
  { name: 'held_decision_cleared',           deferred: true, panel: 2,
    deferralReason: 'same as held_decision_created' },

  // COMP-015: visible session autoregulation. coverage + trust metrics.
  // Payloads carry muscle keys + direction only, never training content.
  // Server allow-list: supabase/migrate_073_session_adjustment_telemetry.sql.
  { name: 'session_adjustment_shown',        deferred: false, panel: 2 },
  { name: 'session_adjustment_reverted',     deferred: false, panel: 2 },

  // COMP-006: methodology page open (trust formation). source param only
  // (why_block / held_decisions / you_tab / paywall); no PII.
  // Server allow-list: supabase/migrate_074_methodology_telemetry.sql.
  { name: 'methodology_opened',              deferred: false, panel: 2 },

  // COMP-005: recap story open. variant param only (month / block); no PII.
  // Server allow-list: supabase/migrate_075_recap_telemetry.sql.
  { name: 'recap_opened',                    deferred: false, panel: 2 },

  // COMP-013: first-session activation choice on the Home hero first-run
  // variant. choice param only (short / full); no PII.
  // Server allow-list: supabase/migrate_076_first_session_choice_telemetry.sql.
  // Deferred (founder 2026-06-30): the Home first-run hero variant was retired
  // — the full session is now the single primary action — so this event has no
  // emitter. Catalogue entry kept so the server allow-list/dashboard is intact.
  { name: 'first_session_choice',            deferred: true, panel: 1, deferralReason: 'Home first-run hero variant retired 2026-06-30; no emitter' },

  // COMP-019: chart window changed (interactive charts). chart_id + window
  // labels only (e.g. weight/e1rm/volume, 3M); no PII, no values.
  // Server allow-list: supabase/migrate_077_chart_window_telemetry.sql.
  { name: 'chart_window_changed',            deferred: false, panel: 1 },

  // COMP-018: weekly consistency streak. Derived values only — week state, a
  // run-length bucket, the target source, a milestone number, a pause-duration
  // bucket; never any training or body data.
  // Server allow-list: supabase/migrate_078_streak_telemetry.sql.
  { name: 'streak_week_resolved',            deferred: false, panel: 1 },
  { name: 'streak_milestone_reached',        deferred: false, panel: 1 },
  { name: 'streak_paused',                   deferred: false, panel: 1 },

  // Share-card landmarks (audit S-011, Sentry VOLYUME-1P). Emitted via
  // fireLandmarkOnce → track() on the Analytics screen; both gate a "Make a
  // card" share CTA. They were wired in the client but never catalogued, so the
  // allow-list dropped them with an "unknown event" warning once per app run.
  //   tonnage_milestone_reached  payload: { milestone } — lifetime-tonnage band
  //   perfect_month_reached      payload: { sessions }  — a month all on target
  //   longest_run_pb_reached     payload: { weeks }     — a new longest-run PB (S2c)
  // Counts/enums only, never training or body data. Suppressed under ED/calm.
  // Server allow-list: supabase/migrate_093_landmark_telemetry.sql (extended by
  // supabase/migrate_101_longest_run_pb_telemetry.sql).
  { name: 'tonnage_milestone_reached',       deferred: false, panel: 1 },
  { name: 'perfect_month_reached',           deferred: false, panel: 1 },
  { name: 'longest_run_pb_reached',          deferred: false, panel: 1 },

  // COMP-026 (B): step-trend TDEE modifier evaluated on a coach run. Counts and
  // flags only (active/direction/gain bucket, agreement, logged-day counts,
  // adjustment magnitudes at 0.50 vs the applied gain); no PII, no step counts,
  // no weight. Server allow-list: supabase/migrate_080_step_tdee_telemetry.sql.
  { name: 'step_tdee_modifier_evaluated',    deferred: false, panel: 2 },

  // NEW-002: training partners. Counts and booleans ONLY, NEVER partner
  // identity. invite_sent -> invite_accepted is the pairing-rate funnel;
  // cheer_sent carries a `reciprocal` boolean (the Strava finding: reciprocity,
  // not volume, is the active ingredient); blocked is expected ~0 (any sustained
  // nonzero triggers a design review). Server allow-list:
  // supabase/migrate_081_training_partners.sql.
  { name: 'partner_invite_sent',             deferred: false, panel: 1 },
  { name: 'partner_invite_accepted',         deferred: false, panel: 1 },
  { name: 'partner_cheer_sent',              deferred: false, panel: 1 },
  { name: 'partner_blocked',                 deferred: false, panel: 1 },

  // COMP-030: one consolidated event emitted on account_created carrying the
  // pre-account quiz step timings + variant flag (pre-account events cannot
  // reach the server — the RPC requires auth.uid()). Deferred until quiz-first
  // is enabled (ONBOARDING_QUIZ_FIRST) and the emitter is wired at
  // account_created; a server allow-list migration lands with that wiring.
  { name: 'onboarding_quiz_completed',       deferred: true,  panel: 1,
    deferralReason: 'emitted at account_created only when ONBOARDING_QUIZ_FIRST is on; wiring + server allow-list land together' },

  // E7.2: the activation + conversion funnel baseline. The events not listed
  // here already ride existing rails (trial start = cascade_started, subscribe
  // = paid_converted, gate outcomes = churn_at_gate/cascade_skipped_ahead,
  // paywall = paywall_shown/paywall_tapped_cta), so only the genuinely new
  // ones are added. Counts/flags/small enums only; never food or training
  // content, weight or steps. first_* fire once per user via the durable
  // telemetry_firsts table (trackFirst). Server allow-list:
  // supabase/migrate_099_funnel_telemetry.sql.
  //   onboarding_step_completed  payload: { step } — a forward wizard advance
  //   first_plan_generated       first-ever plan generation (once)
  //   first_workout_logged       first-ever completed workout (once)
  //   first_food_logged          first-ever food-diary entry (once)
  //   trial_lapse_day1_return    a cascade-expired user reopened the app
  { name: 'onboarding_step_completed',       deferred: false, panel: 1 },
  { name: 'first_plan_generated',            deferred: false, panel: 1 },
  { name: 'first_workout_logged',            deferred: false, panel: 1 },
  { name: 'first_food_logged',               deferred: false, panel: 1 },
  { name: 'trial_lapse_day1_return',         deferred: false, panel: 1 },
]);

/**
 * Set of event names that are currently emittable (deferred=false).
 * Used by transport.js as the runtime allow-list.
 */
export const ALLOWED_EVENTS = new Set(
  TELEMETRY_EVENTS.filter(e => !e.deferred).map(e => e.name),
);

/**
 * Names a deferred event explicitly so the source-scan test knows
 * not to demand a track() call site.
 */
export function isDeferred(eventName) {
  const e = TELEMETRY_EVENTS.find(x => x.name === eventName);
  return e ? !!e.deferred : false;
}
