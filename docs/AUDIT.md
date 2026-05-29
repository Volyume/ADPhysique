# Volyume / ADPhysique full audit

Senior-engineer + product audit. Read-only pass: no application code was
changed. The only file written is this document.

- Date: 2026-05-29
- Branch: `claude/chat-context-overflow-JYbA8`, HEAD `4e6ff7f`, identical to
  `origin/main` (0/0), clean tree.
- Method: four parallel dimension audits (security, correctness, UX, architecture),
  then direct verification of every High and Critical candidate at file:line.
  The docs in this repo have drifted from code repeatedly, so findings were
  checked against code, not against `CURRENT_STATUS.md`.

Honesty markers used below:
- **[Verified]** I read the code/SQL and confirmed it myself.
- **[Reported]** Surfaced by a dimension pass with a file:line and (for copy) a
  verbatim quote, not independently re-read.
- **[Uncertain]** A plausible finding that needs a check I could not complete in
  a read-only sandbox (for example, inspecting the live cloud).

Two candidate Criticals from the first pass were **downgraded on verification**
(a child-table upsert that a server trigger actually rescues, and a
workout-resurrection bug whose trigger path does not exist today). There are
no confirmed Critical findings. That is a real result, not a gap in the pass.

---

## 1. Executive summary: top 10 by severity

1. **[Corrected, not a live bug] Soft-deleted plans resurrect on reinstall.**
   Overturned during Phase 1 implementation (2026-05-29). Routines are hidden by
   `is_active = 0`, which both delete paths set and `insertRoutineFromCloud`
   restores; the omitted `deleted_at` is never a routine read filter, and
   programmes/mesocycles/workouts have no delete path at all. No change made.
   See finding B1 for the evidence.
2. **[High] No linter in the repo.** No eslint config or `lint` script. The
   `no-undef` / `exhaustive-deps` / `no-unused-vars` classes go uncaught and have
   already shipped two runtime bugs. Highest-impact single fix.
3. **[High, FIXED 2026-05-29 Phase 2] Local food data is not wiped on sign-out.**
   `wipeAllUserData` omitted every food table, so on a shared device user B
   could read user A's cached food log, recipes, and custom foods (contradicts
   locked decision 2). Fixed: the nine food tables are now in the exported
   `WIPE_DIRECT_TABLES` set the wipe deletes by `user_id`, with a regression
   test. See finding A1.
4. **[High] Migration 049 is a live trap.** The client still pushes and pulls
   `peak_week_plans` (`sync.js:1002`, `:1455`). Applying the drafted 049 before
   those refs are removed and a build ships would 42P01 every sync run.
5. **[High, FIXED 2026-05-29 Phase 3] Hero gradients on the home screen.**
   `GradientCard` rendered a `LinearGradient` hero (HomeScreen, AthleteHub,
   YearOfLifts), against the locked "no gradients, background `#0D0D0D`" rule.
   Fixed: the component now renders a flat `colors.surface` card with an amber
   accent border, no gradient. Needs an on-device visual check.
6. **[High] Two sync layers with ambiguous ownership.** Screens import both
   legacy `sync.js` and modular `sync/`; the legacy file is both a provider and
   a re-export shim of the new one. This is the documented cause of the past
   full-pull-abort bug.
7. **[High] Runtime-critical notification modules untested.** `channels.js`,
   `activeWorkout.js`, `trainingReminders.js` have zero tests, against Rule 7.
8. **[High] God-objects.** `database.js` is 5,334 lines and `sync.js` 1,725; the
   most runtime-critical files are the hardest to review safely.
9. **[High] Chatbot-shaped error toasts on a primary screen.** `SettingsScreen.js:373`
   and `:525` are three-sentence reassurance bodies; the voice rule wants two
   terse lines.
10. **[Medium] Queue op can silently drop a body-metric write.** `syncQueue.js:154-159`
    returns success unconditionally for `body_metric`, unlike its siblings which
    fall back to the bulk path. Latent silent data loss.

---

## 2. Full findings

Each finding: location, what is wrong, why it matters, severity, fix.

### A. Security & data ownership

