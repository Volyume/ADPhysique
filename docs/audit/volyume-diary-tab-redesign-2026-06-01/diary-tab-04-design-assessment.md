Status: COMPLETE | Timestamp: 2026-06-01 | Phase 4: Design standards assessment

# Diary tab vs best-in-class: gap assessment

Each area: the current standard (from the code, Phase 1), the best-in-class
standard (from Phase 2 competitor and Phase 3 sentiment research), and the
specific gap. Severity: Critical / High / Medium / Low.

Two constraints frame every gap. First, adherence-neutral colour is locked
(`MacroRings.js:11-20`): no green-for-good, no red-for-over. Second, CLAUDE.md
design rules bind: locked `#0D0D0D` background, no gradients, the amber is the
brand affordance, tiered radii, no decorative icons on every row, plain
no-cheerleading copy. The redesign elevates within those rules.

| Area | Current (code) | Best-in-class (research) | Gap | Sev |
|---|---|---|---|---|
| Daily summary | Strong Skia calorie ring + remaining + 3 macro sub-rings + day-type chip (`MacroRings.js`) | One glanceable goal read with depth on tap; for macro-driven users, bars read four numbers at once where rings hide them (MacroFactor; Phase 2 pattern 1-2) | Summary is good; the three small 44px macro rings read slower than bars for a four-number athlete, and protein is not visually primary | Medium |
| Empty state | Six dashed "Add food" boxes + a lone sentence at the bottom (`MealSection.js:50-56`, `DiaryScreen.js:487`, `EmptyDiary.js`) | A designed, single, inviting state; never a row of placeholders (Phase 2; Phase 3 "poor empty states feel unfinished") | Reads as unfinished; split in two; no targets-in-context, no training-day cue | Critical |
| Meal sections | No container; bare label + kcal-only total + dashed box (`MealSection.js`) | Grouped, contained sections with per-meal subtotals visible in place; demoting them is the category's loudest 2026 mistake (MFP, Phase 2 pattern 3) | No containment, no per-meal macros (kcal only), dashed box under every section | High |
| Food item display | Each item a separate bordered card (`EntryRow.js:96-104`); name/brand/grams + kcal + "P C F" | Clean list rows grouped under the meal, fast to scan; per-item macros valued by athletes (Phase 3) | Items as individual cards fragment the list; three container styles per section | High |
| Typography hierarchy | Mix of semantic `type` roles and raw size/weight pairs across components | Clear single hierarchy guiding the eye to the day's headline number first | Inconsistent application; section labels (xs) and item names (md) and totals compete | Medium |
| Spacing and layout | Single long column, `padding lg`, sections `marginBottom lg` | Breathing room with clear grouping; density complaints sink premium feel (MFP "cluttered", Phase 2) | Adequate spacing but no grouping rhythm; empty day is mostly dashed boxes and air | Medium |
| Colour | Adherence-neutral amber + neutrals, used well in the rings; meal/water/items all neutral surfaces | Colour as meaning (progress/status), used sparingly; amber as the one brand accent | Colour is safe but under-used as hierarchy: nothing draws the eye to protein, the athlete's priority number | Medium |
| Component consistency | Rings card and water row are `surface`+border cards; meal sections have no card; items are cards each (`MealSection.js:43`, `DiaryScreen.js:754-759`, `EntryRow.js:96`) | One card language across the screen | Three different container idioms on one screen; water is a fourth idiom (stepper) | High |
| Quick actions | Scan FAB + copy-yesterday FAB (empty days only) + per-section "Add food" + insights icon | Fast logging is the single hinge of retention (<~30s/log, abandonment climbs past it; Phase 3); repeat-meal/copy valued by prep athletes | Copy-yesterday vanishes once the day has any entry; no recents/frequents/saved-meal quick row on the diary; two stacked FABs crowd the corner | High |
| Water tracker | Text + 2 stepper buttons, no target, off to one side (`DiaryScreen.js:629-648`) | Should match the screen's visual language and show progress to a goal | A different idiom from everything else; no goal, no progress; fixed 250 ml | Medium |
| Day navigation | Chevrons only, Today pill, unbounded future (`DiaryScreen.js:432-458`) | Swipe between days, optional week strip; clear past/today/future states (Phase 2 cross-domain: Gentler Streak / Apple week strip) | No swipe, no week view; past/future days look identical to today | Low-Medium |
| Training context | Pre/Post-workout are inert slots though `isTrainingDay` is known (`DiaryScreen.js:87`,`:469-483`) | Training-focused users want food tied to the session, not generic wellness slots (Phase 3 section 4) | The one thing a general app cannot do, and Volyume does not do it either | High |

## The through-line

The summary is already close to best-in-class. Everything below it is not. The
screen loses its premium feel in the body: uncontained meal sections, a
placeholder-style empty state, kcal-only meal totals, a stepper water widget,
and inert workout slots. The research points the same way from two directions:
keep the glanceable top read and never tax the log (MFP's 2026 mistake), and
make per-meal macros and protein visible in place for a training user. The
redesign should leave the summary largely intact, rebuild the body into one
contained card language, design a single purposeful empty state, surface
per-meal macros, make the workout slots actually about the workout, and protect
the speed of logging above all.
