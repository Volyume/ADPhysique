# Food design standard (extracted from source, 2026-07-11)

Purpose: a concrete, evidence-based spec of the Food domain's visual/
interaction language, so any other screen (the workout logger first) can be
measured and restyled against it. Every claim below is file:line. Source
surfaces read in full: `src/screens/DiaryScreen.js`, `src/screens/
FoodSearchScreen.js`, every file in `src/components/food/`, plus the shared
primitives Food composes (`Card.js`, `Button.js`, `theme.js`, `ScreenHeader.js`,
`ModalHeader.js`, `BottomSheet.js`, `EmptyState.js`, `HintCaption.js`,
`SectionLabel.js`), and `src/screens/MealPlanScreen.js` for the "Dietary
needs" pattern.

## 1. Screen anatomy

**Tab-root screens (Diary/"Eat")** open with the shared `ScreenHeader`, not a
bespoke bar:
- `DiaryScreen.js:1313` `<ScreenHeader title="Eat" />` — title left, compact
  brand mark (the "V") right. `ScreenHeader.js:42` renders the title as
  `t.type.h3` / `colors.textPrimary`; the brand chip is a 34px circle
  (`ScreenHeader.js:24,81-86`) on `colors.chipInk` backing. No back/close
  control on a tab root — there is nothing to go back to.
- A secondary "day pager" row sits directly under the header, NOT inside it
  (`DiaryScreen.js:1319-1371`, styles at `2207-2267`): a bordered `dateCluster`
  pill (`radius.md`, 1px `colors.border`, `colors.surface` bg, 44 min-height)
  containing chevron-back / date-label+sub-label / chevron-forward, plus an
  optional "Today" pill and an options ("diary tools") icon button, both the
  same pill shape.

**Modal/pushed screens (FoodSearchScreen, sheets)** use `ModalHeader`, not
`ScreenHeader`:
- `FoodSearchScreen.js:945` `<ModalHeader title="Add food" onClose={...} />`.
  `ModalHeader.js:20-37`: centred `t.type.title` title, a 44×44 close (`X`,
  Ionicons `close`, `t.colors.textPrimary`) fixed to one side (`closePosition`
  prop, default right), a matching empty 44×44 "side" slot on the other side
  so the title stays optically centred, 1px `borderSubtle` bottom rule.

**Section headers** use `SectionLabel` (`SectionLabel.js:5-24`): default
variant is `type.overline` (uppercase, tracked +0.5, `colors.textSecondary`);
`variant="title"` swaps to `type.title`/`textPrimary` for a heavier sheet
header (e.g. `DiaryScreen.js:1856` "Move to", `1876` "Save as meal", `1923`
"Day tools", `1964` "Copy from another day" — all default overline variant).

**Scroll/content padding.** Diary's scroll container:
`scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl }`
(`DiaryScreen.js:2269`) — 16px on all sides, 48px bottom clearance for the
FAB/selection bar. Card-to-card vertical rhythm is `spacing.lg` (16px)
via `marginBottom` on each block (`MealSection.js:214` `marginBottom:
spacing.lg`; `DiaryScreen.js` water/banner blocks same pattern at
`2276,2302,2311,2360,2381`).

**Bottom CTA pattern.** Diary has no sticky bottom action bar in the normal
state; a floating circular FAB owns the hero action (scan barcode):
`scanFab` — 56×56 circle (`circle(56)`), `colors.primaryFill` bg,
`shadow.lg`, bottom-right (`DiaryScreen.js:2115-2121`). It is replaced by a
`selectionBar` (docked, full-width, `colors.surface` bg, top border, two
rows: count+cancel, then 4 evenly-spaced icon+label actions) whenever
multi-select is active (`DiaryScreen.js:2126-2140`). FoodSearchScreen instead
uses a docked `plateBar` (surface bg, top border, count/kcal left, primary
"Log N" button right) only when the multi-add "plate" has items
(`FoodSearchScreen.js:1215-1230`, rendered `1023-1044`).

## 2. Card idiom

The whole domain is built on **one primitive, `Card`** (`Card.js`), never a
hand-rolled bordered `View`:
- Default radius: `radius.lg` = **16px** (`Card.js:39`, token at
  `theme.js:376` "card radius … premium-feel bump 14 → 16").