**A1. Food tables (and others) are absent from the sign-out wipe.** [Verified, FIXED 2026-05-29 Phase 2]
- **Fix shipped.** The direct-user_id table list was extracted to an exported
  `WIPE_DIRECT_TABLES` const in `database.js` with the nine food tables added
  (`food_entries`, `custom_foods`, `saved_meals`, `recipes`,
  `recipe_ingredients`, `daily_water`, `food_favourites`,
  `daily_intake_rollups`, `food_frequents`), all of which carry `user_id`
  locally. Regression test `src/lib/__tests__/wipeAllUserData.test.js`. The
  non-uid-scoped custom-exercise delete was left as-is on purpose: the local
  store is single-tenant by the wipe-on-sign-out design, and scoping it by
  `user_id` would miss legacy custom rows with a null `user_id`.
- Location: `src/lib/database.js:3034-3060` (`wipeAllUserData` `directTables`),
  parent-chain `:3070-3121`, custom-exercise wipe `:3138`.
- What: the wipe list covers training, body, coaching, and notification tables
  but none of `food_entries, custom_foods, saved_meals, recipes,
  recipe_ingredients, daily_water, food_favourites, daily_intake_rollups,
  food_frequents`. The custom-exercise delete (`DELETE FROM exercises WHERE
  is_custom = 1`) is not scoped by `user_id`.
- Why: locked decision 2 says sign-out wipes local SQLite for user-scoped
  tables. On a shared device (locked scenario H), after A signs out and B signs
  in, B can read A's locally cached food log, recipes, custom foods, and water
  until they are overwritten. Cloud RLS still protects the server copy; this is
  a local leak. Bounded by the single-device assumption, but the locked doc
  explicitly covers the shared-device case.
- Severity: **High** (cross-user local data visibility, conformance breach).
- Fix: add all food tables to `directTables` (they all carry `user_id`), add
  `recipe_ingredients` to the parent-chain or direct, and scope the
  custom-exercise delete by `user_id`. Extend the existing sign-out/sign-in
  mount test to assert the food tables are empty between users. No migration.

**A2. Child-table push omits `user_id` and leans on a server trigger.** [Verified, FIXED Phase 4]
- Location: `src/lib/sync.js:715-726` (routine_exercises) and `:766-771`
  (mesocycle_weeks), upsert at `:732` and `:773` with `onConflict:'user_id,id'`.
- What: both payloads omit `user_id`. The sibling `mesocycles` push sends it
  (`sync.js:750`).
- Why it is NOT data loss: `migrate_018_composite_pks.sql` installs a
  `BEFORE INSERT` trigger (`routine_exercises_inherit_user_id` /
  `mesocycle_weeks_inherit_user_id`) that fills `user_id` from the parent. In
  Postgres the `BEFORE INSERT` trigger fires before the `ON CONFLICT` arbiter is
  evaluated, so the upsert resolves to the correct `(user_id, id)` row and edits
  do sync. The first pass rated this High ("edits silently fail"); that premise
  is wrong.
- Severity: **Low** (robustness and consistency). It works only because of the
  server trigger; if that trigger is ever dropped, edits break, and the code
  reads inconsistently with the sibling that sends `user_id`.
- Fix: add `user_id: supabaseUserId` to both row maps (thread `supabaseUserId`
  into `_pushRoutineExercises`). Behaviour-preserving.

**A3. RLS is solid; `WITH CHECK` is implicit.** [Reported]
- Location: `supabase/schema.sql` (per-table `FOR ALL USING (auth.uid() = ...)`).
- What: every user-scoped table has RLS with an own-row `auth.uid()` policy; no
  `USING (true)` or public-write policy was found. Policies are `FOR ALL USING`
  with no explicit `WITH CHECK`.
- Why: for `FOR ALL`, Postgres reuses `USING` as the write check, so a user
  cannot insert someone else's `id`. An explicit `WITH CHECK` is the hardening
  norm and removes the reader's doubt.
- Severity: **Low** (defence-in-depth).
- Fix: add `WITH CHECK (auth.uid() = ...)` to the policies in a future schema
  pass. Not urgent.

**A4. Secret handling is clean; stale "Continue Locally" copy.** [Reported]
- Location: `src/lib/supabase.js:27-31` (env-only anon key), error strings at
  `:72,78,90,116`.
- What: the client uses only `EXPO_PUBLIC_SUPABASE_ANON_KEY` from env; no
  `service_role` key anywhere in `src/`; service-role use is confined to Edge
  Functions via `Deno.env.get`. No committed `.env`, no keys in `app.json`. The
  only issue is user-facing error copy that still mentions "Continue Locally", a
  feature removed under locked decision 1 (no anonymous mode).
