# Volyume — Release Readiness Audit

Date: 2026-06-03. Repo: `main`. Scope: read-only, whole codebase.
Lens: Principal Mobile Engineer, QA Lead, PM, UX Researcher, Security
Engineer, App Store reviewer. Target: launch to 100,000 users on iOS and
Android.

This audit assumes the offline-sync correctness work and the earlier
adversarial-QA remediation are already landed (they are). What follows is
the residual gap between "the engine is correct" and "this is a
world-class app two stores will approve and 100k accounts won't melt".

The honest headline: the **correctness** of the core (sync semantics,
identity/ownership, data integrity, crash capture, RLS) is strong. The
gaps are at the **edges that only bite at store-review time and at
scale**: store-compliance paperwork, an un-watermarked push path, full-
table reads on hot screens, and a near-total absence of engagement
telemetry. None of these show up on a three-account test build. All of
them show up at 100k.

---

## Remediation log — 2026-06-03 (session 2)

Scope confirmed with the founder: Play closed-testing only, no iOS yet, so
the iOS-only items are deferred ("we'll do those parts when they come up").
Work happened on `main`. Status of each finding:

**Fixed and pushed**
- **LB-1** — paywall now carries the auto-renew/price/billing disclosure,
  a wired Restore Purchases, and links to the in-app subscription terms +
  privacy policy. (`b676678`)
- **LB-5** — push watermark for completed workouts; syncAll no longer
  re-uploads the whole history every cycle. Scope: workouts+sets (the
  unbounded cost); bounded/editable legacy tables noted as follow-up.
  (`cd8e680`)
- **LB-7** — Home, Workout History and the Insights engine no longer load
  every set ever logged; they pull bounded windows / per-page sets.
  (`168ca96`)
- **HP-1** — migration 061 pins `search_path` on the last three unpinned
  SECURITY DEFINER functions (pending founder apply). (`bf93600`)
- **HP-3** — migration 062 closes the `delete_user_data` fallback erasure
  gap for the five post-025 tables (pending founder apply). (`02e4672`)
- **HP-4** — RTDN webhook now authenticates the Pub/Sub caller via Google
  OIDC (configure-before-enforce; verify on deploy). (`c1ef01f`)
- **HP-6** — Plans icon-only options buttons got accessibility labels;
  **HP-7** — Home loading spinner can no longer hang on a rejected loader.
  (`1726bdb`)
- **HP-9** — exercise library cached in memory with write-invalidation.
  (`a787484`)
- **HP-10** — Sentry trace sampling lowered to 5% for the 100k target.
  (`1d39622`)
- **LB-9 / HP-2** — founder chose "disclose + opt-out". Added an analytics
  opt-out gate at the telemetry chokepoint (postEvent drops, flushPending
  sends nothing while off), a device-local pref hydrated at boot, a Settings
  toggle, and reconciled the privacy policy (in-app + hosted) with an honest
  product-telemetry section under legitimate interest. HP-2: stripped
  quantity_g and the scanned barcode from telemetry payloads. (`a83e2c7`)
- **LB-8** — added the core engagement loop (workout_started,
  workout_completed, plan_activated) with emitters + server allow-list
  migration 063; payloads are counts/flags only and respect the opt-out
  gate. (`d2f820e`)

**Reassessed (no change, with reason)**
- **LB-6** (two AppState listeners "both sync") — on inspection the
  expensive double-work is already prevented: the runner's in-memory lock
  dedupes the sync, and health reads are single-sourced in `maybeSync`.
  Regression tests (A2-001/005/012) explicitly pin this two-effect split.
  Residual cost is a second `getSession` (a local cache hit) and a second
  subscription. A single-listener merge would fight those incident-guarding
  tests for little gain, so it is not worth the risk now.
- **HP-5** (Larger text "half-built") — false positive. The pref is fully
  applied at theme-build time (`theme.js` `applyAccessibility`); only a
  comment referencing a non-existent hook was stale. Corrected the comment.
  (`1726bdb`)
- **HP-11** (ACTIVITY_RECOGNITION "unused") — false positive. It is the
  required companion permission for `FOREGROUND_SERVICE_TYPE_HEALTH` from
  Android 14 (documented in `notifications/activeWorkout.js`) and supports
  the steps feature. Removing it would reintroduce a native crash. Kept.

