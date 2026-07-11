# VOLYUME TASKBOARD — the single current task source

_Created 2026-07-10 by the docs staleness sweep. This is THE list the project
works from. Update it at every landing (add, move to done, re-verify).
Landed-item detail rolls to
`docs/ux-world-class-audit-2026-07-09/_HANDOVER-ARCHIVE.md` at each landing
(D41 token hygiene): this board holds only in-flight / queued / held._

## How this board works (D37 + D38 - restated)

- **D37 (staleness rule).** Nothing from a pre-campaign audit is built from its
  old blueprint. Every pre-campaign item is triaged against today's tree + the
  decision register first; superseded/reverted items are closed, not
  resurrected. All dated audit folders and loose audit/status docs now carry a
  SUPERSEDED/CLOSED banner pointing here. Work flows only from
  `docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md` and this board.
- **D38 (elevation rule).** A job being on a list, in an audit, or in an old
  queue is NEVER sufficient reason to build it. Before dispatch, the brief must
  state, verified against the tree: CURRENT STATE (what the app does today on
  that surface), END STATE (what the item delivers), ELEVATES BECAUSE (why the
  delta improves the app as it now is). Any item that cannot honestly carry all
  three drops to NEEDS JUSTIFICATION at the bottom of this board, not the queue.

Authority for every line below is cited inline (decision Dnn + source doc).
The full register is `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`.

---

## 1. IN FLIGHT

### D42 AppAlert overflow fix (founder defect report, dispatched 2026-07-11)
- **Source:** founder report (unilateral advice cut off at the bottom on
  Android); read-agent diagnosis in the session log. CURRENT STATE: the
  shared AppAlert card (src/components/AppAlert.js) has no maxHeight and
  no ScrollView, so title + message + actions can exceed a short
  viewport with the buttons unreachable; it is the surface behind the
  RECURRING unilateral one-side-at-a-time confirm (and every other
  alert). The first-timer walkthrough modal was already fixed (D36a
  inset; founder's build predates it). END STATE: AppAlert joins the
  proven contract - maxHeight cap, inner scroll region, Math.max bottom
  inset - so no alert can ever clip on either platform. ELEVATES
  BECAUSE: heals a live founder-visible defect on a shared, high-traffic
  surface. Bounds: chrome/behaviour of actions unchanged; a11y pins
  (AppAlert.a11y.test.js) kept; theming untouched. RECOVERY: if
  AppAlert.js sits uncommitted, lead-review against this spec, lint +
  full suite, commit + push; if untouched, relaunch from this entry.

### Logged-set row regression fix (founder defect, photo; dispatched 2026-07-11)
- **Source:** founder photo (build 2608); diagnosis in the session log.
  CURRENT STATE: zeego 3.0.6's Android asChild Trigger clobbers the
  cloned child's style with undefined (cloneElement({style: undefined,
  ...})), so every logged-set row (always menu-wrapped in production
  since f1bace6, item 14) loses flexDirection:'row' and stacks
  vertically, overflowing with 4+ sets; same pattern exists in zeego's
  iOS file. No test renders the wrapped path (gap). END STATE: rows
  condensed again on both platforms - compute the row style array once
  and pass it to BOTH the Trigger and the TouchableOpacity (lossless
  under the clobber, correct if zeego ever fixes it); NEW rendering
  test mounts the wrapped path (onDelete set) and pins the row layout.
  ELEVATES BECAUSE: heals a founder-visible layout break on the app's
  most-used surface. Bounds: menu wiring, openDeleteFromMenu ref flow
  and pinned zero-arg handleDeleteEditedSet untouched. RECOVERY:
  standard (lead-review vs this spec, lint+suite, commit+push, or
  relaunch).

### QUEUED NEXT - silent exercise auto-advance defect (founder, 2026-07-11)
- Founder: "It also seems to swap exercise when there's still a set to
  do at times without saying anything." Verify-first diagnosis next
  free slot: trace ActiveWorkout's exercise-advance logic (set-count
  completion checks, superset/giant-set N-aware jump from item 21,
  currentExerciseIndex re-pointing from the reorder sheet, unilateral
  two-phase completion) for any path that advances with sets remaining
  and no announcement. Then fix. ED/engine untouched - this is session
  navigation logic.

