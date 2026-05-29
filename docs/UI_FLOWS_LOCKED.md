# UI flows (locked)

Screen-by-screen specification for every new and modified surface
introduced across moves #0 to #5. Locked 2026-05-23.

## Design system reuse

Theme: existing `src/styles/theme.js` (dark `#0D0D0D` background,
amber `#F59E0B` accent, sans-serif typography). No new colours; new
component variants reuse existing tokens.

Existing components reused verbatim:
- `BrandMark`
- `EmptyState`
- `InfoTooltip`
- existing button, card, sheet, modal primitives

New components introduced (live in `src/components/food/`):
- `MacroRings`: kcal + P/C/F ring set (Skia-based, already a dep)
- `MealSection`: meal slot header + list of entries
- `FoodRow`: single food entry in a list
- `ServingPicker`: quantity input with unit toggle
- `EntryRow`: diary row with swipe-delete and long-press multi-select
- `SourceChip`: small badge showing OFF / USDA / CoFID / Custom
- `EmptyDiary`: empty-state for a day with no entries
- `DifferentialBadge`: "with food data, this would have said X" badge
- `HeldDecisionCard`: used for FFM-floor and ED-flag holds (reuses existing card primitive with a new variant)

## Navigation changes

The existing `RootNavigator` adds two new tabs and extends two
existing screens. Final tab order:

1. **Train** (existing, extended)
2. **Diary** (new)
3. **Insights** (existing, extended)
4. **You** (existing, extended)

The existing "Coach" / "Plan" surface stays as-is on the Train tab;
no nesting change. The order matches finger-reach from a one-handed
hold (Train and Diary the two most-used, on the left).

## Screen-by-screen

### Diary tab (NEW)

The day view. Default screen when tab opened.

Layout (top to bottom):
- Date pager: yesterday | TODAY | tomorrow chevrons + tappable date
  label opening a calendar sheet. Default state: today.
- Macro rings (kcal, protein, carbs, fat) showing consumed vs target
  for the selected day. Target sourced from `nutrition_targets`
  (engine-derived, read-only).
- Four meal sections in order: Breakfast, Lunch, Dinner, Snacks.
  Each shows:
  - Slot header with section total (kcal | P | C | F).
  - Logged entries below as `FoodRow`s.
  - "+ Add food" inline button at the bottom of each section.
- Water tracker: a thin row showing glasses logged today, tap to
  increment/decrement.
- "Copy yesterday" floating action at bottom-right corner.

Interactions:
- Tap a food row: opens the food detail sheet pre-filled with the
  entry; edit quantity or meal slot.
- Swipe a food row left: reveals delete. Confirm on tap.
- Long-press a food row: enters multi-select mode. Toolbar appears
  at top with "Delete", "Save as Meal", "Move to..." actions.
- Tap "+ Add food" in any slot: opens the Search tab pre-filtered
  to that slot (sticky filter chip top).
- Tap macro rings: opens a detail breakdown (per-meal contribution,
  micronutrient mini-list).

Empty state: a single `EmptyDiary` block with a "Log your first
meal" CTA → Search tab.

Performance: the day view reads from `daily_intake_rollups` for the
top-line totals (fast), entries from `food_entries` (filtered by
date and meal_slot). Cold open under 1s.

### Search tab (NEW)

**Founder override 2026-05-29.** The old far-right "Database" tab is
removed. The search box now searches the food database from any tab,
matching MyFitnessPal, MacroFactor, Cronometer and Lose It: a
persistent search bar over browse lists, not a tab the user has to
hunt for. The earlier five-tab layout (with Database last) confused a
user who could not find database search. Suggested moves to second so
the curated meals are visible without scrolling.

Browse subnav at the top: Recents | Suggested | Favourites |
Frequents | Custom. Below: a single search input that searches the
database from whichever tab is active.

Behaviour:

- A 2+ char query is a database search from any tab: free-text across
  the local `foods` + `custom_foods` cache first, then live OFF +
  USDA as fallback, debounced 250ms. The user's own custom foods rank
  first in results. Source chip on every result.
- With no query (or under 2 chars), each tab shows its own list:
  - **Recents**: last 25 distinct foods logged. Local SQLite. Instant.
  - **Suggested**: curated meals sized to the macros left for this
    meal (lists whole meals, not food rows; one tap logs the meal).
  - **Favourites**: foods the user has starred. Long-press a row to
    toggle favourite / dislike.
  - **Frequents**: top 20 foods logged in the last 30 days, by count.
    Updated nightly server-side, cached locally.
  - **Custom**: the user's `custom_foods` rows. "+ New custom food"
    CTA at top, plus My recipes / My meals.