**Resolved after the founder decision**
- **LB-9 / LB-8 / HP-2** — these were coupled to the privacy contradiction
  (policy said "no behavioural analytics" while the app shipped per-user
  telemetry). Founder chose disclose + opt-out, so all three are now done
  (see the fixed list above): the opt-out gate and honest policy (LB-9),
  the dietary-field stripping (HP-2), and the engagement events (LB-8).

**Still deferred (iOS / founder action)**
- **LB-2/3/4** — iOS PrivacyInfo, StoreKit, OTA projectId: no iOS build
  yet, deferred by the founder.
- Migrations 060–063 are authored and tracked in `supabase/README.md` but
  need the founder to apply them; the RTDN OIDC env vars (HP-4) are set on
  deploy.

---

## A. Launch blockers

These stop a submission being approved, or break a core promise at
scale. Fix before any public launch.

### LB-1 — Paywall has no legal surface (price terms, restore, Terms, Privacy)
- **Severity: Critical** — Store compliance
- **Why:** Apple Guideline 3.1.2 and Google Play subscription policy
  require the purchase screen to show price + billing period,
  auto-renewal terms, a Restore Purchases path, and working links to a
  EULA/Terms and a Privacy Policy. The primary purchase surface has none
  of them. This is a deterministic rejection on both stores the moment
  billing is live.
- **Files:** `src/screens/PaywallScreen.js:106-122` (the whole purchase
  UI: title, subtitle, comparison strip, two buttons, no legal text, no
  restore, no links). `src/lib/links.js:12-26` has no `termsOfService`
  key at all.
- **Evidence:** `handlePay` (`PaywallScreen.js:70`) goes straight to
  `playBilling.purchasePackage(sku.id)`. Restore exists in
  `src/lib/payments/restore.js` but is never surfaced on the paywall.
- **Fix:** Add to the paywall: a one-line price + "auto-renews until
  cancelled, cancel anytime in the App Store / Google Play", a Restore
  button wired to the existing `restore.js`, and tappable Privacy + Terms
  via `Linking.openURL`. Author a Terms/EULA page and add
  `termsOfService` to `LINKS`.

### LB-2 — iOS Privacy Manifest (`PrivacyInfo.xcprivacy`) is missing
- **Severity: Critical** — Store compliance (iOS)
- **Why:** Since May 2024 Apple rejects iOS apps with no privacy
  manifest declaring collected data types and required-reason API usage.
  Volyume uses several required-reason APIs (file timestamps via
  expo-file-system, UserDefaults via AsyncStorage, disk space) and
  collects health/fitness/food/account data.
- **Files:** none — `find -iname "*xcprivacy*"` outside node_modules
  returns nothing; no `ios.privacyManifests` in `app.json`.
- **Fix:** Add a `PrivacyInfo.xcprivacy` (config plugin or
  `ios.privacyManifests`) declaring `NSPrivacyCollectedDataTypes` (health,
  fitness, food/other usage data, account) and
  `NSPrivacyAccessedAPICategoryTypes` with reason codes (`C617.1` file
  timestamp, `CA92.1` UserDefaults, `E174.1`/`85F4.1` disk space).

### LB-3 — iOS has no in-app purchase implementation, but a full iOS build ships
- **Severity: Critical** — Store compliance / monetisation (iOS)
- **Why:** Payments are Google Play Billing only by design. There is no
  StoreKit path. An iOS build that exposes a paywall with no working
  purchase, or gates Pro behind a non-functional iOS purchase, is an
  Apple rejection. Today `PRO_BETA_ACTIVE` masks it (everyone is Pro),
  but the iOS config (HealthKit, bundle id, build 4) is shippable.
