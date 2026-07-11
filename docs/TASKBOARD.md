# VOLYUME TASKBOARD — the single current task source

_Created 2026-07-10 by the docs staleness sweep. This is THE list the project
works from. Update it at every landing (add, move to done, re-verify).
Landed-item detail rolls to
`docs/ux-world-class-audit-2026-07-09/_HANDOVER-ARCHIVE.md` at each landing
(D41 token hygiene): this board holds only in-flight / queued / held._

## How this board works (D37 + D38 + D47 - restated)

- **D47 (order rule, founder 2026-07-11).** The board is worked TOP TO
  BOTTOM, every item, in order - the lead never selects, defers or
  re-prioritises items by preference. Blocked items are surfaced and the
  next in order starts immediately.

## (D37 + D38 detail)

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

## 0. FOUNDER MUST-FIX LIST (device-testing session, 2026-07-11) — TOP PRIORITY

_The founder's numbered hands-on list, given at session start. Do ALL of them
to completion, THEN pause with the detailed remaining task list. Status is
git-verified, not from memory. This section is worked before anything below it._

1. **Revert the new font.** DONE — Manrope backed out (`52e65dd`, `a6083f7`,
   `b2be386`), font is Inter again; D53 recorded (`36fc5d2`).
2. **Fix the unilateral workout flow** (no divergent per-side reps; one set,
   same reps both sides, guided side 1 -> transition -> side 2). DONE
   (`f94d156`, D54).
3. **Simplify routine headings on Today and Train** (name only; drop the
   days-per-week + date cram). NOT DONE — was deferred to "need a screenshot".
   Real live cause found: training frequency ("N x/Week") is baked into the
   plan NAME via `src/lib/planDisplay.js`, so it reads as name+frequency
   crammed. FIX = strip the frequency from the displayed heading (keep in data),
   same on Today (HomeScreen) and Train (PlansScreen). IN PROGRESS.
4. **Fix the empty third card on Progress** (Sessions + New Bests in a 3-slot
   layout, blank third). NEEDS VERIFY — a read found AnalyticsScreen's spark row
   already two-up flex (flex:1, no third slot); confirm there is no OTHER
   progress surface with the gap, else it is already fixed and shows on a fresh
   build. IN PROGRESS.
5. **Clean up the Coach screen.** PARTIAL. DONE (`f822a91`): removed the
   "private coaching based on your logs" footer, consolidated the check-in
   info onto the check-in row, fixed the "come back Sunday" vs dated-button
   mismatch (weekday-anchor bug). OUTSTANDING: the card/heading showing only
   "Your" (should be "Your week") and a final confirm the "This week" heading
   fits its content. IN PROGRESS.
