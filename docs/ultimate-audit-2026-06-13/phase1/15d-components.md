# Phase 1 — Component Library audit (batch D: food + auth subdirs)

Ultimate Audit 2026-06-13. READ-ONLY inventory. Zero-fabrication: every claim
cites `file:line`; token values resolved against `src/styles/theme.js`. British
English throughout. Where a fact is not in the code it is marked
**NOT DETERMINED IN CODE**.

Files audited (14): `src/components/food/*.js` (12) + `src/components/auth/*.js` (2).

Token reference (resolved from `src/styles/theme.js`):
- fontSize: micro 10 (theme.js:257), xs 11 (258), sm 13 (259), md 16 (260),
  lg 17 (261), xl 20 (262), xxl 24 (263), xxxl 32 (264), display 40 (265).
- spacing: hair 1, xxs 2, xs 4, xs2 6, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48
  (theme.js:228-239).
- radius: xs 4, sm 6, md 10, lg 14, xl 20, full 999 (theme.js:241-248).
- type roles (theme.js:373-410): body = fontSize.md 16 (394-397); bodyStrong =
  16 semibold (398-401); title = lg 17 semibold (390-393); label = sm 13 (402);
  caption = xs 11 (406).
- Note: numeric font sizes below body min (micro 10, xs 11) are flagged by the
  brief's own bar (`fontSize.micro` comment, theme.js:257, "below body min").

---

COMPONENT: EmptyDiary (`src/components/food/EmptyDiary.js`)
WHAT IT DOES: The designed empty-state card for a diary day with no entries
(EmptyDiary.js:1-10). Shows a restaurant icon, one calm copy line
(`EMPTY_DIARY_COPY`, line 15), an optional full-width "Plan my day" button, and
a row of "Add food" / "Copy yesterday" actions, all conditional on the
respective handler props (lines 22-56).
WHERE IT IS USED: `src/screens/DiaryScreen.js` only. Sample import
`src/screens/DiaryScreen.js:36` (`import EmptyDiary from '../components/food/EmptyDiary'`);
rendered at DiaryScreen.js:579.
VISUAL QUALITY: premium — single bordered surface card (EmptyDiary.js:62-66:
`colors.surface`, `radius.lg` (14), 1px `colors.border`), generous
`paddingVertical: spacing.xl` (24) / `paddingHorizontal: spacing.lg` (16), centred
with `gap: spacing.md` (12). Body uses `type.body` (16px) `textSecondary`
(lines 71-75). All three buttons carry `minHeight: 44` (line 80), meeting the
44px touch-target bar.
CONSISTENCY: matches app tokens/patterns — colours, spacing, radius all token
sourced; primary fill uses `colors.primary` with `colors.onPrimary` ink
(lines 82, 87), the app's correct ink-on-amber pairing. Minor deviation: button
label text is hand-built (`fontSize: fontSize.sm` 13 + `fontWeight.semibold`,
line 86) rather than a `type` role, but this matches the sheet button pattern
elsewhere so it is in-house consistent.
USABILITY: works for all users — copy is plain ("Nothing logged yet today.",
line 15); every action has an `accessibilityLabel` (lines 27, 39, 50). "Plan my
day" is a Pro feature surfaced here; whether a free user ever sees it depends on
the caller passing `onPlanDay` (DiaryScreen, NOT DETERMINED IN CODE within this
component).

---

