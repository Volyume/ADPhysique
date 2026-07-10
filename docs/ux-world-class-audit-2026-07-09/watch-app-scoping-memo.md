# Watch-app scoping memo (round #25)

Date: 2026-07-10. Memo only — read-only research, no code or project
changes. Commissioned per `docs/ux-world-class-audit-2026-07-09/
CAMPAIGN-2026-07-10-APPROVED-SLATE.md:209` ("#25 Watch-app scoping memo ->
commission it, returns as a decision round").

This memo consolidates and re-verifies three prior in-repo research passes
against the CURRENT state of the repo (branch `claude/codebase-audit-docs-
pv6mjd`, 2026-07-10):

- `docs/watchos-scoping-evidence-2026-07-02.md` — raw sourced evidence, no
  recommendation.
- `docs/e14-watchos-scoping-memo-2026-07-03.md` — a prior watchOS-only memo
  that opens by stating "the founder has decided Volyume WILL add watchOS
  support". That framing is NOT treated as still-standing here: this round
  re-opens the question from scratch, at full ladder width (exploit-what's-
  built through full dual-platform build), because the campaign line asks
  for a fresh decision round, not a continuation of a prior one.
- `docs/wearos7-scoping-memo-2026-07-03.md` — Wear OS 7 companion memo,
  concluding "don't build now" against four prerequisites.

Every claim below carries a file:line or a dated citation into one of the
three source docs above. Where a fact could not be re-verified from the
current repo (Apple/Google platform behaviour, EAS provisioning history), it
is carried forward from the evidence pack UNVERIFIED and flagged as such —
never firmed up here.

---

## 1. What exists today (verified in-repo, 2026-07-10)

### 1.1 Named in telemetry, never wired to a client

`supabase/migrate_084_watch_telemetry.sql:1-121` allow-lists four cloud
event names on `record_engine_telemetry`: `watch_session_attached`,
`watch_set_logged`, `watch_apply_duplicate_dropped`, `watch_replay_recovered`
(migrate_084_watch_telemetry.sql:106-109). The migration header itself names
the intended emitter as `src/lib/watch/bridge.js` "(the first three;
`watch_replay_recovered` is allow-listed ready for when the native channel
tags recovered events)" (migrate_084_watch_telemetry.sql:13-15).

That file does not exist. `find src/lib -iname "*watch*"` (2026-07-10)
returns only `src/lib/__tests__/health.watchSkip.test.js`. Nor do the four
event names appear anywhere in `src/lib/telemetry/events.js` — the client
catalogue that `src/lib/telemetry/__tests__/telemetry.catalogue.test.js`
scans for real emitters. The docs/watchos-scoping-evidence-2026-07-02.md
pack flagged this same gap on 2026-07-02 (§3.3: "Doc inaccuracy to flag ...
no such file exists in the repo today"); it is still true on 2026-07-10. So,
plainly: the server is ready to accept watch telemetry, and a doc comment
names an intended file, but **no watch client code, watch bridge, or watch
UI exists anywhere in this repo.** This is scaffolding for a feature that
was scoped, not built.

### 1.2 The phone-side commit path already exists (COMP-020) and is real

`applyRemoteSetEvent(event)` in `src/store/useAppStore.js:1215-1282` is
documented in-code as "COMP-020: the headless, idempotent set-commit path
the watch bridge calls." It is genuinely wired and tested:

- Idempotent by `eventId` against `appliedRemoteEventIds`
  (useAppStore.js:1227-1229); rejects on no-active-workout or workout-id
  mismatch (:1230-1233).
- Reuses the same primitives the screen uses — `createWorkoutSet` (SQLite) +
  `addSetToCurrentExercise` + `startRestTimer` (:1240-1272) — and
  deliberately defers PR detection/celebration to the summary screen
  (:1217-1219).
- Snapshot persisted after every apply (:1275); contract-tested at
  `src/store/__tests__/applyRemoteSetEvent.test.js`.
- One known low-severity defect against it, not yet fixed: SD-11 — "the
  idempotency check spans an await; a replayed watch event can double-log a
  set" (`audit/01-codebase-audit.md:73`, cited at watchos-scoping-
  evidence-2026-07-02.md:211-214). Any wrist traffic must fix this first.

So: the phone is architecturally ready to *receive* wrist-originated set
events. Nothing on the wrist side exists to send them.

