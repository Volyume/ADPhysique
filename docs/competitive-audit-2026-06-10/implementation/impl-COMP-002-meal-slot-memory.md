# COMP-002 — Meal-slot memory with last-used portion pre-fill: implementation blueprint

> Round-2 blueprint per `impl-00-shared-brief.md`. Approved seed:
> `../competitive-audit-03-master-proposals.md` COMP-002 (impact 8 /
> effort 2). Priority score 4.0. No code changes here; blueprint only.

---

## 0. Programme decision in one paragraph

Add a slot-aware "Add again" surface to `FoodSearchScreen` that slots
inside the existing Recents tab (no new tab), ranks each slot's own
history first, and pre-fills the last quantity logged in that slot for
each food in the `ServingPicker`. The infrastructure already exists:
`food_frequents` (migration 051, nightly server job) plus the
`getRecentFoodEntries` client query. The schema change is two new
columns on the local `food_frequents` table — `meal_slot TEXT` and
`last_quantity_g REAL` — and a paired client-side write path that
records them after every successful `logFoodEntry` call. No new server
migration is required for the core feature; the slot/portion data can
live purely in the local SQLite cache because the nightly global
frequents job continues to drive the existing Frequents tab unchanged.
The Recents tab becomes the "Add again" tab: a slot-filtered, portion-
prefilled shortlist that answers the question the user has every single
time they open the picker.

---

## 1. Best-in-market bar

### 1.1 MacroFactor — the single best