- Default padding: `spacing.lg` = **16px** (`Card.js:43`).
- Default surface: `colors.surface` (1st elevation tier); `elevated`/
  `surface2`/`surface3` override for nested or input-like tiers (`Card.js:
  27-31,74-86`).
- Border: always 1px, colour `colors.borderSubtle` inside the card ladder
  (`Card.js:100-101`; `theme.js:47` "hairline dividers INSIDE a card").
- Light theme only: a soft `shadow.card` lift (`Card.js:102`); dark theme
  carries elevation via the surface ladder alone, no shadow
  (`theme.js:11-14` materials policy).
- `MealSection` and `MacroRings` don't literally call `<Card>` but hand-copy
  its exact contract: `backgroundColor: colors.surface, borderRadius:
  radius.lg, borderWidth: 1, borderColor: colors.border` (`MealSection.js:
  209-214`; `MacroRings.js:360-364`) — i.e. even the components that predate
  `Card` converge on the identical radius/border/surface values.
- Card-to-card gap: `spacing.lg` (16px) bottom margin, consistently
  (`MealSection.js:214`; `EmptyDiary.js:88`; `DiaryScreen.js:2302,2311,2360`).
- In-card row rhythm: a card's own header is
  `paddingHorizontal: spacing.lg, paddingVertical: spacing.md` (16/12px,
  `MealSection.js:216-219`); rows inside are flush (no side margin), each
  separated by a 1px `hairlineWidth` top divider in `colors.border`
  (`EntryRow.js:189-195`, `MealSection.js:283-285`).
- `Card` usage in the meal-builder confirms the same contract at the call
  site: `<Card padding="md" style={styles.mealCard}>`
  (`MealPlanScreen.js:1062`) and the Diary's water card
  `<Card padding="md" style={styles.waterRow}>` (`DiaryScreen.js:2045`) —
  `padding="md"` (12px) is the one sanctioned override for a denser card.

## 3. Type system as used

Food never sets a raw `fontSize`+`fontWeight` pair where a `type.*` role
exists; it composes roles from `theme.js:554-651`:
- **Titles** (sheet/card headline): `type.title` — `fontFamily.medium`,
  `fontSize.lg` (17), `lineHeight` snug (`MacroBreakdownSheet`/
  `plateModalTitle` at `FoodSearchScreen.js:1237,1291`; `ModalHeader.js:31`).
