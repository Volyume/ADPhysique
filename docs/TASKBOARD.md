# VOLYUME TASKBOARD — the single current task source

_Created 2026-07-10 by the docs staleness sweep. This is THE list the project
works from. Update it at every landing (add, move to done, re-verify)._

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


### DONE THIS SESSION (for the record; full detail in the handover)
- Inline dietary preferences LANDED (founder ask): shared
  DietaryPreferencesEditor rendered by BOTH SettingsDietaryScreen and the
  meal builder's new dietary sheet; link-out + stranding removed; ED nudge
  extraction-only; full suite green 8,391/0. Device checklist (9 steps) in
  the agent report via the handover.
- D35 edge auto-scroll LANDED `ed62aab` (still-finger reaction fix included;
  20 targeted suites / 152 tests + lint green; CI full suite arbitrates on
  push). Device checklist steps 1-12 in the agent reports via the handover.

### D35 - Drag reorder edge auto-scroll (LANDED, see above)
- **Source:** D35; handover resume point (1). Files: `src/components/DragReorderList.js` + its four consumer surfaces.
- **CURRENT STATE:** DragReorderList ships true long-press drag (landed `534e0e0`, D32) but has NO parent auto-scroll at the drag edge - dragging to the top/bottom of a screen-overflowing list will not scroll; the user must drop and re-drag to cross off-screen (disclosed in the component header).
- **END STATE:** dragging near the top/bottom edge auto-scrolls the parent list so a longer-than-screen list is reorderable in one continuous gesture.
- **ELEVATES BECAUSE:** drop-and-redrag is not the complete drag experience; edge auto-scroll makes reorder feel native on any list length.
- **Bounds:** no new dependency, pure-arithmetic worklets, Reduce Motion respected, chevron paths untouched (D35).
- **NOTE:** a concurrent agent is editing `DragReorderList.js` + four screens (this work). Docs lane must not touch `src/**`.

---

## 2. QUEUED (build slots - two agents at a time, lowest capable tier)

### LANDED - Inline dietary preferences + allergies in the meal builder (founder ask, 2026-07-10)
- **Source:** founder direct ask (verbatim in the handover resume point, committed `6db4d33`); item 4 landed `85c5fe1` as a chip/link + once-ever hint.
- **CURRENT STATE:** the meal builder's preferences surface only LINKS to the Settings dietary screen; tapping it navigates to Settings with no way back (founder-reported defect), and no selection can be made in place.
- **END STATE:** the diet + allergy selection is editable INLINE in the meal builder's meal preferences, reading and writing the SAME store/profile fields as SettingsDietaryScreen - one source of truth, a change in either place is the same change everywhere (suggestions, plans, sync); the navigation dead-end is gone.
- **ELEVATES BECAUSE:** users can set dietary needs where they actually build meals, without being ejected from their flow; the two surfaces can never disagree.
- **Bounds:** same ED-safe soft exclusion nudge, tier posture unchanged, same allergen_excludes sync ladder, no duplicate state anywhere. Verify-first per D38.

### D36b - FeedbackSheet + PeekMenu migration to shared BottomSheet
- **Source:** D36(b); handover resume point (2, NEXT SLOTS). Current state sourced from the D36 verify-first read (docs lane cannot re-read `src/**`).
- **CURRENT STATE:** FeedbackSheet and PeekMenu are the two never-finished custom-sheet targets named in `BottomSheet.js`'s own header; still hand-rolled, not on the shared gorhom sheet.
- **END STATE:** both migrated to the shared BottomSheet via a real restructure (imperative singleton API), matching the chrome and bottom insets of the other migrated sheets.
- **ELEVATES BECAUSE:** removes the last hand-rolled sheets, giving consistent gesture-native behaviour and correct insets everywhere; the header's own TODO is finally closed.
- **Bounds:** its own slot (real restructure, not folded into another migration).

### D36c - TalkBack sheet isolation
- **Source:** D36(c); handover resume point (2). Cross-cutting, RootNavigator-adjacent.
- **CURRENT STATE:** when a sheet is open, the host screen is not marked `importantForAccessibility` to hide it, so TalkBack can still reach content behind the sheet - a gap that compounds with every sheet migration.
- **END STATE:** host screen set `importantForAccessibility` (no-hide) while any sheet is open, restored on close.
- **ELEVATES BECAUSE:** screen-reader users get correct modal isolation across every sheet in the app; a genuine accessibility defect closes.
- **Bounds:** own cross-cutting slot; do not weaken any existing sheet a11y guard.

### Theming - remaining static components + ScreenBoundary + stage-5 gate
- **Source:** `CP-10-restart-free-theming-plan.md`; D16, D24, D29; handover THEMING COVERAGE TRACKER.
- **CURRENT STATE:** 100/108 theme-consuming components are live-reactive; 8 remain static (won't react to a live theme toggle). `ScreenBoundary` is a class error boundary that cannot consume the theme hook (open architecture question, not forced). The stage-5 honesty gate (retiring the restart prompt) stays blocked until a toggle's full dependency set is live.
- **END STATE:** the last 8 components live-themed, the ScreenBoundary architecture question resolved, and stage-5 cleared so restart-free theming ships fully with no stale surfaces.
- **ELEVATES BECAUSE:** the theme toggle becomes genuinely live and complete - no static islands, no restart, honest stage-5 retirement.
- **Bounds:** primitives-first staged rollout; ProGate/tier logic untouched; frozen static stylesheets stay byte-identical unless converted.

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
- **Device-walk backlog.** The fresh EAS build carries a large walk backlog: item 6 (max system font), item 13 (photo gallery), item 14 (keyboard/zeego + set-row menu), item 20 (drag reorder), weigh-in edit/delete, dietary needs, vitamins/micros, haptics, next-exercise reorder, bottom sheets, Help/FAQ, live theming, and VERIFY the timeline diary reverted to meal cards. Full step-by-step checklists are in the handover per item. Source: handover FOUNDER-SIDE ACTIONS + per-item checklists.

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

- `docs/exercise-planning-2026-07-09/` (plans A-G): all SHIPPED; retained as
  design reference only. Do not rebuild. Residual engine changes go through the
  register + D37/D38 triage.
- `docs/design-usability-audit-2026-07-09/`: D7 programme complete; only
  `coverage-00-SYNTHESIS.md` survives as a cited reference. Residual IDs are
  tracked in the live campaign, not re-mined from that folder.
