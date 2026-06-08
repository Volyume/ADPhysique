# Trial Audit 02 — Trial expiry

Date: 2026-06-08. Citations from files read directly.

## EXPIRY DETECTION

**Where / the exact function + calculation.** Server-side pg_cron worker
`cascade_advance_due_users` (deployed body):
`supabase/migrate_068_tier_trigger_guc_bypass.sql:417-461`:
- `:431-435` selects rows where `trial_state='pro_trial_active' AND
  pro_trial_ends_at IS NOT NULL AND pro_trial_ends_at <= started_at` (i.e.
  `now()`).
- `:438-442` `UPDATE users_profile SET trial_state='cascade_expired',
  tier='free'`.
- `:444-449` writes a `tier_history` row (`pro_trial → free`, `auto_downgrade`).
`pro_trial_ends_at = trial_started_at + interval '14 days'` (`:123`).

**Proactive or reactive?** PROACTIVE on the server: scheduled every 15 minutes by
`supabase/migrate_031_cascade_workers.sql:127-131`
`cron.schedule('cascade-advance-due-users', '*/15 * * * *', $cron$SELECT
cascade_advance_due_users();$cron$)`. (031 set the schedule; 068 re-created the
function it calls.) On the CLIENT it is reactive only — the client learns of the
downgrade on the next `refreshTierFromCloud`.

**No client-side expiry check.** The client computes days for display only:
`src/lib/payments/cascade.js:daysRemaining (:330-344)`, read by
`src/screens/SubscriptionScreen.js:49`. Nothing on the client compares `now` to
`pro_trial_ends_at` and sets `tier='free'` (verified absent in `checkTier
:507-523` and `refreshTierFromCloud :784-848`).

**What happens at the moment of expiry (full trace).** Server: the cron tick →
`cascade_advance_due_users` → the UPDATE above + `tier_history` insert. Client:
nothing until the next `refreshTierFromCloud` reads `tier='free'` (`useAppStore.js
:789, :810, :819, :829-839`), which then flips `store.tier` and every gate.

## THE GOOGLE PLAY PROMPT AT TRIAL EXPIRY (spec Step 2)

**The screen.** `src/screens/CascadeGateScreen.js`. Variant `day14` content
`:62-75`: title `'Your Pro trial is winding down'` (`:66`), primaryCta `'Stay on
Pro'` (`:68`), tertiaryCta `'Drop to Free'` (`:72`).

**It is a dismissible modal, not a wall.** Registered
`presentation: 'modal'` at `src/navigation/RootNavigator.js:357`; it has a close
(X) button at `CascadeGateScreen.js:214-216` whose handler `dismiss` just goes
back (`:107-109`).

**What triggers it (the only two paths).**
1. Tapping the trial-ending **notification**:
   `src/lib/notifications/notificationRoute.js:24-27` maps `data.type ===
   'cascade_gate'` → `{ tab:'ProfileTab', screen:'CascadeGate',
   params:{variant:'day14'} }`. The notifications are local one-shots scheduled
   in `src/lib/notifications/scheduler.js:scheduleCascadeGateNotifications
   (:238-292)` from `startCascade` (`cascade.js:142-148`): one at the trial-end
   instant (`:253-254`, copy `:222-225`), one 2 days before (`:256-258`, copy
   `:218-221`).
2. Manually: `src/screens/SubscriptionScreen.js:123`
   `navigation.navigate('CascadeGate', { variant:'day14', period })`.

**There is NO automatic / launch-time / Home-screen trigger.** Verified by direct
read: `src/screens/HomeScreen.js` and `App.js` contain no `CascadeGate`
navigation and no `stageOf`/`daysRemaining` gate.
- GAP vs spec Step 2 ("after 14 days … they ARE PRESENTED with a Google Play
  subscription prompt"): presentation is **not guaranteed**. It depends on the
  user having granted notification permission (the day-12 notice is a local
  notification, `scheduler.js:268-280`) or the user opening Subscription
  themselves. If notifications are denied, no prompt is shown at expiry; the
  trial silently lapses to Free. Severity: HIGH (flow does not match spec).

**Can the user dismiss and keep Pro?** The gate is dismissible (`:214`,
`:107-109`). After the server worker has run, the server `tier='free'`, so once
`refreshTierFromCloud` lands the gates block. But until that cloud read completes,
and entirely offline, `store.tier` is the cached value — see Phase 5.

**Delay between expiry and the prompt / Pro-access window.** Yes. The worker runs
up to 15 minutes after the 14-day instant (`migrate_031:129`), and the client only
reflects it on the next `refreshTierFromCloud`; offline it never reflects. During
that window the cached `store.tier='pro'` keeps Pro accessible. GAP (Phase 5).

## DOWNGRADE TO FREE ON NON-SUBSCRIPTION (spec Step 4)

**What removes Pro access.** The server worker UPDATE
(`migrate_068:438-442`, `tier='free'`). There is no client downgrade function for
the trial path.

**Automatic or on next open?** The DB write is automatic (cron). The client
effect happens on the next `refreshTierFromCloud` (`useAppStore.js:784-848`) —
i.e. effectively "on next online foreground," not at the instant of expiry.

**After downgrade, can Pro still be accessed? — the gates (each reads `store.tier`):**
- Component gate: `src/components/ProGate.js:31` (`tier==='pro'` else lock).
- Route guard: `src/components/ProGate.js:126` (`tier!=='pro'` → `ProLocked`).
- Guarded routes: `RootNavigator.js:114-120` (WeeklyCheckIn, NutritionTargets,
  BodyMetrics, CoachOutput, ProGoalSetup, CoachingReminders, + cardio).
Each blocks correctly **for the value of `store.tier`**. Therefore "Pro features
become inaccessible" (spec Step 4) holds **only once `store.tier` has been
reconciled to the server `free`**. Offline / in the launch window it does not —
see Phase 5 (offline + startup-timing bypasses). Severity: CRITICAL (Pro access
when not entitled) — detailed in 05/06b.