- **Meal/section labels, in-card headers**: `type.bodyStrong` — medium
  weight, `fontSize.md` (16) (`MealSection.js:220` `mealName`;
  `EntryRow.js` isn't bodyStrong, see below).
- **Data numerals (kcal/macros)**: hero numbers use raw bold + `fontVariant:
  ['tabular-nums']` rather than `type.num()` in this file
  (`MacroRings.js:378-386` `kcalValue`), but every kcal/macro readout
  explicitly sets `fontVariant: ['tabular-nums']` regardless of role —
  `EntryRow.js:213-235` (`entryKcal`), `MealSection.js:221` (`subtotal`),
  `MacroRings.js:442-450` (`macroBarValue`) — this IS the domain's `type.num`
  discipline even where the literal helper isn't called.
- **Quiet meta/labels**: `type.caption` (11px) for brand/quantity/time meta
  (`EntryRow.js:232-233`), `type.bodySm` (13px, roomier line) for longer quiet
  copy (`EmptyDiary.js:91-92`, `MealSection.js:239,294`).
- **Colour hierarchy**: `textPrimary` for the name/value that IS the content
  (food name `EntryRow.js:213`, kcal `EntryRow.js:235`); `textSecondary` for
  one-step-down supporting text (macro split `MacroRings.js:495`); `textMuted`
  for the quietest tier — meta lines, captions, placeholder copy
  (`EntryRow.js:232-233`, `HintCaption.js:46`, `EmptyDiary.js:126`). This
  three-step ladder (`textPrimary` → `textSecondary` → `textMuted`) is applied
  consistently: never a fourth invented shade, never `textSecondary` used
  interchangeably with `textMuted` in the same row.
- **Adherence-neutral colour rule**: the calorie ring and macro bars use
  ONE fixed tint per macro category (`macroProtein`/`macroCarb`/`macroFat`/
  `macroFibre`, `theme.js:164-167`) that never changes on over/under-target;
  "over"/"left" text stays in the same neutral ink both ways
  (`MacroRings.js:14-26` doc comment, `254-255`, `488-492`). No red-for-over/
  green-for-under anywhere in Food.

## 4. Controls

**Buttons** — always the shared `Button` primitive (`Button.js`), never a
hand-rolled `TouchableOpacity` CTA:
- Variants used in Food: `primary` (amber fill `primaryFill`/dark `onPrimary`
  ink — main CTAs: "Add to diary", "Mark as eaten"), `secondary` (raised
  `surface2`, `textPrimary`, `border` — "Cancel", "Clear"), `outline` (quiet
  bordered `surface` — "Add meal"). `Button.js:49-61`.
- Sizes: `sm`/`md`(default)/`lg` map to `spacing.sm|md|lg` vertical padding
  and `fontSize.sm|md|md` (`Button.js:63-69`); Food mostly uses default `md`
  or explicit `size="sm"` for secondary in-sheet actions
  (`DiaryScreen.js:1894-1913`).
- Shape: `borderRadius: radius.lg` (16px, `Button.js:248`), min-height driven
  by padding not a fixed prop (effectively ≥44-48px with `md`/`lg` sizing).
- The primary variant fires a `haptics.selection()` tick on press
  automatically (`Button.js:156-158`); state morph (`idle→loading→success`)
  is the sanctioned pattern for anything that writes then closes a sheet
  (`FoodDetailSheet.js:469-474`, `QuickAddSheet.js:148-152`).
- **Chips** (`components/Chip.js`, used throughout Food): pill-shaped
  selectable buttons — diet/allergen/meal-slot/unit pickers all use `Chip`
  with `selected` boolean, never a custom radio row
  (`FoodDetailSheet.js:290-303,350-369,437-449`; `QuickAddSheet.js:123-135`;
  `DietaryPreferencesEditor.js:102-114,131-144`; `MealPlanScreen.js:1003-1009`
  dietary-needs entry chip).
- **Steppers**: `FoodDetailSheet.js:305-336` — two 48×48 square
  `radius.md` buttons (`surface2` bg, 1px `border`) flanking a centred
  numeric `TextField`; step size context-sensitive (0.5 for a household
  serving, 10g for grams, `FoodDetailSheet.js:198-203`).
- **Inputs**: `TextField` (shared component) inside sheets always renders
  through `BottomSheetTextInput` context (`BottomSheet.js:52-57`); Food's
  own field style is `radius.md`, `spacing.sm/md` padding, no visible border
  override beyond `TextField`'s own default (`FoodSearchScreen.js:1246,1250`
  `footerBtn`/`saveMealInputField` at `DiaryScreen.js:2174-2178`).
- **Usual/suggestion chips** on an empty meal card: pill (`radius.full`), 1px
  `border`, `surface2` bg, leading `add` icon in `primary`
  (`MealSection.js:228-234`).

## 5. Sheets/modals

**One sheet chrome, `BottomSheet`** (`BottomSheet.js`), a thin wrapper over
`@gorhom/bottom-sheet` — every Food sheet uses it, never a raw RN `Modal`:
- Scrim backdrop `colors.scrim` (`BottomSheet.js:203`); panel `colors.surface`
  bg, `radius.xl` (20px) top corners only, 1px `colors.border` top edge
  (`BottomSheet.js:285-291`).
- **Drag handle**: yes, by default (`showHandle=true`) — a 36×4px
  `radius.hair` bar in `colors.border` (`BottomSheet.js:295-299`); can be
  suppressed per-sheet (`showHandle={false}`) for an edge-to-edge menu.
- Dismiss paths: swipe-down (`enablePanDownToClose`), backdrop tap, Android
  hardware back — all wired to the same `onClose` (`BottomSheet.js:176-218`).
- Content padding: `spacing.lg` horizontal, `spacing.md` gap between fields
  (`BottomSheet.js:301-304`); `keyboardAvoiding` prop for sheets with text
  entry (`FoodDetailSheet.js:272`, `QuickAddSheet.js:82`).
- **Header inside the sheet body** is plain text, not a chrome bar: a bold
  `fontSize.lg` title line, optional muted subtitle directly below, no close
  icon repeated here (the drag handle + backdrop ARE the close affordance)
  — `FoodDetailSheet.js:273-274`, `QuickAddSheet.js:83-84`,
  `CuratedMealSheet.js:51-57`. Exceptions that use `SectionLabel` as the
  in-sheet title instead of raw `Text` are the diary's action sheets
  (`DiaryScreen.js:1856,1876,1923,1964`).
