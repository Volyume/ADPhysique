# Campaign 5 — Adversarial Review B: interruption, back, state

Phase 43 of the founder's Campaign 5 order. Branch
`claude/campaign5-first-use` at `cc36b360` (all five waves + the six
founder rulings landed). **Read-only audit**: no file in `src/`, no
test, no configuration and no doc outside this one was changed, and
nothing was committed, pushed or stashed.

**Line-number baseline.** All `file:line` citations are against the
committed tree at `cc36b360`. Two files carried **uncommitted** edits from
the concurrent Review A lane while this review ran —
`src/lib/blockExplain.js` and `src/screens/PlansScreen.js` (RA-2 copy
changes: the ledger framing line and the seed-receipt subtitle). Those are
copy only and change no mechanism named here, but they insert seven lines
into `PlansScreen.js` at `:269`, so every `PlansScreen.js` citation above
that point is exact and every one below it reads seven lines higher on the
working tree. Nothing in this lane touched either file.

**Method.** Every claim is traced from the code on this tree and carries
`file:line`. Each DEFECT in `INTERRUPTION-MATRIX.md` was re-opened
against the current tree to confirm it is closed, and then the *fix* was
attacked for new holes. Where the attack found nothing, the pass is
recorded as CLEAN with the mechanism that defeats it, not as silence.
Two pin suites were run read-only: `campaign5.firstUse.test.js` +
`proOnboardingDraft.test.js` — 164 passed, 2 suites, 3.1s.

**Bounds honoured.** No proposal here adds AI, cardio, a feature, a
migration or a dependency; ED-safety, Article 9, billing architecture,
free/pro gating and `ONBOARDING_QUIZ_FIRST` are untouched by every fix
sketched below. Nothing here is executed — the lead actions it.

---

## 1. Summary — most severe first

| ID | Class | Severity | One-line claim |
|----|-------|----------|----------------|
| RB-1 | DEFECT | HIGH | The C5-P29-07 build record and the wizard draft are both cleared one screen too early, so backing out of the hand-off screen forces a full wizard re-run that duplicates exactly the writes the record exists to prevent — and hardware Back on that screen exits the app, so no kill is needed. |
| RB-2 | DEFECT | MEDIUM | `restoreNotifications` cancels every scheduled notification and re-lays eight families but **not** the weekly-coach-ready push, so a quiet-hours edit or a DST change silently destroys the Monday push and PM-01(b)'s `weekStart` param with it. |
| RB-3 | DEFECT | MEDIUM | No plan-activation path holds a synchronous entry guard. Two same-frame taps queue two `appAlert`s and run two `activatePlanWithBlock` calls; FB-35's `restartingRef` only blocks concurrency, not the second queued confirm. Concurrent runs can leave two `is_active` mesocycles. |
| RB-4 | DEFECT | MEDIUM | `PlansScreen.loadData` req-guards only the ledger story, so the new FQ-2 tier-reload effect racing a lapse can repaint the Pro two-option decision card for a free user. Entitlement itself still holds (second lock), so this is display-only. |
| RB-5 | DEFECT | LOW | `PlanLibraryScreen`'s activation sits outside its try: a throw leaves the user on the library with no toast, no `goBack()`, and no active plan. |
| RB-6 | LATENT | MEDIUM | The FreeStarter dedup keys on plan **name**, so a renamed copy re-copies and an unrelated user plan sharing the name is silently adopted as "the recommendation". |
| RB-7 | LATENT | LOW | `weightLoggedAt` suppresses the enrolment body-metric row on a retry even when the user edited their weight at step 2 in between, leaving a stale enrolment reading. |
| RB-8 | LATENT | LOW | `markBuildProgress` is written *after* the write it records, so a kill inside that window still duplicates. The C5-P29-07 window is narrowed, not closed. |
| RB-9 | LATENT | LOW | The draft debounce can fire mid-build (`submittingRef` is a ref, not an effect dep), re-saving a step-6 draft; `clearDraft` normally wins the race, but the ordering is timing-dependent. |
| RB-10 | LATENT | LOW | Every Apply handler guards on `applyingKey` **state**, not the ref pattern the campaign adopted elsewhere. Today a double-fire converges (both read the same base); it is one refactor away from a double-applied change. |
| RB-11 | LATENT | LOW | `appAlert` silently ignores `options.onDismiss`; two call sites pass it. Both survive only because they also give the cancel button an `onPress`. |
| RB-12 | LATENT | LOW | `advanceFrom6` arms the Back-swallowing `submittingRef` before `applyReminderPreferences`, but no busy state renders until `startSequence`, so a hung permission promise leaves an idle-looking, Back-dead step 6. |
| RB-13 | LATENT | LOW | Step 1 of the Pro wizard is now unreachable in shipped routing, so its `OAuthButtons` / `handleOAuthOnboarding` are dead — correct per the D96 ruling, but it removes the only in-wizard re-auth affordance. |
| RB-14 | LATENT | LOW | A foreground `pullFromCloud` during a Free→Pro wizard run (consent already true) can land after `archiveOtherUserPlans` and restore cloud plan rows unarchived. |
| RB-C1 | CLEAN | - | C5-P29-01 (the Step 1 trap) is closed on both deterministic scenarios, and the fix composes correctly with the draft restore and the sex clamp. |
| RB-C2 | CLEAN | - | C5-P29-04's consent latch failsafe is correct and fails CLOSED in every branch, including the race with a landing real check. |
| RB-C3 | CLEAN | - | The two new `BackHandler`s cannot bypass consent or required-safe baseline data (C5-P30-05/06 still hold), cannot double-fire, and cannot strand. |
| RB-C4 | CLEAN | - | Check-in submit twice is idempotent: `saveWeeklyCheckin` is an upsert keyed by the local week window. |
| RB-C5 | CLEAN | - | Account switching: the cross-account modal still precedes every side effect, and the "keep this device's data" abort — which leaves the consent latch unresolved — is now rescued by RB-C2's failsafe. |
| RB-C6 | CLEAN | - | C5-P29-02 routes 1 and 2 are both closed for the first-run free path. |
| RB-C7 | CLEAN | - | C-2's Article 9 gate on the legacy `pullFromCloud` is present and fails closed on any read failure. |
| RB-C8 | CLEAN | - | Permission denial mid-flow: the preference still lands before the prompt, denial schedules nothing, and both Open Settings gaps are closed. `CoachingRemindersScreen`'s retained prompt carries a recorded rationale. |
| RB-C9 | CLEAN | - | The FQ-4 allocation read cannot race workout creation: `startWorkout` sets the workout and its exercises in one store update, and both row shapes the reader accepts match what the queries return. |
| RB-C10 | CLEAN | - | Apply double-tap on training / deload converges on the same value; no double set counts, no double calorie change. |

