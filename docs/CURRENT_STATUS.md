# Volyume current status (verified 2026-05-26, end-of-day, post sync-migration)

This document captures the verified, code-checked, founder-confirmed
state of the Volyume project. It supersedes `HANDOFF.md` (which has
drifted) as the single trusted reference for what is shipped, what is
in progress, and what comes next, in the correct phased order.

Update protocol: this doc is rewritten end-to-end at the end of any
session that materially changes shipped state, not appended to.

---

> **Operational protocol (locked 2026-05-25):** every session must
> follow the 10 permanent engineering rules in `CLAUDE.md` §
> "Permanent engineering rules". Repository validation before
> code, no silent workflow changes, missing-file anomalies are
> hard stops, semantic integrity over Git topology, runtime-
> critical discipline, migration tracking, mandatory tests, no
> minimisation, main is canonical, session-start protocol. The
> rules were added after the 2026-05-25 stale-branch incident.

## 0. 2026-05-26 session summary (read first)

**End-of-day handoff.** Single session spanning the Codex
re-audit response (commits c324f99 / d861949 / 41b210f / 7b7cc0f
/ 8b67465 — see "earlier in this session" further below) and
then 13 more commits closing CI, food refactor, and the full
sync transport migration. Branch + main are at 71aa4fc.

Material changes shipped on main this session, in order:

1. **CI trigger gap fixed (commit 6375674).** Build Android run
   #714's "Publish build status to repo" step failed at
   git push from inside the workflow; GitHub then stopped
   delivering push webhook events to Actions for this repo.
   Removed the workflow's outbound git push entirely from
   build-android.yml + maestro-e2e.yml; status report is now an
   uploaded artefact (`build-status-<run>`) rather than a
   commit. From this commit onward push events fire workflow
   runs normally; Build Android #715, #716, #717 (and onward)
   confirm restoration. Diagnostic captured in
   `docs/CI_TRIGGER_DIAGNOSTIC_2026-05-26.md`.

2. **Food components extracted (commit 0f93f20).** The last 3 of
   the 9 `src/components/food/` components spec'd in
   `UI_FLOWS_LOCKED.md` lines 18-28: `MealSection`, `EntryRow`
   (with `SwipeableEntryRow` + `friendlyFoodName`), `FoodRow`
   (with `SOURCE_LABEL` + `kcalForServing`). Pulled out of
   inline definitions inside `DiaryScreen` (~75 lines + ~35
   lines of styles) and `FoodSearchScreen` (~25 lines + 10
   lines of styles + the local `SOURCE_LABEL` map). 30 new
   tests in `src/components/food/__tests__/foodComponents.test.js`.

3. **All 16 SYNC_REGISTRY tables on per-table transport**
   (commits 7581d7f → 71aa4fc, 7 commits). Closes
   `SYNC_ARCHITECTURE_LOCKED.md` lines 156-238 ("registry-driven
   transport"). The runner (`src/lib/sync/runner.js`) now drives
   every table through `transport.pushTable` / `pullTable`
   rather than the monolithic legacy `bulkUploadLocalData` /
   `pullFromCloud`. Per-table handlers live in
   `src/lib/sync/tables/` (10 new files). `sync.js` shrank by
   ~580 lines (7 dead helpers + 6 dead imports + the entire
   food-domain section + the duplicate notification_preferences /
   weekly_checkins / body_metrics / nutrition_targets calls).

   Migration architecture per table:

   - **notification_preferences** — LWW fold, skip-when-server-newer
     on push, applyPreferenceFromPull on pull (preserves
     Codex F4 fix).
   - **weekly_checkins_v2** — 200-row batch push, INSERT OR
     IGNORE pull via insertWeeklyCheckinFromCloud.
   - **body_composition_log** — registry key vs cloud table
     name divergence preserved (`body_metrics` cloud-side).
     camelCase → snake_case incl. thigh→quads / ham→hamstrings.
   - **nutrition_targets** — push + pull via per-user single
     row. Registry contract drift fixed in the same commit:
     was `pull_only` + `serverAuthoritative=true`; corrected to
     `bidirectional` + `false` + `last_write_wins`. Public
     syncNutritionTargets on-save shim retained for
     database.js callers, now delegates to pushTable.
   - **ed_pattern_flags** — pull-only, server-authoritative.
     New `upsertEdPatternFlagFromCloud` helper (INSERT OR
     REPLACE) — closes a real gap where the client never
     pulled back its own engine-raised flags.
   - **tier_history** — pull-only, server-authoritative. New
     SQLite table (id, user_id, from_tier, to_tier, event_type,
     occurred_at, payload_json, created_at) so the per-table
     pull has somewhere to land. SubscriptionScreen + paywall
     analytics can read history without round-tripping.
   - **recipe_ingredients** — bidirectional + LWW + soft-delete.
     Closed the gap where this child table was missing from
     the food bulk RPC. Added `deleted_at` + `updated_at`
     columns to local SQLite via additive migration; new
     `softDeleteRecipeIngredient` + `getLiveRecipeIngredientsForRecipe`
     helpers. Per-row LWW gate on pull (skip cloud rows older
     than local). Registry `softDelete: false → true`.
   - **profiles** — bidirectional + merge. Per-field write
     timestamps tracked in useAppStore
     (`userProfileFieldUpdatedAt`, persisted under
     `PROFILE_TIMESTAMPS_KEY_PFX`). Push builds
     `column_updates_at` from the per-field map; pull runs
     `conflict.resolve(merge)` which routes through
     `mergeColumns` in `conflict.js`. tier excluded from push
     (server-owned). **Requires migration 045 applied
     server-side (see § 3 + § 9 below).**
   - **weight_log** — aliased to body_composition_log; handlers
     return `skipped:'aliased_to_body_composition_log'`.
   - **Food domain (7 tables)** — coordinator pattern in
     `src/lib/sync/tables/foodDomain.js`. The 6 bidirectional
     tables (food_entries, custom_foods, saved_meals, recipes,
     food_favourites, daily_water) plus pull-only
     daily_intake_rollups share one bulk RPC pair
     (food_sync_push / food_sync_pull). `foodPushFor(name)` /
     `foodPullFor(name)` factories produce thin handlers that
     trigger the bulk RPC once per syncAll cycle and cache
     per-table counts. `beginRun()` called by the runner each
     cycle resets the cache. 7x RPC savings vs splitting the
     bulk into per-table calls; the closed-test build contract
     for food_sync_push stays intact.

   Per-table tests cover every handler in
   `src/lib/sync/__tests__/sync.transport.test.js` (43 assertions);
   runner integration test in
   `src/lib/sync/__tests__/sync.runner.integration.test.js`
   exercises syncAll end-to-end through all handlers with
   supabase + AsyncStorage + food/db + useAppStore mocked at
   the boundary; focused profile merge tests in
   `sync.profiles.test.js`.

4. **Migration 045 written**
   (`supabase/migrate_045_users_profile_column_updates_at.sql`).
   Adds `users_profile.column_updates_at jsonb NOT NULL DEFAULT
   '{}'` plus a safe-merge BEFORE UPDATE trigger so two
   clients touching different fields don't clobber each other's
   per-column timestamps. Required for the profiles merge path.
   Pending founder apply per § 3.

5. **Migrations 037-044 applied by founder mid-session.** The
   notification_preferences PGRST205 errors visible in the
   sideloaded debug build's Debug logs (warnings only, sync
   continued) cleared after 044 landed.

**Final test totals (proof):**

    $ ./node_modules/.bin/jest --runInBand --ci --forceExit
    Test Suites: 82 passed, 82 total
    Tests:       3 skipped, 1639 passed, 1642 total
    Snapshots:   25 passed, 25 total

The 3 skipped tests are explicit `test.skip` calls for
catalogue events with a `deferralReason` (`account_deleted`,
`held_decision_created`, `held_decision_cleared`).

    $ ./scripts/check-identity-invariant.sh
    Identity invariant clean: all 'SET user_id' callsites are annotated.

**Founder action queue, end-of-day: EMPTY.**

