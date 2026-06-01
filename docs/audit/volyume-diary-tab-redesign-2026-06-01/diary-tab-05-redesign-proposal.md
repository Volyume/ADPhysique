Status: COMPLETE | Timestamp: 2026-06-01 | Phase 5: Redesign proposal

# Diary tab redesign proposal

A complete, specific redesign. It keeps what is already best-in-class (the
calorie ring summary, adherence-neutral colour) and rebuilds the body of the
screen into one premium card language built for a training user who logs with
intent. Nothing here is built in this pass; it is a design specification.

Hard constraints honoured throughout: locked `#0D0D0D` background, no gradients,
amber `#F5A623` as the single brand accent, tiered radii, adherence-neutral
colour (no green-for-good, no red-for-over, `MacroRings.js:11-20`), plain
no-cheerleading copy (CLAUDE.md voice rules). All tokens referenced are from
`src/styles/theme.js`.

The organising principle, from the research: lead with one glanceable read and
never tax the log. MyFitnessPal's April 2026 redesign is the cautionary tale,
it buried per-meal subtotals behind "View All" and added taps, and drew the
category's loudest backlash (Phase 2). Volyume should do the opposite: keep
per-meal macros visible in place and protect logging speed (Phase 3: abandonment
climbs once a log passes ~30 seconds).

## 1. Daily summary header

Keep the structure of `MacroRings`, elevate two things.

- The calorie ring stays the hero: it is the one glanceable read (Phase 2
  pattern 1). Keep the 132px Skia ring, the centre hero numeral, and the
  remaining / over readout. Add a count-up on the calorie number and an
  animated sweep when the day changes or an entry lands, so the headline number
  feels alive (cross-domain: Apple Activity Rings close with motion, Phase 2).
- Replace the three equal 44px macro sub-rings with three slim horizontal
  bars, Protein first and given visual primacy. Research is explicit: a macro
  athlete tracks four numbers, and bars read all four against target at a
  glance where small competing rings read slower (Phase 2 pattern 2; Phase 3:
  "a single clear protein bar reads instantly"). Each bar: label + "{value} /
  {target} g" in tabular-nums, amber fill on a `surface2` track, no colour
  judgement. Protein sits top, slightly heavier label weight, because it is the
  number this user defends. Carbs and fat below at equal weight.