Results: each row is a `FoodRow` showing name, brand, default
serving size, kcal per serving, source chip. Tap = open the food
detail sheet. No matches on a live query offers "Create a custom food".

### Scan barcode flow (move #1.5, NEW)

A modal screen, not a tab. Triggered from a floating "Scan" button
on the Diary tab and from a button in the Search tab toolbar.

Layout:
- Full-screen camera view via `react-native-vision-camera`.
- Crosshair overlay at the centre of the screen.
- Bottom sheet with hint: "Point at a barcode."
- Top-left: dismiss button (X).
- Top-right: torch toggle.

Behaviour:
- MLKit `CodeScanner` runs on the live preview.
- First successful read: freeze the frame, haptic feedback (single
  tap), run the waterfall lookup.
- On hit: dismiss the camera, open the food detail sheet pre-filled.
- On miss (all sources exhausted): show the "Couldn't find this
  product" sheet with two options: "Snap the nutrition label" (OCR
  fallback) or "Enter manually."

Performance: scan → detail sheet under 250ms on cache hit, under
1500ms on cold OFF lookup.

### Food detail sheet (NEW)

A bottom sheet (not full screen) that appears when a food is
selected from Search, Recents, scan, or Diary. Layout:

- Food name + brand at the top.
- Source chip below.
- Serving picker: numeric input + unit dropdown (g, oz, slice, cup,
  whatever the food provides). Default = food's default serving.
- Macro readout: kcal, protein, carbs, fat, fibre updated live as
  the serving changes.
- Meal slot picker: four buttons (Breakfast / Lunch / Dinner /
  Snacks). Default = current meal slot guess based on time of day
  (under 11am = breakfast, 11am-3pm = lunch, 3pm-9pm = dinner, else
  snack).
- "Add to Diary" CTA at the bottom.

Editing an existing entry: same layout but CTA reads "Save changes."
A "Delete" button appears next to it.

### Add Custom Food (NEW)

A full screen, opened from Search → Custom → "+ New custom food" or
from the "Couldn't find this product" sheet on a scan miss.

Form fields:
- Name (required).
- Brand (optional).
- Serving size: numeric + unit dropdown.
- Per 100g macros: kcal, protein, carbs, fat, fibre (kcal and the
  three macros required; fibre optional).