**Counts: 5 DEFECT, 9 LATENT, 10 CLEAN.**

---

## 2. Verification pass — is each INTERRUPTION-MATRIX defect closed?

| Matrix ID | Ruled | Closed on this tree? | Evidence |
|---|---|---|---|
| C5-P29-01 | EXECUTE(lead), option (a) | **YES** | `ProOnboardingScreen.js:497-508` — the `if (userProfile) return;` guard is gone; any authenticated non-local user at step 1 advances. See RB-C1 and RB-13. |
| C5-P29-02 | EXECUTE(wave B) | **YES, for first run** | `FreeStarterScreen.js:46,137,142` (`startingRef`) + `:154-161` (existing-copy reuse) + `:162-168` (no second block for an already-active copy). See RB-6 for what the name-keyed dedup still misses. |
| C5-P29-03 | EXECUTE(wave B) | **YES** | `FirstRunScreen.js:39` prefills from `userProfile`; `:65-71` the name no longer gates the free journey. |
| C5-P29-04 | EXECUTE(wave B), fail closed | **YES** | `RootNavigator.js:1519-1528` + `:816`. See RB-C2. |
| C5-P29-07 | EXECUTE(wave B) | **PARTLY** | `proOnboardingDraft.js:92-129` + `ProOnboardingScreen.js:961,1070-1079,1157-1183`. Closes the mid-build replay; **RB-1** shows the record is destroyed one screen before first-run completes, and **RB-8** shows the mark-after-write window survives. |
| C5-P30-01 | EXECUTE(wave B) | **PARTLY** | `ProOnboardingScreen.js:615-624`. The wizard is covered; `ProSetupCompleteScreen` (a `navigation.replace` target with a one-screen stack) still exits the app on Back and has no handler — this is the trigger for RB-1. |
| C5-P30-02 | EXECUTE(wave B) | **YES** | `FreeStarterScreen.js:94-102`. |
| C5-P30-04 | EXECUTE(wave C) | **YES** | `ProGoalSetupScreen.js:220-221` calls `confirmPlanSwitchMidBlock(user?.id, { mode: 'rebuild' })` **before** the write; `planSwitch.js:42-46` carries the rebuild wording. |
| C5-P27-01 | EXECUTE(wave D) | **YES** | `NotificationSettingsScreen.js:290-303` now reads status; the prompt stays on user action at `:495`. |
| C5-P27-02 | EXECUTE(wave D) | **YES** | `ProOnboardingScreen.js:847-928` extracted, called at `:946-948` **before** `startSequence()` at `:954`. See RB-12 for the new seam. |
| C5-P27-03/04 | EXECUTE(wave D) | **YES** | `ProgressGhostCapture.js:406`, `CoachingRemindersScreen.js:428`. |
| C5-P28-01 | EXECUTE(wave D) | **YES** | `ProOnboardingScreen.js:445-455` reads quiet hours and derives `morningShift`; `CoachingRemindersScreen.js:273-276` does the same. |
| C5-P28-02 | EXECUTE(wave D) | **YES** | `ProOnboardingScreen.js:895-905` dual-writes `morning_weight` + `weekly_checkin_reminder` rows. |
| C5-P28-04 | EXECUTE(wave D) | **YES** | `lapseDetect.js:69-84` cancels both weight prompts at the observed lapse. |