- Severity: **Low** (no exposure; stale copy contradicts a locked rule).
- Fix: rewrite those error strings to drop the anonymous-mode reference.

**A5. Service-role RPCs are correctly locked.** [Verified]
- `upgrade_tier_for_user` (`migrate_042`) and the account-deletion log RPCs
  (`migrate_039`) `REVOKE` from `public/authenticated/anon` and `GRANT` to
  `service_role` only. `delete_user_data` is `SECURITY DEFINER` keyed on
  `auth.uid()`, intentionally callable by `authenticated`, invoked under the
  user JWT by the `delete-account` Edge Function. No finding; recorded as
  checked.

**A6. Committed one-off destructive script.** [Verified]
- Location: `supabase/nuke_uid_a7379dc8.sql`.
- What: a one-off cleanup script with a hardcoded user id sits in the repo.
- Why: not a live risk (it is not wired to anything), but destructive SQL keyed
  to a real uid should not live in source control where it can be pasted by
  mistake.
- Severity: **Low** (housekeeping).
- Fix: delete it, or move it out of the repo.

**A-info. Verify migration 025 applied in cloud.** [Uncertain]
- `delete_user_data` in `schema.sql` predates the food/telemetry tables;
  `migrate_025` is the complete version. I cannot inspect the live DB. Confirm
  025 is applied so account deletes are complete (`supabase/README.md` tracking).

### B. Correctness & runtime

**B1. Soft-deleted plans resurrect on reinstall (tombstone not honoured).** [Corrected: NOT a live bug]
- **Correction (2026-05-29, Phase 1 implementation).** This finding does not
  hold. The original analysis traced the `deleted_at` omission in the restore
  helpers but not the actual hide mechanism. Routines are hidden by
  `is_active = 0`, not by `deleted_at`: both delete paths (`softDeleteRoutine`
  `database.js:1718` and `deleteOrphanedRoutines` `:1808`) set `is_active = 0`,
  every routine read filters on `is_active` (`database.js:1689, 2126, 2153,
  2221`), none filter on `deleted_at`, and `insertRoutineFromCloud` restores
  `is_active` from the cloud row. So a deleted routine stays hidden after a
  reinstall. Programmes, mesocycles, and workouts have no soft-delete path at
  all (only `softDeleteRoutine` exists), so there is nothing to resurrect. The
  omitted `deleted_at` on restore is inert for these tables. No change was
  made. The detail below is the original (incorrect) analysis, kept for the
  record.
- Location: pull `src/lib/sync.js:1556-1599` (`_pullRoutinesAndExercises`),
  restore helpers `src/lib/database.js:3950` (`insertRoutineFromCloud`),
  `:3974` (`insertProgrammeFromCloud`), `:4248` (`insertMesocycleFromCloud`).
  Soft-delete at `database.js:1715/1808` (`softDeleteRoutine` sets `deleted_at`),
  push sends `deleted_at` (`sync.js:876`).
- What: a user can soft-delete a routine (sets `deleted_at`, hidden from the UI),
  and the push propagates `deleted_at` to cloud. The pull selects `*` (so it
  receives `deleted_at`), but the restore helpers do not write `deleted_at`:
  `insertRoutineFromCloud`/`insertProgrammeFromCloud` use `INSERT OR IGNORE` and
  `insertMesocycleFromCloud` uses `INSERT OR REPLACE`, and none of the three list
  `deleted_at`. On the same device `INSERT OR IGNORE` preserves the local
  soft-delete, but on a reinstall or full restore (local empty) the cloud row is
  inserted as live.
- Why: locked scenario F says a reinstall is a clean restore. A deleted plan
  reappearing is a real data-integrity break on a documented path. With
  `INSERT OR REPLACE`, mesocycles can resurrect even on the same device on the
  next pull. Workouts share the gap (`insertWorkoutFromCloud:4217` omits
  `deleted_at`, pull `:1179` omits it) but completed workouts have no delete path
  today (`database.js:1314` only deletes `is_completed = 0`), so for workouts it
  is latent, not live.
- Severity: **High**.
- Fix: have the restore helpers carry `deleted_at` (restore a tombstoned cloud
  row as a local soft-delete, not as live). No migration (the columns exist both
  sides). Regression test: soft-delete a routine, simulate a full pull, assert it
  stays deleted. Runtime-critical: tests in the same commit.
