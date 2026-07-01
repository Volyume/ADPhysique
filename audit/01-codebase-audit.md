# Volyume — Codebase Audit (01)

Date: 2026-07-01 · Read-only session · Method: five parallel domain audits
(state & data, coaching engine, UI layer, performance & reliability,
security & compliance), every finding verified against the code at the cited
line before inclusion; the single critical finding re-verified independently
by the orchestrator. Severity: critical / high / medium / low.

---

## Executive summary

1. One **critical** data-loss class: the legacy prefs sync ships each device's
   sync watermarks/cursors to the cloud and back, so cross-device cursor
   contamination can silently skip pushes whose rows the sign-out wipe then
   destroys (`sync.js:1181-1196`).
2. The **legacy half of sync** (`sync.js`) is the risk centre: full-account
   re-push on a 2s debounce, `updated_at` re-stamped every cycle
   (last-pusher-wins), INSERT-OR-IGNORE pulls, no tombstones. The
   registry-driven `sync/` half is well-engineered.
3. The **engine floors hold** at every direct enforcement point, but two seams
   leak: the coach macro-cycle can propose a rest day below the sex ED floor,
   and the robust 7-days-ago trend helper still has the sub-week fabrication
   bug its plain twin was fixed for.
4. **Article 9 enforcement lives only in navigation**: the sign-in sync fires
   before consent resolves; the sync engine itself never checks consent.
5. **Startup** pays a 6.3 MB JSON.parse every launch before its version check,
   eager-mounts all five tabs, and evaluates the 80-screen module graph in one
   turn; ~25 screens subscribe to the whole store against the codebase's own
   convention while a 1 Hz rest-timer tick re-renders them all.
6. Secrets, RLS, SQL parameterisation, IAP server-side verification, leak
   hygiene and the Sentry scrub pipeline all **verified strong**.

---

## Findings table (sorted by severity)

