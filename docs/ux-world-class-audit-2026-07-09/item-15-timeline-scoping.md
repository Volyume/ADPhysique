# Item 15 — Timeline food logging: scoping (read-only, 2026-07-10)

Scope-only pass for Ultimate-Audit item 11-16 gate, item 15. No source
changed. Branch `claude/codebase-audit-docs-pv6mjd`.

## 1. The ruling, verbatim, with source lines

Two founder statements make up the ruling. Both read in full from
`docs/ultimate-audit-2026-06-13/pass3-v2-founder-decisions.md`.

**Call 2 acceptance (the actual founder words), line 67:**
> "UX — Timeline-style food logging (continuous timestamp; replaces rigid
> meal buckets)."

**Pass-4 NA-id resolution (the load-bearing decision), line 190:**
> "NA-cux-15: **Timeline replaces the meal buckets** for everyone (model is
> already a flexible numbered ladder)."

The reconciliation doc's citation (`docs/ux-world-class-audit-2026-07-09/
ultimate-audit-11-16-reconciliation.md:16`, "NA-cux-15: Timeline replaces the
meal buckets for everyone. (:67,:190)") is verified CORRECT — both line
numbers check out against the actual file content above (unlike item 12's
citation, which the founder flagged as wrong).

**What the ruling settles:** timeline is a full REPLACEMENT of the
Breakfast/Lunch/Dinner-style bucket layout, for every user, not an opt-in
toggle. `pass4-blueprints-cardio-ux.md:205` had left this as NEEDS ANSWER
[NA-cux-15] ("replacement vs user toggle... a toggle may conflict with the
dismissed dense/personalisation toggle"); `pass3-v2-founder-decisions.md:79`
separately dismissed an "advanced/dense personalisation toggle" for the
same no-personalisation reason. The founder's "for everyone" closes that
fork explicitly: no toggle, no settings switch, single presentation for
both a newbie logging three meals and an athlete running six structured
feeds — `pass4-blueprints-cardio-ux.md:239` anticipated this exact
resolution ("if NA-cux-15 lands as 'preserve grouping within timeline'").

**What the ruling does NOT settle (must be flagged, not guessed):**
- Whether per-meal grouping is preserved WITHIN the timeline (visually
  clustering "Meal 2" together) or entries render as one flat time-ordered
  list with no meal identity shown at all. Both readings are compatible
  with "replaces the meal buckets."
- The companion blueprint question NA-cux-13 ("does `food_entries` carry a
  time-of-day?") is explicitly marked in the reconciliation doc as "a code
  verification, not a decision" — resolved below by reading the schema, not
  guessed.

## 2. What today's diary ALREADY satisfies

A lot has shipped since the June blueprint was written blind to the current
code. Concretely, against `pass4-blueprints-cardio-ux.md`'s own gap list:

- **NA-cux-13 is ANSWERED, and the answer is: yes.** `food_entries` has
  carried a per-row timestamp since the base schema, not as a later add.
  `src/lib/database.js:916-932` (`CREATE TABLE food_entries`) has
  `logged_at INTEGER NOT NULL` (`:928`), indexed at
  `idx_food_entries_user_recent ON food_entries(user_id, logged_at)`
  (`:934`). The blueprint's "do NOT assume a column exists" caution
  (`pass4-blueprints-cardio-ux.md:209`) turns out unfounded — no schema
  change is needed to get a per-entry clock time. This removes what the
  blueprint called the single load-bearing prerequisite for a true
  timeline.
- **The diary already shows the logged time, quietly, per entry.**
  `src/components/food/EntryRow.js:35-41` — comment: "Logged time (gap #3):
  every entry stores logged_at; show it as a quiet 24h HH:mm so the user
  can see WHEN they ate, like MFP/Cronometer. Display-only." It renders as
  part of the meta line (`"120g  ·  14:32"`). This is a genuine partial
  build of the timeline's core promise (visible time-of-day), done as a
  polish item, not badged as "item 15."
- **Within a meal card, entries are already chronological.**
  `getFoodEntriesForDay` (`src/lib/food/db.js:199-207`) orders
  `ORDER BY meal_slot, logged_at`, and `entriesBySlot`
  (`src/screens/DiaryScreen.js:524-530`) buckets by `meal_slot` preserving
  that order, so a meal card's rows already read top-to-bottom by time
  logged.
- **The underlying model was already a flexible numbered ladder, not fixed
  wellness buckets**, exactly as the founder's parenthetical says. Confirmed
  again today: `src/lib/food/mealSlots.js:111-136` (`slotOrder`,
  `buildMealSlots`) — keys are `meal_1..N` plus `preworkout`/`postworkout`,
  legacy `breakfast/lunch/dinner/snack` kept only for back-compat.
  Ordering is by a fixed rank table (`slotOrder`), not by clock time — this
  is the part the ruling still asks to change.
- **D12 diary de-clutter (2026-07-09) already reduced bucket clutter** in
  the direction the ruling points, though it does not implement the
  timeline itself: the micronutrient panel was removed from the diary
  (`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md:115-117`),
  and bulk "mark all meals as eaten" was demoted to the page bottom in
  favour of per-meal marking
  (`src/screens/DiaryScreen.js:1540-1545`, comment cites D12 directly).
- **D12 item 4 / D13 item 2 (meal-additions reframe) is already shipped**,
  word for word: `src/lib/food/mealAdditions.js:30-31` —
  `ADDITIONS_INTRO = "Optional extras. Add any you fancy for flavour. They
  will not change the meal's numbers."` — and `MealSection.js:118-129`
  renders the equivalent inline "Optional extras, add any you fancy:" row
  with the founder's exact register. Not itself part of item 15, but
  relevant because it is timeline-adjacent copy inside the same screen.