### 1.3 Wearables in the Pro tier list — named, not built

`CLAUDE.md:140` lists wearables among Pro-gated features: "cardio,
check-ins, Precision Coaching, division plans, wearables". This is a tier
placeholder, not a built feature. `docs/BACKLOG.md:19` is the accurate
current-state note: "No Apple Watch, Garmin, or Fitbit. **Carve-out:**
`src/lib/health.js` wraps HealthKit + Health Connect for one-way reads of
morning weight + step count, and writes completed workouts to the platform
Health app." Confirmed in-repo: `react-native-health` and
`react-native-health-connect` are NOT in `package.json` (evidence-pack §2.4,
re-grepped 2026-07-10, still absent). `src/lib/health.js` survives as a
~1,000-line lazy-require wrapper that no-ops when the native modules are
absent (health.js:1-25) — every call path is inert in current builds. The
one real watch-awareness that exists in logic is
`shouldSkipPhoneHealthWrite(workout)`, which skips the phone's estimated
Health write when `workout.watchSessionMs` covered ≥50% of the session
(health.js:590-601, pinned by `health.watchSkip.test.js`) — again, logic
written in anticipation of a watch that does not exist.

### 1.4 modules/live-activity and modules/rest-timer-live — what they actually do

Both are local Expo modules (`file:` deps), autolinked into the MAIN app
target — not separate app targets:

- `modules/rest-timer-live` (package.json:104) is Android-only Kotlin
  (`RestTimerLiveModule.kt` + `WorkoutForegroundService.kt`, its own
  `AndroidManifest.xml`) — a foreground-service module, not a companion app.
- `modules/live-activity` (package.json:88) compiles one Swift file into the
  main app target for the Dynamic Island / Lock Screen Live Activity. Its
  widget files (`VolyumeRestTimerLiveActivity.swift`,
  `VolyumeHomeWidgets.swift`, `VolyumeWidgetBundle.swift`) need a genuine
  **Widget Extension target** to render at all — the module's own README
  states this plainly (`modules/live-activity/widget/README.md:1-6`).

**This has now materialised**, which is new since the 2026-07-02/03 research
passes: `plugins/withVolyumeWidget.js:1-40` is a real Expo config plugin
(E6B, approved 2026-07-02) that creates the `VolyumeWidget` app-extension
target at prebuild time — copying the widget Swift sources, generating an
Info.plist and entitlements file, registering the target in the Xcode
project, and embedding the `.appex` (withVolyumeWidget.js:6-15). `app.json`
now carries `NSSupportsLiveActivities: true` (app.json:34), which the
evidence pack noted was still MISSING on 2026-07-02. The plugin's own header
comment states plainly it "Cannot be compile-verified on Linux: the first
EAS iOS build is the verification gate", and that the founder must first
provision the `app.volyume.widget` App ID with Live Activities + App Groups
capabilities in the Apple Developer portal before EAS credentials can sign
it (withVolyumeWidget.js:37-41). Whether that first EAS iOS build with the
extension target has actually happened could not be confirmed from static
repo state — this is the single most useful signal for watch-target risk
and should be checked directly (Apple Developer portal / EAS build history)
before any watch decision, not assumed either way.

### 1.5 react-native-android-widget — shipped and live

`react-native-android-widget ^0.20.3` (package.json:121) backs two shipped
free-tier home-screen widgets (COMP-019): `src/widgets/widgets.js` defines
`NextSession` (routine + planned day + week-in-block chip) and
`WeeklyConsistency` ("N of M sessions this week"), rendered as dumb
RemoteViews from a snapshot written by `src/lib/widgets/snapshot.js` /
`writer.js` (widgets.js:1-19). Explicitly never shows weight, calories or
body data — "the home screen is semi-public" (widgets.js:6-7) — and falls
back to neutral content under an open ED flag (widgets.js:14-16, COMP-018
suppression rule). This is real, tested (`src/lib/widgets/__tests__/
storage.test.js`), shipped Android functionality, and the nearest
functioning precedent for "small glance surface built without a companion
app."

### 1.6 Net picture

