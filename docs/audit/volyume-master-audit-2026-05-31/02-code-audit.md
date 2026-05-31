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