COMPONENT: EntryRow / SwipeableEntryRow / friendlyFoodName
(`src/components/food/EntryRow.js`)
WHAT IT DOES: `friendlyFoodName` derives a display name from an entry
(EntryRow.js:7-13). `EntryRow` renders one logged food row: name, optional
brand, gram quantity (hidden for quick-add, line 47), and right-aligned kcal +
"P C F" macro line (lines 27-54); supports selection mode with a checkbox
(lines 39-43). `SwipeableEntryRow` wraps it in a swipe-to-delete gesture
(lines 57-91).
WHERE IT IS USED: row component consumed by `src/components/food/MealSection.js`
(imports `SwipeableEntryRow`, MealSection.js:4); the `friendlyFoodName` helper is
imported by `src/screens/DiaryScreen.js:38`. The EntryRow component itself is not
imported directly by any screen — it reaches the diary via MealSection. Sample
import `src/components/food/MealSection.js:4`.
VISUAL QUALITY: premium — flush in-card row, `minHeight: 48` (line 106), hairline
top divider (`StyleSheet.hairlineWidth`, line 105). Name `fontSize.md` (16)
medium (line 122); kcal `fontSize.md` (16) semibold (line 126); brand/quantity/
macro line `fontSize.xs` (11) `textMuted` (lines 123, 124, 127). The 11px macro
line is at the brief's flagged below-body size, but is a secondary data label so
acceptable.
CONSISTENCY: matches app tokens/patterns — selection checkbox uses
`colors.primary` fill + `colors.onPrimary` tick (lines 117-119, 41); swipe-delete
uses `colors.error` (line 129). One deviation: the swipe-delete action width is a
hardcoded `width: 90` (line 130) rather than a token; not a sizing token exists
for this, so it is an inevitable literal.
USABILITY: works for all users — accessibility label changes by mode and reads
the kcal and tap action (lines 33-37); `delayLongPress={300}` (line 30). The
"P C F" abbreviations (line 51) are gym-standard but may not be obvious to a
first-time user; no expansion is shown inline.

---

COMPONENT: FoodDetailSheet (`src/components/food/FoodDetailSheet.js`)
WHAT IT DOES: Bottom sheet to add or edit a food entry: title/brand/source chip,
a quantity (g) input, a live macro summary (kcal/P/C/F pills recomputed via
`macrosFor`, lines 10-22, 101), a meal-slot selector, and Cancel / Save (+ Delete
in edit mode) actions (lines 105-180). Validates quantity 1–5000 g (line 69) and
toasts on error.
WHERE IT IS USED: `src/screens/FoodSearchScreen.js` (import line 48, rendered 733)
and `src/screens/DiaryScreen.js` (import line 34, rendered 619). Sample import
`src/screens/FoodSearchScreen.js:48`.
VISUAL QUALITY: premium — title `fontSize.lg` (17) bold (line 193); quantity
input is a prominent `fontSize.lg` (17) semibold field (line 214); macro pills on
`colors.surface2` with `radius.md` (10) (lines 219-225). Delete button is a
44x44 target (lines 244-249); Save is the flex-1 primary fill (lines 256-262).
CONSISTENCY: matches app tokens/patterns — fully token-driven; uses shared
`BottomSheet`, `useToast`, `appAlert`. Local deviation: the source chip is
hand-rolled here (lines 109-113, 195-203) rather than reusing the dedicated
`SourceChip` component — duplicated source-badge styling. `subtitle` uses
`marginTop: -spacing.xs` (line 194), a negative-margin nudge.
USABILITY: works for all users — field labels uppercase `fontSize.xs` (11)
(lines 204-208); macro summary has an `accessibilityLiveRegion="polite"` label
spelling out the full macro breakdown (lines 129-131). Save label adapts
("Add to diary" / "Save changes" / "Saving", line 175).

---

COMPONENT: FoodRow (`src/components/food/FoodRow.js`)
WHAT IT DOES: A single food-search result row: name (with ★ when favourited),
a meta line (brand · serving · kcal · source tag), an optional add-circle button,
and dislike handling (muted strike-through + cross-circle when
`preference === 'dislike'`, lines 30-85). Long-press cycles favourite state
(a11y label, lines 46-49).
WHERE IT IS USED: `src/screens/FoodSearchScreen.js` only. Sample import
`src/screens/FoodSearchScreen.js:50`; rendered at line 475.
VISUAL QUALITY: premium — `minHeight: 56` row (FoodRow.js:93), name `fontSize.md`
(16) semibold (line 95), meta `fontSize.sm` (13) `textMuted` (line 97). Add
button is an `add-circle` icon size 26 with the standard
`hitSlop` 12 (lines 73-80), comfortably above 44px effective. The non-interactive
`add-circle-outline` variant (size 22) is correctly hidden from a11y
(`importantForAccessibility="no"`, line 82).
CONSISTENCY: matches app tokens/patterns — colours token-sourced;
`borderBottomColor: colors.border` (line 92). Deviation: it carries its own
`SOURCE_LABEL` map (lines 5-11) which differs from the canonical `SourceChip`
labels (`user_ocr` -> "Snapped" here vs "OCR" in SourceChip.js:19; `custom` ->
"You" vs "Custom"). Two divergent source vocabularies exist in the food dir.
USABILITY: works for all users — rich a11y label including kcal and the
long-press affordance (lines 46-49). The source tag is appended as bare text
("  USDA", line 66) with no chip styling, so on the row it reads as a faint
suffix rather than a badge; may be missed by a newcomer.