| Surface | State |
|---|---|
| Watch telemetry events | Allow-listed server-side only; zero client code |
| `applyRemoteSetEvent` (COMP-020) phone-side commit path | Built, tested, one open defect (SD-11) |
| `shouldSkipPhoneHealthWrite` watch-aware branch | Built, tested, dead code path (health.js inert without native health deps) |
| Wearables in Pro tier copy | Named in CLAUDE.md/BACKLOG.md; not built |
| iOS Live Activity widget extension target | Config-plugin now exists (new since 07-02); first real EAS build unconfirmed |
| Android home-screen widgets | Shipped, live, free tier |
| Any watch (Apple Watch or Wear OS) app or bridge | Does not exist |

The honest summary: Volyume has never shipped a line of watch code. What it
has is (a) a phone-side commit path built in anticipation of one, with a
known idempotency defect to fix first, (b) a proven small-glance-surface
pattern (Android widgets) that generalises reasonably well to "what could a
watch complication or tile show", and (c) — as of this week — its first real
precedent for standing up an *extra native target* inside the managed Expo
workflow, still unverified through an actual EAS build.

---

## 2. Platform reality for an Expo SDK 54 managed RN app

### 2.1 Apple Watch (watchOS)

React Native does not run on watchOS. A watch app is a genuinely separate
native SwiftUI target inside the iOS project, talking to the phone over
WatchConnectivity — new-platform work, not a port (e14-watchos-scoping-
memo-2026-07-03.md:9-16, corroborated by the `@bacons/apple-targets` README
quoted in the evidence pack: "Watch apps must be built in pure Swift/
SwiftUI. React Native does not support watchOS", watchos-scoping-
evidence-2026-07-02.md:293).

