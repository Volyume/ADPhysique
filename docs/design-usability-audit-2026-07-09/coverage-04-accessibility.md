# Coverage lane 04 — Accessibility (contrast + screen reader)

Part of `docs/design-usability-audit-2026-07-09/` (Batch 5, coverage-gap
lanes queued in `_CAMPAIGN-STATUS-AND-RESUME.md`). Read-only: no source file
was edited, only this doc was written.

## 1. Scope and method

**Scope (per brief):** WCAG contrast (body/secondary/disabled/placeholder
text, icons, borders, on-accent buttons, BOTH light + dark), TalkBack/
VoiceOver coverage (missing/duplicate/uninformative labels, unlabelled icon
buttons, decorative images, role correctness, state announcement), touch
targets (<44×44 or missing `hitSlop`), focus/reading order, dynamic type
(fixed-height clipping, `allowFontScaling={false}` misuse). ED-safety
surfaces checked for screen-reader reachability, never for weakening.

**Read first, not duplicated:** `00-MASTER-INDEX.md` (format/severity/
classes); the prior "P9 TalkBack" pass, `docs/volyume-elite-audit/inputs/
accessibility.md` (2026-07-04, F1-F7); `src/styles/theme.js` and
`src/styles/__tests__/theme.test.js` (the existing, executable contrast
contract for flat token pairs). Confirmed FIXED since that prior pass and
NOT re-reported: F1 (`ProGate.js` lock overlay/sheet now fully labelled),
F2 (`DiaryScreen`'s "move to meal slot" now a proper `BottomSheet`, no
longer a bare backdrop+View), F3 (`RoutineDetailScreen`'s Sets/Reps/Rest/
Weight inputs now carry `accessibilityLabel`), and the ESLint
`react-native-a11y` warning count (66 → 0; the plugin's structural rules
all pass). F5 (Chip `radio` role at `ExercisePickerModal`'s muscle/
equipment FILTER chips, `:350-379`) is STILL open exactly as previously
described; not re-counted here, only cross-referenced. F6 (large-text
device pass) and F7 (touch-target device pass) are unchanged asks; this
lane adds new static evidence under both rather than closing them.

**Method.** `theme.js`'s own token comments and `theme.test.js`'s
executable ratios were treated as authoritative for flat-surface text
roles (already correct, AAA/AA in both themes, re-verified by inspection,
not re-computed). Beyond that, this lane **independently recomputed WCAG
2.x contrast ratios** (same relative-luminance formula as `theme.test.js`)
for token PAIRS that are used in real components but never asserted by any
test: text rendered on a semi-transparent tint background (composited
against the actual parent surface), and a component's default placeholder
colour. AST-level and regex-level source scans (not a linter run) found
real componentised gaps in screen-reader labelling, state announcement,
and touch targets; each was opened and read in full before being reported.
No on-device TalkBack/VoiceOver session was run (static/source-level only,
same constraint as the prior pass).

**Counts.** 9 findings (AY-1 to AY-9). Severity: **A: 2 · B: 5 · C: 2**.
Class: **SAFE: 6 · JUDGEMENT: 3 · GATED: 0**.

---

## 2. Findings