- **Button rows**: bottom of the sheet, `flexDirection: row`,
  `gap: spacing.sm`; a non-primary "Cancel/Close" (secondary/outline) beside
  a primary "Save/Add to diary" that takes the remaining width
  (`FoodDetailSheet.js:452-475`, `QuickAddSheet.js:137-153`,
  `CuratedMealSheet.js:95-118`).
- **Dietary Needs sheet** (`MealPlanScreen.js:1465-1479`): a `BottomSheet`
  with `scroll` (content can exceed the default cap), a title + one-line
  explainer ("This is the same selection as Settings…"), the shared
  `DietaryPreferencesEditor` body (diet Chips → allergen Chips → avoid-list
  rows, `DietaryPreferencesEditor.js:86-186`), then a full-width "Done"
  button that only dismisses (every choice already wrote to the store live,
  comment at `MealPlanScreen.js:1456-1463`) — the sanctioned "applies live,
  Done just closes" idiom.
- **Meal detail sheet** (`CuratedMealSheet.js`): title + one-line macro
  summary, a scrollable body of two `SectionLabel`-headed blocks ("In this
  meal" item rows, "Optional extras" additions with a leaf icon + intro
  copy), then the Close/Add-to-diary action row.

## 6. States & feedback

**Empty states** — two tiers, never a bare "nothing here" line:
- **Designed empty card** (`EmptyDiary.js`): `Card`-shaped surface, a single
  muted icon, one calm factual sentence (`EMPTY_DIARY_COPY`, no diet-culture
  language), an optional "Meal builder" promo row, then primary+secondary
  `Button`s ("Add food" / "Copy yesterday") — never 3+ CTAs competing.
- **Shared `EmptyState`** component (list/tab empties — Recents/Favourites/
  Frequents/search-miss in `FoodSearchScreen.js:828-850`): centred icon in a
  52px circle tinted `primaryBg`, optional title, `bodySm` explainer text,
  up to one primary + one secondary `Button` (`EmptyState.js:107-152`).
  `ghost` variant (dashed border, muted icon, dismissible) exists for a
  "preview of what this will look like" placeholder, unused by Food directly
  but part of the same component contract.
- **Skeleton loading**: `SkeletonRow` × 3 while the first day's load is in
  flight (`DiaryScreen.js:1498-1503`) and while Suggested loads
  (`FoodSearchScreen.js:855-861`) — content-shaped skeleton, never a bare
  spinner (comment at `FoodSearchScreen.js:854`).

**Toasts** (`Toast.js`) are the sanctioned feedback surface for every
non-destructive outcome; `Alert`/`appAlert` is reserved for destructive
confirms only (`Toast.js:1-7`). Variants used by Food: `success` (checkmark,
`colors.success`), `error` (alert-circle, `colors.error`, 4s), `warning`
(3.5s), `info`, and the domain-specific `undo` variant (arrow-undo icon,
`colors.warning` tint, **8s** hold) used on every delete/log so a mistake is
one tap to reverse (`DiaryScreen.js:763-766` log-usual, `1049-1052` bulk
delete, `FoodSearchScreen.js:442-445,563-567,620-623`).

**Haptics vocabulary** (`haptics.js`) used in Food: `selection()` — every
chip/tab/chevron tap (`FoodSearchScreen.js:958`, `DiaryScreen.js:864-865`);
`commit()` — the heavier "this just landed" beat after a destructive write
actually lands (`DiaryScreen.js:1046` bulk delete, `FoodDetailSheet.js:246`
entry removal); the `Button` primary variant's own `selection()` tick fires
automatically on press (`Button.js:156-158`). Weight/food-write actions that
are themselves the ED-safety-adjacent "diary-marking" moment are
DELIBERATELY left with no added haptic (comments at
`DiaryScreen.js:1831-1834,1969-1972`, `CuratedMealSheet.js:104-106`) — this is
a recorded exception, not an oversight, and must not be "fixed" elsewhere.

