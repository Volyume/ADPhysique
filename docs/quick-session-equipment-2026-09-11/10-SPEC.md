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
   kept): quads, hamstrings, chest, back, shoulders (side_delts, then
   front_delts, then rear_delts: the first muscle with an eligible
   candidate for the kit), biceps, triceps, abs. The corpus has no
   bodyweight, kettlebell or suspension row with side_delts as its primary
   muscle (a lateral raise needs external resistance), so the shoulders
   slot falls through to front_delts, then rear_delts, rather than sitting
   unfilled for those three kits. Per slot, candidates are rows with
   `primaryMuscle` equal to the slot muscle, `equipmentCategory` in
   kit-categories plus `bodyweight`, not
   retired, and auto-eligible: `isAutoEligible(name)` from
   `src/lib/exercise/canonicality.js`, PLUS, only when the kit includes
   Kettlebells, the names in `KETTLEBELL_NEVER_AUTO_EXCEPTIONS`
   (`src/lib/exercise/stylePools.js:121`) since the person has said they
   have one. Never a `NEVER_AUTO` row otherwise. Ranking is a stable total
   order: (a) kit equipment before bodyweight whenever the kit is
   non-empty; (b) for quads, hamstrings, chest and back, compound before
   isolation (`compoundIsolation`); for the other four slots no
   preference; (c) tier rank (`tierRank(name)`: staple before common
   before the rest); (d) difficulty ascending, null last (a quick session
   is accessible); (e) name ascending. First candidate wins; a chosen name
   is excluded from every later slot. A slot with no candidate is left
   unfilled and reported (`unfilled`), never padded with an off-kit move.
5. **Prescription** (travel mode's own scheme, shorter rest, higher reps):
   compound 3 x 8-12, rest 90 s; isolation 3 x 12-15, rest 60 s; a
   bodyweight row follows its own class. `restSuggested: true` so the
   screen labels it "Rest (suggested)" and the person edits anything.
6. **Named, not silent (T1-23 preserved).** The screen runs the generator
   twice, over the unfiltered library and over the filtered one; for every
   slot whose filtered winner differs from the unfiltered winner because
   the unfiltered winner is absent from the filtered library, the drop is
   classified with `capabilityBlockReason(capabilityState, row)` and the
   two existing toast lines are shown ("N movement(s) left out for your
   limitations." / "... for your avoided movements."). The capability
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