---

## 3. ATTACK — onboarding resume

### 3.1 RB-1 — DEFECT (HIGH). The idempotence record dies one screen too early.

**Mechanism, traced.** `advanceFrom6` finishes the build and then, at
`ProOnboardingScreen.js:1225-1226`:

```js
if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
if (user?.id) clearDraft(user.id).catch(() => {});
```

`clearDraft` deletes **both** keys (`proOnboardingDraft.js:82-90`): the
resume draft *and* the C5-P29-07 build record. The screen then
`navigation.replace('ProSetupComplete')` (`:1232` / `:1244`).

But first run is **not** complete at that point. `firstRunComplete` only
flips when the user taps "Start training" on the hand-off screen —
`ProSetupCompleteScreen.js:201-203` → `useAppStore.js:1132-1140`. Between
`clearDraft` and that tap, the app is in a state where the navigator
still routes to `ProOnboardingStack` (`RootNavigator.js:1632-1634`) and
there is nothing left to resume *and* nothing left to suppress a replay.

**Deterministic repro, no process kill required.**

1. Complete the Pro wizard. Land on "You're all set" (`ProSetupComplete`).
2. Press the Android hardware Back button. `grep BackHandler src/` returns
   four non-test files — `BottomSheet.js:257`, `FreeStarterScreen.js:96`,
   `ProOnboardingScreen.js:617`, `ActiveWorkoutScreen.js:937`. **None is
   `ProSetupCompleteScreen`**, and it was reached by `replace`, so the
   stack holds one screen: Back exits the app.
3. Reopen. `firstRunComplete` is false, tier is `pro` → `ProOnboardingStack`.
   Step 1 now correctly auto-advances (the C5-P29-01 fix) to **step 2**.
4. No draft exists, so every field is empty again except `firstName`
   (`:340`). The user re-enters sex, age, height and weight and walks
   steps 3-6.
5. `advanceFrom6` runs a second time. `loadBuildProgress` returns **null**
   (`:961`), so:
   - `:1070-1079` writes a **second enrolment body-metric row** for the
     same day;
   - `:1166-1183` finds no reusable plan and calls `generateAndSavePlan`,
     which archives the first plan (`planAutoGen.js:230`) and takes the
     `makeUniquePlanName` suffix (`planAutoGen.js:45-53,162`) — "Your plan 2";
   - `activatePlanWithBlock` (`database.js:3715-3752`) deactivates the
     block created minutes earlier and starts a fresh six-week block with
     today's `start_date`.

The user ends first use with a duplicate body-metric row, an archived
"Your plan", an active "Your plan 2", and a block whose start date is a
day later than their first session's context. This is the exact residue
C5-P29-07 was ruled to remove; the fix simply does not cover the window
it is most reachable in.

**Why this is not covered by an existing pin.** `campaign5.firstUse.test.js:262-264`
pins the three call shapes (`!priorBuild?.weightLoggedAt`, both
`markBuildProgress` calls) and `proOnboardingDraft.test.js:120-170`
pins the module. Nothing pins *when* the record is cleared, so a fix here
conflicts with no pinned test.