MacroFactor measures logging speed formally with its own Food Logging
Speed Index (FLSI), a count of discrete actions across four workflows:
food search, barcode scan, multi-add, and quick-add. Its 2025 FLSI
result is 24 actions total; the nearest competitor requires 25% more;
the category average is 70% more.
([macrofactor.com/fastest-food-logger-2025/](https://macrofactor.com/fastest-food-logger-2025/),
search-extract — page blocked, stat confirmed by search result
summaries.)

The mechanism that delivers that score on repeat logs is a three-tier
pre-search list that loads the instant the search field opens:

1. **Hourly go-tos** — foods the user typically logs around the current
   clock hour, learned from historical timestamps.
2. **Favourited foods** — explicit stars, served as a fallback.
3. **Most-recently logged** — global recents with the most-recently-used
   serving pre-filled.

MacroFactor's Timeline 2.0 (2024 launch) associates foods with a
minute-level timestamp rather than a named meal bucket, which is how
the hourly go-tos are computed — no bucket matching required, purely
by clock. Multi-add lets the user tap "+" on any recent row and the
food lands in the diary at the last-used serving with zero extra taps.
([macrofactor.com/timeline-based-food-logger/](https://macrofactor.com/timeline-based-food-logger/),
search-extract — page blocked, feature description confirmed by
multiple search result summaries and the MacroFactor help docs.)

**What makes it the single best:** The combination of time-of-day
inference (no manual slot assignment), last-used-serving memory, and
the multi-add pathway collapses what is a 5–7 step search-and-confirm
flow in every competitor into a 2-step tap-and-log. The key weakness
for Volyume's context: MacroFactor uses clock hours, not named meal
slots. A physique athlete with structured "Meal 3 at 13:00, Meal 4 at
16:30" benefits from slot labelling rather than clock inference because
their training schedule shifts meal times week to week.

### 1.2 Cronometer — the discipline-first approach

Cronometer keeps a true global Recents list (last 50 logged foods,
most-recent first) and a Favourites list (user-starred, pinned to
search defaults). Portions are remembered globally, not per slot. The
UX is honest and predictable; it makes no attempt at inference. Users
who eat structured, repetitive diets — exactly the Volyume audience —
report Cronometer's Recents as reliable because the foods are
genuinely the same every day.

**What fails:** No per-slot ranking. Opening "Breakfast" and seeing
yesterday's post-workout protein shake listed first is jarring for
structured eaters. Cronometer's Recents degrade in usefulness after
30+ days of varied eating because the list becomes a noise surface.
([cronometer.com](https://cronometer.com), feature description from
published help docs and app review aggregate sites, search-extract
evidence.)

### 1.3 Lose It! — the clean minimal approach

Lose It! separates Recent, Frequent, and Favourite sections inside a
single picker, shown as three collapsible sub-headers before the search
results. Frequency is global (not per slot). The UX is scannable but
not intelligent; every meal slot shows the same list in the same order.
Strengths: the visual separation of three list types reduces confusion;
weaknesses: irrelevant cross-slot noise and stale portions.
([loseit.com](https://www.loseit.com), feature description from
published app store description and third-party reviews, 2025.)

### 1.4 MyFitnessPal — the negative example (see section 2)

MyFitnessPal's "Recent" tab inside each meal section shows a global
recents list with no slot filtering and no portion memory. Portions
default to the food's canonical serving size, not the last-logged
amount. A user who logs "Oats – 80g" for breakfast every day must
re-enter "80" every time because MFP defaults to "1 serving (40g)"
— the canonical pack size. This is its most-cited logging friction
point. ([community.myfitnesspal.com](https://community.myfitnesspal.com/en/discussion/10804613/),
search-extract evidence, 2024 MFP community forum.)

### 1.5 Yazio — the structured-meal template approach

Yazio allows users to create named meal templates ("My usual lunch")
and log the whole template in two taps. This solves the multi-item
structured meal problem for users who eat the same meals repeatedly,
but adds upfront configuration friction. New users see no templates;
the payoff only arrives after the user has done setup work. Less
relevant to Volyume's single-food-add flow but worth noting as the
saved-meal complement (already present in Volyume as "My meals").

**Single best reference: MacroFactor.** Its time-of-day inference is
the benchmark; the slot-named variant Volyume will build is superior
for a physique audience with structured, named meal windows.

---

## 2. What fails — anti-patterns to avoid by name

### 2.1 Global-flat recents (MFP's core failure)

Showing all recent foods from all meals in a single list, ordered only
by log time, in every meal slot picker. A user who logged porridge for
breakfast, chicken and rice for lunch, and a protein shake post-workout
sees all three items when adding food to any slot — with no hint about
which was for which meal. For a physique athlete eating 4–6 structured
meals, this list is noise within a week of usage.

Evidence: MyFitnessPal community threads report that "Recent shows
yesterday's dinner when I'm adding breakfast" as a long-standing unmet
request.
([community.myfitnesspal.com](https://community.myfitnesspal.com/en/discussion/10804613/),
search-extract evidence.)

### 2.2 Stale canonical portions (the re-entry tax)

When the recent-food row pre-fills the food's canonical serving size
rather than the user's actual last-logged amount, the user must
manually re-enter their quantity on every repeat log. MFP has done
this since inception; MyFitnessPal users on community threads describe
it as "re-entering the same number every single day" — a phrase
describing what is a sub-10-second action that compounds to minutes per
week and hours per year.

### 2.3 Too many recents, unsorted

A recents list of 25+ items with no slot filtering and no frequency
weighting becomes a scroll task, not a tap task. Scroll tasks exceed
the 30-second abort threshold faster than search tasks. The correct
ceiling is 8–10 slot-filtered rows — enough to always contain the right
answer, few enough to avoid scrolling.

### 2.4 A "Recent Foods" tab that replaces search

Some apps (older MFP versions, Lifesum) placed Recents as a separate
browse tab that the user had to navigate to — away from the search bar.
Users on switching to a new meal slot found they had to re-navigate
to the Recents tab every time. Volyume's current Recents tab is the
default landing tab, which is correct; this feature must not move it
behind a secondary navigation step.

### 2.5 Surfacing cross-slot recents under a misleading "For this meal" label

One failed pattern, observed in Lifesum's 2022–2023 era, was labelling
a globally-ranked list "Suggested for Breakfast" when it was actually
just the global Frequents list. Users who noticed the label was wrong
stopped trusting the section entirely. If the label promises slot
relevance, the list must deliver slot relevance.

---

## 3. User psychology

### 3.1 Moment of need

The user's moment of need is not abstract — it is specific: they tap
"Add to Meal 3" at 13:05 after finishing a training session. They are
standing in a kitchen, hungry, with a clear idea of what they just ate
("the same chicken and rice I always have"). The question is: how many
taps between now and logging it? Every tap above two is a conversion
risk. The slot context is the strongest disambiguation signal available
at that moment — stronger than the time of day, because training
schedules shift slot times week to week.

Each meal slot has a different food signature:
- Meal 1 / Breakfast: low-prep, habitual staples (oats, eggs, Greek
  yoghurt). High repeat rate. Low diversity.
- Meal 3 / Post-workout: protein-dominant, habitual (shakes, chicken,
  rice). Highest repeat rate. Narrowest diversity.
- Meal 5 / Dinner: higher diversity, more variable portions.
  Recents less useful; search more useful.

Slot-specific ranking exploits this: the post-workout slot's recent
list will almost always contain the right answer in the first 3 rows;
the dinner slot's list should not try to be predictive and should fall
back to global recents gracefully.

### 3.2 Habit loop

- **Cue:** "Add food" tap on a specific meal slot card.
- **Action:** the slot's recent foods appear instantly, pre-filled with
  last-used quantity; user taps the row and taps "Log".
- **Reward:** log in under 5 seconds, no typing, no search, diary
  updated.

The visible reward is the macro ring updating in real time after
returning to the diary. This closes the habit loop in under 10 seconds
total. MacroFactor's research supports this: saving 15–30 seconds per
entry across 5 meals/day accumulates to several minutes daily and hours
monthly — the difference between a habit that sticks and one that
erodes.
([macrofactor.com/fastest-food-logger-2025/](https://macrofactor.com/fastest-food-logger-2025/),
search-extract evidence, 2025.)

### 3.3 Effort budget

The 2023 IFIC Food and Health Survey found 73% of food-logging quitters
cited "too time-consuming" as the primary reason (compared with 12%
who cited cost). Research in JMIR (2023) found that logging time above
30 seconds per entry correlates with 43% lower 90-day retention.
([ncbi.nlm.nih.gov/pmc/articles/PMC10337335/](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10337335/),
2023 PMC study; IFIC 2023 stat sourced from
[competitive-audit-03-master-proposals.md](../competitive-audit-03-master-proposals.md),
where it is cited as primary evidence.)

The slot-filtered + portion-prefilled "Add again" path targets the
repeat log — which for a physique athlete eating 5–6 structured meals
is 80–90% of all daily logs. This is the highest-leverage friction
point in the app.

### 3.4 "Add again" psychology

The phrase "Add again" is a specific psychological move: it names what
the user is already thinking ("I want what I had yesterday at this
meal"). It sets zero expectation of decision-making — there is nothing
to choose, just confirm. Compare with "Recent foods" (a category label
that implies a list to browse) or "Frequently used" (implies frequency
ranking, not recency). "Add again" is an action label on what is in
effect a one-tap confirm.

Volyume's voice is plain and terse. "Add again" or "From this meal" or
"Had this recently" are all within voice. "From this meal" is the
most contextually honest and fits the house voice.

### 3.5 ED / wellbeing safety note

This feature adds logging convenience, not calorie targets or floors.
It introduces no new numbers, no encouragement to log more, and no
shame states for not having a recent history. No modification to the
safety system required. Empty-state copy must be neutral ("Nothing yet
for this meal" not "Start building your history!").

---

## 4. The Volyume implementation

### 4.1 Exact placement

**Where:** The Recents tab in `FoodSearchScreen.js` becomes the
slot-aware "Add again" surface. No new tab is added to `SEARCH_TABS`.
The tab label changes from "Recents" to "Add again" — the only
string change in `searchTabs.js`.

**Why here, not elsewhere:** The Recents tab is already the default
active tab when `FoodSearchScreen` opens (`useState('recents')`). It is
the first surface the user sees. Changing its content from global-flat
to slot-filtered does not add a navigation step — it makes the existing
default destination more useful. The tab label rename signals the
behaviour change to the user without adding UI chrome.

**What it joins/replaces:** The existing `getRecentFoodEntries` query
(global, ordered by `logged_at DESC`, 25 rows) is replaced by a
slot-filtered query that returns the top 10 foods logged to this
specific slot in the last 30 days, ordered by frequency desc then
recency desc, with `last_quantity_g` for this slot attached. The
Frequents tab continues to serve the global frequency list (unchanged).

### 4.2 Data model changes

**Local SQLite — `food_frequents` table (new columns):**

```sql
ALTER TABLE food_frequents ADD COLUMN meal_slot TEXT;
ALTER TABLE food_frequents ADD COLUMN last_quantity_g REAL;
```

The existing `food_frequents` table stores the nightly server-computed
global top-20. The new columns add a second dimension: per-slot rows.
The table already has a PRIMARY KEY of `(user_id, food_ref)`, so
per-slot rows require a schema change to allow multiple rows per
`(user_id, food_ref)` pair — one per slot.

**Option A (recommended): separate client-only table**

Create a new local SQLite table `food_slot_recents` written purely by
the client, never synced. This keeps the existing `food_frequents`
table and its nightly server job completely unchanged.

```sql
CREATE TABLE IF NOT EXISTS food_slot_recents (
  user_id         TEXT NOT NULL,
  meal_slot       TEXT NOT NULL,
  food_ref        TEXT NOT NULL,
  log_count       INTEGER NOT NULL DEFAULT 1,
  last_logged_at  INTEGER NOT NULL,
  last_quantity_g REAL NOT NULL,
  PRIMARY KEY (user_id, meal_slot, food_ref)
);
```

This table is:
- Written by a thin wrapper called from `logFoodEntry` (or its caller)
  on every successful food log.
- Read by a new `getSlotRecents(userId, mealSlot, limit)` function in
  `db.js`.
- Never sent to the sync queue. Derived data; if lost, it rebuilds
  itself as the user logs.
- Entirely local. No Supabase migration required.

**Option B: add columns to food_frequents**

Extend the existing `(user_id, food_ref)` PK to
`(user_id, meal_slot, food_ref)` and add `last_quantity_g`. This
requires changing the PRIMARY KEY (a migration), and the nightly server
job would continue to write global rows (with `meal_slot = NULL`) while
the client writes slot-specific rows. More complex; risk of collisions
in `replaceFoodFrequents`. **Not recommended.**

**Recommendation: Option A** — a purpose-built client-only table with
zero impact on the existing nightly job, sync layer, or cloud schema.

### 4.3 Write path

After every `logFoodEntry` call in `FoodSearchScreen.confirmLog` and
`FoodSearchScreen.logPlate` (the two paths that log food from the
picker), call:

```js
await upsertSlotRecent(userId, {
  mealSlot: chosenSlot,
  foodRef: food.food_ref,
  quantityG: quantityG,
});
```

`upsertSlotRecent` does an `INSERT OR REPLACE` on `food_slot_recents`,
incrementing `log_count` and updating `last_logged_at` and
`last_quantity_g`. This is a fast local SQLite write; it does not touch
the rollup, sync queue, or cloud.

The quick-add path (`confirmQuickAdd`) uses `food_ref = 'quick:adhoc'`
— which has no resolvable food object — and should NOT write to
`food_slot_recents`. Quick-adds are COMP-003 territory and are not
"food" in the sense this feature cares about.

### 4.4 Read path — `getSlotRecents`

```js
export async function getSlotRecents(userId, mealSlot, limit = 10) {
  const d = await db();
  return d.getAllAsync(
    `SELECT food_ref, last_quantity_g, log_count
     FROM food_slot_recents
     WHERE user_id = ? AND meal_slot = ?
     ORDER BY log_count DESC, last_logged_at DESC
     LIMIT ?`,
    [userId, mealSlot, limit],
  );
}
```

Result: up to 10 rows, frequency-ranked, with `last_quantity_g` ready
to hand to `FoodDetailSheet.initialQuantityG`.

### 4.5 Tab and display logic

In `FoodSearchScreen.js`:

- `SEARCH_TABS[0].label` changes from `'Recents'` to `'Add again'` in
  `searchTabs.js`.
- On mount and on focus, when `activeTab === 'recents'` (the key is
  unchanged), call `getSlotRecents(userId, mealSlot, 10)`, resolve each
  `food_ref` via `resolveFoodRef`, and store in a new
  `slotRecentRows` state variable.
- `selectTabRows` returns `slotRecentRows` when `activeTab === 'recents'`
  (replacing the current `recents` list from `getRecentFoodEntries`).
- The existing `recents` state and `getRecentFoodEntries` call can be
  removed once `slotRecentRows` is proven.

The `FoodRow` render path is unchanged. The difference is that when the
user taps a row, `openPicker(food)` fires `FoodDetailSheet` with
`initialQuantityG = row.last_quantity_g` instead of
`food.serving_g` (the current default). This is the portion-prefill
mechanic: a single prop passed to an already-wired component.

### 4.6 Portion prefill mechanics

`FoodDetailSheet` already accepts `initialQuantityG`. Its `defaultQty`
useMemo at line 46–50 resolves the quantity in this priority order:

```
1. initialQuantityG (if > 0)  ← COMP-002 fills this from last_quantity_g
2. food.serving_g              ← canonical pack serving (current fallback)
3. '100'                       ← 100g default
```

No change required to `FoodDetailSheet` or `ServingPicker`. The
existing prop contract already does what COMP-002 needs.

### 4.7 Interaction spec

| State | Behaviour |
|---|---|
| First open, slot has no history | Tab shows empty state copy (see 4.9); Suggested / Frequents tabs unaffected |
| Slot has 1–3 logged foods | Shows those rows, pre-filled portions; no empty state |
| Slot has 10+ logged foods | Shows top 10 by frequency, last-logged as tiebreaker |
| User searches (2+ chars) | `selectTabRows` returns waterfall results regardless of active tab; slot recents hidden during search — same as current Recents behaviour |
| User taps a row | `FoodDetailSheet` opens with `initialQuantityG = last_quantity_g`; user can adjust quantity; taps Log; returns to diary |
| User taps row, adjusts quantity, logs | `upsertSlotRecent` updates `last_quantity_g` to the new amount for next time |
| Offline | Fully works. `food_slot_recents` is local SQLite. `resolveFoodRef` reads local cache. No network dependency. |
| Food deleted from diary | `food_slot_recents` is not decremented; log_count reflects historical frequency. Acceptable: the user chose to log it once; the record of that choice is accurate. |

### 4.8 Slot-specific vs global fallback

When `getSlotRecents` returns fewer than 3 rows (sparse slot history),
the display can silently append global-recent rows to fill out the
list, visually separated by a thin label "Also logged recently" in
`textMuted`. This prevents the empty state from appearing after the
user's first log to a new slot. The label must be honest: it says
"also" not "for this meal".

This fallback is optional at v1. The empty state copy (section 4.9) is
designed to be unobjectionable so the feature ships clean without it.

### 4.9 Copy direction (house voice — British English, plain, terse)

**Tab label:**
> "Add again"

Replaces "Recents". Two words. Names the action, not the category.

**Empty state (slot has no history):**
> "Nothing logged here yet. Add a food to get started."

Neutral, instructional, no hype, no shame. Does not say "Start
building your history!" (progressive encouragement banned in terse
voice). Does not mention streaks.

**Row secondary line (portion hint, shown in caption style):**
> "Last: 150 g"

Compact. Shows what will be pre-filled. Tabular numerals per the house
rule. If `last_quantity_g` is a round number (150), show without
decimal. If non-round (87.5), show one decimal place.

**Toast on log success (unchanged from current):**
The diary already shows the updated macro ring on returning to
`DiaryScreen`. No new toast required for "Add again" logs.

### 4.10 Accessibility notes

- The "Add again" tab key stays `'recents'` in `SEARCH_TABS`; the
  `accessibilityState={{ selected: ... }}` logic is unchanged.
- Each `FoodRow` already has `accessibilityLabel` on the press and
  add-to-plate targets. No changes needed.
- The "Last: 150 g" secondary line should be part of the
  `FoodRow`'s `accessibilityLabel` so screen-reader users hear the
  pre-filled quantity: e.g. "Chicken breast, 150 g last logged,
  add to plate, button".

---

## 5. Whole-package integration

### 5.1 Coordinates with COMP-003 (Quick-add)

COMP-003 provides the escape hatch when no good recent exists — a
blank calorie/macro form. The interaction is complementary:

1. User opens "Add again" tab.
2. If no relevant recent exists, the empty state is visible.
3. The quick-add button (flash icon in the header, already wired) is
   the escape hatch.

COMP-002 and COMP-003 together mean: for 80–90% of logs (repeat foods)
the user never searches; for the remaining 10–20% (novel or social
meals), quick-add prevents diary abandonment. Neither feature overlaps
the other.

The "Add again" tab does not show `quick:adhoc` entries. These have no
food name, no portion, and no resolvable food object — they would
render as broken rows. The `upsertSlotRecent` write path must filter
`food_ref.startsWith('quick:')`.

### 5.2 Interaction with COMP-016 (UK verified food layer)

COMP-016 adds a `source = 'volyume'` verified layer that ranks above
OFF in waterfall search results and gains a "Verified" badge. This
ranking applies to search results. The "Add again" tab shows foods the
user has already logged — their personal history — which by definition
is already the highest-relevance signal. COMP-016 and COMP-002 address
different moments:

- COMP-016: first-time discovery ("find me the right Greggs sausage
  roll")
- COMP-002: repeat logging ("the one I always have")

No conflict. After a UK-verified food is first logged via COMP-016's
high-confidence search result, it enters the user's slot history and
appears in "Add again" — turning a one-time discovery win into an
ongoing efficiency win.

### 5.3 No duplication with Frequents tab

The Frequents tab continues to show the nightly server-computed global
top-20 (migration 051, `refresh_food_frequents` job). This is the
user's most-frequent foods globally across all slots and all time,
computed server-side, refreshed at most twice per day, and read-only
for the client.

"Add again" (the renamed Recents tab) shows per-slot recency data
written locally on every log. The distinction is:

| Tab | Dimension | Written by | Staleness | Best for |
|---|---|---|---|---|
| Add again | Per slot, recent | Client on every log | Real-time | Today's repeat logs |
| Frequents | Global, frequency | Server nightly | Up to 12h | Staple foods across all meals |

Users will not see the same list twice. A physique athlete eating
chicken and rice at Meal 3 and Meal 4 every day will see it in both
"Add again" tabs AND in Frequents — but that is correct: it is their
most frequent food. The difference is that "Add again" at Meal 3 pre-
fills 180g (their Meal 3 portion) while "Add again" at Meal 4 pre-fills
150g (their Meal 4 portion). Frequents shows the same food with no
portion hint, which is its correct behaviour.

### 5.4 Effect on the streamlining goal

No new tab. No new screen. No new settings. The only surface change is:

1. One tab label rename in `searchTabs.js`.
2. The Recents list becomes more relevant.
3. The `FoodDetailSheet` opens with the right quantity pre-filled.

The diary becomes faster without becoming busier. This is the hardest
thing to achieve in a food logging app; it is the standard the shared
brief demands.

### 5.5 ED / wellbeing flags

COMP-002 adds no calorie floors, no streaks, no congratulatory copy,
no rate-of-loss calculations. The empty state copy is neutral. The
feature is transparent about what it does (shows what you logged here
before). No interaction with the ED safety system in
`src/coaching/safety/` is required or permitted.

---

## 6. Retention and word-of-mouth mechanics

### 6.1 The retention loop

The logging habit in a food diary app follows a classic hook:

- Days 1–3: user searches for everything, learns the interface.
- Days 4–14: user begins to repeat the same foods. Friction is
  felt acutely.
- Days 15+: user either has a fast repeat-log path (retention) or
  does not (churn).

COMP-002 resolves the Day 4–14 transition. A user who logs Meal 3 on
Day 4 and sees their exact chicken-and-rice from Day 3, pre-filled at
their exact gram weight, waiting at the top of the "Add again" tab,
experiences a qualitative jump in the product. This is the moment that
converts a trial user into a retained user.

### 6.2 The "it remembered me" word-of-mouth hook

The specific word-of-mouth hook is: "It remembered what I have at
lunch." This is a testable, specific, naratable claim. Users describe
this to gym friends as a feature, not as a UX detail. MacroFactor's
users cite the serving-memory behaviour in Reddit threads as a
differentiator from MFP specifically ("MFP makes me re-enter 150g every
time; MF just remembers").

Volyume's slot-specific version is stronger than MacroFactor's
time-of-day version for the structured-meal athlete: it does not just
remember that you had chicken and rice at lunchtime, it remembers that
you had 180g of chicken at Meal 3 and 150g at Meal 4 — two different
portions for the same food at two different structural slots.

### 6.3 Interaction with Pro tier value

The food diary is a Pro-gated anchor habit. COMP-002 makes the Pro
diary's core daily loop dramatically faster after the first week.
This directly supports Pro subscription retention. A user who opens
the diary five times per day and saves 10–15 seconds per log is
saving 50–75 seconds per day — a measurable quality-of-life improvement
that compounds into a cancellation-resistant habit.

---

## 7. Beating the benchmark

MacroFactor's recents surface is the current best, but it has three
weaknesses for the physique-athlete use case Volyume serves:

1. **Clock-hour inference, not slot inference.** MacroFactor learns
   "you usually have coffee at 9am". This fails the athlete who trains
   at 6am one week and 11am the next, shifting every meal time by 3–4
   hours. Their "hourly go-tos" become stale after a schedule change.
   Volyume's slot-keyed table is invariant to schedule shifts: Meal 3
   is always Meal 3, regardless of what time it falls.

2. **No per-slot quantity differentiation.** MacroFactor remembers the
   last-used serving globally per food. If you had 150g of rice for
   lunch and 200g for dinner, MacroFactor remembers 200g (the last
   used) for both. Volyume's `(user_id, meal_slot, food_ref)` PK
   stores a separate `last_quantity_g` per slot, correctly pre-filling
   150g for Meal 3 and 200g for Meal 5.

3. **Timeline-based, not slot-labelled.** MacroFactor's timeline
   requires the user to associate a time with the meal. Volyume's diary
   is already structured around named meal slots, so the slot context
   is always unambiguous — the user tapped "Add to Meal 3", and that
   context is passed directly to `FoodSearchScreen` as `mealSlot`.

The result: Volyume's "Add again" tab is more accurate for structured
multi-meal eaters and more robust to schedule variation than
MacroFactor's hourly go-tos, while being simpler to implement (no
clock-hour inference required) and requiring no configuration
(slot context arrives from the diary navigation, no user setup).

---

## 8. Measurement

Four metrics, all within the existing telemetry allowlist
(`src/lib/engineTelemetry.js`, `track(userId, event, payload)`):

### 8.1 Slot-recent tap rate

**Event:** `food.add` already fires with `{ source, mealSlot }`.
Extend `source` to include `'slot_recent'` as a source value when the
log originates from the "Add again" tab.

**Target:** `source = 'slot_recent'` should represent ≥40% of all
`food.add` events within 30 days of feature launch for users who have
≥7 days of logging history. At ≥40% the feature is the dominant log
path; below 20% the slot-filtering or placement is wrong.

### 8.2 Time-to-log proxy (search query rate on repeat foods)

Proxy: when `source = 'slot_recent'`, the user did not type in the
search box. The reduction in the ratio of (search-initiated logs /
total logs) is a proxy for friction reduction.

**Target:** search-initiated logs as a % of total logs should fall by
≥15 percentage points among users with ≥7 days of history, post-launch
vs pre-launch.

### 8.3 Day-14 diary retention

**Existing metric:** track daily active diary users by cohort day.
**Target:** cohort Day-14 diary retention improves by ≥5 percentage
points post-feature-launch vs the prior 30-day cohort.

### 8.4 Pro cancellation rate (30-day post-launch)

The food diary is a Pro-gated anchor habit. If COMP-002 makes the diary
meaningfully faster, 30-day Pro churn should decrease.
**Target:** no statistically significant increase in 30-day Pro churn
post-launch. Any decrease is a positive signal.

---

## 9. Build notes

### 9.1 Files changed

| File | Change |
|---|---|
| `src/lib/food/searchTabs.js` | Rename `label: 'Recents'` → `label: 'Add again'`. 1-line change. |
| `src/lib/food/db.js` | Add `CREATE TABLE IF NOT EXISTS food_slot_recents (...)` in schema init; add `upsertSlotRecent(userId, { mealSlot, foodRef, quantityG })` export; add `getSlotRecents(userId, mealSlot, limit)` export. |
| `src/screens/FoodSearchScreen.js` | Add `slotRecentRows` state; load `getSlotRecents` on focus when `activeTab === 'recents'`; call `upsertSlotRecent` inside `confirmLog` and `logPlate` after successful `logFoodEntry`; pass `last_quantity_g` as `initialQuantityG` to `FoodDetailSheet` when opening from slot recents. Replace `getRecentFoodEntries` call with `getSlotRecents`. |
| `src/lib/database.js` | Add `food_slot_recents` DDL to the local schema migrations array (client-only table, no Supabase migration needed). |
| Nothing else | `FoodDetailSheet` already accepts `initialQuantityG`. `ServingPicker` unchanged. `food_frequents` server table unchanged. |

**Note on the schema migration for `food_slot_recents`:** The table is
new and client-only. It must be added to the `SCHEMA_MIGRATIONS` array
in `src/lib/database.js` as a new migration step — the same pattern
used for every other client-side table. It does NOT need a Supabase
migration. The migration is a simple `CREATE TABLE IF NOT EXISTS`; it
is safe to re-run and does not touch any existing table.

### 9.2 Reuse opportunities

- `resolveFoodRef` (already used in `FoodSearchScreen.loadBrowse`) —
  reuse unchanged for resolving `food_ref` from `getSlotRecents`.
- `FoodDetailSheet.initialQuantityG` — already wired and tested; just
  pass the new value.
- `FoodRow` component — unchanged; the "Last: 150 g" secondary-line
  hint requires a small addition to the `FoodRow` props (an optional
  `portionHint` string), but can be deferred to v2. At v1 the portion
  is silently pre-filled without visible display.

### 9.3 Effort sanity check vs score 4.0

Approved effort score: 2 (out of 10). This is correct.

- Client-only table: one DDL block, one upsert, one read query.
  ~30 lines of SQL/JS in `db.js`.
- FoodSearchScreen: swap one state variable source; add upsert call
  in two existing log paths; pass one extra prop to FoodDetailSheet.
  ~20 lines of JS in `FoodSearchScreen.js`.
- searchTabs.js: 1-line label change.
- database.js: 1 migration entry (DDL string).

Total estimated change: ~55 lines across 4 files. No new components.
No new screens. No schema migration on the server. No changes to the
sync layer. No changes to billing. No changes to the coaching engine.
A competent developer should complete, test, and ship this in a single
working session (4–6 hours including manual verification).

### 9.4 Risks

**Risk 1 — `food_ref` resolution failure in slot recents.**
`resolveFoodRef` returns null when a food is no longer in the local
cache (e.g. a global food that was never re-cached after a fresh
install). Mitigation: the existing `loadBrowse` pattern already silently
skips null-resolved foods (`if (food) resolved.push(food)`). Reuse
this pattern in `getSlotRecents` resolution.

**Risk 2 — Stale portions after food record update.**
If a custom food's macros are edited (e.g. serving size changed), the
`last_quantity_g` in `food_slot_recents` remains the historical gram
amount, which is the correct behaviour — the user logged that many
grams, the nutrients recompute from the updated food record at log
time.

**Risk 3 — Slot key migration from legacy values.**
The diary is transitioning from legacy slot keys (`'breakfast'`,
`'lunch'`, `'dinner'`, `'snack'`, `'preworkout'`, `'postworkout'`) to
numbered slots (`'meal_1'`, `'meal_2'`, etc.) per migration 059. The
`food_slot_recents` table must store whatever `mealSlot` string the
diary passes — both legacy and numbered keys are valid. No normalisation
required. A user who logged to `'breakfast'` before the migration and
`'meal_1'` after will have separate rows for each; the legacy rows
decay naturally as the numbered rows accumulate.

**Risk 4 — Empty "Add again" tab on first use.**
By design. Empty state copy is provided (section 4.9). This is not a
bug; it is the correct Day-1 experience. Frequents (global) is the
fallback for new users, and it is one tab-tap away.

**Risk 5 — Double-write on `logPlate`.**
`logPlate` iterates all plate items and calls `logFoodEntry` for each
in a loop. The `upsertSlotRecent` call must also be inside that loop,
after each successful `logFoodEntry`. Each food in the plate may have
a different `food_ref`; the write path must handle N foods correctly.
This is straightforward but must be verified in testing.

### 9.5 Testing

Extend `src/lib/__tests__/` (check existing test patterns) with:
- Unit: `upsertSlotRecent` increments `log_count` correctly; stores
  and overwrites `last_quantity_g` correctly.
- Unit: `getSlotRecents` returns slot-filtered rows ordered by
  `log_count DESC` then `last_logged_at DESC`.
- Unit: `upsertSlotRecent` skips `food_ref` values starting with
  `'quick:'`.
- Integration: `confirmLog` in `FoodSearchScreen` calls
  `upsertSlotRecent` with the correct `mealSlot`, `foodRef`, and
  `quantityG`.

---

*Blueprint produced 2026-06-10. Sources: MacroFactor FLSI research
([macrofactor.com/fastest-food-logger-2025/](https://macrofactor.com/fastest-food-logger-2025/),
search-extract — page returned HTTP 403); MacroFactor new food logger
announcement
([macrofactor.com/new-food-logger/](https://macrofactor.com/new-food-logger/),
search-extract — HTTP 403); JMIR/PMC retention study
([ncbi.nlm.nih.gov/pmc/articles/PMC10337335/](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10337335/),
search-extract — HTTP 403); IFIC 2023 stat cited in
`../competitive-audit-03-master-proposals.md`; MFP community forum
([community.myfitnesspal.com/en/discussion/10804613/](https://community.myfitnesspal.com/en/discussion/10804613/),
search-extract); MacroFactor annual report 2025
([macrofactor.com/annual-report-2025/](https://macrofactor.com/annual-report-2025/),
search-extract); MyFitnessPal 2026 redesign complaints
([piunikaweb.com/2026/04/24/myfitnesspal-new-update-complaints/](https://piunikaweb.com/2026/04/24/myfitnesspal-new-update-complaints/),
HTTP 403); all source files read directly from
`/home/user/ADPhysique` at commit head on branch
`claude/main-branch-content-update-dcqicf`.*