- Related note: `INSERT OR IGNORE` on routine/programme restore also means a
  cloud edit never overwrites an existing local row, so plan edits would not
  propagate across devices. Moot under the single-device assumption; flagged in
  "Rules to revisit".

**B2. Queue can silently drop a `body_metric` write.** [Reported]
- Location: `src/lib/syncQueue.js:154-159`.
- What: the `body_metric` case calls `safeCall(sync.syncBodyMetric, ...)` and
  then unconditionally `return true`, which deletes the queue row. The
  `morning_weight` and `check_in` cases (`:166-176`) fall back to
  `bulkUploadLocalData` when `safeCall` returns null.
- Why: `syncBodyMetric` exists today, so this is latent. The moment that export
  is renamed or removed, the body-metric write is dropped with only a warning.
  The asymmetry is a trap.
- Severity: **Medium** (latent silent data loss).
- Fix: mirror the `r === null` bulk fallback the sibling cases use. Test.

**B3. Migration 049 is a coordination trap.** [Verified]
- Location: drafted `supabase/migrate_049_drop_peak_week_plans.sql`; live client
  refs `sync.js:1002` (push), `:1455` (pull), `database.js` CRUD (`:201, 3900,
  4552`), wipe and backup lists.
- What: 049 drops `peak_week_plans`, but the client actively pushes and pulls it
  on every sync.
- Why: applying 049 before the client refs are removed and a build ships would
  raise 42P01 on every push and pull, for both the frozen AAB and a new build.
- Severity: **High** (process/coordination hazard, currently latent because 049
  is held).
- Fix: keep 049 held. Ordering to remove peak-week: (1) delete the client
  push/pull/CRUD refs, (2) ship a build, (3) only then apply 049. Documented in
  `supabase/README.md` already; restate in the fix plan.

**B4. Client telemetry event ahead of the server allow-list re-pushes forever.** [Resolved: no drift today, guard added Phase 4]
- Location: `src/lib/telemetry/transport.js:84-94`; server check
  `migrate_017...:172-184` (`record_engine_telemetry` `RAISE EXCEPTION` on
  unknown event).
- What: the client gate is `ALLOWED_EVENTS` in `events.js`. If a new event is
  added there but the matching server allow-list migration is not applied, every
  flush of that row errors and `continue`s without marking it pushed, so it
  re-pushes every cycle and clogs the queue head.
- Why: same shape as past telemetry bugs. Whether it is live depends on whether
  `events.js` is currently ahead of the deployed server list, which I cannot
  confirm from the client alone.
- Severity: **Medium** (Uncertain).
- Fix: add a CI check diffing client `ALLOWED_EVENTS` against the server RPC's
  `IN (...)` list so the two never drift.

**B5. Dead RPC wrappers with wrong param names.** [Reported, FIXED Phase 4]
- Location: `src/lib/sync/transport.js:183-211` (`pullChanges`, `pushChanges`).
- What: they call `food_sync_pull`/`food_sync_push` with `{_since}` / `{_changes}`,
  but the deployed RPC params are `last_pulled_at` / `changes` (`migrate_016`).
  Neither export has a caller (the live path is `foodDomain.js`, which uses the
  correct names).
- Severity: **Low** (loaded footgun).
- Fix: delete the dead wrappers or correct the param names.

**B6. recipe_ingredients pulled before recipes within a cycle.** [Reported, FIXED Phase 4]
- Location: `src/lib/sync/transport.js:79-90` (`MIGRATED_TABLES` order),
  `runner.js:127` pulls in array order.
- What: the child `recipe_ingredients` precedes the parent `recipes`.
- Why: harmless today because local `recipe_ingredients` has no FK on `recipe_id`
  (index only) and restore is a plain `INSERT OR REPLACE`. It would bite the day
  an FK is added.
- Severity: **Low**.
- Fix: order parents before children in `MIGRATED_TABLES`.

**B7. Food push watermark boundary operator.** [Uncertain]
- Location: `src/lib/food/db.js` `getAll...Since` selectors vs the watermark
  advanced to the server `data.timestamp` in `foodDomain.js:256-277`.
- What: if the `getAll...Since` comparison is strict `>` against the server-time
  watermark rather than `>=`, a row written at exactly the boundary could be
  skipped on the next cycle.