**Minimal fix (lead's call).** Split the two clears: keep `clearDraft`'s
draft removal where it is (the wizard genuinely is done), and move the
build-record removal into `completeFirstRun` (`useAppStore.js:1132-1140`),
which is the moment first run is actually over. That is a one-line move
plus a `clearBuildProgress(uid)` export beside the existing `buildKey`.
It changes no schema, no engine, no gate. A second, independent
improvement worth ruling on together: give `ProSetupCompleteScreen` a
`BackHandler` returning `true` (the hand-off screen has nowhere to go
back to, and exiting the app from it is what makes this reachable with
zero interruption).

### 3.2 RB-C1 — CLEAN. The Step 1 trap fix holds, and composes.

Attacked for new holes, all defeated:

- **Scenario A (Free→Pro upgrade).** `ProUpgradeScreen` → `resetFirstRun()`
  (`useAppStore.js:1101-1114`) → wizard mounts with a hydrated
  `userProfile` and `proOnboardingAccountCreated === false`. The effect at
  `ProOnboardingScreen.js:484-508` now falls through to `setStep(2)`.
  No trap.
- **Scenario B (kill on the hand-off screen).** Same effect, same outcome.
  The user reaches step 2 (the residual cost is RB-1, not a trap).
- **Does the fix let anyone skip account creation?** No. The wizard stack
  only mounts under `if (!user) return <WelcomeStack />;`
  (`RootNavigator.js:1601`), so `user` is always non-null here, and
  `user.isLocal` is unreachable (no anonymous mode,
  `IDENTITY_AND_OWNERSHIP_LOCKED.md`). Advancing is exactly what the
  navigator already decided.
- **Does it race the draft restore?** No. The auto-advance sets `step = 2`
  synchronously on mount; the async restore then applies
  `setStep((s) => Math.max(s, sexValid ? draft.step : Math.min(draft.step, 2)))`
  (`:564`). `Math.max(2, 6) = 6` restores correctly, and
  `Math.max(2, 2) = 2` keeps a sex-invalid draft pinned at the gate. The
  F11 clamp is untouched.
- **Does it weaken the sex gate?** No. `advanceFrom2` (`:716-719`) and the
  belt-and-braces re-check inside `advanceFrom6` (`:974-984`) both still
  refuse; `parseDraft` still never invents a value
  (`proOnboardingDraft.js:55-65`).

### 3.3 RB-7 — LATENT. A retry keeps the *old* enrolment weight.

`:1071` skips `logBodyMetric` whenever `priorBuild.weightLoggedAt` is set.
After a mid-build kill the draft restores at step 6 and `goBack()`
(`:598-602`) refuses only step 1 and step 2, so the user can step back to
step 2 and change their weight before resubmitting. The enrolment
`body_metrics` row then keeps the *first* weight forever, while
`saveLocalProfile` (`:1060`) and `logMorningWeight` (`:1096`, upsert per
local day) both carry the new one. Three surfaces disagree about the same
day. Cheapest honest fix: include the resolved `bwKg` in the build record
and re-log when it differs.

### 3.4 RB-8 — LATENT. The mark-after-write window survives.

`logBodyMetric` (`:1072`) then `markBuildProgress` (`:1078`); likewise
`generateAndSavePlan` (`:1178`) then `markBuildProgress` (`:1181`). A kill
between the two still replays. The window is milliseconds rather than the
whole build, so C5-P29-07's intent is largely met; recorded so the
residual is not mistaken for closure.

### 3.5 RB-9 — LATENT. The debounced draft save can fire mid-build.

The save effect (`:573-594`) reads `submittingRef.current` at effect-run
time, and a ref mutation does not re-run an effect. A user who edits
`recoveryRating` and taps Continue inside `DRAFT_DEBOUNCE_MS` (600ms,
`proOnboardingDraft.js:37`) leaves a live timer; it fires during the build
and re-saves a step-6 draft. `clearDraft` at `:1226` normally lands later
and wins, but the outcome depends on two AsyncStorage writes settling in
order. Deterministic fix: add `submitting` as a boolean **state** dep, or
clear `draftTimerRef` at `:936` where `submittingRef` is armed.

### 3.6 RB-12 — LATENT. Back is dead before anything on screen says so.

`:936` arms `submittingRef`, which the new BackHandler reads as "swallow
Back" (`:618`). `applyReminderPreferences` then runs at `:947`, and
`startSequence()` / `setBusy(true)` only at `:954-955`. In that window
step 6 renders an apparently-live Continue button and hardware Back does
nothing. Normally the OS dialog covers it; if
`requestNotificationPermissions` (`:906`) never settles on some OEM the
screen is permanently idle-looking and Back-dead, with no visible failure.
Pre-fix the build overlay at least covered this window. Smallest fix:
`setBusy(true)` at `:936` beside the ref.

---

## 4. ATTACK — back navigation

### 4.1 RB-C3 — CLEAN. The new handlers cannot bypass, double-fire, or strand.

- **Bypass.** `ProOnboardingScreen.js:617-621` acts only when `step > 2`
  and returns `false` at steps 1-2, so the required-safe baseline (sex,
  age, height, weight) is unreachable backwards and the account step keeps
  its fail-closed exit. `goBack()` (`:598-602`) independently refuses step
  1 and refuses step 2 once `accountCreated`. Consent lives in a different
  stack whose root is `Article9Consent` (`RootNavigator.js:691-701`), so
  there is nothing to pop and C5-P30-05 is untouched.
- **Double-fire.** Both handlers subscribe inside a `useEffect` with a
  matching `sub.remove()` cleanup (`ProOnboardingScreen.js:622`,
  `FreeStarterScreen.js:101`), and the dep lists (`[step, accountCreated]`,
  `[step, busy]`) re-register rather than accumulate. RN invokes handlers
  newest-first, so an open `BottomSheet` (`BottomSheet.js:257`) or an
  `appAlert` `Modal` (`AppAlert.js:88`, `onRequestClose`) intercepts first
  — correct precedence.
- **Strand.** `FreeStarterScreen.js:97` swallows Back while `busy`, and
  `busy` is only ever set inside handlers whose every failure path resets
  it (`:116-117`, `:179-180`). The success paths unmount the screen
  (`completeFirstRun` swaps the navigator; `popToTop`), so a stuck `busy`
  has no reachable state.
- **The one uncovered root.** `ProSetupCompleteScreen`, `FirstRunScreen`
  and `Article9ConsentScreen` register no handler. For the consent screen
  that is deliberate and correct (exit is the fail-closed outcome). For
  `ProSetupComplete` it is the trigger for RB-1.

### 4.2 RB-11 — LATENT. `appAlert` ignores `options.onDismiss`.

`AppAlertHost`'s backdrop path resolves through the **cancel button's**
`onPress` (`AppAlert.js:80-84`); `options.onDismiss` is never read. Two
sites pass it — `planSwitch.js:56` and `PlansScreen.js:463` — and both
survive only because they also give the cancel button an `onPress` that
resolves the same promise. A future confirm that relies on `onDismiss`
alone will hang its `await` forever and freeze whichever write it gates.
Fix: either honour the option in `onBackdrop`, or delete the two dead
usages so nobody copies the pattern.

---

## 5. ATTACK — plan activation twice

### 5.1 RB-3 — DEFECT (MEDIUM). No activation path holds a synchronous entry guard.

`FB-35` records the block transition as CLEAN because "the restart is
behind an explicit confirm plus a re-entry guard, so a double tap cannot
create two blocks" (`FIRST-BLOCK-JOURNEY.md:73,1179`). The guard is real
but sits in the **wrong place**: `restartingRef` is checked and set inside
the alert's `onPress` (`PlansScreen.js:355-356`) and released in the
`finally` (`:408`). It prevents two *concurrent* activations. It does not
prevent two *queued alerts*.

**Mechanism.** `appAlert` is a queue, not a dialog
(`AppAlert.js:24-32,45-59`): a second call while one is showing pushes to
`queueRef` and is displayed the instant the first dismisses
(`dismiss` → `showNext()`, `:69-74`). `handleRestartPlan` performs no
check before calling `appAlert` (`PlansScreen.js:325-348`). FQ-2 now
renders **two** option buttons side by side (`:989-1006`), each calling
`handleRestartPlan(opt.intent)` with no `disabled` state.

**Repro.** Two-finger simultaneous tap on "Repeat" and "Continue with
adjustments" (or any two taps landing in one JS batch, before the modal
commits). Two alerts queue. Confirm the first: activation A runs, the
`finally` releases the ref, and the second alert — whose copy reads
"Run this plan again?" — is already on screen. Confirming it (a natural
response to a dialog the user believes is their first tap re-appearing)
runs activation B. `activatePlanWithBlock` (`database.js:3715-3752`)
deactivates every mesocycle and inserts a new one, so the block created
seconds earlier is discarded, its ledger seed with it.