### leg-day over-volume - DIAGNOSED + D45 LANDED; D46 FULL FIX QUEUED (2026-07-11)
- Founder: builder generated 9 exercises for a leg day - "far too much
  volume for one session." DIAGNOSED (hands-on, full trace in
  DECISIONS D45/D46 + the build spec):
  1. **No per-session total cap existed** - only per-muscle (8/12) +
     time budget, and the sole-muscle-protection defeated the time
     budget too. **FIXED: D45 `da59274`** - MAX_EXERCISES_PER_SESSION=8
     / MAX_WORKING_SETS_PER_SESSION=25 hard caps + backstop. Shipped,
     tested, pushed. This is the SAFETY NET.
  2. **Root cause: no working secondary-muscle model.** Engine gives
     every leg muscle its own exercise, not crediting that squats/RDLs
     already hammer glutes/adductors (verified: `entry.secondary` read
     at planEngine.js:2091 but NO POOL entry populates it; only
     biceps<-back / triceps<-chest weekly trims function). Founder ruled
     **"do it all fully, we do not put off jobs"** = build the FULL
     per-exercise secondary-muscle model. **D46 BUILT (2026-07-11 fresh
     session, commit `19907a2`, adversarially reviewed): seed-mirrored
     secondary tags + generalised glute credit; mp leg day sheds the
     stacked second glute exercise; bikini/wellness/figure/womens
     untouched; full suite + lint green. Detail: DECISIONS D46 LANDED
     block.** Original spec (now as-built record): FULL MAPPED SPEC:
     `docs/ux-world-class-audit-2026-07-09/SECONDARY-MUSCLE-MODEL-BUILD-SPEC.md`
     (problem, reproduction, design halves A/B, phases 0-6, invariants,
     device checklist, code anchors). Deterministic-engine build, Fable
     spine hands-on, full test rework + adversarial review, clean window
     needed - do NOT start under usage pressure.

### QUEUED - D43 logger redesign blueprint (after point fixes; see D43 amendment)
- Founder verdict: logger 3/10, target 10/10, complete redesign
  cohesive with the app. Lead produces the blueprint (Opus legwork),
  founder approves, then staged build slots.

### QUEUED LAST - D43 full-app pristine pass (founder, second amendment)
- CLOSING PHASE by founder order: every area polished to the
  pristine/world-class bar, cohesive (one-amalgamated-application
  mandate), using the SCORECARD-2026-07-10 rubric as the baseline
  instrument. Runs AFTER the defect fixes, the engine verdict, the
  remaining theming batches and the logger redesign, so it polishes
  finished surfaces. Lead-driven; founder holds taste vetoes.

### QUEUED - workout summary footer overlap (founder photo, 2026-07-11)
- Founder photo (build 2608): on workout complete, the Close/Share
  footer floats OVER the exercise list ("Seated Leg Curl" hidden
  behind it) - scroll content missing bottom padding for the footer,
  or the footer missing an opaque background. Verify-first diagnosis
  + fix next free slot (WorkoutSummaryScreen; item 14 touched its
  scroll). Fold the surface into the D43 blueprint regardless.

### PRODUCTION CRASH TRIAGE - Sentry TypeError (2026-07-11, gated on connector)
- Sentry alert (email screenshot): TypeError "undefined is not a
  function", production, 02:14:15 UTC 2026-07-11, event
  a82ce651514f4a9085a0e3540b6e17bf, during the founder's live session
  on build 2608. Minified Hermes stack; lead symbolication from the
  run-2608 APK bundle narrowed the offset to RN's
  RefreshControl/ScrollView bytecode region BUT Hermes dedupes
  identical function bodies, so the offset is not uniquely
  attributable. NEXT STEP (blocked): founder enables the Sentry
  connector for this chat (connected at org level, enabledInChat
  false) -> pull the event's remaining 13 frames + breadcrumbs ->
  attribute and fix. CI note: android build workflow archives no
  sourcemap - queue a workflow tweak to save the Hermes map artefact
  so future crashes symbolicate exactly.

### ENGINE-CHECK EVIDENCE UPDATE (2026-07-11): founder's summary photo
- confirms 9 exercises / 21 working sets on a "Week 1 of 5 - Ease in"
  men's physique leg day (Men's Physique - Cut - V-Taper 4x/week).
  21 working sets is not an ease-in dose; strengthens the queued
  leg-day over-volume / division-weighting diagnosis above.