- Severity: **Low** (Uncertain).
- Fix: confirm the operator is inclusive (`>=`); the workouts/programmes
  watermark advance uses `nextWatermark` over received-row max, which is the safe
  pattern to mirror.

**B8. Quiet-hours edge stacking.** [Reported]
- Location: `src/lib/notifications/quietHours.js:90-100`.
- What: an in-window reminder is shifted to exactly the window end, so several
  categories can land on the same minute.
- Severity: **Low** (cosmetic).
- Fix: spread shifted reminders by a small per-category offset.

Checked and clean (recorded so the pass is not mistaken for missing them):
foreground notification handler matches the SDK-51 return shape
(`handler.js:34-38`); notification listeners dispose correctly
(`listeners.js:84-100`); migrations 052/054/055 are additive and safe for the
frozen AAB; scheduling is permission-gated through `restoreNotifications`.

### C. UX, design & copy

**C1. Hero gradients on the home screen.** [Verified]
- Location: `src/components/GradientCard.js` (renders `LinearGradient` at
  `:90-101`), used at `HomeScreen.js:728` (daily-narrative hero),
  `AthleteHubScreen.js:13`, `YearOfLiftsScreen.js:162`.
- What: a literal two-stop gradient primitive on the most-used screen.
- Why: the locked design rule is "no gradients, background `#0D0D0D`". This is
  the clearest no-AI-fingerprint breach in the app, and it is on the home hero.
- Severity: **High** (hard brand-rule breach, primary screen).
- Fix: render flat (the component already has a no-gradient fallback at `:81-88`):
  `colors.surface` with an amber accent border or left rule. Verify on device.

**C2. Chatbot-shaped error toasts.** [Verified, verbatim]
- `src/screens/SettingsScreen.js:373`: "We couldn't sync your data to the cloud
  first. Check your connection and try again. Your edits are safe locally until
  they ship."
- `src/screens/SettingsScreen.js:525`: "The cloud delete failed: {err}\n\nYour
  account and data are still safe. Try again in a few minutes, or contact support
  if it keeps happening."
- Why: the voice rule wants two terse lines ("Couldn't sign out." / "Try again.").
  Both are the over-explaining reassurance pattern CLAUDE.md calls out by name.
- Severity: **High** (voice breach on a primary screen).
- Fix: cut each to a short title plus "Try again.".

**C3. Unsolicited encouragement.** [Verified, verbatim]
- Location: `src/screens/WorkoutSummaryScreen.js:562` "Nice work, {firstName}.".
- Why: "Volyume reports facts; the user's emotional response is their own." This
  is the banned shape.
- Severity: **Medium**.
- Fix: drop the greeting or replace with a factual session line.

**C4. "Please try again." softness.** [Reported]
- Location: HomeScreen (`388/592/608/629/668`), PlanDetail, RoutineDetail and
  others.
- What: pervasive "Please try again." rather than the locked terse "Try again.".
- Severity: **Low** (consistent but consistently off-voice).
- Fix: normalise to "Try again." in an error-copy sweep.

**C5. Hardcoded hex bypassing tokens and the colour-blind palette.** [Reported]
- `src/screens/ProUpgradeScreen.js:482-484` (`#000000`/`#FFFFFF` when
  `appleBtnBg`/`appleBtnText` tokens exist), Apple logo colour inline at
  `LoginScreen.js:274` and `ProOnboardingScreen.js:592`;
  `src/screens/ManualBuilderScreen.js:258-262` (a raw hex volume colour map);
  `src/components/SyncStatusBadge.js:27-30` (`#16A34A`/`#DC2626`).
- Why: the raw hex maps duplicate `colors.success/error/warning` and bypass the
  CVD palette swap, so those surfaces will not recolour for colour-blind users.
- Severity: **Medium**.
- Fix: route through theme tokens.
- Note: the three previously-tracked hex lapses (`Article9ConsentScreen`,
  `CoachOutputScreen`, `NutritionTargetsScreen`) are remediated; zero hex now.

**C6. Hardcoded pixel values.** [Reported]
- Location: widespread, for example `HomeScreen.js:1982/2340/2406`,
  `DiaryScreen.js:646`.
- What: raw `borderRadius`/`padding` numbers where `radius`/`spacing` tokens
  exist.
- Severity: **Low** (polish debt).
- Fix: token sweep over time.