**The same shape, worse, on the paths with no ref at all:**

- `PlansScreen.handleSetActive` (`:445-480`) — no entry guard; the
  `!activePlan` confirm at `:455-467` is skipped entirely once a plan is
  active, so two taps go straight to two `activatePlanWithBlock` calls.
- `PlanLibraryScreen` "Add and start this plan" (`:393-412`) — no guard;
  two taps produce two library copies **and** two activations.
- `ManualBuilderScreen.handleSaveAndActivate` (`:780-801`) — `setSaving(true)`
  happens *after* the awaited confirm, and `confirmPlanSwitchMidBlock`
  returns `true` **silently** in week 1 (`planSwitch.js:38`), so a first-week
  double tap runs two activations with no dialogue in between at all.

**The concurrency case is worse than the sequential one.**
`activatePlanWithBlock` is `UPDATE mesocycles SET is_active = 0` (`:3720`)
then `INSERT ... is_active = 1` (`:3742`), with an `await` between. Two
overlapping runs can interleave as A.UPDATE → B.UPDATE → A.INSERT →
B.INSERT, leaving **two rows with `is_active = 1`** for one user. Every
consumer of `getActiveBlock` then depends on row order.

**Minimal fix.** One synchronous `activatingRef` checked and set at the
**top** of each of the four handlers (before `appAlert` / before the
awaited confirm), released on cancel, on error, and after the reload —
the exact `startingRef` pattern `FreeStarterScreen.js:46,137,142` and
`ProOnboardingScreen.js:337,935-936` already use. Optionally belt-and-brace
it in the data layer by wrapping the deactivate+insert of
`activatePlanWithBlock` in `runInTransaction` (already imported in
`planAutoGen.js:25`), which closes the two-active-rows interleave for
every caller at once. No schema change, no gating change.

### 5.2 RB-5 — DEFECT (LOW). An activation throw on PlanLibrary is silent.

`PlanLibraryScreen.js:393-412`: the `try` wraps only `copyPlanFromLibrary`
(`:395-401`). `confirmPlanSwitchMidBlock` (`:402`), `activatePlanWithBlock`
(`:404`), the success toast (`:409`) and `navigation.goBack()` (`:410`)
all sit outside it. A throw inside `activatePlanWithBlock` — its tail
alone calls `generateMesocycleWeeks`, a dynamic `import('./algorithms')`
and `generateInitialPlannedVolume` (`database.js:3752-3754`) — rejects an
async `onPress` with no handler: no toast, no navigation, no active plan,
and a stray copied programme left behind. Every sibling path wraps the
activation (`PlansScreen.js:468-479`, `FreeStarterScreen.js:144-181`,
`ManualBuilderScreen.js:792-808`). Fix: extend the existing `try` to the
end of the handler and add the same error toast.