6. **Pre/Post-workout meals.** Founder ruling: fully implement (off by default,
   populated + macro-redistributed when on) OR remove — not half-built.
   PHASE 1 DONE (`b53a817`): off by default, fully hidden when off, no empty
   cards / add-food prompts, back-compat kept. PHASE 2 NOT DONE (parked as a
   reduced version, which the founder's no-parking rule forbids): when enabled,
   auto-populate the pre/post slots with legitimate evidence-based meals and
   redistribute the day's macros across enabled meals. BUILDING NOW.
7. **Add a completion action to Dietary Needs** (Done/Save/Close). DONE
   (`2d17fff`, "Done" button).
8. **Fix the Dietary Needs reopen bug** (open/close/reopen dead). DONE
   (`2d17fff`, shared BottomSheet re-present race fix).
9. **Fix Body Metrics weight history** (only current shown, no history). DONE
   (`94cd1fe`): history now merges the morning_weights table too, not just
   body_metric_log.

**REMAINING TO COMPLETE THE LIST: #3, #4 (verify), #5 (the "Your" heading), #6
phase 2.** Only when all nine are complete does the queue pause for the founder
review.

---

## 1. IN FLIGHT

_Reconciled 2026-07-11 (D46 boundary): D42 AppAlert, logged-set row, D44
auto-advance cues, summary footer, picker first-open, CP-10 batch F and the
leg-day engine work (D45 + D46) all LANDED - detail rolled to
`_HANDOVER-ARCHIVE.md` TASKBOARD HISTORY per D41._

### D43 logger redesign blueprint - AUTHORED, AWAITING FOUNDER APPROVAL (2026-07-11)
- Research complete (Opus teardown: full ActiveWorkoutScreen read, all
  pinned tests mapped, Hevy corpus synthesised - report in session
  log). Blueprint authored by the lead:
  `docs/ux-world-class-audit-2026-07-09/D43-LOGGER-REDESIGN-BLUEPRINT.md`
  - the 3/10 is presentation/IA/cohesion, not capability; strong core
  preserved behind a new shell; 5 staged slots (S1 decomposition -> S2
  Now card + status strip -> S3 stable CTA + overflow diet -> S4
  in-place edit + plate readout -> S5 cohesion polish). RPE stays out
  per D14/D19 held list.   S1 slice 1 LANDED (LoggedSetRow + EmptyExerciseView extracted,
  guards re-pinned, suite green); next slices: sheets extraction,
  then S2-S5 per the blueprint. RECOVERY: blueprint doc is committed; on approval work S1
  from its Section 7.

### LANDED - CP-10 theming batch G, BOTH LANES (2026-07-11)
- Lane 2 (20 plain screens) `3adf551`; lane 1 (15 high-risk screens;
  SettingsDietary already live) `4947509`. Billing/consent/ED bounds
  held byte-identical, verified at lead review; guard suites
  re-anchored contracts-unchanged; batch flip-tests added; full suite
  685 suites / 8,480 tests green at the lane 1 boundary. Screen
  coverage now ~83/84 live (remaining static count to be re-verified
  at the next recon; stage-5 restart-prompt retirement unlocks at
  zero).
  Stage 5 landed `3d3eae8` (restart prompt retired - CP-10 COMPLETE).
  Manrope adopted `9148a6f` (D50 landed; Inter files removed).

### QUEUED LAST - D43 full-app pristine pass (founder, second amendment)
- CLOSING PHASE by founder order: every area polished to the
  pristine/world-class bar, cohesive (one-amalgamated-application
  mandate), using the SCORECARD-2026-07-10 rubric as the baseline
  instrument. Runs AFTER the defect fixes, the engine verdict, the
  remaining theming batches and the logger redesign, so it polishes
  finished surfaces. Lead-driven; founder holds taste vetoes.

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

### OPEN - EAS (APK) build failing after native changes (founder report)
- Founder reports the EAS build FAILING after item 14/15 native changes
  (keyboard-controller/zeego, expo-splash-screen, monochrome icon). CI
  Android build is GREEN (run 2611), so the break is EAS-specific.
  NARROWED (2026-07-11): `npx expo prebuild --platform android` runs
  CLEAN on this branch locally, so it is NOT a config-plugin/prebuild
  failure (the haptic-feedback class) - the break is downstream in the
  EAS Gradle/native compile stage or EAS environment. STILL BLOCKED on
  founder: share the EAS build logs (or grant EAS access); then
  diagnose + fix.

### LANDED - SD-11 applyRemoteSetEvent idempotency `7e0dabe` (2026-07-11)
- The await-spanning race fixed hands-on: eventId reserved
  synchronously before the DB await, released on failure so retries
  stay possible. Two new tests pin the mid-await race and the
  failure-release path. Store suites + lint green.

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
- **Brand font - LANDED (D50, `9148a6f`).** Manrope adopted and
  verified; founder holds on-sight veto at the device walk.

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

### Kala namak micro-call - RESOLVED (D52, 2026-07-11)
- Ruled KEEP with a sourcing note on the tip copy; detail in the
  decisions register. No open items remain in this section.

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