Checked and clean: em dashes are absent from user-facing copy (only in test
fixtures and an OCR sanitiser); no banned AI-tell phrases survive in shipped
strings; no US spellings in user copy; imperial units appear only behind an
explicit opt-in preference, not as a default. Terminology ("Plan", "Routine",
"Mesocycle", "Session") is used consistently.

### D. Architecture & code quality

**D1. No linter or static analysis.** [Verified]
- Location: no `.eslintrc*`, no `eslint.config.*`, no `lint` script in
  `package.json`; `runner.js:73` and `useAppStore.js:77` carry
  `eslint-disable-next-line` comments for a linter that does not run.
- Why: across ~188 source files, `no-undef`, `react-hooks/exhaustive-deps`, and
  `no-unused-vars` are uncaught. Two such bugs have already shipped: the
  `notifPrefCount` ReferenceError that aborted `pullFromCloud`, and the
  `flushPendingTelemetry` wrong-module import that silently stopped the sign-out
  telemetry flush.
- Severity: **High** (highest-impact fix in this audit).
- Fix: add eslint with `eslint-plugin-react-hooks`; enable `no-undef`,
  `no-unused-vars`, `react-hooks/rules-of-hooks` as errors and
  `react-hooks/exhaustive-deps` as a warning; wire it into `main-ci.yml`. Expect
  an initial backlog of warnings; gate on errors first.

**D2. Two sync layers coexist with ambiguous ownership.** [Verified]
- Location: legacy `src/lib/sync.js` (1,725 lines) vs modular `src/lib/sync/`;
  screens import both (`LoginScreen.js:19`, `ProOnboardingScreen.js:18`,
  `ProUpgradeScreen.js:11` use legacy helpers; `SyncStatusBadge.js` uses
  `getStatus/syncAll`, which `sync.js` re-exports back from `sync/index.js`).
- Why: a table's owning layer is ambiguous; the half-migration comments in
  `sync.js` mark the seam. This is the documented cause of the past
  full-pull-abort bug.
- Severity: **High**.
- Fix: this is the row-12 coexistence refactor. The watermark perf win already
  shipped, so there is no user-facing benefit and high regression risk; the
  founder has already chosen to defer the full refactor. Keep deferred; do the
  contained robustness items (A2, B5, B6, B4 CI check) instead. See "Rules to
  revisit".

**D3. God-objects.** [Verified]
- Location: `database.js` 5,334 lines (schema, per-table CRUD, and bulk scans in
  one file, 61 `SELECT *`), `sync.js` 1,725, `planEngine.js` 1,455,
  `useAppStore.js` 910, `RootNavigator.js` 1,065.
- Why: the most runtime-critical files are the hardest to review safely, which
  raises the risk of every change to them.
- Severity: **High** (maintainability risk on runtime-critical code).
- Fix: split `database.js` by domain (workouts / food / body / sync-helpers)
  behind a thin index, incrementally, with tests. Large; sequence carefully.

**D4. Runtime-critical notification modules untested.** [Verified]
- Location: tests live in `src/lib/__tests__/notifications.*` and cover
  scheduler, handler, permissions, pushToken, quietHours, categories, telemetry,
  listeners, preferences. No test imports `notifications/channels.js`,
  `notifications/activeWorkout.js`, or `notifications/trainingReminders.js`.
- Why: Rule 7 says runtime-critical files must have tests. OS channel
  registration, the live-activity foreground path, and training-reminder
  scheduling are uncovered.
- Severity: **High**.
- Fix: add unit tests for the three modules.

**D5. Circular-import workarounds.** [Verified]
- Location: `runner.js:64-74` requires `../sync.js` with an explicit `.js` to
  stop Metro looping on `./index.js`; `useAppStore.js:77` lazy-requires
  `../lib/sync` inside a `setTimeout`.
- Why: a live cycle (`store -> sync -> runner -> sync`) is being worked around,
  not designed out.
- Severity: **Medium**.
- Fix: extract the shared surface both sides need into a leaf module with no
  back-imports.

**D6. Dependency health.** [Verified]
- Two charting stacks ship: `react-native-gifted-charts` (6 files) plus
  `victory-native` (2 files) and its `@shopify/react-native-skia` renderer.
- `react-native-calendar-heatmap` is referenced only in a jest mock
  (`screen-mount.test.js:212`), not imported by any source file: effectively a
  dead dependency, on a risky `^0.2.x` range.
