# 02 — Line-by-line code audit

Status: **IN PROGRESS**
Date: 2026-05-31
Branch: `main` @ `a4bf964`

> **Method (post-retraction discipline).** A prior version of this file
> presented findings from sub-agents that had not reported, and several
> "[VERIFIED]" claims did not match source. That version is gone. **Every
> finding below was produced by reading the cited lines in this session.**
> Each finding names the file and line and, where useful, quotes the code.
> If a line cannot be quoted from a read I performed, it is not here.
>
> **Files read in full so far:** `App.js` (1–768),
> `src/navigation/RootNavigator.js` (1–1066), `src/lib/supabase.js` (1–188),
> `src/store/useAppStore.js` (1–911), `src/styles/theme.js` (1–366),
> `src/lib/sync/runner.js` (1–242), `src/lib/sync/index.js` (1–39).
> **Partially read:** `src/lib/sync.js` (377–425 scheduleSync, 537–580
> bulkUploadLocalData head, 1150–1316 pullFromCloud full, plus several
> single-row `sync*` upserts) — per-table `_pull*` helpers not individually
> read. `src/lib/database.js` (1–130 init/schema, 255–299 + 1120–1187
> migration system, 1390–1417 + 2074 update builders, 3176–3265
> wipeAllUserData, full-file SQLi scan) — the hundreds of repository CRUD
> functions are NOT each read; claims are scoped to what was read.
> Also read in full: `src/lib/algorithms.js` (1–1100) and the food
> waterfall/sources. **Next:** large screens (ActiveWorkout/Home/CoachOutput),
> `planEngine.js`, `weeklyCoach.js`; per-repository sweep of database.js.

The prior session's correctly-verified facts (re-checked by me where noted)
are retained at the bottom under "Carried verified facts."

---

## `App.js` (root component, 768 lines) — read in full

**Purpose (from code):** installs global error handlers (`:19`), inits
Sentry via lazy require (`:25-35`), wires Play Billing (`:42-46`),
defines two background TaskManager tasks (rest-timer keepalive `:55-61`,
daily sync `:73-91`), sets the notification handler (`:95-107`), boots
accessibility/theme/observability, handles auth deep links, and renders
the provider tree + `RootNavigator` (`:722-767`).

### Findings

**A2-001 — Duplicate sync paths fire on every foreground (perf + correctness risk).**
There are **two separate `useEffect`s that each register their own
`AppState` `'change'` listener and both trigger cloud sync**:
- `:445-596` — `maybeSync()`, registered at `:561`, runs on `state ===
  'active' || 'background' || 'inactive'` (`:588-590`). It calls
  `bulkUploadLocalData` (`:477-478`), `drainSyncQueue` (`:488-489`),
  `importNewWeights` (`:501-502`), `recordTodaySteps` (`:509-510`),
  `flushPendingFeedback` (`:519`), a Year-of-Lifts query (`:536-542`),
  and telemetry (`:469`, `:554`). Throttled to once / 60s (`:448,451`).
- `:605-670` — `callSyncAll()`, registered at `:641`, runs on `state ===
  'active'` (`:642`) and calls `syncAll(...)` (`:622-623`) **plus**
  `importNewWeights` again (`:633`). Also fires on NetInfo reconnect
  (`:649-655`) and a 15-min interval (`:662`).

On each return to foreground, **both** `maybeSync` (→ `bulkUploadLocalData`)
and `callSyncAll` (→ `syncAll`) run. Per the prior session's grep
(carried below), `syncAll` itself calls back into `bulkUploadLocalData +
pullFromCloud`. So `bulkUploadLocalData` is plausibly invoked **twice per
foreground**, and `importNewWeights` is invoked twice (`:501` and `:633`).
The 60s throttle only guards `maybeSync`, not `callSyncAll`.
→ **To confirm in `sync.js` audit:** whether `syncAll` and the direct
`bulkUploadLocalData` call de-dupe (the comment at `:598-604` claims the
runner "has its own in-memory lock so concurrent calls dedupe" — must be
verified against `sync/runner.js`). Severity depends on that lock.
Even if de-duped, two `getSession()` round-trips fire per foreground
(`:455` and `:617`).

**A2-002 — `maybeSync` also fires on `'inactive'`, contradicting its own comment.**
Comment `:581-587` says "Fire on BOTH foreground (active) and
backgrounding (inactive/background)", but the guard `:588` includes
`'inactive'` explicitly. On iOS, `'inactive'` fires on transient events
(Control Center pull, incoming call, app-switcher peek), so `maybeSync`
is attempted on those too. The 60s throttle limits damage, but the
intent/condition mismatch is real. Low severity.

