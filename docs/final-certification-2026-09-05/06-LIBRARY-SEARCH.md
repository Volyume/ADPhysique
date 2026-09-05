# 06 — Exercise library search and picker usability (Part 10)

Authority: founder brief 2026-09-05, Part 10. Corpus: `src/lib/exerciseCorpus/`
(918 live rows via `loadSeedRows()`). Ranking under test: the REAL function
the app calls — `fuzzySearch()` in `src/lib/exerciseFuzzySearch.js`, invoked
exactly as `src/components/ExercisePickerModal.js`'s `listData` memo calls it
(line 442-446): `fuzzySearch(base, query, e => e.name, { getAliases: e =>
e.aliases, getTier: e => tierRank(e.name) })`.

Harness: `scripts/certification/search-harness.mjs` (new; reuses
`scripts/exercise-library/loadSeed.mjs` and imports `fuzzySearch`,
`tierRank`/`autoTier`, `matchesEquipmentFilter`/`matchesMuscleFilter` from
`src/lib` unmodified — no src/ edit, no new dependency). Run:
`node scripts/certification/search-harness.mjs`. Full output (102 queries x
2 passes x top 5): `docs/final-certification-2026-09-05/data/search-results.json`.

## Summary counts (94 queries + 8 misspellings, no-equipment-filter pass)

| Metric | Count |
|---|---|
| Staple appears in top 3 | 56 / 102 |
| Staple appears in top 5 but not top 3 | 3 / 102 |
| No staple in top 5 at all | 43 / 102 |
| — of which: no STAPLE-tier row exists for the movement at all (expected, not a defect — e.g. push-up, plank, snatch, clean, kettlebell swing, wrist curl are COMMON/SPECIALIST/NEVER_AUTO by deliberate C16 ruling) | ~35 |
| — of which: a relevant staple/common row exists but is buried, absent, or crowded out by noise (real defects, see MISSES below) | ~8 |
| Zero results returned | 2 (`flat db press`, `burpee`) |
| Misspelling recovery (staple/correct family surfaces top 3) | 8 / 8 |

Misspelling recovery is strong: all eight (`benhc`, `squt`, `deadlft`,
`romainian`, `lateral rase`, `tricep pushdwn`, `kettelbell swing`, `pullup`)
land the right family in position 1-2. The "staple in top 3" raw count
overstates health, though: several top-3 hits are the WRONG exercise
entirely, landing there through bogus alias data or over-generous typo
tolerance (see anomalies below), not because the ranking correctly favoured
a staple.

## MISSES (staple/common relevant, not surfaced correctly)

| Query | Top 5 (tier, name) | Problem |
|---|---|---|
| `flat db press` | *(0 results)* | AND-across-tokens (fuzzySearch.js:159, `if (best === 0) return 0`) needs every word to match; no row's name/alias contains anything close to "flat", so the whole query fails even though "Dumbbell Bench Press" is exactly what the user means. |
| `bench` | 1 common Bench Dip, 2 common Bench Dip (Feet Elevated), 3 niche Bench Press (Close Grip, DB), 4 **staple** Barbell Bench Press, 5 staple Dumbbell Bench Press | The staple is 4th. Root cause below (word-order prefix bias). |
| `bicep curl` | 1 specialist TRX Bicep Curl, 2 niche Band Bicep Curl, 3 niche Cable Overhead Bicep Curl, 4 **staple** Barbell Curl, 5 staple Dumbbell Curl | Same root cause: none of these staples begin with "bicep". |
| `deadlift` | 1 specialist Conventional Deadlift, 2 specialist Block Pull (Deadlift), 3 specialist Sumo Deadlift, 4 **staple** Romanian Deadlift, 5 staple Romanian Deadlift (Barbell) | The one STAPLE hip-hinge is 4th; three SPECIALIST-tier lifts (deliberately held below staples for auto-generation, `canonicality.js` CONTESTED block) outrank it in manual search because each carries a literal `"Deadlift"`/`"Deadlift (…)"` alias. Arguably "Conventional Deadlift" IS a fair #1 for the bare word, but the corpus has no STAPLE literally named "Deadlift", so RDL — the closest staple — should not be buried under three near-identical specialist deadlift variants. |
| `hamstring curl` | 1 common TRX Hamstring Curl, 2 specialist Nordic Curl, 3 specialist Single-Leg Lying Leg Curl, 4 niche Slider Leg Curl (Bodyweight) | Only 4 results total. Neither STAPLE leg-curl row (`Lying Leg Curl`, `Seated Leg Curl`) carries a "hamstring curl" alias, so the single most common colloquial name for this movement misses both staples completely. |
| `swing` | 1 staple Lying Leg Curl, 2 common Clamshell (Side-Lying), 3 common Lying Tricep Extension, 4 specialist Ring Chin-Up, 5 specialist Ring Dip | **Kettlebell Swing does not appear in the top 5 at all** for the literal word "swing" (37 total matches). All 5 shown are Levenshtein-distance-2 false positives on "Lying"/"Ring" (see anomaly 1). |
| `front squat` | 1 niche Front Squat (Dumbbell), 2 common Barbell Front Squat, 3-4 specialist Kettlebell Front Rack Squat variants, 5 niche Smith Machine Front Squat | The COMMON canonical row is outranked by a NICHE dumbbell variant purely because its name happens to start with the query string (word-order bias, see anomaly 2). |
| `burpee` | *(0 results)* | Content gap, not a ranking bug: no Burpee row exists anywhere in the 918-row corpus. |