### 5.3 RB-6 — LATENT. The FreeStarter dedup is keyed on the plan name.

`FreeStarterScreen.js:154-155`:

```js
const existingPlans = await getAllPlansForUser(user.id).catch(() => []);
const existing = existingPlans.find(p => p.name === recommendation.name) ?? null;
```

Two consequences, both reachable from the screen's non-first-run entry
points (Home's and Plans' no-plan cards, `:27-29`):

- **Rename defeats it.** A user who renames their copy and re-runs the quiz
  gets a *second* copy of the same library plan — the original C5-P29-02
  outcome, minus the block reset.
- **A collision captures it.** A hand-built plan that happens to share the
  library name is adopted as "the recommendation" and activated with
  `recommendation.name` as the block label, without ever copying the plan
  the quiz actually chose.

`getAllPlansForUser` (`database.js:3774-3783`) correctly excludes library
and archived rows, so the archived-plan-resurrection variant of this
attack does **not** land. Sharper key: `source_programme_id` /
`source_routine_id` provenance, which `copyPlanFromLibrary` already writes
(`database.js:3403-3406`).

---

## 6. ATTACK — account switching, per-uid caches, sync during onboarding

### 6.1 RB-C5 — CLEAN. The cross-account gate still precedes every side effect.

`RootNavigator.js:1216-1284`: the whole sign-in body is wrapped in the IIFE
so the pending-deletion check (`:1224-1249`) and the different-uid modal
(`:1252-1273`) both run before any restore, sync or wipe; "Switch accounts"
snapshots first (`:1276-1281`). `_lastAuthEnter` is stamped before the
modal (`:1211`) but `SIGNED_OUT` resets it (`:1138-1140`), so the abort
path cannot poison a genuine re-sign-in.

**The attack that used to work, and now does not.** Abort with "Keep this
device's data" (`:1270`) or hit the pending-deletion return (`:1247`): the
IIFE returns before the consent check, so `healthConsentChecked` is never
set. If the user is then signed in with `firstRunComplete === false`, the
splash gate (`:1615-1617`) holds them forever. That is C5-P29-04's exact
shape — and it is now bounded by the 15s failsafe at `:1519-1528`, which
resolves the latch to `null` and routes **into** the Article 9 gate. The
abort path also signs out first, which clears `user` and disarms the gate
independently. Two independent escapes.

**Per-uid caches re-checked.** `restoreSessionFromCloud` bails at four
points on a uid change (`useAppStore.js:801-806,829,909,962`);
`completeFirstRun` writes both the global and the per-uid key
(`:1135-1138`); `resetFirstRun` writes both (`:1112-1113`). The one
asymmetry is `checkFirstRun` (`:1084-1091`), which reads only the global
key — harmless because `restoreSessionFromCloud:835` keeps the global in
lockstep with the per-uid cache, and an account switch wipes both.

### 6.2 RB-C7 / RB-14 — the pull racing the wizard.

`sync.js:1489-1506` applies the same fail-closed predicate the registry
runner enforces: `healthConsent !== true` (and any read failure) skips the
legacy pull entirely. C-2 is genuinely closed.

The residual (**RB-14, LATENT**): once consent *is* true, a foreground
sync is free to run during the Pro wizard.
`Article9ConsentScreen.js:165-175` deliberately kicks one right at the
gate. For a brand-new account there is nothing to pull. For a Free→Pro
upgrade (`resetFirstRun`, cloud already holds the free plan), a pull that
lands after `archiveOtherUserPlans(userId, prog.id)`
(`planAutoGen.js:230`) can restore programme rows with the cloud's
`is_archived = 0`, leaving a second unarchived plan beside the one the
wizard just built. Timing-dependent (the wizard takes minutes; the pull is
kicked at consent), so LATENT rather than DEFECT — but it is the same
last-write-wins seam as RB-3's, and a transaction around the archive+create
pair would narrow it.

---

## 7. ATTACK — notifications, permissions, offline

### 7.1 RB-2 — DEFECT (MEDIUM). The weekly-coach-ready push is wiped and never re-laid.

