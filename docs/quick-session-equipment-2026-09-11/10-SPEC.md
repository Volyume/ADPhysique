# 10 — SPEC: Quick full-body session from what you have to hand (lead, 2026-09-11; the edit gate for lane B-A)

Authority: founder decision A (chat, 2026-09-11: widen the quick session
from three presets to the app's real equipment) on the same-day report
that a blank workout opened on a forced travel chooser (landed ff693b4).
Evidence: `01-RECON.md` (lane R-A). Rulings recorded as D156 in
`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`. Hard
bounds: CLAUDE.md section 2 (the engine is deterministic and pure; no
AI, no randomness; no new dependency; British English; no em dash) and
section 3 conventions. Prior rulings honoured, not reopened: F-16
REVISED and D154 concern WEEKLY plan generation and stay as they are;
this spec touches the quick session only.

## 1. Rulings (D156)

1. **Inventory, not profile.** The sheet asks "What do you have to hand
   today?" and takes a multi-select over equipment KINDS. Bodyweight is
   always included (you always have your body). The last selection is
   remembered per account on device. This is the "equipment inventory"
   D154 pointed at, scoped to the quick session: a kettlebell move is
   offered only to someone who says they have a kettlebell today, so the
   "never said they have one" objection does not arise.
2. **Kinds map to the corpus's derived `equipmentCategory`** (`01-RECON.md`
   section 1): Dumbbells -> `dumbbell`; Kettlebells -> `kettlebell`; Bands
   -> `band`; Barbell and plates -> `barbell`, `landmine` (ez_bar already
   folds into barbell); Cables and machines -> `cable`,
   `machine_selectorised`, `machine_plate_loaded`, `smith`; Suspension
   trainer -> `suspension`. Not offered: `sled`, `medicine_ball`, `sandbag`,
   `other` (conditioning; generation already drops them). Presets: "Full
   gym" selects every kind; "Nothing, bodyweight only" clears every kind.
3. **Corpus-driven, pure, deterministic.** The generator takes the library
   rows the screen already has AFTER the intent filter, the kit set and a
   fixed slot list; it never emits names to be matched, never uses
   `Math.random`, and the same inputs always give the same session.
   `src/lib/travelMode.js` and its hand pools are retired (deleted) with
   this landing; nothing else imports it (`01-RECON.md` section 5).
4. **Eight full-body slots, fixed order** (travel mode's own coverage,
   kept): quads, hamstrings, chest, back, shoulders (side_delts,
   front_delts and rear_delts pooled together and ranked as ONE group -
   see the ranking order below, amended twice after the fresh-eyes review
   of the first landing), biceps, triceps, abs. The corpus has no
   bodyweight, kettlebell or suspension row with side_delts as its
   primary muscle (a lateral raise needs external resistance), so pooling
   the three shoulder muscles and ranking across the whole pool is what
   keeps the slot filled for those three kits, rather than a single fixed
   muscle sitting unfilled. Per slot, candidates are rows with
   `primaryMuscle` equal to the slot muscle (every muscle in the group,
   for the shoulders slot), `equipmentCategory` in kit-categories plus
   `bodyweight`, not retired, and auto-eligible: `isAutoEligible(name)`
   from `src/lib/exercise/canonicality.js`, PLUS, only when the kit
   includes Kettlebells, the names in `KETTLEBELL_NEVER_AUTO_EXCEPTIONS`
   (`src/lib/exercise/stylePools.js`, lazily required inside
   `quickSession.js` so a static import of it never pulls the whole
   corpus into every screen that imports the module) since the person has
   said they have one. Never a `NEVER_AUTO` row otherwise. Ranking is a
   stable total order, AMENDED TWICE after the fresh-eyes review of the
   first landing (46961f5), FINAL ORDER: (0) a row admitted only through
   the kettlebell `NEVER_AUTO` exception sorts LAST, after every
   ordinarily-eligible row; (1) kit equipment before bodyweight whenever
   the kit is non-empty; (1b) a rep-based row before a timed hold
   (`exerciseType === 'duration'`: a carry, a plank), so a press or a curl
   is chosen ahead of a carry whenever the kit offers one and a hold is
   only ever the fallback; (2) tier rank - NOT canonicality.js's own
   `tierRank()`, a LOCAL mapping in `quickSession.js`
   (`QUICK_SESSION_TIER_ORDER`) built from `autoTier()`'s tier name:
   staple, then common, then NICHE, then SPECIALIST (specialist last -
   the reverse of canonicality.js's own staple/common/specialist/niche
   order; canonicality.js and `tierRank()` are never edited, every other
   consumer keeps the global order); (3) compound before isolation
   (`compoundIsolation`) on quads, hamstrings, chest, back AND the
   shoulders slot, no preference on biceps, triceps or abs; (4) a
   movement pattern already used by an earlier chosen slot
   (`row.movementPattern`) sorts after an unused one - a row with no
   pattern is treated as unused, and this rule is a tiebreak among
   otherwise-equal candidates only (reached solely when two rows already
   tie on tier and on the compound preference), never a veto on a second
   push - a shoulder press after a chest press is ordinary full-body
   programming; (5) difficulty ascending (`Number.isFinite(difficulty) ?
   difficulty : Infinity`); (6) `String(name ?? '')` ascending; (7)
   `String(id ?? '')` ascending as the final tiebreak, so the order is
   total. First candidate wins; a chosen name is excluded from every
   later slot. A slot with no eligible candidate across every muscle it
   covers is left unfilled and reported (`unfilled`), never padded with
   an off-kit move.