- Caret (`^`) ranges on Expo-managed native modules (`@sentry/react-native`,
  `react-native-iap`, `react-native-vision-camera`,
  `@react-native-ml-kit/text-recognition`, `victory-native`) can float to a
  minor that breaks the native build on Expo SDK 51 (RN 0.74.5).
- `jest.config.js` has no `transformIgnorePatterns`, which is why
  `react-native-url-polyfill` (ESM) flakes under the parallel runner.
- Severity: **Medium**.
- Fix: drop `react-native-calendar-heatmap`; consolidate to one charting stack
  if the single victory-native screen can move to gifted-charts (removes the
  Skia weight); pin native deps with `expo install`; add an explicit
  `transformIgnorePatterns`.

**D7. Performance hot spots.** [Reported]
- Lists: 14 of 59 screens use `FlatList`; histories that grow with user data
  render via `ScrollView` + `.map` without virtualisation
  (`WorkoutHistoryScreen`, `PRWallScreen`, `BodyMetricsScreen`,
  `MesocycleBuilderScreen`).
- Data: 61 `SELECT *` including bulk getters (`getAllExercises:1153`,
  `getAllWorkoutSets:1319`) feed the full bulk upload.
- Severity: **Medium**.
- Fix: move growing lists to `FlatList` with `keyExtractor`; select only needed
  columns in bulk getters.

**D8. Migration tracking and status-doc drift.** [Verified]
- Location: 53 migration files exist; `supabase/README.md` tracks roughly
  037-055 and `CURRENT_STATUS.md` §3 tracks 015-052, so 001-036 sit in neither
  tracker. `CURRENT_STATUS.md` also contradicts itself (§6 marks Saved Meals and
  Notifications done while §8 lists them open) and names a stale session branch
  in §1.
- Why: Rule 6 wants the tracker complete; the source-of-truth doc misleading the
  next session is the exact failure that caused rework earlier this week.
- Severity: **Low/Medium** (process risk).
- Fix: backfill the early migrations into the tracker; reconcile the
  CURRENT_STATUS internal contradictions.

---

## 3. Phased fix plan

Each phase is small enough to review and ship alone. Phases marked
**[runtime-critical]** must land their tests in the same commit (Rule 7). No
phase needs a new migration; the standing pending migrations (048, 050, 051,
052, 053, 054, 055; 049 held) are founder-applied and independent of this work.
Migration 052 (the live `daily_water` sync error) should be applied as soon as
possible regardless of this plan.

**Phase 0: safety net (no runtime-critical code). DONE 2026-05-29 (`8b41675`).**
- D1: eslint flat config + errors-only CI job + lint scripts. Gate caught and
  fixed two real issues (CascadeGateScreen undefined `state`, BackHeader hook
  guard).
- D8: CURRENT_STATUS contradictions and stale branch ref corrected.

**Phase 1: data-integrity fixes. [runtime-critical: offline sync + DB contracts] DONE 2026-05-29.**
- B1: investigated, NOT a live bug (see the correction on finding B1: routines
  are hidden by `is_active`, which is restored; other tables have no delete
  path). No change made.
- B2: `body_metric` queue case now falls back to the bulk push when its
  dedicated sync fn is missing, matching `morning_weight` / `check_in`. New
  regression test `src/lib/__tests__/syncQueue.test.js`. No migration.

**Phase 2: sign-out wipe completeness. [runtime-critical: identity] DONE 2026-05-29.**
- A1: the nine food tables were added to the wipe via the exported
  `WIPE_DIRECT_TABLES` set; regression test in
  `src/lib/__tests__/wipeAllUserData.test.js`. The custom-exercise delete was
  left non-uid-scoped on purpose (single-tenant local store; scoping would miss
  legacy null-`user_id` rows). Reconciles locked decision 2. No migration.

**Phase 3: copy and design fingerprint (UX, not runtime-critical). DONE 2026-05-29.**
- C1: `GradientCard` now renders flat (`colors.surface` + amber accent border),
  no gradient, on Home / AthleteHub / YearOfLifts.
- C2: the two `SettingsScreen` chatbot error toasts cut to terse lines.
- C3: the `WorkoutSummary` "Nice work" greeting removed.
- C4: standalone "Please try again." normalised to "Try again." across the
  screens (compound and informational variants left as-is).
