# impl-COMP-003 — Quick-add kcal/macros: the imperfect-day escape hatch

> Round-2 implementation blueprint per `impl-00-shared-brief.md`. No code
> changes in this document. Approved spec seed:
> `../competitive-audit-03-master-proposals.md` COMP-003 (impact 7, effort 1,
> priority 7.0 — Tier 3 quick win, Sprint 1–2).
>
> **Fetch note:** direct WebFetch of macrofactor.com help pages and
> cronometer.com forums returned HTTP 403 during this research; evidence from
> those sources is search-extract-only and flagged `[SE]` below. All code
> claims are verified against the branch source.

---

## 0. Code ground truth (verified 2026-06-10, this branch)

The implementation is **further along than the audit docs say.** A full
component-level audit reveals:

| Layer | Status | Evidence |
|---|---|---|
| QuickAddSheet component | **EXISTS, substantially complete** | `src/components/food/QuickAddSheet.js` — full form: kcal required, protein/carbs/fat optional, meal-slot picker (reads `pickerMealSlots`), submit guard, toast on error |
| Sheet wired into FoodSearchScreen | **EXISTS** | `src/screens/FoodSearchScreen.js:48,68,576,732-740` — imported, state `showQuickAdd`, header flash-icon button (`flash-outline`, `accessibilityLabel="Quick add calories"`), `QuickAddSheet` rendered with `onSave={confirmQuickAdd}` |
| Write path complete | **EXISTS** | `FoodSearchScreen.js:305-318` — `confirmQuickAdd` calls `logFoodEntry(userId, { foodRef: 'quick:adhoc', quantityG: 0, kcal, proteinG: protein, carbsG: carbs, fatG: fat })` |
| food_ref convention | **EXISTS** | `food_ref = 'quick:adhoc'` — not resolvable by `resolveFoodRef`; diary falls back to the `friendlyFoodName` label |
| DiaryScreen EntryRow display | **EXISTS** | `src/components/food/EntryRow.js:26` — `isQuick = entry?.food_ref?.startsWith('quick:')` suppresses the gram-weight line; `friendlyFoodName` returns `'Quick add'` for `quick:` refs |
| Unit test | **EXISTS** | `src/components/food/__tests__/foodComponents.test.js:146-148` — `friendlyFoodName({ food_ref: 'quick:adhoc' })` === `'Quick add'` |
| Rollup / sync | **EXISTS** | `logFoodEntry` calls `recomputeRollup` and `_scheduleSync` on every write; quick-add entries go through the same path as any other entry |
| Telemetry gap | **MISSING** | `logFoodEntry` telemetry (`food_logged`) classifies `food_ref_source` as `'custom'` or `'global'` — `quick:adhoc` falls to `'global'` silently; quick-add usage is unmeasurable |
| Entry-point discoverability | **PARTIALLY INCOMPLETE** | The flash icon is in FoodSearchScreen's header — **the user must first navigate to FoodSearch to find it.** DiaryScreen has no direct quick-add entry point; the escape hatch is two taps away and in a location users may never look |
| Optional name field | **MISSING** | QuickAddSheet has no name/label input (e.g. "Restaurant dinner") — the spec says "named optionally" but the form has no such field |
| DB `quick_add` flag | **NOT PRESENT** | `food_entries` schema has no `quick_add` column; the `food_ref = 'quick:adhoc'` convention serves as the implicit flag, but it is not queryable as a first-class concept |

**Summary:** The mechanics are ~85% there. The two real gaps are
(1) discoverability — the entry point lives inside FoodSearchScreen's header,
not in every meal slot's add row where users need it; and
(2) a named-label input is missing from the form. Everything else — the DB
write, the rollup, the sync, the diary display — already works correctly.

---

## 1. Best-in-market bar

### MacroFactor — the named reference and category winner