### LANDED - exercise picker first-open fix `2fd723b` (diagnosed 2026-07-11)
- DIAGNOSED (full report in session log): the void is FlashList
  committing a ~zero-height first native paint inside a freshly created
  Android Modal window (native window + insets warm-up race);
  ListEmpty and the create-custom footer are clipped with it. Second
  open self-heals (Android remounts the modal; native setup now warm).
  PRE-CAMPAIGN root: FlashList adoption 68f0462 (E8, 2026-07-02).
  Chips clean; search pure; recents unrelated (query non-empty).
  Jest cannot see this class (FlashList mocked to FlatList) - device
  checklist verifies. FIX (lead-ruled, D33): gate the FlashList (and
  browse-filter block) mount on the Modal's onShow so first layout runs
  against a presented window; no new dependency, one file. RECOVERY:
  if ExercisePickerModal.js sits uncommitted, lead-review vs this
  spec, lint + targeted suites, commit + push; else relaunch.

### LANDED - CP-10 screen theming batch F (both lanes, `3b182a7` + `c92a5ce`)
- 9 screens converted + 3 verified already-live (Settings family via
  useSettingsStyles - the recon grep missed wrapper-based theming).
  Full suite green at the boundary: 675/676, 8,412/0, lint clean.
  Coverage: 49/82 screens live, 32 static remain + paywallExcerpts
  exempt (HELD module, stays dark). Next batch recon must grep BOTH
  useTheme and useSettingsStyles signals.

### CP-10 screen theming batch F (two Sonnet lanes, dispatched 2026-07-11)
- Recon (Haiku, 2026-07-11): 37/82 screens live, 45 static.
  `paywallExcerpts.js` is the HELD social-proof module, not a themable
  screen (stays dark). Batch F = the 12-screen small tail, two lanes:
- LANE F1: SettingsDietaryScreen, SettingsAccountScreen,
  SettingsFaqScreen, SettingsScreen, PrivacyPolicyScreen,
  SubscriptionPolicyScreen (billing-adjacent COPY untouched).
- LANE F2: LoginScreen (auth logic untouched), ConsistencyScreen,
  WellbeingCheckScreen (ED-SAFETY: Beat UK signposting + calm-mode
  logic and copy byte-identical, theming only, STOP on doubt),
  QuizScreen, DebugLogScreen, GoalLockConsentScreen (consent gate
  logic untouched - GDPR care).
- Same batch pattern and bounds as D/E. RECOVERY: if any of these
  files sit uncommitted, lead-review against this spec, lint + full
  suite, commit + push; if untouched, relaunch from this entry.

---

## 2. QUEUED (build slots - two agents at a time, lowest capable tier)

### CP-10 screen theming - remaining batches (F onward)
- **Source:** `CP-10-restart-free-theming-plan.md`; D16, D24, D29; handover THEMING COVERAGE TRACKER.
- **CURRENT STATE:** components 105/110 live; screens 37/85 live at batch E close (48 static remain); the stage-5 honesty gate (retiring the restart prompt) stays blocked until a toggle's full dependency set is live.
- **END STATE:** every screen live-themed, stage-5 cleared so restart-free theming ships fully with no stale surfaces.
- **ELEVATES BECAUSE:** the theme toggle becomes genuinely live and complete - no static islands, no restart, honest stage-5 retirement.
- **Bounds:** batch pattern as D/E; ProGate/tier logic untouched; frozen static stylesheets stay byte-identical unless converted.

### QUEUED - DECISION ROUNDS (await founder input or assets; do NOT build until resolved)
_These are open decision forks, not dispatchable builds. Their elevation is
conditional on the decision; recorded here so they are visible, not lost._

- **Watch-app scoping round.** Source: D27 (watch app SCOPING approved); `docs/ux-world-class-audit-2026-07-09/watch-app-scoping-memo.md` (5 founder questions at the end, unanswered); handover AWAITING FOUNDER. CURRENT STATE: no watch app exists; HealthKit is removed; the scoping memo is written with 5 questions open, plus a side-finding (SD-11 idempotency defect in `applyRemoteSetEvent`) flagged must-fix-before-wrist-traffic. DECISION NEEDED: founder answers the 5 questions before any build brief. ELEVATION: deferred - cannot be claimed until the scope is set.
- **Brand-font shortlist.** Source: D25 (brand variable font via expo-font approved; founder retains taste on the final typeface, lead brings a shortlist). CURRENT STATE: app uses the system font; no brand typeface adopted. DECISION NEEDED: lead presents a shortlist -> founder picks -> adopt. ELEVATION: distinctive brand typography (asset/taste-gated).

---