- C5: `ProUpgrade` / `ManualBuilder` / `SyncStatusBadge` (and the Apple-logo
  colour in `LoginScreen` / `ProOnboarding`) routed through theme tokens, which
  restores the colour-blind palette swap on those surfaces.
- A4-copy: the stale "Continue Locally" strings in `supabase.js` rewritten.
- **Not verifiable here:** the sandbox cannot run the app, so the visual result
  (especially the flat hero) needs an on-device check. Lint green, 449-test
  mount sweep green.

**Phase 4: contained sync robustness. [runtime-critical: offline sync] DONE 2026-05-29.**
- A2: `routine_exercises` / `mesocycle_weeks` push now sends `user_id`
  explicitly (no longer relying on the inheritance trigger alone); matches the
  sibling pushes. Behaviour-preserving (the trigger set the same value).
- B4: added a jest guard (`telemetry/__tests__/allowlistDrift.test.js`)
  asserting every client `ALLOWED_EVENTS` member appears in the migration
  allow-lists. Checked: zero drift today (all 39 events present). Runs in the
  existing CI jest job, so no workflow change needed.
- B5: the dead `pullChanges`/`pushChanges` wrappers (wrong param names, no
  callers) were deleted; transport docstring updated.
- B6: `recipe_ingredients` reordered after `recipes` in `MIGRATED_TABLES`;
  regression test `sync/__tests__/migratedTablesOrder.test.js`.
- B7: confirmed the food selectors are `> sinceMs` (exclusive) while the push
  watermark advances to the server timestamp, so a row edited mid-push can in
  theory be skipped. The misleading "inclusive" comment was corrected. The
  actual fix (mirror the workouts inclusive `.gte` + max-local-updated_at
  watermark) is a careful change to a recently-bug-fixed runtime-critical path
  and is deferred, not made blindly. Single-device makes the race narrow.
- The full legacy-to-modular consolidation (D2) stays deferred per the prior
  founder call.

**Phase 5: architecture debt (large, not blocking).**
- D4: tests for `channels`, `activeWorkout`, `trainingReminders`.
- D6: drop `react-native-calendar-heatmap`; pin native deps; add jest
  `transformIgnorePatterns`; consolidate charting if feasible.
- D7: move growing histories to `FlatList`; trim bulk-getter `SELECT *`.
- D3/D5: split `database.js` by domain and break the store/sync import cycle.
  Largest item; sequence last, with tests.

**Standing migration-ordering note.** Do not apply migration 049
(drop `peak_week_plans`) until: (1) the client push/pull/CRUD refs are removed,
(2) a build has shipped, (3) only then apply 049. Applying it earlier 42P01s
every sync (finding B3).

---

## 4. Rules to revisit

These are locked rules or standing assumptions that may be holding the app back.
Listed for the founder to decide; not acted on.

1. **Single-device assumption.** Several findings are bounded by "no user runs
   two devices": A1 (cross-user local food data on a shared phone), and the
   `INSERT OR IGNORE` restore that stops plan edits propagating across devices
   (under B1). If multi-device is ever wanted, these jump in severity. Keep the
   assumption explicit and revisit it before enabling multi-device.

2. **The frozen-build / no-new-closed-test-release policy.** The live AAB is the
   pre-food-layer build and has the `daily_water` sync error live on it.
   Migration 052 fixes the server side, but the longer the freeze runs, the more
   the frozen build diverges and the more "acceptable sync noise" accrues.
   Trade-off: at what point does a refreshed internal build become worth it, even
   before full build-out?

3. **`PRO_BETA_ACTIVE = true`.** Every user gets Pro during closed testing. Fine
   for exercising the feature set, but it means the paywall and entitlement gates
   are not tested in the wild before Phase A exit. Plan a gated test before
   payments go live.

4. **`FEATURE_MAP` v1.1 entitlements vs shipped UI.** `proGate` lists
   `refeed_automated_any_cut`, `body_composition_deep`, `share_pack_pdf` as Pro
   features; some of those surfaces now exist (body composition shipped) and some
   do not. The entitlement check can answer "yes" for a surface that is absent.
   Reconcile entitlement to actual surface.

5. **main-only branch policy vs the harness.** The harness keeps injecting a
   feature branch (this session: `claude/chat-context-overflow-JYbA8`). Rule 9
   forces a surface-and-confirm dance every session. Trade-off: keep surfacing
   (current, safe) or formally allow a single persistent `claude/*` branch kept
   in lockstep with `main`. Founder's call.