Under the "never eject" / config-plugin-only architecture rule
(CLAUDE.md §1), the only viable route is the community plugin
`@bacons/apple-targets` (4.0.7, published 2026-05-13), which supports a
`watch` target type generated into a magic `/targets` folder at prebuild
(evidence-pack §4.3). Signing is "theoretically handled entirely by EAS
Build" — the author's own word (evidence-pack §4.3). A closed but
UNVERIFIED-as-fixed issue (#175, opened 2026-02-18) reported broken
Watch embed/dependency wiring against Expo ~54.0.9 prebuild, with a
patch-package workaround; whether it is truly fixed in 4.0.7 is unconfirmed
(evidence-pack §4.3). EAS's own multi-target credential support
(`extra.eas.build.experimental.ios.appExtensions`) is still labelled
`experimental` and carries two prior GitHub issues of watch-target
provisioning failures on EAS specifically (eas-cli #795, #2578;
evidence-pack §4.4).

The repo has never shipped an extra Apple target of any kind. The nearest
precedent, the Live Activity widget extension (§1.4 above), is further along
than it was a week ago (a real config plugin exists) but its first EAS
build is unconfirmed. A watchOS companion is a heavier artefact again: its
own bundle id (e.g. `app.volyume.watchkitapp`), its own App ID and
provisioning profile, and — per the HealthKit gate below — likely its own
entitlement surface.

**The HealthKit gate, restated plainly** (evidence-pack §1-2,
e14-memo §1): a watch app that only mirrors state without `HKWorkoutSession`
lives ~2 minutes frontmost before suspending, has no fitness-eligible
extended-runtime session type, and loses live ticking wrist-down — its one
reliable beat is a wall-clock local notification haptic (the same pattern
`src/lib/notifications/restEnd.js:1-60` already uses on the phone). A watch
app that adds `HKWorkoutSession` gets true background runtime and HR
sampling, but Apple's documented flow has no authorisation-free session —
"a session-running app is a HealthKit-writing app" — which means the
HealthKit entitlement, both `NSHealth*` purpose strings, the
workout-processing background mode, and App Store Review 5.1.3/2.5.1
exposure, none of which the app carries today (app.json has zero NSHealth*
keys, confirmed still true 2026-07-10). This re-opens a surface the app
deliberately closed to zero when Health Connect/HealthKit were ripped out
(BACKLOG.md:19 carve-out language; task history "Rip out ALL Health
Connect/HealthKit", evidence-pack §2.4).

### 2.2 Wear OS

Confirmed via `docs/wearos7-scoping-memo-2026-07-03.md`: a Wear OS
companion is a genuinely separate native Kotlin/Compose Gradle module with
its own manifest and its own Play Console Wear OS release track. **No
Expo/EAS mechanism and no community config plugin exists for Android Wear
modules** — unlike iOS, there is no `@bacons/apple-targets` equivalent
(wearos7-memo:23-26). Every React Native "Wear" library found in that
research (e.g. `react-native-wear-connectivity`) is a phone-side Data Layer
bridge only; the watch UI itself is always native, no exception. Wear OS 7
(announced Google I/O 2026-05-19) — whose headline features are a
standardised Wear Workout Tracker and Wear Widgets — was Canary-only as of
that memo, both features shipping "later in the year"; the standardised
Workout Tracker itself assumes BODY_SENSORS-class permissions, i.e. exactly
the health-sensor surface this app removed (wearos7-memo:19-22). Nothing in
this repo's state has changed that picture since 2026-07-03.

UK market context carried from that memo, unverified beyond its own
citation: watchOS holds roughly half the UK wearable market; Wear OS reach
is essentially Samsung Galaxy Watch + Pixel Watch owners (wearos7-memo:41-43)
— i.e. for a UK-first app, the same engineering effort reaches materially
fewer users on Wear OS than on watchOS.

### 2.3 The cheap middle options (already partly in the repo)

- **Live Activity / Dynamic Island (iOS)** — `modules/live-activity`, real
  Swift module, config-plugin-generated widget extension target now exists
  (§1.4). Shows rest-timer countdown on the Lock Screen / Dynamic Island
  without a watch app; an Apple Watch mirrors Live Activities from a paired
  iPhone automatically via watchOS's own Live Activity support (this is an
  OS-level mirror, not app code — not independently re-verified here, flag
  as a cheap-tier claim to confirm before scoping it as a deliverable).
- **Android home-screen widgets** — `react-native-android-widget`, shipped,
  live, free tier (§1.5). No Wear OS tile equivalent exists or is planned;
  Wear Widgets (Jetpack Glance) is the Wear OS 7 feature still in Canary
  (§2.2).
- **Notification actions** — the existing rest-end local-notification
  pattern (`restEnd.js`) already fires a haptic on a paired, unlocked watch
  under Apple's own notification-routing rules, though the exact current
  routing matrix (phone-locked vs watch-worn conditions) was not confirmed
  against a first-party page and is carried UNVERIFIED (evidence-pack §1.1).
  Interactive notification actions (e.g. "+15s" / "skip" buttons on the
  rest-end notification, actionable on both platforms without any new
  native target) were not researched in the prior passes and are a genuine
  gap in this evidence base — flagged for the founder rather than assumed.

---

## 3. Product options ladder

Each rung states what the user gets, the engineering shape, new
dependencies/toolchain, EAS/build implications, maintenance weight, and what
it explicitly does not do. No rung is framed as the recommended one by
effort — the ladder is ordered by how much new artefact class it commits to
building, not by preference.

### Rung 0 — Exploit what's built, no new target

**User gets:** a wrist haptic at rest-end (mirrors existing phone
notification, extended with richer actions if iOS/Android notification
actions are added); a Live Activity / Dynamic Island rest countdown visible
on a paired Apple Watch via OS-level mirroring (unverified, §2.3); Android
home-screen widgets already live.
**Engineering shape:** finish wiring the SD-11 idempotency fix on
`applyRemoteSetEvent` (defensive hygiene, no watch traffic depends on it
yet); optionally add notification action buttons to `restEnd.js`; optionally
verify/document the Live Activity watch-mirror behaviour.
**New dependencies/toolchain:** none.
**EAS/build implications:** none beyond the already-queued Live Activity
widget extension build.
**Maintenance weight:** near zero — reuses existing tested surfaces.
**Does NOT do:** no companion app on either wrist platform, no set logging
from a watch, no standalone watch presence, no Wear OS surface at all.

### Rung 1 — Android widgets extended to Wear OS tiles (when Wear OS 7 ships stable)

**User gets:** a Wear OS glance tile showing next session / weekly
consistency, matching what Android home-screen widgets already show.
**Engineering shape:** net-new native Kotlin/Compose Wear module (no Expo
tooling exists for this — hand-built Gradle module, per §2.2); no phone-side
bridge needed if it only reads the same locally-written snapshot Android
widgets already consume, via a shared data layer.
**New dependencies/toolchain:** a Wear OS Gradle module folder outside the
Expo-managed build graph; Wear Widgets (Jetpack Glance) itself is
Canary-only today (wearos7-memo:14-18) — building now means building
against a moving pre-stable API.
**EAS/build implications:** a second Play Console release track (Wear OS
form-factor track), separate from the phone APK/AAB.
**Maintenance weight:** medium — one more native surface to keep in sync
with the snapshot writer, plus a Play track to maintain; UK reach is Samsung
Galaxy Watch / Pixel Watch owners only (§2.2).
**Does NOT do:** no set logging, no rest timer interaction, no
watchOS equivalent (this rung is Wear OS only).

### Rung 2 — Rest-timer mirror + set-tick companion, one platform (watchOS OR Wear OS), Path 1 (no HealthKit / no BODY_SENSORS)

**User gets (per e14-memo §4, the "minimal v1"):** current exercise +
target mirrored on the wrist from the App Group / Data Layer snapshot; log a
set from the wrist (one screen, prefilled, sends the COMP-020 event, shows
acknowledged/pending state); rest timer countdown with wrist haptic at
rest-end. Explicitly a **paired companion**, not phone-free — the phone must
be running for `WCSession.isReachable` to return true (evidence-pack §4.3);
same reachability constraint applies to the Wear Data Layer.
**Engineering shape:** SD-11 fix + a serialiser module for
snapshot/event shapes (pure JS, Jest-covered) is the shared prerequisite
regardless of platform (e14-memo §5); then a genuinely separate native app
target (SwiftUI watch app + WatchConnectivity, or Kotlin/Compose Wear module
+ Data Layer) with its own 3-screen state machine, XCTest/instrumented-test
coverage the JS suite cannot see, and a founder device-walk requiring a
paired physical watch.
**New dependencies/toolchain:** iOS — `@bacons/apple-targets` (new
dependency, MIT-class community plugin, per CLAUDE.md's "never add
dependencies without asking" this needs an explicit yes/no). Android — no
Expo tooling exists at all; either an in-house Data Layer module (matching
the shape of `modules/rest-timer-live`, no new dependency) or
`react-native-wear-connectivity` (MIT, single maintainer, named but not
adopted, wearos7-memo §"Decision requested" item 3).
**EAS/build implications:** iOS — a new bundle id + App ID + provisioning
profile (`app.volyume.watchkitapp`-class), riding whatever the Live Activity
extension target proves out (or fails to prove out) on its first real EAS
build. Android — a second Play release track, hand-built Gradle module
outside EAS's managed pipeline.
**Maintenance weight:** high — a second (or third) codebase in a different
language, its own test strategy, its own OS-version support matrix, and
every future phone release now also touches a watch target.
**Does NOT do:** no phone-free/standalone workouts, no HR display, no
complications, no browsing history/routines from the wrist, no nutrition
logging on the wrist. Single-platform only at this rung — the other wrist
platform gets nothing.

### Rung 3 — Rung 2, Path 2 (HealthKit `HKWorkoutSession`, watchOS only — Wear OS has no equivalent path that avoids BODY_SENSORS)

**User gets:** everything in Rung 2 plus true background runtime on the
wrist ("even when the user lowers their wrist", evidence-pack §2.1) and live
heart-rate sampling during the session — the shape users who know Hevy would
recognise as "a real watch fitness app" (e14-memo §1, "brutal verdict").
**Engineering shape:** Rung 2's build, plus wiring `HKWorkoutSession`,
requesting share authorisation for `workoutType`, and — as a strictly
separate, explicitly NOT-included-by-default decision — whether to display
(never persist) live HR.
**New dependencies/toolchain:** the HealthKit entitlement + capability;
`NSHealthShareUsageDescription` / `NSHealthUpdateUsageDescription` in both
the watch extension and, plausibly, the container app (evidence-pack §2.2,
flagged as a secondary source for the "both targets" placement rule).
**EAS/build implications:** same as Rung 2 iOS, plus the entitlement now
needs provisioning through EAS credentials.
**Maintenance weight:** highest — everything in Rung 2 plus a permanent App
Review 5.1.3/2.5.1 compliance obligation ("disclose the specific health data
you are collecting") and a permanently re-opened health-data surface the app
deliberately closed (§1.3).
**Does NOT do:** does not, by itself, add HR *persistence* into the
Supabase schema (that is explicitly out of scope per the ED-safety/GDPR
pass below regardless of chosen rung); does not extend to Wear OS (Wear's
standardised tracker requires BODY_SENSORS permissions with no lighter
path, §2.2).

### Rung 4 — Full watch app on both platforms

**User gets:** everything in Rung 3 for watchOS, plus a native Wear OS
companion built once Wear OS 7's tracker/widgets ship stable, feature-
matched as far as the two platforms' primitives allow.
**Engineering shape:** two permanent native codebases (Swift/SwiftUI +
Kotlin/Compose), two release pipelines, two device-walk matrices, ongoing
OS-version tracking on both.
**New dependencies/toolchain:** the union of Rungs 2-3's toolchain
decisions, made explicitly on both platforms.
**EAS/build implications:** two new bundle ids/App IDs/provisioning
profiles on iOS; a fully separate Play Wear OS release track on Android; the
managed-Expo "never eject" architecture now spans three native surfaces
(main app, watchOS target, Wear OS module) that must all be reproduced by
config plugins or committed native folders.
**Maintenance weight:** the heaviest rung by a wide margin — every future
phone release is gated on two additional native builds passing; team
capacity for two additional device categories with no simulator (CLAUDE.md's
"testing on device" workflow rule already assumes a physical Android phone
and cannot currently assume a physical Apple Watch or Wear OS watch, §4
below).
**Does NOT do:** nothing withheld at this rung by design — this is the
ceiling — but it does not by itself deliver phone-free/standalone workouts
(a further, even heavier rung Hevy's competitors occupy, per the
findyouredge.app round-up cited in the evidence pack §5.2, which explicitly
does NOT include Hevy).

---

## 4. Constraint pass

**Deterministic engine untouched.** Every rung above is capture/display
only. No rung proposes any coaching logic, set-selection, or adjustment
decision running on a watch or in the phone-watch bridge; `applyRemoteSetEvent`
already enforces this by design — it "reuses the same primitives as the
screen" and defers PR detection/celebration to the summary screen rather
than deciding anything wrist-side (useAppStore.js:1217-1219). Any watch
build must preserve this: the watch sends raw events, the phone (`database.js`
+ the deterministic engine modules) is the only place a decision is made.
This is a hard line per CLAUDE.md §2 ("no rewrites that alter outputs for
identical inputs") and every rung above respects it as scoped.

**Offline-first + sync queue implications for set logging away from the
phone.** The existing design already assumes the phone may be unreachable:
WatchConnectivity's `transferUserInfo` (or the Wear Data Layer's equivalent)
queues undelivered messages for delivery when the session next activates
(evidence-pack §3.3), and `WCSession.isReachable` requiring the RN app
running means the watch UI must carry an explicit "open Volyume on your
phone" state rather than a spinner (e14-memo §2, evidence-pack §4.3). This
is a SEPARATE queue from `src/lib/sync/queue.js` (the phone-to-Supabase sync
queue) — a watch-originated set event first lands in SQLite via
`createWorkoutSet` on the phone (the same local-truth path any phone-logged
set takes), and only then flows through the existing sync layer to
EU-Dublin. No rung above proposes the watch talking to Supabase directly;
that would violate "components never query Supabase directly" (CLAUDE.md
§1) even in spirit — the watch talks only to the phone, and the phone syncs
as it already does today. SD-11 (§1.2) is a prerequisite fix for ANY rung
above Rung 0 involving set-tick, not an optional hardening pass — a
double-logged set from a replayed event is a data-integrity bug the moment
real wrist traffic exists.

**Tier rules.** Wearables are already named as Pro-gated in CLAUDE.md §2
("Free/Pro gating is absolute and binary ... Pro: everything nutrition/
coaching ... wearables"). Every rung above must therefore sit behind
`proGate.js` / `withProGuard` before it ships — this includes Rung 0's
richer notification actions if they surface anything beyond the free rest
timer's existing behaviour, and definitely includes Rungs 1-4 in full. This
needs an explicit founder confirmation because CLAUDE.md's Pro list is
currently a placeholder ("wearables" is undifferentiated) — whether "log a
set from the wrist" specifically is Pro-only, or whether a bare rest-timer
mirror should be free (matching the free rest timer it mirrors), is not
decided anywhere in the repo today.

**EU data residency.** No rung above proposes new PII or health-data
persistence to Supabase. Set data logged from a wrist is identical in shape
to set data logged from the phone screen and flows through the same
EU-Dublin sync path already in place. The one item that would create NEW
data-residency surface is Rung 3's optional live HR display — and the
evidence pack is explicit that this must stay display-only: "wrist HR shown
live and discarded is one thing; persisting HR into our EU-Dublin schema
would be new Article 9 surface and is NOT in this scope" (e14-memo:59-60).
Any founder decision to pursue Rung 3 must carry that persistence line
forward explicitly, not silently.

**ED-safety — flagged hard.** No rung in this ladder proposes putting
weight, calorie, macro, or any other food/body-adjacent surface on a watch.
This is deliberate and should stay deliberate: CLAUDE.md §2 requires the
suppression system (calm mode, open ED flag) to gate weight/food-adjacent
notifications and the Pro progress-photo card, and no equivalent
suppression-aware code exists anywhere in a watch context because no watch
context exists. The competitive precedent MacroFactor represents — voice
food logging, calorie/macro gauge complications, a scrollable day timeline
on the wrist (evidence-pack §5.2) — is explicitly the kind of surface this
memo does NOT scope into any rung above, and any future proposal to add it
would need its own full ED-safety design pass (the suppression rules would
have to be ported to whatever native watch codebase exists, in whichever
language, correctly, before a single calorie number could ever appear on a
wrist) before it could be considered at all. This is flagged here explicitly
so it is not quietly assumed into scope by a future session reading only
this memo's ladder.

---

## 5. Founder decision questions

**Q1 — Which rung, if any, to commission for build.**
(a) None — stay at Rung 0 only (SD-11 hygiene fix, nothing wrist-facing).
(b) Rung 0 plus notification-action buttons on rest-end, on both platforms,
    no new native target.
(c) Rung 2, watchOS only (Path 1, no HealthKit).
(d) Rung 2, Wear OS only (Path 1, no BODY_SENSORS) — note this competes for
    the same UK-reach argument the Wear OS memo already raised against it.
(e) Rung 3, watchOS only (Path 2, HealthKit `HKWorkoutSession`).
(f) Rung 4, both platforms, phased.
(g) Something else — state it.

**Q2 — If any wrist-facing rung (c-f) is chosen: sequencing gate.**
The Live Activity widget extension target (§1.4) is the nearest in-repo
precedent for "does a config-plugin-generated extra native target actually
build clean on EAS." Should the founder require that build to be confirmed
working (a real EAS iOS build with the `VolyumeWidget` extension signed and
embedded) BEFORE committing engineering time to a watch target, given both
routes share the same class of provisioning risk?
(a) Yes — confirm the widget build first, treat it as the go/no-go signal.
(b) No — proceed on the watch target in parallel; treat the risks as
    independent.

**Q3 — HealthKit entitlement appetite (only relevant if Q1 = e or f).**
The app deliberately removed all HealthKit/Health Connect surface in a
prior pass (BACKLOG.md:19, evidence-pack §2.4). Rung 3 re-opens exactly one
narrow slice of it: `HKWorkoutSession` runtime + share authorisation for
`workoutType` only, with HR display-only and never persisted.
(a) Approved, scoped exactly as stated (session runtime + workoutType share
    only, no HR persistence, ever).
(b) Not approved — cap any watch build at Rung 2 (Path 1) indefinitely.
(c) Need more information before deciding (specify what).

**Q4 — Tier placement.**
Should a bare rest-timer wrist mirror (no set logging) be free, matching the
free phone rest timer it mirrors, with only wrist set-logging and any richer
wrist surface gated Pro? Or should any wrist presence at all sit behind Pro,
per CLAUDE.md's current undifferentiated "wearables" Pro listing?
(a) Rest-timer mirror free, set-logging Pro, matching the phone/Pro split.
(b) Everything wrist-facing is Pro, no exceptions.
(c) Something else — state the split.

**Q5 — Device-testing prerequisite.**
CLAUDE.md's workflow rules require every shipped change to include a manual
test checklist walked on a physical device; no simulator is used. A watch
build adds a device category (physical Apple Watch and/or physical Wear OS
watch) this project has not needed before, and ownership of either is
unconfirmed in the repo.
(a) Founder confirms a physical Apple Watch is available for device-walks.
(b) Founder confirms a physical Wear OS watch is available for
    device-walks.
(c) Neither is currently available — commissioning is contingent on
    acquiring one before build work begins on the relevant platform.