Quick-add is a first-class concept, accessed via the `+` button at the bottom
of the plate view and surfaced as a named option alongside the food search.
The user enters macros; calories auto-calculate from them (4/4/9 formula); the
user may also edit the calorie figure independently. Entries are **not
searchable later** — this is an explicit design choice: quick-add is for
one-off estimation, not for building a food library. The design rationale:
"quick-add is designed specifically for foods you don't intend to eat
frequently" `[SE: help.macrofactorapp.com/en/articles/41, 2024]`. The
optional name field exists. The entry lands in the plate with no gram weight
shown. This is a clean, honest UX — it gives the user what they need (an
escape hatch) without pretending it is something it is not.

What makes it work: (a) it is reachable from the same tap that opens the food
logger — not buried; (b) kcal is the only required field; (c) macros
auto-calculate calories so the user cannot create an impossible entry;
(d) the "not saved to your database" behaviour prevents clutter.

### MyFitnessPal — high discoverability, execution mediocre

Quick add is in the diary's per-meal `+` menu as a named row alongside "Search
database" and "Scan barcode." The entry point is exactly right — it is one of
three clear options at the moment of intent. Execution is less clean:
(a) MFP asks for calories only, not macros, which is fine for casual users but
frustrating for physique athletes who want at least protein; (b) the resulting
diary entry is indistinct from a full food entry to casual inspection;
(c) there is no audit signal that the day's protein estimate is rough. Users
note the feature exists and appreciate its speed `[SE: reddit.com/r/myfitnesspal,
multiple threads 2023-2024]`.

What makes it work: the placement — it is a named option in every meal slot
menu, not an icon buried in a header.

### Lose It! — quick-add-adjacent via recents/auto-complete