- **`weight_state` (item 12, raw/cooked) landed cleanly and additively** —
  local schema v66 (`src/lib/database.js:1903-1923`), cloud
  `migrate_114_food_entry_weight_state.sql`, written by `logFoodEntry`/
  `updateFoodEntry` (`src/lib/food/db.js:87,140,145`). It has no
  interaction with ordering/timeline logic (it is a stored label, not a
  time field) but is worth noting as the precedent pattern (additive
  column + founder-run cloud migration) item 15 would follow if a schema
  change proves necessary.

**Bottom line:** the prerequisite question (does a timestamp exist) is
answered YES, and a chunk of the promise (visible time, chronological
within-meal order, flexible ladder) is already live. What is NOT done is
the structural part the ruling actually asks for: the meal-bucket CARDS
still exist as the diary's organising unit (`DiaryScreen.js:1422-1466` maps
`visibleSlots` to a `MealSection` card each), ordered by a named-slot rank
table, not folded into one continuous cross-meal timeline.

## 3. The genuine remaining delta, in build stages

### Stage 0 — a load-bearing design question the read surfaced (not in the blueprint)

The blueprint assumed `logged_at` would need adding and, if added, would
mean "the time the food was eaten." Reading how it is actually written
shows `logged_at` today means **"the moment the client wrote the row,"**
not "the moment the user ate." Two call sites make this a real problem for
a chronological timeline, not a hypothetical one:

- `logFoodEntry` (`src/lib/food/db.js:53-101`) sets `logged_at = now` at
  insert time (`:56,:98`) and `updateFoodEntry` (`:131-159`) never touches
  `logged_at` again — there is no UI anywhere in the app that lets a user
  set or edit a food entry's time (confirmed by a repo-wide grep: no
  `logged_at`/`loggedAt` reference outside `EntryRow.js` (display),
  `db.js`, and sync/coach modules that only ever read it).
- `confirmPlannedDay` (`src/lib/food/db.js:260-271`), the function behind
  BOTH the per-meal "Mark eaten" button and the D12 bulk "mark all meals
  as eaten" control, does `SET is_planned = 0, logged_at = ?` with a single
  `now` for every row it touches (`:262-267`). A Pro user who builds a
  whole day from the meal plan and confirms it in one tap at 9pm — a
  mainstream flow for the structured-meal athlete audience this feature is
  partly aimed at — would have breakfast, lunch, dinner and snacks all
  stamped with the SAME `logged_at`. Ordered purely by `logged_at`, that
  day's "timeline" collapses every meal to one instant instead of spreading
  across the day.