| ID | Sev | Domain | Finding | Location | Fix direction |
|----|-----|--------|---------|----------|---------------|
| SD-1 | **critical** | State/Data | Sync watermarks/cursors (`@volyume_pull_wm_*`, `@volyume_push_wm_*`, `@volyume_food_last_pushed_*`) are not in `PREF_EXCLUDE_PATTERNS`, so they sync via `user_prefs` across devices; imported cursors defeat the push-retry hold-back → rows skipped silently → sign-out wipe destroys them | `src/lib/sync.js:1181-1196`, `src/lib/sync/watermark.js:28-36`, `src/lib/sync/tables/foodDomain.js:40-41` | Exclude all cursor/watermark/entitlement key prefixes (or move prefs sync to an explicit allow-list) |
| SD-2 | high | State/Data | Sign-out wipe proceeds after a 5s idle **timeout**; legacy `pullFromCloud` never checks `signOutGuard`, so an in-flight pull repopulates the wiped DB and re-writes cleared AsyncStorage (zombie rows, stale watermarks, near-empty next restore) | `src/store/useAppStore.js:397`, `src/lib/sync/runner.js:203,223`, `src/lib/sync.js:1244` | Thread `isSignOutWiping()`/abort into each legacy `_pullX`; wipe only on confirmed idle |
| SD-3 | high | State/Data | Legacy pushes re-stamp every row `updated_at: now()` each cycle → cross-device conflicts resolve by push-order not edit-order, and delta pulls re-download whole tables forever | `src/lib/sync.js:782,817` | Carry the real local `updated_at`; stamp only at actual mutation; add push watermarks |
| SD-4 | high | State/Data | Every local write triggers `bulkUploadLocalData`: ~13 whole tables + all prefs pushed on a 2s debounce and again every 15 min | `src/lib/sync.js:496-505,719-749` | Finish migrating legacy tables to the registry/transport path with per-table watermarks |
| EN-1 | high | Engine | `robustTrend` 7-days-ago helpers fall back to the earliest reading when no weigh-in is ≥7 days old, scaling a 2–4-day span as a weekly rate (~2× overstated) — the D1 #3 bug, fixed only in the plain twin; drives on/off-target verdicts and cuts | `src/lib/robustTrend.js:132,215` vs `src/lib/weeklyCoach.js:94` | Return null like the plain twin; extend the D1 #3 regression test to the robust helpers |
| EN-2 | high | Engine | Coach macro-cycle rest day (`baselineCarbs × (1−cut)`) has no floor check, so a floored 1200 kcal target can yield an apply-able ~1100 kcal rest day; the meal-plan path (`mealPlanAssembler.js:94`) refuses the same state — two paths disagree and one weakens the sacred ED floor | `src/lib/coachApply.js:141`, `src/lib/weeklyCoach.js:1036`, `src/lib/food/effectiveTargets.js:61-67` | Gate `computeMacroCycle` on `floorApplied`/`kcalFloorForSex` so no cycled day resolves below the sex floor |
| UI-1 | high | UI | ~25 screens use bare `useAppStore()` (whole-store subscription) against the codebase's own documented convention; with the 1 Hz `tickRestTimer` and eager tabs, offscreen screens re-render every second during rest ("300–600 re-renders per workout" per the code's own comment) | `src/screens/CoachOutputScreen.js:750` + ~24 more (list in agent report) | Mechanical sweep to `useShallow` field selectors, matching NutritionTargetsScreen/HomeScreen |
| PR-1 | high | Perf | 6.3 MB food snapshot is read and `JSON.parse`d on **every** cold start *before* the already-imported version check | `src/lib/food/seed.js:112-141`, `src/navigation/RootNavigator.js:716` | Check the persisted version flag before loading/parsing the snapshot |
| PR-2 | high | Perf | `lazy={false}`: all five tab stacks (Home 2,528 lines, Analytics, Diary, Plans, You) mount and run their data effects in one commit at boot | `src/navigation/RootNavigator.js:447` | Default lazy tabs; pre-warm Home only if needed |
| SC-1 | high | Security | No Article 9 consent gate in the sync layer: `syncAll(... 'sign_in')` fires unconditionally while the consent read runs in a parallel IIFE — health tables can push/pull before consent resolves (or when it is false/null) | `src/navigation/RootNavigator.js:1143,1062-1108`, `src/lib/sync/runner.js:~72` | Fail-closed consent check inside `syncAll` for health-domain tables |
| SD-5 | medium | State/Data | `restoreSessionFromCloud` profile hydration TOCTOU: same-user local save between emptiness check and `set()` is clobbered by the cloud copy + stale field timestamps | `src/store/useAppStore.js:816-845` | Re-check and merge (not replace) immediately before `set()` |
| SD-6 | medium | State/Data | Profile-patch actions (`setCalorieBank`, `setMealPlanPrefs`, …) merge from a stale snapshot across an await — concurrent calls drop updates; disk written from pre-merge state | `src/store/useAppStore.js:1532-1575` | Functional `set()` merges; persist from post-merge state |
| SD-7 | medium | State/Data | Routines/programmes pulls are `INSERT OR IGNORE` — cross-device edits never land on an already-populated device (workouts use timestamp-gated REPLACE) | `src/lib/database.js:5623` vs `:5907-5919` | Apply the updated_at-gated upsert pattern to routines/programmes |
| SD-8 | medium | State/Data | `_pullUserPrefs`: cloud wins unconditionally, no per-key timestamps, store never rehydrated — two-device pref ping-pong and disk/store divergence mid-session | `src/lib/sync.js:1628-1637` | Per-key updated_at, newest-wins, notify store |
| SD-9 | medium | State/Data | No tombstones in legacy workout sync — deleted workouts resurrect via another device's push | `src/lib/sync.js:327-329` | Soft-delete tombstones (pattern exists in migrated food tables) |
| EN-3 | medium | Engine | Rapid-loss **upward** safety correction is blocked by `scoffPositive`/`untracked` gates — the highest-risk cohorts never get the +125..300 kcal boost, contradicting "increases are never blocked" elsewhere | `src/lib/weeklyCoach.js:697-709` | Founder decision: allow the upward-only correction to bypass those gates; document either way |
| EN-4 | medium | Engine | Dead phase vocabulary: `agg_cut`/`mod_cut`/`recomp` PHASE_CONFIG rows unreachable (`coachingPhaseKey` never emits them) — recomp users judged at 0%/wk not −0.125%/wk; live-looking dead branches in refeed/cardio | `src/lib/weeklyCoach.js:202-209`, `src/lib/coachingGoals.js:220-288` | Map real phases onto the rows or delete them; founder decision on recomp rate |
| EN-5 | medium | Engine | `Date.now()`/`new Date()` inside the "pure, no I/O" engine (trend cutoff, refeed cadence, diet-break) — identical inputs give different outputs by run time | `src/lib/weeklyCoach.js:88,760,1007,1064`, `src/lib/robustTrend.js:130,213` | Thread an injectable `nowMs` (pattern exists in `mesocycle.getCurrentMesoWeek`) |
| EN-6 | medium | Engine | Zero/negative `weightKg` rows pass the engine filter → fake rapid-loss/ED signals from one corrupt row; `computeFFMFloor` throws on ≤0 with no try/catch in `runWeeklyCoach` | `src/lib/weeklyCoach.js:45,736`, `src/lib/nutritionEngine.js:605-607` | Filter to `> 0` (match `calculateNutritionTargets`' clamp); add edge-case tests |
| UI-2 | medium | UI | Shared `Chip` component has **zero importers** while ≥6 screens hand-roll divergent chip rows (the drift it was built to stop) | `src/components/Chip.js:16` + 6 sites | Migrate the six local implementations to the shared Chip |
| UI-3 | medium | UI | ProOnboarding touchables missing a11y role/state/label (~4 of ~14); identical single-select chips are `radio` on one screen, `button` on others | `src/screens/ProOnboardingScreen.js:1165-1233` | Add a11y props; standardise single-select on `radio` |
| UI-4 | medium | UI | `React.memo(LoggedSetRow)` defeated by inline `onEdit` closure + per-row recompute; `key={i}` on an editable/deletable list — hottest screen in the app | `src/screens/ActiveWorkoutScreen.js:63,2181-2188` | Key by set id; stable `onEdit(setId)` via useCallback; precompute progress numbers |
| UI-5 | medium | UI | Object selectors without `useShallow` (fresh object per notification = re-render on every store write), incl. the Article 9 gate screen | `src/screens/QuizScreen.js:48`, `src/screens/Article9ConsentScreen.js:37` | Wrap in `useShallow` |
| UI-6 | medium | UI | RootNavigator is a 1,417-line god-file: DB init, seeding, tier reconciliation, billing init and the whole `onAuthStateChange` machine live inside one navigator effect | `src/navigation/RootNavigator.js:696-1165` | Extract bootstrap + auth pipeline into `src/lib/` modules the navigator invokes |
| PR-3 | medium | Perf | Entire 80-screen module graph (incl. vision-camera at module scope) evaluated synchronously in one turn on the black pre-theme placeholder | `App.js:871-884`, `RootNavigator.js:29-110`, `ScanBarcodeScreen.js:34-36` | Per-screen lazy requires inside the navigator, keeping the a11y-theme-first ordering |
| PR-4 | medium | Perf | Splash release serialised behind full DB init though `checkFirstRun`/`checkTier` are AsyncStorage-only | `RootNavigator.js:704-750,1186` | Run the flag checks in parallel with `initDatabase` |
| PR-5 | medium | Perf | First-launch food import: ~100k individual awaited INSERTs on the shared connection while onboarding + sign-in sync run | `src/lib/food/seed.js:162-221` | Multi-row batched INSERTs; defer until after first-run flow |
| PR-6 | medium | Perf | iOS rest-timer keepalive task is defined but never registered — the documented safety net is a no-op | `App.js:52-60` (only `VOLYUME_DAILY_SYNC` is registered, `App.js:550`) | Register it where the rest timer starts, or delete the definition + comment |
| PR-7 | medium | Perf | Single app-root ErrorBoundary; a deterministic render throw in any screen fells the whole app and "Retry" re-renders the identical tree (unrecoverable loop) | `App.js:268-313,896` | Per-tab/per-screen boundary layer (or nav-state reset on retry) |
| SC-2 | medium | Security | Account-deletion RPC fallback (`delete_user_data`) leaves `meal_plans`, `plan_folders`, partner rows and the auth user behind while reporting success — incomplete Art 17 erasure | `src/hooks/useAccountActions.js:225`, `supabase/migrate_062`, `migrate_081:37-39` | Add explicit DELETEs for post-062 tables; queue auth-row deletion when the Edge Function is unreachable |
| SC-3 | medium | Security | `account_deletions_log.user_email` retained indefinitely after erasure (Art 5(1)(e)/17 tension) | `supabase/migrate_039:32` | Hash/drop the email or add scheduled anonymisation |
| SC-4 | medium | Security | Cannot confirm migration 067 (blocks client self-grant of `pro`) is applied to production — header says "Applied remotely: NO (pending)" | `supabase/migrate_067:19-20` | Founder verifies on prod that `upgrade_tier('pro', …)` rejects |
| SD-10 | low | State/Data | `sync_queue` is dead scaffolding (no producer/drainer) yet runner status logic reasons about it | `src/lib/sync/queue.js:59,110-115`, `runner.js:243` | Wire it per the locked spec or remove it |
| SD-11 | low | State/Data | `applyRemoteSetEvent` idempotency check spans an await — replayed watch event can double-log a set | `src/store/useAppStore.js:1206-1253` | Record the eventId synchronously before the DB write |
| SD-12 | low | State/Data | HomeScreen loads full workout history 3× per focus just for counts (unindexed sort) | `src/screens/HomeScreen.js:337,391,603`, `database.js:1699` | COUNT/date-bounded helpers + `(user_id, started_at)` index |
| EN-7 | low | Engine | Unknown-sex fallbacks diverge: BMR/floors → female (safe), FFM fraction → male (deliberate, safer-high floor), but EA caution line → male 35 (LESS cautious than female 40) | `src/lib/nutritionEngine.js:577,627,664,844` | Unknown-sex EA caution should use the female 40 line (err safer) |
| EN-8 | low | Engine | Data-confidence gate counts 14-day rows (incl. same-day duplicates) as "this week's weigh-ins" | `src/lib/weeklyCoach.js:481` vs `:116` | Count distinct day-keys within the current week |
| EN-9 | low | Engine | −1.5%/wk boundary: correction fires at `<=`, `rapidWeightLossFlag` at `<` — consumers disagree exactly at the sacred threshold | `src/lib/weeklyCoach.js:693` vs `:977` | Align the flag to `<=` |
| EN-10 | low | Engine | ED lockout can stack a contradictory generic "calories held" row beneath it | `src/lib/weeklyCoach.js:1121-1136,1164` | Skip the generic row when the lockout row is present |
| EN-11 | low | Engine | `getBlockStatus` uses raw-ms day arithmetic; `getCurrentMesoWeek` uses DST-safe local anchoring — can disagree by a day across DST | `src/lib/mesocycle.js:429` vs `:59-61` | Reuse the local-day anchoring |
| UI-7 | low | UI | `lazy={false}` passed as a deprecated navigator prop — silently stops working on react-navigation v7 | `RootNavigator.js:447` | Move to `screenOptions` and document the eager-mount decision |
| UI-8 | low | UI | Toast context value recreated per render → all 44 consumer files re-render on every toast state change | `src/components/Toast.js:167` | Memoise the context value |
| UI-9 | low | UI | JS-thread animations: MacroRings per-frame `setState` count-up; YearOfLifts non-native width % | `src/components/food/MacroRings.js:216-223`, `YearOfLiftsScreen.js:467` | Reanimated UI-thread count-up; animate scaleX |
| UI-10 | low | UI | Duplicate screen registrations with divergent options (VolumeHeatmap titles differ; ActiveWorkout 3× with differing transitions; ProUpgrade 4×) | `RootNavigator.js:322,369,319,506,533` | Hoist shared per-screen option constants |
| UI-11 | low | UI | Six near-identical local Section/SectionHeader components drifting | `CoachOutputScreen.js:164` + 5 sites | Fold into one shared SectionHeader |
| UI-12 | low | UI | Last hard-coded hex in the app (camera chrome) | `src/screens/ScanLabelScreen.js:365,403` | Add a `cameraChrome` token |
| PR-8 | low | Perf | `bootstrapAccessibility().then(...)` — the single gate for the whole UI has no rejection handler (permanent black screen if it ever rejects) | `App.js:399` | `.catch().finally(() => setThemeReady(true))` |
| PR-9 | low | Perf | Cold-launch notification re-lay unreachable for signed-in users (early `return` precedes it) — only the timezone path re-lays | `RootNavigator.js:805-806,836-842` | Move the restore call before the signed-in early-return |
| SC-5 | low | Security | DB encryption fails open to plaintext with only a log entry — no telemetry consumes `encrypted:false` | `src/lib/dbCrypto.js:199-200,241` | Emit a monitoring signal on plaintext fallback |
| SC-6 | low | Security | `VERBOSE_LOGGING = true` in the live production build ("set to false before public release") | `src/lib/errorLog.js:23` | Flip to false / gate on build channel |
| SC-7 | low | Security | Local ring-buffer PII redaction is exact-key only (no `kcal*`/`target*` variants), narrower than sentryScrub's regexes — latent, no current offender found | `src/lib/errorLog.js:52-73` | Reuse the sentryScrub pattern matcher locally |
| SC-8 | low | Security | Recipe importer fetches an arbitrary user-supplied URL with no scheme validation | `src/lib/food/recipeImport.js:130` | Allow https: only |
| SC-9 | low | Security | `xlsx` 0.18.5 (CVE-2023-30533, CVE-2024-22363) in dependencies; used only by a build-time seed script | `package.json` | Move to devDependencies / patched release |

Totals: 1 critical · 8 high · 20 medium · 24 low (53 findings).

---

## Dependency map (what blocks or interacts with what)

- **SD-1 first, alone.** A one-line-class fix (exclusion patterns) that must
  land before any multi-device testing of anything else; it also stops
  `@volyume_tier`/`@volyume_active_workout` cross-device leakage. No
  dependencies.
- **Legacy-sync cluster: SD-3 + SD-4 + SD-7 + SD-8 + SD-9** are all symptoms
  of the half-finished migration to the registry path. Completing SD-4
  (migrate remaining tables) subsumes SD-3/SD-7/SD-9; point-fixes are possible
  interim but re-test cross-device conflict behaviour together. SD-8 (prefs)
  is part of the same decision.
- **SD-2 ↔ SC-1**: both change the sync-run lifecycle (signOutGuard checks /
  consent gate live in the same runner + legacy pull seam). Fix in one pass to
  avoid touching `runner.js`/`pullFromCloud` twice.
- **EN-1 ↔ EN-5**: same trend-helper functions; the injectable-`nowMs`
  refactor (EN-5) should carry the EN-1 null fix in the same change + tests.
- **EN-2, EN-3, EN-7, EN-9, EN-10** all sit **inside the sacred ED-safety
  system** — each needs founder sign-off and invariant tests before touch
  (EN-2/EN-7/EN-9 strengthen protection, never weaken; EN-3/EN-4 are explicit
  founder decisions).
- **PR-2 ↔ UI-1 ↔ UI-7**: eager tabs multiply the whole-store re-render cost;
  fixing UI-1 (selectors) first makes PR-2's before/after measurable; UI-7 is
  folded into PR-2's change.
- **PR-1 + PR-4 + PR-3** form the startup sequence work; independent of each
  other but should be measured as one cold-start budget.
- **SC-2/SC-3** require new Supabase migrations → founder-run (additive,
  headered) per constitution.
- **SC-4** is founder verification only; blocks *trusting* the IAP boundary
  but no code change here.
- **PR-7** (error boundaries) is independent and safe to do any time.
- **UI-4** is contained in ActiveWorkoutScreen; pairs naturally with UI-1's
  sweep of the same screen.

## "Do not touch without a plan" (from CLAUDE.md constraints)

1. **ED-safety system** (`nutritionEngine.js`, `edPatternDetector.js`,
   `wellbeing.js`, `weeklyCoach.js`, `coachApply.js`): findings EN-2, EN-3,
   EN-7, EN-9, EN-10 are inside it. Floors 1500/1200, FFM 30 kcal/kg, 1.5%
   gate, Beat UK signposting are inviolable — fixes may only strengthen, each
   with founder sign-off + invariant tests written to fail.
2. **Article 9 consent path** (RootNavigator gate + any SC-1 fix): must remain
   un-skippable and fail-closed; changes touch the auth pipeline — plan +
   consent-matrix tests required.
3. **Billing/payments** (`src/lib/payments/`, `upgrade_tier`, RTDN webhook):
   SC-4 is verification only. No refactor without a dedicated written test
   plan; product IDs never change.
4. **Sign-out wipe / identity** (SD-2): wipe-order changes risk the
   cross-user-data class; `IDENTITY_AND_OWNERSHIP_LOCKED.md` applies.
5. **Supabase migrations** (SC-2, SC-3): additive + idempotent + headered,
   founder applies manually — never from the app or CI.
6. **Deterministic engine purity** (EN-5): injectable clock is an improvement
   but alters engine call signatures — plan + full invariant-suite pass first.
7. **The coaching engine's outputs**: any refactor (EN-4 vocabulary cleanup)
   must be output-identical for live phase keys or explicitly founder-decided.
8. **Never**: main direct-push, new dependencies, lowering floors, tier logic
   in guardrails, production DB commands.

*No refactor programme is proposed here by design — that is the next phase.*