**Mechanism.** `restoreNotifications` opens with
`await cancelAllNotifications()` (`scheduler.js:1245` →
`Notifications.cancelAllScheduledNotificationsAsync()`, `:1201-1203`), then
deliberately re-lays eight families, each with a comment naming the same
historic bug ("the same historic wipe pattern that lost the cascade,
win-back and meal reminders"): morning + evening weight (`:1260-1264`),
check-in (`:1268-1274`), cascade gates + day-3 (`:1283-1294`), win-back
(`:1297-1303`), missed-check-in follow-ups (`:1305-1312`), planned-meal
confirm (`:1314-1322`), activation nudge (`:1324-1331`), meal reminders
(`:1333-1346`), training reminders (`:1348-1360`).

`scheduleWeeklyCoachReady` is **not** among them. Its only caller in the
whole tree is `WeeklyCheckInScreen.js:870-874`
(`grep -rn scheduleWeeklyCoachReady src/` returns exactly one non-scheduler
site). So the identifier `volyume_weekly_coach_ready`
(`scheduler.js:1111`) is destroyed by every `restoreNotifications` run and
resurrected only by the user's *next* check-in — a week later.

**Deterministic repro.**

1. Pro user submits a weekly check-in on Sunday evening.
   `WeeklyCheckInScreen.js:865-874` lays the Monday 09:00 push carrying
   `{ type: 'weekly_coach_ready', weekStart }` (`scheduler.js:1157-1159`) —
   the PM-01(b) param this campaign added.
2. Same evening, Settings → Notifications, nudge quiet hours end from 07:00
   to 08:00. `persistQuietHours` (`NotificationSettingsScreen.js:450-462`)
   calls `restoreNotifications(prefs, userId)` at `:457`.
3. `cancelAllNotifications()` removes `volyume_weekly_coach_ready`. Nothing
   re-lays it.
4. Monday 09:00: no push. The user's weekly coaching decision — the whole
   point of the check-in they just completed — goes unannounced, and
   `routeForNotificationType`'s new `weekStart` branch
   (`notificationRoute.js:39-48`) never gets the chance to fire.

**Second, unattended trigger.** `rescheduleForTimezoneIfChanged`
(`scheduler.js:1224-1236`) calls the same function whenever
`getTimezoneOffset()` moves. In the UK that is both DST transitions every
year, for every user, plus any travel. `App.js` calls it on launch.

**Why this belongs to Review B.** PM-01(b) is a Campaign 5 change; it made
the push carry state (`weekStart`) that only exists at check-in time, which
raises the cost of losing the schedule from "one missed nudge" to "the
param can never be reconstructed by any other path".

**Minimal fix.** Add a re-lay to `restoreNotifications` beside the check-in
one, gated the same way the schedule site is
(`prefs?.coachReady?.enabled !== false`) and `isPro`, reading the
`weekStart` from the pref blob — which means `WeeklyCheckInScreen`'s
schedule call should also stamp `coachReady: { ...prev, weekStart }` into
the blob it already read at `:846-847`. `scheduleWeeklyCoachReady` already
cancels its own identifier first (`:1143`) and re-derives the next Monday
(`:1147`), so the re-lay is idempotent and cannot fire in the past. No new
category, no push-budget change, no ED-adjacent behaviour: this reminder is
not weight- or food-adjacent. Note in passing that nothing in the tree
*writes* `prefs.coachReady` today — the three read sites
(`WeeklyCheckInScreen.js:865,871,872`) all fall through to defaults, which
is why the enable/hour preference is currently unreachable.

### 7.2 RB-C8 — CLEAN. Permission denial mid-flow.

- The OB-2 ordering survives the C5-P27-02 move: the blob write
  (`ProOnboardingScreen.js:885`) and the SQLite mirror (`:895-905`) both
  land **before** `requestNotificationPermissions()` (`:906`), so denying
  still cannot discard the chosen check-in day.
- Denial schedules nothing (`:907-927` is entirely inside
  `if (status === 'granted')`), and `restoreNotifications` returns before
  any schedule when the status is not granted (`scheduler.js:1242-1243`).
- A throw from the permission layer is caught at `:946-948` and setup
  continues — a deliberate improvement over the old outer-catch abort.
- Both Open Settings gaps are closed (`ProgressGhostCapture.js:406`,
  `CoachingRemindersScreen.js:428`).
- `CoachingRemindersScreen.js:265-281` still prompts on mount, and says so:
  "C5-P27-01 (D96) considered and deliberately NOT changed here… it is the
  ONLY place a Pro user with an undetermined status can grant permission
  for the two reminders it owns." Recorded as a deliberate decision, not a
  miss.

### 7.3 Offline / network loss at the write points — no defect found.

Every first-use write is local-first and the cloud legs are queued or
tolerated:

- Consent: `record_health_consent` failure queues `pendingConsent`
  (`Article9ConsentScreen.js:95-108`) and the local per-uid flag is still
  written (`:110-112`), so the user proceeds and the audit row is not lost.
- Trial grant: FQ-6.1's `pendingCascade` queue
  (`Article9ConsentScreen.js:143-153`) catches a network-shaped failure
  and never touches the tier locally; `FirstRunScreen.js:42-53,96-99`
  surfaces the pending state calmly on the free path the user is
  temporarily routed to. This is a genuinely well-shaped path.
- Wizard: profile, body profile, targets, plan and block are all SQLite
  writes; only `saveNutritionTargets`' cloud leg can fail, and it is caught
  and logged (`ProOnboardingScreen.js:1134-1141`).
- `completeFirstRun`'s cloud mirror is explicitly fire-and-forget
  (`useAppStore.js:1144-1158`).

---

## 8. ATTACK — repeated taps outside the activation paths

### 8.1 RB-C4 — CLEAN. Check-in submit twice.

`WeeklyCheckInScreen.handleSubmit` guards on `busy || submitSuccess`
(`:770`) — React state, so a same-frame double tap passes both. It does
not matter: `saveWeeklyCheckin` (`database.js:5936-5947`) finds this
week's row by `created_at` within the local week window and **updates** it,
and the column map is preserving (`:5949-5957`). Two submissions write the
same values to the same row. The tail calls are all idempotent by
identifier — `scheduleNextCheckinReminder`, `scheduleWeeklyCoachReady`
(cancels its own id first, `scheduler.js:1143`), and
`scheduleMissedCheckinFollowups` (self-guarding).

### 8.2 RB-10 — LATENT. The Apply handlers use state where the campaign chose refs.

All six handlers open with `if (applyingKey || …) return;` and then
`setApplyingKey(…)` (`CoachOutputScreen.js:1164-1168`, `:1239-1244`,
`:1282-1285`, `:1335`, `:1375`, `:1424`). `applyingKey` is `useState`
(`:1029`), so the guard is one render behind — the precise failure
`ProOnboardingScreen.js:334-337` documents ("a ref is synchronous where
`busy` state is not").

Today no wrong number lands, because every handler re-reads its base
inside the try and both invocations compute from the *same* base:
`handleApplyTraining` reads `getPlannedMuscleVolume(nextTrainingWeekId)`
and upserts absolute values (`:1245-1256`); `handleApplyCalories` reads
`getNutritionTargets` and writes an absolute target (`:1169-1195`);
`applyCoachAdjustmentToActivePlan` likewise reads the active plan and
writes a whole replacement (`mealPlanService.js:472-497`). Convergent, so
CLEAN in outcome — but it is convergent by accident of shape, not by
guard, and the first relative (`+=`) apply added here becomes a double
apply. Fix: one `applyingRef` beside `applyingKey`, checked first.

### 8.3 RB-4 — DEFECT (MEDIUM). The FQ-2 tier reload races the focus load.

`PlansScreen.loadData` mints a request id (`:208`) but applies it to
**only one** setter — the ledger story (`:268-274`). `setBlockAdvice`
(`:236`), `setActivePlanData`, `setMyPlans`, `setArchivedPlans` and the
rest (`:220-233`) are all unguarded.

FQ-2 added a third concurrent trigger beside the focus effect (`:177-182`)
and the cloud-sync effect (`:186-191`): the tier effect at `:198-204`.
Sequence:

1. PlansScreen is focused; `loadData_A` is in flight, its closure carrying
   `tier === 'pro'`.
2. The entitlement lapses. `tier` flips to `'free'`; the effect at `:200`
   fires `loadData_B` with `isPro: false`.
3. `loadData_B` resolves first (warm SQLite) and paints the free card.
4. `loadData_A` resolves and calls `setBlockAdvice(advice)` unguarded,
   repainting the **Pro** card: both next-block options rendered
   unlocked, with the ledger framing line.

The ledger *rows* are correctly dropped (`:269` returns on a stale req),
so the card is inconsistent as well as over-permissive. **Entitlement is
not breached**: `handleRestartPlan`'s second lock (`:329-333`) routes an
`adjust` intent without Pro to the upgrade flow, and the seed mapping
(`:374`) forces `'repeat'` without Pro. So this is a display defect, in the
one surface FQ-2 exists to make honest.

Minimal fix: hoist the `if (req !== ledgerLoadRef.current) return;` check
to guard `setBlockAdvice` (and ideally the plan-list setters) as well as
the story — a one-line move of an existing guard.

---

## 9. Notes for the lead

- **RB-1 and RB-2 are the two worth actioning before the release-truth
  audit.** Both are cheap, both are squarely inside Campaign 5's own scope
  (RB-1 completes C5-P29-07 / C5-P30-01; RB-2 protects PM-01(b)), and
  neither touches an inviolable.
- **RB-3 is one guard repeated four times**, plus an optional
  `runInTransaction` in `activatePlanWithBlock` that would close the
  two-active-blocks interleave for every present and future caller. It
  contradicts no pin — `FIRST-BLOCK-JOURNEY.md:73` calls FB-35 CLEAN on
  the *concurrency* guard, which is accurate as far as it goes; this file
  records the queued-alert case it did not consider.
- **No finding here touches ED-safety, Article 9, billing, product IDs,
  free/pro gating or the deterministic engine.** RB-2 is the only
  notification finding, and the reminder in question is neither weight- nor
  food-adjacent, so NOTIFICATIONS_LOCKED's ED suppressions are unaffected.
- Two pin suites were run read-only and are green
  (`campaign5.firstUse.test.js`, `proOnboardingDraft.test.js`: 164 tests).
  No suite pins the behaviour any proposed fix would change.

---

*Campaign 5 Phase 43, Review B (interruption / state). Audit only: no
source, test, doc or configuration outside this file was modified, and
nothing was committed, pushed or stashed by this lane.*