5. **Prescription** (travel mode's own scheme, shorter rest, higher reps):
   compound 3 x 8-12, rest 90 s; isolation 3 x 12-15, rest 60 s; a
   bodyweight row follows its own class. `restSuggested: true` so the
   screen labels it "Rest (suggested)" and the person edits anything.
6. **Named, not silent (T1-23 preserved).** AMENDED TWICE after the
   fresh-eyes review of the first landing (46961f5). The generator runs
   ONCE, over the unfiltered library; for every item it would place from
   that full catalogue, the row's `id` is checked against the set of ids
   present in the intent-filtered library - a row whose id is absent was
   removed by the filter, and is classified with
   `capabilityBlockReason(capabilityState, row)` (wrapped in try/catch; a
   throw counts as a preference drop, matching the screen's own fail-safe
   before this landing) before the two existing toast lines are shown ("N
   movement(s) left out for your limitations." / "... for your avoided
   movements."), now joined by a third when a slot is unfilled ("Nothing
   fitted your kit for {labels}."). Two things this history fixes, in
   order: first, running the generator a SECOND time over the filtered
   library and comparing per-slot winners over-counted, because the
   chosen-name exclusion cascades - filtering out one slot's winner can
   free up a row that would otherwise have won a LATER slot, changing
   that later slot's own winner too even though nothing in its own
   candidate pool was filtered, and a per-slot comparison read that
   knock-on reshuffle as a second drop; checking id membership directly
   against the filtered library sidesteps this because it never asks
   "who wins now", only "is this specific row still there". Second,
   matching by NAME rather than `id` had its own hole: a custom, free-text
   exercise can share a canonical row's display name, and matching by
   name let the surviving custom row mask the canonical row's real
   removal - ids are unique per row; names are not. The capability
   preflight before generation stays exactly as it is (T1-21).
7. **Sheet.** Title "Quick full-body session". Copy: "Pick what you have to
   hand and Volyume fills this workout with a full-body session for it,
   without changing your plan. Bodyweight moves are always included.
   Change anything before you start, or close this and add your own
   exercises." followed by the existing replace notice when exercises are
   already added. Then a preset row of two `Chip`s ("Full gym", "Nothing,
   bodyweight only"), then the six kind `Chip`s as a multi-select (each
   `accessibilityRole="checkbox"`, `accessibilityState={{ checked }}`,
   haptics.selection() on toggle), then Cancel and the committing button
   ("Fill workout" / "Replace with session", `emphatic`, the one amber
   fill in the sheet, D148). Icons: dumbbells `barbell-outline`,
   kettlebells `fitness-outline`, bands `git-commit-outline` or another
   Ionicons glyph that reads as a loop, barbell `barbell-outline`,
   cables and machines `hardware-chip-outline` or `cog-outline`,
   suspension `link-outline`; pick from Ionicons only, no new asset.
8. **Remembered kit.** `@volyume_quick_kit_v1:<uid>` in AsyncStorage: a JSON
   array of kind ids; read on sheet open (shape-checked, never throws),
   written on "Fill workout"; first use is the empty kit (bodyweight).

## 2. Files

- `src/lib/quickSession.js` (new, pure, no I/O, no store): `QUICK_KIT_KINDS`
  (ordered `[{ id, label, icon, categories }]`), `KIT_PRESETS`,
  `QUICK_SESSION_SLOTS`, `buildQuickSession({ library, kit })` ->
  `{ items: [{ slot, exercise, sets, repsMin, repsMax, restSeconds,
  restSuggested }], unfilled: [muscle] }`, and
  `explainQuickSessionDrops({ all, filtered, kit, capabilityState })` ->
  `{ capabilityDrops, preferenceDrops }` (uses `capabilityBlockReason`
  through a lazy require, as the screen does today). Reads only
  `id, name, primaryMuscle, equipmentCategory, compoundIsolation,
  difficulty, retiredInto` on a row; if `equipmentCategory` is absent on a
  row, derive it with `deriveEquipmentCategory` from
  `src/lib/exerciseMetadata.js` (check what `getAllExercises()` rows carry
  in `src/lib/database.js` before relying on either).
- `src/lib/quickSessionKit.js` (new): `readQuickKit(uid)`, `writeQuickKit(uid,
  kit)`, never throw, key as above.
- `src/screens/BuildWorkoutScreen.js`: `applyTravelMode` becomes
  `applyQuickSession`; the sheet per ruling 7; state `quickKit` (array)
  replacing `travelEquipment`; `travelMode` import removed; the drop pass
  per ruling 6; everything else on the screen untouched (the blank path
  landed ff693b4 stays exactly as it is).
- Delete `src/lib/travelMode.js`.
- Guards to update with rationale in their header comments:
  `src/screens/__tests__/BuildWorkoutScreen.travelSheet.guard.test.js`
  (multi-select checkboxes, the two presets, the copy, neutrality and row
  position unchanged), `BuildWorkoutScreen.travelDrops.guard.test.js`
  (the new classification shape, both toast strings, `setExercises`
  before the toast), `src/lib/__tests__/capabilityPosture.w1.guard.test.js`
  (the function name; the preflight contract unchanged). Any other test
  that references `travelMode` or `applyTravelMode`: update the reference,
  never weaken the pin; STOP and report if a pin would have to weaken.

## 3. Tests (Jest, written to fail, header comment on each)

`src/lib/__tests__/quickSession.test.js` against the REAL corpus
(`CORPUS` from `src/lib/exerciseCorpus/index.js`, mapped to the row shape
the generator reads; derive `equipmentCategory` the same way the seed
does): determinism (two runs deep-equal; output serialises stably); no
`Math.random` or `Date.now` in `quickSession.js` (source regex); for the
empty kit, each single kind, and the full kit, all eight slots fill; with
Kettlebells only at least one kettlebell row appears AND side_delts is
filled (pins F-16's shoulder failure); with Bands only at least one band
row appears (pins "band equals bodyweight"); with Barbell and plates only
at least one barbell row appears; inventory respected (no chosen category
outside kit-categories plus bodyweight, across every kit); kit before
bodyweight where a kit candidate exists; never a `NEVER_AUTO` name unless
the kettlebell exception applies; no duplicate names; prescriptions per
class; `explainQuickSessionDrops` counts one capability drop and one
preference drop on a constructed pair of libraries. `quickSessionKit`:
read shape-checks and never throws; write round-trips.

## 4. Verification and report

`npx eslint . --max-warnings 0` exit 0; `npx jest src/lib/__tests__/quickSession src/lib/__tests__/capabilityPosture src/screens/__tests__/BuildWorkoutScreen src/__tests__/screen-mount.test.js` green; the lead runs the full suite at landing. Device checklist (Android build after landing): 1. Today, Change workout, Blank workout, tap the quick-fill row: the sheet lists presets and six kinds, nothing selected on first use. 2. Select Kettlebells, Fill workout: eight exercises, at least one kettlebell move, shoulders present. 3. Reopen the sheet: Kettlebells still selected. 4. "Nothing, bodyweight only": eight bodyweight moves. 5. Full gym: barbell or machine work appears. 6. With an avoided movement set in exercise intent, fill again: the toast names what was left out. 7. Every exercise's rest reads "Rest (suggested)" and can be edited. Report format (capped): files with line counts; lint exit code; jest summary lines verbatim; STOPs numbered or "none"; anything not done exactly as written and why.