---

COMPONENT: HeldDecisionCard (`src/components/food/HeldDecisionCard.js`)
WHAT IT DOES: The card shown in weekly coach output when the FFM floor, ED-pattern
flag, or rapid-loss safety override fires (HeldDecisionCard.js:1-11). Amber
"Held this week" badge, plain-English body, optional "Why?" link, and — for
`type === 'ed_pattern'` only — a "Get support" button opening Beat
(`BEAT_URL`, line 16; `openSupport`, lines 20-24). Touches the ED safety
signposting surface.
WHERE IT IS USED: **NOT DETERMINED IN CODE** — no production import found. The
only `src/` reference outside its own file is a doc-comment in
`src/components/DifferentialBadge.js:9` ("Layout per UI_FLOWS_LOCKED.md ... of
HeldDecisionCard"), which is not an import. `grep -rln "import.*HeldDecisionCard"
src/` returns nothing outside its own test. Appears currently unmounted /
unwired.
VISUAL QUALITY: acceptable — clean card (`colors.surface`, `radius.md` 10,
1px border, lines 66-72). Badge is `colors.primary` fill with `colors.onPrimary`
ink (lines 78-84). Body is `fontSize.sm` (13) with a hardcoded `lineHeight: 20`
(lines 86-90) — a non-token line height. "Get support" button uses
`backgroundColor: colors.background` (line 100), the only food-dir component
using the base background as a fill.
CONSISTENCY: inconsistent — body text uses a literal `lineHeight: 20` (line 89)
instead of a `type` role / lineHeight token; the support button's
`colors.background` fill (line 100) is an unusual choice versus the `surface2`
secondary-button pattern used elsewhere (e.g. MacroBreakdownSheet doneBtn,
MacroBreakdownSheet.js:110). Badge text is `fontSize.xs` (11), at the flagged
small size.
USABILITY: works for all users — copy is plain-English (passed as `body` prop);
support link degrades gracefully (if `Linking` fails it surfaces the Beat
address via `appAlert`, lines 21-23) so the support path never dead-ends, per the
safety rule. NOTE: this is a safety-system-adjacent surface (Beat signposting,
calorie/rapid-loss holds) and was read but not modified.

---

COMPONENT: MacroBreakdownSheet (+ `mealBreakdown`)
(`src/components/food/MacroBreakdownSheet.js`)
WHAT IT DOES: `mealBreakdown` sums each meal slot's macros from the day's enriched
entries, dropping empty slots and adding a day total (lines 13-45). The sheet
renders those as read-only rows (label + "kcal · P C F") with a total row and a
Done button (lines 60-92); opened by tapping the macro rings (line 56-58).
WHERE IT IS USED: `src/screens/DiaryScreen.js` only. Sample import
`src/screens/DiaryScreen.js:33`; rendered at line 638.
VISUAL QUALITY: premium — title `fontSize.lg` (17) semibold (line 96), rows with
`fontSize.md` (16) label (line 103) and `fontSize.sm` (13) macro text (line 104),
bottom-divider rows (lines 98-102), Done button `minHeight: 48` (line 109). Empty
state has its own centred copy (line 107).
CONSISTENCY: matches app tokens/patterns — fully token-driven; reuses
`BottomSheet` and the `mealSlotLabel`/`slotOrder` helpers. Done button uses the
standard `colors.surface2` secondary pattern (line 110). No deviations found.
USABILITY: works for all users — read-only by design (line 56-58), so no risk of
mis-tap; sheet a11y label "Macro breakdown by meal" (line 64). The "P C F"
shorthand (MacroLine, lines 47-53) is gym-standard, same minor newcomer caveat as
EntryRow.

---

COMPONENT: MacroRings (+ `bandColour`, `Ring`, `MacroBar`)
(`src/components/food/MacroRings.js`)
WHAT IT DOES: The diary headline card. A Skia kcal ring (size 132, stroke 14,
lines 7-8) with a centre value that counts up + sweeps on change (animated unless
reduce-motion, lines 104-126), a "remaining"/"over" figure, an optional day-type
chip, and three horizontal macro bars (Protein primary, Carbs, Fat,
lines 186-190). Ring colour is the adherence-neutral brand amber by founder
decision — no colour judgement on under/over (`bandColour`, lines 10-19).
WHERE IT IS USED: `src/screens/DiaryScreen.js` only (import line 32, rendered 541).
The `ProSetupCompleteScreen.js:386` reference is a doc-comment, not an import.
Sample import `src/screens/DiaryScreen.js:32`.
VISUAL QUALITY: premium — the strongest card in the batch. Centre kcal value is a
deliberate hero numeral at a hardcoded `fontSize: 34` with an eslint-disable
acknowledging it as a sanctioned exception (lines 214-221) — intentional, not a
drift. Remaining value `fontSize.xxl` (24) bold (lines 230-234). Macro bars 6px
tall (line 280) with amber fill (lines 285-289). Tabular-nums on every numeral
(lines 220, 234, 273).
CONSISTENCY: matches app tokens/patterns — colours, spacing, radius token-sourced;
ring uses `colors.surface2` track (line 164) and `bandColour()` amber tint. The
two hardcoded literals (`fontSize: 34` line 217, `lineHeight: 36` line 219, ring
constants lines 7-8) are documented intentional exceptions for a custom Skia hero,
not unmanaged deviations.
USABILITY: works for all users — builds one spoken a11y summary of kcal + all
macros and hides the decorative rings from screen readers (lines 128-151);
reduce-motion is honoured (lines 104, 111). Newcomer caveat: macro bars label
"Protein/Carbs/Fat" in full (lines 187-189), clearer than the "P C F" shorthand
used elsewhere. Fixed 132px ring will not scale with larger-text accessibility
(it is a fixed constant, line 7) — a small-screen note, though the card itself is
inside the DiaryScreen ScrollView (NOT DETERMINED IN CODE here; confirmed in
DiaryScreen, out of scope).

---

COMPONENT: MealSection (`src/components/food/MealSection.js`)
WHAT IT DOES: Renders one meal as a single contained card: header (meal name +
optional "kcal · g P" subtotal), the meal's `SwipeableEntryRow`s, an in-card
"Add food" row, and an optional quiet "Quick add" row (lines 12-62). Subtotals
computed inline (lines 17-18).
WHERE IT IS USED: `src/screens/DiaryScreen.js` only (import line 37, rendered 588).
Sample import `src/screens/DiaryScreen.js:37`.
VISUAL QUALITY: premium — card owns the border + `radius.lg` (14) and
`overflow: 'hidden'` so child rows are flush (lines 65-69). Meal name uses
`type.bodyStrong` (16 semibold, line 76); subtotal `fontSize.sm` (13) tabular
(line 77). Add rows `minHeight: 48` (line 81) with hairline dividers when items
exist (lines 84-86).
CONSISTENCY: matches app tokens/patterns — token-driven; primary "Add food" in
`colors.primary`, secondary "Quick add" deliberately quieter in `colors.textSecondary`
(lines 44-57, 87-88), a clear primary/secondary hierarchy.
USABILITY: works for all users — both add affordances carry slot-specific a11y
labels (lines 42, 54). The empty section shows the add row directly under the
header with no divider so it reads as one clean block (comment lines 84-85),
avoiding the old dashed-placeholder pattern.

---

COMPONENT: QuickAddSheet (`src/components/food/QuickAddSheet.js`)
WHAT IT DOES: Bottom sheet to log a bare calorie figure plus optional P/C/F
without finding a food (lines 10-20). Required kcal validated 1–5000 (line 50);
blank macros count as 0 (`num`, lines 43-46); meal-slot selector; Cancel / Add to
diary (lines 64-125).
WHERE IT IS USED: `src/screens/FoodSearchScreen.js` (import line) and
`src/screens/DiaryScreen.js` (import line 35, rendered 631). Sample import
`src/screens/DiaryScreen.js:35`.
VISUAL QUALITY: premium — mirrors FoodDetailSheet's shape (line 13). Primary kcal
input `fontSize.lg` (17) semibold (line 143); three small macro inputs
centre-aligned `fontSize.md` (16) (lines 147-153). Save is the flex-1 primary
fill (lines 170-173).
CONSISTENCY: matches app tokens/patterns — token-driven and intentionally a
near-clone of FoodDetailSheet's styles for a consistent add experience. Same
`subtitle` negative-margin nudge as FoodDetailSheet (line 131,
`marginTop: -spacing.xs`). Field labels `fontSize.xs` (11), at the flagged size.
USABILITY: works for all users — clear copy ("Log calories now, with macros if
you have them.", line 67); `autoFocus` on the kcal field (line 77). The three
macro fields use full labels "Protein (g)/Carbs (g)/Fat (g)" (lines 83-85),
newcomer-clear.

---

COMPONENT: ServingPicker (`src/components/food/ServingPicker.js`)
WHAT IT DOES: A standalone quantity input with a unit toggle (g / oz by default,
overridable via `units`) (lines 1-64). Intended as a shared serving-size input
for FoodDetailSheet, AddCustomFoodScreen and future surfaces (doc lines 8-10).
WHERE IT IS USED: **NOT DETERMINED IN CODE** — no production import found. The
`src/screens/FoodSearchScreen.js:13` reference is a doc-comment, not an import;
`grep -rln "import.*ServingPicker" src/` returns nothing outside its own test
(`foodComponents.test.js`). The component its own header says it serves
(FoodDetailSheet) instead hand-rolls a plain TextInput (FoodDetailSheet.js:116).
Appears currently unused.
VISUAL QUALITY: acceptable — clean token-driven row (radius.sm 6, 1px border,
lines 72-91). Active unit pill is `colors.primary` fill with `colors.onPrimary`
ink (lines 97-98, 105-107). Unit `paddingVertical: 6` (line 94) is a literal, not
a token. Effective unit-pill touch target is small: `paddingHorizontal: spacing.sm`
(8) + 6 vertical with `hitSlop={6}` (line 54) — below the 44px bar even with the
slop. Flag: < 44px touch target.
CONSISTENCY: inconsistent — the standalone input background is `colors.surface`
(line 75) whereas the equivalent live FoodDetailSheet quantity input uses
`colors.surface2` (FoodDetailSheet.js:210); the input radius is `radius.sm` (6)
vs `radius.md` (10) on the live sheets. So even if wired it would not match the
sheets it claims to standardise.
USABILITY: only makes sense to experienced users in its current state — being
unmounted, it serves no end user. As written, the unit toggle has a small tap
target (lines 92-95) and no on-screen hint of what the units do; a11y labels are
present (lines 52-53).

---

COMPONENT: SourceChip (`src/components/food/SourceChip.js`)
WHAT IT DOES: A small badge translating a food source code to a label
(off/usda/cofid/user_ocr/custom -> OFF/USDA/CoFID/OCR/Custom, lines 15-21);
unknown codes fall back to an uppercased 6-char slice (line 24).
WHERE IT IS USED: **NOT DETERMINED IN CODE** — no production import found.
`grep -rln "SourceChip" src/` outside its own file returns only
`src/components/food/__tests__/foodComponents.test.js`. Both surfaces its own doc
header names (food results, food detail sheet) instead render source labels
inline (FoodRow.js:5-11, 66; FoodDetailSheet.js:109-113). Appears currently
unused in production.
VISUAL QUALITY: acceptable — minimal chip on `colors.surface` with 1px border and
`radius.sm` (6) (lines 33-41); text `fontSize.xs` (11) `textMuted` tabular
(lines 42-47). Uses a hardcoded `paddingHorizontal: 6` (line 34) rather than a
spacing token (closest token spacing.xs2 = 6).
CONSISTENCY: inconsistent — it is the intended single source of source-label
vocabulary, yet two other live components carry their own divergent maps
(FoodRow.SOURCE_LABEL maps `user_ocr` -> "Snapped", `custom` -> "You",
FoodRow.js:9-10; FoodDetailSheet uppercases the raw source string,
FoodDetailSheet.js:111). The app has three competing source vocabularies and this
canonical one is the unused one.
USABILITY: only makes sense to experienced users — the codes (OFF, USDA, CoFID,
OCR) are database provenance labels that a typical user will not recognise; no
tooltip or expansion. Being unmounted it currently reaches no user.

---

COMPONENT: TodaysPlateTeaser (`src/components/food/TodaysPlateTeaser.js`)
WHAT IT DOES: A read-only static example day shown to FREE users on the Pro-locked
Food diary screen — a show-then-sell conversion lever (lines 1-14). Builds a fixed
sample day from `SAMPLE_TARGET`/`SAMPLE_BAND` via `assembleDayPlan` with a fixed
seed (lines 23-32); renders an eyebrow, headline, sub-copy, per-slot plates, a day
total, and a disclaimer footer (lines 36-64). Nothing is tappable
(`pointerEvents="none"`, line 45).
WHERE IT IS USED: `src/components/ProGate.js` (import line 9, rendered at
ProGate.js:100 behind a `showPlateTeaser` flag). Sample import
`src/components/ProGate.js:9`.
VISUAL QUALITY: premium — bordered surface card, `radius.lg` (14), `padding:
spacing.lg` (16) (lines 68-74). Eyebrow `fontSize.xs` (11) bold amber (line 75);
title `fontSize.lg` (17) bold (line 76); sub `fontSize.sm` (13) with hardcoded
`lineHeight: 20` (line 77). Plates on `surface2` with `radius.md` (10) (lines
79-82). Slot/kcal/total text `fontSize.xs` (11). Dense but calm.
CONSISTENCY: matches app tokens/patterns mostly — colours/spacing/radius token
sourced. Deviations: two hardcoded line heights (`lineHeight: 20` line 77,
`lineHeight: 16` line 89) and a hardcoded `gap: 2` (line 81) rather than
`spacing.xxs` (2); these are literals where tokens exist. Several text elements
sit at the flagged `fontSize.xs` (11).
USABILITY: works for all users — explicitly non-interactive and labelled as an
example ("An example, not medical advice.", line 62); a11y summary explains it is
a Pro preview (line 37). GATING note: this is the deliberate free-side preview of
a Pro feature (header lines 1-14), exposing no Pro function — consistent with the
free/Pro rule. The static plates are information-dense (11px slot/kcal text) and
may read small on a 5.4" device; sizes are fixed (lines 84-89), no scaling guard
in the component.

---

COMPONENT: EmailPasswordFields (`src/components/auth/EmailPasswordFields.js`)
WHAT IT DOES: The shared email + password input block for sign-in / sign-up.
Presentational only — owns focus styling and the show/hide password toggle; the
screen owns values, submit, and all auth logic (lines 6-16). `mode` ('signin' /
'signup') only changes placeholders and autofill hints (lines 53-60).
WHERE IT IS USED: `src/screens/LoginScreen.js` (import line 10, rendered 279) and
`src/screens/ProOnboardingScreen.js`. Sample import `src/screens/LoginScreen.js:10`.
VISUAL QUALITY: premium — inputs use `type.body` (16px, line 93) with generous
`paddingVertical: spacing.md + 2` (14, line 94); focus state lifts the border to
a 50.2%-alpha primary via `withAlpha(colors.primary, 0.502)` (line 91), a polished
focus affordance. Labels `fontSize.xs` (11) semibold `textMuted` (lines 82-85).
Eye toggle has `hitSlop` 8 (line 67) and is vertically centred over the field
(lines 98-101).
CONSISTENCY: matches app tokens/patterns — token-driven, uses the `withAlpha`
helper rather than hex-concat (the sanctioned pattern, theme.js:204). `borderWidth:
1.5` (line 89) is a literal but is a deliberate input-emphasis choice consistent
within the auth surface.
USABILITY: works for all users — correct keyboard/autofill/textContentType per
field and mode (lines 35-60); `testID` and `accessibilityLabel` on both inputs
(lines 27-28, 50-51); show/hide password with a labelled toggle (lines 64-72). The
eye toggle effective target is ~19px icon + hitSlop 8 each side, comfortably
usable. Newcomer-clear.

---

COMPONENT: OAuthButtons (`src/components/auth/OAuthButtons.js`)
WHAT IT DOES: The "Continue with Apple / Google" block plus an "or with email"
divider, shared by LoginScreen and the Pro onboarding account step so the two auth
surfaces stay identical (lines 18-27). iOS renders Apple's official
`AppleAuthenticationButton` (Guideline 4.8), degrading to a HIG-styled custom
button if the native module is absent (lines 8-16, 29-58); Android shows Google
(lines 63-74). Presentational only.
WHERE IT IS USED: `src/screens/LoginScreen.js` (import line 9) and
`src/screens/ProOnboardingScreen.js`. Sample import `src/screens/LoginScreen.js:9`.
VISUAL QUALITY: premium — buttons centre content with `gap: spacing.sm` (8) and
`paddingVertical: spacing.md` (12) (lines 86-90); Apple button uses the brand-locked
`colors.appleBtnBg` / `appleBtnText` tokens (lines 92-96) which theme.js documents
as store-required brand locks (theme.js:74-79). Native Apple button given an
explicit 48px height to line up with the custom buttons (lines 97-100). Divider is
a clean line/label/line (lines 102-104).
CONSISTENCY: matches app tokens/patterns — uses `type.bodyStrong` (16 semibold)
for button text (lines 91, 96); colours token-sourced including the documented
brand-lock exception. Disabled state is a shared `opacity: 0.55` (line 101). No
unmanaged deviations.
USABILITY: works for all users — both buttons carry `accessibilityRole="button"`
and clear labels (lines 50-51, 67-68); disabled state also blocks the native Apple
button via `pointerEvents` (line 36). Buttons are full-width tap targets at 48px
effective height (paddingVertical 12 + 16px text ≈ 40, plus the native 48px
guarantee, line 99). Platform logic (Apple iOS-only, Google Android-only) is
explained in comments (lines 59-62) — store-compliant and clear to the user.

---

## Cross-cutting findings
1. THREE unmounted components: `SourceChip`, `ServingPicker`, and
   `HeldDecisionCard` have no production import (only test-file references).
   HeldDecisionCard is safety-adjacent (Beat signposting) so its non-wiring is
   worth flagging, not fixing.
2. Source-label vocabulary is fragmented: the canonical `SourceChip` is unused,
   while `FoodRow.SOURCE_LABEL` (FoodRow.js:5-11) and FoodDetailSheet's inline
   uppercase (FoodDetailSheet.js:111) carry divergent labels (e.g. `user_ocr` ->
   "Snapped" vs "OCR").
3. "P C F" macro shorthand (EntryRow.js:51, MacroBreakdownSheet.js:50) vs the
   full "Protein/Carbs/Fat" labels (MacroRings.js:187-189, QuickAddSheet.js:83-85)
   is inconsistent newcomer-facing terminology.
4. Several literal line heights where tokens exist: HeldDecisionCard.js:89,
   TodaysPlateTeaser.js:77,89.
(All observations are READ-ONLY; no code was changed.)