Migrations 045 (users_profile.column_updates_at) and 046
(recipe_ingredients soft-delete) both applied successfully late
2026-05-26 in the same session. Profile push and
recipe_ingredients push now have the cloud columns they need; no
PGRST204 errors expected on the next sideloaded build.

046 took two attempts: first apply hit `ERROR 42703: column
"created_at" does not exist` because the live cloud schema for
recipe_ingredients has diverged from migration 015 (created_at
isn't there despite the CREATE TABLE declaring it). Commit
6aa79ca dropped the created_at backfill from 046; second apply
succeeded. The schema divergence is logged as a follow-up
("audit which other tables' live cloud schemas don't match their
migration files"), tracked but not blocking.

**What is NOT done (honest accounting):**

- npm audit: still 29 advisories (15 high), all in the Expo SDK
  51 dep chain. Fix path remains the SDK 51 → 56 staged
  migration; tracked in
  `docs/DEPENDENCY_AUDIT_2026-05-26.md`. Not in scope.
- Sync regression matrix per `TESTING_STRATEGY_LOCKED.md` lines
  144-160 + 156-160 (8 paired tests per table × 16 tables = 128
  assertions). Per-table unit tests + runner integration test
  cover the wiring; the systematic matrix is the next layer.
- Maestro #16 emulator boot diagnosis (F4 from earlier in the
  session) — runner-diagnose.log is now produced by the
  workflow updates in 41b210f and tier_history is now pulled by
  the migrated handler, but the actual boot-failure root cause
  is still open and waiting on a Maestro re-run that hits the
  failure. Not blocking.
- The "Download my data" email path still file-shares via the
  Sharing API; the email path needs an Edge Function +
  provider sign-up (founder side).
- ~~Worker-exit warning under screen-mount.test.js: --forceExit
  still in use in main-ci.yml~~ **Closed 2026-05-27.** The
  original NavigationContainer hypothesis was wrong; root cause
  was two leaked setTimeout()s inside HomeScreen's useEffect
  that the screen-mount harness never let clean up (the test
  never unmounted the tree). Fix: mountScreen now registers
  every created tree in a module-level Set + top-level afterEach
  unmounts the batch. `--forceExit` removed from
  `.github/workflows/main-ci.yml`; full suite reports zero open
  handles via `--detectOpenHandles` and exits 0.
- **Cloud schema / migration-file divergence audit.** Migration
  046's first apply attempt failed because the live cloud
  `recipe_ingredients` table is missing `created_at`, despite
  migration 015's `CREATE TABLE` declaring it. Probable causes:
  a manual schema edit via the Supabase dashboard at some
  point, or an undocumented migration applied directly to
  cloud without being checked in here. Worth running a column-
  by-column diff between every `CREATE TABLE` in `supabase/*.sql`
  and the live `information_schema.columns` before any future
  schema work — the next session that ships a migration touching
  one of the legacy tables could hit the same trap. Tracked as
  Phase A exit prep item under § 8 LATER.

---

## Earlier in this session (Codex audit responses, kept for context)

> **Codex audit response 2026-05-26 (third pass, post-4f3f26f):**
> The user ran a quick re-audit after the second-pass commits.
> Verification produced:
> - F5 (sync runtime import bug): REAL BUG, silently introduced
>   by commit 5235bb1. App.js + SyncStatusBadge import syncAll /
>   getStatus from '../lib/sync' which resolves to sync.js (the
>   legacy file); that file did not re-export the new public
>   API. The earlier test imported from '../runner' directly so
>   it could not catch this. Fixed in c324f99: sync.js now
>   re-exports the spec'd public surface from sync/index.js, and
>   sync.publicApi.test.js requires through the App.js path and
>   asserts every export is a function.
> - F6 (notification_preferences half-wired): YES.
>   pullFromCloud did not pull the cloud rows back to the local
>   mirror; NotificationSettingsScreen imported but never called
>   migrateFromLegacyBlob. Fixed in c324f99: _pullNotificationPreferences
>   added to the pull path; migrateFromLegacyBlob now fires
>   inside the screen's load-on-mount init() after the legacy
>   blob is parsed.
> - F2-CI (Jest exits 1 in --runInBand --ci): root cause was
>   errorLog.js's direct console writes from async paths
>   triggering Jest's BufferedConsole "Cannot log after tests
>   are done" warnings (~141 of them), which --ci treats as a
>   failure signal. Fixed by an IS_JEST guard on all three
>   console paths (logError / logWarn / logInfo). Warning count
>   dropped to ~20 React-internal act() advisories that cannot
>   be filtered at the app layer. main-ci.yml's jest invocation
>   now uses --forceExit per Codex's explicit allowance
>   ("justified --silent/--forceExit decision"). Local
>   `jest --runInBand --ci --forceExit` exits 0.
> - F3 (Expo Doctor red): the @sentry/react-native 6.22.0 bump
>   does not match the Expo SDK 51 bundled-versions list (5.24.x).
>   Added `expo.install.exclude` for the package in package.json
>   per Expo's documented opt-out path. The bump itself is
>   intentional (peer-compatible with Expo 51 + clears 3
>   prototype-pollution advisories).
> - F4 (Maestro smoke run #16 failure): NOT FIXED in c324f99.
>   The status doc reports adb-install.log + maestro-output/run.log
>   'not produced', so the maestro script never reached adb install.
>   That points at emulator boot / runner setup, not at the
>   smoke flow content. Diagnosis requires the GitHub Actions
>   step log for run #16 which is not accessible from the
>   container. Open.
> - F7 (npm audit): re-classified as repo-fixable in the
>   previous correction. 4 advisories cleared (Sentry RN +
>   @babel/runtime); remaining 29 need a deliberate Expo SDK
>   51 → 56 staged migration. Attempted in-session and reverted
>   because it broke all 78 Jest suites; needs a dedicated
>   session for the SDK-by-SDK walk.
> - F8 (volyume.app DNS): repo half done (`public/CNAME`); DNS
>   itself + GitHub Pages custom-domain enablement + assetlinks
>   hosting are FOUNDER EXTERNAL ACTION.
>
> **Codex audit response 2026-05-26 (second pass):**
> A second Codex audit ran against commit `b41f77d`. Verification
> against the current HEAD produced this categorisation:
> - F1 (anonymous-to-account migration incomplete in
>   email-confirm / OAuth / ProUpgrade): FALSE POSITIVE vs.
>   LOCKED IDENTITY_AND_OWNERSHIP_LOCKED.md rule 1 + 5 +
>   anti-patterns. Commit `c2efd15` deleted the function and
>   the anonymous-mode entry points entirely; per scenario A
>   in the locked spec, "Local SQLite is empty" at signup so
>   there is nothing to migrate.
> - F2 (sync runner self-import + no app calls): partial-fix.
>   `require('../sync')` resolves to the legacy file under
>   Node's standard resolver (proven by `Module.createRequire`
>   in this session), so the circular concern is bundler-
>   dependent. Made the require explicit (`../sync.js`) and
>   strengthened the runner test to assert
>   `bulkUploadLocalData` + `pullFromCloud` are actually
>   invoked. The "no app calls" half was true at the audit
>   point and is fixed by commit `5235bb1`.
> - F3 (sync_conflict_resolved client allow-list): ALREADY
>   FIXED — line 134 of `engineTelemetry.js` (commit
>   `d8e5eb5`).
> - F4 (notification_preferences only cloud): YES, fixed this
>   pass. New `src/lib/notifications/preferences.js` is the
>   SQLite mirror; NotificationSettingsScreen now writes
>   AsyncStorage AND the per-category SQLite rows;
>   `_pushNotificationPreferences` added to
>   `bulkUploadLocalData` in `sync.js`. 9 new tests.
> - F5 (lint-maestro-flows test EPERM on Windows): fixed by
>   switching to `process.execPath`.
> - F6 (smoke flows that need a signed-in user): fixed —
>   stripped `smoke` tag from `diary_log_first_meal.yaml` and
>   `onboarding_happy_path.yaml`; only
>   `_smoke_app_launches.yaml` remains under `smoke`.
> - F7 (Maestro workflow status reporting): fixed three
>   sub-bugs — `gradle-diagnose.log` now writes to
>   `$GITHUB_WORKSPACE` (was `../`); the Maestro step now
>   captures `PIPESTATUS[0]` and `exit $MAESTRO_EXIT` so its
>   outcome reflects reality; `gradle-diagnose.log` added to
>   artefact upload paths.
> - F8 (migration tracking violates Rule 6): fixed — 042 /
>   043 / 044 now carry the full Rule 6 fields; supabase
>   README's "How to apply" updated to 037-044; allow-list
>   verification heading updated; the "started_at" reference
>   was already historical and was rewritten to `initiated_at`
>   plus the smoke-test now also covers
>   `sync_conflict_resolved` and `notification_preferences`.
> - F9 (docs stale): fixed in this section + below.
> - F10 (volyume.app/privacy doesn't resolve): partial —
>   `public/CNAME` added (FIX NOW); DNS A/CNAME, GitHub Pages
>   custom-domain config, and `.well-known/assetlinks.json`
>   hosting are FOUNDER EXTERNAL ACTION.
> - F11 (build-android.yml + maestro-e2e.yml still use
>   `npm install`): fixed — both now use `npm ci
>   --legacy-peer-deps`.
> - F12 (33 prod npm audit advisories): CORRECTION — initially
>   marked BLOCKED citing CLAUDE.md release policy. The founder
>   challenged that framing 2026-05-26: the deployed AAB on
>   Play Console does not auto-update from source changes;
>   client-side dep bumps cannot break it. Only DB / RPC /
>   allow-list contract changes can. F12 is therefore
>   repo-fixable in source. Re-attempted this session:
>     - @sentry/react-native 5.24.3 → 6.22.0 cleared 3
>       advisories (commit `8e18793`).
>     - @babel/runtime forced to ^7.29.7 via npm `overrides`
>       cleared 1 (commit `79ce787`).
>     - Total: 33 → 29 (4 cleared).
>     - Expo SDK 51 → 56 jump attempted via
>       `npm install expo@^56`: broke all 78 Jest suites at JS
>       load (incompatible peers across react-native /
>       expo-modules-core / jest-expo / babel preset).
>       Reverted; current state 1547/1550 passing.
>     - Remaining 29 advisories are all in the SDK 51 build
>       chain. Clearing them requires a per-SDK 51 → 52 → 53
>       → 54 → 55 → 56 migration with native-module breakage
>       handling at each step plus device smoke-test, which is
>       a dedicated 1-2 day session, not a single command.
>       This is genuine open work, not a tracked-not-lost item.
>
> **Correction of prior overclaims (per founder instruction
> 2026-05-26):**
> - Earlier in this session I marked the SYNC_ARCHITECTURE
>   drift as "Resolved (foundation)". That was overstated.
>   The 7-file directory + queue + telemetry exist (commit
>   `dc95b3b`); per-table registry-driven push/pull in
>   `transport.js` still delegates to the legacy `sync.js`
>   helpers. The new entry below ("8b. Sync work remaining")
>   captures what is genuinely outstanding.
> - The earlier "1430/1430 across 67 suites" test count was
>   re-verified from a clean install; the current count
>   following today's identity-mode deletion, telemetry split,
>   sync triggers, status badge, and food components is
>   1535/1538 across 77 suites (3 deferred per the catalogue's
>   explicit deferralReason). Command output proving this is
>   at the bottom of this section.
> - The "tracked, not lost" framing for the Jest worker-exit
>   warning was inappropriate. It is a real diagnostic gap;
>   `scheduleSync` was confirmed as one source (commit
>   `531d420`), and the next layer is RN-side timers in
>   mounted screens. Not blocked, not done.

Active branch: `main` (per Rule 9 lock 2026-05-26). This session
responded to an external main-branch audit and a follow-up
LOCKED-doc compliance pass and shipped a stack of
runtime-critical fixes, structural rebuilds per locked spec,
CI infrastructure, and config cleanup.
Material changes, in order:

1. **Stale package-lock.json regenerated**. `react-native-iap@^12.16.1`
   landed in `package.json` at commit `ba072e0` without a lockfile
   bump, so `npm ci` had been failing in every clean container
   since then. The "1370/1370 passing" claim could not have been
   re-verified anywhere clean until today.
2. **Mesocycle clock-injection fix**. `getCurrentMesoWeek` and
   `getBlockStatus` now accept an optional `nowMs` parameter
   (defaults to `Date.now()`). Mesocycle tests had a hardcoded
   `NOW = 2026-05-20` and the "brand-new block" test on line 25
   was missing the third argument; the test failed on 2026-05-26
   when wall-clock drifted 6 days past `NOW`. Two adjacent tests
   were passing by coincidence and would have aged out too.
3. **Identity-invariant CI workflow wired**. `scripts/check-identity-invariant.sh`
   existed but no workflow ran it, so CLAUDE.md's "CI grep enforces
   this" was a no-op. New `identity-invariant.yml` runs it on every
   push to main / claude branches and on PRs.
4. **ProOnboardingScreen identity migration bug fixed** (audit
   critical #1). `migrateLocalUserId` was called on every
   successful auth, including sign-in; per
   `IDENTITY_AND_OWNERSHIP_LOCKED.md` it is signup-only.
   ProOnboardingScreen now mirrors the LoginScreen gate. Adds
   `identityGate.proOnboarding.test.js` as a source-grep
   regression guard.
5. **Migration 039 service_role GRANT added** (audit critical #2).
   `record_account_deletion_started/completed` REVOKEd EXECUTE
   from PUBLIC/authenticated/anon but never GRANTed to
   service_role; the delete-account Edge Function would have
   silently failed to write audit rows. 039 is still pending
   apply, so the edit landed in place.
6. **Migration 042 + RTDN webhook fix** (audit critical #3). New
   `upgrade_tier_for_user(_user_id, ...)` service-role-only RPC.
   The webhook previously POSTed `x-supabase-user-id` as a fake
   impersonation header that PostgREST does not honour, so every
   Play Billing renewal / cancellation / refund / expiry /
   restart was server-side broken. Webhook now passes `_user_id`
   in the JSON body to the new RPC. Adds
   `rtdnWebhook.contract.test.js` as a contract regression guard.
7. **`.gitattributes` added**. Enforces LF for js/ts/yaml/sh/sql/md
   so Maestro flow lint and Unix tooling don't trip on CRLF in
   Windows checkouts.
8. **Config placeholders removed**. `app.json` no longer carries
   `extra.eas.projectId = "your-eas-project-id"`; `eas.json` no
   longer carries the iOS `appleId / ascAppId / appleTeamId`
   placeholders. iOS is locked-deferred per 2026-05-25 founder
   override.
9. **scheduleSync Jest-aware**. Most DB write paths fire the 2s
   debounced sync; every test that touched the DB was leaking
   that timer and tripping Jest's worker-exit warning + late
   require of `useAppStore` after teardown. scheduleSync now
   no-ops under `JEST_WORKER_ID`. Production unchanged.
10. **Main-branch CI workflow added**. New `main-ci.yml` runs
    Jest + Maestro lint + Expo Doctor in parallel jobs on every
    push to main / claude and on PRs to main. Uses
    `npm ci --legacy-peer-deps` so future lock drift fails CI
    instead of silently being papered over by `npm install`.
11. **Doc reconciliation pass**. `supabase/README.md` columns for
    `account_deletions_log` corrected (`initiated_at` + `source`,
    not `started_at` + `error_message`). Allow-list event count
    corrected (38, was 37). `CURRENT_STATUS.md` audit-site count
    corrected (23, was 21). Migration tracker now lists 042.

**Founder action queue grows by**:
- Apply `supabase/migrate_039_account_deletions_log.sql` (now
  includes the service_role GRANT fix)
- Apply `supabase/migrate_042_upgrade_tier_for_user.sql`
- Apply `supabase/migrate_043_sync_conflict_telemetry.sql`
- Apply `supabase/migrate_044_notification_preferences.sql`

The remaining 037 + 038 + 040 + 041 from the previous queue still
need applying in order. Apply order: 037 → 038 → 039 → 040 → 041
→ 042 → 043 → 044. All four new migrations (042, 043, 044) now
carry the full CLAUDE.md Rule 6 header tracking fields.

**Domain / hosting founder external actions added by Codex audit
2026-05-26 F10:**
- Configure DNS A / CNAME for `volyume.app` → GitHub Pages
  (`public/CNAME` now contains the apex domain).
- Enable Custom Domain on the Pages site in repo Settings →
  Pages.
- Host `.well-known/assetlinks.json` (Android App Links) at
  `volyume.app` so the deep-link verification in `app.json`
  resolves.

**Workflow fixes Codex audit 2026-05-26 F11 + F7:**
- `build-android.yml` + `maestro-e2e.yml` now use
  `npm ci --legacy-peer-deps` so future lock drift fails CI
  loudly instead of being silently absorbed.
- Maestro workflow's `gradle-diagnose.log` path corrected to
  `$GITHUB_WORKSPACE`; step exit code now propagates via
  `PIPESTATUS[0]` so `job.status` is honest at status-report
  generation time.

**Additional LOCKED-spec compliance pass (later this session,
per founder direction to follow all docs end-to-end):**

12. **Anonymous mode + `migrateLocalUserId` removed** per
    `IDENTITY_AND_OWNERSHIP_LOCKED.md` rule 1 / rule 5 /
    anti-patterns. The function was still in `database.js`,
    `handleContinueLocally` was still in `LoginScreen`,
    `initLocalUser` was still in the store + RootNavigator
    bootstrap. All deleted; regression test
    `identityGate.proOnboarding.test.js` rewritten as an
    anti-pattern guard for the 8 symbols / patterns that must
    not return. Commit `c2efd15`.
13. **`src/lib/telemetry/` 4-file split** per
    `TELEMETRY_DASHBOARDS_LOCKED.md` lines 310-315. New
    `events.js` (canonical catalogue of 41 events: 38
    emittable + 3 deferred-with-reasons), `transport.js`
    (allow-list-checked posting), `sentryBridge.js`
    (breadcrumb mirror), `index.js` (public API).
    `engineTelemetry.js` retained as the queue + push
    implementation under transport; future PRs fold it in
    directly. Catalogue source-scan test asserts every
    non-deferred event has at least one `track()` call site;
    all 38 pass. Commit `d8e5eb5`.
14. **Sync triggers wired** (foreground / network reconnect /
    periodic 15-min) per `SYNC_ARCHITECTURE_LOCKED.md`
    lines 161-169. Added `@react-native-community/netinfo`
    dep; AppState 'active' listener, NetInfo isConnected
    edge listener, 15-minute setInterval all route to
    `syncAll({triggeredBy})`. Runner's `_runLock` dedupes
    concurrent calls (tested). Commit `5235bb1`.
15. **SyncStatusBadge in nav header** per
    `SYNC_ARCHITECTURE_LOCKED.md` lines 266-276 +
    `PRODUCTION_READINESS_LOCKED.md` § 1. Coloured dot +
    label (Synced / Pending / Offline / Sync error) with
    queue count when pending. Tap opens a 280px sheet with
    status, queue depth, last sync age, last error, and
    "Sync now" button. Polls `getStatus()` every 5s; wired
    via `stackOptions.headerRight` in `RootNavigator`. Mount
    test covers all 4 status states. Same commit `5235bb1`.
16. **4 of 7 missing food components** per
    `UI_FLOWS_LOCKED.md` lines 18-28: `EmptyDiary` (with
    spec copy verbatim, replacing the inline "Nothing logged
    yet" block in DiaryScreen), `SourceChip`,
    `HeldDecisionCard`, `ServingPicker`. Snapshot + behaviour
    tests for each. The 3 remaining (`MealSection`,
    `FoodRow`, `EntryRow`) are still inline in their host
    screens; behaviour is functionally present, extraction
    is pure refactor that needs careful prop-threading to
    avoid DiaryScreen / FoodSearchScreen regression. Tracked
    in § 6 below, not under "tracked, not lost". Commit
    `9ca3d00`.

**Test count (proof):**

    $ ./node_modules/.bin/jest --silent
    Test Suites: 77 passed, 77 total
    Tests:       3 skipped, 1535 passed, 1538 total
    Snapshots:   25 passed, 25 total

The 3 skipped tests are explicit `test.skip` calls for
catalogue events with a `deferralReason` (`account_deleted`,
`held_decision_created`, `held_decision_cleared`).

    $ ./scripts/check-identity-invariant.sh
    Identity invariant clean: all 'SET user_id' callsites are annotated.

**Honest accounting of what is NOT done:**
- Per-table registry-driven push/pull in `src/lib/sync/transport.js`.
  Still delegates to legacy `src/lib/sync.js` helpers
  (`bulkUploadLocalData` + `pullFromCloud`). Foundation is
  laid (registry, queue, conflict resolver, runner, status
  surface); the next layer is migrating each of the 16
  registry tables onto registry-driven dispatch. This is
  multi-day per-table work and is not done.
- Sync regression matrix per
  `TESTING_STRATEGY_LOCKED.md` lines 144-160 + 156-160 (8
  paired tests per table × 16 tables). The foundation that
  enables these tests (registry, queue, conflict resolver)
  is in place; the matrix itself is not built.
- 3 food components (`MealSection`, `FoodRow`, `EntryRow`)
  are spec'd in `UI_FLOWS_LOCKED.md` but remain inline in
  DiaryScreen / FoodSearchScreen. Extracting them is
  refactor only, not a semantic gap.
- npm audit: 33 vulnerabilities (15 high). Per
  `docs/DEPENDENCY_AUDIT_2026-05-26.md` (this session) +
  `KNOWN_ISSUES_FROM_QA.md` line 82 ("Accepted risk for
  beta; fix path is breaking upgrade to newer Expo SDK;
  defer until post-beta major-version bump"), the fix is
  the Expo SDK upgrade at Phase A exit prep. The LOCKED
  release policy (CLAUDE.md 2026-05-24) bars a new AAB ship
  in this window so the upgrade has nowhere to land yet.
  This is the one item where the LOCKED policy and the
  audit fix are in active tension; the LOCKED policy wins
  per the operating hierarchy.
- "Download my data" emails a CSV (PRIVACY_CONSENT_LOCKED.md
  line 251). Current implementation file-shares via Sharing
  API. Email path requires a Supabase Edge Function +
  email-sending provider (Resend / SendGrid free tier). NOT
  done in repo; requires founder-side provider sign-up.
- Worker-exit warning under `screen-mount.test.js`. The
  scheduleSync fix removed one source; RN-side timers
  inside mounted screens (animations, expo-notifications,
  etc.) are the next layer. Not done.

---

## 1. Where we are right now

### Release phase

**Phase A: Internal closed test.** Per `RELEASE_PLAN_LOCKED.md` lines
9-13. We are deep inside Phase A. We do not exit Phase A until every
Move (#0 through #5) is merged, tested, and the Phase A exit
checklist (lines 77-89) is green.

### Distribution state

| Surface | State |
|---|---|
| Google Play | **AAB live in Closed Testing track.** The build is the original pre-food-layer version (v1.1.0+4). Sideloaded debug APKs are how we're testing the build-out work; the Closed Testing track stays frozen until Phase A exit. |
| Apple App Store | **Nothing.** No Apple Developer account, no App Store Connect app entity, no iOS bundle registered. (Locked decision: Android-only at Phase B; iOS deferred indefinitely.) |
| Marketing site | volyume.app domain registered (Namecheap). Hosting state unknown; waitlist signup form not built. Privacy policy HTML at `public/privacy/index.html` is wired through the `deploy-pages.yml` GitHub Pages workflow; serves at `volyume.app/privacy` once DNS resolves to the Pages site. |

### Signing infrastructure

**No keystore exists yet.** Confirmed by founder. The current
`build-android.yml` workflow has explicit signing config that has
never been exercised in production. New builds will need a keystore
generated and Google Play App Signing configured before any new AAB
can replace the current Closed Testing build. Real Phase A exit
blocker but not blocking current code work.

### Branch state

- Active branch: `main`. URL:
  `https://github.com/allansdouglas1983-cmyk/ADPhysique/tree/main`.
- Default branch on GitHub: **`main`** (confirmed 2026-05-26 via
  the GitHub API: `default_branch: "main"`). The earlier default
  (`claude/build-volyume-app-srY9C`) has been replaced.
- All shipped work, every Move, every Phase A code chunk lives on
  `main`. Push direct to `main`; do not create feature branches
  without explicit founder approval.

### Locked release policy (CLAUDE.md, restated)

> The current Play Console closed testing build stays in place until
> the WHOLE project is built out, not half done. Do NOT propose,
> schedule, or trigger a new closed-testing release.

This holds. All Move work stacks up on `main` in Git, not on the Play
track, until Phase A exit.

### Founder overrides locked 2026-05-25

1. **Cloud infrastructure migration (Azure/AWS) deferred** until the
   app is stable in production. Supabase + Sentry stack stays for
   v1 launch.
2. **Google Play Billing direct, not RevenueCat.** iOS deferred
   indefinitely so RevenueCat's cross-platform value is moot. Going
   direct removes the 1%-above-£2.5k-MRR fee and one dependency.
   `src/lib/payments/playBilling.js` abstraction stays so the
   underlying SDK can swap without touching cascade / UI / RPCs.
3. **2-tier model (Free, Pro).** Complete tier removed; Peak Week
   module removed entirely ("peak week needs a human eye, not
   numbers"). 21-day single Pro trial. Pricing £0.99 (open beta) /
   £1.99 (founders) / £3.99 (standard). Strategy: build a user base
   over short-term ARPU.

---

## 2. Move-by-move shipping status

Verified by direct code inspection against each Move plan doc.

| Move | Spec doc | Code shipped | Tests in CI suite |
|---|---|---|---|
| **#0** Code corrections | `MOVE_0_CODE_CORRECTIONS.md` | Citation fix + jargon blocklist extension | jargonBlocklist (11) |
| **#0.5** Voice retrofit | `MOVE_0_5_VOICE_RETROFIT.md` | Precision Coaching naming + WHY_LIBRARY rewrites | whyThisTemplates.snapshot (14), weeklyCoach.voice.snapshot (5) |
| **#1** Food foundation + FFM floor | `MOVE_1_FOOD_FOUNDATION_AND_FFM.md` | Migrations 015+016, FFM floor in nutritionEngine, food data layer in src/lib/food/, Diary tab, AddCustomFood, FoodSearch, Insights extensions, Today's intake card | 71 tests (ffmFloor 17, ffmFloor.adaptive 8, weeklyCoach.ffmFloor 8, sanityChecks 18, csvExport 8, foodSync 12) |
| **#1.5** Barcode + OCR | `MOVE_1_5_BARCODE_AND_OCR.md` | vision-camera scan, MLKit OCR (on-device), OCR writeback queue, migrations 022+023, ScanBarcodeScreen, ScanLabelScreen | 33 tests (liveOff 10, usda 8, ocrParser 6, writeback 9) + food.waterfall (orchestration) |
| **#2** ED-pattern detection | `MOVE_2_ED_PATTERN_DETECTION.md` | edPatternDetector (4 signals + threshold flip), migration 017 (ed_pattern_flags + RPC), HeldDecisionsCard variant, GoalLockConsentScreen, Article9ConsentScreen + migration 019 | 23 tests + simulator scenarios (aggressive_cut_supervised, aggressive_cut_unsupervised, red_s_trajectory) |
| **#3** Upward gate compression + telemetry slice | `MOVE_3_UPWARD_GATE_COMPRESSION.md` | rapidLossOverride in computeAdaptiveTDEEAdjustment, engineTelemetry.js, rapid_loss_corrected held-decision card, migration 027 | 15 tests + simulator `rapid_loss_correction` |
| **#4** Differential paywall | `MOVE_4_DIFFERENTIAL_PAYWALL.md` | **SHIPPED.** `differential_output` field in weeklyCoach via pure detector in `src/lib/differentialPaywall.js`. 6 locked-copy variants verbatim + `_NO_TRIAL` variants. Adherence 2-of-3 gate + tier gate + 6-context priority. `DifferentialBadge.js` renders inline on CoachOutputScreen. `PaywallScreen.js` modal. `paywall_shown` + `paywall_tapped_cta` telemetry wired (migration 032). | 40 detector + 6 mount tests + simulator `stalled_lift` |
| **#5** Tier infrastructure + Google Play Billing | `MOVE_5_TIER_INFRASTRUCTURE.md` | **SHIPPED PARTIAL.** Migrations 030+031+033 applied. `src/lib/payments/` module: playBilling (real `react-native-iap` provider injected at boot), catalogue (3 SKUs), cascade (state machine, 7 transitions instrumented), restore. proGate has isPaidTier/hasFeature/hasGoalUnlock + FEATURE_MAP (2-tier collapsed). CascadeGateScreen + SubscriptionScreen + PaywallScreen + TierComparisonStrip shipped. RTDN Edge Function `supabase/functions/play-billing-rtdn/index.ts` written. Migration 038 wires the full payments/cascade telemetry catalogue. **Outstanding:** founder deploys Edge Function + creates Play Console SKUs + sandbox purchase test (at Phase A exit). |

**Test totals (§ 2 historical row, kept for trend; current totals
in § 0 above):** original 1348 tests in 60 suites; current
1547 passed + 3 deferred-skipped across 78 suites per the
`jest --silent` output in § 0.

**Engine simulator framework:** SHIPPED. All 12 locked scenarios live
under `tests/simulator/scenarios/`: straight_cut,
aggressive_cut_supervised, aggressive_cut_unsupervised,
red_s_trajectory, recomp_steady, bulk_gentle, bulk_aggressive,
rapid_loss_correction, stalled_lift, plateau_then_break,
returning_user, noisy_logger.

---

## 3. Cloud migration application state

Per `DATABASE_SCHEMA_LOCKED.md` + grep against `supabase/migrate_*.sql`.

| # | Purpose | Status |
|---|---|---|
| 015 | Food logging schema | Applied |
| 016 | Food sync RPCs | Applied |
| 017 | ED-pattern + telemetry (engine_telemetry table with `payload_json` column, `record_engine_telemetry` RPC, daily view) | Applied |
| 018 | Composite PKs on legacy tables | Applied |
| 019 | Health consent (Article 9) | Applied |
| 020 | custom_exercises split | Applied |
| 021 | Food composite PKs | Applied |
| 022 | Food telemetry events allow-list | Applied |
| 023 | custom_foods.barcode_ean | Applied |
| 024 | consent_log composite PK rectification | Applied |
| 025 | delete_user_data completeness | Applied |
| 027 | rapid_loss_compression_triggered allow-list | Applied |
| 028 | food_library_pull RPC (delta sync) | Applied |
| 029 | Telemetry allow-list extension (had typo: `payload` instead of `payload_json`) | Applied, then patched by 034 |
| 030 | Tier infrastructure (tier_history, trial_state, upgrade_tier RPC, start_cascade RPC, pricing_config) | Applied |
| 031 | Cascade workers (pg_cron schedule every 15 min) | Applied |
| 032 | Paywall telemetry events (had same `payload` typo as 029) | Applied, then patched by 034 |
| 033 | 2-tier consolidation RPC updates | Applied |
| 034 | **engine_telemetry column-name fix** (restores `payload_json` after 029+032 typo) | **Applied** |
| 035 | sign_in + sign_out + article9_consent_recorded allow-list | **Applied** |
| 036 | account_created + custom_food_created allow-list | **Applied** |
| 037 | app_cold_start + foregrounded/backgrounded + sync_run allow-list | **Applied** |
| 038 | cascade_state_transition + purchase_* + subscription_cancelled + restore_purchases_attempted allow-list | **Applied** |
| 039 | account_deletions_log table + record_account_deletion_started/completed RPCs (non-cascading audit trail) | **Applied** |
| 040 | notification_sent + notification_tapped + notification_failed allow-list | **Applied** |
| 041 | article9_consent_withdrawn allow-list (paired with SettingsScreen Privacy withdrawal UI) | **Applied** |
| 042 | `upgrade_tier_for_user(_user_id, ...)` service-role-only RPC for the Play Billing RTDN webhook | **Applied** |
| 043 | `sync_conflict_resolved` event added to `record_engine_telemetry` allow-list. Fires from `src/lib/sync/conflict.js`. | **Applied** |
| 044 | `notification_preferences` table + RLS + updated_at trigger. Backs NOTIFICATIONS_LOCKED.md lines 117-119. SYNC_REGISTRY entry. | **Applied** (notification_preferences PGRST205 warnings in device log cleared after this) |
| 045 | `users_profile.column_updates_at jsonb` + safe-merge trigger. Powers the registry-locked `profiles.merge` conflict strategy via `column_updates_at` populated on push from `userProfileFieldUpdatedAt` and consumed on pull via `conflict.resolve(merge)`. | **Applied** end-of-day 2026-05-26 |
| 046 | `recipe_ingredients.updated_at + deleted_at` columns + BEFORE UPDATE touch trigger + partial live index. Required for the per-table push handler (which already ships both columns) — without 046 the push raises PGRST204 on every sync. Local SQLite already has both columns via the additive migration in commit bc117a1. First-apply attempt errored on a removed-from-cloud `created_at` reference in a backfill block; commit 6aa79ca dropped the backfill, second-apply attempt succeeded. | **Applied** end-of-day 2026-05-26 |
| 047 | `body_metrics.updated_at + deleted_at` + `weekly_checkins_v2.updated_at` + BEFORE UPDATE touch triggers refusing stale writes + partial live index over `body_metrics(user_id, metric_date) WHERE deleted_at IS NULL`. Closes the locked LWW + soft-delete gaps for the `body_composition_log` and `weekly_checkins_v2` registry entries; per-table handlers now ship updated_at on push and gate pulls with LWW. | **Applied** 2026-05-27 |

---

## 4. Telemetry event coverage (this session, comprehensive pass)

**All wired and emitting** (29 events live, broken down by panel):

| Panel | Events |
|---|---|
| **Panel 1: Active users / lifecycle** | sign_in, sign_out, app_cold_start, app_foregrounded, app_backgrounded |
| **Panel 2: Engine health** | weekly_coach_run, ffm_floor_hold_fired, ed_pattern_flag_fired, ed_pattern_flag_cleared, rapid_loss_compression_triggered, goal_lock_set, goal_lock_cleared |
| **Panel 3: Food layer health** | food_search_attempt, food_lookup_barcode, food_logged, custom_food_created, ocr_writeback_attempted |
| **Panel 4: Sync health** | sync_run |
| **Panel 5: Cascade and conversion** | cascade_started, cascade_advanced, cascade_skipped_ahead, cascade_state_transition, paid_converted, churn_at_gate, subscription_cancelled, paywall_shown, paywall_tapped_cta, purchase_initiated, purchase_completed, purchase_failed, restore_purchases_attempted, tier_changed |
| **Panel 8: Privacy and consent** | article9_consent_recorded, account_created |

**Not wired, with explicit rationale per event:**

| Event | Status | Reason |
|---|---|---|
| held_decision_created / held_decision_cleared | Skipped | Per-type events (ed_pattern_flag_fired, ffm_floor_hold_fired, rapid_loss_compression_triggered) already populate Panel 2 split-by-type. The umbrella event would duplicate rows without adding signal. |
| sync_conflict_resolved | Blocked by sync architecture | The single-file `src/lib/sync.js` doesn't have a structured conflict-resolution code path yet. Wire when the spec'd 7-file `src/lib/sync/` directory gets built (drift item in section 6 below). |
| account_deleted | Blocked by schema design | `engine_telemetry.user_id` has `ON DELETE CASCADE` so events fire and immediately die with the auth.users row at account-delete time. Needs a separate non-cascading `account_deletions_log` table (Panel 8 still has the deletion queue depth alert from a different source). |
| article9_consent_withdrawn | **Shipped this session** | SettingsScreen → Privacy section now has a "Health-data consent" row that shows current state and (when granted) lets the user withdraw via a destructive confirm. Flow calls `record_health_consent(false)`, updates `consent_log`, flips local mirror, fires `article9_consent_withdrawn` telemetry. Migration 041 adds the event to the allow-list. |

**Newly wired (migration 040, this session):**

| Event | Source | Notes |
|---|---|---|
| notification_sent | `RootNavigator` `addNotificationReceivedListener` | Fires at OS delivery time while the app process is alive. Payload carries category + `delivered_at`. Cold-start deliveries (process not running) are unobservable in JS and show up only via the tap event. |
| notification_tapped | `RootNavigator` `addNotificationResponseReceivedListener` (incl. cold-start `getLastNotificationResponseAsync`) | Fires on user tap. Payload carries category + `tapped_at` + data_type. |
| notification_failed | `src/lib/notifications/scheduler.js` + `src/lib/trainingReminders.js` catch paths | Fires when a schedule call throws locally. Cross-device deliverability is owned by Expo Push and is not surfaced here. |

---

## 5. Bugs surfaced via device log + fixed this session

Two real bugs from the sideloaded APK device log, both fixed and pushed:

**1. food.seed transaction nesting** (`src/lib/food/seed.js`)

OFF and CoFID importers fired from `RootNavigator` bootstrap as parallel
fire-and-forget promises. Both ran `BEGIN`/`COMMIT` on the same shared
SQLite connection; expo-sqlite rejected the second `BEGIN` with "cannot
start a transaction within a transaction" and later "cannot commit, no
transaction is active" once the first one finished. Despite the log
spam, the OFF import still landed 25,765 rows because `INSERT OR IGNORE`
worked outside the transaction wrapper.

Fix: module-level promise-chain mutex (`_withTxLock`) so every per-chunk
transaction queues behind the previous one regardless of which importer
owns it.

**2. engine_telemetry column-name typo** (migrations 029 + 032)

Migration 017 created the column as `payload_json`. Migrations 029 and
032 (event allow-list extensions) typoed it as `payload`. Result: every
cloud telemetry push for the post-029 events raised `column "payload"
of relation "engine_telemetry" does not exist`, while the local SQLite
copy still landed.

Fix: migration 034 re-creates `record_engine_telemetry` with the
correct column name and the full allow-list from 032. Subsequent
migrations (035, 036, 037, 038) all use `payload_json` correctly.

---

## 6. Structural drift vs locked specs

Code works but doesn't match locked module layout. None of this blocks
Phase A; flagged so future PRs can decide whether to align or accept.

| Locked spec | Reality | Effect |
|---|---|---|
| `src/lib/sync/` directory with 7 files (index, registry, runner, queue, conflict, transport, telemetry) per `SYNC_ARCHITECTURE_LOCKED.md` | **Fully built + all 16 registry tables migrated** (end-of-day 2026-05-26). The 7-file module plus 10 per-table handler files under `src/lib/sync/tables/` (`notificationPreferences`, `weeklyCheckins`, `bodyComposition`, `nutritionTargets`, `edPatternFlags`, `tierHistory`, `recipeIngredients`, `profiles`, `weightLog`, `foodDomain`). The food-domain coordinator handles the 7 tables that share food_sync_push / food_sync_pull RPCs via a single bulk call per syncAll, cached and reported per-table. The legacy `src/lib/sync.js` lost the food-domain section + per-table push/pull helpers (~580 lines removed); it now only holds the still-on-legacy bulk uploaders for exercises / routines / workout sets / mesocycles / morning_weights / coach_outputs / user_prefs / engine_telemetry queue. | Resolved. |
| `src/lib/notifications/` directory with 5 files per `NOTIFICATIONS_LOCKED.md` | **Exists** (`categories.js`, `quietHours.js`, `permissions.js`, `handler.js`, `scheduler.js`, `telemetry.js`, `index.js`) with `notification_*` telemetry wired + quiet-hours rule | Resolved this session. `trainingReminders.js` + `restNotifications.js` + `activeWorkoutNotification.js` still sit alongside as sibling files; pulling them into the directory is a follow-up. |
| `src/lib/telemetry/` directory with 4 files per `TELEMETRY_DASHBOARDS_LOCKED.md` | Single `src/lib/engineTelemetry.js` | Functional; allow-list + push live there |
| `src/screens/onboarding/` directory per `ONBOARDING_SEQUENCE_LOCKED.md` | Onboarding screens flat in `src/screens/` | Cosmetic |
| `src/components/food/` with 9 components per `UI_FLOWS_LOCKED.md` | **All 9 present** — `MacroRings`, `FoodDetailSheet`, `EmptyDiary`, `SourceChip`, `HeldDecisionCard`, `ServingPicker`, `MealSection`, `EntryRow` (incl. `SwipeableEntryRow` + `friendlyFoodName`), `FoodRow` (incl. `SOURCE_LABEL` + `kcalForServing`). | Resolved (end-of-day 2026-05-26). |
| `src/lib/observability/sentryScrub.js` per `PRIVACY_CONSENT_LOCKED.md` | **Exists** (`src/lib/observability/sentryScrub.js` plus 110 audit tests) | Privacy-critical; resolved |
| `src/lib/links.js` (single URL source) per `PRIVACY_CONSENT_LOCKED.md` line 280 | **Exists** (`src/lib/links.js`); `Article9ConsentScreen` imports `LINKS.privacyPolicy` | Resolved (commit `5055692`) |
| `tests/simulator/` per `TESTING_STRATEGY_LOCKED.md` | **Exists** at `tests/simulator/scenarios/` with all 12 locked scenarios | Resolved |
| `e2e/` per `TESTING_STRATEGY_LOCKED.md` § E2E lines 114-141 | **Exists** with all 12 spec'd flows + a smoke launch check; `.maestro/config.yaml`; structural linter wired into Jest (1370/1370 green); opt-in `maestro-e2e.yml` CI workflow | Phase 1 scaffold landed this session. 5 flows scaffolded (smoke + 4 founder-runnable); 4 await IAP/barcode/OCR fixtures (tagged `blocked`); 4 are scaffolded but selectors need first-run validation against a real device. |
| `tests/engine/`, `tests/snapshots/`, `tests/sync/`, `tests/payments/`, `tests/load/` | Engine + snapshot tests live in `src/__tests__/` + `src/lib/__tests__/`; sync/payments/load harnesses not stood up | Maestro Cloud (100 runs/mo free tier) reserved for pre-release validation; k6 load harness still deferred |

---

## 7. UI surface coverage

**Confirmed shipped** (verified via grep):
- Diary tab (DiaryScreen) with date pager, meal sections, food rows, MacroRings, "Add food" buttons, **swipe-delete** (SwipeableEntryRow), **Copy-yesterday FAB**, water tracker
- Search tab (FoodSearchScreen) with source chips, debounced search
- Scan barcode modal (ScanBarcodeScreen) with vision-camera, torch, freeze-on-read, auto-permission-request
- Scan label / OCR (ScanLabelScreen) with auto-permission-request
- Add Custom Food (AddCustomFoodScreen) with sanity check
- Food Insights extensions (FoodInsightsScreen) with 7-day chart, CSV export
- Article 9 consent screen
- Goal lock consent screen
- CascadeGateScreen (day-21 variant + day14/day28 back-compat aliases)
- SubscriptionScreen (You-tab management, restore button)
- PaywallScreen (modal for differential paywall pay tap)
- DifferentialBadge (inline on CoachOutputScreen below held-decisions block)
- TierComparisonStrip
- CreditsScreen (OFF/CoFID/USDA license attribution)
- You-tab Subscription row + Credits row

**Deferred** (lower-value vs effort, may revisit on telemetry signal):
- ~~Sync status indicator in nav header~~ **SHIPPED 2026-05-26** —
  `SyncStatusBadge` mounted via `stackOptions.headerRight` (commit
  `5235bb1`); NetInfo + AppState + 15-min periodic triggers wired
  through `syncAll({triggeredBy})`.
- Long-press multi-select toolbar on Diary entries (swipe-delete covers the common path)
- Diary: macro ring tap → per-meal breakdown sheet
- ~~Privacy management section in SettingsScreen~~ **SHIPPED
  2026-05-25** — Privacy section in You tab + Article 9
  withdrawal flow that queues account deletion per
  PRIVACY_CONSENT_LOCKED.md lines 71-72 + 251.

---

## 8. What's truly outstanding (the punch list)

Grouped by phase per `RELEASE_PLAN_LOCKED.md`.

### NOW (Phase A code work, in execution-order priority)

| # | Item | Spec | Effort | Owner |
|---|---|---|---|---|
| 1 | ~~Apply migrations 037 → 046~~ **All Applied** end-of-day 2026-05-26. Founder action queue is empty for migrations. | this doc § 3 | done | Founder |
| 2 | Privacy policy at volyume.app/privacy. File moved to `public/privacy/index.html` 2026-05-27 so GitHub Pages serves it at the extensionless `/privacy` URL (with `.nojekyll` in place). `public/CNAME` already names `volyume.app`; the `deploy-pages.yml` workflow auto-publishes on push to main. Remaining: founder configures DNS A/CNAME for `volyume.app` to point at the GitHub Pages site, then the URL is live. | `PRIVACY_CONSENT_LOCKED.md` lines 75-112 | S (founder DNS only) | Founder |
| 3 | ~~Build `src/lib/sync/` directory + per-table transport for all 16 tables~~ **Shipped** end-of-day 2026-05-26. All 16 registry tables on transport via 10 per-table handler files + food-domain coordinator; ~580 lines removed from legacy sync.js. Follow-up: sync regression matrix (8 × 16 = 128 paired tests per `TESTING_STRATEGY_LOCKED.md` lines 144-160). | `SYNC_ARCHITECTURE_LOCKED.md` | done | Claude |
| 4 | ~~Build `src/lib/notifications/` directory + wire `notification_*` events~~ **Shipped**. Follow-up: pull `trainingReminders.js` + `restNotifications.js` + `activeWorkoutNotification.js` into the directory. | `NOTIFICATIONS_LOCKED.md` | done | Claude |
| 5 | Maestro E2E framework + 12 critical-path flows | `TESTING_STRATEGY_LOCKED.md` lines 114-141 | M-L (~1 week) | Claude (Phase 1 shipped earlier this session). Follow-up: founder validates smoke bundle against a real device; selectors get tightened from there. F4 (Maestro #16 emulator boot diagnosis) still open. |
| 6 | ~~Extract `MealSection` / `EntryRow` / `FoodRow` into `src/components/food/`~~ **Shipped** end-of-day 2026-05-26. All 9 components from `UI_FLOWS_LOCKED.md` lines 18-28 now present. | `UI_FLOWS_LOCKED.md` | done | Claude |
| 7 | ~~CI trigger gap (workflows stopped firing on push after run #714)~~ **Fixed** end-of-day 2026-05-26 by removing the workflow's self-push step. Push events now fire workflow runs normally; status reports moved to artefacts. | `docs/CI_TRIGGER_DIAGNOSTIC_2026-05-26.md` | done | Claude |

### LATER (Phase A exit prep)

| Item | Spec | Effort | Owner |
|---|---|---|---|
| Generate Android upload keystore + configure Google Play App Signing | release-engineering | M | Founder + Claude (writes config) |
| Run a CI build with the keystore, verify the AAB is release-signed | `build-android.yml` already has the verification step | S | Both |
| Create 3 SKUs in Play Console (open beta visible, founders + standard hidden) | external | 1 h | Founder |
| Deploy `supabase/functions/play-billing-rtdn/index.ts` + configure Pub/Sub topic + service account | per RTDN code already written | M | Founder |
| Run sandbox purchase end-to-end (Android only), verify tier_history row + trial_state update | `MOVE_5_TIER_INFRASTRUCTURE.md` line 202 | M | Both |
| k6 load tests (1000-user sync, 100-user purchase, 10k weekly_coach) | `TESTING_STRATEGY_LOCKED.md` lines 183-193 | M | Claude |
| Promote next AAB to Closed Testing, then to production | release-engineering | external | Founder |
| ~~**Cloud schema / migration-file divergence audit.**~~ Diff query landed 2026-05-27 at `supabase/audit_cloud_schema_drift.sql` (read-only `information_schema` introspection against the hand-maintained set of (table, column) pairs the per-table sync handlers depend on). README § Cloud schema drift audit documents the workflow. Founder action: paste + run in the SQL Editor any time a sync handler gains a column or a migration is suspected of being half-applied; MISSING rows surface drift. CI grep enforcement of the audit's expected set against the live handlers is a follow-up. | `supabase/audit_cloud_schema_drift.sql` | done | Claude wrote; Founder runs |

### EVEN LATER (Phase B pre-launch)

| Item | Spec |
|---|---|
| Marketing site at volyume.app (waitlist signup form, pricing page "Coming soon") | `RELEASE_PLAN_LOCKED.md` lines 93-115 |
| Waitlist email template + one-time invite codes (200-500/week pace) | `MASTER_VISION_AND_PLAN.md` Decision 2.1 |
| Welcome push template for waitlist invitees | release plan |
| Incident response runbook | to be written |
| Support workflow (support@volyume.app forwarded) | release plan |
| Coach marketing landing page at volyume.app/coach ("phase 2 coming soon") | release plan |
| Bump version 1.1.0 → 1.2.0 (food + cascade work) | release plan |
| Publish first wave of 200 invite emails | release plan |
| Play store listing finalised (screenshots, privacy manifest, age rating) | `docs/PLAY_STORE_LISTING.md` |

### EXPLICITLY OUT OF SCOPE FOR NOW

- iOS / Apple Developer / App Store Connect / iOS SKUs (Android-only Phase B is locked)
- Cloud infrastructure migration (Azure/AWS) — deferred until post-launch stability
- Photo cloud sync (photos stay on-device forever)
- Recipe URL importer (v1.1)
- Body composition deep charts (v1.1)
- Share-pack PDF (v1.1)
- Refeed automation across any cut (v1.1)
- Coach surface (phase 2)
- Email notifications client-facing (v1.1)
- AI photo logging (never)
- Apple Watch app (never at v1)
- Web app for end users (never at v1)
- Peak Week module (founder removed 2026-05-25: "needs a human eye, not numbers")
- Complete tier + 28-day Complete→Pro cascade (founder consolidated to 2-tier 2026-05-25)
- RevenueCat (founder switched to Play Billing direct 2026-05-25)

---

## 9. Founder action queue (cleaned)

### Now

1. ~~Apply migration 045~~ **Applied** end-of-day 2026-05-26.
2. ~~Apply migration 046~~ **Applied** end-of-day 2026-05-26.
3. ~~Apply migration 047~~ **Applied** 2026-05-27.
4. ~~Stand up the live-cloud E2E test project~~ **Reversed** 2026-05-27. Test project + secrets did get set up; full T7/T8 live-cloud suite was authored. Founder then called the right shot: T7 (two-device propagation) and T8 (offline collision) test a scenario Volyume doesn't have — Android-only, single-device product, nobody carries a tablet to the gym. The only realistic cross-device path is sign-out + sign-in on a new handset, manually tested dozens of times. Suite at `src/lib/sync/__tests__/sync.e2e.liveCloud.test.js` stripped to a single skipped test that documents the deferral rationale. Supporting infrastructure (`supabase/test_project_bootstrap.sql`, `audit_cloud_schema_drift.sql`, the auto-post Jest failure CI step, `scripts/verify-e2e-setup.js`) stays in the repo — that work has standalone value for any future Jest failure diagnosis. Founder may now safely tear down the throwaway Supabase project / GitHub secrets if desired; they can be re-stood-up from `supabase/README.md § Live-cloud E2E test project` if Volyume ever ships a tablet or web companion.
5. (Optional, low priority) Add `EXPO_PUBLIC_USDA_API_KEY` repo secret if USDA fallback is wanted active.

### When Claude says "Phase A code work complete, ready for Phase A exit prep"

3. Generate Android upload keystore. Claude writes the commands.
4. Set up Google Cloud Pub/Sub topic for Real-Time Developer Notifications + deploy `supabase/functions/play-billing-rtdn/index.ts`.
5. Create 3 SKU products in Play Console (open beta visible, others hidden).
6. Set up sandbox testers in Play Console for end-to-end purchase test.
7. Point volyume.app DNS (A + CNAME records) at the GitHub Pages site so `volyume.app/privacy` resolves. File + deploy workflow already in place (`public/privacy/index.html` + `.github/workflows/deploy-pages.yml`); DNS is the only remaining piece.

### When Phase A exit checklist is green

8. Promote next AAB to Closed Testing.
9. After internal sanity test passes, promote to production.
10. Stand up the marketing site + waitlist.
11. Send first wave of 200 open-beta invites.

### Never (in current scope)

- Apple Developer account / App Store Connect / iOS SKU work — Android-only Phase B is locked.

---

## 10. Stop reading sources, start writing this once

When my proposals contradict this doc, this doc wins. When this doc
contradicts the LOCKED specs, the LOCKED specs win. When the founder
contradicts either, the founder wins (and we update this doc).

`HANDOFF.md` is no longer the source of truth. It's preserved as
historical context. New Claude sessions should read THIS doc first.

---

## Appendix: documents I have personally read end-to-end while writing this

LOCKED specs:
- MASTER_VISION_AND_PLAN.md
- COMPLETE_TIER_SCOPE_LOCKED.md
- SUBSCRIPTION_AND_PAYMENT_LOCKED.md
- RELEASE_PLAN_LOCKED.md
- DATABASE_SCHEMA_LOCKED.md
- SYNC_ARCHITECTURE_LOCKED.md
- ONBOARDING_SEQUENCE_LOCKED.md
- PRIVACY_CONSENT_LOCKED.md
- UI_FLOWS_LOCKED.md
- NOTIFICATIONS_LOCKED.md
- TELEMETRY_DASHBOARDS_LOCKED.md (full re-read 2026-05-25 evening to drive the comprehensive telemetry pass)
- PRODUCTION_READINESS_LOCKED.md
- IDENTITY_AND_OWNERSHIP_LOCKED.md
- BUDGET_POSTURE_LOCKED.md
- FOOD_DATA_STRATEGY_LOCKED.md

Move plans:
- MOVE_4_DIFFERENTIAL_PAYWALL.md
- MOVE_5_TIER_INFRASTRUCTURE.md

Not yet read end-to-end (only matters if/when their surface area is touched):
- COACHING_VOICE_SYNTHESIS_LOCKED.md (708 lines, copy-rules-heavy; shipped Moves already comply per voice snapshot tests)
- GROWTH_STRATEGY_SYNTHESIS_LOCKED.md (726 lines, marketing-focused; matters for Phase B waitlist work)
- MOVE_0 through MOVE_3 plan docs (shipped per code; only relevant for gap-audit)

Code verified directly with grep / Read against locked specs (this session):
- `src/lib/proGate.js` (has isPaidTier + hasFeature + hasGoalUnlock + FEATURE_MAP collapsed to 2-tier)
- `src/lib/sync.js` (still single-file)
- `src/lib/engineTelemetry.js` (33 events allow-listed)
- `src/lib/payments/` (playBilling, catalogue, cascade, restore, index — all shipped)
- `src/lib/observability/sentryScrub.js` (exists with 110 audit tests)
- `src/screens/onboarding/` (still doesn't exist)
- `src/components/food/` (only MacroRings + FoodDetailSheet)
- `supabase/migrate_*.sql` (015 through 038 present)
- `supabase/functions/` (delete-account + play-billing-rtdn shipped)
- `tests/simulator/scenarios/` (all 12 locked scenarios shipped)
- `public/privacy/index.html` (in repo + deploy workflow wired; serves at volyume.app/privacy once DNS resolves)
- App Store Connect / Apple Developer (founder confirms: nothing)
- Google Play Console (founder confirms: AAB live in Closed Testing, no keystore yet)