- **Files:** `src/lib/payments/playBilling.js:6-9` ("iOS deferred
  indefinitely per the Android-only Phase B decision");
  `src/lib/payments/restore.js:5-7` (Google Play only). `react-native-iap`
  is present but only the Android path is wired.
- **Fix:** Decide one of two: (a) ship Android-only and pull the iOS
  target until StoreKit is built, or (b) implement the iOS
  `react-native-iap` purchase + receipt-validation path before any iOS
  submission. This is a product call, not a code-only fix.

### LB-4 — expo-updates (OTA) runs at launch but app.json has no project linkage
- **Severity: Critical** — Reliability / release operations
- **Why:** `App.js` calls `checkForUpdateAsync` / `fetchUpdateAsync` /
  `reloadAsync` on launch, and three Settings paths call `reloadAsync`.
  With no `extra.eas.projectId`, no `owner`, and no `updates` block, the
  update server is undefined and every check fails silently. Given the
  release policy of no new closed-test build until the project is built
  out, OTA is the *only* JS hotfix channel, and it is currently dead.
- **Files:** `App.js:399-419` (live OTA flow, silent catch);
  `app.json` has no `extra`, `owner`, or `updates` (runtimeVersion policy
  is `appVersion` at `app.json:7-9` but maps to no channel).
- **Fix:** `eas update:configure`, then add `owner`,
  `updates.url = https://u.expo.dev/<id>`, and
  `extra.eas.projectId`. Publish an EAS Update branch for the
  `appVersion` runtime. (This was already flagged as a founder action;
  it is a launch blocker, not a nice-to-have.)

### LB-5 — Un-watermarked full re-push on every foreground, reconnect, and 15-min tick
- **Severity: Critical** — Scalability / battery / cloud cost
- **Why:** The pull side is incremental (watermarked). The push side is
  not. `bulkUploadLocalData` re-uploads every completed workout, every
  set, every routine/exercise/pref the user has ever created, on each
  trigger. A two-year user (~300 workouts, ~15k sets) re-uploads all of
  it every foreground, every Wi-Fi reconnect, every 15-minute interval.
  At 100k accounts this is continuous redundant Postgres write load and
  continuous radio wake-ups (the dominant mobile battery cost). Invisible
  on a test account, brutal at scale.
- **Files:** `src/lib/sync.js:577-609` (re-reads `getAllWorkouts`,
  re-upserts every workout and every set with no `updated_at` gate; the
  `_pushRoutinesAndExercises` / `_pushMorningWeights` / `_pushAllUserPrefs`
  helpers are the same). Contrast the pull side which does watermark:
  `src/lib/sync.js:1167,1175`. Triggers: `sync.js:413-437` (debounced
  full push after every DB write), `App.js:696` (15-min interval),
  `App.js:665` (foreground), `App.js:683` (reconnect).
- **Fix:** Add a per-table `last_pushed_at` push watermark in
  `sync_meta`, mirroring the pull path. Each `_pushX` selects
  `WHERE user_id = ? AND updated_at > ?` and upserts only dirty rows,
  advancing the watermark on a clean push.

### LB-6 — Two AppState listeners both sync on every foreground
- **Severity: Critical** — Scalability / battery (compounds LB-5)
- **Why:** `App()` registers two separate
  `AppState.addEventListener('change', …)` subscriptions in two
  `useEffect`s. On every `active` transition both fire and both kick a
  sync. The runner's in-memory `_runLock` dedupes *concurrent* calls, but
  the two are not guaranteed concurrent: the first can finish and release
  the lock before the second arrives, so you get two full re-push cycles
  (each one LB-5). The code comment itself records this previously
  "pushed everything twice".
- **Files:** listener #1 `App.js:592` (`maybeSync`), listener #2
  `App.js:665` (`callSyncAll('foreground')`). Listener #1 has a 60s
  throttle; listener #2's `callSyncAll` has none.
- **Fix:** Collapse to one AppState listener dispatching all foreground
  work through a single debounced entry point, with a "last successful
  sync < N seconds ago → skip" guard at the top.

### LB-7 — Hot screens load the entire `workout_sets` table into JS on every focus
- **Severity: Critical** — Performance (jank / ANR / OOM at scale)
- **Why:** `getCompletedWorkoutSets` / `getAllWorkoutSets` run
  `SELECT * FROM workout_sets WHERE user_id = ?` with no date bound,
  return every set ever logged, then filter in JS. For a two-year lifter
  that is 10k–30k rows marshalled across the bridge and camel-mapped, on
  the Home load path, which re-runs on every focus, every cloud-sync
  bump, and on +3s/+10s post-sign-in timers. Same pattern on Insights
  (loads all to keep 28 days) and History (loads all to show 50).
- **Files:** `database.js:1445` (`getCompletedWorkoutSets`, unbounded);
  `HomeScreen.js:429-436` (loads all sets to compute one week),
  `HomeScreen.js:155-167,173,186-189` (focus + version + timer triggers);
  `database.js:3058-3065` (Insights loads all, filters to 28 days);
  `WorkoutHistoryScreen.js:63` (loads all, `slice(0,50)`).
- **Fix:** Push the date filter into SQL. Add
  `getWorkoutSetsSince(userId, sinceMs)` using the existing
  `idx_workout_sets_user_created` index. Home wants 7 days, Insights 28,
  History paginates by the 50 workout IDs it renders. None of these
  screens needs the full table.

### LB-8 — No core engagement telemetry: launch blind to activation and retention
- **Severity: Critical** — Analytics / product
- **Why:** For a 100k launch the metrics that matter most are activation
  (did the user finish a first workout?) and retention (do they come back
  and log?). The telemetry catalogue has conversion, sync, notification
  and engine-safety events but **no workout or onboarding lifecycle
  events at all**. You cannot see whether the launch is working.
- **Files:** `src/lib/telemetry/events.js:23-97` (full event array; no
  `workout_started`, `workout_completed`, `set_logged`, `plan_created`,
  `onboarding_completed`). `ActiveWorkoutScreen.js` and
  `WorkoutSummaryScreen.js` contain zero `track()` calls.
- **Fix:** Add the lifecycle events to the catalogue *and* the
  server-side `record_engine_telemetry` allow-list (the file's own
  contract), then emit from ActiveWorkout (start/finish),
  WorkoutSummary, and ProOnboarding step transitions. Keep payloads
  non-sensitive (see HP-2).

### LB-9 — Analytics fire with no consent gate and no opt-out
- **Severity: Critical** — Privacy / GDPR (pricing is GBP, UK is source
  of truth)
- **Why:** `postEvent` writes every event to SQLite and pushes to
  Supabase with no consent check. The Article 9 health-data consent gates
  data *processing*, not analytics. There is no `analyticsEnabled`/opt-out
  flag and no Settings toggle. In GDPR regions non-essential analytics
  generally need a lawful basis and an opt-out.
- **Files:** `src/lib/telemetry/transport.js:46-65` (`postEvent` checks
  only the allow-list); no `analyticsConsent`/`optOut` anywhere in
  `src/store` or `src/lib/telemetry`.
- **Fix:** Add an `analyticsConsent` store flag + a Settings toggle, gate
  `postEvent` on it (optionally allowing a small essential set), and
  surface the choice at onboarding.

---

## B. High priority improvements

Not submission-blocking, but each is a real defect a careful reviewer or
a heavy user will hit. Fix in the first post-blocker pass, ideally before
launch.

### HP-1 — SECURITY DEFINER functions without a pinned `search_path`
- **Severity: High** — Security (Postgres privilege escalation pattern)
- **Files:** `migrate_019_health_consent.sql:93-96` (`record_health_consent`),
  `migrate_017_ed_pattern_and_telemetry.sql:78-82` (`clear_goal_lock`),
  `migrate_015_food_logging.sql:147-148` (`recompute_daily_intake_rollup`).
  None is redefined later, so the unpinned state is final.
- **Fix:** Add `SET search_path = public, pg_temp` to each and
  schema-qualify table references. One small additive migration.
  (`record_engine_telemetry` was already fixed in migrate_034/043 — these
  three were missed.)

### HP-2 — Dietary/health data written into `engine_telemetry`
- **Severity: High** — Privacy (special-category data outside the
  consented boundary)
- **Why:** The app's own scrubber treats `quantity_g` and food data as
  sensitive before Sentry, yet the same class is written verbatim into
  the analytics table. The server allow-list validates the event *name*
  but inserts the payload jsonb unchecked.
- **Files:** `src/lib/food/db.js:64-68` (`quantity_g` in `food_logged`);
  `src/lib/food/waterfall.js:147-165` (scanned `ean` barcode in
  `food_lookup_barcode`); compare `sentryScrub.js:61` which redacts
  `quantity_g` on sight. Insert path: `migrate_043:108-110`.
- **Fix:** Drop `quantity_g` and `ean` from payloads (keep
  `food_ref_source`, `meal_slot`, `source`, `ms`, `had_barcode:!!ean`).
  Add a server-side payload-key allow-list to `record_engine_telemetry`.

### HP-3 — Right-to-erasure gap in the delete fallback path
- **Severity: High** — Privacy (GDPR Art. 17)
- **Why:** The primary delete path (edge function → `auth.admin.deleteUser`)
  cascades everything and is complete. But the fallback calls
  `delete_user_data` RPC directly without deleting `auth.users`, so
  nothing cascades, and that RPC was last updated in migrate_025 and
  never extended. Tables added after 025 survive in the fallback.
- **Files:** `SettingsScreen.js:662-665` (RPC fallback);
  `delete_user_data` last defined in
  `migrate_025_delete_user_data_completeness.sql`. Orphaned in fallback:
  `notification_preferences` (044), `food_frequents` (051),
  `device_push_tokens` (053), `daily_steps` (056), `tier_history`.
- **Fix:** One migration extending `delete_user_data` with the post-025
  tables, plus a CI test asserting every `user_id`-bearing table appears
  in the RPC. Consider making the fallback hard-fail rather than
  partially erase.

### HP-4 — RTDN endpoint does not verify the Pub/Sub OIDC token
- **Severity: High** — Security (abuse / DoS surface)
- **Why:** `play-billing-rtdn` is a public HTTP endpoint driving tier
  changes with no `Authorization` verification. Exploit is bounded
  (every `purchaseToken` is re-verified against the Play API, so an
  attacker can't grant themselves Pro), but the endpoint still does the
  Play-API round trip and a `grace`-branch push for forged envelopes — a
  real abuse/DoS surface at 100k.
- **Files:** `supabase/functions/play-billing-rtdn/index.ts:270-285` (no
  header check), contrast `send-push/index.ts:117-122` and
  `delete-account/index.ts:63-78` which both verify.
- **Fix:** Validate the Google-signed OIDC token (verify `aud` = function
  URL, `iss`, signature against Google JWKS, service-account email)
  before processing; reject 401 otherwise.

### HP-5 — "Larger text" accessibility toggle is half-built
- **Severity: High** — Accessibility
- **Why:** The toggle multiplies font tokens by 1.2x, but tokens are read
  at module load by `StyleSheet.create`, so it only takes effect after a
  full app restart, and the promised `useAccessibleFontSize` hook does
  not exist anywhere (named in comments only). Dynamic Type is a primary
  accessibility need.
- **Files:** `useAppStore.js:1138-1141` (comment promises a non-existent
  hook, admits restart requirement); `SettingsScreen.js:42-59` (prompts a
  restart); `HomeScreen.js:11,1699` (static token import, module-level
  StyleSheet). `grep useAccessibleFontSize` → zero definitions.
- **Fix:** Either implement the hook and route font sizes through it
  (re-rendering on store change), or drop the in-app multiplier and rely
  on OS Dynamic Type with `allowFontScaling` (RN default on). Do not ship
  a toggle that silently needs a restart.

### HP-6 — Icon-only buttons have no accessibility labels
- **Severity: High** — Accessibility
- **Why:** TalkBack/VoiceOver announce these as a bare "button". The
  overflow (`ellipsis-vertical`) menu is the main per-row affordance on
  Plans and is unreachable by name. 25 screens use Ionicons with zero
  `accessibilityLabel`; `accessibilityHint` count across the repo is 0.
- **Files:** `PlansScreen.js:502-504,569,631` (overflow menus, no label;
  39 TouchableOpacity, 3 labels). Good counter-example to copy:
  `BodyDiagramHeatmap.js:40-60` (spoken region labels).
- **Fix:** Add `accessibilityLabel` + `accessibilityRole="button"` to
  every icon-only touchable, starting with the per-row overflow menus.

### HP-7 — Home initial spinner can stick on first run (no `finally`)
- **Severity: High** — UX / reliability
- **Why:** `setInitialLoading(false)` sits after `await Promise.all([...])`
  with no `try/finally`, and the first-run call has no `.catch`. Loaders
  catch internally so the common path is safe, but any throw escaping a
  loader's try (or a synchronous throw before it) strands the full-screen
  spinner on the most-visited screen forever.
- **Files:** `HomeScreen.js:194-207` (`loadData`, no finally),
  `HomeScreen.js:165` (call, no catch), `:880` (UI gated on
  `initialLoading`).
- **Fix:** `try { await Promise.all(...) } finally { setInitialLoading(false); }`
  and add `.catch(logError)` at the call site.

### HP-8 — Per-foreground work fan-out beyond sync
- **Severity: High** — Battery
- **Why:** `maybeSync` does far more than sync on every qualifying
  AppState change: `importNewWeights`, `recordTodaySteps` (both native
  Health IPC), `flushPendingFeedback`, a `MIN(started_at)` Year-of-Lifts
  query, and three telemetry inserts. The Year-of-Lifts unlock is a
  one-shot lifetime event but runs its SQL on every foreground (checked
  *after* the query, not before). A user opening the app 30x/day triggers
  the whole fan-out 30x.
- **Files:** `App.js:468-591` (`maybeSync` body), `App.js:567-573`
  (Year-of-Lifts SQL on every foreground).
- **Fix:** Gate Year-of-Lifts behind its AsyncStorage flag *before* the
  SQL. Move health/steps reads to the background-fetch task or a
  once-per-hour wall-clock throttle, not every foreground.

### HP-9 — `getAllExercises()` is uncached and called in every sync cycle
- **Severity: High** — Performance
- **Why:** The exercises table is the ~450-row seeded canonical library,
  effectively immutable at runtime except for custom adds.
  `getAllExercises()` does an unbounded `SELECT *` with no cache and is
  called by `syncExercises` (every push cycle), Insights, History, and
  Home.
- **Files:** `database.js:1229` (uncached query), `sync.js:238-239`
  (called every cycle, then filters to `is_custom=1` in JS).
- **Fix:** Memoise in-module with invalidation on custom-exercise insert.
  `syncExercises` should query `WHERE is_custom = 1` directly instead of
  pulling all 450 and filtering.

### HP-10 — Sentry `tracesSampleRate: 0.1` in production
- **Severity: High** — Cost / battery (config one-liner)
- **Why:** 10% performance-trace sampling across a 100k base streams
  transactions for ~10k users continuously, with on-device instrumentation
  overhead and a real Sentry bill. Errors are sampled separately at 100%
  regardless.
- **Files:** `sentry.js:74` (`tracesSampleRate: __DEV__ ? 1.0 : 0.1`),
  `sentry.js:78` (`enableAutoSessionTracking: true`).
- **Fix:** Drop production `tracesSampleRate` to 0.01–0.02 for launch,
  revisit once you have a baseline.

### HP-11 — Android ACTIVITY_RECOGNITION declared but unused
- **Severity: High** — Store compliance (sensitive permission)
- **Why:** Google Play scrutinises ACTIVITY_RECOGNITION. The app states
  steps come from Health Connect, not the motion sensor, and the only
  sensor use (shake-to-feedback via Accelerometer) does not need this
  permission. Declaring an unused sensitive permission invites a Data
  Safety rejection.
- **Files:** `app.json:61` (declared); no activity-recognition consumer
  in `src` (only Accelerometer in `FeedbackSheet.js:84-94`).
- **Fix:** Remove `android.permission.ACTIVITY_RECOGNITION` from
  `app.json` unless a step-counting path actually reads it.

---

## C. Nice-to-have improvements

Real, but lower stakes. Schedule after launch or as capacity allows.

- **NTH-1 — Free-text error strings bypass PII redaction (Medium,
  security).** Redaction is key-based for objects and table-name-based
  for strings; an error message interpolating a weight or email passes
  through to the on-device buffer and Sentry. Add value-level regex
  scrubbing for emails to `_scrubString` and discourage interpolating
  user values into error messages. `errorLog.js:116-128`,
  `sentryScrub.js:206-211`, `App.js:217-226`.
- **NTH-2 — Data Safety / Privacy Nutrition labels must be exact
  (Medium, compliance).** Health/fitness, food, and account data are
  collected and linked to identity. Declare precisely on both stores
  (collected, linked, not sold, not for tracking) and confirm Sentry
  receives no health values. `app.json:32-33,57-60`.
- **NTH-3 — Sentry health-data scrub coverage (Medium, privacy).**
  `beforeSend`/`beforeBreadcrumb` scrubbers exist (good) but are
  "belt-and-braces", not exhaustive. Audit coverage for weight/food/
  health keys; list Sentry as a processor in the privacy policy.
  `sentry.js:74-94`.
- **NTH-4 — iOS UIBackgroundModes justification (Medium, review
  friction).** `fetch` + `remote-notification` are declared; be ready to
  justify both in App Review notes and drop any unused mode.
  `app.json:35-38`.
- **NTH-5 — Periodic 15-min sync runs while merely foregrounded-idle
  (Medium, battery).** Skip the periodic run when the queue is empty and
  no local write happened since the last successful sync. Collapses to
  near-zero once LB-5's watermark lands. `App.js:696`.
- **NTH-6 — Restore on a stub build returns a false "nothing to restore"
  (Medium, paywall).** In any build without the native IAP module linked,
  the restore stub silently returns empty entitlements. Guard it to
  return an explicit "Couldn't reach the store" instead. `playBilling.js`,
  `restore.js`. Tie to the `PRO_BETA_ACTIVE=false` flip plan: run a real
  end-to-end IAP test (purchase, restore, RTDN → `upgrade_tier`) before
  charging anyone. `proGate.js:24-25`.
- **NTH-7 — History/Insights JS-side O(workouts×sets) pre-compute
  (Medium, perf).** Build a `Map<workoutId, sets[]>` once instead of a
  `.filter` per workout, or fetch sets only for the rendered IDs.
  `WorkoutHistoryScreen.js:67-69`, `database.js:3058-3067`.
- **NTH-8 — `database.js` is a 5,441-line, 190-export god module
  (Medium, architecture/maintainability).** Not a user-facing bug, but a
  change-risk amplifier at this size. Split by domain (workouts, food,
  weights, sync helpers) when capacity allows; do it behind tests, not as
  a pre-launch scramble.
- **NTH-9 — No interaction/component tests (Medium, testing coverage).**
  149 test files, zero use `fireEvent` / testing-library `render`;
  screens are mount-tested only. The most bug-prone inline handlers
  (`doFinish`, `handleCompleteSet`) are untested. Add interaction tests
  for the workout-finish and set-logging flows.
- **NTH-10 — `engine_telemetry` has no retention/pruning (Medium,
  scalability/cost).** `sync_run` fires on every foreground / 15-min tick
  / reconnect; unbounded growth at 100k. Add a TTL prune job
  (server-side cron or a periodic delete of rows older than N days).
  migrate_017.
- **NTH-11 — Orphan `is_completed=0` workouts accumulate (Low, data
  hygiene).** `deleteIncompleteWorkout` only runs on explicit discard;
  abandoned sessions linger. Add a periodic sweep of stale incomplete
  workouts.
- **NTH-12 — Vestigial `sync_queue` keeps the "pending" indicator on
  (Low, UX).** Only writer is the notification-preferences enqueue; no
  drainer. Either drain it or remove it so the indicator reflects reality.
- **NTH-13 — Over-explanatory alert bodies drift from the voice rules
  (Low, copy).** The "Sign out anyway" body and the backup/export alerts
  hedge like a chatbot. Tighten per CLAUDE.md. `SettingsScreen.js:534,
  773,798`.
- **NTH-14 — 42 production `console.*` statements (Low, hygiene).** Route
  through the existing `errorLog`/observability layer or strip via a
  Babel plugin in production. No PII found in them today.
- **NTH-15 — Real production user UUID committed in
  `nuke_uid_a7379dc8.sql` (Low, privacy hygiene).** Remove the ad-hoc ops
  script from git or parameterise it.
- **NTH-16 — Weak client-side password policy (Low, security).**
  Length-8 only, no complexity/breach check. Enable Supabase Auth's
  leaked-password protection (HIBP) + minimum-strength in the dashboard.
  `LoginScreen.js:65-66`.
- **NTH-17 — No `accessibilityHint` / `accessible` grouping on composite
  rows (Low, a11y).** Screen readers read fragments of label+value+icon
  rows. Add `accessible` on composite touchables and hints where the
  action isn't obvious.
- **NTH-18 — Expo SDK 51 is aging (Low, maintenance).** Not a rejection,
  but plan the upgrade path; newer required-reason/manifest tooling lives
  in later SDKs.

---

## What is already solid (do not regress these)

Called out so the fixes above don't undo working systems:

- **Sync correctness:** single in-memory run lock, sign-out wipe guard,
  `whenSyncIdle` drain before sign-out, per-table error counting folded
  into a push-first sign-out safety, retry queue with backoff, PostgREST
  1000-row pagination. (`runner.js`, `sync/`.)
- **Crash + error capture:** Sentry native+JS, double-init guarded; root
  error boundary with recovery; unhandled rejection + uncaught JS global
  handlers. (`App.js`, `sentry.js`, `errorLog.js`.)
- **Security baseline:** no committed secrets, RLS on every user table
  with matching `WITH CHECK`, tier self-promotion closed by trigger,
  service-role server-only, auth tokens in SecureStore, deep-link
  allow-listing, `send-push` + `delete-account` both verify callers.
- **Privacy core:** Article 9 consent is explicit opt-in and blocks the
  app until granted, dual-recorded to an immutable audit log; export +
  delete both work; in-app account deletion is two-step and robust;
  Sentry strips email to `{id}` before send.
- **Accessibility done right in places:** reduce-motion genuinely wired
  through toasts, sheets, skeletons, navigation, haptics; colour-blind-
  safe (Okabe–Ito) and high-contrast palette swaps; the heatmap pairs
  colour with text and spoken status.
- **Performance hygiene that is fine:** lists virtualised with
  `keyExtractor`; images are bundled local assets; SQLite indexing is
  thorough (composite, partial-on-`deleted_at`, expression indexes for
  food search); component timer/listener cleanup is disciplined.
- **Conversion funnel is well-instrumented** with a client+server
  allow-list and a drift test. The telemetry gap is engagement (LB-8),
  not conversion.

---

## D. Release readiness score

### 62 / 100

Banded by dimension (weighted toward what blocks a launch):

| Dimension | Band | Note |
|---|---|---|
| Sync correctness / data integrity | 9/10 | Strongest part of the app |
| Security (RLS, secrets, auth) | 8/10 | HP-1/HP-4 are the residue |
| Privacy (consent, export, delete) | 7/10 | HP-2/HP-3 gaps, else solid |
| Reliability / crash capture | 8/10 | OTA dead (LB-4) is the dent |
| Store compliance | 3/10 | LB-1/2/3 + HP-11 are hard gates |
| Scalability at 100k | 3/10 | LB-5/6/7 dominate |
| Performance / battery | 4/10 | Full-table reads + double sync |
| Analytics / product visibility | 3/10 | LB-8/9: blind and no consent |
| Accessibility | 5/10 | Reduce-motion great, labels absent |
| UX polish | 7/10 | Mature; HP-7 + copy drift |
| Monetisation readiness | 3/10 | Beta-bypassed, iOS absent, untested |
| Testing coverage | 5/10 | Strong unit, no interaction tests |

The score is held down almost entirely by **store-compliance paperwork**
and **scale behaviour**, not by core-engine quality. The engine would
score in the high 80s on its own. Clear LB-1 through LB-9 and the same
codebase lands around **82–85** and is genuinely launch-ready; the High
list takes it past 90.

Recommended order: store-compliance blockers first (LB-1, LB-2, LB-3,
LB-4 — they gate submission and a hotfix channel), then the scale trio
(LB-5, LB-6, LB-7 — one watermark + one listener + bounded queries fixes
the bulk of battery, cost, and jank together), then the telemetry/consent
pair (LB-8, LB-9 — so you can see the launch and stay lawful).