- "I have the label as a photo" toggle (move #1.5+): opens the OCR
  flow and prefills the form on confirm.

Sanity check on save: if kcal is more than 20% off the macro-derived
estimate (4·protein + 4·carbs + 9·fat), surface a soft warning
("Your numbers don't quite add up: 200 kcal labelled but the macros
total 240. Want to take another look?"). User can override.

### Insights tab (EXTENDED)

Existing screen. Move #1 and move #4 changes:

- New top-of-screen "Today" panel: kcal + P/C/F consumed vs target,
  taken from `daily_intake_rollups` for today.
- New "7-day intake" panel: daily kcal column chart, line for target.
  Tap any column to see that day's breakdown.
- Existing weekly coach output continues below.
- When the differential paywall (move #4) trigger fires, a
  `DifferentialBadge` appears inline with the relevant existing
  insight card.
- New CSV export button at the bottom: "Export my diary" → emails a
  CSV to the user's account email.

### You tab (EXTENDED)

Existing screen. New rows added (in order, after existing rows):

- **Subscription**: shows current tier, billing date, CTA to manage.
- **Privacy**: opens the Privacy section detailed in
  `PRIVACY_CONSENT_LOCKED.md`.
- **Diary preferences**: meal slot names (default Breakfast / Lunch
  / Dinner / Snacks but user can rename), default unit (g or oz),
  default water unit (ml, glasses, fl oz).
- **Goal lock** (only visible if `goal_lock_advanced = true` or if
  the user is in a competition/recomp goal): toggle to set/clear
  the goal lock. Tapping "clear" triggers the
  `clear_goal_lock()` RPC.
- **Credits**: source attribution for OFF, CoFID, USDA. Required by
  licence terms (see `FOOD_DATA_STRATEGY_LOCKED.md` Attribution
  section).

Existing rows (sign out, etc.) stay below.

### Train tab (EXTENDED)

Existing screen. One change: a new "Today's intake" card appears
below the existing welcome block, showing:

- Three compact macro pills (P / C / F as consumed/target).
- Kcal number.
- Tap = jumps to the Diary tab.

Reads from `daily_intake_rollups` on focus.

### Body Metrics screen (EXTENDED)

Existing screen. One change: a new single-line stat appears next to
the weight trend: "Avg intake last 7d: 2,240 kcal / 165g P / 220g C
/ 65g F." Reads from `daily_intake_rollups` averaged over the last 7
days.

### Cascade hold gate screen (move #5, NEW)

Modal full-screen surface that appears on day 14 of the cascade,
again on day 28, and on subscription failure.

Layout:
- Title: "Your trial is winding down" (day 14), "Your Pro trial is
  winding down" (day 28), or "We couldn't take your payment" (lapse).
- Subtitle: explains what's about to change.
- Two-column pricing strip (Pro | Complete) with the three named
  differences from
  `OPEN_QUESTIONS_RESOLVED.md` Q3.
- Three CTAs vertically:
  - Primary (largest): "Stay on Complete" or "Stay on Pro"
  - Secondary: "Switch to Pro" / "Drop to Free"
  - Tertiary text link: "Read the privacy policy" / "What changes?"

Tapping a paid CTA initiates the RevenueCat purchase flow.

### Held-decision card (NEW)

A card that appears in the weekly coach output (Insights tab) when:

- The FFM floor fires.
- The ED-pattern flag fires.
- The rapid-loss safety override fires.

Layout (reuses existing card primitive with a held-decision badge
variant):

- Header: amber badge "Held this week"
- Body: plain-English explanation. For FFM floor: "We've held your
  calorie cut. Your food data shows you're already eating right at
  the safety floor we set for your build. We'll suggest a new cut
  once your fuelling has more room." For ED-pattern: see Section 6
  copy in `RESEARCH_FINDINGS_SYNTHESISED.md`.
- "Why" tap (uses existing `InfoTooltip` pattern): opens a longer
  explanation panel with the relevant research citation (in plain
  English, no surname).
- For ED-pattern only: a "Get support" button linking to Beat (UK)
  and equivalents.

## Empty states

Every new screen has a designed empty state. Reuses
`EmptyState` component with these copy variants:

- **Diary, no entries today**: "No food logged yet. Tap a meal slot
  above to start. Or use Scan to grab something from a barcode."
- **Search, Recents empty**: "Foods you've logged will show up here."
- **Search, Favourites empty**: "Star a food to keep it close."
- **Search, Database empty (no query)**: "Type a food name above."
- **Search, no results**: "Nothing here yet. Try a different name
  or tap '+ New custom food' to add it yourself."
- **Photo timeline empty**: "Photos you take show here. They stay
  on this device."

## Accessibility

All new screens meet the existing app's accessibility bar:

- Dynamic type support via theme typography tokens.
- Minimum contrast 4.5:1 (theme amber on dark background passes).
- Screen reader labels on every interactive element (CTAs, swipe
  actions, multi-select toolbar).
- VoiceOver / TalkBack rotor-friendly headings.
- Reduced motion mode: disable Skia ring animation (show static
  segments).
- 48px minimum tap target across all interactive elements, matching
  the existing design system rule in `docs/DESIGN_SYSTEM.md`.

A linting rule (`react-native-a11y-lint` or similar) is added to CI
to catch missing accessibility labels.

## Performance targets (per surface)

| Surface | Target |
| --- | --- |
| Diary cold open | <1.0s |
| Search keystroke -> local results | <120ms |
| Search keystroke -> network results | <450ms |
| Scan -> detail sheet (cache hit) | <250ms |
| Scan -> detail sheet (cold) | <1500ms |
| Food detail sheet open | <60ms |
| Macro ring redraw on serving change | <16ms (one frame) |

## Out of scope at v1

These appear in design discussions but defer:

- AI photo logging (also out per the locked decisions).
- Recipe URL importer (v1.1).
- Photo progress timeline UI (v1; on-device only, no cloud sync).
- Body composition deep charts (v1.1).
- Saved meals full UX (move #1.5+).
- Coach view inside the app (phase 2, web only).

## Acceptance check

- All screens listed render in the existing theme without new
  colour additions.
- Macro rings animate smoothly at 60fps on a mid-range Android.
- Empty states show the copy listed above verbatim.
- VoiceOver navigation through the Diary tab announces every
  meaningful element in reading order.
- Cold open of Diary on a mid-range Android: under 1.0s from app
  launch.
