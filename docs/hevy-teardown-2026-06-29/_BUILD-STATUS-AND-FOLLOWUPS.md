# Hevy-teardown build wave — status, review sign-offs & follow-ups

_Last updated: 2026-06-29. Work from the SOURCE files named below, never this summary._

This records the P1 build wave that lands six features from the Hevy teardown,
the adversarial-review sign-offs, the fixes applied after review, and the
items deliberately DEFERRED (with the exact code locations to work from).

## Features built (all on `claude/codebase-audit-docs-pv6mjd`, merged to main)

1. **Plan folders** — `supabase/migrate_089_plan_folders.sql`,
   `src/lib/sync/tables/planFolders.js`, `src/screens/PlansScreen.js`,
   `database.js` (`getPlanFolders`/`setPlanFolder`/`deletePlanFolder`, v48 migration).
   FREE feature (plan library is free). Folder delete unfiles plans (FK
   `ON DELETE SET NULL`), never deletes them.
2. **Food-delete tombstones** — `supabase/migrate_090_food_delete_tombstones.sql`,
   `src/lib/sync/tables/foodDomain.js`, `src/lib/food/db.js` (v49). Cross-device
   delete sync for `food_favourites` + `daily_water`.
3. **exercise_type axis** — `supabase/migrate_091_exercise_type.sql`,
   `src/components/SetEntry.js`, `src/screens/ActiveWorkoutScreen.js`,
   `src/lib/seedExercises.js`, `database.js` (v50). Types: weight_reps,
   weighted_bodyweight, reps_only, duration, distance.
4. **Recovery heatmap** — `src/lib/muscleRecovery.js`, `src/screens/VolumeHeatmapScreen.js`.
   Pure/deterministic freshness band over days-since-trained. CVD-safe palette.
5. **Save-to-gallery / Share-to-Stories** — `src/screens/ShareCardScreen.js`,
   `app.json` (expo-media-library plugin). Share to Stories uses the OS share
   sheet (a bare `instagram-stories://` openURL can't carry the image).
6. **Rest-timer notification actions** — `src/lib/notifications/restTimerActions.js`,
   `categories.js`, `channels.js`, `listeners.js`, `activeWorkout.js`,
   `src/components/RestTimer.js`. Android-only; needs a fresh native build
   (registering a notification category does not take effect over OTA).

## Adversarial review (7 fresh-eyes agents, no authorship bias) — 2026-06-29

- **Migrations 089/090/091:** APPROVED FOR LIVE DEPLOY by two independent
  reviewers. Additive, idempotent, RLS-correct, CHECK-safe. The 480-line 090 is
  legitimate (plpgsql `CREATE OR REPLACE` restates whole RPC bodies; only the
  two intended branches changed vs migrate_016 pull / migrate_023 push).
- **Sync layer:** SOUND. plan_folders wired in registry + transport
  MIGRATED_TABLES; tombstones round-trip; pull watermark holds at `server_ts−1ms`.
- **Sacred rules:** NO VIOLATIONS (billing, AI boundary, ED-safety floors,
  free/Pro gating, kg-only gym weights, British English, deps). One new
  founder-approved dependency: `expo-media-library` (MIT).
- **weight_reps byte-identical:** confirmed; PR detection gated to
  weight_reps/weighted_bodyweight only.

### Fixes applied after review (this wave)
- **exercise_type read-back leak (HIGH, was reachable via duration/reps_only):**
  `LoggedSetRow` + SetEntry live e1RM are now exercise_type aware via the new
  pure `formatLoggedSet`/`formatSeconds` in `src/lib/workoutHelpers.js`
  (tested in `workoutHelpers.test.js`). A logged run no longer prints
  "400kg × 90" + a bogus "Est. max".
- **IG empty-Story:** `handleShareToStories` now goes straight to the OS share
  sheet (deep link removed).
- **restTimerActions defensive guard:** store read/dispatch wrapped so a stale
  notification tap against a torn-down store can never crash.
- **migrate_089 header:** corrected the misleading "STAGING" note — it
  auto-deploys to the LIVE EU-Dublin project.

## Follow-up wave (RESOLVED) — review items now fixed

### A. Load-sum distance pollution — FIXED (was dormant, now hardened everywhere)
`distance` reuses the `weight` column for metres and `reps` for seconds. The
exclusion `COALESCE(ce.exercise_type, e.exercise_type, 'weight_reps') NOT IN
('distance','duration')` (with LEFT JOINs onto `exercises` + `custom_exercises`
keyed on `(id, user_id)`) now covers ALL load/e1RM sums, not just
`calculateTonnage`/`getLifetimeTonnage`:
- `src/lib/database.js` → `getAcuteChronicWorkload` (the safety-adjacent ACWR;
  the change can only DROP non-load sets — it cannot raise load or touch any
  calorie floor / ED-safety value)
- `src/lib/database.js` → `getYearOfLiftsData`
- `src/lib/database.js` → `getWeeklyPRCount` (both subqueries; distinct e2/ce2
  aliases) and `getBestLiftThisWeek` (weekSets + priorRows)
- `src/lib/database.js` → `getRecapData`, `getBlockReflectionData`
- `buildExerciseMetricSeries` — MOVED to `src/lib/liftProgress.js` (so it's
  testable without native deps) + an optional `exerciseTypeById` map that skips
  distance/duration. Tested in `src/lib/__tests__/liftProgress.metricSeries.test.js`.

Default-when-unknown is preserved (LEFT JOIN + COALESCE → weight_reps), so
ordinary lifting tonnage/PRs are byte-identical. The SQL sites are device-tested
by repo convention, so they were additionally reviewed by a fresh-eyes SQL agent.

### B. UX paper-cuts — FIXED
- `src/screens/PlansScreen.js` — the "New folder" entry point now also shows when
  the only plan is the active one (`|| !!activePlan`); `handleSaveFolder` rejects
  a duplicate folder name (case-insensitive, excluding the folder being renamed).
- `src/screens/VolumeHeatmapScreen.js` — "Recently trained" recoloured from
  `stateColors.act` (red, read as a warning) to `stateColors.neutral` (calm
  "resting"); dot + legend both follow `FRESHNESS_META`, a11y label unchanged.

### C. Notification "Complete set" — FIXED (open-and-confirm for ghosts)
- `src/screens/ActiveWorkoutScreen.js` — the lock-screen "Complete set" action
  no longer blind-logs. It now refuses to log when the current set is still an
  unconfirmed ghost prefill (`currentSetGhostRef`), letting
  `opensAppToForeground` bring the user in to confirm; when they've entered real
  values it completes one-tap as before. `handleCompleteSet`'s existing weight/
  reps validation already blocked garbage; this closes the "logged the next
  set's suggested prefill prematurely" gap. The in-app Log button is unchanged.

### C. Decision-gated (unchanged — do NOT start without the founder decision)
Per CLAUDE.md ACTIVE WORK: Ultimate-Audit items 11–16 and the deferred Hevy
items (social feed, watch app, defer-paywall, referral, progress photos,
sex-aware strength standards, per-exercise demo media, drag-to-reorder).
