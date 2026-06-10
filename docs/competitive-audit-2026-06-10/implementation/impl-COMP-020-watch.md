# impl-COMP-020 — Apple Watch set-logging companion (Wear OS deferred)

> Round-2 implementation blueprint. Approved spec seed:
> `../competitive-audit-03-master-proposals.md` COMP-020 (Impact 8 / Effort 8).
> Gated on COMP-001 (the redesigned phone session screen is the spec the
> watch mirrors). No code changes in this document.
>
> **The one-line thesis:** in this niche the watch app that wins is not the
> one with the most features — it is the one that never loses a set and
> never desyncs the timer. Strong's watch app "crashes multiple times every
> workout, almost every set" ([JustUseApp problems page](https://justuseapp.com/en/app/464254577/strong-workout-tracker-gym-log/problems),
> catalogued in `../competitive-audit-01-performance-reliability-research.md`
> FM-1). Reliability IS the differentiator. Everything below is scoped to
> protect it.

> **Evidence note:** several primary pages (help.strongapp.io,
> help.hevyapp.com, findyouredge.app, dr-muscle.com, corahealth.app) block
> direct fetches; claims from them are search-extract-only and flagged
> "(extract)". GitHub sources were fetched directly.

---

## 1. Best-in-market bar

| App | What it ships on the wrist | Why it works | Source |
|---|---|---|---|
| **SmartGym** (Apple Watch App of the Year 2023; 4.9★, 65k+ reviews) | Watch-first: full routines, one-tap "log set + start rest" on a single button, crown adjusts set values, haptic tap when rest ends, runs fully standalone | The benchmark interaction: *one tap logs the set and starts the rest timer*; "a gentle haptic tap on your wrist signals when it's time. No staring at a countdown." Advanced editing is **opt-in**, not default | [smartgymapp.com/watch](https://smartgymapp.com/watch), [help.smartgymapp.com art. 59](https://help.smartgymapp.com/article/59-apple-watch-app) + [art. 134](https://help.smartgymapp.com/article/134-apple-watch-logging-interface) (extract), [iMore](https://www.imore.com/health-fitness/apple-watch/how-to-use-smartgym-apples-best-gym-based-workout-app) |
| **Hevy** | Start routines from the watch, log sets **with previous weights displayed**, rest timer with haptics; HR appears in workout details after the session; live sync lets you switch devices mid-workout | The previous-performance line + prefilled log is the load-bearing pair; live phone↔watch switching is the trust feature | [hevyapp.com](https://www.hevyapp.com/), [FindYourEdge 2026 round-up](https://www.findyouredge.app/news/best-strength-training-apps-apple-watch-2026) (extract), [Hevy Coach](https://hevycoach.com/features/client-app/) |
| **Strong** (post-rebuild) | Semi-standalone: needs an initial phone connection to load the workout, then runs independently; syncs back when reconnected. App Store notes cite a "fully rebuilt Apple Watch App with a new and improved sync engine" | The load-then-run-local model is the right resilience shape for gym basements — even the app whose old watch sync was its #1 complaint converged on it | [App Store release notes](https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577) (extract), [Strong help: About Apple Watch](https://help.strongapp.io/article/222-strong-for-apple-watch) (extract) |
| **Gymaholic** | Most complete standalone watch experience: create/edit workouts on watch, Siri logging, long-press edits, 3D animations | Proves the ceiling — and the cost: "the phone app feels secondary… animation rendering consumes battery faster" (extract). The ceiling is NOT our target | [FindYourEdge](https://www.findyouredge.app/news/best-strength-training-apps-apple-watch-2026) (extract), [MyHealthyApple primer](https://www.myhealthyapple.com/strength-training-using-apple-watch/) |
| **WorkOutDoors** (cardio, reliability reference) | "Most advanced and most configurable workout app for the Apple Watch"; one-time purchase; decade-long reliability reputation | Shows a tiny team can own a niche on the single axis of *it always works*; its constraint is watch battery, not software | [App Store](https://apps.apple.com/us/app/workoutdoors/id1241909999), [ncartron.org review](https://www.ncartron.org/workoutdoors-apple-watch-as-a-true-competitor-of-a-garminsuunto-running-watch.html) |

**Scope reference — MacroFactor:** their watchOS app (Sept 2025) ships food
logging + weight + glanceable macros only — a deliberately narrow,
workflow-count-bounded v1 for their core loop ([macrofactor.com/mm-sept-2025](https://macrofactor.com/mm-sept-2025/),
[macrofactor.com/apple-watch](https://macrofactor.com/apple-watch/)). Their
separate Workouts app launched Jan 2026 **phone-first, without a watch app at
launch** ([dr-muscle.com analysis](https://dr-muscle.com/macrofactor-workouts/)
(extract), [App Store](https://apps.apple.com/us/app/macrofactor-workouts-tracker/id6737156524)).
The most disciplined team in the adjacent category validates both halves of
our plan: narrow watch v1, and watch-after-the-phone-screen-is-final
(our COMP-001 gate).

**The single best:** SmartGym's *one tap = set logged + rest started + wrist
haptic when done* loop. That loop — not feature count — is what we copy.

**The expectation context (round 1):** a watch app is now table stakes at the
top of the category; 2026 round-ups test strength apps "from your wrist" as a
default criterion; "If you are on Apple Watch specifically, the integration
question matters as much as the app itself" — see
`../competitive-audit-01-steps-cardio-activity-research.md` §5
([FindYourEdge](https://www.findyouredge.app/news/best-strength-training-apps-apple-watch-2026),
[Jefit guide](https://www.jefit.com/wp/guide/best-apps-to-log-sets-and-reps-on-smartwatch-in-2026-top-7-tested/),
[Cora 200+-thread meta-analysis](https://www.corahealth.app/blog/best-workout-tracker-reddit)).

## 2. What fails

- **Strong (pre-rebuild) — the cautionary tale.** "Crashes multiple times
  every workout, almost every set"; "workouts will not transfer to the phone"
  ([JustUseApp](https://justuseapp.com/en/app/464254577/strong-workout-tracker-gym-log/problems)).
  Their own help centre documents the fragility surface: Live Sync requires
  no other workout app running on the watch, degrades on poor connections,
  and needed a dedicated troubleshooting article
  ([help.strongapp.io art. 211](https://help.strongapp.io/article/211-apple-watch-live-sync-issues) (extract)).
  Anti-pattern: **a chatty live-mirror protocol with no durable local queue** —
  when the channel hiccups, sets vanish and the session derails.
- **Hevy's support burden.** Even the better implementation needs a
  step-by-step sync troubleshooting guide (both watchOS and Wear OS): app
  must be open, Bluetooth+WiFi on, restart watch, quit other live-sync apps
  ([Hevy help](https://help.hevyapp.com/hc/en-us/articles/33996260919703-Hevy-Apple-Watch-Sync-Issues-Step-by-Step-Troubleshooting-Guide) (extract)).
  Anti-pattern: **making the user the sync engineer.** Our design must have
  no user-facing sync state to manage at all.
- **Gymaholic's scope creep.** Full standalone editing + 3D animation on the
  wrist → battery complaints and a phone app that "feels secondary"
  (extract). Anti-pattern: **building a second app instead of a remote.**
- **Volyume's own disabled Live Activity.** `modules/live-activity` was
  built and then disabled because the lock-screen label showed "Set 3 of 2"
  (computed N=current+1 against M=target on the native side) —
  `src/components/RestTimer.js:46-52`. Anti-pattern, now a house rule:
  **never let a second surface recompute session semantics. The phone
  computes every label and value once; remote surfaces render strings.**
- **Apple's own Workout app regressions** (watchOS 26 backlash:
  "worse in every way" — [MacRumors](https://www.macrumors.com/2025/11/20/apple-watch-users-workout-app-complaints/))
  show even platform owners lose users by redesigning a utility surface.
  The watch UI, once shipped, is frozen the way COMP-001's do-not-regress
  list freezes the phone screen.

## 3. User psychology

- **Moment of need:** the user taps **Start session** on the phone, racks it,
  and lifts. The watch must be *already showing the session* when they look
  at their wrist — zero hunting. iOS provides exactly this:
  `HKHealthStore.startWatchApp(with:)` launches the watch app from the phone
  when a session begins ([Apple docs](https://developer.apple.com/documentation/healthkit/hkhealthstore/startwatchapp(toHandle:completion:))).
  Placement is the product: the watch app has **no placement inside the
  phone app at all** — it joins the session, not the navigation.
- **Habit loop:** cue = wrist haptic when rest ends (FindYourEdge: haptic
  taps "keep your session moving without you having to think about it"
  (extract)); action = one tap on Log set; reward = instant tick + the next
  target already loaded. The loop closes in under a second, every 2–3
  minutes, all session.
- **Effort budget:** the phone's prefilled log is already 1 tap
  (`../competitive-audit-01-workout-screen-proposal.md`, "Taps to log
  (prefilled) = 1"). The watch must preserve 1-tap parity and *remove* the
  pocket-to-phone round trip (~10–15 s per set, 20+ times a session). What
  it removes is the pitch.
- **Emotional safety:** the watch shows numbers and a timer. No kcal, no
  streaks, no red states, no "hurry" copy. Rest-positive: the countdown is
  framed as rest earned, never time wasted. Because nothing emotional
  ships, there is no ED/wellbeing-flag behaviour to suppress (stated
  explicitly for the charter's constraint 3).
- **Trust mechanics:** the only trust state the user ever sees is the set
  tick. Optimistic tick instantly; a subtle "syncing" → "✓" transition when
  the phone confirms. Never a sync settings screen, never a retry button.
- **Word-of-mouth surface:** "my phone stays in the locker and it has never
  lost a set" — the exact sentence Strong's reviews say in reverse. Plus the
  small delight: the watch app opens itself when you start a session.

## 4. The Volyume implementation

### 4.1 v1 scope — exactly five things on the wrist

One screen during a session (plus a rest overlay). Each inclusion is
justified against usage evidence; everything else is deliberately out.

1. **Current exercise name + set position** ("Incline press · Set 2 of 4").
   Justification: orientation is the minimum viable content (SmartGym
   centres it; Gymaholic "tells you what exercise is up, which set you're
   on"). Both strings are **composed on the phone** and shipped ready to
   render (the Live Activity lesson).
2. **The beat line, mirrored from COMP-001:** `Last: 60 kg × 8 · Target 8–12`.
   Justification: Hevy's "previous weights displayed" is named in every
   round-up (extract); COMP-001 makes this the phone's single
   previous-performance mechanism — the watch mirrors it verbatim, no new
   grammar. First time: `First time · Target 8–12`.
3. **Log set — one full-width button using the phone's prefilled values**
   (weight + reps from `computeSetTargets` beat-rep prefill, shipped in the
   session script). One tap = set logged + rest started, the SmartGym loop.
   **Adjusting on watch: reps yes — crown only; weight no.** Rationale: the
   prefill already encodes the target weight; the only value genuinely
   unknown until the set ends is reps achieved. Crown turns nudge the reps
   figure from the prefill (bounded 1–50, haptic detent per step — the
   SmartGym crown-adjust pattern (extract)); the button label updates live
   ("Log 60 kg × 7"). Weight deviation means a plan deviation — that
   belongs on the phone where targets visibly recompute (COMP-015). This
   keeps the watch to one interactive control + one rotary input, the
   smallest editable surface that still avoids the "logged 8 but got 6"
   mis-log.
4. **Rest countdown with the phone's haptic escalation.** Mirrors the
   wall-clock timer exactly (shared `restTimerEndsAt` epoch; see 4.3).
   Wrist haptics map the phone's 3-2-1 escalation
   (`src/components/RestTimer.js:79-105`): 3 s `.click`, 2 s `.directionUp`,
   1 s `.notification`, 0 s `.success` + double tap. Controls: **Skip** and
   **+30 s** only (the phone keeps the full ±15/±30 row). Justification:
   the wrist haptic at rest-end is the single most-cited watch value in
   round-1 and 2026 testing (extract); adjustment beyond +30 is a phone
   task.
5. **Session attach/detach states.** No session: `Start a session on your
   phone to log here.` Session ends on phone: `Session saved. Nice work.`
   (auto-dismiss). That is the entire empty-state surface.

**Explicitly NOT in v1** (each maps to a failure in §2): starting/ending
sessions or picking routines on the watch (no standalone mode — proposal
line, and Gymaholic's trap); exercise swapping, reordering, warm-up
toggles, notes, RIR entry, set deletion (phone tasks); exercise animations
(battery); any chart or summary; any Pro upsell surface. The watch never
computes targets — the deterministic engine stays on the phone, full stop.

**Navigation within the session:** none by the user in v1. The watch renders
whatever `currentExerciseIndex` the mirror says; the phone's existing
auto-advance and superset-jump logic (`ActiveWorkoutScreen.js:821-851`)
drives it. When disconnected, the watch advances its local mirror using the
pre-shipped session script (same prefill rules, precomputed per set), and
reconciles when the phone catches up (4.3).

### 4.2 Free vs Pro

Workout logging is a **free** feature (CLAUDE.md gating list). The watch
companion is the same feature on another screen → **free tier**. Gating it
Pro would re-gate an existing free capability's surface — the category's
cardinal sin (hard constraint 2). The Pro story stays "wearable
integration" = coaching-side data (steps, HR-informed features later), not
the logger.

### 4.3 Sync architecture — phone is truth, watch is a durable remote

**State down (phone → watch): debounced mirror.**
A phone-side bridge module subscribes to the existing store slices
(`activeWorkout`, `workoutExercises`, `currentExerciseIndex`,
`restTimerEndsAt`, `restTimerActive` — `src/store/useAppStore.js:1000-1190`)
and publishes via `WCSession.updateApplicationContext` (latest-state-only
semantics, exactly right for a mirror: [Teabyte, Three ways to communicate
via WatchConnectivity](https://alexanderweiss.dev/blog/2023-01-18-three-ways-to-communicate-via-watchconnectivity)),
debounced ~300 ms. Two payload kinds:

- **Session script** (sent once at start + on any structural change):
  ordered exercises with display names, per-set prefills/targets/beat lines
  (all precomputed strings + values from `computeSetTargets`), per-exercise
  `restSeconds`, workout id, a `scriptVersion`.
- **Cursor** (sent on every change): `currentExerciseIndex`, logged-set
  counts, `restTimerEndsAt`, composed "Set N of M" string, `stateVersion`.

The script makes the watch render-complete while unreachable (the
Strong-rebuild load-then-run-local shape) without ever computing semantics.

**Events up (watch → phone): idempotent durable queue.**
Every watch action is an event `{eventId: UUID, seq, workoutId, type:
logSet|skipRest|extendRest, payload, wallClock}` written to a watch-local
persistent queue *before* any send. Delivery is dual-channel:

- Reachable: `WCSession.sendMessage` with reply handler — **sending from the
  watch wakes the iOS app in the background** (documented behaviour:
  [Teabyte](https://alexanderweiss.dev/blog/2023-01-18-three-ways-to-communicate-via-watchconnectivity),
  [Kodeco watchOS ch. 4](https://www.kodeco.com/books/watchos-with-swiftui-by-tutorials/v1.0/chapters/4-watch-connectivity)).
  Ack removes the event from the queue.
- Unreachable or no ack in 3 s: `transferUserInfo` — FIFO, queued by the OS,
  delivered when the channel returns, surviving app restarts (same sources).

The phone applies events **idempotently**: applied `eventId`s are persisted
(rides the existing WK-1 active-workout snapshot,
`useAppStore.js:33-95`), duplicates are dropped, ack always returned. Apply
order is by `seq`; set numbers are recomputed phone-side on apply (existing
warmup/working numbering, `ActiveWorkoutScreen.js:725-732`). This is the
**never-lose-a-set guarantee**: a set exists on durable storage on the
wrist before the UI even ticks, and replay is harmless.

**Phone-side apply path (the one real refactor).** Set-logging currently
lives in the screen component (`handleCompleteSet`,
`ActiveWorkoutScreen.js:689+`). Watch events need a headless
`applyRemoteSetEvent` store action that reuses `createWorkoutSet` +
`addSetToCurrentExercise` + `startRestTimer` + the superset/auto-advance
rules — extracted from, and then shared with, the screen (after COMP-001
lands, hence the gate). PR detection/celebration fires only when the screen
is mounted; watch-applied sets queue the PR check result for the summary
instead (no celebration on the wrist in v1).

**Phone locked / backgrounded / killed.** JS is suspended in background, but
`sendMessage` from the watch wakes/relaunches the iOS app in the background;
the bridge boots, the WK-1 snapshot restores the session slice, events
apply. If iOS declines relaunch (rare), `transferUserInfo` holds everything
until next foreground — worst case the phone is seconds stale when picked
up, never wrong. Timer correctness is independent of all this because the
design syncs **`restTimerEndsAt` (a wall-clock epoch), never ticks** — both
devices derive remaining seconds locally, the same pattern the phone
already uses to survive backgrounding (`useAppStore.js:1150-1190`,
`RestTimer.js:59-69`). Skip/+30 from either side writes a new `endsAt` that
wins by `stateVersion`. Verified against the existing wall-clock design:
no per-second messages exist anywhere in the protocol.

**Conflict handling when both log.** Two taps are two intentional sets:
both apply, ordered by arrival, numbering recomputed. The real risk is the
impatient double-log (taps watch, no feedback, taps phone). Defences:
optimistic tick on the watch in <100 ms (local), a visible
pending→confirmed transition ("Syncing" → "On your phone ✓"), and the
phone's existing amber flash ack. Mis-logged sets are corrected on the
phone (set editing exists there); no destructive actions on the watch.

**Session ended while watch was offline:** late events for a completed
workout still apply to that workout's rows (never lose a set), with a
Debug-log flag; build note: verify WorkoutSummary recomputes totals from
the DB rather than a snapshot before relying on this.

### 4.4 HR / rings — run HKWorkoutSession in v1 (as infrastructure)

**Decision: yes, v1 runs an HKWorkoutSession (traditionalStrengthTraining)
on the watch for the duration of the mirrored session.** Evidence:

1. **It is the reliability mechanism, not a feature.** Without a workout
   session, watchOS suspends the app seconds after wrist-down and the
   rest-end haptic — the most-used watch feature — cannot fire. A workout
   session + `workout-processing` background mode keeps the app running,
   brings it back on wrist-raise, and permits background haptic alerts
   ([WWDC16 session 235](https://asciiwwdc.com/2016/sessions/235),
   [watchOS workout apps docs](https://github.com/MicrosoftDocs/xamarin-docs/blob/live/docs/ios/watchos/platform/workout-apps.md)).
   Every credible competitor runs one.
2. **Rings/HR credit is a stated user demand.** Reviewers "now distinguish
   an app that supports Apple Watch for set logging… from an app that
   actually uses Apple Watch health data"; the Strength-ring-credit
   complaint is documented (round-1 steps research §2/§5,
   [Cult of Mac](https://store.cultofmac.com/blogs/learn-about-your-apple-watch/strength-is-the-missing-activity-ring-here-s-how-you-can-close-it)).
   Hevy surfaces watch HR in the post-session detail (extract) — presence
   expectation, not a coaching input.
3. **Duplicate-workout handling is ours to own.** The phone already writes a
   TraditionalStrengthTraining HKWorkout with estimated kcal at session end
   (`src/lib/health.js:511-538`). Rule: if the watch session ran ≥50% of the
   workout, the watch saves the HKWorkout (real HR/energy) and the phone
   **skips** `writeWorkoutToHealth` for that session; otherwise phone writes
   as today. Apple Health's source-priority dedupe is the backstop, not the
   plan ([Cult of Mac](https://www.cultofmac.com/how-to/how-to-fix-apple-watch-duplicate-workouts),
   [Cadence](https://getcadence.app/support/why-do-i-have-duplicate-workouts-in-apple-fitness-or-apple-health/)).
4. **Privacy/PII compliance:** HR samples are written by watchOS into
   HealthKit and stay on-device in Apple's store. v1 does **not** read HR
   into Volyume's SQLite, does not sync it to Supabase, and sends nothing
   to any external service — no new PII surface, EU residency untouched
   (hard constraint 5). The HealthKit write permission and copy already
   exist (`app.json` `NSHealthUpdateUsageDescription`).
5. **Fallback:** if Health permission is denied on the watch, the session
   UI still runs; rest-end alerts degrade to a scheduled watch local
   notification at `endsAt`, and the permission sheet copy says plainly
   what is lost: `Allow workout access and this session counts towards
   your rings.`

What stays deferred: any *use* of HR in coaching (Pro wearable-integration
roadmap, founder maths review required), kcal display on the wrist (the
energy-balance stance in round-1 steps research argues against surfacing
burn numbers), and mirroring HR live on the phone screen.

### 4.5 Copy direction (house voice: plain, terse, no hype)

- Idle: `Start a session on your phone to log here.`
- In session: `Incline press` / `Set 2 of 4` / `Last: 60 kg × 8 · Target 8–12` / button `Log 60 kg × 8`
- Pending → confirmed: `Syncing` → `On your phone ✓`
- Rest overlay: `Rest 1:30` / `Skip` / `+30 s`; at zero: `Start next set`
  (matches `RestTimer.js:143`)
- Session end: `Session saved. Nice work.`
British English throughout; numerals tabular and the largest element on
every screen (house rule 8).

### 4.6 Accessibility

Full-width 50 pt+ log button (well above the 44 pt floor); tabular figures;
haptics never the sole channel (visible countdown + colour shift mirrors
the phone's `almostDone` warning state); VoiceOver labels mirror the
phone's RestTimer announcements (`RestTimer.js:154-160`); crown input has a
tap-target alternative (tap reps figure to step); Reduce Motion (mirrored
from phone prefs in the session script) disables the countdown pulse;
AssistiveTouch-compatible (single primary action per screen).

## 5. Whole-package integration

- **COMP-001:** the phone screen is the spec — beat line, prefill logic,
  1-tap log, haptic ack all reused as-is. The watch adds zero pixels to
  ActiveWorkoutScreen (sacred ground): the only phone-side UI is a one-time
  toast on first watch attach ("Logging on your watch too.").
- **COMP-019 (Live Activity):** same family, shared house rule (phone
  composes all labels; remotes render strings) — the fix for the "Set N of
  M" defect is specified once and consumed by both. On the wrist the watch
  app supersedes the Live Activity; the Live Activity remains the surface
  for non-watch users. The `modules/live-activity` + `modules/rest-timer-live`
  local-expo-module pattern is the template for the new `modules/watch-bridge`.
- **COMP-015 (visible autoregulation):** mid-session target updates flow to
  the wrist automatically via the session-script re-push — the watch shows
  the adjusted target with no extra work, strengthening perceived
  adaptivity.
- **Steps/cardio positioning (COMP-026, round-1 stance):** unchanged — the
  watch writes to HealthKit, it does not feed burns into nutrition.
  No duplication: the watch never grows its own stats, history, or engine.
- **Streamlining:** zero new phone surfaces, zero new tabs, no settings
  beyond one row in You → Settings → Health ("Apple Watch — logging works
  automatically during sessions") for discoverability.
- **ED/wellbeing flags:** nothing emotional ships on the wrist, so flag
  states require no watch behaviour change (and the watch never shows kcal).

## 6. Retention & word-of-mouth mechanics

The loop this feeds is session completion: wrist haptic → 1-tap log →
next target ready. It removes the per-set phone pickup, the top friction in
the 60–90 min core ritual. The tellable moments: "it opens on my wrist when
I start a session", and — against Strong's reputation — "it has never lost
a set, even with my phone in the locker." Watch presence also closes the
"no watch app" objection round 1 predicted would appear in comparison
reviews within 12 months (steps research §5).

## 7. Beating the benchmark

SmartGym wins on watch-first breadth; nobody in the niche wins on *provable
reliability of a remote* — Strong's history shows the cost of getting it
wrong and Hevy still needs a user-facing troubleshooting guide. Volyume's
design is the only one in the comparison set where (a) a set is durably
queued on-wrist before the UI ticks, (b) replay is idempotent end-to-end,
(c) the timer is a shared wall-clock fact rather than synced ticks, and
(d) the watch renders phone-composed strings so a whole class of
mismatch bugs (our own Live Activity defect, "Set 3 of 2") is structurally
impossible. Narrower than SmartGym, stricter than Strong's rebuild — and the
narrowness is what makes the reliability bar reachable.

## 8. Measurement

(Existing engine-telemetry allowlist needs four additions; same pattern as
migration 032 paywall events.)

1. `watch_session_attached` — % of sessions with the watch active (adoption).
2. `watch_set_logged` — share of sets logged from the wrist (usage depth;
   SmartGym-loop validation).
3. `watch_replay_recovered` — events delivered via the durable queue after
   a disconnect, and `watch_apply_duplicate_dropped` (the reliability bar
   made visible; target: recovered > 0, lost = 0, always).
4. Crash-free watch session rate from os-level diagnostics (target ≥99.5%)
   + zero set-loss reports in support (the inverse of Strong's #1 complaint).

## 9. Build notes, staging, effort vs I8/E8

**Feasibility under the no-eject rule (verified, with one loud flag):**
`@bacons/expo-apple-targets` supports a `watch` target type ("Watch App
(with companion iOS App)"), SwiftUI source lives in `targets/watch/` outside
the generated project, and "codesigning is theoretically handled entirely
by EAS Build" ([README](https://github.com/EvanBacon/expo-apple-targets/blob/main/packages/apple-targets/README.md),
requires Xcode 16 / SDK 53+ — we are on Expo ~54.0.35). **FLAG:**
[issue #175](https://github.com/EvanBacon/expo-apple-targets/issues/175)
(open as of Feb 2026, exactly our versions: expo ~54.0.9 /
apple-targets ^4.0.3) — prebuild generates broken watch embed/dependency
wiring on every run, which EAS re-triggers per build; a `patch-package`
workaround exists in the thread. Watch-target provisioning has its own
history ([eas-cli #2578](https://github.com/expo/eas-cli/issues/2578)).
The managed workflow holds — no eject needed — but **Stage 0 is a
go/no-go spike**, and the fallback options are the maintained
[@kingstinct/expo-apple-targets fork](https://www.npmjs.com/package/@kingstinct/expo-apple-targets),
upstream fix, or deferral. The watch app itself is native SwiftUI (React
Native does not run on watchOS); that is normal for this route, not a
violation. **Dependency approval required before Stage 0:**
`@bacons/apple-targets` (config plugin, MIT) — per CLAUDE.md, state and
wait for yes.

**Files/components touched:** new `modules/watch-bridge` (iOS WCSession
wrapper, local expo-module pattern per `modules/live-activity`); new
`targets/watch/` SwiftUI app; store: `applyRemoteSetEvent` action + applied-
eventId persistence riding the WK-1 snapshot; `ActiveWorkoutScreen.js`:
extract shared set-commit path (post-COMP-001); `src/lib/health.js`:
skip-phone-write rule when the watch session captured the workout;
telemetry allowlist +4 events. No DB schema changes. No Supabase changes
(sync layer untouched — watch data reaches Supabase only as ordinary
workout rows via the existing sync).

**Reliability test plan (the bar: never lose a set, never desync the timer):**
- Airplane-mode the phone, log 20 sets from the watch → all present after
  reconnect, zero duplicates (run replay twice to prove idempotency).
- Force-kill the phone app mid-session; log from watch → background
  relaunch applies; verify with phone locked in a different room.
- Double-log race: watch + phone within 500 ms → exactly 2 sets, correct
  numbering.
- Timer: adjust on phone → watch reflects ≤2 s; lock phone 10 min → parity
  within ±1 s on resume; skip on watch while phone backgrounded.
- Session ended on phone while watch offline → late events append, summary
  totals correct (verify summary recompute first).
- Soak: scripted 200-set session; 90-min battery budget <25% watch drain
  (no animations, no per-second messaging keeps this realistic).
- Watch app force-quit mid-rest → relaunch restores from queue + context.

**Staging:**
- **Stage 0 (spike, ~1 wk):** hello-world watch target through EAS with the
  #175 patch; go/no-go.
- **Stage 1:** phone-side bridge + protocol + `applyRemoteSetEvent`
  (unit-testable without hardware; engine-invariant tests extended).
- **Stage 2:** SwiftUI watch app (session screen, crown reps, rest overlay,
  HKWorkoutSession, durable queue).
- **Stage 3:** reliability matrix + closed beta; ship behind a quiet rollout.

**Wear OS deferral rationale:** (a) the category bar and every 2026
comparison review is watchOS-first; Strong ships no Wear OS at all;
MacroFactor shipped watchOS only. (b) Wear OS adds a second protocol
(Wearable Data Layer), a second native app, and Tizen-era fragmentation
(Hevy supports Galaxy Watch 4+ only and carries a dedicated Wear OS
troubleshooting guide — [Hevy help](https://help.hevyapp.com/hc/en-us/articles/34895840771479-WearOS-Watch-Compatibility-and-Syncing-Troubleshooting) (extract)).
(c) The honest tension: Volyume is live on Google Play today, so Android
users arrive first — noted, and mitigated by making the protocol
platform-neutral JSON (script/cursor/event contract) so the Wear OS app
reuses it wholesale. Trigger for starting Wear OS: Android watch demand in
COMP-025 cancel-capture reasons / support volume, after the watchOS
reliability bar is proven. Sequencing watch work behind the iOS launch
calendar is a founder call to schedule, not a blueprint blocker.

**Effort sanity-check vs E8:** E8 holds — but only because of the narrow
scope. Native SwiftUI app + new sync protocol + background-wake QA + the
plugin-patch risk is genuinely the largest single build in the approved
list; any scope addition (weight editing, standalone start, Wear OS in the
same cycle) tips it past 8. Impact 8 likewise holds: table-stakes presence
+ the only credible "most reliable watch logger" claim in the niche.
**Risks:** (1) expo-apple-targets wiring bug persists → patch-package debt
on every SDK upgrade; (2) background relaunch behaviour varies across iOS
versions → mitigated by the durable queue making it an optimisation, not a
correctness dependency; (3) WatchConnectivity is Apple-private plumbing
with no SLA — the design never assumes delivery timing, only eventual FIFO
delivery.