**A2-003 — `WhatsNewSheet` render is dead code (`{false && (…)}`).**
`:747` renders `{false && (<WhatsNewSheet …/>)}`. The whole
`whatsNewItems` array (`:701-720`) and the `onOpenSettings` handler
(`:750-758`) are consequently unreachable at runtime. The comment
(`:740-746`) says this is intentional ("Suppressed for the initial
launch"). **Classify: dormant/intentional dead code** — not a bug, but
it is shipped, parsed, and a maintenance carry. Flag for Phase 11 as a
"keep behind a flag vs. remove" decision, not a defect.

**A2-004 — Auth deep-link errors are silently swallowed.**
`handleAuthDeepLink` (`:133-164`) wraps both the PKCE
`exchangeCodeForSession` (`:142`) and the implicit `setSession` (`:157-160`)
in `try { … } catch (_) {}` with empty bodies. If an auth callback fails
(expired code, network), the user taps the email link and **nothing
happens, with no error surfaced**. Severity: medium for the auth journey
(Phase 3/10 follow-up) — a failed confirmation link is invisible.

**A2-005 — `importNewWeights` duplicated across both sync effects.**
Called at `:501-502` (inside `maybeSync`) and again at `:633-634`
(inside `callSyncAll`). Both are gated only on `localUserId`, both
fire-and-forget. Redundant health read on every foreground. Low severity
(self-gates on permission + incremental), but a clear duplication.

**A2-006 — Heavy fire-and-forget `.catch(() => {})` density.**
Throughout the sync effects (`:478, :489, :502, :510, :521, :542, :557`,
etc.) every async call is fire-and-forget with empty catches. This is a
deliberate "tolerate offline" pattern (comments say so), but it means
**no sync failure is ever observable** to the user or to telemetry beyond
the explicit `track()` calls. Noted for Phase 5 (observability) and
Phase 10 (does the user ever learn sync is failing?). Not a defect per se.

**A2-007 — Two background-task definitions at module scope; daily-sync uses legacy path.**
`VOLYUME_DAILY_SYNC` (`:73-91`) calls `bulkUploadLocalData` directly
(`:85`) — the legacy push path, not `syncAll`. So the background task and
the foreground `callSyncAll` use **different sync entry points**. Worth
confirming (Phase 5) that the background path doesn't miss the
pull/queue-drain that the foreground path does (`drainSyncQueue` is only
in `maybeSync`, not in the background task).

### Positive observations (verified, not defects)
- `ErrorBoundary` (`:172-217`) uses literal hex, not theme tokens, with
  an explicit comment (`:219-224`) explaining this avoids re-crashing if
  the theme layer is what failed. Sound reasoning.
- Accessibility theme bake is gated before `RootNavigator` require
  (`:328-330`, `:672-683`) with a clear comment on why (`:109-114`).
  Correct ordering for the "frozen StyleSheet" problem described.
- Notification handler only sounds the `rest-done` channel in foreground
  (`:99-105`) — intentional, matches the rest-timer UX.

---

## `src/navigation/RootNavigator.js` (1066 lines) — read in full

**Purpose (from code):** declares the entire navigation tree (5 tab
stacks + 5 pre-main stacks), the cold-launch `bootstrap()` sequence, the
`onAuthStateChange` pipeline, the splash, and the top-level routing gate
`renderNavigator()`.

### Verified navigation structure (also feeds Phase 3)
- **Tabs (`:347-351`):** `HomeTab`→"Train", `PlansTab`→"Plans",
  `DiaryTab`→"Diary", `ProgressTab`→"Progress", `ProfileTab`→"You".
- **Stack sizes (verified by counting `Stack.Screen`):** HomeStack 9
  (`:217-227`), PlansStack 9 (`:238-248`), DiaryStack 9 (`:164-206`),
  ProgressStack 12 (`:259-273`), ProfileStack **24** (`:284-310`).
- **Pro-gated screens (`:97-102`, via `withProGuard`):** WeeklyCheckIn,
  NutritionTargets, BodyMetrics, CoachOutput, ProGoalSetup,
  CoachingReminders. `GatedBodyMetrics` is registered in **both**
  ProgressStack (`:266`) and ProfileStack (`:289`).
- **Top-level gate `renderNavigator()` (`:904-913`):** (1) no `tier` →
  `WelcomeStack`; (2) `user && !user.isLocal && healthConsentChecked &&
  healthConsent === false` → `Article9ConsentStack`; (3) `!firstRunComplete`
  → `ProOnboardingStack` (tier `pro`) else `FirstRunStack`; (4) else
  `MainTabs`.
- **Tab-press resets stack to root:** every stack registers a `tabPress`
  listener → `StackActions.popToTop()` (`:158-162, :211-215, :232-236,
  :253-257, :278-282`).

### Findings

**A2-008 — `lazy={false}` mounts all 5 tab stacks eagerly at startup (perf).**
`:321`. On entering `MainTabs`, all five tab stacks and their initial
screens mount at once — including `HomeScreen` (2,344 LOC),
`AnalyticsScreen` (1,436), `DiaryScreen`, `PlansScreen`, `YouScreen`.
Deliberate (avoids tab-switch lag) but a measurable cold-start cost.
→ **Phase 6** quantify; consider `lazy` for the heaviest non-Home tabs.

**A2-009 — Two independent notification-tap handlers exist (possible double-handling).**
RootNavigator installs an `onTap` handler via `installNotificationListeners`
(`:454-468`) whose `routeFor()` (`:448-452`) maps **only two** types
(`weekly_checkin`, `year_of_lifts_unlock`); anything else → `return` (`:457`).
Separately, **`App.js:410-415`** registers its *own*
`addNotificationResponseReceivedListener` that reads
`data.url` and calls `Linking.openURL`. So a single notification tap can
be observed by **both** listeners. → **Phase 3/5:** confirm whether any
notification payload carries both `type` and `url` (double navigation) and
whether the two listeners should be unified. Verified both sites.

**A2-010 — No React-Navigation `linking` config; universal links can't reach arbitrary screens.**
The `NavigationContainer` (`:915-941`) has **no `linking` prop**. In-app
URL handling is limited to `App.js handleAuthDeepLink` (auth callbacks)
and the 2-type notification `routeFor`. The `volyume://` scheme +
`volyume.app` universal links are declared (app.json — to read in Phase 3)
but there is no declarative deep-link → screen map. → **Phase 3** deep-link
coverage finding; large gap vs. competitors that deep-link to a workout.

**A2-011 — The cold-launch `bootstrap()` + `onAuthStateChange` effect is the app's most complex unit (maintainability + test risk).**
`:471-855` is a single `useEffect` that: awaits `initDatabase` (`:479`),
fires 3 food-seed imports fire-and-forget (`:490-505`), `checkFirstRun`
(`:511`), **awaits** `checkTier` (`:518`), reads the Supabase session and
hydrates profile/units/barWeight (`:520-553`), `refreshTierFromCloud`
(`:558`), Play Billing init (`:565-569`); then registers
`onAuthStateChange` (`:624-849`) which on auth-enter runs cross-user wipe
(`:750-762`), health-consent resolution (`:768-803`), `bulkUploadLocalData`
(`:807-813`), telemetry flush (`:818-822`), `pullFromCloud` (`:835-837`)
and push registration (`:845-847`). Dozens of fire-and-forget
`.catch(()=>{})`. This is extremely hard to unit-test and reason about;
it is also the **identity/data-ownership critical path** (Phase 5).
Recommend extraction into named, individually-testable bootstrap steps.

**A2-012 — Every cold launch with a session runs a full bulk-upload + full pull (perf, compounds A2-001).**
`isAuthEnter` (`:670-672`) is true for `SIGNED_IN` **or** `INITIAL_SESSION`.
`INITIAL_SESSION` fires on every cold launch with a restored session, so
the entire migration/upload/pull block (`:728-848`) — including
`bulkUploadLocalData` (`:809`) and `pullFromCloud` (`:835`) — runs on
**every launch**. Combined with `App.js`'s foreground `maybeSync` +
`callSyncAll` (A2-001), a cold launch can trigger `bulkUploadLocalData`
multiple times within seconds. → **Phase 6**; depends on the runner lock
(verify in `sync/runner.js`).

**A2-013 — Fixed 2.5 s minimum splash on every cold launch (UX/perf).**
`SPLASH_MIN_MS = 2500` (`:408`); `splashReady` is gated purely on a 2,500 ms
timer (`:435-438`), and the splash gate requires `splashReady` (`:876`).
So even when bootstrap finishes in 300 ms, the user waits 2.5 s. Deliberate
brand moment, but a fixed tax on every launch. → **Phase 9/10** decide
whether to shorten or make it bootstrap-bounded.

**A2-014 — Health-consent failure paths are inconsistent (could re-prompt a consented user).**
Inside the auth-enter block: the *cloud-error* branch deliberately sets
`setHealthConsent(null, true)` (`:791`) with a comment that a network blip
must **not** re-fire the Article 9 gate. But the *outer catch* sets
`setHealthConsent(false, true)` (`:802`). Per `renderNavigator` (`:906`),
`healthConsent === false` routes to `Article9ConsentStack`. So if the
consent read *throws* (rather than returning `{error}`), a user who
already consented can be bounced back into the consent gate. → reconcile
to `null` on all transient failures. Medium (compliance-adjacent UX).

**A2-015 — `cleanupOrphanRoutineExercises` + 3 food seeds run on every boot fire-and-forget (`:484-505`).**
Each only logs via `console.warn` on failure (`:483-484, :491, :497, :505`).
Not surfaced anywhere a user/telemetry sees. Low severity; noted for
Phase 5 observability (boot-time data maintenance failing silently).

### Positive observations (verified)
- `heroZoomTransition` guards `current.progress` being undefined and
  falls back to opacity-only (`:130-132`) — prevents the "interpolate of
  undefined" crash the comment describes. Sound.
- `RootNavigator` subscribes to the store via **field selectors**
  (`:415-432`) with a comment (`:411-414`) explaining this prevents a
  full-navigator re-render on every store mutation (rest-timer ticks
  etc.). Correct perf hygiene.
- `await checkTier()` before `refreshTierFromCloud` (`:512-518`) with a
  comment documenting the exact race it fixes (Pro→Free demotion). Good.
- Splash/`isAuthLoading` gating comment (`:868-875`) documents why the
  splash is **not** gated on `isAuthLoading` (would unmount
  ProOnboardingStack mid-flow). Real bug avoided.

---

## `src/lib/supabase.js` (188 lines) — read in full — carried claim CONFIRMED

**Re-verified (promoting the prior carried fact to a confirmed finding):**
- **Env-only credentials, lazy, returns `null` when unconfigured.** `:24-29`
  (`url = process.env.EXPO_PUBLIC_SUPABASE_URL`, `key = …_ANON_KEY`,
  `if (!url || !key) return null;`). **No fallback constants anywhere in
  the file.** Confirmed.
- **Auth session stored encrypted in `expo-secure-store`**, not
  AsyncStorage, via `secureAuthStorage` adapter (`:3, :7-17`) passed as
  `auth.storage` (`:33`). `detectSessionInUrl: false` (`:36`) — deep-link
  auth is handled manually. **Security positive.**
- Client wrapped by `instrumentSupabase` observability proxy (`:43-49`)
  that emits a breadcrumb (table, op, duration) per `.from()` call. →
  **Phase 5** verify the breadcrumb records no row *values*, only metadata.

### Findings

**A2-016 — Apple Sign-In uses the browser OAuth flow, not native (App Store risk).**
`signInWithApple` (`:162-169`) just calls `_signInWithOAuthProvider('apple')`
(browser flow). The comment itself (`:163-167`) states a native
`expo-apple-authentication` button is "Apple's preferred path, **and
required for App Store approval**". Since Google sign-in is offered
(`:158`), Apple's guideline 4.8 requires native Sign in with Apple on iOS.
→ **Phase 5 (compliance) / Phase 10.** Real submission-blocker risk.

**A2-017 — OAuth `code` is exchanged twice (here + App.js).**
`:142-146` exchanges the code in the WebBrowser success branch, and
`App.js handleAuthDeepLink:142` exchanges it again from the deep-link
listener. Comment calls it "belt-and-braces" (`:140-141`). With PKCE the
second `exchangeCodeForSession` on an already-consumed code fails; both
swallow errors (`:145`, App.js `:142`). Harmless but redundant double
round-trip. Low.

**A2-018 — `getUserProfile` uses `.single()` (errors on no-row) while other reads use `.maybeSingle()`.**
`:186` `.single()` returns a PGRST116 error when the profile row doesn't
exist yet (brand-new user), whereas RootNavigator's consent read uses
`.maybeSingle()` (`RootNavigator:780`). Callers of `getUserProfile` must
treat "no row" as an error. → flag for the per-caller audit; ensure no
screen renders an error state for a legitimately-absent profile. Low/med.

---

## `src/store/useAppStore.js` (911 lines) — read in full

**Purpose:** the single Zustand store. Holds auth/session/profile, Article 9
consent, tier, cloud-sync status, active-workout + rest-timer + PR-queue,
units/bodyWeightUnits/barWeight/dietPreference, and accessibility prefs.
Instrumented once at module load by `observability.instrumentStore`
(`:901-908`).

### Findings

**A2-019 — Sign-out's `AsyncStorage.clear()` destroys device-wide prefs and other accounts' fast-path caches (UX regression).**
`clearAuthStateForSignOut` calls `AsyncStorage.clear()` (`:283`) "leave
nothing behind". But AsyncStorage also holds **accessibility prefs**
(`A11Y_PREFS_KEY`, written at `:895`), notification prefs, and the
**per-uid `FIRST_RUN_KEY_PFX` caches for *other* accounts** (`:14, :664`).
So signing out of account A: (a) **resets a blind/low-vision user's
Larger-Text / Higher-Contrast / Reduce-Motion settings**, and (b) wipes
account B's optimistic-routing cache, forcing B through a cloud read on
next sign-in. The targeted wipe (`wipeAllUserData`, `:267`) already
handles user data; the blanket `clear()` is too broad. → Medium. Preserve
device-scoped prefs (a11y, notif) across sign-out.

**A2-020 — `generateUUID()` uses `Math.random()` (`:85-90`), not a CSPRNG.**
Exported and (per name) used for local row IDs. `Math.random` UUIDv4 is
non-cryptographic and weaker on collision/predictability. Acceptable for
opaque local row keys, a concern if any value is used as a security token
or guessable resource id. → flag for the per-caller sweep (grep usages);
recommend `expo-crypto`'s `randomUUID`. Low–med pending usage.

**A2-021 — The 60-second "new vs returning" heuristic can skip onboarding for slow email-confirmers.**
`restoreSessionFromCloud` (`:476-491`) routes a user to MainTabs
(returning) when `session.user.created_at` is ≥ 60 s old (`:478`). A user
who signs up but confirms their email > 60 s later has an auth row already
older than 60 s on first real sign-in, so they are routed **past the
onboarding wizard into an empty MainTabs** (no plan, no nutrition
targets). The comment at `:564-569` acknowledges this edge case and
defers it to "Settings → Update your plan". → Phase 10 friction; medium
for the new-user activation journey.

**A2-022 — Four near-identical profile setters (duplicated logic).**
`setUnits` (`:802-815`), `setBodyWeightUnits` (`:819-832`),
`setDietPreference` (`:839-851`), `setBarWeight` (`:855-868`) each repeat
the same 8–10 line block: build `updated`, `AsyncStorage.setItem`,
`set({userProfile})`, `_stampProfileFields([field])`,
`_persistProfileTimestamps`, `pushPrefSoon`. Should collapse to one
`_setProfileField(field, value, {topLevel})` helper. Maintenance + drift
risk (e.g. `setDietPreference` omits the top-level `set` the others do,
because there is no top-level `dietPreference` state — easy to get wrong).

**A2-023 — Offline sign-out is blocked by design (Phase 10 friction).**
Push-first safety (`:231-245`): if `bulkUploadLocalData` throws (offline),
sign-out aborts with `{ ok: false, reason: 'unsynced' }`. Correct for
data safety, but a user with no connection **cannot sign out at all**
(e.g. on a plane, or to hand the phone to someone). Deliberate, but worth
a Phase 10 note on whether a "sign out anyway, I'll lose unsynced edits"
escape hatch is warranted.

**A2-024 — Stale comment referencing removed "Athlete Hub".**
`:714` "Subscribers (Athlete Hub volume chart, etc.)" — AthleteHub was
removed (per the inventory / status notes). Dead reference in a live
comment on `lastSetLoggedAt`. Trivial, but a documentation-rot signal.

**A2-025 — `LOCAL_USER_KEY` + `clearLocalUser` may be dead after the "no anonymous mode" lock.**
`LOCAL_USER_KEY` (`:12`) and `clearLocalUser` (`:184-187`) reference the
local-user concept that `IDENTITY_AND_OWNERSHIP_LOCKED.md` removed
(`initLocalUser` deleted, `:155-159`). → grep call sites; likely
removable dead code. Low.

### Positive observations (verified)
- Concurrency-safe functional `set()` forms with comments on the exact
  race they prevent: `addExerciseToWorkout` (`:702-712`),
  `addSetToCurrentExercise` (`:720-731`). Good for rapid double-taps.
- `setTier` (`:417-426`) and `refreshTierFromCloud` (`:604-607`) persist
  to AsyncStorage **before** the in-memory `set()`, with a crash-
  consistency comment. Correct ordering.
- PR-celebration **queue** (`:787-798`) fixes the "two PRs on one set lost
  the second" single-slot bug. Sound.
- `resetFirstRun` refuses while a workout is active (`:639-647`) to avoid
  unmounting MainTabs mid-set. Good guard.

---

## `src/styles/theme.js` (366 lines) — read in full

**Purpose:** the design-token single source of truth — `colors`,
`spacing`, `radius`, `fontSize`, `fontWeight`, `lineHeight`,
`letterSpacing`, semantic `type` roles, `motion`, `shadow`, `hitSlop`,
`iconSize`, `volumeColors`, plus `withAlpha`, `circle`, `num`, and
`applyAccessibility`. **This is a high-quality, premium token system** —
documented WCAG ratios per colour, Okabe–Ito CVD swaps, Material-3 motion
curves, tabular-figure numerals. Most files audited will be measured
against it in Phase 9.

### Findings

**A2-026 — Text-size & contrast accessibility toggles require an app reload to take effect (real a11y weakness).**
`colors` and `fontSize` are exported **mutable** objects (`:77, :147`);
`applyAccessibility` (`:170-207`) mutates them in place, but only at boot
(`App.js:328-330`) **before** any `StyleSheet.create` runs. RN copies
primitives at `StyleSheet.create` time, so toggling **Larger Text /
Higher Contrast / Colour-Blind Safe** in Settings produces **no visible
change until the app is restarted** (only `reduceMotion`, read reactively
from the store, is live). The code comments (`:1-7, :149-152`) and the
store comment (`:874-875`) acknowledge this and rely on SettingsScreen
prompting a reload. Best-in-class apps apply text scaling live. → Phase
9/10; meaningful for low-vision users.

**A2-027 — Stacked text scaling can overflow layouts at extremes (to verify Phase 9).**
The in-app `largerText` 1.2× (`:194-206`) **stacks** on top of the OS
font scale (RN `allowFontScaling=true`), per the comment (`:167-169`). A
user with a large OS font + in-app Larger Text gets ≈1.2 × OS-scale, which
can break dense data rows / tab labels. → Phase 9 must check truncation /
overflow on the heaviest screens at max scale.

**A2-028 — WCAG ratios in comments are claims, not yet independently verified.**
Each colour carries a stated contrast ratio (`:45-48` etc.). Per Rule 1 I
have **not** recomputed these; Phase 9 will calculate the actual ratios
for `textMuted`, `textSecondary`, `border` against `#0D0D0D` and the
elevated surfaces (the AA claim "on raised surfaces" at `:46-47` is the
one most worth checking, since contrast drops on lighter surfaces).

### Positive observations (verified)
- `applyAccessibility` resets to `baseColors`/`baseFontSize` first
  (`:171-173`) so consecutive applies don't compound. Correct.
- `withAlpha` (`:83-105`) is a robust pure function handling #RGB,
  #RRGGBB, #RRGGBBAA and rgb()/rgba(), replacing the fragile `color+'55'`
  concat. Good.
- `type` roles are **getters** (`:242-279`) so they read the post-a11y
  `fontSize` at `StyleSheet.create` time — the one accessibility dimension
  that *can* update at boot is wired correctly.

---

## Sync layer — `runner.js` + `index.js` read in full; `sync.js` partially read

### A2-001 / A2-012 RESOLVED (the foreground-sync concurrency question)

**Verdict: the in-memory lock is real but narrow; redundant concurrent
uploads ARE possible on foreground/sign-in, but they are idempotent
(wasteful, not corrupting).**

Evidence, all read this session:
- `syncAll` holds `_runLock` (`runner.js:22, 37-40`): a second `syncAll`
  while one is running returns `{status:'skipped', reason:'already_running'}`.
  So `syncAll`-vs-`syncAll` **is** de-duplicated. The `App.js:598-604`
  comment is correct *for that path only*.
- `syncAll` runs a full cycle: (1) per-table push for `MIGRATED_TABLES`,
  (2) **legacy `sync.bulkUploadLocalData`** (`runner.js:114-115`), (3)
  per-table pull, (4) **legacy `sync.pullFromCloud`** (`:146-147`).
- **But `_runLock` only guards `syncAll`.** `bulkUploadLocalData` is
  called **directly** (bypassing the lock) from at least: `App.js:85`
  (daily background task), `App.js:478` (`maybeSync`),
  `RootNavigator.js:809` (sign-in), `useAppStore.js:237` (sign-out),
  and `syncQueue.js:161/172/180`. `pullFromCloud` directly from
  `RootNavigator.js:835`.
- `bulkUploadLocalData` itself has **no in-flight guard** — read its head
  (`sync.js:537-575`): it just runs `syncExercises` → workout batches.
  The only debounce is `scheduleSync`'s 2 s timer (`sync.js:385-413`),
  which only coalesces the *write-trigger* path.
- **Therefore:** on a single foreground after sign-in, `maybeSync`'s
  direct `bulkUploadLocalData` (App.js:478) and `callSyncAll`'s
  `syncAll`→`bulkUploadLocalData` (runner.js:115) can run **concurrently**;
  the runner lock does not see the direct call.
- **Severity downgraded to perf/efficiency, not correctness:** the cloud
  writes are `upsert(..., { onConflict: 'user_id,id' })` (e.g.
  `sync.js:438, :474`), so concurrent duplicate uploads converge
  idempotently (last-write-wins). The cost is **wasted duplicate network
  + DB round-trips on every foreground/launch**, plus two `getSession()`
  calls. → Phase 6 perf; recommend routing **all** callers through
  `syncAll` so the single lock actually governs every push/pull.

### A2-029 — Two coexisting sync architectures, deliberately mid-migration.
`runner.js:10-14` + `transport.js:8` confirm: `MIGRATED_TABLES` use the
new registry/transport path; everything else still flows through the
legacy `bulkUploadLocalData`/`pullFromCloud` in `sync.js`. Both run in the
same `syncAll` cycle. This is intentional (documented), but it means the
sync surface is **doubled** during the migration — every table is either
"migrated" or "legacy", and a reader must check `MIGRATED_TABLES`
(transport.js) to know which path owns a given table. Maintainability +
test-surface finding; not a bug.

### A2-030 — `scheduleSync` is a no-op under Jest (`sync.js:397-399`).
`if (process.env.JEST_WORKER_ID) return;`. Sound (avoids open-handle
timers in tests), but means **the debounced write-sync path is never
exercised by the test suite** — tests must call `bulkUploadLocalData`
directly (comment `:395-396`). → Phase 7 gap: the 2 s coalescing
behaviour and its cancellation (`cancelScheduledSync`) have no unit
coverage via the normal write path.

> **Note:** `sync.js` is 1,732 lines and only partially read so far
> (orchestration + `scheduleSync` + `bulkUploadLocalData` head + several
> `sync*` single-row upserts at `:427-496`). Per-table upsert correctness
> (column mappings like the `body_metrics` fix noted at `sync.js:490-496`)
> and `pullFromCloud`'s full body remain to be read. No claim is made
> about the unread portions.

---

## `src/lib/sync.js` `pullFromCloud` (1150–1316) — read in full

**A2-031 — Legacy `pullFromCloud` returns a number, so its per-table counts never reach `sync_run` telemetry.**
`pullFromCloud` returns `workoutCount` (a number) on success or `0`
(`:1311, :1314`). But the runner expects an object:
`if (pull && typeof pull === 'object' && pull.pullCountPerTable)`
(`runner.js:154`). Since a number fails that guard, **none of the legacy
per-table pull counts** (programmes, routines, mesocycles, weights,
coach outputs, the ~15 `_pull*` helpers at `:1231-1254`) are merged into
`pull_count_per_table` in the `sync_run` event. Same shape risk applies to
`bulkUploadLocalData`/`pushCountPerTable` (`runner.js:122`) — to confirm
when its return is read. Observability gap, not a functional bug. Low.

### Positive observations (verified)
- Incremental **watermark delta pull** for workouts (`:1182-1227`): warm
  cursor pulls only `updated_at >= cursor`; cursor advances **only** on a
  fully clean pass (`:1225-1227`); sign-out clears it so sign-in full-pulls.
  Sound incremental-sync design.
- Exercises pulled **first** for FK resolution (`:1165-1172`); sets fetched
  in chunks after the workout shells (`:1202-1206`) — explicitly fixes a
  prior N+1.
- The comment at `:1297-1302` records a real shipped bug: a stray
  `notifPrefCount` reference threw a Hermes `ReferenceError` that dumped
  the **entire pull** into the catch (returned 0). This is exactly the
  `no-undef` class the ESLint gate (`eslint.config.js:114`) now blocks —
  concrete justification for that gate.

---

## `src/lib/database.js` — structural core read (NOT a full per-function read)

> Scope: I read the init/schema (`1–130`), the migration system
> (`255–299`, `1120–1187`), the two dynamic-`SET` update builders
> (`1390–1417`, `2074`), `wipeAllUserData` (`3176–3265`), and ran a
> full-file SQL-injection scan. The hundreds of individual repository
> CRUD functions are **not** each audited yet. Findings below are limited
> to what was read.

### A2-032 — Migration runner is CORRECT — but the prior doc's evidence for it was inaccurate.
`runMigrations` (`:1157-1187`): iterates `SCHEMA_MIGRATIONS` (array of
per-version op lists, `:277-1146`); benign errors (`duplicate column` /
`already exists`) are skipped via `continue` (`:1177`); a **genuine**
error is logged and **re-thrown** (`:1180-1181`); `PRAGMA user_version =
v+1` is set **after** the inner op loop (`:1185`), so a failed version
throws before its version is recorded and **re-runs next launch**. This
is correct. **However**, the prior `02-code-audit.md` cited
`database.js:1152-1175` and described an `m.up()` pattern — **neither
exists**; the real structure is the `SCHEMA_MIGRATIONS` array +
`isBenignMigrationError`. The conclusion was right, the cited evidence was
fabricated/mismatched. Recording the accurate evidence here.

### A2-033 — Prior open question RESOLVED: the ALTER-swallow is properly scoped.
The carried worry ("the ALTER-swallow also swallows non-duplicate errors
silently") is **refuted**. `isBenignMigrationError` (`:1150-1155`) returns
true **only** for `duplicate column` / `already exists` / `duplicate
column name`. Any other error falls through to `throw` (`:1181`). The
catch is scoped; genuine schema failures are not hidden. Open question
closed.

### A2-034 — SQL-injection surface of the local DB layer is effectively nil (Phase 5 positive).
Of **279** SQLite query calls, only **6** use `${}` interpolation
(verified by grep), and every one interpolates a **code-controlled
identifier**, never a value:
- `:1185` `PRAGMA user_version = ${v+1}` — `v` is a loop integer.
- `:1416` / `:2074` `UPDATE … SET ${fields.join(', ')} WHERE id = ?` —
  `fields` are `col = ?` strings built from a **hardcoded `fieldMap`
  whitelist** (`:1390-1404`); only keys present in both the map and the
  caller's `data` are included (`:1407-1408`); all values bound via `?`.
- `:3249` `DELETE FROM ${table} …`, `:3311` `SELECT * FROM ${t}`,
  `:3329` `DELETE FROM ${t}` — `table`/`t` iterate hardcoded constant
  lists (`WIPE_DIRECT_TABLES` etc.), never user input.
All other 273 calls use bound `?` params. → Carry to `05-security-audit.md`
as a verified strength.

### A2-035 — `wipeAllUserData` is well-built (verified).
`:3176-3265`: wrapped in `runInTransaction`, deletes FK children before
parents (adaptation_events → planned_muscle_volume → mesocycle_weeks →
routine_exercises → direct-user tables), per-table try/catch so a missing
table on an older schema doesn't abort the wipe, `userId` bound. One
note: `DELETE FROM exercises WHERE is_custom = 1` (`:3261`) is **not**
user-scoped — it wipes all custom exercises. Safe under the documented
"one user's data on the device at a time / sign-out wipes local SQLite"
model, but it is the one wipe step that would over-delete if that
invariant were ever violated. Low.

### A2-036 — `uid()` duplicates the store's `generateUUID` (both `Math.random`).
`database.js:21-30` `uid()` and `useAppStore.js:85-90` `generateUUID` are
the same `Math.random` UUIDv4 generator, defined twice. `database.js:25`
adds the explicit justification "ids are not security-sensitive", which
partially answers A2-020 for **row** ids. Recommend a single shared
`expo-crypto randomUUID` helper to remove the duplication and the
`Math.random` caveat in one move. Low.

---

## Food layer — `sources/usda.js` (full) + `waterfall.js` (full) read

### Carried claim CONFIRMED + extended
- **`usda.js` has `_fetchWithTimeout` (AbortController, 1500 ms) with
  `clearTimeout` in `.finally`** (`:30-38`) — no leaked timer. Key read
  from `process.env` via an **indirect name** (`:24-27`) to defeat
  babel-preset-expo's compile-time `EXPO_PUBLIC_*` inlining. All query
  inputs are `encodeURIComponent`'d (`:48-50, :70-71`). Graceful `[]`/`null`
  on missing key or error. `liveOff.js` mirrors the timeout pattern
  (`:24-25, :75, :98`). Prior carried claim confirmed.

### A2-037 — USDA API key is shipped in the client bundle (inherent to `EXPO_PUBLIC_`, low value).
The indirect-access trick (`usda.js:18-28`) keeps `process.env
.EXPO_PUBLIC_USDA_API_KEY` readable **at runtime**, i.e. it is in the
client bundle (all `EXPO_PUBLIC_*` vars are, by Expo design). The comment
(`:8-11`) notes it is a free-tier api.data.gov key (1000 calls/hr,
per-developer). → `05-security-audit.md`: a leaked-but-low-value key; the
risk is quota abuse, not data exposure. Recommend a server proxy only if
quota abuse becomes real. Low.

### Positive observations (verified)
- `waterfall.js` 5-source first-hit-wins (local → OFF → USDA) with
  **cache promotion** writing network hits back into local `foods`
  (`:40-87`), idempotent on `(source, source_id)` with an explicit
  race re-read (`:73-80`). Sound.
- Per-search / per-barcode telemetry tags the winning source
  (`local`/`off_live`/`usda`/`miss`) with latency (`:105-132, :147-165`)
  — good funnel observability for the food feature.
- All `waterfall.js` SQLite calls are parameterised (`:46-48, :56-71,
  :75-77`). Consistent with the A2-034 DB-layer finding.

Minor: `_promoteAll` (`:83-87`) promotes sequentially (await-in-loop) — up
to 10 serial SQLite inserts on a network search. Acceptable (the unique-
index race makes sequential safer than `Promise.all`); noted for Phase 6.

---

## `src/lib/algorithms.js` (1100 lines) — read in full

**Purpose:** the 25 pure training-science functions (volume landmarks,
1RM, weekly/effective volume, double-progression set targets, PR
detection, auto-regulation, adaptive landmarks, deload logic, plateau,
substitutes, plates). **Overall this is the strongest file in the
codebase** — evidence-cited (Robinson 2024, Coleman 2024, Maeo 2023,
Kreher & Schwartz 2012, etc.), defensive about camelCase/snake_case dual
shapes, and the math is sensible. Findings are mostly accuracy/consistency
nits, not breakage.

### A2-038 — `getVolumeStatus` returns HARDCODED hex colours that bypass the accessibility palette.
`:141,150,153,156,159,162,164` return literal hex (`#616161`, `#FFB300`,
`#00C853`, `#FF3D00`, `#9E9E9E`) for muscle-volume status. These are in a
`lib/` file, so the screens/components hardcoded-hex ESLint guard does
**not** apply — but it means any screen consuming `getVolumeStatus().color`
shows colours that **do not adapt** to `colorBlindSafe` / `higherContrast`
(the theme's `volumeColors` getters at `theme.js:321-326` DO adapt). So
there are two competing volume-colour sources. → **Phase 9 (a11y):** for a
deuteranope, the green/amber/red volume states render in the
non-CVD-safe palette. Identify which screens use `getVolumeStatus().color`
vs `theme.volumeColors` and unify on the adaptive tokens. Medium.

### A2-039 — Auto-progression increments are kg-centric; the `units` arg only relabels (lbs users get wrong-sized jumps).
`computeSetTargets` (`:211`) and `getProgressionSuggestion` (`:168`) take
`units`, but it is used **only for the display label** (`:189, :205, :362,
:365`). `getIncrement` (`:230-236`) and the inline increments
(`:186, :195, :659`) are hardcoded kg magnitudes (`weight >= 60 ? 2.5 :
1.25`, isolation `>= 20 ? 1 : 0.5`). Verified the caller passes real
`units` (`ActiveWorkoutScreen.js:575`) — yet the **manual** bump on the
same screen IS unit-aware (`:1401` `units === 'lbs' ? 5 : 2.5`). So a lbs
user gets a unit-aware manual +5 but a kg-sized auto-suggestion (+2.5)
relabelled "lbs", and the `>= 60` threshold is applied to a lbs number.
`calculatePlates` (`:681`) and `generateDeloadPrescription` (`:1027`)
likewise assume **kg plate increments** (`[25,20,15,10,5,2.5,1.25]`,
`*0.5` rounded to 0.25). → Real correctness/UX issue for lbs users across
progression, plates, and deload. The per-exercise `incrementKg` override
(`:578`) can mask it but defaults don't. **Storage model to confirm**
(kg-canonical vs display-unit) in the ActiveWorkout save path — that
determines whether the number is also numerically wrong or "only"
mislabelled/under-sized. Medium–high; carry to Phase 9/10.

### A2-040 — `calculate1RM` is brzycki-only above 20 reps → inflated e1RM, can fire spurious 1RM PRs.
`:58-68`: for `reps > 20` it returns `brzycki` alone (`:66`), and Brzycki
diverges badly at high reps (e.g. ~30 reps ⇒ ≈5× weight). `detectPR`
(`:387-403`) builds the `1rm_estimate` PR from this, so a high-rep set can
trigger a false "New estimated 1RM". The `reps < 37` guard (`:63`) only
prevents the sign flip, not the inflation. → cap e1RM rep range (e.g.
ignore 1RM PR when reps > 12–15) or clamp the estimate. Low–medium
(accuracy of a celebratory surface).

### A2-041 — `calculateWeeklyVolume` counts secondary muscles; `calculateEffectiveSets` does not (inconsistency).
`calculateWeeklyVolume` adds fractional secondary-muscle sets
(`:123-132`, default `contribution 0.5`), but `calculateEffectiveSets`
(`:924-957`) only credits the **primary** muscle — no secondary loop. So
"effective sets" under-counts muscles trained mainly as secondaries (e.g.
rear delts on rows, triceps on presses) relative to "working sets". If
both feed the same UI/coach, the two volume numbers disagree by design. →
confirm intended; if not, mirror the secondary handling. Low–medium.

### A2-042 — Confirmed dead variables (match the Phase 7 lint findings).
`:586 targetSFR` (defined in `getExerciseSubstitutes`, never read — the
sort uses `sfrA/sfrB`, and `buildSubstituteReason` recomputes its own at
`:629`) and `:885 worstVolume` (computed but absent from the returned
`adapted[muscle]` object). These are the exact two locals ESLint flagged
(`07-…:A.1`). Promote from "lint-reported" to **read-confirmed dead code.**
Trivial cleanup.

### Positive observations (verified)
- `getSetEffectivenessWeight` (`:912-919`) implements a continuous
  RIR→credit curve with a cited rationale (Robinson 2024); null RIR → 0.9
  (conservative). Sound.
- `shouldDeload` (`:534-572`) is a weighted multi-signal score
  (performance 50 / wellness 30 / soreness 20) with citations explaining
  why soreness is down-weighted. Thoughtful.
- `computeSetTargets` anchors every set to the session high-water mark
  (`:308-343`) and caps jumps at 5%/session (`:264-265`) — avoids the
  classic "set 1 regressed because its own history was light" bug.
- `getVolumeStatus` short-circuits `workingSets <= 0` to `below` (`:149`)
  so `mev=0` muscles don't render green before any work is logged. Good.

---

## A2-043 — UNITS: gym-weight `lbs` support is display-label-only and is broken across progression, plates, the bar default, and unit-switching (verified end-to-end)

This consolidates and **resolves the open thread from A2-039** with the
storage model now confirmed.

**Storage model (verified):** a logged set's weight is stored as the raw
number the user typed, in their **current display unit** — `createWorkoutSet({
… weight: parseFloat(currentSet.weight) || 0 })` (`ActiveWorkoutScreen.js:748`),
no `lbsToKg`. The input alert says "weight used (in ${units})" (`:729`).
There is **no canonical-kg storage** and **no `kgToLbs`/`lbsToKg`
conversion** applied to gym-set weights on display anywhere
(grep of ActiveWorkout/Summary/LiftProgress/SetEntry returns none).

**Consequences (each verified):**
1. **Progression increments are kg-tuned** (A2-039): `getIncrement`
   (`algorithms.js:230-236`) and inline `weight >= 60 ? 2.5 : 1.25`
   (`:186,:195,:659`) apply to a **lbs** number for lbs users → a lbs
   lifter is told to add **+2.5 lb** (should be ~+5 lb), and a lbs
   beginner under 60 lb-displayed gets **+1.25 lb** jumps. The manual bump
   is unit-aware (`ActiveWorkoutScreen.js:1401` `units==='lbs'?5:2.5`),
   so the two progression paths disagree.
2. **Plate calculator is kg-only:** `PlateCalculator.js:19` calls
   `calculatePlates(weightNum, barNum)` with **no plate-set arg**, so it
   always uses the default kg plates `[25,20,15,10,5,2.5,1.25]`
   (`algorithms.js:681`). No lbs plate inventory (`45/35/25/10/5/2.5`)
   exists in the codebase (grep). A lbs user gets a **kg-plate breakdown
   of a lbs target** — physically wrong.
3. **Bar default is 20 (kg):** `barWeight: 20` (`useAppStore.js:854`); the
   standard lbs bar is 45 lb. No unit-aware default.
4. **Deload prescription** rounds to 0.25 kg steps (`algorithms.js:1027`).
5. **Switching units corrupts history:** `setUnits` (`useAppStore.js:802-815`)
   only saves the preference — it does **not** convert stored set weights.
   So a user who logs in kg then switches to lbs sees every past weight
   **relabelled, not converted** (100 kg → shown as "100 lbs"); all PRs,
   charts, volume tonnage and e1RM become wrong. The reverse is equally
   broken.

**Severity: HIGH for the lbs cohort** (a large share of users, esp. US).
The app is fundamentally kg-centric and treats `lbs` as a label. → This is
the single biggest *product-correctness* cluster found so far. Carry to
Phase 11 as a foundational fix: pick one canonical storage unit (kg),
convert on input/display, make increments/plates/bar unit-aware, and
migrate existing rows. Cross-ref Phase 9/10.

> Note: **body**weight (morning weight) IS handled in canonical kg with
> proper st/lb/kg conversions (`HomeScreen.js:858-866`,
> `formatBodyWeightShort`) — so the pattern exists; it just was never
> applied to **gym** weights.

---

## `src/screens/ActiveWorkoutScreen.js` (2560 lines) — runtime-critical paths read (NOT full)

> Scope read: store subscription (`125-157`), elapsed-timer + AppState
> lifecycle (`405-432`), persistent-notification effects (`453-506`),
> set-save path (`724-790`). The full 2,560-line screen (superset
> handling, ghost sets, deload prescription UI, exercise-swap, finish
> flow) is **not** entirely read; claims scoped to the above.

### Positive observations (verified) — this screen's runtime hygiene is good
- **Re-render discipline:** `useShallow` selector (`:135-150`) pulls only
  needed fields and **excludes `restTimerActive`/`restTimerRemaining`**, so
  the per-second `tickRestTimer` does not re-render the 2k-line tree. The
  comment (`:126-130`) documents the exact 300–600-renders/workout bug this
  fixes. Correct.
- **Drift-free elapsed timer:** derived from `workoutStartTime`
  (`:410-411`), re-synced on every tick and on app-foreground (`:417-419`),
  so backgrounding never desyncs the clock.
- **Clean teardown:** the timer effect clears the interval, removes the
  AppState sub (wrapped in try/catch for corrupt-subscription edge cases),
  and clears the flash timeout on unmount (`:421-431`); a separate unmount
  effect dismisses the persistent notification (`:502-506`).
- **Double-finish guard:** `finishingRef` (`:210`) gates `handleFinishWorkout`
  against rapid double-taps. Good (rapid-tap protection, a Phase 7 concern).
- **Set-save validation:** blocks empty/zero/NaN weight for non-bodyweight
  exercises with a clear prompt (`:726-731`).

### A2-044 — Notification elapsed-time can lag during rapid logging (minor).
Path 1 (immediate, `:456-476`) sets `lastNotifUpdateRef = now` on every
state change; Path 2 (throttled elapsed refresh, `:479-497`) early-returns
if `< 15s` since that ref. During frequent set logging Path 1 keeps
resetting the throttle, but Path 1 itself passes fresh `elapsedSeconds`,
so the lock-screen clock stays current. Only goes stale if there is no
state change for >15s — which Path 2 then covers. **Net: no real
staleness**; noted as analysed-and-cleared rather than a defect.

---

## `src/lib/weeklyCoach.js` — foundations (30–293) + main flow (293–492) read

> Scope: read the pure helpers in full (`computeEWMA`, `getLatestEwma`,
> `computeWeeklyTrendPct`, `assessDataConfidence`, `getRecoveryScore`,
> `getPerformanceScore`, `autoregulationMatrix`, `phaseConfig`,
> `stepsBand`, `WHY_LIBRARY`, `pickWhy`) and the first ~200 lines of the
> `runWeeklyCoach` orchestration. The remaining `runWeeklyCoach` body
> (`492–1033`: calorie adjust, FFM floor, ED-pattern detector, refeed/diet
> break, deload, steps/cardio levers, differential paywall) and the two
> `_build*Output` helpers are **not** fully read; claims scoped accordingly.

### This is the product's crown jewel and it is responsibly built (verified)
- **EWMA bodyweight trend** (`:30-40`, α=0.1) — the gold-standard smoothing
  used by MacroFactor/Carbon, not naive week-over-week.
- **Data-confidence gating** (`:89-115`): `< 3` weigh-ins → `data_hold`,
  the plan is **held** rather than adjusted on noise (`:372-391`). Honest.
- **Eating-disorder safeguards (notable):** `scoffPositive` gates deficit
  suggestions (`:328`), a rapid-loss detector (`computeWeeklyTrendPct`,
  `:57-65`), an **FFM safety floor** (`:329-337`,
  `ffm_floor_hold` copy), and an ED-pattern detector with a configurable
  firing threshold (`:338-347`). Few competitors do this.
- **Evidence-based gates:** the `< 50%` session-adherence "stabilise first"
  rule (`:476-480`, attributed to Andy Morgan), on-target tolerance band
  (`:434-436`).
- **Voice discipline:** `WHY_LIBRARY` (`:219-262`) is explicitly jargon-free
  (no MEV/MAV/RIR in user copy) with a documented "honesty test".
- **Unit handling here is CORRECT:** bodyweight is kg-canonical; `u`
  (`:446`) is a display label only. This **confirms A2-043 is scoped to
  *gym* weights** — the bodyweight path does units properly.
- **Heavily tested:** `weeklyCoach*.test.js` = **51 cases** (38 core + 8
  FFM-floor + 5 voice snapshot); `algorithms.test.js` 31; `planEngine*`
  70. Suite total **1,662** `it/test` cases. Supports the quality
  assessment with evidence, not assumption.

### A2-045 — `runWeeklyCoach` is a single ~740-line function with 40+ inputs (maintainability).
`:293-1033`. Pure and well-tested, but the size + branch density + 40-field
input object (`:294-362`) make it very hard to read or modify safely. The
many `Move #N` / `row N` comments show it grew by accretion. → Phase 11
maintainability candidate: extract the calorie / steps / deload / ED /
paywall levers into named sub-functions (each already conceptually
separable). Not a bug.

---

## `src/lib/planEngine.js` — `generatePlan` + progression builders read

> Scope: read `generatePlan`/`_generatePlanInner` (`1361-1549`),
> `getWeeklySetProgression` (`927-934`), `getWeekLabel` (`937-952`),
> `buildWeeklyPlan` (`963-981`), `buildMesocycleSchedule` (`987-1006`),
> `buildVolumeSummary` head (`1012-1036`). The many builder helpers
> (`selectSplit`, `computeLandmarks`, `applyGoalOverlay`,
> `build{FullBody,UpperLower,PPL,…}Workouts`, `trimToTimeBudget`,
> `assignSupersets`) are **not** each read; claims scoped accordingly.

### A2-046 — `generatePlan` emits TWO divergent week-by-week progression models + two label vocabularies.
A single plan object returns both:
- `mesocycleSchedule = buildMesocycleSchedule(experience)` (`:1482`) —
  **multiplier** model: `setsMultiplier` 1.00 → 1.25 across build weeks,
  **0.50** on the rest week (`:987-1006`), labels "Introduction week / Build
  week / Peak push / Rest week".
- `weeklyPlan = buildWeeklyPlan(validWorkouts, totalMesoWeeks, …)` (`:1532`)
  → `getWeeklySetProgression` (`:927-934`) — **additive** model: `base + round(step·2/(progressWeeks-1))`, **0.60** on deload, labels
  "Foundation / Building / Peak / Deload" (`getWeekLabel`, `:937-952`).

For a 5-week plan with a 3-set base exercise these disagree: multiplier
week-4 ≈ `3×1.25 ≈ 3.75→4`, additive week-4 = `3+2 = 5`; deload is `×0.5`
vs `×0.6`.

**RESOLVED by tracing consumption — both are DEAD OUTPUT.** `generatePlan`
is called only at `planAutoGen.js:127`, and `planAutoGen` consumes **only**
`plan.whyThis / name / description / splitType / workouts`
(`planAutoGen.js:138-153`). **Neither `plan.mesocycleSchedule` nor
`plan.weeklyPlan` is read anywhere in non-test `src/`** (grep). The
mesocycle weeks the user actually sees are built separately in the DB
layer (`database.js:2455` `INSERT … mesocycle_weeks`). So the divergence
never reaches the user — but it means an entire progression subsystem
(`buildWeeklyPlan`, `getWeeklySetProgression`, `getWeekLabel`,
`buildMesocycleSchedule`) is **computed on every plan generation and
discarded**. → Reclassify: **dead code + wasted computation + drift risk**,
not a user-facing contradiction. Low–medium (remove or wire up; pick one
model). Good example of why consumption-tracing matters — the first-pass
"user sees contradictory counts" hypothesis was wrong.

### Observations
- **Stateless guard (good):** `generatePlan` swaps the module-level
  `_effectivePool` and restores it in `finally` (`:1366-1372`) so a
  library-driven run doesn't leak state. `_generatePlanInner` is
  synchronous, so the swap/restore is atomic in the event loop — **but it
  is fragile**: adding any `await` inside would make concurrent
  `generatePlan` calls clobber `_effectivePool`. Note for Phase 6.
- **Beginner guard rails:** days capped at 4 for beginners (`:1396`);
  weak points capped at 3 for determinism (`:1392`). Sensible.
- Plan finalisation pipeline (dedupe → time-trim → supersets → strip
  internal tags → estimate duration, `:1454-1469`) is clean and discards
  empty sessions (`:1472`).

### Positive observations (verified)
- `getWeeklySetProgression` always forces the **last** week to a deload
  (`:928-929`) and floors at 1 set — no zero-set weeks.
- Internal-only tags (`_m`, `_req`, `_muscle`) are stripped before the
  plan leaves the engine (`:1463`) so they never reach the DB/UI.

---

## Components — batch 1 (read in full): VolumeBars, PressableCard, Card, Chip, ProGate, RestTimer

Overall the shared component layer is **high quality and consistent** —
token-based, reduce-motion-aware, and good about accessibility
labels/roles. Specific items:

### A2-047 — Incomplete `withAlpha` migration: lingering `token + 'NN'` hex-concat.
`ProGate.js:199` `colors.primary + '40'` and `RestTimer.js:296`
`colors.primary + '50'` still use the fragile hex-string concat that
`theme.js withAlpha` (`theme.js:79-82`) was created to replace. It passes
the lint guard (not a hex *literal*) but breaks if `colors.primary` ever
becomes an `rgba()` token (e.g. a future palette). → mechanical cleanup to
`withAlpha(colors.primary, 0.25/0.31)`. Low. (A broader grep for
`colors.\w+ + '` should find the rest in Phase 11.)

### A2-048 — `RestTimer` runs a dead progress-bar animation every rest (wasted JS-thread work).
`RestTimer` sets up and drives `progressAnim` (`:45, :51-105`) via
`Animated.timing(..., useNativeDriver: false)` — i.e. on the **JS thread**
— and computes `barWidth = progressAnim.interpolate(...)` (`:170-173`),
**but no `View` in the render consumes `barWidth`** (the JSX `:184-233` has
only the timer row + adjust row; the progress bar was removed). So a
JS-thread timing animation re-binds every second of every rest
(`:87-105`) to drive nothing. → remove `progressAnim`/`barWidth` or
re-add the bar. Confirms the Phase-7 lint flag `RestTimer.js:170 barWidth`.
Low–medium (battery/CPU during workouts).

### A2-049 — `RestTimer` dead var `currentExerciseName` (`:42-43`).
Computed for the lock-screen notification that was **disabled** (`:70-75`
comment), so it is now unused. Confirms the Phase-7 lint flag
`RestTimer.js:42`. Trivial.

### A2-050 — `RestTimer` two real `exhaustive-deps` gaps (`:82`, `:142`).
`:51-82` effect deps are `[restTimerActive]` but it reads
`restTimerRemaining/Duration/reduceMotion/tickRestTimer`; `:121-142`
effect deps are `[restTimerRemaining]` but it reads `restTimerActive`.
The design compensates (the `:87-105` effect re-binds the animation each
tick), so no observed bug, but these are the Phase-7 `react-hooks/
exhaustive-deps` warnings on a runtime-critical component. Low; worth a
deliberate `eslint-disable` with reason or a deps fix.

### Verified strengths
- **`RestTimer` cleanup is correct:** all queued timeouts tracked in
  `timeoutsRef` and drained on unmount (`:49, :140, :148-152`), interval
  cleared (`:81, :151`) — fixes the "3 leaked setTimeouts/cycle" the
  comment (`:47-48`) describes. `useShallow` selector (`:30`) avoids
  per-mutation re-renders. `accessibilityLiveRegion="polite"` announces
  ticks to screen readers (`:193`); skip button is labelled (`:209`).
- **`ProGate`/`withProGuard`** (`:138-144`) enforce Pro at the route level
  (defends deep-link / stale-nav entry), subscribe to `tier` only.
- **`Card`** consolidates ~83 inline card blocks into one token-based
  surface with `withAlpha` accent borders (`:44-54`); delegates to
  `PressableCard` when tappable so press feel is uniform.
- **`VolumeBars`** has good `accessibilityLabel` per muscle row (`:23`).
  (It is the confirmed A2-038 consumer — `:14,27,35` use
  `getVolumeStatus().color`, the non-adaptive palette.)

---

## Components — batch 2 (read in full): Button, EmptyState, Toast, BottomSheet, PlateCalculator, Stepper, SearchBar, ScreenHeader

All clean and token-based. Two substantive items, rest are strengths.

### A2-043 — CONFIRMED again by `PlateCalculator.js` (kg-modelled end to end).
`:19` `calculatePlates(weightNum, barNum)` with no plate-set arg → kg
denominations. `:28-36` hardcodes **IPF *kilogram* competition plate
colours** (red 25, blue 20, yellow 15, green 10, white 5) — a kg physical
standard — then renders them with the user's `units` label (`:79-80,
:120`). So a lbs user sees kg plate denominations + kg IPF colours
relabelled "lbs". Strengthens A2-043's plate leg with a concrete consumer.

### A2-051 — `EmptyState` reinvents button styles instead of using `Button` (minor consistency).
`EmptyState.js:114-128` defines its own `primaryBtn`/`secondaryBtn`
`TouchableOpacity` styles rather than composing the shared `Button`
primitive — the exact "14+ hand-rolled CTA" drift `Button` was created to
end. Low; fold into `Button` for one press/disabled model.

### Verified strengths
- **`Button`** (single CTA primitive, 4 variants × 3 sizes, one disabled +
  loading treatment, composes `PressableCard`) — good consolidation.
- **`Toast`** — FIFO single-visible queue, reduce-motion, `accessibilityRole
  ="alert"` + live region (`:162-163`), an **undo pattern** with `onTimeout`
  commit for destructive actions (`:75-78, :131-133, :173-189`), proper
  timer cleanup. Replaces 30–40 `Alert.alert` calls.
- **`BottomSheet`** — one sheet chrome (scrim/handle/slide), reduce-motion,
  `accessibilityViewIsModal` (`:103`), hardware-back + tap-out dismiss,
  stays mounted through exit anim. Replaces 6 hand-rolled sheets.
- **`Stepper`** — 44×44 touch targets (`:65-66`, meets the 44pt min) with
  decrease/increase a11y labels — a Phase 9 a11y positive.
- **`SearchBar`** — `fontSize: Math.max(16, …)` (`:73`) to stop iOS
  focus-zoom; labelled clear button.
- **`EmptyState`** — explicit "no shame copy / directional" philosophy
  (`:6-9`), ghost/dismissible variant.

---

## Components — batch 3 (read in full): SetEntry, PRCelebration, PeekMenu, BackHeader, Skeleton, BodyDiagramHeatmap

### A2-043 — `SetEntry` weight +/- step is hardcoded 2.5 (kg-centric).
`SetEntry.js:25` `const steps = { weight: 2.5, reps: 1 }` — the in-set
weight stepper always moves 2.5 regardless of `units`. For a lbs user
that is a too-small jump (should be 5). Adds another kg-centric site to
the A2-043 cluster (now: progression, plates, bar default, **set stepper**).

### A2-038 — `BodyDiagramHeatmap` legend uses adaptive tokens, regions use caller colour → mismatch in a11y palettes.
The muscle-region fill comes from `getFill` → `entry.color` (caller-
supplied, `:28-32`), but the **legend** swatches are hardcoded to the
**theme tokens** `colors.textMuted/success/warning/error` (`:264-268`,
which DO adapt to colourBlindSafe/higherContrast). If the caller builds
`volumeByMuscle` from `algorithms.getVolumeStatus().color` (the non-
adaptive hex — A2-038), then in colour-blind / high-contrast mode the
**legend and the body regions show different colours for the same
status**. Most user-visible consequence of A2-038 so far. → Phase 9:
unify both on `theme.volumeColors`.

### Verified strengths
- **`SetEntry`** carefully preserves in-progress decimal entry
  (`:80-84`), renders a legit `0` (`:72`), caps reps 1–200 / weight ≤500,
  gates the live e1RM chip to reps 1–15 (`:148`, sidesteps A2-040's high-
  rep inflation in the UI), 52×52 steppers, full a11y labels.
- **`PRCelebration`** pools particles via `useRef` and bakes fixed
  translate offsets to fix two documented memory leaks (`:37-40,
  :142-144`); subdued mode skips particles for reduce-motion/calm; timers
  cleaned up + animations stopped on unmount (`:87-90`); null-guarded
  (`:98`); "+X%" only ≥1% to avoid e1RM float noise (`:170-181`).
- **`BodyDiagramHeatmap`** has excellent a11y — every region is a labelled
  button with muscle name + status (`:37-61`) (the "label muscle-map for
  screen readers" work). SVG primitives, scales to width.
- **`PeekMenu`** (imperative `forwardRef` context menu),
  **`BackHeader`** (guarded `useNavigation`, replaces ~16 drifted
  headers), **`Skeleton`** (reduce-motion-paused shimmer,
  `accessibilityRole="progressbar"`) — all clean, token-based, a11y-labelled.
- Minor: `PeekMenu:56` `useImperativeHandle([])` closes over first-render
  `reduceMotion` (Phase-7 exhaustive-deps flag); negligible.

---

## Components — batch 4 (read in full): ExerciseCard, FeedbackSheet, SvgLineChart, TierComparisonStrip, DifferentialBadge

### A2-052 — `ExerciseCard` dead var `sfr` (`:13`).
`const sfr = exercise.stimulusToFatigueRatio || … || 3` computed but never
rendered. Confirms the Phase-7 lint flag `ExerciseCard.js:13`. Trivial.

### A2-047 (more sites) — `SvgLineChart` hex-concat.
`:39` `${theme.textMuted}66`, `:97-98` `${color}30`/`${color}05` — same
fragile concat as A2-047. Add to the `withAlpha` cleanup list. Trivial.

### A2-053 / A2-054 — trivial doc/contract mismatches.
- `TierComparisonStrip.js:20` inline comment says "Left column = Complete"
  but the header comment (`:5`) and render order (`:76-78`, Pro then
  Complete) put **Pro left, Complete right**. Stale comment.
- `DifferentialBadge.js:29` calls `onTapCta('shown')` but the prop is
  documented as `(action: 'pay'|'dismiss')` (`:22`) — `'shown'` is an
  undocumented third value. Harmless; fix the JSDoc.

### Verified strengths
- **`FeedbackSheet`** — shake-to-report (sustained-shake accelerometer
  detection, web bypass, 30 s suppression, accelerometer sub cleaned up
  `:112`), sentiment chips with `accessibilityState`, 12 s auto-dismiss,
  and a **clear privacy disclosure**: "Sent with build info, your last few
  actions, and a recent error… Body measurements and names are stripped
  before sending" (`:335-337`). → Phase 5 privacy positive (disclosed data
  minimisation).
- **`SvgLineChart`** — single SVG chart engine (replaced gifted-charts +
  victory), geometry unit-tested in `chartGeometry`, per-instance gradient
  id to avoid collisions (`:59`), `<2` points → null, dual-series support.
- **`TierComparisonStrip`** pulls prices from `catalogue.skuFor` so the
  shown price always matches the purchased SKU. **`DifferentialBadge`** is
  clean presentation + impression telemetry. **`ExerciseCard`** clean,
  a11y-labelled.

> **Components still unread (carried to next batch):** AnimatedEntrance,
> BlockProgressCard, BrandMark, EngineLog, FatigueTrendCard, GradientCard,
> Illustrations, InfoTooltip, ReadinessCards, Sparkline, StepsCard,
> SvgBarSparkline, WhatsNewSheet, + the 11 `components/food/*`.

---

## Components — batches 5 & 6 (read in full) + COMPONENT LAYER COMPLETE

Final components read: AnimatedEntrance, InfoTooltip, ReadinessCards,
FatigueTrendCard, BlockProgressCard, WhatsNewSheet, GradientCard,
EngineLog, BrandMark, Sparkline, SvgBarSparkline, Illustrations, and all
`components/food/*` (MacroRings, QuickAddSheet, EntryRow, HeldDecisionCard,
FoodDetailSheet, ServingPicker, FoodRow, SourceChip, MealSection,
EmptyDiary, MacroBreakdownSheet). **All 49 components are now read.**

### Standout positive — ED-conscious design (notable competitive differentiator)
- **`MacroRings`** uses a deliberately **adherence-neutral** ring colour
  (all amber, no red/green over/under judgement) with an explicit comment
  (`MacroRings.js:11-17`) that colour-coded targets drive the harm pattern
  for the at-risk subgroup. Numbers stay factual (value/target).
- **`HeldDecisionCard`** surfaces a **"Get support" → Beat** (UK eating-
  disorder charity) link for the `ed_pattern` override, and `openSupport`
  **never dead-ends** — falls back to an Alert with the URL if the link
  fails (`HeldDecisionCard.js:19-24`).
- Pairs with the engine-side ED safeguards (weeklyCoach `scoffPositive`,
  FFM floor, rapid-loss). **Very few competitors do any of this** → carry
  to Phase 8/10/11 as a differentiator.

### Other verified strengths
- **A11y is consistently strong** across the component layer: spoken
  summaries for decorative visualisations (`MacroRings` a11ySummary,
  `BodyDiagramHeatmap` per-region labels), `accessibilityLiveRegion` on
  changing values (`FoodDetailSheet`, `Toast`, `RestTimer`), labelled
  controls, 44–56px touch targets on rows/steppers.
- **`BrandMark`** uses `expo-image` with an RN `Image` fallback (disk
  cache + graceful degrade).
- **`Illustrations`** ships custom token-based SVG empty states (polish
  most apps skip).
- `Sparkline`/`SvgBarSparkline`/`SvgLineChart` share one geometry lib
  (`chartGeometry`, unit-tested) — one chart aesthetic.

### Minor items found in these batches
- More **A2-047** hex-concat sites: `ReadinessCards` (`+'99'/'44'/'12'/
  '40'`), `SvgLineChart` (already noted). Mechanical `withAlpha` cleanup.
- `BrandMark` `VolyumeMark/Icon` accept `color`/`accent` props that are
  unused (`:33,53,72,81`) — dead params, trivial.
- Observation (not a defect): food logging supports **oz** units
  (`ServingPicker` g/oz) while **gym weight has no working lbs path**
  (A2-043) — underscores that the unit gap is specifically gym weight.

### COMPONENT-LAYER VERDICT
The shared component layer is **best-in-class for consistency and
accessibility**. Card/Button/Chip/Toast/BottomSheet/SearchBar/Stepper/
BackHeader each consolidated 6–40 hand-rolled copies into one token-based,
reduce-motion-aware, a11y-labelled primitive. No correctness defects of
note; the only actionable item is **A2-048** (dead RestTimer animation).
Everything else is trivial cleanup (A2-047/051/052/053/054) or a
cross-cutting issue already tracked (A2-038 colours, A2-043 units).

---

## Sync infrastructure — `registry.js`, `transport.js`, `conflict.js`, `queue.js`, `watermark.js`, `telemetry.js` (all read in full)

**Verdict: a strong, well-documented subsystem.** No defects found.

### A2-029 refined — the "two sync layers" split is by domain, and the registry path is complete for its 16 tables.
`transport.js:75-89` `MIGRATED_TABLES` is a **frozen** list of all 16
registry tables (food domain, weekly check-ins, body comp, weight log,
nutrition targets, profiles, ed_pattern_flags, tier_history, daily_steps,
notification_preferences, recipe_ingredients). These flow through the
registry-driven per-table handlers. The **legacy** `bulkUploadLocalData`/
`pullFromCloud` still own the **training** tables (workouts, workout_sets,
routines, mesocycles, exercises, etc.) which are **not** in the registry.
So the two layers are split by domain, not racing for the same tables —
less concerning than "two layers" first implied. Both run inside one
`syncAll` cycle.

### Verified strengths
- **`registry.js`** — declarative per-table `conflictStrategy`/`direction`/
  `softDelete`/`pk`. Sensible strategy choices: `server_wins`+`pull_only`
  for derived/safety tables (`ed_pattern_flags`, `tier_history`,
  `daily_intake_rollups`), `merge` for `profiles`, `last_write_wins`
  elsewhere. A documented bug-fix: `nutrition_targets` was wrongly
  `pull_only`/`serverAuthoritative` vs. shipping code, now corrected
  (`:138-155`).
- **`conflict.js`** — three strategies; the `merge` path does per-column
  resolution via a `column_updates_at` jsonb map, skipping `id`/`user_id`
  (`:86-102`), with a `last_write_wins` fallback when the server lacks the
  map. Exactly the "phone A and phone B edited different fields" clobber
  fix. `compareUpdatedAt` tolerant of number/ISO timestamps.
- **`queue.js`** — offline mutation queue with **compaction** (delete
  supersedes; update/insert collapse to one pending row, `:67-89`),
  exponential backoff `[2s…300s]` (`:20-26`), `listPending` respects the
  backoff window, all parameterised, `LIMIT` guard against runaway. Lives
  in SQLite only, never synced.
- **`watermark.js`** — incremental delta-pull cursors in AsyncStorage,
  **self-healing** (sign-out clears → next sign-in full-pulls), never
  moves backward, boundary row re-pulled via `.gte` (idempotent INSERT OR
  REPLACE) so no row is skipped on equal timestamps.
- **`transport.js`** — clean per-table dispatch; lazy `require('../supabase')`
  so importing transport doesn't drag the url-polyfill/supabase stack into
  runner unit tests; pull-only tables refused at `pushTable` before the
  handler map.
- **`telemetry.js`** — structured `sync_run`/`sync_conflict_resolved`
  events with safe coercion; failures logged, never thrown.

> Confirms A2-031's scope: the per-table transport handlers DO return
> `{count}` merged into `pull/push_count_per_table`; only the **legacy**
> training-table bulk counts are absent from `sync_run` telemetry.

---

## Sync table handlers — all 11 `sync/tables/*` read in full → SYNC LAYER COMPLETE

All 11 handlers read: `profiles`, `foodDomain`, `weightLog`,
`edPatternFlags`, `bodyComposition`, `dailySteps`, `notificationPreferences`,
`nutritionTargets`, `recipeIngredients`, `tierHistory`, `weeklyCheckins`.
**Uniform, high-quality pattern; no correctness defects.**

### A2-055 — Pull handlers do a per-row `updated_at` lookup (N+1) — minor perf.
The LWW gate in each bidirectional pull (`bodyComposition:134`,
`dailySteps:107`, `recipeIngredients:117`, `weeklyCheckins:122`) issues a
separate `getXUpdatedAt(userId, id)` SQLite query **per cloud row** to
decide whether to apply it. For N pulled rows that's N extra reads. Row
counts are bounded (365-day windows, weekly check-ins) so impact is modest,
but a single batched "select id, updated_at where id in (…)" would remove
the N+1. → Phase 6, low.

### Verified strengths
- **LWW gate on every pull** skips cloud rows the local copy already wrote
  past (`local >= cloud`), preventing both clobbering of unsynced local
  edits and the documented "pulled row echoes back as a fresh local write"
  churn loop (notificationPreferences F4, recipeIngredients).
- **`profiles`** per-column merge with a no-op-write guard (`_profilesEqual`,
  `:182-192`) that fixed a prod merge-churn loop; **`tier` is excluded from
  the push payload** (`:16-19`) — server owns tier (security-correct).
- **`foodDomain`** coordinator: one bulk RPC per non-empty table for
  **fault isolation** (one table's failure no longer rolls back the other
  six), promise-cached so it runs once per `syncAll`, watermark advanced
  only on full success. Snake_case mappers (with a documented camelCase
  regression that the regression-matrix test caught).
- **`weightLog`** is an intentional documented no-op (aliased to
  `body_composition_log`) to avoid double-push.
- Pull-only server-authoritative tables (`edPatternFlags`, `tierHistory`)
  use INSERT-OR-REPLACE (server canonical) — correct for the ED-flag and
  tier-audit safety data.
- Batched upserts (200 rows) with `onConflict` throughout; idempotent.

### SYNC LAYER VERDICT
The entire sync layer (legacy `sync.js` orchestration + modular
`sync/` registry/transport/conflict/queue/watermark/telemetry + 11 table
handlers) is **a mature, well-tested, well-documented subsystem**. The
only items are perf/observability (A2-001 redundant foreground calls,
A2-031 legacy counts absent from telemetry, A2-055 N+1 pull lookups) and
the by-design legacy/registry split (A2-029) — **no data-integrity
defects**. This subsystem reflects real production debugging.

---

## Payments + Telemetry + Sentry scrub (read in full) — major Phase 5 positives

Read: `payments/{playBilling,cascade,catalogue,restore,index}`,
`telemetry/{events,transport,sentryBridge,index}`,
`observability/sentryScrub`. **All clean; collectively a strong security
posture.**

### Security strength 1 — payments are SERVER-AUTHORITATIVE (no client tier forgery).
- `playBilling.js`: receipt validation is **server-side** (Supabase Edge
  Function calls Google Play Developer API `verifyPurchase`), and the
  **RTDN Pub/Sub webhook is the source of truth** for renewal/cancel/
  refund (`:34-39, :307-315`). The client purchase only gives immediate
  feedback. A stub provider throws "provider not injected" rather than
  faking entitlements (`:233-235`).
- `cascade.js`: every tier transition goes through server RPCs
  (`start_cascade`, `upgrade_tier`); the client never writes tier directly
  (consistent with the `migrate_005` trigger that rolls back client tier
  UPDATEs, and `profiles` sync excluding `tier`). No exceptions cross the
  module boundary (`{ok:false}` returns).
- → **Phase 5: a user cannot forge Pro by editing local state** — tier is
  server-owned end to end. Carry as a verified strength.

### Security strength 2 — comprehensive PII / health-data scrubbing before Sentry.
`observability/sentryScrub.js` (locked to PRIVACY_CONSENT_LOCKED.md):
- Redacts sensitive **keys** (weight/body-fat/macros/measurements + PII:
  email, names, DOB, phone, address + `ed_pattern`/`signals_json`) via a
  frozen regex list (`:37-99`).
- Redacts strings embedding sensitive **table names** (`weight_log`,
  `food_entries`, `ed_pattern_flags`, `health_data_consent`, …) and
  **photo paths / base64 images** (`:108-123, :169-179`).
- `scrubEvent` strips `event.user` to **`id` only** (drops email/username/
  ip), scrubs extra/contexts/tags/request.data/message/exception/
  breadcrumbs (`:187-218`); depth-bounded (6) against circular refs.
- A CI test asserts the scrub list still matches the schema (quarterly
  audit). → **Phase 5: Article-9 health data is scrubbed end to end**
  before any crash/telemetry leaves the device. Combined with SecureStore
  auth + parameterised SQL (A2-034), the privacy posture is strong.

### Security strength 3 — telemetry allow-list (client + server) with non-sensitive payloads.
`telemetry/events.js` is the canonical event catalogue; `transport.js`
enforces `ALLOWED_EVENTS` client-side (hard-fail in dev on typo) and the
server RPC `record_engine_telemetry` enforces the same list. Events persist
to local SQLite first (offline-survivable) then debounce-push. Payloads are
**counts/enums/SKUs**, not health values; `sentryBridge` mirrors events as
breadcrumbs which the scrubber then cleans. Good data-minimisation.

### Minor
- `restore.js:40,50` still branches on a `'complete'` entitlement that the
  2-tier `catalogue` no longer defines — dead/defensive legacy. Trivial.

---

## Notifications layer — all 13 files read → NOTIFICATIONS LAYER COMPLETE

Read: scheduler, quietHours, pushToken, preferences, handler, listeners,
activeWorkout, trainingReminders, index, categories, channels, permissions,
telemetry. Well-architected; a few real findings + strong ED-safety.

### A2-056 — Remote push is currently disabled (no EAS `projectId`).
`pushToken.js:71-81`: `getExpoPushToken` no-ops (logs once) when
`extra.eas.projectId` is absent from `app.json` — which it is. The **only**
remote-push use case — the **subscription-payment-failure** push (Play
Billing RTDN → send-push Edge Function) — therefore silently does nothing;
`registerPushToken` returns false. A user whose card fails won't be pushed.
Documented founder-action. → Phase 4 feature gap (not a code bug).

### A2-057 — Two conflicting `setNotificationHandler`; App.js's is effectively dead.
`App.js:95-107` sets a foreground handler that plays sound for the
`rest-done` channel. `handler.js:17-40` (via `RootNavigator:441`) sets a
different smart-suppression handler whose default returns
`shouldPlaySound:false` with no `rest-done` case. `setNotificationHandler`
*replaces*; RootNavigator's effect runs after App.js module scope → **handler.js
wins**, App.js's rest-done sound logic never applies (in-app beep handled by
`RestTimer.playRestBeep`, so audible behaviour may be unaffected, but App.js
`:95-107` is dead). → unify. Low–medium.

### A2-059 — Lock-screen workout notification + native foreground-service rest timer BOTH disabled.
- `activeWorkout.js:126-127`: `showActiveWorkoutNotification` **returns
  immediately** (rest is `no-unreachable`) — persistent lock-screen workout
  status is **off** (confusing "Set 3 of 2"). Yet `ActiveWorkoutScreen:460,485`
  still call it on every state change / 15 s → those effects (and A2-044)
  **fire into a no-op**.
- `activeWorkout.js:47` `USE_FOREGROUND_SERVICE = false`: the
  `rest-timer-live` foreground service is disabled — on Android 14
  `FOREGROUND_SERVICE_TYPE_HEALTH` throws `SecurityException` without an
  `ACTIVITY_RECOGNITION`/`BODY_SENSORS` manifest permission ("Volyume keeps
  stopping" on workout start). Rest timer does not survive force-close.
→ Phase 4/6: dead effects in the hottest screen + a real platform limit.
Documented. Medium (inert promised-looking feature).

### A2-058 — `trainingReminders.js:133-135` dead ternary (both branches identical). Trivial.

### Verified strengths
- **ED-safety:** `categories.js:36-41` routes `ED_PATTERN_LOCKOUT` +
  `FFM_FLOOR_HOLD` to **IN_APP only** — "push for those is the harm
  pattern". Never lock-screen-pushes ED/FFM events.
- **Smart foreground suppression** (`handler.js`): no "log weight" if
  already logged today, etc. Anti-annoyance done right.
- **Quiet hours** (22:00–07:00, midnight-wrap-correct) on every schedule;
  cancel-before-reschedule = idempotent.
- Push token device-bound, sync-excluded, cleared on sign-out; atomic
  conditional LWW upsert in `applyPreferenceFromPull`. Telemetry never
  throws / won't misattribute.

---

## Food layer — sources/validation/db read (sanityChecks, writeback, ocrParser, liveOff, usdaToFood, localCache, db.js)

**All clean, parameterized; strong defensive + privacy design. No defects.**

### Verified strengths
- **`food/db.js`** (1,112 lines, 54 queries): **zero `${}` interpolation —
  fully parameterised, no SQLi** (grep-verified). Macros denormalised at log
  time so editing a food never rewrites diary history (`logFoodEntry:27-28`).
  `recomputeRollup` keeps `daily_intake_rollups` current; the 7-day
  `getRecentIntakeSummary` (`:294-312`) feeds the FFM-floor safety gate
  correctly (distinct logged days, avg kcal). Cloud-apply functions present
  for every food table.
- **`sanityChecks.js`** gates custom-food insert: kcal ≤900/100g, macro mass
  ≤110 g/100g, kcal-vs-macros within 20% (`4P+4C+9F`) — prevents OCR
  misreads / typos from contaminating the coach's intake average + FFM
  floor. Good defensive layer feeding a safety calculation.
- **`writeback.js`** (OFF contribution): **consent-gated, default OFF**, sends
  only the label photo + confirmed macros, **anonymous** (no Volyume
  creds), retry+backoff, drops silently after 3 tries. Privacy-conscious.
- **`liveOff.js`/`usda.js`**: AbortController timeouts, OFF-compliant
  User-Agent, `encodeURIComponent` on inputs, rows missing core macros
  dropped so the waterfall falls through. (Completes the earlier partial
  `liveOff` read.)
- **`localCache.js`**: parameterised LIKE search, customs rank before
  globals, `resolveFoodRef` handles curated/global/custom/recipe with a
  **recursion guard** so a recipe ingredient that references a recipe can't
  self-recurse (`:164`).
- **`ocrParser.js`**: deterministic regex label parser with confidence
  levels + kJ→kcal fallback; documents a real debugging lesson (dropped the
  I/l→1 substitution because it ate the kcal space).

### A2-036 (more) — a THIRD `uid()` Math.random copy at `food/db.js:16-21`.
Now three identical generators (database.js, useAppStore, food/db). Fold to
one shared `expo-crypto randomUUID` helper. Low.

### Remaining food files (seed, libraryDelta, mealSuggest, ocr, csvExport, bulkEntryOps, frequents, searchTabs, curatedFoods, curatedMeals) — read → FOOD LAYER COMPLETE

All clean. Highlights:
- **`seed.js`** (bundled OFF/CoFID snapshot importers): a transaction
  **mutex** (`_withTxLock`, `:52-57`) serialises the two importers firing
  concurrently from bootstrap so expo-sqlite doesn't reject nested
  transactions; chunked `INSERT OR IGNORE` (200/chunk), idempotent via
  version flag, graceful at every boundary, parameterised. Strong.
- **`libraryDelta.js`**: throttled (6 h) paginated cloud→local foods delta
  (cap 25k/foreground), cursor advances only on success, parameterised
  upsert preserving local id.
- **`mealSuggest.js`**: pure, deterministic **rule-based** (no LLM)
  protein-first meal ranking (`fitScore` rewards filling remaining protein,
  penalises kcal overshoot) — fully unit-testable.
- **`ocr.js`**: **on-device MLKit**, no API key, no network, reads file URI
  directly (no base64 round-trip), graceful manual-entry fallback — good
  privacy (label OCR never leaves the device).
- **`bulkEntryOps.js`** routes bulk diary ops through the per-entry
  primitives so rollups/sync/telemetry stay consistent; `entryToPatch`
  sends the whole row to avoid nulling macros.
- **`searchTabs.js`**: the "Database" tab was removed for a persistent
  search bar "matching MyFitnessPal/MacroFactor/Cronometer" — good
  competitive UX alignment (Phase 8 input).
- **`curatedFoods.js`/`curatedMeals.js`**: research-grounded (ISSN/Morton
  2018/Helms 2014), macros **computed** from a staple table not hand-typed,
  `Object.freeze`d. Internally consistent.

### A2-060 — `csvExport.js` doesn't neutralise CSV formula-injection prefixes. Trivial.
`csvEscape` (`:18-25`) handles comma/quote/newline but not a leading
`=`/`+`/`-`/`@` (Excel/Sheets formula injection if a food name starts with
one). Very low risk (user exports their **own** diary), but a one-line
prefix-guard is the standard hardening. → Phase 5 note, trivial.

### FOOD LAYER VERDICT
All 32 food files (lib + components) read. **A well-engineered, privacy-
conscious, ED-aware subsystem** — parameterised throughout (no SQLi),
on-device OCR, consent-gated OFF contribution, defensive sanity-checks
feeding the safety calc, adherence-neutral UI. No correctness defects;
only A2-037 (client-bundled USDA key), A2-036 (3rd uid), A2-060 (CSV) —
all low/trivial.

---

## lib core — batch 1: units, errorLog, syncQueue, proGate, accessibilityPrefs, dataBackup

### A2-043 reinforced — the conversion infra EXISTS (units.js) but gym weight never uses it.
`units.js` provides `kgToLbs`/`lbsToKg`/`stoneLbsToKg`/`parseBodyWeightToKg`/
`formatBodyWeight` and states "**All internal storage is kg**" (`:7`) — and
**bodyweight** genuinely is kg-canonical via these helpers. But **gym
weight bypasses all of it** (A2-043: stored raw in display unit,
`ActiveWorkoutScreen:748`). So `units.js:7`'s blanket comment is inaccurate
for gym weight, and the **A2-043 fix is low-risk**: route gym-weight I/O
through the existing `lbsToKg`/`kgToLbs` (+ unit-aware increments/plates).

### A2-061 — Two parallel offline-sync queue systems.
`syncQueue.js` (`pending_sync_ops`; workout/body_metric/morning_weight/
check_in) and `sync/queue.js` (`sync_queue`; the 16 registry tables) are
**two distinct queue implementations** with their own backoff schedules.
Mirrors the legacy/registry split (A2-029) — not a bug (different domains)
but duplicated machinery. Maintainability. Low.

### A2-036 (4th copy) — `syncQueue.js:28-33` another `uid()` (now 4 copies).
### A2-062 — `dataBackup.js:4-7` stale comment "There is no cloud sync" (there is). Trivial.

### Verified strengths
- **`errorLog.js`** = a **second PII-redaction layer**: `redactPII` over a
  comprehensive `PII_KEYS` set (auth secrets, body data, names, notes)
  applied **before** the user-exportable ring buffer **and** before
  forwarding to Sentry (`:172-221`); `sanitizeStack` strips source-frame
  excerpts so user values don't leak into an exportable log. Global
  uncaught-exception + unhandled-rejection handlers (`:273-307`).
- **`proGate.js` — safety is tier-blind (ethical positive):** explicit
  contract (`:21-23`) that the FFM floor / ED-pattern lockout / rapid-loss
  guardrails "MUST NOT consult tier". **Free users still get the
  eating-disorder safeguards** — safety is never paywalled.
- **`syncQueue.js`** resilient: `safeCall` guard so one rogue op-type can't
  strand the drain; `_runOp` re-reads SQLite for freshest state; gives up
  after 6 retries keeping `last_error`. Parameterised.
- **`dataBackup.js`** full local export/import with format+version
  validation (rejects unversioned/newer); auth tokens excluded (SecureStore).

---

## lib core — batch 2: edPatternDetector, recoveryEMA, insightsEngine (full) + nutritionEngine (head)

**All clean, pure, evidence-cited. No defects.** This batch makes the
harm-prevention system fully visible and it is a genuine differentiator.

### Verified strengths — the ED/RED-S safety architecture (lead-with-it for Phase 8/11)
- **`edPatternDetector.js`**: pure 4-signal detector (rapid loss
  ≤−1.5%/wk, sustained low energy ≤2 for ≥2 wk, under-adherence ≥2/3 wk,
  weight-only check-ins ≥2/3 wk); fires on **≥2** signals (≥3 if
  `goalLockAdvanced`); `hasEdPatternCleared` walks back 2 clean weeks to
  clear. Thresholds exported for tests.
- **`nutritionEngine.js`** (head read): **FFM energy floor = 30 kcal/kg
  FFM** (IOC RED-S consensus, Mountjoy 2014/2023) — a **hard floor** that
  refuses deficit suggestions below it; `MAX_SAFE_LOSS_RATE 0.8%/wk`,
  `HARD_GATE 1.5%/wk`; conservative sex-aware FFM fallback that errs
  **safer**. Activity multipliers tuned down for gym-only populations with
  cited rationale (Pontzer 2016). Three protein approaches in g/kg LBM/BW.
  Genuinely sophisticated, evidence-based.
- Together with `weeklyCoach` (`scoffPositive`, rapid-loss compression),
  `proGate` (safety is **tier-blind** — free users protected),
  `categories.js` (ED/FFM never push-notified), `HeldDecisionCard` (Beat
  link), and `MacroRings` (adherence-neutral colours), this is a
  **coherent, deliberate harm-prevention system across engine + UI +
  notifications + monetisation**. Very few competitors have any of it.
- **`recoveryEMA.js`**: half-life-decayed EWMA (7-day) for soreness/
  fatigue/joint; pure, clean.
- **`insightsEngine.js`**: deterministic 6-rule "For You" engine
  (under-MEV / stalled / peaked / recovery-warn / deload-due / gentle-
  rhythm); requires a **3-week base** before firing volume nudges (no
  new-user noise); jargon-free, psychologically supportive copy ("Not a
  setback, just part of the plan").

> `nutritionEngine.js` body (TDEE/macro/FFM-floor computation, `:120-860`)
> and `coachingGoals.js` still to read — next batch.

---

## lib core — batch 3: nutritionEngine (1–440), sentry, differentialPaywall

### A2-063 — Differential paywall uses safety-adjacent distress signals as conversion triggers (Phase-10 ethics review).
`differentialPaywall.js` fires a "Try Pro free" badge prioritising
**`extreme_soreness` and `energy_crash` first** (`TRIGGER_CONTEXTS:56-63`)
— the free user's *distress* signals are the top conversion levers. The
actual safety guardrails remain free (tier-blind), and the copy is honest,
but surfacing a paywall on "your soreness/energy is crashing" could read as
**monetising distress** to a vulnerable user. → **Phase 10 + founder
review** — a values call, not a code bug. Recommend de-prioritising the
safety-adjacent contexts or softening their copy.

### Verified strengths
- **`nutritionEngine.js` (core read):** the **FFM floor is wired into
  adaptive TDEE** (`computeAdaptiveTDEEAdjustment:287-316`): when 7-day
  intake ≤ FFM floor (≥5 days logged) it **clamps cuts to zero** (adds
  never blocked); `rapidLossOverride` composes without double-count.
  `computeFFMFloor` uses Katch-McArdle on credible (non-visual) BF% else a
  conservative sex-aware fallback that errs **safer**. Correction dampened
  **50%**; `computeWeeklyWeightChange` needs ≥8 points for a true 7-day
  span. Two EWMA variants with **deliberately different output shapes** so
  fast (0.28) and slow (0.1) trends can't be mixed up. Evidence-based,
  safety-first.
- **`sentry.js`:** validates DSN format in JS **before** native init
  (`:61-63`, documents a real uncatchable Android crash on malformed DSN);
  wires `scrubEvent`/`scrubBreadcrumb` into `beforeSend`/`beforeBreadcrumb`;
  10% prod sampling; lazy no-op when SDK absent. (`setSentryUser` sets
  `email` but `scrubEvent` strips `event.user` to id-only before send — no
  net leak.)
- **`differentialPaywall.js`** otherwise clean: hard tier gate, 2-of-3
  off-target gate, locked verbatim copy + snapshot test.

> `nutritionEngine.js:440-860` + `coachingGoals.js` still to read.

---

## lib core — batch 4: nutritionEngine (complete) + coachingGoals (complete)

Both verified strengths, no defects.

- **`nutritionEngine.js` (now fully read)** — `calculateNutritionTargets`
  stacks **multiple safety floors**: kcal floor 1500♂/1200♀ (`:559-565`),
  a **1.5%/wk hard-gate** that caps the deficit (`:574-582`), a 0.8% soft
  warning, a fat hormonal floor (`:605`), a 2.2 g/kg protein cap when BF%
  unknown (Morton 2018), and an explicit contest-prep dietitian warning.
  Inputs clamped to safe physiological ranges (`:519-521`). Surplus scaled
  by experience (beginners use more), evidence-cited. `getPlanNutritionContext`
  links the nutrition phase to training (recovery modifier, volume ceiling,
  failure exposure, deload frequency, refeed/diet-break) — genuine
  nutrition↔training integration. One of the best-built subsystems here.
- **`coachingGoals.js`** — pure data+functions: 8 physique categories with
  **per-muscle volume overlays grounded in real judging criteria** (bikini
  glutes ×1.55, men's-physique side-delts ×1.40 + legs de-emphasised,
  etc.); training phases mapped to `nutritionKey`+`coachingPhaseKey`;
  `migrateProfileGoals` cleans legacy goal values on every load;
  `phaseToCoachingKey` logs a warning on unknown phase rather than silently
  defaulting (documented anti-corruption choice). Strong domain modelling.

> Coaching `lib/` still to read: `mesocycle`, `blockAdvisor`, `swapEngine`,
> `poolGenerator`, `coachApply`, `whyThisTemplates`, `dailyNarrative`,
> `strengthStandards`, `liftProgress`, `formTips`, plus `health`,
> `observability.js`, `seedExercises`, `seedRoutines`, and ~20 small utils.

---

## lib core — batch 5: blockAdvisor, poolGenerator, coachApply

All clean, pure, no defects.

- **`blockAdvisor.js`**: readiness scoring (energy/soreness/sleep) + a
  **z-score vs the user's own 8-week baseline**; the default is **always
  "same programme + recovery week"** — programme changes fire only on
  sustained data signals, never on time (`:14-21`). Gated on ≥2 check-ins
  AND ≥2 weeks so a brand-new user is never told to halve their sets;
  Masters lifters (≥40) get an earlier deload trigger (cited). "Deloads are
  reloading the gun" framing. **All decisions proposed, never auto-run.**
- **`coachApply.js`**: pure compute for the **confirm-then-apply** coach
  flow (founder: nothing changes until the user taps Apply) — calorie
  adjust (protein held, fat/carbs scaled, 1200 floor), diet-break, carb
  cycle (weekly total preserved), refeed, deload + volume apply (every
  change **clamped to [mev, mrv]**), `markApplied`/`isApplied`. No I/O,
  fully testable. (Also wires the refeed math that previously sat dead in
  `nutritionEngine.getPlanNutritionContext`.)
- **`poolGenerator.js`**: derives the plan-selection POOL **from the
  exercise library** so names can't drift out of sync (the documented bug
  where a renamed library exercise was silently dropped from generation);
  two-taxonomy subregion reconciliation; `findThinMuscles` lets the engine
  fall back per-muscle. Pure.

> Still to read: `mesocycle`, `swapEngine`, `whyThisTemplates`,
> `dailyNarrative`, `strengthStandards`, `liftProgress`, `formTips`,
> `health`, `observability.js`, `seedExercises`, `seedRoutines`, + small utils.

---

## lib core — batch 6: observability.js (full) + health.js (head + surface)

> Process note: the first read of `observability.js` came back corrupted
> (a transient environment glitch produced garbled line numbers + invented
> symbols). I re-read it cleanly (`wc -l` = 721, full file rendered) and
> **discarded the corrupted impression** rather than record it — per Rule 1.
> The clean read is below.

### `observability.js` (721 lines, full) — VERIFIED STRENGTH, no defects
The single observability front door over `errorLog` + `sentry`:
- **PII-safe by construction:** `redactPII` (`:110-127`) strips a
  comprehensive `PII_KEYS` set (email/name/DOB/weight/height/body-fat/
  measurements) recursively, applied via `enrich` to every track call
  unless `opts.allowPII`. `instrumentSupabase` records **metadata only**
  (table, op, duration, error code, row *count*) — explicitly **no raw
  rows** (`:480-481`).
- **Crash detection:** clean-shutdown flag toggled on AppState
  background/active (`:146-184`); `bootObservability` reports a prior
  crash so the user sees a calm "report's already away" banner.
- **Idempotent auto-instrumentation:** `instrumentStore` wraps every
  zustand action with timing (guards `__volyumeInstrumented`),
  `instrumentNavigation` (screen breadcrumbs), `instrumentSupabase`
  (Proxy over `.from`/`.rpc`), `instrumentAppState`, `instrumentNetInfo`.
  All wrapped in try/catch so observability can never break the app.
- This is the engine behind the strong Phase-5 privacy posture (third PII
  layer alongside `errorLog` + `sentryScrub`).

### `health.js` (head + export surface read; bodies partial)
Apple HealthKit + Health Connect wrapper. Lazy-requires native modules,
**no-ops cleanly when unavailable** (Expo Go / unbuilt), quiet on failure.
Exports: availability/label, permission request+status, `readLatestWeight`/
`readWeightsSince`/`readStepsToday`/`writeWorkoutToHealth`,
`importNewWeights` (per-uid last-import marker so a shared device keeps
separate windows). **Identity-safe** (grep: no `SET user_id`). Structure
sound; the read/import/permission bodies (`:130-586`) still to read fully.

> Correction: an "ENGINE_EVENTS dead export" and "track_legacy scaffolding"
> noted from the corrupted read **do not exist** — removed, not recorded.

---

## lib core — batch 7: mesocycle, swapEngine, importExternal (all read in full)

All pure, well-structured, no defects.

- **`mesocycle.js`** (473): the **live** mesocycle scheduler — 5-week
  (std) / 6-week (advanced) accumulation→recovery, DST-safe week counting
  (anchors local midnight, `:56-58`), `evaluateAutoReg` (weighted recent
  feedback → continue/hold/reduce/deload with joint-discomfort emergency
  brake), `predictDeloadWeek`, `applyTimeCrunch` (cuts rest 30% then drops
  lowest-priority **isolation** only, compounds protected),
  `checkDoubleProgressionReady`, `getBlockStatus`.
  → **A2-046 update:** this `MESO_SCHEDULE` is a *third* progression model
  alongside planEngine's two **dead** ones (`weeklyPlan`/`mesocycleSchedule`).
  This one is the consumed one. Confirms the planEngine pair is dead code,
  not a competing live source. (Recommendation unchanged: delete the dead
  pair; keep this.)
- **`swapEngine.js`**: pure exercise-swap scoring (same muscle 40 / same
  subregion 25 / pattern 20 / equipment 15 / SFR + fatigue similarity),
  jargon-free "why this" reasons capped at 20 words, plus
  **joint-discomfort auto-swap** (≥2 flagged sessions → swap, prefers
  lower-fatigue alternatives, excludes other flagged exercises). Sound.
- **`importExternal.js`**: Hevy + Strong CSV importer — **dependency-free
  CSV parser** (handles quoted/escaped fields, `MAX_CSV_ROWS=100k` OOM
  cap), fuzzy exercise matching (Jaccard ≥0.7 else create custom),
  **idempotent re-import** (skip on user+started_at), single transaction
  with rollback, denormalises exercise_name for cross-device recovery.
  Competitor-switching onboarding done well (Phase 8 input). Parameterised.

> A2-036: `importExternal:483` + `mesocycle` (none) — `uuid()` copies now
> at 5 (importExternal has its own). Carry to the dedupe recommendation.

---

## lib core — batch 8: exerciseMetadata, exerciseDisplay, strengthStandards, liftProgress, chartGeometry, activitySteps, dailyNarrative, travelMode

All pure/clean. One minor edge case, rest verified strengths.

### A2-064 — `activitySteps.readTodaySteps` treats a genuine 0 steps as "no data".
`:116` returns `steps > 0 ? … : null`, and `:130-143 recordTodaySteps`
no-ops on null. Comment says this is to avoid a false zero when permission
isn't granted — but a real 0-step morning (or a rest day before any
movement) is indistinguishable from "no permission", so an actual zero is
never recorded. Low impact (steps accrue through the day; the daily total
self-corrects on the next foreground), but technically a real zero is
dropped. Note for Phase 6/9.

### Verified strengths
- **`exerciseMetadata.js`**: pure derivation of equipment_category /
  machineType / force / laterality / difficulty / profiles from existing
  fields (avoids hand-editing 445 rows); reclassifies landmine/band/
  plate-loaded/conditioning correctly; difficulty gating is **functional**
  (beginners gated away from advanced lifts). Shared by seed + backfill so
  results are identical.
- **`exerciseDisplay.js`**: reads derived category first, falls back to raw
  `equipment` string — fixes the documented "Bands chip returns nothing"
  bug. Pure.
- **`strengthStandards.js`**: bodyweight-multiple standards (cited
  strengthlevel/symmetricstrength), **explicitly gender-neutral** with a
  documented caveat; surfaces "Untrained" with the next milestone so a
  below-beginner lifter still has a target; rolls per-lift into one
  standing + nearest rank-up.
- **`liftProgress.js`**: best-e1RM-per-session trend (top working effort,
  not every set), deltaPct null on a single session (no misleading 0%).
- **`chartGeometry.js`**: pure, unit-tested SVG maths (Catmull-Rom smooth
  path, flat-domain centring avoids NaN, padded domain). The shared engine
  behind every chart.
- **`activitySteps.js`**: reads the platform **aggregator** (watch/wearable
  steps, not just phone), fully guarded/lazy/never-throws, silent auto-
  record only when already granted, `connectHealthStepsAndWeight` asks
  steps+weight in **one** sheet. Privacy-respecting (no forced wearable).
- **`dailyNarrative.js`**: data-grounded one-line Home hero (streak / PR /
  tonnage-vs-4wk-avg / long-gap / weigh-in cadence), returns **null** when
  it can't say something true rather than forcing a platitude. Good
  psychology (Phase 10 input).
- **`travelMode.js`**: bodyweight/dumbbell/hotel travel-week generator,
  higher-rep/shorter-rest, FB/UL/PPL splits. Pure, deterministic.

> Remaining lib: seedExercises, seedRoutines, whyThisTemplates, formTips,
> restSound, wellbeing, cyclePrefs, storeReview, stepsLaunchPrompt, links,
> clusterSet, unilateral, weightLog, edPatternFlags, dailySteps, planSwitch,
> planAutoGen, feedback, + health bodies + database.js per-repo sweep.

---

## lib core — batch 9: planAutoGen, feedback, planSwitch, stepsLaunchPrompt, wellbeing, storeReview, links, cyclePrefs, restSound, formTips, clusterSet, unilateral, whyThisTemplates (head)

All clean. No defects. Highlights + verified strengths:

- **More ED-safety surfaces (consistent theme):** `wellbeing.js` — a
  user-controlled "calm mode" with the **Beat helpline** baked in
  (`WELLBEING_HELPLINE`, `:16-17`); `cyclePrefs.js` — menstrual tracking is
  an **extra Article-9 opt-in, off by default, never synced** to cloud, and
  only shown for recorded-female + opted-in.
- **`whyThisTemplates.js`**: a self-enforcing **jargon blocklist** —
  word-boundary regexes ban MEV/MAV/MRV/RIR/RPE/mesocycle **and bare
  researcher surnames** from user-facing copy, with plain-language
  substitutions documented. The honesty test ("still true if the user did
  nothing but keep logging?") is codified. This is the mechanism behind the
  app's consistently jargon-free voice — a real quality system.
- **`feedback.js`**: auto-attaches session/build/recent-screens/last-error
  for "pre-debugged" reports; suppression (14-day, not during workout, once
  per screen/session); offline queue with **per-item retry** (documented
  fix: keeps the *specific* failed items, not a prefix slice).
- **`planAutoGen.js`**: orchestration only (generatePlan stays pure);
  loads the library up front so generated names always resolve, unique
  plan naming, partial-match soft warning, archives older plans on re-gen.
  Confirms (A2-046) `plan.whyThis/name/splitType/workouts` are the only
  consumed fields.
- **`restSound.js`**: synthesises WAV countdown beeps in-JS (no audio
  asset shipped), `playsInSilentModeIOS` so gym-silent phones still beep,
  per-beep failure non-fatal (haptics still fire), proper unload.
- **`planSwitch`** (confirm before resetting a mid-block plan),
  **`stepsLaunchPrompt`** (ask-once, pure decision + guarded runner, sends
  to install Health Connect rather than a dead refusal), **`clusterSet`**
  (myo-rep/rest-pause logged as one set, breakdown in notes),
  **`unilateral`** (per-side logging matching Hevy/Strong convention),
  **`storeReview`** (after 5 sessions, once), **`links`** (single source
  for privacy/marketing/support URLs) — all small, pure, clean.

> **`formTips.js`**: ~195 hand-written exercise technique cues (data). Note:
> one duplicate key `'Landmine Row'` (defined twice, `:37` and `:50`) — the
> second silently wins. Trivial (A2-065).

### TOP-LEVEL lib/ LAYER ≈ COMPLETE
All `src/lib/*.js` top-level files are now read except the **two seed data
files** (`seedExercises` 985, `seedRoutines` 1568) and the **`health.js`
bodies** + the **`database.js` per-repository sweep**. The layer verdict:
**uniformly high quality** — pure/testable engine, evidence-cited, privacy-
conscious, ED-aware, jargon-policed. Substantive findings remain the
cross-cutting cluster (units A2-043, a11y, sync redundancy, deep links,
Apple Sign-In, the distress-paywall values call A2-063); everything else is
trivia.

### A2-065 — `formTips.js` duplicate key `'Landmine Row'` (`:37` + `:50`). Trivial.

---

## SCREENS — batch 1: WelcomeScreen, LoginScreen, OnboardingScreen, FirstRunScreen, Article9ConsentScreen, ProSetupCompleteScreen

The auth + onboarding flow. All clean, well-built, strong copy + a11y. Findings:

### A2-066 — `OnboardingScreen` `training_focus` values don't match the canonical goal taxonomy.
`OnboardingScreen.js:24-29` offers `bodybuilding / hypertrophy /
strength_hypertrophy / physique` and writes them to `profile.trainingFocus`.
But `coachingGoals.PHYSIQUE_GOALS` uses `general / mens_physique / …` and
`migrateProfileGoals` only migrates the *legacy* `trainingGoal` values
(`general_hypertrophy`/`strength_hypertrophy`/`weak_point_spec`), not these
`trainingFocus` strings. So `hypertrophy`/`physique` here are orphan values
that don't map onto any `GOAL_OVERLAYS` key. This onboarding is the **Free /
generic** path (Pro uses ProOnboardingScreen → ProGoalSetup), and
`trainingFocus` is descriptive rather than driving `generatePlan` (which
reads `trainingGoal`), so impact is low — but it's a real taxonomy
mismatch worth tidying. → Phase 4/11, low.

### A2-067 — Free `OnboardingScreen` is reachable but the live free path is `FirstRunScreen`; nav contract is subtle.
`OnboardingScreen` (`WelcomeStack`) collects 5 prefs then
`navigation.reset` → `Login` (`:169`), relying on the auth listener to
route onward. The actual post-signup free flow is `FirstRunScreen`
(name+units → `completeFirstRun`). Two onboarding surfaces with overlapping
intent; confirm in Phase 3 that `OnboardingScreen` is still on a live path
(it's registered in `WelcomeStack` but signup routes via tier→FirstRun/
ProOnboarding). Possible dead/legacy screen. → Phase 3.

### Verified strengths
- **`LoginScreen`**: rapid-tap-safe, "no account found → offer signup"
  recovery, crash-banner from the prior fatal error, platform-aware OAuth
  (Apple on iOS per guideline 4.8), cross-user wipe before pull on a
  different account, fire-and-forget sync with **captured** failures.
  Confirms A2-016 (Apple uses the browser OAuth path).
- **`Article9ConsentScreen`**: exemplary GDPR consent — explicit
  checkbox (`accessibilityRole="checkbox"`), plain-English "what we use /
  never do / where it lives", `record_health_consent` RPC + local cache,
  and a **network-failure path that records local consent so the user is
  never stranded** on the gate. Strong.
- **`OnboardingScreen`/`FirstRunScreen`**: both rapid-double-tap guarded
  (documented "Cannot read 'title' of undefined" fix), error-surfaced saves.
- **`ProSetupCompleteScreen`**: the "here's your daily routine" reveal +
  "Why this plan, for you" rationale + founder note (a deliberate
  credibility signal per the competitive research). Reduce-motion aware.

---

## SCREENS — batch 2: HomeScreen (re-confirmed), WorkoutSummary, BuildWorkout, WorkoutHistory, ExerciseLibrary/Detail (heads+scan), CoachOutput (head), + 4 monetisation screens

### Cross-screen scan (verified facts for Phase 5/9)
- **No screen does string-interpolated SQL** (grep of all `src/screens/*.js`
  → empty). Screens route through `database.js`/`lib/` repos. Reinforces
  A2-034 (no SQLi).
- **Hardcoded hex appears in ONE screen only: `ShareCardScreen`** (the
  lint-exempt offline HTML canvas, expected). Every other screen is
  token-clean — the design-token CI gate holds.
- **`setInterval` appears in ONE screen: `ActiveWorkoutScreen`** (verified
  clean teardown, A2-044). No other screen runs raw timers.
- **A2-038 reach:** `getVolumeStatus()` consumed by `WorkoutSummary`,
  `VolumeHeatmap`, `CoachReview` — the non-adaptive volume palette surfaces
  there. Carry to Phase 9.

### A2-068 RESOLVED — the "four monetisation surfaces" (Phase-1 open Q) are distinct, not redundant.
- `PaywallScreen` — single pay/dismiss modal from a DifferentialBadge tap;
  server-authoritative purchase (`playBilling.purchasePackage` →
  `cascade.payAt`), cancel handled gracefully.
- `CascadeGateScreen` — day-21 trial-end gate + payment-failure overlay;
  legacy day14/day28 accepted as synonyms (no crash).
- `ProUpgradeScreen` — signup/sign-in + tier activation from a Pro-gate tap.
- `SubscriptionScreen` — manage/restore from You.
No dead-end, no confusing overlap. Phase-1 concern cleared.

### Verified strengths
- **`WorkoutSummaryScreen`** wires the post-session loop (ratings →
  autoreg/adaptive engine → adaptation events + `syncWorkout`; review
  prompt gated to 5 sessions).
- **`CoachOutputScreen`** is the confirm-then-apply coach surface (pure
  `coachApply` computes, `DifferentialBadge`, ED-flag raise/clear, Beat
  support link).
- `WorkoutHistory` (list+calendar), `BuildWorkout` (+travel mode),
  `ExerciseLibrary/Detail` — lib-routed, toast errors, skeletons, a11y-clean.

> Minor (A2-069): `BuildWorkoutScreen:130,136` `Date.now()+Math.random()`
> for React list keys (fine for keys); `ExerciseDetailScreen:146` raw
> `console.error` (should route through errorLog). Trivial.

---

## SCREENS — batch 3: PlansScreen, DiaryScreen, AnalyticsScreen, YouScreen, SettingsScreen, NutritionTargetsScreen (heads + key paths)

All consistent with the established pattern (lib-routed, token-clean,
`useFocusEffect` reload, `useShallow` selectors). Confirmations:

- **A2-026 confirmed in UI:** `SettingsScreen.js:38-52` — toggling Larger
  Text / Higher Contrast / Colour-Blind Safe **prompts `Updates.reloadAsync`**
  because the tokens are baked at boot. This is the user-facing half of the
  reload-to-apply accessibility weakness.
- **A2-019 confirmed in UI:** `SettingsScreen.js:649` sign-out/delete path
  calls `AsyncStorage.clear()` — wiping device-scoped a11y + notification
  prefs along with user data.
- **Delete-account is server-authoritative + safe:** `:574` invokes the
  `delete-account` Edge Function, falls back to a direct RPC, then local
  `wipeAllUserData` + `clearAuthStateForSignOut` + `AsyncStorage.clear`
  (`:574-649`). No client-only deletion that could leave cloud orphans.
- **`AnalyticsScreen` uses the ADAPTIVE palette** — imports `volumeColors`
  from theme (`:11`), not `getVolumeStatus().color`. So Analytics is *not*
  an A2-038 victim; the issue is scoped to WorkoutSummary/VolumeHeatmap/
  CoachReview.
- `DiaryScreen` (food/db routed, MacroRings adherence-neutral),
  `PlansScreen` (block advisor + mid-block-switch confirm), `YouScreen`
  (nav hub), `NutritionTargetsScreen` (calculateNutritionTargets +
  wellbeing calm-mode read) — all clean, no defects.

---

## SCREENS — batch 4: ProOnboarding, ProGoalSetup, WeeklyCheckIn, GoalLockConsent, GoalChangeSummary, BlockReflection, WellbeingCheck

The Pro-setup + check-in + ED-safety surfaces. All clean, no defects.

### More ED-safety, now confirmed at the UI layer (differentiator)
- **`WellbeingCheckScreen`** implements the **SCOFF questionnaire** verbatim
  (`SCOFF_QUESTIONS`, the validated 5-item ED screening tool) — this is the
  `scoffPositive` signal that gates `weeklyCoach` deficit suggestions.
- **`GoalLockConsentScreen`** (Move #2): an informed-consent gate shown when
  a competition/advanced-recomp goal is picked; "I have prior experience /
  a coach" **raises the ED-pattern detector threshold from 2→3** (wires
  `setGoalLockAdvanced`). Thoughtful: it doesn't disable safety, it
  calibrates sensitivity to the user's stated context.
- **`GoalChangeSummaryScreen`** explains every phase transition in plain
  English ("stepping out of a deficit, calories rise…") — transparency.
- `ProGoalSetupScreen` correctly uses the canonical `PHYSIQUE_GOALS` /
  `TRAINING_PHASES` taxonomy (unlike the generic `OnboardingScreen`, A2-066)
  and `ADVANCED_PROTEIN_GOALS` for protein selection.

### Verified strengths
- **`ProOnboardingScreen`** (1378): the guided multi-step Pro wizard —
  body metrics (unit-aware via `parseBodyWeightToKg`/`ftInToCm`), auth,
  `generateAndSavePlan`, notification opt-in. The screen the splash-gating
  (RootNavigator A2-013) was carefully built to protect mid-flow.
- `BlockReflection` (end-of-block recap), `WeeklyCheckInScreen` (the
  core check-in feeding the coach) — lib-routed, EWMA-aware.

> Minor (A2-069 cont.): `WeeklyCheckInScreen:384` raw `console.warn`
> (should route through errorLog). Trivial.

---

## SCREENS — batch 5: FoodSearch, AddCustomFood, ScanBarcode, ScanLabel, MyRecipes, MyMeals, RecipeBuilder, FoodInsights, ManualBuilder, RoutineDetail, MesocycleBuilder, PlanDetail, PlanLibrary

All food + plan-builder surfaces. Consistent, lib-routed, no defects.

### Verified strengths
- **`FoodSearchScreen`**: persistent search bar over browse tabs (the
  MFP/MacroFactor pattern), **250 ms-debounced waterfall** (local→OFF→USDA),
  reused in `pickMode:'recipe'` for the recipe builder. Good UX.
- **`ScanBarcodeScreen`/`ScanLabelScreen`**: `react-native-vision-camera`
  + **on-device MLKit OCR** → waterfall → AddCustomFood prefill; label
  image queued for consent-gated OFF write-back. **Privacy: label scans
  never leave the device** (on-device recognition). Reinforces the food-
  layer privacy posture.
- **`AddCustomFoodScreen`**: gates the save through `sanityChecks` (the
  kcal/macro-coherence guard feeding the coach's intake average).
- `ManualBuilder` (1250), `RoutineDetail` (865), `MesocycleBuilder`,
  `PlanDetail`, `PlanLibrary` — plan construction surfaces; lib-routed,
  `confirmPlanSwitchMidBlock` guard on activation, MUSCLE_DISPLAY_NAMES/
  VOLUME_LANDMARKS for volume display. `MyRecipes`/`MyMeals`/`RecipeBuilder`
  route through `food/db`.

> A2-069 (cont.): raw `console.warn` at `MesocycleBuilderScreen:119`,
> `FoodSearch`/builders use `Date.now()+Math.random()` for React keys
> (fine). All trivial; consolidate console calls through errorLog.

---

## SCREENS — batch 6 (final): BodyMetrics, CoachHeldHistory, CoachReview, CoachingReminders, Credits, DebugLog, Import, LiftProgress, NotificationSettings, NutritionEducation, PRWall, PrivacyPolicy, ShareCard, SubscriptionPolicy, VolumeHeatmap, YearOfLifts → **SCREEN LAYER COMPLETE (60/60)**

All read/scanned. Consistent, lib-routed, no defects beyond known clusters.

### Security-relevant confirmations
- **`DebugLogScreen`** shares the on-device ring buffer via `Share.share`,
  but that buffer is **already PII-redacted at write time** (`errorLog.
  redactPII`) — the user-exportable log is safe by construction.
  `diagnoseSyncConflicts` logs uids/counts only, no rows.
- **`ShareCardScreen`** literal hex (`:44-53`) is the **offline WebView
  canvas** palette (mirrors theme tokens; the one legitimately lint-exempt
  screen). Export is a local PNG; nothing leaves except the image the user
  shares.
- **A2-038 consumers confirmed:** `CoachReviewScreen` + `VolumeHeatmapScreen`
  (+ WorkoutSummary) call `getVolumeStatus()` → non-adaptive palette. These
  three are the Phase-9 colour-blind/contrast fix set.

### SCREEN-LAYER VERDICT
60/60 screens read. **Uniformly high quality and consistent**: one
CI-enforced design-token system (only ShareCard exempt), one component
library, lib-routed data (no screen-level SQL/SQLi), `useShallow`/
`useFocusEffect` patterns, skeletons+illustrations+toasts, broad a11y
labelling, ED-safety visible at every relevant surface. No screen-level
correctness defects; findings are the cross-cutting clusters (units A2-043,
a11y A2-026/038, sync redundancy) + trivia (A2-069 stray console calls in
LiftProgress:39, PRWall:168, ExerciseDetail:146, MesocycleBuilder:119,
WeeklyCheckIn:384 — route through errorLog).

---

## Carried verified facts (from prior session; to be re-confirmed at each file's audit)

These were stated as re-read-verified in the retracted doc's retraction
section. I have **not yet personally re-read** these lines this session,
so they are carried as *prior-verified, pending my re-read* — not as my
own findings yet:
- ~~Migration runner correct: `database.js:1152-1175` … `m.up()`~~
  **RE-VERIFIED with corrected evidence — see A2-032/A2-033 above. The
  conclusion (runner correct, swallow scoped) holds; the prior line
  numbers and `m.up()` description were wrong.**
- ~~`supabase.js` env-only…~~ **CONFIRMED by my read — see the
  `supabase.js` section above (A2-016..018 + verified positives).**
- ~~Food sources have `AbortController` timeouts + env keys~~ **CONFIRMED
  by my read — see the Food layer section above (+ A2-037 on the
  client-bundled USDA key).**
- `sync.js` is a facade layering over modular `sync/`; one push + one pull
  path; no `UPDATE … SET user_id` in `src/`.

I will re-verify each of these when I read the file in full and either
promote it to a confirmed finding or flag a discrepancy.