## 3. FOUNDER-SIDE OPS (not agent work - only the founder can do these)

- **iOS Live Activity provisioning.** App Groups provisioning on BOTH App IDs (`app.volyume` + `app.volyume.widget`, then EAS credentials re-sync) + fresh EAS build. The Live Activity is ALREADY fully wired in code (item 19, `60190a7` docs-only fix). Source: D27; handover item 19.
- **Fresh EAS build (device-walk gate).** Required before device-walking this branch: native modules/code landed this campaign (keyboard-controller + zeego + peers, expo-splash-screen, themed monochrome icon, D34 Kotlin rest-timer bridge, react-native-haptic-feedback). CI Android build is GREEN (run 2611, `3daa3ae`) but a signed EAS build must still be produced. Source: handover FOUNDER-SIDE ACTIONS.
- **Play OAuth SHA-1 confirm.** Source: CLAUDE.md status banner; handover.
- **Run `refresh-off-snapshot.yml`.** Lands OFF branded micronutrient data into the bundled snapshot (the operational remainder of item 16). Source: D26/D37; handover.
- **migrate_117 apply.** Telemetry-view REVOKE (drafted + committed `653fe32`); needs the exact phrase "run against production", then re-verify grants and update the file header + `supabase/README`. Source: handover AWAITING FOUNDER; CLAUDE.md supabase rules.
- **Device-walk backlog.** The fresh EAS build carries a large walk backlog: item 6 (max system font), item 13 (photo gallery), item 14 (keyboard/zeego + set-row menu), item 20 (drag reorder), weigh-in edit/delete, dietary needs, vitamins/micros, haptics, next-exercise reorder, bottom sheets, Help/FAQ, live theming, and VERIFY the timeline diary reverted to meal cards. Full step-by-step checklists are in the handover (and its archive) per item. Source: handover FOUNDER-SIDE ACTIONS + per-item checklists.

---

## 4. HELD / NEVER RE-PROPOSE (visible in one place - do NOT build or re-surface)

- **Exercise media programme (#18)** - HELD, founder not funding it now (D14 assessment; D29 STILL HELD). Do not re-propose.
- **Rest-day notification (#22)** - HELD (D17 FQ-1 option 3; D29 STILL HELD). Recorded gated copy/trigger for if it ever unblocks; do not build.
- **Plate calculator** - REJECTED, moot for UK users (D14 assessment). Do not re-propose.
- **Paywall social proof (review excerpts)** - NO, stays dark (D14 assessment). Do not re-propose.
- **RPE/RIR reinstatement** - settled-removed; the effort picker stays out (D14; D19 addendum re-affirmed). Do not re-surface.
- **Flat timeline food diary** - built and REVERTED on the founder's device verdict; meal cards are canonical. NEVER re-propose (D37 item 15).
- **Supabase migrations 049 / 059** - HELD (CLAUDE.md status; `supabase/README`). Do not apply.
- **AI-assisted food input (photo meal-scan / voice)** - HELD by founder order, not rejected and not approved; do not build or re-propose unprompted (D27 addendum). (The coaching engine's no-AI rule is separate and absolute.)

---

## 5. NEEDS JUSTIFICATION - do not dispatch (D38: missing a verifiable field)

### Kala namak micro-call
- **Source:** handover resume point (2, NEXT SLOTS) names it as a remaining delegated micro-decision, "verify-first"; it relates to the dietary Phase B curated-meal work (D8/dietary rulings).
- **WHY PARKED:** the CURRENT STATE of this micro-decision cannot be honestly verified from the docs reviewed in this sweep (no kala-namak detail found in the ux-world-class-audit folder). Its end state and elevation therefore cannot be articulated. Needs the lead's dietary Phase B context to state current -> end -> elevation before it can enter the queue or be dispatched.

---

## Appendix - folded-in / reference-only sources (not build queues)

- Landed-item history: `docs/ux-world-class-audit-2026-07-09/_HANDOVER-ARCHIVE.md`
  (TASKBOARD HISTORY section) + the handover stage log.
- `docs/exercise-planning-2026-07-09/` (plans A-G): all SHIPPED; retained as
  design reference only. Do not rebuild. Residual engine changes go through the
  register + D37/D38 triage.
- `docs/design-usability-audit-2026-07-09/`: D7 programme complete; only
  `coverage-00-SYNTHESIS.md` survives as a cited reference. Residual IDs are
  tracked in the live campaign, not re-mined from that folder.