Lose It! praised for approachability and frictionless design; rated as the
easiest logger for beginners ([Amy Food Journal review, loseit-app-review,
accessed 2026](https://www.amyfoodjournal.com/blog/lose-it-app-review)).
Quick-add of raw calories is available as a menu option in the log flow.
The app's overall design philosophy — open to a remaining-calorie budget,
fast recents list — means the escape hatch is not as necessary as on
precision-first apps; the database coverage (27M items) means users find
things faster. The lesson: a high-quality search experience reduces how often
quick-add is needed.

### Cronometer — the cautionary counter-example

No native quick-add button as of 2024. The community workaround is to search
for "Quick Add - Calories" as a special food entry, or to create four custom
foods (one per macro) with 1 g/1 kcal unit values. Multiple forum threads
spanning 2018–2024 document ongoing frustration:
"this is a prominent and easy-to-use feature on MyFitnessPal that Cronometer
is missing" `[SE: forums.cronometer.com/discussion/5382, accessed 2026]`.
Cronometer's stated rationale is that it values complete accurate data and
does not want to promote incomplete entries. This is philosophically coherent
but behaviorally wrong: users who cannot quickly log a restaurant meal simply
log nothing, producing a worse data signal than an honest estimate.

### Yazio — smart-adding, not quick-adding

Yazio's "Smart Adding" proactively suggests saving frequently-logged food
combinations as a single meal, reducing friction over time
`[SE: search results, 2026]`. This is an excellent adjacent feature but does
not address the imperfect-day case. Raw calorie quick-add exists but is not
prominent in the design story.

**The single best reference: MacroFactor.** Its placement is correct
(accessible from the logger entry point), its form is honest (not searchable),
and its kcal auto-calculation from macros is the right UX for physique athletes
who think in macros first.

---

## 2. What fails

### The hidden-icon anti-pattern (current Volyume state)

The Volyume flash icon in FoodSearchScreen's header is exactly the wrong
placement. To reach quick-add today, the user must:
1. Tap "Add food" on a meal slot card (navigates to FoodSearchScreen).
2. Notice a small flash icon (`flash-outline`) in the top-right header.
3. Tap it.

Step 2 is the failure. The icon is next to the barcode scanner icon — both are
small, both are icon-only. A user who has never been told quick-add exists will
never discover it. The entire point of the feature is to catch users at the
moment they give up on searching; if the escape hatch is invisible, they give
up entirely. This is the "hidden in Settings" failure the shared brief names as
the cautionary example.

### Requiring all four macros

Any implementation that requires protein, carbs, and fat as mandatory fields
fails. Users estimating a restaurant meal may know only "roughly 700 kcal";
forcing them to guess carbs and fat before saving introduces friction that
defeats the purpose and increases estimation anxiety. Cronometer's old
workaround required separate custom foods for each macro — a perfect example
of how a technically correct implementation can be behaviourally worthless.

### No context / shame framing

Implementations that present quick-add as a "cheat" or make the entry visually
alarming (red, asterisked, prominent warning) breed shame rather than
pragmatism. A 2022 review in Appetite found that calorie tracking apps can
elicit "obsessional, dichotomous, or perfectionistic thinking related to
eating" ([ScienceDirect, 2021](https://www.sciencedirect.com/science/article/abs/pii/S1471015321000957)).
The escape hatch must feel neutral — a practical tool, not a confession.

### Learned helplessness via over-use promotion

The opposite failure: making quick-add the default path, or placing it equal
to or above the search flow, trains users to estimate rather than look things
up. MFP's placement (one of three options at the same level as search) risks
this when users are in a hurry. Volyume's positioning must be secondary to
search: present, reachable, but not the recommended first action.

### Saving quick-add entries to a reusable food list

MacroFactor's explicit "not searchable later" design is correct. If quick-add
entries are saved as searchable foods, the database fills with low-quality
one-off items ("Restaurant dinner 600 kcal") that surface in future searches
and erode trust in the food list. This was a chronic MFP complaint before they
added the ability to clear search history.

---

## 3. User psychology

### The imperfect-day moment

The user reaching for quick-add is not the user who is bored with searching.
It is the user who:
- Is at a restaurant with no menu items in the database.
- Just finished a work lunch they cannot itemise.
- Is in bed logging yesterday retroactively and cannot remember specifics.
- Has already had an "off-plan" meal and feels the day is lost.

The last case is the most dangerous. Research from a 12-week MFP study found
that consistent tracking fell from 68% of participants in week 1 to 21% by
week 12 — and the primary predictor of dropout was hitting one unlogged day
and not returning ([arxiv.org/pdf/1904.02813, Goal-setting in MyFitnessPal,
cited in our retention research]). The "imperfect day" is the churn gate.

Quick-add's entire job is to give the user a way to log something rather than
nothing, removing the binary choice. The coaching literature frames this as
"consistency over precision" — an imperfect log still informs the plan; no log
does nothing
([adrockpt.com, Master nutrition tracking: Consistency not precision, 2026](https://www.adrockpt.com/blog/2026/1/21/master-nutrition-tracking-consistency-not-precision)).
Or, more directly: "the best logging method is the one you can still use on a
tired Thursday, at a restaurant on Saturday, and on a travel day"
([fuelnutrition.app, AI Food Logging Accuracy, 2026](https://fuelnutrition.app/blog/ai-food-logging-accuracy-benchmarks-failure-modes-and-a-practical-audit)).

### The perfectionism trap

Research confirms that 79% of perfectionist dieters quit within 72 hours of
their first perceived failure ([Hoot Fitness, How to track calories without
losing your mind, 2026](https://www.hootfitness.com/blog/how-to-track-calories-without-losing-your-mind)).
Quick-add must be positioned as "the pragmatic move, not the failure," with
language that normalises estimation. The house voice — plain, terse, honest —
is exactly right for this: no cheerleading, no apologies, just practical
framing.

### The physique athlete's specific need

Volyume's users are not casual calorie counters. They are physique athletes
who primarily defend protein targets. For this user, "roughly 600 kcal and I
know there was about 40g protein" is genuinely useful data even without exact
carbs and fat. The form must accept partial macro entry and calculate kcal from
macros if the user prefers that direction.

### The shame signal in diary presentation

Quick-add entries in the diary must not look like confessions. No warning
icons, no asterisks, no red text. A subtle muted label ("Quick add") replacing
the food name — already implemented in `EntryRow.js` — is correct. The gram
weight line being suppressed (also already implemented) is correct; showing
"0g" would look broken.

---

## 4. The Volyume implementation

### Placement — the one change that matters most

The current flash-icon placement is wrong. The fix is simple and requires no
new component: add a "Quick add" named row **inside every MealSection card's
add area**, visible alongside "Add food."

**Specifically:**

In `MealSection.js`, the current add affordance is a single "Add food" row at
the card bottom. This should become two options:

```
[ + Add food ]           <- primary, always visible
[ ⚡ Quick add ]         <- secondary, smaller, same card
```

The "Quick add" row opens `QuickAddSheet` with the slot pre-filled — no
navigation to FoodSearchScreen required. This means the escape hatch is
present at the exact moment of intent (looking at a meal slot, deciding what
to log) with zero extra navigation.

The flash-icon in FoodSearchScreen's header stays as a secondary path for
users who have already started searching and then decide to quick-add instead.
Both entry points call the same `QuickAddSheet`; only the trigger location
changes.

**DiaryScreen integration:**

`DiaryScreen.js` passes `onAdd` to `MealSection`. The quick-add path needs a
parallel `onQuickAdd` prop that `DiaryScreen` handles by showing a
`QuickAddSheet` rendered directly in `DiaryScreen` (alongside the existing
`FoodDetailSheet` and `MacroBreakdownSheet`). The `confirmQuickAdd` write
logic already exists in `FoodSearchScreen`; it needs to be duplicated (or
extracted to a shared helper) in `DiaryScreen`.

This placement obeys the "placement is the product" principle from the shared
brief. It is present at the moment of need, not buried one screen deeper.

### The QuickAddSheet interaction spec

**Fields (verified against current component state):**

| Field | Status | Required? | Notes |
|---|---|---|---|
| Calories (kcal) | EXISTS | Yes | 1–5000 guard already in place |
| Protein (g) | EXISTS | No | Blank = 0 |
| Carbs (g) | EXISTS | No | Blank = 0 |
| Fat (g) | EXISTS | No | Blank = 0 |
| Meal slot picker | EXISTS | Yes | Pre-filled from calling slot |
| Name / label (e.g. "Restaurant dinner") | MISSING | No | Needs adding |

The name field is genuinely useful — it turns a `'Quick add'` diary label into
`'Restaurant dinner'` or `'Nando's lunch'`, making the diary readable when
reviewing the week. It should be optional, short (60 chars), below the macro
fields, and low visual weight (no uppercase label header, just a placeholder:
"Label, e.g. Restaurant dinner").

If the user enters a name, `food_ref` should be `'quick:adhoc'` but the name
must be stored somewhere readable by the diary. The cleanest path: store the
name as a special `_name` field on the entry. Because `logFoodEntry` does not
have a notes/name column, the name must either (a) be stored in a new `notes`
column on `food_entries` (a new migration), or (b) treated as an optional
custom food with `food_ref = 'quick:<uuid>'` so `resolveFoodRef` can return
the name.

**Recommended approach for the label field:** Option (b) — store named
quick-add entries under `food_ref = 'quick:<uuid>'` and insert a minimal row
into `custom_foods` (name only, all macros per-100g derived from kcal/100g
convention). This keeps the DB schema clean, reuses existing resolution paths,
and means the diary already shows the label without further EntryRow changes.
Unnamed entries continue to use `food_ref = 'quick:adhoc'` as today.

**States:**

- **Default open:** kcal field auto-focused (already implemented). Macro
  fields show placeholder `0`. Meal slot pre-filled. CTA: "Add to diary".
- **Saving:** button text changes to "Saving" and disables (already
  implemented).
- **Error (kcal out of range):** toast: "Enter calories between 1 and 5000."
  (already implemented).
- **Success:** sheet closes, diary reloads. No celebration toast — the
  house voice is terse; the numbers updating in MacroRings is the reward.
- **Offline:** no change in behaviour — `logFoodEntry` writes to SQLite
  locally; `_scheduleSync` queues for next connection. Works offline as-is.
- **ED/wellbeing flag open:** no suppression of quick-add — it is a neutral
  logging tool. The safety system's calorie floors operate at the coaching
  engine layer, not the diary logging layer. A user under a wellbeing flag
  can still log any calorie figure; the engine handles the floor separately.

**Accessibility:**

- BottomSheet already has `accessibilityLabel="Quick add"`.
- Each TextInput needs an explicit `accessibilityLabel` matching its visible
  label (e.g. `accessibilityLabel="Calories"`).
- The meal-slot Pressable buttons already set `accessibilityState={{ selected }}`.
- The save button should convey the disabled state:
  `accessibilityState={{ disabled: submitting }}`.

### How quick-add entries appear in DiaryScreen vs normal entries

Already correct in `EntryRow.js`:

| Property | Normal entry | Quick-add entry |
|---|---|---|
| Name line | Food name from DB | "Quick add" (or named label if set) |
| Brand line | Brand if present | Not shown |
| Quantity line | "XXXg" | Not shown (isQuick suppresses it) |
| Kcal | Shown | Shown — same style |
| Macro line | "XXP XXC XXF" | Shown if macros > 0; all zeros shown as "0P 0C 0F" |

No additional visual distinction is needed. The suppressed gram weight and
generic "Quick add" name are sufficient signals. Adding a lightning bolt icon
or warning badge would introduce the shame signal.

### Copy direction (house voice)

House voice rules: British English, plain, terse, honest, no jargon, no em
dashes, no hype, no shame.

**Sheet subtitle (current):** "Log calories now, with macros if you have them."
This is good. Approved.

**Label field placeholder:** "Label, e.g. Restaurant dinner" — optional,
practical, no guilt framing.

**Sheet title context alternatives (if the slot name is surfaced):**

1. "Quick add to Meal 2" — terse, tells the user exactly what happens.
2. "Log what you know." — softer entry prompt when used from an empty diary
   state. Works in EmptyDiary as a secondary CTA copy if ever needed.
3. "An estimate is better than a blank." — for an empty-state educational
   tooltip. Use sparingly; once per user lifetime if at all.

**Do not use:**

- "Cheat entry" — shame framing.
- "Estimated calories" — unnecessary qualifier in the form title.
- "Don't worry about being exact" — the house voice does not reassure; it
  is matter-of-fact.

---

## 5. Whole-package integration

### Relationship with COMP-002 (meal-slot memory / slot-specific recents)

These two features are positioned as **primary path (COMP-002) and fallback
(COMP-003):**

- COMP-002 makes the search path faster by pre-populating each meal slot's
  tab with slot-specific recents and last-used portions. For the user's
  regular meals — the foods they actually log frequently — slot memory makes
  quick-add unnecessary.
- COMP-003 catches everything slot memory cannot: new restaurant experiences,
  social meals, retroactive imperfect estimates.

The placement spec above reinforces this hierarchy: "Add food" is primary
(larger, top), "Quick add" is secondary (smaller, bottom). The flash icon in
FoodSearchScreen's header is a tertiary path for the user who has already
searched, not found what they want, and wants to escape without going back.

### Effect on coaching engine (confidence signal)

Quick-add entries contribute to `daily_intake_rollups` exactly like any other
entry — this is the correct behaviour. The coaching engine reads rollup totals;
it does not distinguish entry sources. This is a deliberate simplification: the
engine operates on weekly averages, so one imperfect day with a rough estimate
is noise, not signal corruption.

**However:** a future enhancement (not this sprint) could tag rollup days where
more than 50% of kcal came from `quick:`-prefixed entries and apply a wider
confidence interval in `weeklyCoach.js` when computing TDEE adjustments. This
would be the "lower confidence signal" the spec mentions. The foundation for
this is already present: `food_ref_source` in telemetry and the `food_ref`
prefix convention. It is noted here but not spec'd for this delivery.

### Rollup, sync, and offline integrity

No changes needed. `logFoodEntry` → `recomputeRollup` → `_scheduleSync` is
the existing path. Quick-add entries already follow it. The Supabase sync
schema (`food_entries`) already accepts `food_ref = 'quick:adhoc'` as a TEXT
column with no constraint on the value.

### Streamlining — no new surface

This feature adds two things to existing surfaces:
1. A second row inside the MealSection card (very low visual weight, below the
   primary "Add food" row).
2. A BottomSheet already present in FoodSearchScreen, now also present in
   DiaryScreen.

It does not add a new screen, a new tab, or a new tile. The shared brief's
"streamlining rule" is satisfied.

### Interaction with EmptyDiary

`EmptyDiary.js` currently offers "Add food" and "Copy yesterday" as the two
primary CTAs. Quick-add should not be a third equal CTA on the empty state —
it would promote estimation as the default on first use. It can be added as a
tertiary text link ("Or quick-add what you ate") for users who have been on the
platform more than 7 days (controlled via a simple `firstLaunchDate` check,
already available in `useAppStore`).

---

## 6. Retention and word-of-mouth mechanics

### The habit loop

**Cue:** user has a meal they cannot look up (restaurant, social meal, travel).
**Action:** one additional tap in the meal card → quick-add sheet → enter kcal
(4 keystrokes minimum) → "Add to diary".
**Reward:** MacroRings updates; the day's total reflects the meal; the
completeness signal (a filled diary rather than gaps) is the visible reward.

The critical insight from the psychology research is that the reward is not
"perfect data" — it is "I still logged today." That is the streak-preserving
signal that drives word-of-mouth: users tell each other "I even log restaurant
meals in it."

### Word-of-mouth surface

The tellable moment is "it lets you just type in the calories when you don't
know the exact food." This is a simple, credible, differentiated claim in a
user's vocabulary. It contrasts directly with the perceived rigidity of
apps that require a food search. Volyume does not currently have this
story to tell; with the placement fix it will.

### ED safety

The safety system operates in `src/coaching/safety/`. Quick-add does not
interact with it. A user logging a very low calorie quick-add entry (e.g.
50 kcal for a "light snack") creates a rollup that the safety gate reads
normally — if the 7-day average drops below the floor, the engine applies the
hold at its own layer. No changes to safety are required or proposed.

Streak features (COMP-018) interact here: a streak that counts "logged today"
should count a day with only quick-add entries as fully logged. There is no
reason to treat an honest estimate as an incomplete diary day.

---

## 7. Beating the benchmark

MacroFactor's quick-add is the best-in-market reference. Volyume's design
beats it on **placement** and **house voice**. MacroFactor's quick-add is
accessed from the plate's `+` button — which opens a full food logging sheet
from which quick-add is one mode. The user's path is: tap the diary `+` →
food logger opens → quick-add is an option. That is still two decisions.
Volyume's proposed placement puts quick-add as a named row **directly in the
meal card** — the user's eye reaches it before they have even decided to search
for a food. On imperfect days the escape hatch is found before the user reaches
the search box. Additionally, the optional label field ("Restaurant dinner")
gives the diary a readable story that MacroFactor's unnamed entries do not.
The house voice's explicit "an estimate is better than a blank" framing
(used once per user lifetime, e.g. as a tooltip) actively teaches the
pragmatic tracking philosophy that MacroFactor implies but never states.
Finally, because Volyume's coaching engine runs on weekly averages and
explicitly holds rather than silently changes targets, a quick-add entry on
an imperfect day genuinely does not corrupt the programme — which is an honest
claim no app has made yet.

---

## 8. Measurement

All metrics must use the existing `food_logged` telemetry event. The
`food_ref_source` field currently maps `quick:adhoc` to `'global'`, which
needs a small fix (see Build Notes below).

| Metric | Definition | Target | Data source |
|---|---|---|---|
| Quick-add usage rate | `quick_add` source events / total `food_logged` events per user per week | Track trend; flag if >25% (suggests search quality problem rather than escape-hatch use) | `food_logged` telemetry after source fix |
| Imperfect-day salvage rate | Days where total `food_logged` events > 0 AND at least one is `quick_add` source / days with any `food_logged` event. The question: does quick-add prevent zero-log days? | Expect uplift in days-with-log after feature ships | `food_logged` + `daily_intake_rollups.entries_count` |
| Days-with-any-log (7-day) | `daysLogged` from `getRecentIntakeSummary` — already computed for the coaching engine | Track cohort-level trend (monthly) vs pre-ship baseline | `daily_intake_rollups` local, aggregated at check-in |
| Discovery rate | Proportion of active Pro users who have ever fired a `quick_add` event, 30 days post-ship | Target: >40% discovery within 30 days (validates placement decision) | `food_logged` with `food_ref_source = 'quick_add'` |

---

## 9. Build notes

### What is already done (verified)

- `QuickAddSheet.js` — full form, validation, submit guard. No changes needed
  to its core logic.
- `confirmQuickAdd` in `FoodSearchScreen.js` — write path through
  `logFoodEntry` with `food_ref = 'quick:adhoc'` and `quantityG = 0`.
- `EntryRow.js` — `isQuick` detection, gram-weight suppression, `'Quick add'`
  label. No changes needed.
- `friendlyFoodName` — already handles `quick:` prefix. Test exists.
- Rollup, sync, offline paths — no changes needed.

### What needs completing (effort ~1 day total, validated against effort score 1)

**Step 1: Placement fix in MealSection + DiaryScreen (30–60 min)**

- `MealSection.js`: add a second `TouchableOpacity` row below the existing
  "Add food" row, labelled "Quick add" with a `flash-outline` icon. Pass an
  `onQuickAdd` prop alongside the existing `onAdd` prop.
- `DiaryScreen.js`: (a) add `quickAddSlot` state; (b) pass
  `onQuickAdd={(slot) => setQuickAddSlot(slot)}` to each `MealSection`; (c)
  render `QuickAddSheet` with `visible={!!quickAddSlot}`
  and `initialMealSlot={quickAddSlot}`; (d) implement `confirmQuickAdd` (same
  logic as `FoodSearchScreen.confirmQuickAdd`, or extract to a shared helper
  in `src/lib/food/quickAdd.js`).

**Step 2: Optional name field in QuickAddSheet (30–45 min)**

- Add a `name` state variable (`useState('')`).
- Add a `TextInput` below the macro row, placeholder
  "Label, e.g. Restaurant dinner", `maxLength={60}`, no uppercase label.
- In `handleSave`, if `name.trim()` is non-empty, pass it back via `onSave`
  as `{ kcal, protein, carbs, fat, mealSlot, name }`.
- `confirmQuickAdd` callers handle `name` by either using
  `food_ref = 'quick:adhoc'` (unnamed) or creating a minimal `custom_foods`
  row and using `food_ref = 'custom:<id>'` (named). The latter gives the
  diary a real resolvable name without a new DB column.
  **Decision for the builder:** the simpler approach is to store named entries
  under `food_ref = 'quick:adhoc'` and accept that the diary shows "Quick add"
  for all of them, then add the name field in a follow-up when the schema
  gets a `notes` column. The spec says "named optionally" — this is a nice-
  to-have, not a blocker for the core feature.

**Step 3: Telemetry fix (15 min)**

- In `logFoodEntry` (`src/lib/food/db.js:75`), extend the `food_ref_source`
  classification:
  ```
  food_ref_source: entry.foodRef?.startsWith('quick:') ? 'quick_add'
    : entry.foodRef?.startsWith('custom:') ? 'custom'
    : 'global'
  ```
  This is the measurement prerequisite and a one-liner.

### Files touched

| File | Change |
|---|---|
| `src/components/food/MealSection.js` | Add `onQuickAdd` prop; second add-row with flash icon |
| `src/screens/DiaryScreen.js` | `quickAddSlot` state; `onQuickAdd` handler; `QuickAddSheet` render; `confirmQuickAdd` logic |
| `src/components/food/QuickAddSheet.js` | Optional `name` field (Step 2, deferred if needed) |
| `src/lib/food/db.js` | Telemetry source fix (Step 3, one line) |

Files **not** touched: `EntryRow.js`, `FoodSearchScreen.js` (flash icon stays
as a tertiary path — no removal needed), `mealSlots.js`, `database.js` (no
schema change required for the core feature).

### Effort sanity check vs score 1

The approved effort score is 1 (the minimum). The code audit confirms this is
correct: the component exists, the write path exists, the display is correct.
The entire COMP-003 delivery is ~90 minutes of focused implementation work:
placement fix + one state variable in DiaryScreen + the telemetry one-liner.
The optional name field is a further 45 minutes. The total is well within the
"one sheet + one write path" estimate in the spec.

### Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| User over-uses quick-add as default path | Low — placement is secondary to search | Monitor usage rate metric; alert if >25% of daily logs |
| Imperfect-day entries skew coaching engine | Very low — engine reads weekly averages | No mitigation needed for current delivery; confidence-interval enhancement deferred |
| Named quick-add entries clutter food lists | None — `food_ref = 'quick:adhoc'` is not resolvable; named entries via `custom_foods` appear only in Custom tab (acceptable, user chose to name them) | Review in 30-day post-ship audit |
| ED concern: very low kcal quick-add entries | Already handled — safety floors operate at engine layer, not diary layer; no change | No action |
| Discovery failure if placement not fixed | **High if Step 1 is skipped** — the flash icon is invisible; without the MealSection placement change, quick-add remains a hidden feature | Step 1 is not optional |

---

*Sources used in this blueprint:*

- [MacroFactor Quick-Add help (SE)](https://help.macrofactorapp.com/en/articles/41-quick-add-calories-and-macros-to-your-food-log)
- [MacroFactor fastest food logger press](https://macrofactor.com/new-food-logger/)
- [MacroFactor: what to do when you can't log a meal (SE)](https://help.macrofactorapp.com/en/articles/200-what-should-i-do-when-i-can-t-accurately-log-a-meal)
- [Cronometer forums: quick add calories (SE)](https://forums.cronometer.com/discussion/5382/quick-add-calories)
- [Amy Food Journal: Lose It review](https://www.amyfoodjournal.com/blog/lose-it-app-review)
- [ScienceDirect: calorie tracking and disordered eating, 2021](https://www.sciencedirect.com/science/article/abs/pii/S1471015321000957)
- [adrockpt.com: consistency not precision, 2026](https://www.adrockpt.com/blog/2026/1/21/master-nutrition-tracking-consistency-not-precision)
- [Hoot Fitness: calorie tracking without losing your mind, 2026](https://www.hootfitness.com/blog/how-to-track-calories-without-losing-your-mind)
- [fuelnutrition.app: AI food logging accuracy, 2026](https://fuelnutrition.app/blog/ai-food-logging-accuracy-benchmarks-failure-modes-and-a-practical-audit)
- [Goal-setting in MyFitnessPal study, arxiv 2019](https://arxiv.org/pdf/1904.02813)
- [NutriScan: Lose It pricing 2026](https://nutriscan.app/blog/posts/lose-it-pricing-2026-free-vs-premium-2b4e921555)