- Behaviour: empty day shows full-width tracks at zero with the targets spelled
  out ("0 / 200 g"). As the day fills, bars and ring fill in amber. Over target
  is shown by the number (value exceeds target) and the bar capping at full,
  never by colour. The day-type chip ("Training day" / "Rest day" / "Refeed
  day") stays where it is (`MacroRings.js:126-130`).
- Tap still opens the per-meal breakdown sheet. Card styling unchanged
  (`surface`, `border`, `radius.lg`, `MacroRings.js:170-176`), it is the
  reference card the rest of the screen will now match.

## 2. Meal sections

This is the largest change. Each meal becomes one contained card in the same
language as the summary, replacing the current containerless section
(`MealSection.js:43`) and the per-item bordered cards (`EntryRow.js:96-104`).

- Card: `surface`, 1px `border`, `radius.lg`, `padding md/lg`, `marginBottom
  lg`. One card per meal, so the screen reads as a clean stack of cards instead
  of floating labels, bordered rows and dashed boxes.
- Header row: the meal name as `type.bodyStrong` (not shouty uppercase
  letterspaced, which currently competes with item names), and on the right the
  per-meal subtotal showing BOTH calories and protein, e.g. "420 kcal · 38g P"
  in tabular-nums. Per-meal subtotals visible in place is the single most
  important lesson from MFP's backlash (Phase 2 pattern 3); protein in the
  subtotal serves the training user (Phase 3 section 4). Full P/C/F is one tap
  away in the breakdown sheet.
- Items: rows INSIDE the card, separated by hairline dividers, not individual
  bordered cards. Each row: food name (`type.body`) + grams beneath in
  `type.caption` muted on the left; "{kcal}" and "{p}P {c}C {f}F" right-aligned
  in tabular-nums. Swipe-to-delete and tap-to-edit stay (`EntryRow.js:57-91`).
  Removing the per-item border de-clutters the list and lets the card own the
  grouping.
- Add affordance: replace the dashed box (`MealSection.js:50-56`) with a quiet
  full-width "Add food" row at the foot of the card, an amber `+` and label, no
  dashed border. It reads as part of the card, not a placeholder.
- Empty section: a meal with nothing logged collapses to a single slim line
  ("Breakfast  ·  add") rather than a full card with a dashed box. This is what
  removes the "six identical dashed boxes" problem at the root: an empty day is
  a short list of slim add-lines, not six placeholder boxes.
### Meal structure: numbered meals, not human-meal names

The fixed Breakfast / Lunch / Dinner / Snacks set (`DiaryScreen.js:40-47`) is a
wellness-app convention and the wrong model for this user. A physique athlete
does not eat three meals and a snack; they run four to eight structured meals a
day. That is exactly why Pre-workout and Post-workout were added, but bolting
two training slots onto a three-meals-and-snacks frame still forces the rest of
the day into names that do not fit.

Replace it with a flexible, numbered meal model:

- Default to numbered meals: "Meal 1", "Meal 2", "Meal 3"... The user sets how
  many meals they eat (a meals-per-day preference, default around four to five
  for a training user), and can add a meal inline with a quiet "+ Add meal" at
  the foot of the list or remove one. No forced Breakfast / Lunch / Dinner /
  Snacks.
- Renameable: a meal can be given a name if the user wants one ("Breakfast",
  "Intra", "Before bed"), but the default is the number, not a human-meal label.
  This serves both the athlete who thinks in Meal 1 to N and the user who still
  likes "Breakfast", without defaulting to the wellness frame.
- Pre-workout and Post-workout remain special, training-anchored meals (see
  below), inserted in sequence around the session rather than living as fixed
  rows at the bottom.
- Order is by sequence / time through the day. Sections are collapsible and
  remember state.
- This matches how training-focused apps and athletes actually structure a day
  (Phase 3 section 4: training users want a diary built for their eating
  pattern, not a general-wellness frame), and how flexible-meal competitors
  (MacroFactor's time-based meals, MyMacros+ renameable meals) already work
  (Phase 2).

Data-model note (honest correction): this is the ONE part of the redesign that
is not presentation-only. `food_entries.meal_slot` is `TEXT` locally
(`database.js:822`) but the cloud carries a CHECK constraint locked to
`breakfast / lunch / dinner / snack` plus `preworkout / postworkout`
(`supabase/migrate_057_meal_slots_periworkout.sql`), and `meal_slot` is read
across roughly 18 files (search, scan, recipes, saved meals, breakdown, CSV
export, curated meals, sync). Numbered meals need the slot key to become
flexible: either widen / drop that CHECK to accept `meal_1..meal_n` (plus the
peri-workout keys), or add a `meal_index` integer with an optional label and
treat peri-workout as a flag. Widening the CHECK is additive and
frozen-build-safe: the old build only ever writes the existing six values
(still valid), and an unknown new key synced down simply falls outside its
fixed buckets rather than crashing. Legacy entries map to display labels for
back-compat. This is the largest single item in the redesign and is flagged as
such in Phase 6.

Suggested-meal dependency (the "+" picker). The curated meals and curated foods
that power the meal suggestions are tagged with the fixed slot names: every
entry in `curatedMeals.js` carries `slots` such as `['breakfast']` or
`['lunch','dinner']` or `['snack']`, and `mealSuggest.js:slotMatches` filters
the picker to the slot being logged ("breakfast meals at breakfast",
`mealSuggest.js:155-156`). Numbered meals have no breakfast/lunch/dinner name,
so a name-based filter would stop surfacing slot-appropriate suggestions. Do
NOT re-tag all the curated data by hand. Keep the tags (they encode useful
meal-character: an early meal, a main meal, a small meal) and change the INPUT
to the filter instead: a numbered meal infers a suggestion context (early /
main / small / peri-workout) from its time of day, its macro size, or its
position in the day, and that context maps to the existing tags. Pre-workout
and Post-workout map directly to a peri-workout context, and this is also the
moment to add peri-workout-suitable curated meals, since `curatedMeals.js:15`
notes there is no pre/post-workout detection today, so those slots currently
get no curated suggestions at all. Where no context resolves, fall back to the
macro-driven ranking the engine already does (rank by remaining macros and
meals-left, `mealSuggest.js:165`). This keeps every curated entry useful under
the new model without a re-tagging pass.

### Pre-workout and Post-workout, tied to the session

The screen already knows whether today is a training day (`isTrainingDay`,
`DiaryScreen.js:87`) but the workout slots ignore it. Make them training-aware:

- On a training day, the Pre-workout and Post-workout cards show the day's
  session in their header ("Pre-workout · Push day") and offer a tap-through to
  that workout. This is the thing a general wellness app cannot do and a
  physique app should (Phase 3 section 4).
- On a rest day, the two workout slots collapse into a single muted "add
  pre/post-workout food" line so they are available but not clutter
  (addresses the rest-day clutter in Phase 1 finding 14.7). Data model already
  supports the slots; this is presentation only.

## 3. Quick actions and logging

Protecting logging speed is the retention hinge (Phase 3). Surface the fast
paths and stop hiding them.

- Primary action: the per-meal "Add food" row is the primary entry, search
  first (`DiaryScreen.js:179-183`). Keep it.
- A quick-log strip: at the top of the body (or inside an empty section on
  tap), show a horizontal row of the user's Frequents and Saved meals, which
  already exist in the app (`src/lib/food/frequents.js`, saved meals via
  `createSavedMeal`). One tap to re-log a staple is the fastest path for a prep
  diet that repeats (Phase 3: training users want fast repeat-meal flows). This
  is the single biggest speed win and it reuses data that already exists.
- Barcode scan: keep the FAB but make it the secondary of a single FAB cluster,
  not one of two stacked floating elements. A primary amber "Add food" FAB with
  scan as a smaller secondary, or scan as the one FAB with add living in the
  cards. Either way, remove the second free-floating pill.
- Copy yesterday: move it OUT of the empty-only FAB (`DiaryScreen.js:527`). Put
  it in the empty state as a clear button, and keep it reachable any day from a
  small overflow on the day pager, so it does not vanish the moment the user
  logs one item. The current behaviour removes a useful action exactly when a
  user who logged breakfast wants to copy the rest of yesterday.

## 4. Water tracker

Bring water into the card language and give it a target (Phase 4: it is
currently a different idiom, `DiaryScreen.js:629-648`).

- A compact card matching the meal cards: a slim horizontal progress bar (amber
  fill on `surface2` track, same as the macro bars) from 0 to a daily target,
  with "{litres} / {target} L" in tabular-nums and a `+` to add a glass. Tap
  the bar to add, long-press for a custom amount. Keep 250 ml as the default
  increment but show litres as the headline unit.
- Target: default 2 L (or bodyweight-scaled), set once in settings. Without a
  target the tracker is just a counter; with one it joins the same
  "progress toward a goal" story the macros tell.
- Placement: directly under the summary or as the last card before the add
  flow, not stranded between the meals and the empty text.

## 5. Empty state

One designed state, not six dashed boxes plus a trailing sentence
(`DiaryScreen.js:469-487`, `EmptyDiary.js`).

- The summary stays at the top, reading the targets in context: the ring at
  zero, and a single plain line that states the day's job, e.g. "2,800 kcal and
  200g protein to hit today." No cheerleading (CLAUDE.md: report facts, the
  user's response is their own).
- If today is a training day, one contextual line: "Push day today." Tied to
  the session, not a motivational slogan.
- The meal list shows as slim add-lines (per point 2), so the body is calm, not
  a wall of placeholders.
- One clear primary affordance: "Add food", with Scan and Copy yesterday as
  secondary buttons beneath it. This replaces both the dashed boxes as the
  call to action and the trailing `EmptyDiary` sentence.
- Remove the standalone `EmptyDiary` sentence and the dead `empty*` styles
  (`DiaryScreen.js:769-775`).

## 6. Navigation and date handling

- Add horizontal swipe between days over the body, keeping the chevrons and the
  Today pill (`DiaryScreen.js:432-448`). Swipe is the expected gesture and
  speeds day-to-day review (Phase 2 cross-domain: Apple / Gentler Streak day
  navigation).
- Optional, lower priority: a slim seven-day strip above the summary showing
  each day as logged / partial / empty by fill, so a user can see the week and
  jump. Subtle, amber fill, no numbers, in keeping with "glanceable".
- States: today is the default. A past day reads the same but with a quiet
  "past" cue and copy-to-today available from selection. A future day is framed
  as planning ("planning ahead") rather than logging. Keep future bounded to a
  short horizon rather than unbounded (`gotoTomorrow` currently uncapped).

## 7. Overall visual elevation

- One card language: every block (summary, each meal, water) is `surface` + 1px
  `border` + `radius.lg`. No bare sections, no per-item borders, no dashed
  boxes. This is the single biggest lift to "premium".
- Typography: use the semantic `type` roles consistently (`type.bodyStrong` for
  meal names, `type.body` for items, `type.caption`/`type.label` for meta,
  tabular-nums for every number) instead of the current mix of roles and raw
  size/weight pairs. One hierarchy: the calorie number is the loudest thing on
  the screen, then meal names, then items, then meta.
- Colour: amber only for progress fills and the primary add affordance.
  Everything else neutral. Protein gets the one subtle weight emphasis in the
  summary and the per-meal subtotal, because it is the training user's priority
  number, never a different hue (adherence-neutral holds).
- Spacing: group with the cards and let the screen breathe; `spacing.lg`
  between cards, `spacing.md` inside.
- Micro-interactions: count-up on the calorie number; the ring sweep animating
  on change; a subtle scale-and-settle when a new entry lands in a card; a
  light haptic on add and on hitting a macro target (haptic only, no colour, no
  copy). `AnimatedEntrance` already staggers the cards in (`DiaryScreen.js:470`),
  keep it.

## 8. What to remove or simplify

- The dashed "Add food" box idiom (`MealSection.js:50-56`).
- The standalone `EmptyDiary` sentence and the dead `empty*` styles
  (`DiaryScreen.js:769-775`, `EmptyDiary.js`).
- Per-item card borders (`EntryRow.js:96-104`), fold rows into the meal card.
- The second stacked FAB (`copyYesterdayFab`), fold copy-yesterday into the
  empty state and the day-pager overflow.
- The shouty uppercase letterspaced meal label (`MealSection.js:48`), replace
  with a calm `type.bodyStrong`.
- The stale "four meal sections" comment (`DiaryScreen.js:7`).

## Coherence check

Every surface above uses the existing card recipe (`surface` + `border` +
`radius.lg`) already used by `MacroRings` and `WaterRow`, the existing `type`
roles, the existing amber accent and adherence-neutral rule, and the existing
data (`frequents`, saved meals, `isTrainingDay`, rollup, water). Nothing here is
a generic food-app template dropped in: it is the Volyume card-and-amber
language applied consistently to a screen that currently only applies it in
two places.