**Motion tokens** (`theme.js:821-861`): `motion.hero` (440ms) drives the
calorie-ring sweep + rolling numeral on a real change (`MacroRings.js:
243-246`); `motion.state`/`motion.sheet` govern Button's phase cross-fade and
BottomSheet's open/close spring (`Button.js:193`, `BottomSheet.js:220-223`
uses `motion.springs.settle`); every animated affordance collapses to instant
under `reduceMotion` (`MacroRings.js:244`, `Button.js:188`, `BottomSheet.js:
72,220-223`).

## 7. What makes it cohesive (load-bearing rules)

1. **One card primitive, one radius.** Every surface — whether it literally
   calls `<Card>` or hand-copies the contract — is `radius.lg` (16px),
   `colors.surface`, 1px `colors.borderSubtle`/`border`, `spacing.lg`
   padding. Evidence: `Card.js:39,43,100-101`; `MealSection.js:209-214`;
   `MacroRings.js:360-364`; `EmptyDiary.js:82-88`.
2. **Every data numeral is tabular and adherence-neutral.** kcal/macro
   readouts always carry `fontVariant: ['tabular-nums']` and never change
   colour on over/under target — the ring and bars stay one fixed tint each.
   Evidence: `EntryRow.js:213-235`; `MacroRings.js:14-26,254-255,442-450`.
3. **One sheet chrome for the whole app.** Every bottom sheet in Food is the
   same `BottomSheet` component: scrim, drag handle, `radius.xl` top corners,
   swipe/backdrop/back-button dismiss. No screen hand-rolls a `Modal`.
   Evidence: `BottomSheet.js:1-17,74-91,250-274`; every sheet import in
   `DiaryScreen.js`/`FoodSearchScreen.js`/`CuratedMealSheet.js`.
4. **One button primitive, three-tier text hierarchy.** Every CTA is
   `Button` (primary/secondary/outline), and every piece of text picks
   exactly one of `textPrimary`/`textSecondary`/`textMuted` by role, never
   ad hoc greys. Evidence: `Button.js:49-61`; `EntryRow.js:213,232-235`.
5. **Undo, not confirm, for reversible writes.** Delete/log actions commit
   immediately with an 8-second `undo` toast rather than a blocking
   confirm dialog; `appAlert` is reserved for genuinely destructive,
   irreversible account-level actions. Evidence: `Toast.js:1-7,54`;
   `DiaryScreen.js:763-766,1049-1052`.

## 8. Quick checklist (score any screen against Food)

1. Does every card use `radius.lg` (16px) and `colors.surface`/`borderSubtle`
   — no bespoke corner radius or bordered `View`?
2. Is card-to-card and section rhythm a consistent `spacing.lg` (16px), with
   in-card row padding `spacing.lg` horizontal / `spacing.md` vertical?
3. Does the screen use `ScreenHeader` (tab root) or `ModalHeader` (pushed/
   modal) rather than a bespoke header bar?
4. Do section/sheet titles use `SectionLabel` or the `type.title`/`h3` role,
   not a raw `fontSize`+`fontWeight` pair?
5. Is every data numeral (weight, reps, kcal, time) rendered with
   `fontVariant: ['tabular-nums']`?
6. Does colour hierarchy strictly use `textPrimary` → `textSecondary` →
   `textMuted`, with no invented fourth grey?
7. Is every button the shared `Button` primitive (correct variant/size), with
   no hand-rolled `TouchableOpacity` CTA?
8. Are pickers/toggles rendered as `Chip`, not custom radio rows?
9. Does every bottom sheet use the shared `BottomSheet` (drag handle, scrim,
   `radius.xl` top corners), never a raw `Modal`?
10. Does a sheet's action row put secondary (Cancel/Close) beside a primary
    action that takes the remaining width, with the primary using the
    idle→loading→success `state` morph on a write?
11. Is a reversible write (delete/log) followed by an `undo` toast rather
    than a blocking confirm `Alert`?
12. Are empty states either the designed `EmptyDiary`-style card or the
    shared `EmptyState` component, never a bare text line?
13. Is loading state a content-shaped `SkeletonRow`, never a bare spinner?
14. Does any colour-coded status (over/under target, watch/act) stay
    adherence-neutral, matching `stateColors`/the macro-ring rule, rather
    than inventing a red/green judgement?
15. Do haptics use the named vocabulary (`selection`/`commit`/etc.) rather
    than a raw `Haptics.*` call, and is a food/weight-write moment checked
    against the recorded no-haptic exception before adding one?