## WEAK (staple technically in top 3, but for the wrong reason, or an obscure item wins #1)

| Query | #1 result | Why it's wrong |
|---|---|---|
| `row` | niche **TRX Row** (alias "Rowing with TRX band") | Beats staple `Barbell Row (Bent Over)` (#2). `#3` is `Cable Crossover (High to Low)` — completely unrelated to "row" (Levenshtein("row","low")=1 against the "(High to Low)" token). |
| `curl` | specialist **Barbell Wrist Curl** | Beats staple `Barbell Curl` (#2) because of a Spanish alias, see anomaly 2. |
| `glute bridge` | common Glute Bridge, then **staple "Dumbbell Bench Press" at #2** | Dumbbell Bench Press carries a garbled alias literally reading `"Glute Bridge Single-Arm Press"` — a data-integrity bug, not a ranking success (see anomaly 3). A user searching "glute bridge" would see a bench-press row and reasonably think the library is broken. |
| `dip` | common Dip Machine, then **staple Barbell Hip Thrust (#2) and staple Machine Hip Thrust (#3)** | Neither hip thrust exercise has anything to do with "dip"; both fuzzy-match via `"hip"` ~ `"dip"` (edit distance 1, anomaly 1). Inflates the "staple in top 3" count for a query where the real intent (chest/triceps dip) has no STAPLE row at all. |
| `clean` | never_auto Clean Pull, Barbell Clean and Jerk, Kettlebell Clean and Press, then **common "Straight Bar Dip (Chest-Lean)" at #4** | "Clean" ~ "Lean" (edit distance 1) pulls in an unrelated chest exercise. |

## Duplicate / confusable clusters (same equipment + muscle, indistinguishable in the picker)

Checked by comparing `equipment`, `primaryMuscle`, `secondaryMuscles`,
`movementPattern` for pairs that co-appear in a query's top 5:

- **`Romanian Deadlift`** (id `0c3bc751…`) vs **`Romanian Deadlift (Barbell)`**
  (id `fe4ddea8…`) — both `equipment: barbell`, `primaryMuscle: hamstrings`,
  identical secondary muscles and movement pattern. A user typing "romanian
  deadlift" or "rdl" sees both as the top two results with no way to tell
  them apart beyond the name suffix; nothing in the picker surfaces that
  they are metadata-identical. Not covered by the EL-21/EL-25 dedup
  passes (`docs/exercise-library-expansion-2026-09-05/05-DECISIONS.md`
  EL-21/EL-25), which retired other same-name/word-order pairs but did not
  catch this one.
- **`Good Morning`** (specialist) vs **`Barbell Good Morning`** (specialist,
  the EL-25 rename target for the old `"Good Morning (Barbell)"`) — both
  `equipment: barbell`, `primaryMuscle: hamstrings`, identical secondary
  muscles/pattern. Same defect shape as above: two rows, one movement, no
  distinguishing metadata, both surfacing together for `good morning`.

Both pairs are a founder-decision fork (retire-and-alias per the EL-21
precedent, or keep as deliberately distinct rows) — flagged here, not
resolved, per the HARD BOUNDS (no src/ edit in this task).

## Concrete ranking anomalies, with code path

1. **Short-token typo tolerance fires on unrelated words.**
   `src/lib/exerciseFuzzySearch.js:124-137` (`scoreTokenPair`): for a
   4-letter-or-shorter query token, `allowedDistance = 1`. `"dip"`~`"hip"`,
   `"row"`~`"low"`, `"clean"`~`"lean"` (5-letter, allowed 2) all pass. This
   is the single biggest source of nonsense results in the run (`dip`,
   `swing`, `clean`, `row` above). A 1-edit allowance on a 3-4 letter word
   is a ~25-33% character change, too permissive for the value it adds
   (catching genuine typos like `benhc`/`squt`, which already work via
   *other* words in a multi-token query, not via this single-token path).

2. **Prefix tiers (0-3) are checked on the raw, non-token-bounded string,
   so any name/alias that happens to START WITH the query string outranks
   the tier-registry's STAPLE preference, regardless of word relevance.**
   `matchTier()`, `src/lib/exerciseFuzzySearch.js:255-263`, checks
   `entry.nn.startsWith(nq)` (line 257) and
   `entry.aliasEntries.some(a => a.norm.startsWith(nq))` (line 259) before
   ever consulting `getTier`. The corpus naming convention (per
   `05-DECISIONS.md`, `[Implement] [Angle] [Movement]`) puts the STAPLE's
   distinguishing implement word FIRST (`"Barbell Bench Press"`,
   `"Barbell Curl"`, `"Barbell Row (Bent Over)"`), so a bare movement-word
   query never hits tier 0/1 for the staple — it falls to tier 4 (fuzzy,
   where `getTier` finally applies) and any COMMON/NICHE/SPECIALIST row
   whose name coincidentally starts with the bare word (`"Bench Dip"`,
   `"Bench Press (Close Grip, Dumbbell)"`, `"Front Squat (Dumbbell)"`,
   `"TRX Row"` via its alias) wins tier 1-3 and outranks it. This explains
   `bench`, `bicep curl`, `front squat`, and `row` uniformly — one
   mechanism, four different misses.

3. **A garbled/mismatched alias on one corpus row silently corrupts search
   for an unrelated exercise.** `"Dumbbell Bench Press"` (barbell family,
   `src/lib/exerciseCorpus/families/dumbbell.js`) carries the alias
   `"Glute Bridge Single-Arm Press"` — not a real alternative name for a
   bench press by any reading. `exercisePickerSections`/`fuzzySearch`
   correctly does its job on bad input: `glute bridge` scores a perfect 1.0
   token match against this alias (`fuzzyScore`, confirmed directly:
   `fuzzyScore('glute bridge', 'Glute Bridge Single-Arm Press') === 1`),
   putting a bench press at #2 for a glute-bridge search. This is a data
   defect, not a code defect — worth a corpus alias audit pass separate
   from this ranking harness (several dumbbell-family aliases read like
   garbled auto-generated variant names, e.g. `"dumbbell lying one arm
   press v. 2"` on the same row — suggests a bulk alias-import step that
   was not reviewed row-by-row for the dumbbell family specifically).

4. **Diacritic-stripping in `normaliseExerciseName()` (line 200-202)
   exposes foreign-language aliases to the same bare-English prefix check.**
   `"Barbell Wrist Curl"` carries the alias `"Curl De Muñeca Con Barra"`
   (Spanish, kept as a search alias). Stripped of its accent and
   lower-cased, it normalises to `"curl de muneca con barra"`, which
   **starts with** `"curl"` — so the English query `"curl"` hits tier 3
   (alias prefix) for a SPECIALIST forearm-isolation row, ahead of the
   STAPLE `"Barbell Curl"` (tier 4). The Spanish alias is legitimate
   content; the prefix-tier mechanism was not designed with the
   possibility that a translated alias's first loanword would collide with
   an unrelated English query.

5. **`"Deadlift"` as a bare alias on a SPECIALIST/CONTESTED row outranks
   the STAPLE hip-hinge for the single most likely real-world query.**
   `Conventional Deadlift`'s aliases (`src/lib/exerciseCorpus/families/
   barbell.js`) are `["Deadlift", "Deadlift (Conventional)"]`. `"Deadlift"`
   is an exact alias match (tier 2); `Sumo Deadlift`'s `"Deadlift (Sumo)"`
   and `Block Pull (Deadlift)`'s `"Deadlift from Blocks"` both satisfy
   tier 3 (alias prefix). `Romanian Deadlift` only reaches tier 4. Given
   `canonicality.js`'s own CONTESTED reasoning holds Conventional/Sumo
   deadlift at SPECIALIST specifically so they are not treated as
   defaults, giving the bare generic alias `"Deadlift"` to one of them
   (rather than to nothing, or splitting it) is what causes the mismatch
   between the auto-generation tier ruling and manual-search behaviour.

## UI: filters, sections, and empty/no-results states (code inspection, not device-run)

- **Equipment filter chips** (`PICKER_EQUIPMENT`,
  `src/components/ExercisePickerModal.js:58`): `['Barbell', 'Dumbbell',
  'Cable', 'Machine', 'Bodyweight', 'Smith Machine', 'Bands']`. **There is
  no "Kettlebell" chip**, despite kettlebell being one of the corpus's 16
  families (59 rows pass `matchesEquipmentFilter(e, 'kettlebell')` in this
  harness) and appearing throughout the founder brief's own query list
  ("kettlebell swing", "kettlebell clean", "kb swing", "tgu"…). A user
  cannot browse-filter to kettlebell-only from the chip row at all; the
  equipment matcher itself (`src/lib/exerciseDisplay.js:42-71`) supports
  the label fine (confirmed: this harness's kettlebell pass works), the
  gap is only that the picker UI never offers the chip. Landmine, sled,
  suspension, medicine ball and specialty/sandbag are absent from the chip
  row too.
- **Muscle filter chips**: `PICKER_MUSCLES = Object.keys(MUSCLE_DISPLAY_NAMES)`
  — every muscle enum value, each with a friendly label
  (`MUSCLE_DISPLAY_NAMES`), so labels are discoverable. No "style" filter
  exists (no way to browse by kettlebell-ballistic/circuit/etc from the
  picker).
- **Empty-query sections** (non-empty query is what this harness exercises;
  documented here for completeness): `Recent` → `In your plan` → `Staples`
  (filtered to whatever equipment/muscle chip is active) → `All exercises`
  alphabetically (`src/lib/exercisePickerSections.js:76-110`). Swap mode
  skips sections entirely and stays a flat alphabetical browse.
  Section labels are plain text (`SectionLabel`), always visible when the
  section is non-empty.
- **No cap / no pagination on result count.** `listData`
  (`ExercisePickerModal.js:440-449`) returns every match; `FlashList`
  (line 1000) virtualises rendering but nothing truncates the underlying
  array. Confirmed by this harness: `press` alone returns 138 of 918 rows,
  `row` 89, `curl` 75, `squat` 77 — all rendered to the list, scroll-only.
  This is functionally fine (virtualised list, not a memory/perf bug) but
  means a broad one-word query is a long scroll with no "show more
  specific" affordance. Worth noting: the file's own top comment (line 12)
  still says *"the full library is ~450 rows with no render cap"* — stale
  since the corpus grew to 918; harmless (the code makes no size
  assumption) but worth a comment fix in the same pass that touches this
  file for another reason.
- **"No results" copy**: `ExercisePickerModal.js:1103` —
  `"No swaps found. Try a different search."` (swap mode) /
  `"No matches found. Try a different search."` (add mode). Calm, plain,
  no blame — consistent with `COACHING_VOICE_SYNTHESIS_LOCKED.md`. No
  suggestion of removing a filter chip or trying a shorter query, which
  would help given `flat db press`'s zero-result AND-across-tokens failure
  above (removing "flat" would have found it).

## Scope note

This harness reproduces the REAL ranking function and REAL corpus exactly
as the app assembles them (`getAllExercises()` → `ORDER BY name ASC`,
`matchesEquipmentFilter`/`matchesMuscleFilter`, `fuzzySearch` with the same
`getAliases`/`getTier` the picker passes). It does not exercise `Recent`/
`In your plan` sections (empty-query only, not in the founder's query list),
FlashList's actual on-device scroll/measurement behaviour, or the
create-custom-exercise "already exists" suggestion flow
(`findCanonicalNameMatch`, same file) — none of the fixed queries hit an
empty string. No src/ file was modified to produce these results.