This means "order by `logged_at`" is necessary but not sufficient for a
timeline that means what MacroFactor's Timeline Logger (the named
comparator, `pass3-comparison-matrix.md:482`) means by it. A real build
has to resolve whether:
(a) `logged_at` is left as "time logged" and the timeline is honestly a
"the order you logged things in" view (true to the data, but a bulk
day-confirm still clumps), or
(b) meal confirmation and food logging get a genuine "what time did you
eat this" concept, separate from "what time did you tap save" — which is
a bigger, more careful build (new field or repurposed semantics, an
editable time picker on log/edit/confirm, and a defensible default for
bulk-confirm so it doesn't clump).
This is a founder-decision fork per CLAUDE.md's no-silent-corner-cutting
rule, not something to default quietly — see Section 6.

### Stage 1 — small: expose true chronological order, keep bucket identity (effort: S, ~0.5-1 day)

If the founder wants to see the current behaviour with real ordering before
committing to the full replacement: re-sort `DiaryScreen.js`'s render loop
(`:1422-1466`) so meal cards render in `logged_at` order of their
earliest/most-recent entry rather than `slotOrder` rank, without removing
the cards. This is NOT what the ruling asks for (it still shows buckets)
but is the cheapest way to validate the Stage-0 clumping problem live
before the larger build. Optional, not a substitute for Stage 2/3.

### Stage 2 — the actual replacement: continuous cross-meal list (effort: L, matches the reconciliation doc's own "LARGE/careful" grading)

1. **Rendering.** Replace the `visibleSlots.map(...) → MealSection` render
   (`DiaryScreen.js:1422-1466`) with a single time-ordered list across ALL
   of the day's entries (not per-slot). Reuse `EntryRow`/`SwipeableEntryRow`
   (already renders the time, `EntryRow.js:35-41`) rather than
   re-implementing swipe/select/edit — this satisfies the blueprint's
   `NA-cux-14` concern (reuse existing row affordances) without new work,
   since `EntryRow`/`SwipeableEntryRow` are already the row primitive.
2. **Grouping decision (open, see Q1 in Section 6).** If per-meal grouping
   is preserved WITHIN the timeline (headers like "Meal 2 — 13:04" inline
   in a single scroll, entries still clustered under their `meal_slot`
   but the whole list running top-to-bottom by time), `MealSection`'s
   header/subtotal/mark-eaten/optional-extras pieces (`MealSection.js:
   57-166`) are largely reusable as sub-groups inside the new list, cutting
   the size of this stage substantially. If grouping is dropped entirely
   (flat list, no meal identity), all of `MealSection`'s per-meal-specific
   chrome (mark-eaten banner, optional-extras row, "usuals" empty-slot
   chips) needs a new home or a new flat-list equivalent — materially more
   work and touches more of the file.
3. **"Add food" entry point.** Today "Add food" is a per-card action bound
   to a specific `meal_slot` (`MealSection.js:154-163`,
   `onAdd={() => addFood(slot.key)}` at `DiaryScreen.js:1433`). A flat
   timeline needs a single "Log food" affordance that still needs SOME
   `meal_slot` to write (the column is `NOT NULL`,
   `database.js:920`) — likely via `inferMealSlotForHour`
   (`src/lib/food/mealSlots.js:177-193`), which ALREADY exists precisely
   for this ("the diary barcode FAB passes so a scan no longer lands in
   'snack' regardless of time of day"). This is a reusable seam, not new
   plumbing.
4. **"Move to meal" / multi-select.** The slot-picker move flow exists
   today (`DiaryScreen.js:1676-1708`, "Move to another meal"). `meal_slot`
   stays as a real column driving meal-plan matching, mark-eaten and
   `mealAdditions` season suggestions (`MealSection.js:49`,
   `getMealAdditionsForEntries`), so this operation survives unchanged in
   a flat timeline — it just needs a UI seam that is not a per-card button
   anymore (e.g. a "change meal" action inside the entry's own edit sheet
   or long-press menu instead of a whole-card action).
5. **Legacy/no-time entries.** None exist in practice — `logged_at` is
   `NOT NULL` from the base schema, so there is no historical row without a
   timestamp to special-case (the blueprint's `NA-cux-13` "ordering
   fallback for legacy no-time entries" concern, `pass4-blueprints-
   cardio-ux.md:234`, does not apply).
6. **Empty state.** `EmptyDiary` (`src/screens/DiaryScreen.js:578-583`
   reference in the blueprint; still imported at `DiaryScreen.js:53`) can
   likely stay verbatim — its copy is generic ("log food") not
   meal-bucket-specific — but confirm at build time (NA-cux-16 was left
   open; low-cost to answer by reading `EmptyDiary.js`, not scoped in
   detail here since it's non-load-bearing).

Rough effort for Stage 2 as a whole: LARGE, multi-day, touching
`DiaryScreen.js` (2,261 lines, dense with banking/planned-meal/ED-flag
logic threaded through the render tree — `:1400-1560` alone shows banking,
refeed, water and the D12 relocated bulk-confirm all interleaved with the
meal-section loop) and likely `MealSection.js` or its flat-list successor.
Test surface: `MealSection.polish.guard.test.js` and `foodComponents.test.js`
already pin the current per-card structure (referenced in
`DiaryScreen.js:1434-1447`) and will need deliberate rewriting, not
incidental breakage.

### Stage 3 — Stage-0 resolution, sized once Section 6 Q2 is answered (effort: S if (a), M-L if (b))

If the founder picks option (a) in Stage 0 (accept "time logged" as the
timeline's order, document it as such): no extra build, folds into Stage 2.
If option (b) (a real "time eaten" concept, editable): add an editable time
field to the add/edit sheets and to the mark-eaten/bulk-confirm flow so a
bulk day-confirm can distribute times sensibly (e.g. default each row to
its meal-slot's inferred hour via `inferMealSlotForHour` instead of a
single `now`) rather than clumping. This is the scenario that would also
touch `confirmPlannedDay` (`db.js:260-271`) and possibly warrants a genuine
new column (see Section 4) to avoid conflating "logged" and "eaten" in one
field that other code (sync ordering, `idx_food_entries_user_recent`) already
depends on meaning "recency of the write."

## 4. Schema needs

- **No schema change is required to ship a timeline that orders by
  `logged_at` as it exists today** (Stage 1/2 as scoped). The column, the
  index, and the write paths already exist; this was the one genuinely
  open code question (NA-cux-13) and it resolves to "already built."
- **A schema change MAY be needed only if Stage 3 option (b) is chosen**
  (a distinct "time eaten" concept). That would be a NEW nullable column
  (e.g. `eaten_at INTEGER`, defaulting to `logged_at` for back-compat) on
  `food_entries`, additive, following the exact pattern item 12 just used
  (`src/lib/database.js:1903-1923` local migration header +
  `supabase/migrate_114_food_entry_weight_state.sql` cloud counterpart) —
  purpose/applied-status/safe-to-re-run/rollback header, local migration
  in `database.js`'s `SCHEMA_MIGRATIONS` array, a matching
  `migrate_11X_*.sql` for Dublin, founder-run per CLAUDE.md (the app never
  runs cloud migrations). Not scoped further here since it is gated on a
  founder decision (Section 6, Q2), per the "additive, idempotent, header
  note" rule in CLAUDE.md Section 2.

## 5. ED-safety / adherence-neutrality touchpoints

The founder's own standing constraint on this exact item family already
flags the risk class: `pass3-v2-founder-decisions.md:81-94`, "STANDING
CONSTRAINT — VOICE / NO-JARGON," requires every new string to pass the
honesty test, be numbers-before-narrative, mirror-not-infer, no
motivational filler. Nothing in item 15 is itself a calorie-floor, FFM, or
ED-pattern-detector change — `edPatternDetector.js`/`weeklyCoach.js`/
`coachApply.js` read `food_entries` via the daily rollup
(`daily_intake_rollups`, unaffected by presentation order) and do not
consume screen layout. But three real touchpoints exist, all about VISIBLE
TIME creating meal-timing pressure that the current buckets do not:

1. **Explicit clock times invite fasting-window / meal-timing scrutiny
   that named buckets do not.** "Breakfast" carries no number; "07:14" and
   "22:48" on the same day, laid out as a continuous list, visually
   invites a user to notice gaps and eating windows — adjacent territory
   to intermittent-fasting framing, which is exactly the kind of thing
   `COACHING_VOICE_SYNTHESIS_LOCKED.md`'s failure-mode catalogue
   (cited generally at `pass3-v2-founder-decisions.md:86-89`) exists to
   keep the app out of. Nothing in the app currently narrates gaps between
   entries or calls out "late eating" — it must stay that way; a timeline
   MUST NOT add any derived copy about how long since the last entry, how
   early/late a meal is, or a "fasting window," even as a passive stat.
   This should be stated as an explicit non-goal in the build spec, not
   left implicit.
2. **`MacroRings` neutrality is unaffected but must be verified, not
   assumed.** `MealSection.js:61-63` shows the numbers-only "574 kcal -
   41g P" per-meal subtotal today (no colour judgement, no score) and the
   day rings read from `getRollupForDay` regardless of layout
   (`DiaryScreen.js:103-110` per the blueprint's own citation) — a
   flat/grouped timeline reusing `EntryRow`'s existing macro line
   (`EntryRow.js:76-79`) preserves this by construction as long as no new
   per-entry colour/judgement is introduced. Flag at build time: do not
   let a "how long ago" or "how many hours since your last meal" chip creep
   in as a "helpful" timeline feature — that is precisely the numbers/
   narrative line the voice doc polices.
3. **Bulk-confirm clumping (Section 3, Stage 0) has a secondary ED angle,
   not just a cosmetic one.** If a whole day's planned meals are confirmed
   at 9pm and rendered in a timeline stamped at 9pm, a user could read that
   as "I ate everything at once tonight," which is a factually wrong
   inference the app itself created through the clumped timestamp, not
   through anything the user did — a violation of the honesty test
   ("true if the user did nothing but kept logging?" —
   `pass3-v2-founder-decisions.md:88`, sourced from
   `COACHING_VOICE_SYNTHESIS_LOCKED.md:39-46`). This is a concrete reason
   Stage 0's fork is not merely a UX nicety; showing a false eating pattern
   back to the user is itself an honesty-test failure and arguably an
   ED-adjacent framing risk (looks like a binge pattern that didn't happen).
   Recommend this get explicit founder attention rather than being decided
   as an implementation detail (Section 6, Q2).
4. **Calm mode / open ED-flag surfaces are untouched by this item** —
   `wellbeing.js`/Beat UK signposting do not read diary layout, and nothing
   here proposes changing them. Confirmed no code path in scope touches
   `src/coaching/safety` or the flag itself; stated for completeness per
   CLAUDE.md's "if a task touches any of this: STOP" rule — it does not.

## 6. Structured founder questions (forks the ruling leaves open)

**Q1 — Grouping within the timeline.**
The ruling says "replaces the meal buckets," which settles that there is no
toggle and no separate bucket view. It does not settle the visual form of
the replacement. Options:
- (A) Flat list, no meal identity shown at all — every entry is a peer,
  ordered purely by time. Closest to "buckets are GONE."
  Effort: larger (MealSection's per-meal chrome — mark-eaten, optional
  extras, usuals — all need a new home or removal).
- (B) Grouped-but-inline — entries still cluster under their meal ("Meal
  2 — 13:04" as a running sub-header), but the whole page is one
  continuous scroll ordered by time rather than fixed-rank cards. Closer
  to "buckets demoted to inline labels, not gone." Cheaper to build
  (MealSection's chrome mostly survives as a sub-group).
- (C) Something else the founder specifies.
`pass4-blueprints-cardio-ux.md:239` anticipated (B) as the athlete-friendly
reading; the founder's own "for everyone" phrasing doesn't pick between
them. Recommend the founder choose explicitly rather than either being
defaulted.

**Q2 — What does the timeline actually order by: time logged, or time
eaten?**
This is the load-bearing finding from Section 3/5. Options:
- (A) Order by `logged_at` as it exists today (time the entry was saved).
  No schema change, smallest build, but a bulk plan-confirm clumps a whole
  day's meals onto one instant, and a user who back-logs breakfast at
  lunchtime will see it out of true chronological order. Honest to the
  data, arguably misleading in effect (Section 5, point 3).
- (B) Add a genuine, editable "time eaten" concept (additive column,
  editable at log/edit time, sensible defaults for bulk-confirm derived
  from `inferMealSlotForHour`). True to what MacroFactor's Timeline Logger
  and the blueprint's own framing mean by "timeline," but a materially
  bigger build and a new schema column requiring a founder-run cloud
  migration.
- (C) Order by `logged_at` for normal entries but give bulk-confirm a
  distributed-not-identical timestamp per row (e.g. inferred meal-hour)
  without adding a user-facing time editor — a middle option that fixes
  the worst clumping case cheaply without building a full time-editing UI.
No default is assumed here; this materially changes both the size of the
build and whether item 15 needs its own migration.

**Q3 — "Add food" entry point and "Move to meal" once cards are gone.**
Once there is no per-meal card, where does "Add food" live (one button for
the day, defaulting to the inferred current meal-hour via the existing
`inferMealSlotForHour`), and does "Move to another meal" (today a
multi-select bulk action, `DiaryScreen.js:1676-1708`) move into the
per-entry edit sheet instead, get removed, or stay as-is via a different
trigger? This follows mechanically from whichever answer Q1 gets, but the
founder should see it named rather than have it decided as a build-time
detail, since it changes a flow every Pro user touches daily.

**Q4 — The Section 5 honesty-test flag on bulk-confirm clumping.**
Independent of Q1/Q2: does the founder want this called out explicitly as
an ED-safety-adjacent finding needing its own sign-off before Stage 2/3
build starts, or is it sufficiently covered by however Q2 is answered? Not
a design preference question — flagging it because CLAUDE.md's honesty-test
standard applies here as read, not because a new safety rule is proposed.

## Sources read in full for this scoping pass

- `docs/ux-world-class-audit-2026-07-09/ultimate-audit-11-16-reconciliation.md`
- `docs/ultimate-audit-2026-06-13/pass3-v2-founder-decisions.md` (all 213 lines)
- `docs/ultimate-audit-2026-06-13/pass4-blueprints-cardio-ux.md:160-350` (Item 3, the
  timeline blueprint, plus the consolidated NA-id register)
- `docs/ultimate-audit-2026-06-13/pass4-needs-answer-register.md:50-79`
- `docs/ultimate-audit-2026-06-13/pass4-master-priority.md:26`
- `docs/ultimate-audit-2026-06-13/_AUDIT-STATUS-AND-RESUME.md:21,171,324-325`
- `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md:100-166` (D11-D14)
- `src/screens/DiaryScreen.js` (header, imports, `entriesBySlot`, render loop
  `:1400-1560`, move-to-meal flow `:1676-1708`)
- `src/components/food/MealSection.js` (full file)
- `src/components/food/EntryRow.js` (full file)
- `src/lib/food/mealSlots.js` (full file)
- `src/lib/food/db.js` (`logFoodEntry`, `updateFoodEntry`,
  `getFoodEntriesForDay`, `confirmPlannedDay`, `getRecentLoggedDays`)
- `src/lib/database.js:910-948` (`food_entries` CREATE TABLE),
  `:1895-1923` (v66 weight_state migration)
- `src/lib/food/mealAdditions.js:30-35,637-645`
- `src/lib/dayKey.js` (full file)
- `supabase/` directory listing (confirmed `migrate_114_food_entry_weight_state.sql`
  exists)