### AY-1 — Every unlabelled `TextField` placeholder in the app renders below even the loosest WCAG bar
- **Area:** Contrast (placeholder text)
- **Severity:** A
- **Evidence:** `src/components/TextField.js:22` — `placeholderTextColor =
  colors.textDisabled` is the component's DEFAULT (used by every caller that
  doesn't explicitly override it). `theme.js`'s own comment on `textDisabled`
  (`:92`) says "disabled state only, no WCAG body-text requirement" and
  `theme.test.js:175-179` explicitly asserts it falls BELOW 4.5:1 on
  `background` — the token is designed for a genuinely disabled control, not
  for hint text inside an ENABLED, actively-editable field. Measured ratios
  (WCAG 2.x relative luminance, same formula as `theme.test.js`), computed
  against `TextField`'s actual default surface (`surface2`) and the
  `colors.inputBg` surface some callers pass explicitly:
  - Dark: `textDisabled` (#727272) on `surface2` (#2A2A27) = **2.99:1**; on
    `inputBg` (#1E1E1E) = **3.47:1**.
  - Light: `textDisabled` (#8E8E8B) on `surface2` (#EFEFEA) = **2.85:1**.
  Both fall short of the 3:1 non-text bar, let alone the 4.5:1 body-text
  bar placeholder text needs in practice (a low-vision user reading it
  before typing).
  **Confirmed live exposure** (call sites with a `placeholder` but no
  `placeholderTextColor` override, so they hit the broken default):
  `src/screens/AddCustomFoodScreen.js:328,329` (Name/Brand, via the file's
  `Field` helper at `:410-422`, `surface={colors.inputBg}` → 3.47:1 dark,
  Free-tier core flow), `src/screens/ScanBarcodeScreen.js:361-371` (the
  just-shipped L05-SB2 manual barcode-number entry, default `surface2` →
  2.99:1 dark), `src/screens/FirstRunScreen.js:68-77` ("What should we call
  you?", the very first text field a brand-new user ever sees, default
  `surface2`). `src/components/auth/EmailPasswordFields.js:22,39` has the
  same gap but is dead code (no import site found anywhere in `src/`; email/
  password auth was removed 2026-07-01 per CLAUDE.md) — noted, not counted
  as live exposure.
- **User impact:** A low-vision user (not using a screen reader, just
  larger system contrast/low vision, the group placeholder contrast exists
  for) cannot read what a field expects before typing, on the app's own
  custom-food name field, the barcode manual-entry field, and the first
  field of first-run onboarding.
- **Complexity:** S for the token fix (change one default), but the RIGHT
  colour needs a decision: `textMuted` (already used correctly as an
  explicit override at `RoutineDetailScreen.js:534,546,558,569` and
  `ExercisePickerModal.js:217`) clears 4.5:1 body-text on every surface in
  both themes per `theme.test.js:158-172` and would be a drop-in default
  swap with no other visual system change.
- **Options:**
  1. Change `TextField.js:22`'s default from `colors.textDisabled` to
     `colors.textMuted` (matches what most explicit overrides already use)
     and delete the now-redundant explicit `placeholderTextColor` props
     that only restate the new default.
  2. Same as (1), and add a `theme.test.js` case asserting placeholder
     contrast the same way body text is asserted, so this cannot silently
     regress to a "disabled" token again.
  3. Leave as-is — not recommended: this is the app's single shared text
     input primitive, so the fix is one line and fixes every current and
     future caller that doesn't override it.
- **Class:** SAFE (mechanical token swap; matches the pattern the majority
  of explicit overrides already use).

### AY-2 — `success`/`error` text on their own tint background fails AA at realistic elevations and in the light theme
- **Area:** Contrast (status badges/banners)
- **Severity:** A
- **Evidence:** The `*Bg` tokens (`successBg`, `warningBg`, `errorBg`) are
  semi-transparent tints (`theme.js:81-86` dark, `:179-182` light), so their
  rendered colour depends on whatever surface they sit over — a dimension
  `theme.test.js` never checks (it only tests flat `success`/`warning`/
  `error` ink against `#FFFFFF`/nothing, never the ink against its OWN `Bg`
  tint composited onto a real surface). Recomputed (WCAG 2.x, composited
  against all five surface steps):
  - **Dark, `error` on `errorBg`:** background 4.59:1 (passes) · **surface
    4.09:1 (FAIL)** · surfaceElevated 3.69 (FAIL) · surface2 3.36 (FAIL) ·
    surface3 2.96 (FAIL). Confirmed real site:
    `src/screens/AthleteProfileScreen.js:699,703` (`statusPill_attention` /
    `statusPillText_attention`, the "Update" pill), rendered inside a
    `<Card>` (`:198`, default `surface` per `Card.js`) → **4.09:1, fails
    AA** in dark. Also `src/screens/MesocycleBuilderScreen.js:397-405,444`
    (urgent deload banner, error text on `errorBg`).
  - **Light, `success` on `successBg`:** background **4.20:1 (FAIL)** ·
    surface **4.36:1 (FAIL)** · surfaceElevated 4.04 (FAIL) · surface2 3.82
    (FAIL) · surface3 3.57 (FAIL) — fails at EVERY elevation, including the
    plain screen background. Confirmed real site:
    `src/screens/AthleteProfileScreen.js:697,701` (`statusPill_fresh`, the
    "Fresh" pill) inside the same `<Card>` → **4.36:1, fails AA** in light.
    Also `src/screens/ActiveWorkoutScreen.js:2225-2227,3756-3757`
    (`targetBanner`, the "target reached" banner) and
    `src/components/RestTimer.js:541,550` (`doneContainer`, "rest
    complete") — both success-on-successBg, both fail in light theme
    wherever they land.
  - `warning` on `warningBg` clears 4.5:1 at every elevation in both themes
    (Okabe-Ito yellow is bright enough; 4.81:1 is its worst case, light
    surface3) — not a defect, no action needed there.
  - Both are small/caption-weight text (`type.caption`,
    `statusPillText`/`targetBannerText`/`doneText` etc.), so the applicable
    bar is 4.5:1, not the 3:1 large-text exception (11-13px, even at
    `fontWeight.black`, is nowhere near the ≥14pt-bold large-text
    threshold).
- **User impact:** A low-vision user cannot reliably read the "Update"
  status pill on Athlete Profile in dark mode, or the "Fresh" pill / target-
  reached banner / rest-timer-done banner in light mode — on a Pro-tier
  data-currency and training-feedback surface.
- **Complexity:** M — this is a systemic pattern (the app has no
  text-on-tint "ink" token, unlike the `onPrimary`/`onError` pair that
  already exists specifically for text-on-FILL colour), so the fix is a
  design decision, not a token swap in isolation.
- **Options:**
  1. Add `successInk`/`errorInk` tokens (a darkened success/deepened error,
     analogous to how `light.primary` is already a darkened ink distinct
     from `primaryFill`) reserved for text/icon ON the matching `*Bg` tint,
     and re-point every `statusPillText_*`/`targetBannerText`/`doneText`-
     style site at it.
  2. Keep one ink per state but restrict `*Bg` badges to rendering ONLY on
     `colors.background` (the one surface where dark-error and light-
     warning still clear the bar, though light-success still fails there
     too) — narrower fix, doesn't fully close the light-success case.
  3. Do nothing — not recommended: this is a real, measured AA fail on a
     small but recurring badge/banner pattern, not a judgement call about
     taste.
- **Class:** JUDGEMENT (the detection is settled; the remediation shape —
  new ink tokens vs. surface restriction — is a design decision).

### AY-3 — Five hand-rolled modal backdrops omit the `accessibilityLabel="Close"` their own codebase already standardises
- **Area:** Screen reader / interactive labelling
- **Severity:** B
- **Evidence:** `src/components/BottomSheet.js:112-117` is the established,
  shared pattern: a full-bleed backdrop `Pressable` with
  `accessibilityRole="button"` AND `accessibilityLabel="Close"`. Five
  sites hand-roll their own backdrop with the role but not the label, so
  TalkBack/VoiceOver announces a bare, nameless "button" sitting behind the
  visible sheet: `src/screens/RoutineDetailScreen.js:520` (`editOverlay`),
  `src/screens/PlanLibraryScreen.js:615` (plan-quiz sheet backdrop),
  `src/screens/PlansScreen.js:1020` (folder-rename prompt backdrop),
  `src/components/FeedbackSheet.js:248`, `src/components/PeekMenu.js:115`.
  (The INNER capture-layer `Pressable`s at `PlanLibraryScreen.js:616` and
  `PlansScreen.js:1021` already correctly set `accessible={false}` — only
  the outer backdrop is missing its label in all five cases.)
- **User impact:** A TalkBack/VoiceOver user swiping through any of these
  five sheets (an exercise-set editor used by every user, a plan-picker
  quiz, a folder-rename prompt, the app-wide feedback sheet, and the
  overflow peek menu) hits an unlabelled interactive element with no
  indication of what it does.
- **Complexity:** S — one prop per site, copying `BottomSheet.js`'s exact
  convention.
- **Fix:** Add `accessibilityLabel="Close"` to each of the five backdrop
  `Pressable`/`TouchableOpacity` elements.
- **Class:** SAFE (mechanical, matches an existing in-repo convention
  exactly).

### AY-4 — `RoutineDetailScreen`'s edit-exercise sheet has a phantom, functionless interactive node right before its form fields, and the sheet itself isn't marked as a modal
- **Area:** Screen reader / focus & content isolation
- **Severity:** B
- **Evidence:** `src/screens/RoutineDetailScreen.js:505-521` — a raw RN
  `<Modal transparent>` (not the shared `BottomSheet`) whose content is
  `<TouchableOpacity accessibilityRole="button" style={editOverlay}
  onPress={...dismiss}><TouchableOpacity accessibilityRole="button"
  style={editSheet} activeOpacity={1}>` (`:520-521`). The INNER
  `TouchableOpacity` (the sheet's own capture layer, meant to stop the
  backdrop's dismiss from firing when tapping inside) has **no `onPress`,
  no `accessibilityLabel`, and no `accessible={false}`** — unlike the
  correct version of this exact pattern at `src/screens/PlansScreen.js:1021`
  (`onPress={() => {}} accessible={false}`) or `src/components/AppAlert.js:
  94-104` (same capture-layer pattern, explicitly commented: "accessible=
  {false} stops the backdrop's 'Close' label from swallowing the card's own
  content"). Additionally, neither `Modal` in this file
  (`:505`, `:602`) sets `accessibilityViewIsModal` on its content, unlike
  `BottomSheet.js:134`/`AppAlert.js:104`/`FeedbackSheet.js:256`/
  `PeekMenu.js:123`.
- **User impact:** TalkBack/VoiceOver users editing a plan's exercise
  Sets/Reps/Rest/Weight (a Free-tier, all-user core builder flow) encounter
  a nameless, non-functional "button" immediately before the labelled
  Sets field (`:524-535`, already correctly labelled per the prior audit's
  F3 fix) — confusing traversal on the app's most-used plan-editing form.
  Without `accessibilityViewIsModal`, a screen reader may also let
  exploration escape to the dimmed background list behind the sheet.
- **Complexity:** S — same fix already applied two files over.
- **Fix:** Add `onPress={() => {}} accessible={false}` to the inner
  `editSheet` `TouchableOpacity` (or convert it to a plain `View`, since it
  has no gesture purpose of its own), and add `accessibilityViewIsModal` to
  the sheet content in both `Modal`s in this file.
- **Class:** SAFE (mirrors an existing, correct pattern in two sibling
  files in the same codebase).

### AY-5 — `EngineLog`'s collapsible header never announces expanded/collapsed state
- **Area:** Screen reader / state announcement
- **Severity:** B
- **Evidence:** `src/components/CollapsibleSection.js:9-19` is the shared,
  documented convention ("The header carries a ≥44px tap target and an
  accessibility expanded-state so the disclosure is screen-reader
  navigable" — `:7-8`), implemented as `accessibilityState={{ expanded:
  open }}`. 17 other disclosure toggles in the app already follow this
  (`ProgressSections.js:217`, `Dropdown.js:36`, `NutritionTargetsScreen.js:
  174,1230`, `BodyMetricsScreen.js:974,1066`, `WorkoutHistoryScreen.js:381`,
  `WorkoutSummaryScreen.js:1264`, `Article9ConsentScreen.js:259`,
  `ProOnboardingScreen.js:1570`, `ProSetupCompleteScreen.js:346`,
  `MealPlanScreen.js:822,864`, `PlansScreen.js:798,847`, plus
  `MicronutrientPanel.js:114` and `ProgressScanTrend.js:121`, both written
  as ES6 shorthand `{ expanded }`).
  `src/components/EngineLog.js:86` hand-rolls the same chevron-flip toggle
  (`open`/`setOpen`) with **no `accessibilityState` at all** — the visible
  header text ("Engine Log", a coaching-decision count) never says
  collapsed/expanded either, so there is no channel through which the
  state reaches a screen reader.
- **User impact:** A TalkBack/VoiceOver user cannot tell whether the
  Engine Log card is open or closed before or after tapping it, on a
  Pro-tier coaching-transparency surface.
- **Complexity:** S — one prop, matching 17 existing sibling sites.
- **Fix:** Add `accessibilityState={{ expanded: open }}` to the header
  `TouchableOpacity` at `EngineLog.js:86` (optionally migrate the component
  onto the shared `CollapsibleSection` instead of hand-rolling, since it
  already renders a near-identical header/chevron/body shape).
- **Class:** SAFE (mechanical, matches the dominant in-repo convention).

### AY-6 — `ShareCardScreen`'s share-target segmented control never announces which segment is selected
- **Area:** Screen reader / state announcement
- **Severity:** B
- **Evidence:** `src/screens/ShareCardScreen.js:526-536` —
  `SegmentBtn({ label, active, onPress, icon })` renders a
  `TouchableOpacity` with `style={[styles.segment, active &&
  styles.segmentActive]}` but **no `accessibilityState`** and no
  state-bearing label text (the visible `Text` is just the segment name,
  e.g. "Instagram" / "Story", with no "selected" wording). Contrast with
  every other segmented-choice control in the app, which either uses
  `Chip` (sets `accessibilityState` itself, `Chip.js:32-34`) or sets it by
  hand (e.g. `ProgressPhotosScreen.js:1512-1513`,
  `FoodSearchScreen.js:938-940` both pass `accessibilityState={{ selected
  /checked }}`).
- **User impact:** A TalkBack/VoiceOver user choosing which share
  destination/format to export a workout or progress card to cannot tell
  which one is currently selected.
- **Complexity:** S.
- **Fix:** Add `accessibilityRole="radio"` (these are mutually-exclusive
  segments) and `accessibilityState={{ checked: active }}` (or `selected`,
  matching whichever convention the nearest sibling uses) to the
  `TouchableOpacity` at `ShareCardScreen.js:528`.
- **Class:** SAFE.

### AY-7 — The ED-pattern lockout/cleared card never announces itself to a screen reader on appearance
- **Area:** Screen reader / ED-safety reachability (flag only, no copy or
  logic change proposed)
- **Severity:** C
- **Evidence:** `src/screens/CoachOutputScreen.js:647-689`
  (`EdPatternLockoutBlock`/`EdPatternClearedBlock`, rendered from
  `HeldDecisionsCard` at `:579-580`) has no
  `AccessibilityInfo.announceForAccessibility` call anywhere in the file
  (grepped, none found), unlike the established precedent for an important,
  state-changing moment elsewhere in the same codebase:
  `src/components/PRCelebration.js:138-151` explicitly announces "Personal
  record..." the moment the celebration mounts, with an in-code comment:
  "the celebration must be ANNOUNCED, not just shown."
- **User impact:** A screen-reader user whose calorie changes have been
  paused for an ED-safety reason (or just been cleared) only learns this by
  manually exploring the Coach tab; a sighted user sees the card
  immediately on open. This is a reachability gap, not a copy or logic
  concern — CLAUDE.md's ED-safety system is explicitly out of scope to
  touch, and the fix here is additive (an announcement), not a rewrite.
- **Complexity:** S technically, but the WORDING of any announcement is
  ED-safety-adjacent copy and must go through the same care as the visible
  block's own locked language — this is exactly the kind of call CLAUDE.md
  reserves for a "STOP and ask" founder decision, not an agent's unilateral
  phrasing.
- **Options:**
  1. Add an `AccessibilityInfo.announceForAccessibility` call using the
     EXACT visible header text already on screen (`ED_PATTERN_LOCKOUT_COPY`/
     `ED_PATTERN_CLEARED_COPY`, no new wording invented), mirroring
     `PRCelebration`'s pattern of reusing text already approved for the
     visible surface.
  2. Do nothing — leave discovery to manual exploration, consistent with
     how the rest of the Coach tab already works (no other card announces
     itself either, so this may be a deliberate consistency choice, not an
     oversight) — a founder call either way.
- **Class:** JUDGEMENT (ED-safety-adjacent; flagged per the brief's
  instruction to surface reachability gaps without weakening or rewriting
  any ED-safety surface).

### AY-8 — `BuildWorkoutScreen`'s exercise-picker close button is a 40×40 target with no `hitSlop`
- **Area:** Touch targets
- **Severity:** C
- **Evidence:** `src/screens/BuildWorkoutScreen.js:430` —
  `pickerClose` is 40×40 (`styles.pickerClose`), 4pt under the 44×44 WCAG
  2.5.5/HIG minimum, with no `hitSlop` to compensate (contrast
  `ExercisePickerModal.js`'s own `pickerClose`, same 40×40 size, which is
  likewise unpadded — this appears to be a shared naming pattern, not a
  one-off).
- **User impact:** A slightly harder tap target closing the ad-hoc
  exercise picker on the blank/ad-hoc workout builder, the app's own
  "gym, sweaty hands" use case (`theme.js`'s own `hitSlop` token comment).
- **Complexity:** S.
- **Fix:** Add `hitSlop={hitSlop}` (the existing `{top:12,bottom:12,
  left:12,right:12}` token from `theme.js:517`) to the `TouchableOpacity`
  at `BuildWorkoutScreen.js:430` (and its `ExercisePickerModal.js` sibling
  while touching the pattern, though that file was outside this lane's
  primary evidence set).
- **Class:** SAFE.

### AY-9 — `StreakWeeksSection`'s weekly-goal chip picker (1-6 sessions) is a 40×40 target with no `hitSlop`
- **Area:** Touch targets
- **Severity:** C
- **Evidence:** `src/components/StreakWeeksSection.js:161-169` —
  `goalChip` is 40×40, no `hitSlop`, on a manual-goal number picker
  (plan-less users only) that is otherwise correctly labelled
  (`accessibilityRole="button"`, `accessibilityState={{selected}}`,
  `accessibilityLabel` all present — this is a touch-target-only gap, not
  a labelling one).
- **User impact:** A slightly harder tap target setting a weekly session
  goal, on a screen used by users without an assigned plan.
- **Complexity:** S.
- **Fix:** Add `hitSlop={hitSlop}` to the `TouchableOpacity` at
  `StreakWeeksSection.js:161`.
- **Class:** SAFE.

---

## 3. Checked, found clean (do not re-audit)

- **`allowFontScaling={false}` misuse:** none found anywhere in `src/`
  (unchanged from the prior pass).
- **Every `TextField`/raw `TextInput` has SOME accessible name:** a full
  AST-level sweep of every `<TextField` and `<TextInput` opening tag in
  `src/screens/**` and `src/components/**` found zero instances missing
  both a `label` and an `accessibilityLabel` (or, for raw `TextInput`, an
  `accessibilityLabel`). The prior pass's F3 (`RoutineDetailScreen`) is
  confirmed fixed; no new instances exist.
- **Fixed-height clipping at large text sizes:** a targeted scan for
  `numberOfLines={1}` `Text` nodes sitting inside a fixed (not `minHeight`)
  container under 44px found no new instance beyond what lane 03 already
  fixed (`WorkoutHistoryScreen` day-circle, `ManualBuilderScreen` reorder
  button — both already shipped). This remains a static-analysis blind
  spot; the founder device-pass this and the prior audit's F6 both call
  for is still the right closer, not duplicated here.
- **Focus-order red flags:** no screen has two simultaneously-mounted
  `autoFocus` inputs competing for initial focus (`AddCustomFoodScreen`'s
  3 `autoFocus` hits are 1 real usage + 2 prop-definition/pass-through
  lines in its `Field` helper).
- **Live-region announcements:** `Toast.js:206` correctly sets
  `accessibilityLiveRegion="polite"`; `MacroRings`/`FoodDetailSheet`/
  `ProOnboardingScreen` also use it appropriately.
- **Chip single-select radio role (prior F5):** confirmed STILL open at
  `ExercisePickerModal.js:350-379` exactly as previously reported; not
  re-counted as a new finding here.
- **ESLint `react-native-a11y` warnings:** 0 (was 66 at the prior pass).
  The plugin's structural rules (valid role/state/descriptors) all pass
  repo-wide; note this does NOT mean every visible-text-only touchable has
  an explicit `accessibilityLabel` — RN derives the accessible name from
  child `Text` nodes for those, which is correct behaviour, not a gap (a
  large regex-based sweep for touchables missing an explicit
  `accessibilityLabel` attribute found 39 raw hits across 18 files; on
  inspection, all but the ones listed above (AY-3, AY-4, AY-6) have a
  clear, sufficient visible-text child and are NOT screen-reader bugs).

---

## 4. Summary tables

| ID | Sev | Title | File:line | Class |
|---|---|---|---|---|
| AY-1 | A | `TextField` placeholder default fails contrast app-wide | `TextField.js:22` + 3 live call sites | SAFE |
| AY-2 | A | `success`/`error` text on own tint fails AA (dark error, light success) | `AthleteProfileScreen.js:697-703` + 3 more sites | JUDGEMENT |
| AY-3 | B | 5 hand-rolled modal backdrops missing `accessibilityLabel="Close"` | `RoutineDetailScreen.js:520` + 4 more | SAFE |
| AY-4 | B | Phantom unlabelled node + missing `accessibilityViewIsModal` in edit-exercise sheet | `RoutineDetailScreen.js:505-521` | SAFE |
| AY-5 | B | `EngineLog` collapsible header never announces expanded/collapsed | `EngineLog.js:86` | SAFE |
| AY-6 | B | `ShareCardScreen` segmented control never announces selection | `ShareCardScreen.js:528` | SAFE |
| AY-7 | C | ED-pattern lockout/cleared card never announces itself | `CoachOutputScreen.js:647-689` | JUDGEMENT |
| AY-8 | C | Exercise-picker close button 40×40, no `hitSlop` | `BuildWorkoutScreen.js:430` | SAFE |
| AY-9 | C | Weekly-goal chip 40×40, no `hitSlop` | `StreakWeeksSection.js:161` | SAFE |

**SAFE quick wins (implementable now, no founder decision):** AY-1
(pending the token-swap decision below), AY-3, AY-4, AY-5, AY-6, AY-8, AY-9
— six one-file, mechanical fixes matching an existing in-repo convention
each, plus one shared-component default swap.

**Needs a decision:**
- **AY-1** — which colour becomes `TextField`'s placeholder default.
  Recommended: `colors.textMuted` (already the majority explicit-override
  choice, already AA-clear on every surface in both themes per
  `theme.test.js`).
- **AY-2** — how to fix text-on-tint badges: new `successInk`/`errorInk`
  tokens (recommended, mirrors the existing `onPrimary`/`onError` pattern)
  vs. restricting where `*Bg` badges may render.
- **AY-7** — whether the ED-pattern card should self-announce on
  appearance (recommended: yes, reusing the exact existing visible copy,
  no new wording) or stay manually-discoverable like the rest of the Coach
  tab. ED-safety-adjacent; a founder call, not an agent call.

---

## 5. Method notes / what this lane did NOT do

- No on-device TalkBack/VoiceOver session (static/source-level only, same
  constraint as the prior pass — F6/F7's device-pass asks stand).
- Did not re-verify `theme.test.js`'s own flat-surface assertions by
  recomputing them from raw hex (spot-checked several, all correct); the
  NEW computation in this lane is specifically the composited-tint and
  placeholder-default cases the existing tests don't cover.
- Did not exhaustively sweep every one of the ~30 files with a
  chevron-up/down disclosure toggle for the AY-5 pattern; the ones checked
  (`MicronutrientPanel.js`, `ProgressScanTrend.js`, `PartnerScreen.js`) were
  clean or used label-text framing instead of `accessibilityState`, which
  is an acceptable, if less idiomatic, equivalent — only `EngineLog.js` had
  neither.
- Did not exhaustively sweep every one of the ~30 raw `<Modal>` usages for
  missing `accessibilityViewIsModal`; many are full-screen `slide`
  presentations that behave as their own screen (lower risk) rather than
  small `transparent` backdrop dialogs (the higher-risk shape this lane
  focused on for AY-3/AY-4).
